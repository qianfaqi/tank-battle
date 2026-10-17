import { verifyToken } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const roomId = String(body.roomId || '').toUpperCase();
  if (!roomId) return Response.json({ error: '缺少房间号' }, { status: 400 });

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'selecting') return Response.json({ error: '房间已开始/已结束' }, { status: 400 });
  if (room.host_id === s.user_id) return Response.json({ error: '不能加入自己的房间' }, { status: 400 });
  if (room.guest_id) return Response.json({ error: '房间已满' }, { status: 400 });

  await env.DB.prepare(
    `UPDATE online_rooms SET guest_id=?, guest_name=?, updated_at=datetime('now') WHERE id=?`
  ).bind(s.user_id, s.username, roomId).run();

  return Response.json({ success: true, roomId });
}