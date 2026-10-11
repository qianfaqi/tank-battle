/* ============================================================
   战役通关上报
   —— 记录通关关卡索引；同时保证存档存在
   若数据库 user_saves 表没有 campaign_progress 字段则自动跳过更新（兼容旧库）
============================================================ */

import { INITIAL_TANKS } from './unlock.js';

async function verifyToken(token, env) {
  if (!token) return null;
  const session = await env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE token = ?`
  ).bind(token).first();
  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session;
}

export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const session = await verifyToken(token, env);
  if (!session) {
    return Response.json({ error: '未登录' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const levelIndex = parseInt(body.levelIndex, 10);

  // 读取存档（不存在则创建）
  let save = await env.DB.prepare(
    'SELECT * FROM user_saves WHERE user_id = ?'
  ).bind(session.user_id).first();

  if (!save) {
    await env.DB.prepare(
      `INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, ?)`
    ).bind(session.user_id, INITIAL_TANKS.join(',')).run();
    save = await env.DB.prepare(
      'SELECT * FROM user_saves WHERE user_id = ?'
    ).bind(session.user_id).first();
  }

  // 更新战役进度（若字段不存在则忽略）
  let newProgress = (save.campaign_progress || '').toString();
  if (!isNaN(levelIndex) && levelIndex >= 0) {
    const parts = newProgress.split(',').map(s => s.trim()).filter(Boolean);
    const key = String(levelIndex);
    if (!parts.includes(key)) parts.push(key);
    newProgress = parts.join(',');
  }

  try {
    await env.DB.prepare(
      `UPDATE user_saves SET campaign_progress = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).bind(newProgress, session.user_id).run();
  } catch (e) {
    // 旧数据库没有 campaign_progress 字段 → 忽略
  }

  const clearedCount = newProgress.split(',').filter(Boolean).length;
  const unlockedList = (save.unlocked_tanks || INITIAL_TANKS.join(','))
    .split(',').map(s => s.trim()).filter(Boolean);

  return Response.json({
    success: true,
    unlockedTanks: unlockedList,
    stats: {
      total_wins:      save.total_wins      || 0,
      total_losses:    save.total_losses    || 0,
      total_games:     save.total_games     || 0,
      total_damage:    save.total_damage    || 0,
      campaign_cleared: clearedCount
    }
  });
}