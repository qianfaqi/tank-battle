import { verifyToken } from './_auth.js';

export async function onRequestPost({ request, env }) {
  const s = await verifyToken(request, env);
  if (!s) return Response.json({ error: '未登录' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const { roomId, state, winner } = body;

  const room = await env.DB.prepare('SELECT * FROM online_rooms WHERE id=?').bind(roomId).first();
  if (!room) return Response.json({ error: '房间不存在' }, { status: 404 });
  if (room.status !== 'playing' && room.status !== 'ended') return Response.json({ error: '不在战斗中' }, { status: 400 });

  const isHost = room.host_id === s.user_id;
  const isGuest = room.guest_id === s.user_id;
  if (!isHost && !isGuest) return Response.json({ error: '不是成员' }, { status: 403 });

  const isInit = room.move_count === 0;
  if (!isInit) {
    const myTeam = isHost ? 'red' : 'blue';
    if (room.current_team !== myTeam) return Response.json({ error: '还没轮到你' }, { status: 400 });
  }
  if (!state) return Response.json({ error: '缺少状态' }, { status: 400 });

  const stateStr = JSON.stringify(state);
  const nextTeam = state.currentTeam;
  const newStatus = winner ? 'ended' : 'playing';

  await env.DB.prepare(
    `UPDATE online_rooms
     SET state_json=?, current_team=?, move_count=move_count+1,
         winner_team=?, status=?, updated_at=datetime('now')
     WHERE id=?`
  ).bind(stateStr, nextTeam, winner || null, newStatus, roomId).run();

  return Response.json({ success: true });
}