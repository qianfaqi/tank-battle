import { checkAdmin } from './_helpers.js';
import { UNLOCK_ORDER, INITIAL_TANKS, pickRandomUnlock } from '../game/unlock.js';

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: '无效的 JSON' }, { status: 400 }); }

  const { userId, action, tankId, updates } = body;
  if (!userId) return Response.json({ error: '缺少 userId' }, { status: 400 });

  // 确认用户存在
  const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
  if (!user) return Response.json({ error: '用户不存在' }, { status: 404 });

  // 确保存档存在
  let save = await env.DB.prepare('SELECT * FROM user_saves WHERE user_id = ?').bind(userId).first();
  if (!save) {
    await env.DB.prepare('INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, ?)')
      .bind(userId, INITIAL_TANKS.join(',')).run();
    save = await env.DB.prepare('SELECT * FROM user_saves WHERE user_id = ?').bind(userId).first();
  }

  // 取得当前解锁列表（做规范化）
  function currentTanks() {
    const arr = (save.unlocked_tanks || INITIAL_TANKS.join(','))
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!arr.includes('basic')) arr.unshift('basic');
    return arr;
  }

  // ---- 预设快捷操作 ----
  if (action) {
    switch (action) {
      case 'unlock_all': {
        // 全解锁：所有可解锁坦克（不含 base_tank）
        const all = UNLOCK_ORDER.slice();
        if (!all.includes('basic')) all.unshift('basic');
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(all.join(','), userId).run();
        return Response.json({ success: true, message: '已解锁全部坦克' });
      }

      case 'unlock_initial': {
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(INITIAL_TANKS.join(','), userId).run();
        return Response.json({ success: true, message: '已重置为初始坦克（basic + armored_car）' });
      }

      case 'reset_tanks': {
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(INITIAL_TANKS.join(','), userId).run();
        return Response.json({ success: true, message: '已重置为初始坦克' });
      }

      case 'unlock_next': {
        const current = currentTanks();
        const next = pickRandomUnlock(current);
        if (!next) return Response.json({ success: true, message: '已全部解锁，无新车可解锁' });
        current.push(next);
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(current.join(','), userId).run();
        return Response.json({ success: true, message: `已随机解锁新坦克：${next}`, newUnlock: next });
      }

      case 'add_tank': {
        if (!tankId) return Response.json({ error: '缺少 tankId' }, { status: 400 });
        const current = currentTanks();
        if (!current.includes(tankId)) current.push(tankId);
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(current.join(','), userId).run();
        return Response.json({ success: true, message: `已添加坦克：${tankId}` });
      }

      case 'remove_tank': {
        if (!tankId) return Response.json({ error: '缺少 tankId' }, { status: 400 });
        let current = currentTanks().filter(t => t !== tankId);
        if (!current.includes('basic')) current.unshift('basic');
        await env.DB.prepare(
          `UPDATE user_saves SET unlocked_tanks = ?, updated_at = datetime('now') WHERE user_id = ?`
        ).bind(current.join(','), userId).run();
        return Response.json({ success: true, message: `已移除坦克：${tankId}` });
      }

      case 'reset_stats':
        await env.DB.prepare(
          `UPDATE user_saves SET total_wins = 0, total_losses = 0, total_games = 0,
             total_damage = 0, best_turn_count = 999, updated_at = datetime('now')
           WHERE user_id = ?`
        ).bind(userId).run();
        return Response.json({ success: true, message: '已重置战绩' });

      case 'delete_user':
        await env.DB.prepare('DELETE FROM match_records WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM user_saves WHERE user_id = ?').bind(userId).run();
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
        return Response.json({ success: true, message: '已删除用户（含所有关联数据）' });

      default:
        return Response.json({ error: '未知操作: ' + action }, { status: 400 });
    }
  }

  // ---- 通用字段更新（备用） ----
  if (updates && typeof updates === 'object') {
    const allowed = ['unlocked_tanks', 'total_wins', 'total_losses', 'total_games', 'total_damage', 'best_turn_count'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (key in updates) { fields.push(`${key} = ?`); values.push(updates[key]); }
    }
    if (!fields.length) return Response.json({ error: '无可更新字段' }, { status: 400 });
    fields.push(`updated_at = datetime('now')`);
    values.push(userId);
    await env.DB.prepare(
      `UPDATE user_saves SET ${fields.join(', ')} WHERE user_id = ?`
    ).bind(...values).run();
    return Response.json({ success: true, message: '更新成功' });
  }

  return Response.json({ error: '请提供 action 或 updates' }, { status: 400 });
}