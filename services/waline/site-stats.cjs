const { createHash } = require('node:crypto');

const MAX_BODY_BYTES = 2048;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOTAL_COLUMNS = 'visitors, views, started_at';

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function postgresOptions(env = process.env) {
  // index.cjs already resolves the existing DATABASE_URL into PG_* settings.
  // Explicit options prevent URL sslmode parameters overriding verification.
  return {
    host: env.PG_HOST,
    port: Number(env.PG_PORT || 5432),
    database: env.PG_DB,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl: env.PG_SSL === 'false' ? false : { rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000
  };
}

function allowedOrigins(siteUrl, developmentOrigins) {
  const site = new URL(siteUrl);
  if (!['https:', 'http:'].includes(site.protocol)) throw new TypeError('A valid site URL is required');
  const origins = new Set([site.origin]);
  for (const value of developmentOrigins) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new TypeError('Development statistics origins must use localhost');
    }
    origins.add(url.origin);
  }
  return origins;
}

function serializeStats(row) {
  if (!row) throw new Error('Statistics schema is not initialized');
  const visitors = Number(row.visitors);
  const views = Number(row.views);
  if (![visitors, views].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Invalid statistics totals');
  }
  return { visitors, views, startedAt: new Date(row.started_at).toISOString() };
}

function readBody(request) {
  const length = request.headers?.['content-length'];
  if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > MAX_BODY_BYTES)) {
    request.resume?.();
    throw new RequestError(413, 'Request body is too large');
  }
  // Support Vercel's already-parsed request body as well as native Node streams.
  if (request.body !== undefined) {
    const raw = Buffer.isBuffer(request.body) ? request.body :
      typeof request.body === 'string' ? Buffer.from(request.body) : Buffer.from(JSON.stringify(request.body));
    if (raw.length > MAX_BODY_BYTES) throw new RequestError(413, 'Request body is too large');
    return Promise.resolve(raw.toString('utf8'));
  }
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let chunks = [];
    let settled = false;
    request.on('data', chunk => {
      if (settled) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > MAX_BODY_BYTES) {
        chunks = [];
        settled = true;
        // Continue draining without retaining more data, allowing a 413 reply.
        reject(new RequestError(413, 'Request body is too large'));
      } else {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    });
    request.once('end', () => {
      if (!settled) resolve(Buffer.concat(chunks).toString('utf8'));
      settled = true;
    });
    const failed = () => {
      if (!settled) reject(new RequestError(400, 'Incomplete request body'));
      settled = true;
      chunks = [];
    };
    request.once('error', failed);
    request.once('aborted', failed);
  });
}

async function recordVisit(pool, visitorId) {
  const visitorHash = createHash('sha256').update(visitorId.toLowerCase()).digest('hex');
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      'INSERT INTO blog_site_visitors (visitor_hash) VALUES ($1) ON CONFLICT (visitor_hash) DO NOTHING RETURNING visitor_hash',
      [visitorHash]
    );
    const result = await client.query(
      `UPDATE blog_site_stats SET visitors = visitors + $1, views = views + 1 WHERE singleton = 1 RETURNING ${TOTAL_COLUMNS}`,
      [inserted.rowCount]
    );
    const stats = serializeStats(result.rows[0]);
    await client.query('COMMIT');
    return stats;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    throw error;
  } finally {
    client.release(discard);
  }
}

function createStatsHandler({ pool, siteUrl = process.env.SITE_URL || 'https://alinerml.github.io', developmentOrigins = [] }) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }
  const origins = allowedOrigins(siteUrl, developmentOrigins);
  return async function siteStats(request, response) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff'
    };
    const send = (status, body) => {
      response.writeHead(status, headers);
      response.end(body === undefined ? undefined : JSON.stringify(body));
    };
    const origin = request.headers?.origin;
    if (typeof origin !== 'string' || !origins.has(origin)) {
      send(403, { error: 'Origin is not allowed' });
      return;
    }
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    const method = (request.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      const requested = request.headers?.['access-control-request-method'];
      if (requested && !['GET', 'POST'].includes(requested.toUpperCase())) {
        headers.Allow = 'GET, POST, OPTIONS';
        send(405, { error: 'Method is not allowed' });
        return;
      }
      send(204);
      return;
    }
    if (!['GET', 'POST'].includes(method)) {
      headers.Allow = 'GET, POST, OPTIONS';
      send(405, { error: 'Method is not allowed' });
      return;
    }
    try {
      if (method === 'GET') {
        const result = await pool.query(`SELECT ${TOTAL_COLUMNS} FROM blog_site_stats WHERE singleton = 1`);
        send(200, serializeStats(result.rows[0]));
        return;
      }
      const contentType = request.headers?.['content-type'];
      if (typeof contentType !== 'string' || !/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/i.test(contentType)) {
        throw new RequestError(415, 'Content-Type must be application/json');
      }
      let body;
      try { body = JSON.parse(await readBody(request)); }
      catch (error) {
        if (error instanceof RequestError) throw error;
        throw new RequestError(400, 'Invalid JSON request body');
      }
      if (!body || Array.isArray(body) || typeof body !== 'object' ||
        Object.keys(body).length !== 1 || typeof body.visitorId !== 'string' || !UUID.test(body.visitorId)) {
        throw new RequestError(400, 'A visitor UUID is required');
      }
      send(200, await recordVisit(pool, body.visitorId));
    } catch (error) {
      // Storage errors and query parameters can contain secrets; never log or
      // expose the underlying exception. A failed POST is not retried by clients.
      send(error instanceof RequestError ? error.status : 503, {
        error: error instanceof RequestError ? error.message : 'Visitor statistics are temporarily unavailable'
      });
    }
  };
}

function withSiteStats(handler, options = {}) {
  if (typeof handler !== 'function') throw new TypeError('A Waline HTTP handler is required');
  let statsHandler;
  return function dispatch(request, response) {
    let pathname;
    try { pathname = new URL(request.url || '/', 'https://waline.invalid').pathname; }
    catch { return handler(request, response); }
    if (pathname !== '/api/site-stats' && pathname !== '/api/site-stats/') return handler(request, response);
    if (!statsHandler) {
      const { Pool } = require('pg');
      const pool = options.pool || new Pool(postgresOptions());
      // pg can emit idle connection errors separately from a request. Suppress
      // their details; each affected request still receives the generic 503.
      if (!options.pool) pool.on('error', () => {});
      const developmentOrigins = process.env.NODE_ENV === 'production' ? [] :
        (process.env.SITE_STATS_DEV_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
      statsHandler = createStatsHandler({ pool, developmentOrigins, ...options });
    }
    return statsHandler(request, response);
  };
}

module.exports = { createStatsHandler, withSiteStats, postgresOptions };
