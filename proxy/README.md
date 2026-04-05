# Kotani Egress Proxy (Static IP)

Kotani can allowlist IP addresses for API access. Vercel does not provide fixed outbound IPs by default, so calls from Vercel to Kotani may be rejected if Kotani requires IP allowlisting.

This proxy runs on a VM with a static/elastic public IP. Your Vercel app calls the proxy, and the proxy calls Kotani. Kotani sees the VM IP as the request source.

## What you give Kotani

- Production Webhook URL: `https://app.pesafi.ai/api/webhooks/kotani-pay`
- Production IP(s): the VM public static IP (or Elastic IP)
- Staging: N/A (if you don't have staging)

## Run the proxy

Requirements:
- A VM with a static IP (AWS Lightsail/EC2 + Elastic IP)
- Node.js 20+ recommended
- A domain + HTTPS (recommended) or a direct IP (not recommended)

On the VM:

```bash
export HOST=127.0.0.1
export PORT=8787
export UPSTREAM_BASE_URL_SANDBOX="https://sandbox-api.kotanipay.com/api/v3"
export UPSTREAM_BASE_URL_PRODUCTION="https://api.kotanipay.com/api/v3"
export PROXY_SHARED_SECRET="generate-a-long-random-string"
export DEFAULT_TARGET_ENV="production" # or "sandbox"

node proxy/kotani-proxy-server.mjs
```

## Routing (sandbox vs production)

The proxy supports both environments on the same VM/static IP.

Use either:

- Path-based routing:
  - Sandbox: `https://<proxy-domain>/sandbox/api/v3/...`
  - Production: `https://<proxy-domain>/production/api/v3/...`
- Header-based routing:
  - `X-Pesafi-Proxy-Target-Env: sandbox|production`

## Secure it

- The proxy rejects requests unless they include:
  - `X-Pesafi-Proxy-Secret: <PROXY_SHARED_SECRET>`
- Put it behind HTTPS (nginx/caddy) and restrict inbound traffic if you can.
- Recommended: run the Node server on `127.0.0.1` only (`HOST=127.0.0.1`) and expose it via your HTTPS reverse proxy.

## Configure Vercel

In your Vercel project environment variables:

- `KOTANI_PAY_BASE_URL` can be either:
  - Simple (recommended): `https://<your-proxy-domain>/api/v3` (proxy decides env from header)
  - Explicit path routing:
    - `https://<your-proxy-domain>/sandbox/api/v3`
    - `https://<your-proxy-domain>/production/api/v3`
- Alternatively, you can set:
  - `KOTANI_PAY_PROXY_URL=https://<your-proxy-domain>`
  and the app will automatically use `https://<your-proxy-domain>/api/v3`.
- `KOTANI_PAY_PROXY_SECRET` = the same value as `PROXY_SHARED_SECRET`
- `KOTANI_PAY_ENVIRONMENT` = `sandbox` or `production` (controls which upstream the proxy uses)
- Keep `KOTANI_PAY_API_KEY` as-is (still used as Bearer auth)

Deploy and test.

