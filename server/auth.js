import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';

const scrypt = promisify(scryptCallback);
const PASSWORD_COST = 131072;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELISM = 1;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_MAX_MEMORY = 256 * 1024 * 1024;
const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 14;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_WINDOW_LIMIT = 20;
const authAttempts = new Map();
const cookieSecure = process.env.COOKIE_SECURE === 'true';
const cookieName = cookieSecure ? '__Host-lifeos.sid' : 'lifeos.sid';
let dummyHashPromise;

const passwordOptions = {
  N: PASSWORD_COST,
  r: PASSWORD_BLOCK_SIZE,
  p: PASSWORD_PARALLELISM,
  maxmem: PASSWORD_MAX_MEMORY,
};

export async function ensureAuthSchema(pool) {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS users (" +
      "id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, " +
      "name VARCHAR(100) NOT NULL, " +
      "email VARCHAR(254) NOT NULL, " +
      "password_hash TEXT NOT NULL, " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" +
    ");" +
    "CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));" +
    "CREATE TABLE IF NOT EXISTS auth_sessions (" +
      "token_hash CHAR(64) PRIMARY KEY, " +
      "user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
      "expires_at TIMESTAMPTZ NOT NULL" +
    ");" +
    "CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (expires_at);" +
    "CREATE TABLE IF NOT EXISTS life_area_updates (" +
      "user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
      "area_slug VARCHAR(32) NOT NULL, " +
      "intention VARCHAR(240) NOT NULL DEFAULT '', " +
      "check_ins INTEGER NOT NULL DEFAULT 0 CHECK (check_ins >= 0), " +
      "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
      "PRIMARY KEY (user_id, area_slug)" +
    ")",
  );
}

export function createAuthRouter(pool) {
  const router = express.Router();
  router.use((_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.get('/me', async (request, response) => {
    const token = readSessionToken(request);
    if (!token) return response.json({ user: null });

    try {
      const result = await pool.query(
        "SELECT u.id, u.name, u.email FROM auth_sessions s " +
          "JOIN users u ON u.id = s.user_id " +
          "WHERE s.token_hash = $1 AND s.expires_at > NOW()",
        [hashSessionToken(token)],
      );

      if (!result.rowCount) {
        await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
        clearSessionCookie(response);
        return response.json({ user: null });
      }

      return response.json({ user: publicUser(result.rows[0]) });
    } catch (error) {
      console.error('Could not read the current account:', error.message);
      return response.status(503).json({ error: 'Your account could not be loaded right now.' });
    }
  });

  router.post('/signup', limitAuthAttempts, async (request, response) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === 'string' ? request.body.password : '';

    if (name.length < 2 || name.length > 100 || !isValidEmail(email)) {
      return response.status(400).json({ error: 'Enter your name and a valid email address.' });
    }

    if (password.length < 12 || password.length > 128) {
      return response.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    }

    try {
      const passwordHash = await hashPassword(password);
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, passwordHash],
      );

      await createSession(pool, result.rows[0], response);
      return response.status(201).json({ user: publicUser(result.rows[0]) });
    } catch (error) {
      if (error.code === '23505') {
        return response.status(409).json({ error: 'An account with that email already exists. Sign in instead.' });
      }
      console.error('Could not create an account:', error.message);
      return response.status(503).json({ error: 'Your account could not be created right now. Please try again.' });
    }
  });

  router.post('/login', limitAuthAttempts, async (request, response) => {
    const email = normalizeEmail(request.body?.email);
    const password = typeof request.body?.password === 'string' ? request.body.password : '';

    if (!isValidEmail(email) || !password || password.length > 128) {
      return response.status(400).json({ error: 'Enter a valid email address and password.' });
    }

    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash FROM users WHERE LOWER(email) = $1',
        [email],
      );
      const user = result.rows[0] || null;
      const storedHash = user ? user.password_hash : await getDummyHash();
      const passwordMatches = await verifyPassword(password, storedHash);

      if (!user || !passwordMatches) {
        return response.status(401).json({ error: 'That email and password combination was not recognized.' });
      }

      await createSession(pool, user, response);
      return response.json({ user: publicUser(user) });
    } catch (error) {
      console.error('Could not sign in:', error.message);
      return response.status(503).json({ error: 'Sign in is unavailable right now. Please try again.' });
    }
  });

  router.post('/logout', async (request, response) => {
    const token = readSessionToken(request);
    try {
      if (token) {
        await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
      }
      clearSessionCookie(response);
      return response.status(204).end();
    } catch (error) {
      console.error('Could not sign out:', error.message);
      return response.status(503).json({ error: 'Sign out is unavailable right now. Please try again.' });
    }
  });

  return router;
}

export function createRequireAuth(pool) {
  return async (request, response, next) => {
    const token = readSessionToken(request);
    if (!token) return response.status(401).json({ error: 'Sign in to save your personal updates.' });

    try {
      const result = await pool.query(
        "SELECT u.id, u.name, u.email FROM auth_sessions s " +
          "JOIN users u ON u.id = s.user_id " +
          "WHERE s.token_hash = $1 AND s.expires_at > NOW()",
        [hashSessionToken(token)],
      );

      if (!result.rowCount) {
        clearSessionCookie(response);
        return response.status(401).json({ error: 'Your session ended. Please sign in again.' });
      }

      request.user = publicUser(result.rows[0]);
      return next();
    } catch (error) {
      console.error('Could not verify the account session:', error.message);
      return response.status(503).json({ error: 'Your account could not be checked right now.' });
    }
  };
}

async function createSession(pool, user, response) {
  const token = randomBytes(32).toString('base64url');
  await pool.query(
    "INSERT INTO auth_sessions (token_hash, user_id, expires_at) " +
      "VALUES ($1, $2, NOW() + INTERVAL '14 days')",
    [hashSessionToken(token), user.id],
  );

  const parts = [
    cookieName + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=' + SESSION_LIFETIME_SECONDS,
  ];
  if (cookieSecure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(response) {
  const parts = [cookieName + '=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (cookieSecure) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || '';
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== cookieName) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH, passwordOptions);
  return [
    'scrypt',
    PASSWORD_COST,
    PASSWORD_BLOCK_SIZE,
    PASSWORD_PARALLELISM,
    salt.toString('base64'),
    Buffer.from(derivedKey).toString('base64'),
  ].join('$');
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  if (
    Number(parts[1]) !== PASSWORD_COST ||
    Number(parts[2]) !== PASSWORD_BLOCK_SIZE ||
    Number(parts[3]) !== PASSWORD_PARALLELISM
  ) return false;

  try {
    const expected = Buffer.from(parts[5], 'base64');
    const actual = Buffer.from(
      await scrypt(password, Buffer.from(parts[4], 'base64'), expected.length, passwordOptions),
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(randomBytes(32).toString('hex'));
  }
  return dummyHashPromise;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function publicUser(user) {
  return { id: String(user.id), name: user.name, email: user.email };
}

function limitAuthAttempts(request, response, next) {
  const now = Date.now();
  const key = request.ip || request.socket.remoteAddress || 'unknown';
  let bucket = authAttempts.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + AUTH_WINDOW_MS };
    authAttempts.set(key, bucket);
  }

  bucket.count += 1;
  if (authAttempts.size > 5000) {
    for (const [ip, entry] of authAttempts) {
      if (now >= entry.resetAt) authAttempts.delete(ip);
    }
  }

  if (bucket.count > AUTH_WINDOW_LIMIT) {
    response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return response.status(429).json({ error: 'Too many sign-in attempts. Please wait a little and try again.' });
  }

  return next();
}