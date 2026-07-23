USE ticket_economy;

CREATE TABLE IF NOT EXISTS `ticket_type` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `type_code`     VARCHAR(50)  NOT NULL,
  `type_name`     VARCHAR(100) NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ticket_type_code` (`type_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票据类型';

CREATE TABLE IF NOT EXISTS `ticket` (
  `id`              BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`         BIGINT       NOT NULL,
  `ticket_type`     VARCHAR(50)  NOT NULL COMMENT 'scenic/dining/metro/movie/didi',
  `merchant_id`     BIGINT       NULL,
  `merchant_name`   VARCHAR(100) NULL COMMENT 'OCR 提取商户名',
  `image_url`       VARCHAR(500) NOT NULL,
  `image_md5`       VARCHAR(64)  NULL,
  `amount`          DECIMAL(10,2) NULL,
  `order_no`        VARCHAR(128) NULL,
  `consume_time`    DATETIME     NULL,
  `ocr_confidence`  DECIMAL(5,2) NULL,
  `risk_score`      INT          NULL COMMENT '0-100',
  `status`          TINYINT      NOT NULL DEFAULT 0 COMMENT '见状态机',
  `reject_reason`   VARCHAR(500) NULL,
  `reviewer_id`     BIGINT       NULL,
  `reviewed_at`     DATETIME     NULL,
  `exchanged_at`    DATETIME     NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`         TINYINT      NOT NULL DEFAULT 0,
  `version`         INT          NOT NULL DEFAULT 0,
  KEY `idx_ticket_user` (`user_id`),
  KEY `idx_ticket_status` (`status`),
  KEY `idx_ticket_time` (`created_at`),
  KEY `idx_ticket_md5` (`image_md5`),
  UNIQUE KEY `uk_ticket_unique` (`order_no`, `amount`, `consume_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票据主表';

CREATE TABLE IF NOT EXISTS `ticket_image` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `url`           VARCHAR(500) NOT NULL,
  `image_role`    VARCHAR(30)  NOT NULL DEFAULT 'raw' COMMENT 'raw/ocr/review',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_ticket_image` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票据图片';

CREATE TABLE IF NOT EXISTS `ticket_ocr_result` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `engine`        VARCHAR(50)  NULL,
  `raw_text`      MEDIUMTEXT   NULL,
  `parsed_json`   JSON         NULL,
  `confidence`    DECIMAL(5,2) NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_ocr_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OCR 结果';

CREATE TABLE IF NOT EXISTS `ticket_ai_result` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `model_name`    VARCHAR(100) NULL,
  `is_real_ticket` TINYINT     NULL,
  `is_screenshot`  TINYINT     NULL,
  `is_tampered`    TINYINT     NULL,
  `summary`       VARCHAR(500) NULL,
  `result_json`   JSON         NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_ai_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 审核结果';

CREATE TABLE IF NOT EXISTS `ticket_risk_result` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `risk_score`    INT          NOT NULL,
  `risk_level`    VARCHAR(20)  NOT NULL COMMENT 'low/mid/high',
  `risk_reasons`  JSON         NULL,
  `decision`      VARCHAR(20)  NOT NULL COMMENT 'approve/manual/reject',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_risk_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风险评分结果';

CREATE TABLE IF NOT EXISTS `ticket_review_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `reviewer_id`   BIGINT       NULL,
  `action`        VARCHAR(30)  NOT NULL COMMENT 'approve/reject/transfer',
  `reason`        VARCHAR(500) NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_review_ticket` (`ticket_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人工审核日志';

CREATE TABLE IF NOT EXISTS `ticket_duplicate` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ticket_id`     BIGINT       NOT NULL,
  `dup_ticket_id` BIGINT       NOT NULL,
  `dup_type`      VARCHAR(30)  NOT NULL COMMENT 'order_unique/image_md5/phash',
  `score`         DECIMAL(5,2) NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_dup_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='重复票据命中';
