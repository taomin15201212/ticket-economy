import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OcrResultPayload, RiskResultPayload } from '../common/queues';

type ApiEnvelope<T> = { code: number; message?: string; data: T };

/**
 * HTTP client for api-server internal worker callbacks.
 * Auth: X-Worker-Secret header (must match API WORKER_SECRET).
 */
@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('API_BASE_URL') || 'http://127.0.0.1:3000'
    ).replace(/\/$/, '');
    this.secret =
      this.config.get<string>('WORKER_SECRET') || 'te-worker-dev-secret';
  }

  async getTicket(ticketId: number): Promise<Record<string, unknown> | null> {
    try {
      const data = await this.request<Record<string, unknown>>(
        'GET',
        `/api/internal/tickets/${ticketId}`,
      );
      return data;
    } catch (e) {
      this.logger.warn(`getTicket#${ticketId}: ${(e as Error).message}`);
      return null;
    }
  }

  async applyOcr(
    ticketId: number,
    ocr: OcrResultPayload,
  ): Promise<Record<string, unknown>> {
    return this.request('POST', `/api/internal/tickets/${ticketId}/ocr`, {
      ocr,
    });
  }

  async applyAiDecision(
    ticketId: number,
    risk: RiskResultPayload,
    summary?: string,
  ): Promise<Record<string, unknown>> {
    return this.request(
      'POST',
      `/api/internal/tickets/${ticketId}/ai-decision`,
      { risk, summary },
    );
  }

  async expireScan(limit = 200): Promise<{ expired: number; scanned: number }> {
    return this.request('POST', '/api/internal/coupons/expire', { limit });
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Worker-Secret': this.secret,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as ApiEnvelope<T>;
    if (!res.ok || (json.code !== undefined && json.code !== 0)) {
      throw new Error(
        `API ${method} ${path} → ${res.status} ${json.message || JSON.stringify(json)}`,
      );
    }
    return json.data;
  }
}
