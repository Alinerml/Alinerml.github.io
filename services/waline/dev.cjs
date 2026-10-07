const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

async function start() {
  const directory = path.join(__dirname, '.local');
  const database = path.join(directory, 'waline.sqlite');
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.access(database);
  } catch {
    const response = await fetch('https://raw.githubusercontent.com/walinejs/waline/main/assets/waline.sqlite');
    if (!response.ok) throw new Error('Could not download the official Waline SQLite schema');
    await fs.writeFile(database, Buffer.from(await response.arrayBuffer()), { flag: 'wx' });
  }

  // Local development uses a separate SQLite database, never the online PG data.
  for (const key of Object.keys(process.env)) {
    if (/^(PG_|POSTGRES_|MYSQL_|TIDB_|MONGO_|LEAN_|LC_)/.test(key) || key === 'DATABASE_URL') delete process.env[key];
  }
  process.env.SQLITE_PATH = directory;
  process.env.SQLITE_DB = 'waline';
  process.env.SITE_URL = 'http://127.0.0.1:4173';
  process.env.SITE_NAME = 'Alinerml · 工程笔记';
  process.env.JWT_TOKEN ||= randomBytes(48).toString('hex');
  process.env.DISABLE_REGION = 'true';
  process.env.DISABLE_USERAGENT = 'true';
  process.env.IPQPS = '0';

  const handler = require('@waline/vercel')({ secureDomains: ['127.0.0.1', 'localhost'], model: require('./comment-model.cjs') });
  const server = http.createServer((request, response) => {
    Promise.resolve(handler(request, response)).catch((error) => {
      console.error(error.message);
      if (!response.headersSent) response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ errno: 500, errmsg: 'Local comment service failed' }));
    });
  });
  const port = Number(process.env.WALINE_LOCAL_PORT || 8360);
  server.listen(port, '127.0.0.1', () => console.log(`Local Waline: http://127.0.0.1:${port}`));
  server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
}

start().catch((error) => { console.error(error.message); process.exitCode = 1; });
