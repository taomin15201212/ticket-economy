USE ticket_economy;

CREATE TABLE IF NOT EXISTS `risk_blacklist` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `target_type`   VARCHAR(30)  NOT NULL COMMENT 'user/phone/openid/device/ip',
  `target_value`  VARCHAR(128) NOT NULL,
  `reason`        VARCHAR(500) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_by`    BIGINT       NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_risk_target` (`target_type`, `target_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风控黑名单';

CREATE TABLE IF NOT EXISTS `risk_strategy` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `strategy_code` VARCHAR(50)  NOT NULL,
  `strategy_name` VARCHAR(100) NOT NULL,
  `config_json`   JSON         NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_strategy_code` (`strategy_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风控策略';

CREATE TABLE IF NOT EXISTS `risk_ip` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `ip`            VARCHAR(64)  NOT NULL,
  `hit_count`     INT          NOT NULL DEFAULT 0,
  `last_hit_at`   DATETIME     NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_risk_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风险 IP';

CREATE TABLE IF NOT EXISTS `risk_device` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `device_id`     VARCHAR(128) NOT NULL,
  `hit_count`     INT          NOT NULL DEFAULT 0,
  `last_hit_at`   DATETIME     NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_risk_device` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风险设备';

CREATE TABLE IF NOT EXISTS `sys_user` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name`  VARCHAR(100) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_sys_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台用户';

CREATE TABLE IF NOT EXISTS `sys_role` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `role_code`     VARCHAR(50)  NOT NULL,
  `role_name`     VARCHAR(100) NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色';

CREATE TABLE IF NOT EXISTS `sys_permission` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `perm_code`     VARCHAR(100) NOT NULL,
  `perm_name`     VARCHAR(100) NOT NULL,
  `module`        VARCHAR(50)  NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_perm_code` (`perm_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限点';

CREATE TABLE IF NOT EXISTS `sys_role_permission` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `role_id`       BIGINT       NOT NULL,
  `permission_id` BIGINT       NOT NULL,
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限';

CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `role_id`       BIGINT       NOT NULL,
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色';

CREATE TABLE IF NOT EXISTS `sys_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NULL,
  `action`        VARCHAR(100) NOT NULL,
  `module`        VARCHAR(50)  NULL,
  `request_id`    VARCHAR(64)  NULL,
  `detail`        JSON         NULL,
  `ip`            VARCHAR(64)  NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_sys_log_time` (`created_at`),
  KEY `idx_sys_log_user` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台操作日志';

CREATE TABLE IF NOT EXISTS `system_config` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `config_key`    VARCHAR(100) NOT NULL,
  `config_value`  TEXT         NOT NULL,
  `remark`        VARCHAR(200) NULL,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置';
