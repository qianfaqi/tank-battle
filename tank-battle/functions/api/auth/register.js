// 密码哈希使用 Web Crypto API（SHA-256 + salt）
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const { username, password } = await request.json();

  // 参数校验
  if (!username || !password) {
    return Response.json({ error: '用户名和密码不能为空' }, { status: 400 });
  }
  if (username.length < 3 || username.length > 20) {
    return Response.json({ error: '用户名长度需在 3-20 个字符之间' }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: '密码长度至少 6 位' }, { status: 400 });
  }

  // 检查用户名是否已存在
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existing) {
    return Response.json({ error: '用户名已被注册' }, { status: 409 });
  }

  // 创建用户
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await env.DB.prepare(
    'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)'
  ).bind(username, passwordHash, salt).run();

  const userId = result.meta.last_row_id;

  // 自动创建存档记录，默认解锁 basic 坦克
  await env.DB.prepare(
    `INSERT INTO user_saves (user_id, unlocked_tanks) VALUES (?, 'basic')`
  ).bind(userId).run();

  // 创建会话 token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();

  return Response.json({
    success: true,
    token,
    user: { id: userId, username },
    unlockedTanks: ['basic'],
  });
}