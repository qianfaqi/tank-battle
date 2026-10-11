-- ============================================================
-- 迁移 0002：为 user_saves 添加战役进度字段
-- 说明：
--   campaign_progress 以逗号分隔的关卡索引，例："0,1,2"
--   （对应 CAMPAIGN_LEVELS 数组下标）
-- 在 Cloudflare D1 Console 执行本文件即可
-- ============================================================

ALTER TABLE user_saves ADD COLUMN campaign_progress TEXT DEFAULT '';