import express from 'express';

export function createInsightsRouter(pool, requireAuth, requirePlus) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
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
