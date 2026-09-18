async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return Response.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }

  // 查找用户
  const user = await env.DB.prepare(
    'SELECT id, username, password_hash, salt FROM users WHERE username = ?'
  ).bind(username).first();

  if (!user) {
    return Response.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // 验证密码
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return Response.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  // 更新最后登录时间
  await env.DB.prepare(
    `UPDATE users SET last_login = datetime('now') WHERE id = ?`
  ).bind(user.id).run();

  // 创建新 token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  // 读取存档
  const save = await env.DB.prepare(
    'SELECT unlocked_tanks, total_wins, total_losses, total_games FROM user_saves WHERE user_id = ?'
  ).bind(user.id).first();

  return Response.json({
    success: true,
    token,
    user: { id: user.id, username: user.username },
    unlockedTanks: save ? save.unlocked_tanks.split(',') : ['basic'],
    stats: save || { total_wins: 0, total_losses: 0, total_games: 0 },
  });
}