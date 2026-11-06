import express from 'express';
import { clearSessionCookie } from './auth.js';
import { cancelStripeSubscriptionForAccountDeletion } from './billing.js';

export function createAccountRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/onboarding', async (request, response) => {
    try {
      const result = await pool.query(
        'SELECT onboarding_completed, focus_areas, focus_intention FROM users WHERE id = $1',
        [request.user.id],
      );
      const row = result.rows[0];
      return response.json({
        completed: Boolean(row?.onboarding_completed),
        focusAreas: row?.focus_areas || [],
        focusIntention: row?.focus_intention || '',
      });
    } catch (error) {
      console.error('Could not load onboarding preferences:', error.message);
      return response.status(503).json({ error: 'Your starting preferences could not be loaded.' });
    }
  });

  router.put('/onboarding', async (request, response) => {
    const focusAreas = request.body?.focusAreas;
    const focusIntention = typeof request.body?.focusIntention === 'string' ? request.body.focusIntention.trim() : '';
    const validAreas = new Set(['money', 'health', 'learning', 'goals', 'reading', 'habits', 'career', 'business', 'relationships']);
    if (!Array.isArray(focusAreas) || focusAreas.length > 3 ||
      focusAreas.some((slug) => typeof slug !== 'string' || !validAreas.has(slug)) ||
      new Set(focusAreas).size !== focusAreas.length || focusIntention.length > 240) {
      return response.status(400).json({ error: 'Choose up to three areas and keep your intention under 240 characters.' });
    }
    try {
      const result = await pool.query(
        'UPDATE users SET onboarding_completed = TRUE, focus_areas = $2, focus_intention = $3 WHERE id = $1 ' +
          'RETURNING onboarding_completed, focus_areas, focus_intention',
        [request.user.id, focusAreas, focusIntention],
      );
      const row = result.rows[0];
      return response.json({ completed: Boolean(row?.onboarding_completed), focusAreas: row?.focus_areas || [], focusIntention: row?.focus_intention || '' });
    } catch (error) {
      console.error('Could not save onboarding preferences:', error.message);
      return response.status(503).json({ error: 'Your starting preferences could not be saved.' });
    }
  });

  router.get('/export', async (request, response) => {
    try {
      const [areaResult, taskResult, activityResult, journalActivityResult, journalResult, contactResult, healthMetricsResult, healthGoalsResult, billingResult, onboardingResult] = await Promise.all([
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
        pool.query(
          'SELECT status, current_period_end, cancel_at_period_end FROM lifeos_subscriptions WHERE user_id = $1',
          [request.user.id],
        ),
        pool.query(
          'SELECT onboarding_completed, focus_areas, focus_intention FROM users WHERE id = $1',
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
        subscription: billingResult.rows[0] ? {
          status: billingResult.rows[0].status,
          currentPeriodEnd: billingResult.rows[0].current_period_end,
          cancelAtPeriodEnd: billingResult.rows[0].cancel_at_period_end,
        } : null,
        onboarding: onboardingResult.rows[0] ? {
          completed: Boolean(onboardingResult.rows[0].onboarding_completed),
          focusAreas: onboardingResult.rows[0].focus_areas || [],
          focusIntention: onboardingResult.rows[0].focus_intention || '',
        } : null,
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
    try {
      await cancelStripeSubscriptionForAccountDeletion(pool, request.user.id);
    } catch (error) {
      console.error('Could not cancel billing before account deletion:', error.message);
      return response.status(503).json({ error: 'Your subscription could not be cancelled, so your account has been kept. Manage the subscription first, then try again.' });
    }
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
