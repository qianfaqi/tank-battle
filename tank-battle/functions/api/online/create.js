import { verifyToken, genRoomId } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  const existing = await env.DB.prepare(
    `SELECT id FROM online_rooms
     WHERE (host_id=? OR guest_id=?) AND status IN ('selecting','playing')
       AND datetime(updated_at) > datetime('now','-30 minutes') LIMIT 1`
  ).bind(s.user_id, s.user_id).first();
  if (existing) return Response.json({ error: '你有未完成的房间：' + existing.id }, { status: 400 });

  let roomId = genRoomId();
  for (let i = 0; i < 5; i++) {
    const dup = await env.DB.prepare('SELECT 1 FROM online_rooms WHERE id=?').bind(roomId).first();
    if (!dup) break;
    roomId = genRoomId();
  }
  await env.DB.prepare(
    `INSERT INTO online_rooms (id, host_id, host_name, status) VALUES (?, ?, ?, 'selecting')`
  ).bind(roomId, s.user_id, s.username).run();

  return Response.json({ success: true, roomId });
}