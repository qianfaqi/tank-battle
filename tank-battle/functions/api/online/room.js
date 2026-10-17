import { verifyToken } from './_auth.js';

export async function onRequestGet({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  const url = new URL(request.url);
  const roomId = String(url.searchParams.get('id') || '').toUpperCase();
  const withState = url.searchParams.get('state') === '1';

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ error: '房间不存在' }, { status: 404 });
  if (room.host_id !== s.user_id && room.guest_id !== s.user_id) {
    return Response.json({ error: '不是成员' }, { status: 403 });
  }
  if (!withState) delete room.state_json;

  return Response.json({ room });
}