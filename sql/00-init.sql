-- 文旅消费券积分平台 · 初始化
-- MySQL 8.0+
-- 字符集：utf8mb4

CREATE DATABASE IF NOT EXISTS ticket_economy
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ticket_economy;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 通用约定：
-- 1. 主键 bigint 自增
-- 2. created_at / updated_at / deleted / version 作为通用审计字段
-- 3. 金额 decimal(10,2)，积分 int
-- 4. 状态字段见 docs/02-业务状态机.md

SOURCE 01-user.sql;
SOURCE 02-merchant.sql;
SOURCE 03-ticket.sql;
SOURCE 04-coupon-blindbox.sql;
SOURCE 05-points-checkin.sql;
SOURCE 06-risk-admin.sql;
SOURCE 99-seed.sql;

SET FOREIGN_KEY_CHECKS = 1;
