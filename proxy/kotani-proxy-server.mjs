#!/usr/bin/env node
/**
 * Kotani egress proxy (Node.js)
 *
 * Purpose:
 * - Vercel does not provide fixed outbound IPs by default.
 * - Kotani can allowlist IPs for API access.
 * - This proxy runs on a VM with a static/elastic IP and forwards requests to Kotani,
 *   so Kotani sees the VM's IP as the source.
 *
 * Security:
 * - Requires a shared secret header: X-Pesafi-Proxy-Secret
 * - Do NOT run without PROXY_SHARED_SECRET; otherwise it's an open relay.
 *
 * Usage:
 *   PROXY_SHARED_SECRET=... \
 *   UPSTREAM_BASE_URL=https://sandbox-api.kotanipay.com/api/v3 \
 *   PORT=8787 \
 *   node proxy/kotani-proxy-server.mjs
 */

import http from 'node:http';
import { URL } from 'node:url';

const HOST = process.env.HOST || process.env.BIND_HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_BASE_URL_SANDBOX =
  process.env.UPSTREAM_BASE_URL_SANDBOX ||
  process.env.UPSTREAM_BASE_URL ||
  'https://sandbox-api.kotanipay.com/api/v3';
const UPSTREAM_BASE_URL_PRODUCTION =
  process.env.UPSTREAM_BASE_URL_PRODUCTION ||
  'https://api.kotanipay.com/api/v3';
const DEFAULT_TARGET_ENV = (process.env.DEFAULT_TARGET_ENV || 'sandbox').toLowerCase();
const PROXY_SHARED_SECRET = process.env.PROXY_SHARED_SECRET;

if (!PROXY_SHARED_SECRET) {
  console.error('[kotani-proxy] Missing PROXY_SHARED_SECRET. Refusing to start.');
  process.exit(1);
}

const upstreamSandboxBase = new URL(UPSTREAM_BASE_URL_SANDBOX);
const upstreamProdBase = new URL(UPSTREAM_BASE_URL_PRODUCTION);

function getUpstream(targetEnv) {
  const env = (targetEnv || DEFAULT_TARGET_ENV).toLowerCase();
  if (env === 'production' || env === 'prod') return upstreamProdBase;
  return upstreamSandboxBase;
}

function normalizePath(pathname) {
  // Supports:
  // - /sandbox/api/v3/...     -> sandbox
  // - /production/api/v3/...  -> production
  // - /api/v3/...             -> DEFAULT_TARGET_ENV (or header override)
  const p = (pathname || '/').replace(/\/+$/, '') || '/';

  if (p === '/sandbox' || p.startsWith('/sandbox/')) {
    return { targetEnv: 'sandbox', rewrittenPath: p.replace(/^\/sandbox/, '') || '/' };
  }
  if (p === '/production' || p.startsWith('/production/')) {
    return { targetEnv: 'production', rewrittenPath: p.replace(/^\/production/, '') || '/' };
  }
  return { targetEnv: null, rewrittenPath: p };
}

function isAllowed(req) {
  const provided = req.headers['x-pesafi-proxy-secret'];
  return typeof provided === 'string' && provided === PROXY_SHARED_SECRET;
}

function shouldHaveBody(method) {
  return !['GET', 'HEAD'].includes(method.toUpperCase());
}

function buildUpstreamUrl(reqUrl, upstreamBase) {
  const incoming = new URL(reqUrl, 'http://local');
  const upstreamOrigin = upstreamBase.origin;
  const upstreamBasePath = upstreamBase.pathname.replace(/\/+$/, ''); // e.g. /api/v3

  const { rewrittenPath } = normalizePath(incoming.pathname);
  const incomingPath = rewrittenPath.replace(/\/+$/, '');

  // Avoid double "/api/v3/api/v3"
  const upstreamPath = incomingPath.startsWith(upstreamBasePath)
    ? incomingPath
    : `${upstreamBasePath}${incomingPath.startsWith('/') ? '' : '/'}${incomingPath}`;

  return new URL(`${upstreamOrigin}${upstreamPath}${incoming.search}`);
}

function filterUpstreamHeaders(headers) {
  const out = new Headers();
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue;
    const key = k.toLowerCase();
    if (
      key === 'host' ||
      key === 'connection' ||
      key === 'content-length' ||
      key === 'accept-encoding' ||
      key === 'x-pesafi-proxy-secret'
    ) {
      continue;
    }
    if (Array.isArray(v)) out.set(k, v.join(','));
    else out.set(k, v);
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();

  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!isAllowed(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const parsed = new URL(req.url || '/', 'http://local');
    const { targetEnv: pathEnv } = normalizePath(parsed.pathname);
    const headerEnvRaw =
      req.headers['x-pesafi-proxy-target-env'] ||
      req.headers['x-kotani-target-env'] ||
      req.headers['x-kotani-env'] ||
      req.headers['x-kotani-pay-env'];
    const headerEnv = typeof headerEnvRaw === 'string' ? headerEnvRaw : null;

    const targetEnv = (headerEnv || pathEnv || DEFAULT_TARGET_ENV).toLowerCase();
    if (!['sandbox', 'production', 'prod'].includes(targetEnv)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid target env. Use sandbox or production.' }));
      return;
    }

    // Only allow proxying Kotani v3 paths.
    const normalizedPath = normalizePath(parsed.pathname).rewrittenPath;
    if (normalizedPath !== '/api/v3' && !normalizedPath.startsWith('/api/v3/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const upstreamBase = getUpstream(targetEnv);
    const upstreamUrl = buildUpstreamUrl(req.url || '/', upstreamBase);
    const headers = filterUpstreamHeaders(req.headers);

    let body;
    if (shouldHaveBody(req.method || 'GET')) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });

    const buf = Buffer.from(await upstreamRes.arrayBuffer());

    // Copy upstream response headers (best effort)
    const responseHeaders = {};
    upstreamRes.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'transfer-encoding') return;
      responseHeaders[key] = value;
    });

    res.writeHead(upstreamRes.status, responseHeaders);
    res.end(buf);

    const ms = Date.now() - startedAt;
    // Minimal logs; avoid printing sensitive headers/bodies.
    console.log(`[kotani-proxy] ${targetEnv} ${req.method} ${req.url} -> ${upstreamRes.status} (${ms}ms)`);
  } catch (e) {
    console.error('[kotani-proxy] Error:', e?.message || e);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway' }));
  }
});

server.listen(PORT, HOST, () => {
  console.log('[kotani-proxy] Listening on', `${HOST}:${PORT}`);
  console.log('[kotani-proxy] Upstream (sandbox):', UPSTREAM_BASE_URL_SANDBOX);
  console.log('[kotani-proxy] Upstream (production):', UPSTREAM_BASE_URL_PRODUCTION);
  console.log('[kotani-proxy] Default target env:', DEFAULT_TARGET_ENV);
});

