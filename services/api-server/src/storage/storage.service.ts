import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, promises as fs } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import * as Minio from 'minio';

export type StoredObject = {
  url: string;
  key: string;
  backend: 'minio' | 'local';
  bucket?: string;
};

/**
 * Object storage: MinIO when reachable, otherwise local ./uploads.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client | null = null;
  private bucket = 'ticket-economy';
  mode: 'minio' | 'local' = 'local';
  private uploadDir = './uploads';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.uploadDir = this.config.get('UPLOAD_DIR', './uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    const enabled = (this.config.get('MINIO_ENABLED') ?? 'true') === 'true';
    if (!enabled) {
      this.logger.warn('MinIO disabled → local disk storage');
      return;
    }

    const endPoint = this.config.get('MINIO_ENDPOINT', '127.0.0.1');
    const port = Number(this.config.get('MINIO_PORT') || 9000);
    const accessKey = this.config.get('MINIO_ACCESS_KEY', 'te_minio');
    const secretKey = this.config.get('MINIO_SECRET_KEY', 'te_minio_pass');
    const useSSL = (this.config.get('MINIO_USE_SSL') ?? 'false') === 'true';
    this.bucket = this.config.get('MINIO_BUCKET', 'ticket-economy');

    try {
      const client = new Minio.Client({
        endPoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });
      const exists = await client.bucketExists(this.bucket);
      if (!exists) {
        await client.makeBucket(this.bucket, '');
      }
      this.client = client;
      this.mode = 'minio';
      this.logger.log(`MinIO ready bucket=${this.bucket} @ ${endPoint}:${port}`);
    } catch (e) {
      this.logger.warn(
        `MinIO unavailable (${(e as Error).message}) → local disk`,
      );
      this.client = null;
      this.mode = 'local';
    }
  }

  private async putLocal(
    key: string,
    data: Buffer,
  ): Promise<StoredObject> {
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    const full = join(this.uploadDir, safeKey);
    const dir = join(full, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    await fs.writeFile(full, data);
    return {
      url: `/uploads/${safeKey}`,
      key: safeKey,
      backend: 'local',
    };
  }

  async putObject(
    key: string,
    data: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<StoredObject> {
    if (this.client && this.mode === 'minio') {
      try {
        await this.client.putObject(this.bucket, key, data, data.length, {
          'Content-Type': contentType,
        });
        const publicBase =
          this.config.get('MINIO_PUBLIC_URL') ||
          `http://${this.config.get('MINIO_ENDPOINT', '127.0.0.1')}:${this.config.get('MINIO_PORT', '9000')}/${this.bucket}`;
        return {
          url: `${publicBase}/${key}`,
          key,
          backend: 'minio',
          bucket: this.bucket,
        };
      } catch (e) {
        this.logger.warn(
          `MinIO putObject failed (${(e as Error).message}) → local disk`,
        );
        this.mode = 'local';
        this.client = null;
      }
    }

    return this.putLocal(key, data);
  }

  async putStream(
    key: string,
    stream: Readable,
    size: number,
    contentType = 'application/octet-stream',
  ): Promise<StoredObject> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return this.putObject(key, Buffer.concat(chunks), contentType);
  }

  ticketKey(userId: number, filename: string) {
    const ts = Date.now();
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'ticket.jpg';
    return `tickets/${userId}/${ts}-${safe}`;
  }

  /**
   * Presigned PUT URL for direct client upload (WeChat uploadFile / H5).
   * Falls back to local upload endpoint when MinIO is unavailable.
   */
  async presignPut(
    key: string,
    expirySec = 600,
    contentType = 'image/jpeg',
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    method: 'PUT' | 'POST';
    backend: 'minio' | 'local';
    headers?: Record<string, string>;
  }> {
    if (this.client && this.mode === 'minio') {
      const uploadUrl = await this.client.presignedPutObject(
        this.bucket,
        key,
        expirySec,
      );
      const publicBase =
        this.config.get('MINIO_PUBLIC_URL') ||
        `http://${this.config.get('MINIO_ENDPOINT', '127.0.0.1')}:${this.config.get('MINIO_PORT', '9000')}/${this.bucket}`;
      return {
        uploadUrl,
        publicUrl: `${publicBase}/${key}`,
        key,
        method: 'PUT',
        backend: 'minio',
        headers: { 'Content-Type': contentType },
      };
    }

    // Local fallback: client should POST multipart to /api/ticket/upload
    return {
      uploadUrl: '/api/ticket/upload',
      publicUrl: `/uploads/${key}`,
      key,
      method: 'POST',
      backend: 'local',
    };
  }
}

