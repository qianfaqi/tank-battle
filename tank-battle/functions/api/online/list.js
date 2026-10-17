export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, host_name, host_tank, map_id, created_at FROM online_rooms
     WHERE status='selecting' AND guest_id IS NULL
       AND datetime(updated_at) > datetime('now','-30 minutes')
     ORDER BY created_at DESC LIMIT 30`
  ).all();
  return Response.json({ rooms: results });
}