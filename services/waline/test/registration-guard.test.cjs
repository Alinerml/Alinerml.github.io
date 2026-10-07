const assert = require('node:assert/strict');
const path = require('node:path');
const guard = require(path.join(__dirname, '../registration-guard.cjs'));

function invoke(method, url, options) {
  let calls = 0;
  const response = {
    status: undefined,
    headers: {},
    body: undefined,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; }
  };
  const handler = guard(() => { calls += 1; return 'forwarded'; }, options);
  const returned = handler({ method, url }, response);
  return { calls, response, returned };
}

const blocked = [
  ['POST', '/api/user'], ['POST', '/api/user/'], ['POST', '/api/user/123'],
  ['POST', '/user'], ['post', '/USER'], ['POST', '/user?registrationEnabled=true'],
  ['POST', '/api/%75ser'], ['POST', '/api%2fuser'], ['POST', '/api%252fuser'],
  ['POST', '//api//user'], ['POST', '/api/foo/../user'], ['POST', '/api/foo/%2e%2e/user'],
  ['POST', '/api/foo%2f..%2fuser'], ['POST', '/api%5cuser'],
  ['POST', '/api/user.html'], ['POST', '/user.html'], ['POST', '/apiuser.html'],
  ['POST', '/apiuser'], ['POST', '/api/user?method=post'], ['CLI', '/api/user?method=post'],
  ['POST', '/.netlify/functions/undefined/api/user'], ['POST', '/.netlify/functions/index/api/user.html'],
  ['GET', '/api/oauth?type=github&code=test'], ['GET', '/oauth?code=test'],
  ['POST', '/api/oauth'], ['PUT', '/api/oauth/anything'], ['HEAD', '/API/OAUTH'],
  ['GET', '/api%2foauth?code=test'], ['GET', '/api/foo/%2e%2e/oauth?code=test'],
  ['GET', '/oauth.html?code=test'], ['GET', '/apioauth.html?code=test'],
  ['GET', '/.netlify/functions/index/api/oauth?code=test']
];
for (const [method, url] of blocked) {
  const { calls, response } = invoke(method, url);
  assert.equal(calls, 0, `${method} ${url} must not invoke Waline`);
  assert.equal(response.status, 403, `${method} ${url} must be forbidden`);
  assert.equal(JSON.parse(response.body).errno, 403);
  assert.equal(response.headers['Cache-Control'], 'no-store');
}

const allowed = [
  ['GET', '/api/comment?path=%2fblog%2fpost%2f'], ['POST', '/api/comment'],
  ['POST', '/comment'], ['PUT', '/api/comment/1'], ['PUT', '/comment/1'],
  ['GET', '/api/article?path=%2fblog%2fpost%2f'], ['POST', '/api/article'],
  ['PUT', '/api/article'], ['POST', '/article'], ['GET', '/api/user'],
  ['PUT', '/api/user/1'], ['DELETE', '/api/user/1'], ['POST', '/api/token'],
  ['GET', '/ui/register'], ['GET', '/ui'], ['OPTIONS', '/api/user'],
  ['OPTIONS', '/api/oauth'], ['POST', '/api/comment?next=/api/user'],
  ['POST', '/api/users'], ['GET', '/api/oauth-services']
];
for (const [method, url] of allowed) {
  const { calls, response, returned } = invoke(method, url);
  assert.equal(calls, 1, `${method} ${url} must invoke Waline`);
  assert.equal(response.status, undefined);
  assert.equal(returned, 'forwarded');
}

for (const registrationEnabled of [false, 'true', 1, undefined]) {
  assert.equal(invoke('POST', '/api/user', { registrationEnabled }).response.status, 403);
}
for (const [method, url] of blocked) {
  assert.equal(invoke(method, url, { registrationEnabled: true }).calls, 1);
}
assert.equal(invoke('POST', '/api/%ZZ').response.status, 400);
assert.equal(invoke('POST', '/api/%ZZ').calls, 0);
assert.throws(() => guard(null), TypeError);
console.log(JSON.stringify({ success: true, blockedRoutes: blocked.length, guestAndAdminRoutesForwarded: allowed.length, explicitPrivateBootstrap: true }));
