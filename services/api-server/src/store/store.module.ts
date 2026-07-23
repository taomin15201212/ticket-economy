import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_REPOSITORY } from './app.repository';
import { MemoryRepository } from './memory.repository';
import { MemoryStore } from './memory.store';
import { MysqlRepository } from './mysql.repository';
import { SqlMysqlRepository } from './sql-mysql.repository';
import { REPOSITORY_MODE, type RepositoryMode } from './repository.mode';

function resolveMode(dbMode: string | undefined): RepositoryMode {
  if (dbMode === 'mysql-sql') return 'mysql-sql';
  if (dbMode === 'mysql') return 'mysql-hybrid';
  return 'memory';
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    MemoryStore,
    MemoryRepository,
    MysqlRepository,
    SqlMysqlRepository,
    {
      provide: REPOSITORY_MODE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): RepositoryMode =>
        resolveMode(config.get('DB_MODE')),
    },
    {
      provide: APP_REPOSITORY,
      inject: [
        ConfigService,
        MemoryRepository,
        MysqlRepository,
        SqlMysqlRepository,
      ],
      useFactory: (
        config: ConfigService,
        memory: MemoryRepository,
        hybrid: MysqlRepository,
        sql: SqlMysqlRepository,
      ) => {
        const mode = resolveMode(config.get('DB_MODE'));
        if (mode === 'mysql-sql') return sql;
        if (mode === 'mysql-hybrid') return hybrid;
        return memory;
      },
    },
  ],
  exports: [
    MemoryStore,
    MemoryRepository,
    MysqlRepository,
    SqlMysqlRepository,
    APP_REPOSITORY,
    REPOSITORY_MODE,
  ],
})
export class StoreModule {}
