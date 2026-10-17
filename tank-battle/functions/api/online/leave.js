import { verifyToken } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const roomId = String(body.roomId || '').toUpperCase();

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ success: true });

  const isHost = room.host_id === s.user_id;
  const isGuest = room.guest_id === s.user_id;
  if (!isHost && !isGuest) return Response.json({ error: '不是成员' }, { status: 403 });

  if (room.status === 'selecting') {
    if (isGuest) {
      await env.DB.prepare(
        `UPDATE online_rooms SET guest_id=NULL, guest_name=NULL, guest_tank=NULL, updated_at=datetime('now') WHERE id=?`
      ).bind(roomId).run();
    } else {
      await env.DB.prepare('DELETE FROM online_rooms WHERE id=?').bind(roomId).run();
    }
  } else if (room.status === 'playing') {
    const winner = isHost ? 'blue' : 'red';
    await env.DB.prepare(
      `UPDATE online_rooms SET status='ended', winner_team=?, updated_at=datetime('now') WHERE id=?`
    ).bind(winner, roomId).run();
  }

  return Response.json({ success: true });
}