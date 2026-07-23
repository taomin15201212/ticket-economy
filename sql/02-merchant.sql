USE ticket_economy;

CREATE TABLE IF NOT EXISTS `merchant_brand` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `brand_name`    VARCHAR(100) NOT NULL,
  `logo`          VARCHAR(500) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_brand_name` (`brand_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户品牌';

CREATE TABLE IF NOT EXISTS `merchant` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `brand_id`      BIGINT       NULL,
  `merchant_name` VARCHAR(100) NOT NULL COMMENT '品牌/主体名',
  `store_name`    VARCHAR(100) NOT NULL COMMENT '门店名，如红谷滩店',
  `address`       VARCHAR(300) NULL,
  `longitude`     DECIMAL(10,6) NULL,
  `latitude`      DECIMAL(10,6) NULL,
  `contact`       VARCHAR(50)  NULL,
  `phone`         VARCHAR(20)  NULL,
  `business_license` VARCHAR(500) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 0 COMMENT '0待审 1通过 2驳回 3停用',
  `created_by`    BIGINT       NULL,
  `updated_by`    BIGINT       NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  `version`       INT          NOT NULL DEFAULT 0,
  KEY `idx_merchant_status` (`status`),
  KEY `idx_merchant_name` (`merchant_name`, `store_name`),
  KEY `idx_merchant_geo` (`longitude`, `latitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户门店';

CREATE TABLE IF NOT EXISTS `merchant_account` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `merchant_id`   BIGINT       NOT NULL,
  `username`      VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          VARCHAR(30)  NOT NULL DEFAULT 'staff' COMMENT 'owner/manager/staff',
  `phone`         VARCHAR(20)  NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `last_login_at` DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_merchant_username` (`username`),
  KEY `idx_merchant_account_mid` (`merchant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户账号';

CREATE TABLE IF NOT EXISTS `merchant_qrcode` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `merchant_id`   BIGINT       NOT NULL,
  `qr_type`       VARCHAR(30)  NOT NULL DEFAULT 'verify',
  `qr_content`    VARCHAR(500) NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_merchant_qr` (`merchant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户二维码';

CREATE TABLE IF NOT EXISTS `merchant_audit_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `merchant_id`   BIGINT       NOT NULL,
  `action`        VARCHAR(30)  NOT NULL COMMENT 'approve/reject/disable',
  `reason`        VARCHAR(500) NULL,
  `operator_id`   BIGINT       NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_merchant_audit` (`merchant_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商户审核日志';
