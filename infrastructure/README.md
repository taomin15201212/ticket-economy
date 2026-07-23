# Infrastructure

本地中间件（Docker Compose）：

| 服务 | 端口 | 账号 |
| --- | --- | --- |
| MySQL 8 | 3306 | root/root · te/te_pass · db=`ticket_economy` |
| Redis 7 | 6379 | 无密码 |
| RabbitMQ | 5672 / 管理台 15672 | te/te_pass |
| MinIO | 9000 / 控制台 9001 | te_minio/te_minio_pass |

## 启动

```bash
cd infrastructure
docker compose up -d
docker compose ps
```

首次启动会执行 `mysql/init/00-bootstrap.sh`，加载 `../sql/*.sql`。

若需重建库：

```bash
docker compose down -v
docker compose up -d
```

## 健康检查

```bash
docker compose exec mysql mysqladmin ping -uroot -proot
docker compose exec redis redis-cli ping
```
