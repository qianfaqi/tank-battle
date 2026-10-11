export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const sortBy = url.searchParams.get('sort') || 'wins'; // wins | damage | games
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  let orderClause = 's.total_wins DESC';
  if (sortBy === 'damage') orderClause = 's.total_damage DESC';
  else if (sortBy === 'games') orderClause = 's.total_games DESC';

  const { results } = await env.DB.prepare(
    `SELECT u.username, s.total_wins, s.total_losses, s.total_games,
            s.total_damage, s.best_turn_count
     FROM user_saves s
     JOIN users u ON s.user_id = u.id
     WHERE s.total_games > 0
     ORDER BY ${orderClause}
     LIMIT ?`
  ).bind(limit).all();

  return Response.json({
    leaderboard: results.map((row, i) => ({
      rank: i + 1,
      username: row.username,
      wins: row.total_wins,
      losses: row.total_losses,
      games: row.total_games,
      damage: Math.round(row.total_damage * 10) / 10,
      bestTurns: row.best_turn_count === 999 ? '-' : row.best_turn_count,
    })),
  });
}