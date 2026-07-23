USE ticket_economy;

CREATE TABLE IF NOT EXISTS `coupon_template` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `coupon_name`   VARCHAR(100) NOT NULL,
  `coupon_type`   VARCHAR(50)  NOT NULL COMMENT 'merchant/scenic/metro/didi/movie',
  `provider_type` VARCHAR(50)  NOT NULL DEFAULT 'local' COMMENT 'local/scenic/metro/didi/movie',
  `amount`        DECIMAL(10,2) NULL COMMENT '面额/折扣说明辅助字段',
  `discount_desc` VARCHAR(200) NULL,
  `total_count`   INT          NOT NULL DEFAULT 0,
  `remain_count`  INT          NOT NULL DEFAULT 0,
  `start_time`    DATETIME     NULL,
  `end_time`      DATETIME     NULL,
  `valid_days`    INT          NULL COMMENT '领取后有效天数',
  `rules`         JSON         NULL COMMENT '使用规则',
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  KEY `idx_coupon_tpl_type` (`coupon_type`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消费券模板';

CREATE TABLE IF NOT EXISTS `coupon_batch` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `template_id`   BIGINT       NOT NULL,
  `batch_no`      VARCHAR(64)  NOT NULL,
  `total_count`   INT          NOT NULL,
  `remain_count`  INT          NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_coupon_batch_no` (`batch_no`),
  KEY `idx_coupon_batch_tpl` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发券批次';

CREATE TABLE IF NOT EXISTS `coupon_rule` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `template_id`   BIGINT       NOT NULL,
  `rule_type`     VARCHAR(50)  NOT NULL COMMENT 'merchant_scope/min_amount/time_window',
  `rule_value`    JSON         NOT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_coupon_rule_tpl` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消费券规则';

CREATE TABLE IF NOT EXISTS `user_coupon` (
  `id`                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`            BIGINT       NOT NULL,
  `coupon_template_id` BIGINT       NOT NULL,
  `coupon_code`        VARCHAR(128) NOT NULL,
  `source`             VARCHAR(50)  NOT NULL DEFAULT 'blindbox' COMMENT 'blindbox/task/admin',
  `status`             TINYINT      NOT NULL DEFAULT 1 COMMENT '0待领 1已领 2锁定 3已用 4过期 5撤销',
  `receive_time`       DATETIME     NULL,
  `expire_time`        DATETIME     NULL,
  `lock_time`          DATETIME     NULL,
  `use_time`           DATETIME     NULL,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`            TINYINT      NOT NULL DEFAULT 0,
  `version`            INT          NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_coupon_code` (`coupon_code`),
  KEY `idx_coupon_user_status` (`user_id`, `status`),
  KEY `idx_coupon_expire` (`expire_time`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户消费券';

CREATE TABLE IF NOT EXISTS `coupon_use_record` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `coupon_id`     BIGINT       NOT NULL,
  `user_id`       BIGINT       NOT NULL,
  `merchant_id`   BIGINT       NOT NULL,
  `operator_id`   BIGINT       NULL COMMENT '商户账号 ID',
  `verify_type`   VARCHAR(30)  NOT NULL COMMENT 'scan/manual/pos',
  `request_id`    VARCHAR(64)  NULL COMMENT '幂等请求号',
  `use_time`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `extra`         JSON         NULL,
  UNIQUE KEY `uk_use_request` (`request_id`),
  KEY `idx_use_coupon` (`coupon_id`),
  KEY `idx_use_merchant_time` (`merchant_id`, `use_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核销记录';

CREATE TABLE IF NOT EXISTS `coupon_exchange_record` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `ticket_id`     BIGINT       NOT NULL,
  `blind_box_id`  BIGINT       NULL,
  `coupon_id`     BIGINT       NULL,
  `reward_name`   VARCHAR(100) NULL,
  `exchange_time` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_exchange_user` (`user_id`, `exchange_time`),
  KEY `idx_exchange_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票据兑换/开奖记录';

CREATE TABLE IF NOT EXISTS `blind_box` (
  `id`              BIGINT PRIMARY KEY AUTO_INCREMENT,
  `box_name`        VARCHAR(100) NOT NULL,
  `animation_type`  VARCHAR(50)  NULL,
  `animation_url`   VARCHAR(500) NULL,
  `day_limit`       INT          NULL COMMENT '单用户日限',
  `total_limit`     INT          NULL,
  `status`          TINYINT      NOT NULL DEFAULT 0 COMMENT '0草稿 1上线 2下线',
  `start_time`      DATETIME     NULL,
  `end_time`        DATETIME     NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`         TINYINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盲盒配置';

CREATE TABLE IF NOT EXISTS `blind_box_reward` (
  `id`                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  `blind_box_id`       BIGINT       NOT NULL,
  `reward_name`        VARCHAR(100) NOT NULL,
  `coupon_template_id` BIGINT       NULL,
  `weight`             INT          NOT NULL DEFAULT 0 COMMENT '权重',
  `stock`              INT          NOT NULL DEFAULT 0,
  `remain_stock`       INT          NOT NULL DEFAULT 0,
  `is_thanks`          TINYINT      NOT NULL DEFAULT 0 COMMENT '是否谢谢参与',
  `status`             TINYINT      NOT NULL DEFAULT 1,
  `created_at`         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_reward_box` (`blind_box_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盲盒奖品';

CREATE TABLE IF NOT EXISTS `blind_box_open_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `ticket_id`     BIGINT       NULL,
  `blind_box_id`  BIGINT       NOT NULL,
  `reward_id`     BIGINT       NULL,
  `result_status` TINYINT      NOT NULL DEFAULT 0 COMMENT '0谢谢 1中奖 2库存失败',
  `random_value`  INT          NULL,
  `coupon_id`     BIGINT       NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_open_user_time` (`user_id`, `created_at`),
  KEY `idx_open_box` (`blind_box_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盲盒开奖日志';

CREATE TABLE IF NOT EXISTS `third_platform` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `platform_name` VARCHAR(100) NOT NULL,
  `provider_type` VARCHAR(50)  NOT NULL,
  `api_url`       VARCHAR(500) NULL,
  `app_key`       VARCHAR(100) NULL,
  `app_secret`    VARCHAR(200) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 0,
  `config_json`   JSON         NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_provider_type` (`provider_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='第三方券平台配置';
