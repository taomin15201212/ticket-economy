USE ticket_economy;

CREATE TABLE IF NOT EXISTS `point_rule` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `action_type`   VARCHAR(50)  NOT NULL COMMENT 'upload_ticket/checkin/share/use_coupon',
  `points`        INT          NOT NULL,
  `daily_limit`   INT          NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `remark`        VARCHAR(200) NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_point_action` (`action_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分规则';

CREATE TABLE IF NOT EXISTS `point_log` (
  `id`             BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`        BIGINT       NOT NULL,
  `change_points`  INT          NOT NULL,
  `before_points`  INT          NOT NULL,
  `after_points`   INT          NOT NULL,
  `change_type`    VARCHAR(50)  NOT NULL,
  `biz_id`         BIGINT       NULL,
  `remark`         VARCHAR(200) NULL,
  `created_at`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_point_user_time` (`user_id`, `created_at`),
  KEY `idx_point_type` (`change_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分流水';

CREATE TABLE IF NOT EXISTS `point_goods` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `goods_name`    VARCHAR(100) NOT NULL,
  `need_points`   INT          NOT NULL,
  `stock`         INT          NOT NULL DEFAULT 0,
  `image`         VARCHAR(500) NULL,
  `description`   VARCHAR(500) NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted`       TINYINT      NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分商城商品';

CREATE TABLE IF NOT EXISTS `point_exchange` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `goods_id`      BIGINT       NOT NULL,
  `need_points`   INT          NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1 COMMENT '1成功 2取消 3发放中',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_point_exchange_user` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分兑换记录';

CREATE TABLE IF NOT EXISTS `checkin_location` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `name`          VARCHAR(100) NOT NULL,
  `merchant_id`   BIGINT       NULL,
  `address`       VARCHAR(300) NULL,
  `longitude`     DECIMAL(10,6) NOT NULL,
  `latitude`      DECIMAL(10,6) NOT NULL,
  `radius_meter`  INT          NOT NULL DEFAULT 300,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_checkin_loc_geo` (`longitude`, `latitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡点位';

CREATE TABLE IF NOT EXISTS `checkin_task` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `task_name`     VARCHAR(100) NOT NULL,
  `task_type`     VARCHAR(30)  NOT NULL DEFAULT 'single' COMMENT 'single/streak/collect',
  `target_count`  INT          NOT NULL DEFAULT 1,
  `reward_points` INT          NOT NULL DEFAULT 0,
  `reward_json`   JSON         NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `start_time`    DATETIME     NULL,
  `end_time`      DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡任务';

CREATE TABLE IF NOT EXISTS `checkin_record` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `user_id`       BIGINT       NOT NULL,
  `location_id`   BIGINT       NULL,
  `merchant_id`   BIGINT       NULL,
  `longitude`     DECIMAL(10,6) NULL,
  `latitude`      DECIMAL(10,6) NULL,
  `distance`      INT          NULL COMMENT '距点位米数',
  `photo_url`     VARCHAR(500) NULL,
  `verify_type`   VARCHAR(30)  NOT NULL DEFAULT 'GPS',
  `verify_status` TINYINT      NOT NULL DEFAULT 0 COMMENT '0待验证 1自动通过 2待人工 3通过 4拒绝',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_checkin_user_time` (`user_id`, `created_at`),
  KEY `idx_checkin_status` (`verify_status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打卡记录';

CREATE TABLE IF NOT EXISTS `activity` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `title`         VARCHAR(200) NOT NULL,
  `activity_type` VARCHAR(50)  NOT NULL,
  `content`       TEXT         NULL,
  `start_time`    DATETIME     NULL,
  `end_time`      DATETIME     NULL,
  `status`        TINYINT      NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动';

CREATE TABLE IF NOT EXISTS `banner` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `title`         VARCHAR(100) NOT NULL,
  `image_url`     VARCHAR(500) NOT NULL,
  `link_url`      VARCHAR(500) NULL,
  `sort_no`       INT          NOT NULL DEFAULT 0,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `start_time`    DATETIME     NULL,
  `end_time`      DATETIME     NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Banner';

CREATE TABLE IF NOT EXISTS `announcement` (
  `id`            BIGINT PRIMARY KEY AUTO_INCREMENT,
  `title`         VARCHAR(200) NOT NULL,
  `content`       TEXT         NOT NULL,
  `status`        TINYINT      NOT NULL DEFAULT 1,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告';
