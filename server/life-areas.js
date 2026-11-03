import express from 'express';

const validAreas = new Set([
  'money',
  'health',
  'learning',
  'goals',
  'reading',
  'habits',
  'career',
  'business',
  'relationships',
]);

export function createLifeAreaRouter(pool, requireAuth) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get('/', async (request, response) => {
    try {
      const result = await pool.query(
        'SELECT area_slug, intention, check_ins, updated_at FROM life_area_updates WHERE user_id = $1',
        [request.user.id],
      );
      return response.json({
        areas: result.rows.map((row) => ({
          slug: row.area_slug,
          intention: row.intention,
          checkIns: row.check_ins,
          updatedAt: row.updated_at,
        })),
      });
    } catch (error) {
      console.error('Could not load life area updates:', error.message);
      return response.status(503).json({ error: 'Your life areas could not be loaded right now.' });
    }
  });

  router.put('/:slug', async (request, response) => {
    const { slug } = request.params;
    const intention = typeof request.body?.intention === 'string' ? request.body.intention.trim() : '';

    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });
    if (intention.length > 240) {
      return response.status(400).json({ error: 'Keep your intention to 240 characters or fewer.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO life_area_updates (user_id, area_slug, intention) VALUES ($1, $2, $3) ' +
          'ON CONFLICT (user_id, area_slug) DO UPDATE SET intention = EXCLUDED.intention, updated_at = NOW() ' +
          'RETURNING area_slug, intention, check_ins, updated_at',
        [request.user.id, slug, intention],
      );
      return response.json({ area: toPublicArea(result.rows[0]) });
    } catch (error) {
      console.error('Could not save a life area intention:', error.message);
      return response.status(503).json({ error: 'Your intention could not be saved right now.' });
    }
  });

  router.post('/:slug/check-ins', async (request, response) => {
    const { slug } = request.params;
    if (!validAreas.has(slug)) return response.status(404).json({ error: 'That life area was not found.' });

    try {
      const result = await pool.query(
        'INSERT INTO life_area_updates (user_id, area_slug, check_ins) VALUES ($1, $2, 1) ' +
          'ON CONFLICT (user_id, area_slug) DO UPDATE ' +
          'SET check_ins = life_area_updates.check_ins + 1, updated_at = NOW() ' +
          'RETURNING area_slug, intention, check_ins, updated_at',
        [request.user.id, slug],
      );
      return response.json({ area: toPublicArea(result.rows[0]) });
    } catch (error) {
      console.error('Could not save a life area check-in:', error.message);
      return response.status(503).json({ error: 'Your check-in could not be saved right now.' });
    }
  });

  return router;
}

function toPublicArea(row) {
  return {
    slug: row.area_slug,
    intention: row.intention,
    checkIns: row.check_ins,
    updatedAt: row.updated_at,
  };
}