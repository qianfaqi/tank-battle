import { verifyToken } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const { roomId, tank, mapId } = body;

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'selecting') return Response.json({ error: '不在选坦克阶段' }, { status: 400 });

  const isHost = room.host_id === s.user_id;
  const isGuest = room.guest_id === s.user_id;
  if (!isHost && !isGuest) return Response.json({ error: '不是成员' }, { status: 403 });
  if (isGuest && !room.guest_id) return Response.json({ error: '还没加入' }, { status: 400 });

  if (isHost) {
    await env.DB.prepare(
      `UPDATE online_rooms SET host_tank=?, map_id=COALESCE(?,map_id), updated_at=datetime('now') WHERE id=?`
    ).bind(tank, mapId || null, roomId).run();
  } else {
    await env.DB.prepare(
      `UPDATE online_rooms SET guest_tank=?, updated_at=datetime('now') WHERE id=?`
    ).bind(tank, roomId).run();
  }

  return Response.json({ success: true });
}