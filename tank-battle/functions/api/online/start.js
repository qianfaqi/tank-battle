import { verifyToken } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const roomId = String(body.roomId || '').toUpperCase();

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ error: '房间不存在' }, { status: 404 });
  if (room.host_id !== s.user_id) return Response.json({ error: '只有房主能开始' }, { status: 403 });
  if (room.status !== 'selecting') return Response.json({ error: '状态错误' }, { status: 400 });
  if (!room.guest_id) return Response.json({ error: '对手还没加入' }, { status: 400 });
  if (!room.host_tank || !room.guest_tank) return Response.json({ error: '双方都要选坦克' }, { status: 400 });

  await env.DB.prepare(
    `UPDATE online_rooms SET status='playing', state_json=NULL, current_team='red', move_count=0, updated_at=datetime('now') WHERE id=?`
  ).bind(roomId).run();

  return Response.json({ success: true });
}