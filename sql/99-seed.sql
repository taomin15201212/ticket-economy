USE ticket_economy;

INSERT INTO ticket_type (type_code, type_name) VALUES
('dining', '餐饮小票'),
('scenic', '景区门票'),
('metro', '地铁票/乘车凭证'),
('movie', '电影票'),
('didi', '出行订单')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name);

INSERT INTO point_rule (action_type, points, daily_limit, remark) VALUES
('upload_ticket', 10, 5, '上传票据并通过审核'),
('checkin', 5, 3, '完成打卡'),
('share', 3, 3, '分享活动/结果'),
('use_coupon', 20, 10, '核销消费券')
ON DUPLICATE KEY UPDATE points = VALUES(points), daily_limit = VALUES(daily_limit);

INSERT INTO sys_role (role_code, role_name) VALUES
('SUPER_ADMIN', '超级管理员'),
('CITY_ADMIN', '城市运营管理员'),
('OPERATOR', '运营人员'),
('AUDITOR', '审核人员'),
('MERCHANT', '商户'),
('USER', '消费者')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

INSERT INTO sys_permission (perm_code, perm_name, module) VALUES
('ticket:review', '票据审核查看', 'ticket'),
('ticket:approve', '票据通过', 'ticket'),
('ticket:reject', '票据拒绝', 'ticket'),
('coupon:create', '创建消费券', 'coupon'),
('coupon:update', '更新消费券', 'coupon'),
('blindbox:config', '配置盲盒', 'blindbox'),
('points:rule:update', '更新积分规则', 'points'),
('merchant:audit', '商户审核', 'merchant'),
('statistics:view', '查看统计', 'statistics'),
('risk:blacklist:manage', '管理黑名单', 'risk')
ON DUPLICATE KEY UPDATE perm_name = VALUES(perm_name);

INSERT INTO system_config (config_key, config_value, remark) VALUES
('ai.auto_approve_score', '85', 'AI 自动通过阈值'),
('ai.manual_review_score', '60', '进入人工审核阈值'),
('checkin.default_radius_meter', '300', '默认打卡半径'),
('blindbox.animation_seconds', '3', '盲盒动画秒数')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

INSERT INTO coupon_template
(coupon_name, coupon_type, provider_type, amount, discount_desc, total_count, remain_count, valid_days, rules, status)
VALUES
('本地商户满减券', 'merchant', 'local', 20.00, '满100减20', 10000, 10000, 30, JSON_OBJECT('minAmount', 100), 1),
('景区8.1折券', 'scenic', 'scenic', NULL, '门票8.1折', 1000, 1000, 15, JSON_OBJECT('discount', 0.81), 1),
('南昌地铁乘车券', 'metro', 'metro', 5.00, '地铁抵扣券', 5000, 5000, 7, JSON_OBJECT('scene', 'metro'), 1),
('滴滴5折券', 'didi', 'didi', NULL, '最高减15元', 3000, 3000, 7, JSON_OBJECT('discount', 0.5, 'cap', 15), 1),
('热门电影票兑换券', 'movie', 'movie', NULL, '指定场次可用', 800, 800, 14, JSON_OBJECT('scene', 'movie'), 1);

INSERT INTO blind_box (box_name, animation_type, day_limit, total_limit, status)
VALUES ('文旅消费盲盒', 'gift_open', 3, NULL, 1);

SET @box_id = (SELECT id FROM blind_box WHERE box_name = '文旅消费盲盒' LIMIT 1);

INSERT INTO blind_box_reward
(blind_box_id, reward_name, coupon_template_id, weight, stock, remain_stock, is_thanks, status)
SELECT @box_id, '景区8.1折券', id, 5, 1000, 1000, 0, 1 FROM coupon_template WHERE coupon_name = '景区8.1折券'
UNION ALL
SELECT @box_id, '地铁乘车券', id, 20, 5000, 5000, 0, 1 FROM coupon_template WHERE coupon_name = '南昌地铁乘车券'
UNION ALL
SELECT @box_id, '滴滴5折券', id, 25, 3000, 3000, 0, 1 FROM coupon_template WHERE coupon_name = '滴滴5折券'
UNION ALL
SELECT @box_id, '电影票券', id, 10, 800, 800, 0, 1 FROM coupon_template WHERE coupon_name = '热门电影票兑换券'
UNION ALL
SELECT @box_id, '商户满减券', id, 30, 10000, 10000, 0, 1 FROM coupon_template WHERE coupon_name = '本地商户满减券'
UNION ALL
SELECT @box_id, '谢谢参与', NULL, 10, 999999, 999999, 1, 1;
