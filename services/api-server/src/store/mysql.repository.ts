import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemoryRepository } from './memory.repository';
import { MemoryStore } from './memory.store';

/**
 * MySQL-hybrid repository binding (Sprint 7).
 * Selected when DB_MODE=mysql. Hot cache = MemoryStore (hydrated by MysqlService).
 * Domain services / MysqlService still perform write-through; this class exposes
 * the method-level AppRepository API under the mysql-hybrid backend name.
 *
 * Future: move SQL into this class and drop in-memory primary path.
 */
@Injectable()
export class MysqlRepository
  extends MemoryRepository
  implements OnModuleInit
{
  private readonly logger = new Logger(MysqlRepository.name);
  override readonly backend = 'mysql-hybrid' as const;

  constructor(store: MemoryStore, private readonly config: ConfigService) {
    super(store);
  }

  onModuleInit() {
    this.logger.log(
      `MysqlRepository selected (DB_MODE=${this.config.get('DB_MODE', 'memory')})`,
    );
  }
}
