USE ticket_economy;

-- 用户主表
CREATE TABLE IF NOT EXISTS `user` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `openid`        VARCHAR(64)  NOT NULL COMMENT '微信 openid',
  `unionid`       VARCHAR(64)  NULL COMMENT '微信 unionid',
  `nickname`      VARCHAR(100) NULL,
  `avatar`        VARCHAR(500) NULL,
  `phone`         VARCHAR(20)  NULL,
  `level`         INT          NOT NULL DEFAULT 1 COMMENT '用户等级',
  `total_points`  INT          NOT NULL DEFAULT 0 COMMENT '当前可用积分',
  `total_cost`    DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '累计识别消费金额',
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
  `created_by`    BIGINT       NULL,
  `updated_by`    BIGINT       NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  `version`       INT          NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_user_openid` (`openid`),
  KEY `idx_user_phone` (`phone`),
  KEY `idx_user_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消费者用户';

CREATE TABLE IF NOT EXISTS `user_profile` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `gender`        TINYINT      NULL COMMENT '0未知 1男 2女',
  `city`          VARCHAR(50)  NULL,
  `birthday`      DATE         NULL,
  `tags`          JSON         NULL COMMENT '兴趣/人群标签',
  `extra`         JSON         NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_profile_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户画像扩展';

CREATE TABLE IF NOT EXISTS `user_device` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `device_id`     VARCHAR(128) NOT NULL,
  `brand`         VARCHAR(50)  NULL,
  `model`         VARCHAR(50)  NULL,
  `os`            VARCHAR(50)  NULL,
  `ip`            VARCHAR(64)  NULL,
  `last_login_at` DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0,
  UNIQUE KEY `uk_user_device` (`user_id`, `device_id`),
  KEY `idx_device_id` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户设备';

CREATE TABLE IF NOT EXISTS `user_login_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `login_type`    VARCHAR(30)  NOT NULL DEFAULT 'wechat',
  `ip`            VARCHAR(64)  NULL,
  `device_id`     VARCHAR(128) NULL,
  `user_agent`    VARCHAR(500) NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_login_user_time` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志';

CREATE TABLE IF NOT EXISTS `user_behavior_log` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `action`        VARCHAR(50)  NOT NULL COMMENT 'page_view/upload/open_box/...',
  `biz_type`      VARCHAR(50)  NULL,
  `biz_id`        BIGINT       NULL,
  `payload`       JSON         NULL,
  `ip`            VARCHAR(64)  NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_behavior_user_time` (`user_id`, `created_at`),
  KEY `idx_behavior_action` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户行为日志';

CREATE TABLE IF NOT EXISTS `message_center` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `title`         VARCHAR(200) NOT NULL,
  `content`       VARCHAR(1000) NOT NULL,
  `message_type`  VARCHAR(50)  NOT NULL COMMENT 'TICKET_APPROVED/COUPON_RECEIVED/...',
  `biz_id`        BIGINT       NULL,
  `status`        TINYINT      NOT NULL DEFAULT 0 COMMENT '0未读 1已读',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at`       DATETIME     NULL,
  KEY `idx_msg_user_status` (`user_id`, `status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='站内消息';
