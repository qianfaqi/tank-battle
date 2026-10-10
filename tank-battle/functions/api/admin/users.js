import { checkAdmin } from './_helpers.js';

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const baseSQL = `
    SELECT u.id, u.username, u.created_at, u.last_login,
           s.unlocked_tanks, s.total_wins, s.total_losses,
           s.total_games, s.total_damage, s.best_turn_count
    FROM users u
    LEFT JOIN user_saves s ON s.user_id = u.id
  `;

  const stmt = q
    ? env.DB.prepare(baseSQL + ` WHERE u.username LIKE ? ORDER BY u.id DESC LIMIT ?`)
        .bind('%' + q + '%', limit)
    : env.DB.prepare(baseSQL + ` ORDER BY u.id DESC LIMIT ?`).bind(limit);

  const { results } = await stmt.all();
  return Response.json({ users: results });
}