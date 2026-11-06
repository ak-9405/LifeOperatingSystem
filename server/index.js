import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { createAuthRouter, createRequireAuth, ensureAuthSchema } from './auth.js';
import { createAccountRouter } from './account.js';
import { createLifeAreaRouter } from './life-areas.js';
import { createTaskRouter, ensureTaskSchema } from './tasks.js';
import { createHealthRouter, ensureHealthSchema } from './health.js';
import { createQuoteRouter, ensureQuoteSchema } from './quotes.js';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://lifeos:lifeos_dev@localhost:5432/lifeos';

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 3000,
  max: 8,
});

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

const requireAuth = createRequireAuth(pool);
app.use('/api/auth', createAuthRouter(pool));
app.use('/api/account', createAccountRouter(pool, requireAuth));
app.use('/api/life-areas', createLifeAreaRouter(pool, requireAuth));
app.use('/api/tasks', createTaskRouter(pool, requireAuth));
app.use('/api/quotes', createQuoteRouter(pool, requireAuth));
app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use('/api/health', createHealthRouter(pool, requireAuth));


app.post('/api/contact', requireAuth, async (request, response) => {
  const { name, email, area, message } = request.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanArea = typeof area === 'string' ? area.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return response.status(400).json({ error: 'Please complete the required fields.' });
  }

  if (
    cleanName.length > 100 ||
    cleanEmail.length > 254 ||
    cleanArea.length > 80 ||
    cleanMessage.length > 2000 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return response.status(400).json({ error: 'Please check your details and try again.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO contacts (name, email, area, message) VALUES ($1, $2, $3, $4) RETURNING id',
      [cleanName, cleanEmail, cleanArea, cleanMessage],
    );

    return response.status(201).json({ received: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Could not save contact request:', error.message);
    return response.status(503).json({
      error: 'Your note could not be saved right now. Please try again in a moment.',
    });
  }
});

app.post('/api/translate', async (request, response) => {
  const { texts, target } = request.body ?? {};
  const supportedLanguages = new Set(['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh-Hans']);
  const translationServiceUrl = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:5000/translate';

  if (
    !supportedLanguages.has(target) ||
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > 100 ||
    texts.some((text) => typeof text !== 'string' || text.length > 5000)
  ) {
    return response.status(400).json({ error: 'This translation request is not valid.' });
  }

  try {
    const translationResponse = await fetch(translationServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'en', target, format: 'text' }),
    });
    const translationData = await translationResponse.json();
    const translations = translationData?.translatedText;

    if (
      !translationResponse.ok ||
      !Array.isArray(translations) ||
      translations.length !== texts.length
    ) {
      console.error('Local translation service returned an incomplete or unsuccessful response.');
      return response.status(502).json({
        error: 'The local translation service could not complete this request. Please try again.',
      });
    }

    return response.json({ translations });
  } catch (error) {
    console.error('Could not reach the local translation service:', error.message);
    return response.status(503).json({
      error: 'The local translation service is still starting. Please try again in a moment.',
    });
  }
});

async function startServer() {
  await ensureAuthSchema(pool);
  await ensureTaskSchema(pool);
  await ensureHealthSchema(pool);
  await ensureQuoteSchema(pool);
  app.listen(port, '0.0.0.0', () => {
    console.log('Life OS API listening on http://localhost:' + port);
  });

  const sessionCleanup = setInterval(() => {
    pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()').catch((error) => {
      console.error('Could not clear expired sessions:', error.message);
    });
  }, 6 * 60 * 60 * 1000);
  sessionCleanup.unref();
}

startServer().catch(async (error) => {
  console.error('Life OS API could not start:', error.message);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
