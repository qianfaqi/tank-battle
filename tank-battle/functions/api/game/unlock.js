/* ============================================================
   坦克稀有度系统 & 解锁配置
   —— 与前端 config.js 的 TANK_RARITY / INITIAL_TANKS 保持一致
   ★ 修复：nano_3 / robot_plus 可被解锁（与前端一致）
============================================================ */

export const INITIAL_TANKS = ['basic', 'armored_car'];

// 所有可解锁坦克（不含 base_tank、机器人、导弹、核弹等衍生单位）
export const ALL_UNLOCKABLE_TANKS = [
  // 稀有度 1
  'basic', 'armored_car',
  // 稀有度 2
  'water_ghost', 'fast_tank',
  // 稀有度 3
  'heavy_tank', 'shield_tank', 'melee_tank',
  // 稀有度 4
  'siege_tank', 'dm_car', 'repair_tank',
  // 稀有度 5
  'flame_tank', 'digger_car', 'engineer', 'rocket_launcher',
  // 稀有度 6
  'super_heavy', 'artillery_tank', 'nano_3', 'nano_repair',
  // 稀有度 7
  'apocalypse', 'nuke_launcher',
  // 稀有度 8
  'fire_tank', 'robot_plus', 'nano_2', 'nano_1'
];

export const UNLOCK_ORDER = ALL_UNLOCKABLE_TANKS;

export const TANK_RARITY = {
  basic: 1, armored_car: 1,
  water_ghost: 2, fast_tank: 2,
  heavy_tank: 3, shield_tank: 3, melee_tank: 3,
  siege_tank: 4, dm_car: 4, repair_tank: 4,
  flame_tank: 5, digger_car: 5, engineer: 5, rocket_launcher: 5,
  super_heavy: 6, artillery_tank: 6, nano_3: 6, nano_repair: 6,
  apocalypse: 7, nuke_launcher: 7,
  fire_tank: 8, robot_plus: 8, nano_2: 8, nano_1: 8,
  base_tank: 9
};

export function pickRandomUnlock(currentList) {
  const unlocked = (currentList && currentList.length ? currentList : INITIAL_TANKS.slice());
  const pool = [];
  for (const id of ALL_UNLOCKABLE_TANKS) {
    if (unlocked.indexOf(id) >= 0) continue;
    const rarity = TANK_RARITY[id] || 5;
    const weight = Math.max(1, Math.round(10 - rarity * 1.2));
    for (let i = 0; i < weight; i++) pool.push(id);
  }
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

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
  if (!session) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch (e) {}
  const { mode, result, tankUsed, damageDealt, turnCount } = body || {};

  await env.DB.prepare(
    `INSERT INTO match_records (user_id, result, mode, tank_used, damage_dealt, turn_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(session.user_id, result || 'loss', mode || 'pve', tankUsed || 'basic', damageDealt || 0, turnCount || 0).run();

  let save = await env.DB.prepare('SELECT * FROM user_saves WHERE user_id = ?').bind(session.user_id).first();
  if (!save) {
    await env.DB.prepare(`INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, ?)`).bind(session.user_id, INITIAL_TANKS.join(',')).run();
    save = await env.DB.prepare('SELECT * FROM user_saves WHERE user_id = ?').bind(session.user_id).first();
  }

  let unlockedList = (save.unlocked_tanks || INITIAL_TANKS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
  if (!unlockedList.includes('basic')) unlockedList.unshift('basic');

  let newUnlock = null;
  if (result === 'win' && mode === 'pve') {
    newUnlock = pickRandomUnlock(unlockedList);
    if (newUnlock && !unlockedList.includes(newUnlock)) unlockedList.push(newUnlock);
  }

  const wins = (save.total_wins || 0) + (result === 'win' ? 1 : 0);
  const losses = (save.total_losses || 0) + (result === 'loss' ? 1 : 0);
  const games = (save.total_games || 0) + 1;
  const totalDamage = (save.total_damage || 0) + (damageDealt || 0);
  const bestTurns = (result === 'win' && turnCount > 0) ? Math.min(save.best_turn_count || 999, turnCount) : (save.best_turn_count || 999);

  await env.DB.prepare(
    `UPDATE user_saves
     SET unlocked_tanks = ?, total_wins = ?, total_losses = ?,
         total_games = ?, total_damage = ?, best_turn_count = ?,
         updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(unlockedList.join(','), wins, losses, games, totalDamage, bestTurns, session.user_id).run();

  return Response.json({
    success: true,
    unlockedTanks: unlockedList,
    newUnlock,
    stats: { wins, losses, games, totalDamage }
  });
}