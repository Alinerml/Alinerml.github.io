const { posix } = require('node:path');

function requestPath(url) {
  // Normalize encoded separators and dot segments before matching Waline's
  // current and legacy routes. Query parameters never select an API route.
  let pathname = new URL(url || '/', 'https://waline.invalid').pathname;
  for (let count = 0; count < 3; count += 1) {
    const decoded = decodeURIComponent(pathname);
    if (decoded === pathname) break;
    pathname = decoded;
  }
  pathname = posix.normalize(pathname.replaceAll('\\', '/')).toLowerCase();
  // ThinkJS accepts the legacy Netlify prefix, removes '/api' even without
  // a following slash, and strips a trailing '.html' by default.
  pathname = pathname.replace(/^\/\.netlify\/functions\/[^/]+/, '');
  pathname = pathname.replace(/^\/api/, '').replace(/\.html$/, '');
  return `/${pathname.replace(/^\/+|\/+$/g, '')}`;
}

module.exports = function registrationGuard(handler, { registrationEnabled = false } = {}) {
  if (typeof handler !== 'function') throw new TypeError('A Waline HTTP handler is required');
  if (registrationEnabled === true) return handler;

  return function guardedWaline(request, response) {
    let pathname;
    try {
      pathname = requestPath(request.url);
    } catch {
      response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ errno: 400, errmsg: 'Invalid request path' }));
      return;
    }

    const method = (request.method || 'GET').toUpperCase();
    const userRoute = /^\/user(?:\/|$)/.test(pathname);
    const oauthRoute = /^\/oauth(?:\/|$)/.test(pathname);
    // Both signup and OAuth can create the first user as an administrator.
    // Keep these closed on public deployments until the owner bootstraps an
    // administrator through a private, protected deployment or database access.
    if ((['POST', 'CLI'].includes(method) && userRoute) || (method !== 'OPTIONS' && oauthRoute)) {
      response.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ errno: 403, errmsg: 'Public account registration is disabled' }));
      return;
    }
    return handler(request, response);
  };
};
