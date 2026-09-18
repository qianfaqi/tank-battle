async function verifyToken(token, env) {
  if (!token) return null;
  const session = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.username 
     FROM sessions s JOIN users u ON s.user_id = u.id 
     WHERE s.token = ?`
  ).bind(token).first();

  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    // token 过期，删除
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return session;
}

export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  const session = await verifyToken(token, env);
  if (!session) {
    return Response.json({ error: '未登录或登录已过期' }, { status: 401 });
  }

  const save = await env.DB.prepare(
    'SELECT * FROM user_saves WHERE user_id = ?'
  ).bind(session.user_id).first();

  return Response.json({
    user: { id: session.user_id, username: session.username },
    unlockedTanks: save ? save.unlocked_tanks.split(',') : ['basic'],
    stats: {
      total_wins: save?.total_wins || 0,
      total_losses: save?.total_losses || 0,
      total_games: save?.total_games || 0,
      total_damage: save?.total_damage || 0,
    },
  });
}