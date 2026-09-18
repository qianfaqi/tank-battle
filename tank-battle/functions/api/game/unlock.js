// 坦克解锁顺序
const UNLOCK_ORDER = [
  'basic', 'fast_tank', 'heavy_tank', 'water_ghost',
  'armored_car', 'shield_tank', 'melee_tank', 'siege_tank',
  'apocalypse', 'super_heavy', 'engineer', 'rocket_launcher', 'nuke_launcher'
];

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

  const body = await request.json();
  const { mode, result, tankUsed, damageDealt, turnCount } = body;

  // 记录对局
  await env.DB.prepare(
    `INSERT INTO match_records (user_id, result, mode, tank_used, damage_dealt, turn_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(session.user_id, result, mode || 'pve', tankUsed || 'basic',
         damageDealt || 0, turnCount || 0).run();

  // 更新存档统计
  const save = await env.DB.prepare(
    'SELECT * FROM user_saves WHERE user_id = ?'
  ).bind(session.user_id).first();

  let unlockedList = save ? save.unlocked_tanks.split(',') : ['basic'];
  let newUnlock = null;

  if (result === 'win' && mode === 'pve') {
    // 人机胜利，解锁下一辆坦克
    const currentCount = unlockedList.length;
    if (currentCount < UNLOCK_ORDER.length) {
      newUnlock = UNLOCK_ORDER[currentCount];
      if (!unlockedList.includes(newUnlock)) {
        unlockedList.push(newUnlock);
      }
    }
  }

  const wins = (save?.total_wins || 0) + (result === 'win' ? 1 : 0);
  const losses = (save?.total_losses || 0) + (result === 'loss' ? 1 : 0);
  const games = (save?.total_games || 0) + 1;
  const totalDamage = (save?.total_damage || 0) + (damageDealt || 0);
  const bestTurns = result === 'win' && turnCount > 0
    ? Math.min(save?.best_turn_count || 999, turnCount)
    : (save?.best_turn_count || 999);

  await env.DB.prepare(
    `UPDATE user_saves 
     SET unlocked_tanks = ?, total_wins = ?, total_losses = ?, 
         total_games = ?, total_damage = ?, best_turn_count = ?,
         updated_at = datetime('now')
     WHERE user_id = ?`
  ).bind(unlockedList.join(','), wins, losses, games, totalDamage, bestTurns,
         session.user_id).run();

  return Response.json({
    success: true,
    unlockedTanks: unlockedList,
    newUnlock,
    stats: { wins, losses, games, totalDamage },
  });
}