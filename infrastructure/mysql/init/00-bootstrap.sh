#!/bin/bash
# Docker MySQL entrypoint 会执行本脚本。
# 按序加载仓库 sql/ 下 DDL + seed（跳过 00-init.sql 的 SOURCE 方式）。
set -euo pipefail

MYSQL_OPTS=(-uroot -p"${MYSQL_ROOT_PASSWORD}" --default-character-set=utf8mb4)

echo "[te-init] creating database if needed..."
mysql "${MYSQL_OPTS[@]}" -e "CREATE DATABASE IF NOT EXISTS ticket_economy DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

for f in \
  01-user.sql \
  02-merchant.sql \
  03-ticket.sql \
  04-coupon-blindbox.sql \
  05-points-checkin.sql \
  06-risk-admin.sql \
  99-seed.sql
do
  echo "[te-init] applying /sql/${f}"
  mysql "${MYSQL_OPTS[@]}" ticket_economy < "/sql/${f}"
done

echo "[te-init] done."
