import express from 'express';

export function createInsightsRouter(pool, requireAuth, requirePlus) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.get('/weekly/plus', requireAuth, requirePlus, async (request, response) => {
    const weekStart = typeof request.query.weekStart === 'string' ? request.query.weekStart : '';
    if (!isDateString(weekStart)) return response.status(400).json({ error: 'Choose a valid week.' });
    const weekEnd = addDays(weekStart, 7);
    const previousStart = addDays(weekStart, -7);
    try {
      const result = await pool.query(
        'WITH activity AS (' +
          'SELECT activity_date AS activity_day, area_slug FROM life_area_check_ins WHERE user_id = $1 ' +
            'AND activity_date >= $4::date AND activity_date < $3::date ' +
          'UNION ALL SELECT completed_on, area_slug FROM life_tasks WHERE user_id = $1 AND completed = TRUE ' +
            'AND completed_on >= $4::date AND completed_on < $3::date ' +
          "UNION ALL SELECT activity_date, ''::text FROM life_area_journal_activity WHERE user_id = $1 " +
            'AND activity_date >= $4::date AND activity_date < $3::date' +
        '), totals AS (SELECT ' +
          'COUNT(DISTINCT activity_day) FILTER (WHERE activity_day >= $2::date AND activity_day < $3::date)::integer AS this_week_days, ' +
          'COUNT(DISTINCT activity_day) FILTER (WHERE activity_day >= $4::date AND activity_day < $2::date)::integer AS last_week_days ' +
          'FROM activity), areas AS (SELECT area_slug, COUNT(*)::integer AS count FROM activity ' +
          "WHERE activity_day >= $2::date AND activity_day < $3::date AND area_slug <> '' " +
          'GROUP BY area_slug ORDER BY count DESC, area_slug LIMIT 1) ' +
        'SELECT totals.this_week_days, totals.last_week_days, areas.area_slug AS most_active_area FROM totals LEFT JOIN areas ON TRUE',
        [request.user.id, weekStart, weekEnd, previousStart],
      );
      const row = result.rows[0] || {};
      return response.json({
        activeDaysThisWeek: Number(row.this_week_days || 0),
        activeDaysLastWeek: Number(row.last_week_days || 0),
        mostActiveArea: row.most_active_area || null,
      });
    } catch (error) {
      console.error('Could not create the Plus weekly reflection:', error.message);
      return response.status(503).json({ error: 'Your deeper weekly reflection could not be prepared.' });
    }
  });

  router.get('/weekly', requireAuth, async (request, response) => {
    const weekStart = typeof request.query.weekStart === 'string' ? request.query.weekStart : '';
    if (!isDateString(weekStart)) return response.status(400).json({ error: 'Choose a valid week.' });
    const weekEnd = addDays(weekStart, 7);
    try {
      const [statsResult, reviewResult] = await Promise.all([
        pool.query(
          'WITH activity AS (' +
            'SELECT activity_date AS activity_day FROM life_area_check_ins WHERE user_id = $1 AND activity_date >= $2::date AND activity_date < $3::date ' +
            'UNION SELECT activity_date FROM life_area_journal_activity WHERE user_id = $1 AND activity_date >= $2::date AND activity_date < $3::date ' +
            'UNION SELECT completed_on FROM life_tasks WHERE user_id = $1 AND completed = TRUE AND completed_on >= $2::date AND completed_on < $3::date' +
          ') SELECT (SELECT COUNT(*)::integer FROM activity) AS active_days, ' +
            '(SELECT COUNT(*)::integer FROM life_area_journal_entries WHERE user_id = $1 AND updated_at::date >= $2::date AND updated_at::date < $3::date) AS notes_saved, ' +
            '(SELECT COUNT(*)::integer FROM life_tasks WHERE user_id = $1 AND completed = TRUE AND completed_on >= $2::date AND completed_on < $3::date) AS tasks_completed',
          [request.user.id, weekStart, weekEnd],
        ),
        pool.query(
          'SELECT reflection, next_focus, updated_at FROM lifeos_weekly_reviews WHERE user_id = $1 AND week_start = $2::date',
          [request.user.id, weekStart],
        ),
      ]);
      const stats = statsResult.rows[0] || {};
      const review = reviewResult.rows[0] || {};
      return response.json({
        weekStart,
        activeDays: Number(stats.active_days || 0),
        notesSaved: Number(stats.notes_saved || 0),
        tasksCompleted: Number(stats.tasks_completed || 0),
        reflection: review.reflection || '',
        nextFocus: review.next_focus || '',
        updatedAt: review.updated_at || null,
      });
    } catch (error) {
      console.error('Could not load the weekly reset:', error.message);
      return response.status(503).json({ error: 'Your weekly reset could not be loaded.' });
    }
  });

  router.put('/weekly', requireAuth, async (request, response) => {
    const weekStart = typeof request.body?.weekStart === 'string' ? request.body.weekStart : '';
    const activityDate = typeof request.body?.activityDate === 'string' ? request.body.activityDate : '';
    const reflection = typeof request.body?.reflection === 'string' ? request.body.reflection.trim() : '';
    const nextFocus = typeof request.body?.nextFocus === 'string' ? request.body.nextFocus.trim() : '';
    if (!isDateString(weekStart) || !isDateString(activityDate) || reflection.length > 2000 || nextFocus.length > 240 || (!reflection && !nextFocus)) {
      return response.status(400).json({ error: 'Add a reflection or next-week focus, then try saving again.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        'INSERT INTO lifeos_weekly_reviews (user_id, week_start, reflection, next_focus) VALUES ($1, $2::date, $3, $4) ' +
          'ON CONFLICT (user_id, week_start) DO UPDATE SET reflection = EXCLUDED.reflection, next_focus = EXCLUDED.next_focus, updated_at = NOW() ' +
          'RETURNING reflection, next_focus, updated_at',
        [request.user.id, weekStart, reflection, nextFocus],
      );
      await client.query(
        'INSERT INTO life_area_journal_activity (user_id, activity_date) VALUES ($1, $2::date) ON CONFLICT DO NOTHING',
        [request.user.id, activityDate],
      );
      await client.query('COMMIT');
      const row = result.rows[0];
      return response.json({ weekStart, reflection: row.reflection, nextFocus: row.next_focus, updatedAt: row.updated_at });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not save the weekly reset:', error.message);
      return response.status(503).json({ error: 'Your weekly reset could not be saved.' });
    } finally {
      client.release();
    }
  });

  router.get('/', requireAuth, requirePlus, async (request, response) => {
    try {
      const result = await pool.query(
        'WITH activity AS (' +
          "SELECT activity_date AS activity_day, area_slug, 'check-in'::text AS kind FROM life_area_check_ins " +
            'WHERE user_id = $1 AND activity_date >= CURRENT_DATE - 29 ' +
          'UNION ALL ' +
          "SELECT completed_on AS activity_day, area_slug, 'task'::text AS kind FROM life_tasks " +
            'WHERE user_id = $1 AND completed = TRUE AND completed_on >= CURRENT_DATE - 29' +
        '), totals AS (' +
          'SELECT ' +
            'COUNT(DISTINCT activity_day) FILTER (WHERE activity_day >= CURRENT_DATE - 6)::integer AS active_days_last_7, ' +
            'COUNT(DISTINCT activity_day) FILTER (WHERE activity_day BETWEEN CURRENT_DATE - 13 AND CURRENT_DATE - 7)::integer AS active_days_previous_7, ' +
            "COUNT(*) FILTER (WHERE kind = 'check-in')::integer AS check_ins_last_30, " +
            "COUNT(*) FILTER (WHERE kind = 'task')::integer AS tasks_completed_last_30 " +
          'FROM activity' +
        '), areas AS (' +
          'SELECT area_slug, COUNT(*)::integer AS activity_count FROM activity ' +
          'GROUP BY area_slug ORDER BY activity_count DESC, area_slug LIMIT 1' +
        ') SELECT totals.*, areas.area_slug AS most_active_area, areas.activity_count AS most_active_area_count ' +
          'FROM totals LEFT JOIN areas ON TRUE',
        [request.user.id],
      );
      const row = result.rows[0] || {};
      return response.json({
        periodDays: 30,
        activeDaysLast7: Number(row.active_days_last_7 || 0),
        activeDaysPrevious7: Number(row.active_days_previous_7 || 0),
        checkInsLast30: Number(row.check_ins_last_30 || 0),
        tasksCompletedLast30: Number(row.tasks_completed_last_30 || 0),
        mostActiveArea: row.most_active_area || null,
        mostActiveAreaCount: Number(row.most_active_area_count || 0),
      });
    } catch (error) {
      console.error('Could not create the Plus reflection:', error.message);
      return response.status(503).json({ error: 'Your reflection could not be prepared right now.' });
    }
  });
  return router;
}

export async function ensureInsightsSchema(pool) {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS lifeos_weekly_reviews (' +
      'user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, ' +
      'week_start DATE NOT NULL, reflection TEXT NOT NULL DEFAULT \'\' CHECK (char_length(reflection) <= 2000), ' +
      'next_focus VARCHAR(240) NOT NULL DEFAULT \'\', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), ' +
      'PRIMARY KEY (user_id, week_start)' +
    ')'
  );
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value + 'T12:00:00Z').getTime());
}

function addDays(value, amount) {
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
