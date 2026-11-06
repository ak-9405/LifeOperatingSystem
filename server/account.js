import express from 'express';
import { clearSessionCookie } from './auth.js';

export function createAccountRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/export', async (request, response) => {
    try {
      const [areaResult, taskResult, activityResult, journalActivityResult, journalResult, contactResult, healthMetricsResult, healthGoalsResult] = await Promise.all([
        pool.query(
          'SELECT area_slug, intention, check_ins, updated_at FROM life_area_updates WHERE user_id = $1 ORDER BY area_slug',
          [request.user.id],
        ),
        pool.query(
          'SELECT task_id, title, area_slug, estimated_minutes, completed, completed_on, task_date, reminder_time, created_at, updated_at ' +
            'FROM life_tasks WHERE user_id = $1 ORDER BY task_date, created_at',
          [request.user.id],
        ),
        pool.query(
          'SELECT area_slug, activity_date FROM life_area_check_ins WHERE user_id = $1 ORDER BY activity_date',
          [request.user.id],
        ),
        pool.query(
          'SELECT activity_date FROM life_area_journal_activity WHERE user_id = $1 ORDER BY activity_date',
          [request.user.id],
        ),
        pool.query(
          "SELECT entry_id, area_slug, TO_CHAR(entry_date, 'YYYY-MM-DD') AS date, body, updated_at " +
            'FROM life_area_journal_entries WHERE user_id = $1 ORDER BY entry_date, area_slug, entry_id',
          [request.user.id],
        ),
        pool.query(
          'SELECT id, name, email, area, message, created_at FROM contacts WHERE LOWER(email) = LOWER($1) ORDER BY created_at',
          [request.user.email],
        ),
        pool.query(
          "SELECT TO_CHAR(metric_date, 'YYYY-MM-DD') AS date, steps, sleep_minutes, resting_pulse, source, updated_at " +
            'FROM health_daily_metrics WHERE user_id = $1 ORDER BY metric_date',
          [request.user.id],
        ),
        pool.query(
          'SELECT metric_key, target_value, updated_at FROM health_goals WHERE user_id = $1 ORDER BY metric_key',
          [request.user.id],
        ),
      ]);

      return response.json({
        exportedAt: new Date().toISOString(),
        account: { name: request.user.name, email: request.user.email },
        lifeAreas: areaResult.rows.map((row) => ({
          slug: row.area_slug,
          intention: row.intention,
          checkIns: row.check_ins,
          updatedAt: row.updated_at,
        })),
        tasks: taskResult.rows.map((row) => ({
          id: row.task_id,
          title: row.title,
          areaSlug: row.area_slug,
          estimatedMinutes: row.estimated_minutes,
          completed: row.completed,
          completedOn: row.completed_on ? dateValue(row.completed_on) : null,
          taskDate: dateValue(row.task_date),
          reminderTime: row.reminder_time ? String(row.reminder_time).slice(0, 5) : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        activityHistory: [
          ...activityResult.rows.map((row) => ({ areaSlug: row.area_slug, date: dateValue(row.activity_date), kind: 'check-in' })),
          ...journalActivityResult.rows.map((row) => ({ date: dateValue(row.activity_date), kind: 'journal' })),
        ],
        lifeAreaJournal: journalResult.rows.map((row) => ({ id: String(row.entry_id), areaSlug: row.area_slug, date: row.date, text: row.body, updatedAt: row.updated_at })),
        healthMetrics: healthMetricsResult.rows.map((row) => ({ date: row.date, steps: row.steps === null ? null : Number(row.steps), sleepMinutes: row.sleep_minutes === null ? null : Number(row.sleep_minutes), restingPulse: row.resting_pulse === null ? null : Number(row.resting_pulse), source: row.source, updatedAt: row.updated_at })),
        healthGoals: healthGoalsResult.rows.map((row) => ({ metric: row.metric_key, target: Number(row.target_value), updatedAt: row.updated_at })),
        contactNotes: contactResult.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          topic: row.area,
          message: row.message,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      console.error('Could not export account data:', error.message);
      return response.status(503).json({ error: 'Your data could not be exported right now.' });
    }
  });

  router.delete('/', async (request, response) => {
    if (request.user.demo) return response.status(403).json({ error: 'The local demo account cannot be deleted. Sign out to test another account.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM contacts WHERE LOWER(email) = LOWER($1)', [request.user.email]);
      await client.query('DELETE FROM users WHERE id = $1', [request.user.id]);
      await client.query('COMMIT');
      clearSessionCookie(response);
      return response.status(204).end();
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Could not delete the account:', error.message);
      return response.status(503).json({ error: 'Your account could not be deleted right now.' });
    } finally {
      client.release();
    }
  });

  return router;
}

function dateValue(value) {
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}
