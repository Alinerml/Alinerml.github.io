const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const { test } = require('node:test');
const { createStatsHandler, withSiteStats, postgresOptions } = require('../site-stats.cjs');

const ORIGIN = 'https://alinerml.github.io';
const VISITOR = 'a7f2c8a0-4182-4db1-8935-c567b43d30ad';
const STARTED = '2026-10-08T00:00:00.000Z';

function storage({ failQuery, failRollback = false, insertedRows = 1, row = { visitors: '2', views: '5', started_at: new Date(STARTED) } } = {}) {
  const queries = [];
  const released = [];
  let connects = 0;
  const query = async (sql, values) => {
    queries.push({ sql, values });
    if (sql === 'ROLLBACK' && failRollback) throw new Error('fixture rollback failure');
    if (failQuery && sql.startsWith(failQuery)) throw new Error('fixture query with private database details');
    if (sql.startsWith('INSERT')) return { rowCount: insertedRows, rows: insertedRows ? [{ visitor_hash: values[0] }] : [] };
    return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
  };
  const client = { query, release(discard) { released.push(discard); } };
  const pool = { query, async connect() { connects += 1; return client; } };
  return { pool, queries, released, get connects() { return connects; } };
}

async function invoke(handler, { method = 'GET', url = '/api/site-stats', origin = ORIGIN, body, headers = {}, chunks } = {}) {
  const request = Readable.from(chunks || []);
  request.method = method;
  request.url = url;
  request.headers = { ...(origin === undefined ? {} : { origin }), ...headers };
  if (body !== undefined) request.body = body;
  const response = {
    status: undefined,
    headers: {},
    raw: undefined,
    writeHead(status, values) { this.status = status; this.headers = values; },
    end(raw) { this.raw = raw; }
  };
  await handler(request, response);
  if (response.raw !== undefined) response.body = JSON.parse(response.raw);
  return response;
}

function fixture(options, configuration) {
  const state = storage(options);
  state.handler = createStatsHandler({ pool: state.pool, siteUrl: ORIGIN, ...configuration });
  return state;
}

test('GET returns only aggregate statistics and does not record a visitor', async () => {
  const state = fixture();
  const result = await invoke(state.handler);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { visitors: 2, views: 5, startedAt: STARTED });
  assert.equal(state.connects, 0);
  assert.equal(state.queries.length, 1);
  assert.equal(result.headers['Access-Control-Allow-Origin'], ORIGIN);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers.Vary, 'Origin');
  assert.equal(result.headers['Access-Control-Allow-Credentials'], undefined);
});

test('POST stores only the normalized visitor hash and commits atomically', async () => {
  const state = fixture();
  const result = await invoke(state.handler, {
    method: 'POST', body: { visitorId: VISITOR.toUpperCase() }, headers: { 'content-type': 'application/json' }
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { visitors: 2, views: 5, startedAt: STARTED });
  const hash = createHash('sha256').update(VISITOR).digest('hex');
  assert.equal(state.queries[0].sql, 'BEGIN');
  assert.deepEqual(state.queries[1].values, [hash]);
  assert.deepEqual(state.queries[2].values, [1]);
  assert.equal(state.queries.at(-1).sql, 'COMMIT');
  assert(!JSON.stringify(state.queries).includes(VISITOR));
  assert.deepEqual(state.released, [false]);
});

test('Chunked JSON requests are bounded and accept a valid visitor', async () => {
  const state = fixture();
  const raw = JSON.stringify({ visitorId: VISITOR });
  const result = await invoke(state.handler, {
    method: 'POST', chunks: [Buffer.from(raw.slice(0, 12)), Buffer.from(raw.slice(12))],
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
  assert.equal(result.status, 200);
  assert.equal(state.connects, 1);
});

test('An existing visitor adds a view without adding another unique visitor', async () => {
  const state = fixture({ insertedRows: 0 });
  const result = await invoke(state.handler, {
    method: 'POST', body: { visitorId: VISITOR }, headers: { 'content-type': 'application/json' }
  });
  assert.equal(result.status, 200);
  assert.deepEqual(state.queries[2].values, [0]);
  assert.equal(state.queries.at(-1).sql, 'COMMIT');
});

for (const origin of ['https://untrusted.example', 'https://alinerml.github.io.evil.example', 'https://alinerml.github.io/', 'null', '', null]) {
  test(`A disallowed Origin (${String(origin)}) cannot read or increment statistics`, async () => {
    const state = fixture();
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const result = await invoke(state.handler, { method, origin, body: { visitorId: VISITOR } });
      assert.equal(result.status, 403);
      assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    }
    assert.equal(state.queries.length, 0);
    assert.equal(state.connects, 0);
  });
}

test('An absent Origin cannot read or increment statistics', async () => {
  const state = fixture();
  const handler = (request, response) => {
    delete request.headers.origin;
    return state.handler(request, response);
  };
  const result = await invoke(handler);
  assert.equal(result.status, 403);
  assert.equal(state.queries.length, 0);
});

test('OPTIONS handles browser preflight without opening a database connection', async () => {
  const state = fixture();
  const result = await invoke(state.handler, {
    method: 'OPTIONS', headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' }
  });
  assert.equal(result.status, 204);
  assert.equal(result.raw, undefined);
  assert.equal(result.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.equal(result.headers['Access-Control-Allow-Headers'], 'Content-Type');
  assert.equal(state.queries.length, 0);
});

test('Unsupported methods and preflight methods cannot mutate statistics', async () => {
  const state = fixture();
  for (const method of ['PUT', 'PATCH', 'DELETE', 'HEAD', 'CLI']) {
    const result = await invoke(state.handler, { method });
    assert.equal(result.status, 405);
    assert.equal(result.headers.Allow, 'GET, POST, OPTIONS');
  }
  const preflight = await invoke(state.handler, { method: 'OPTIONS', headers: { 'access-control-request-method': 'DELETE' } });
  assert.equal(preflight.status, 405);
  assert.equal(state.queries.length, 0);
});

const invalidBodies = [
  null, [], {}, { visitorId: 'not-a-uuid' }, { visitorId: 7 },
  { visitorId: '00000000-0000-0000-0000-000000000000' },
  { visitorId: VISITOR, ip: 'must-not-be-stored' }, { visitorId: VISITOR, path: '/private-query' },
  { visitorId: VISITOR, userAgent: 'must-not-be-stored' }
];
for (const body of invalidBodies) {
  test(`Invalid visitor payload is rejected before accessing the database: ${JSON.stringify(body)}`, async () => {
    const state = fixture();
    const result = await invoke(state.handler, { method: 'POST', body, headers: { 'content-type': 'application/json' } });
    assert.equal(result.status, 400);
    assert.equal(state.queries.length, 0);
  });
}

test('Invalid JSON and wrong content types never connect to the database', async () => {
  const state = fixture();
  const invalidJson = await invoke(state.handler, { method: 'POST', body: '{broken', headers: { 'content-type': 'application/json' } });
  assert.equal(invalidJson.status, 400);
  for (const contentType of [undefined, 'text/plain', 'application/x-www-form-urlencoded', 'application/json; charset=latin1']) {
    const result = await invoke(state.handler, { method: 'POST', body: { visitorId: VISITOR }, headers: { 'content-type': contentType } });
    assert.equal(result.status, 415);
  }
  assert.equal(state.queries.length, 0);
});

test('The 2 KB limit applies to content length, parsed bodies and streamed bytes', async () => {
  const state = fixture();
  const requests = [
    { body: { visitorId: VISITOR }, headers: { 'content-length': '2049' } },
    { body: ' '.repeat(2049) },
    { body: Buffer.alloc(2049) },
    { chunks: [Buffer.alloc(1500), Buffer.alloc(1000)] }
  ];
  for (const request of requests) {
    const result = await invoke(state.handler, {
      ...request, method: 'POST', headers: { 'content-type': 'application/json', ...request.headers }
    });
    assert.equal(result.status, 413);
  }
  assert.equal(state.queries.length, 0);
});

test('A storage failure rolls back and reveals no query or connection details', async () => {
  const state = fixture({ failQuery: 'UPDATE' });
  const result = await invoke(state.handler, { method: 'POST', body: { visitorId: VISITOR }, headers: { 'content-type': 'application/json' } });
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, { error: 'Visitor statistics are temporarily unavailable' });
  assert.equal(state.queries.at(-1).sql, 'ROLLBACK');
  assert(!state.queries.some(query => query.sql === 'COMMIT'));
  assert.deepEqual(state.released, [false]);
});

test('A failed rollback discards the broken database connection', async () => {
  const state = fixture({ failQuery: 'UPDATE', failRollback: true });
  const result = await invoke(state.handler, { method: 'POST', body: { visitorId: VISITOR }, headers: { 'content-type': 'application/json' } });
  assert.equal(result.status, 503);
  assert.deepEqual(state.released, [true]);
});

test('Missing schema and unsafe numeric totals fail without inventing data', async () => {
  for (const row of [null, { visitors: '9007199254740992', views: '1', started_at: STARTED }]) {
    const state = fixture({ row });
    const result = await invoke(state.handler);
    assert.equal(result.status, 503);
    assert.deepEqual(result.body, { error: 'Visitor statistics are temporarily unavailable' });
  }
});

test('Localhost is disabled by default and must be explicitly configured', async () => {
  const defaultState = fixture();
  assert.equal((await invoke(defaultState.handler, { origin: 'http://localhost:4173' })).status, 403);
  const development = fixture(undefined, { developmentOrigins: ['http://localhost:4173'] });
  assert.equal((await invoke(development.handler, { origin: 'http://localhost:4173' })).status, 200);
  assert.throws(() => createStatsHandler({ pool: development.pool, developmentOrigins: ['https://other.example'] }), /localhost/);
});

test('The wrapper preserves every existing Waline request and return value', async () => {
  const calls = [];
  const original = (request, response) => { calls.push({ request, response }); return 'original-result'; };
  const wrapped = withSiteStats(original, { pool: storage().pool });
  for (const url of ['/api/comment', '/api/user', '/api/oauth', '/ui', '/api/article', '/api/site-stats-other', '/API/SITE-STATS', '/api/%ZZ']) {
    const request = { url, method: 'POST' };
    const response = {};
    assert.equal(wrapped(request, response), 'original-result');
    assert.equal(calls.at(-1).request, request);
    assert.equal(calls.at(-1).response, response);
  }
  const result = await invoke(wrapped, { url: '/api/site-stats/?query=is-not-recorded' });
  assert.equal(result.status, 200);
  assert.equal(calls.length, 8);
});

test('Production PostgreSQL verifies TLS certificates and keeps pool size bounded', () => {
  const options = postgresOptions({ PG_HOST: 'example.invalid', PG_PORT: '5433', PG_DB: 'fixture', PG_USER: 'fixture-user', PG_PASSWORD: 'fixture-password', PG_SSL: 'true' });
  assert.deepEqual(options.ssl, { rejectUnauthorized: true });
  assert.equal(options.host, 'example.invalid');
  assert.equal(options.port, 5433);
  assert.equal(options.database, 'fixture');
  assert.equal(options.max, 2);
  assert.equal(options.connectionString, undefined);
});
