async function verifyToken(token, env) {
  if (!token) return null;
  const session = await env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE token = ?`
  ).bind(token).first();
  if (!session || new Date(session.expires_at) < new Date()) return null;
  return session;
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const session = await verifyToken(token, env);
  if (!session) return Response.json({ error: '未登录' }, { status: 401 });

  const save = await env.DB.prepare(
    'SELECT * FROM user_saves WHERE user_id = ?'
  ).bind(session.user_id).first();

  if (!save) {
    // 存档不存在则创建
    await env.DB.prepare(
      `INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, 'basic')`
    ).bind(session.user_id).run();
    return Response.json({
      unlockedTanks: ['basic'],
      stats: { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0 },
    });
  }

  return Response.json({
    unlockedTanks: save.unlocked_tanks.split(','),
    stats: {
      total_wins: save.total_wins,
      total_losses: save.total_losses,
      total_games: save.total_games,
      total_damage: save.total_damage,
    },
  });
}