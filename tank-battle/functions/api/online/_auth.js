export async function verifyToken(request, env) {
  const h = request.headers.get('Authorization') || '';
  const token = h.replace('Bearer ', '');
  if (!token) return null;
  const s = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.username
     FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.token = ?`
  ).bind(token).first();
  if (!s || new Date(s.expires_at) < new Date()) return null;
  return s;
}
export function genRoomId() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}