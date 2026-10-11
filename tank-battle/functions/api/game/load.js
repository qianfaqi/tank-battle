const INITIAL_TANKS = ['basic', 'armored_car'];

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
    const initialTanksStr = INITIAL_TANKS.join(',');
    await env.DB.prepare(
      `INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, ?)`
    ).bind(session.user_id, initialTanksStr).run();
    return Response.json({
      unlockedTanks: INITIAL_TANKS.slice(),
      stats: { total_wins: 0, total_losses: 0, total_games: 0, total_damage: 0 }
    });
  }

  const unlockedArr = (save.unlocked_tanks || INITIAL_TANKS.join(','))
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!unlockedArr.includes('basic')) unlockedArr.unshift('basic');

  return Response.json({
    unlockedTanks: unlockedArr,
    stats: {
      total_wins:   save.total_wins   || 0,
      total_losses: save.total_losses || 0,
      total_games:  save.total_games  || 0,
      total_damage: save.total_damage || 0
    }
  });
}