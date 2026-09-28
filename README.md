# Cloudflare Workers contact form proxy — Formspree alternative with AI spam filtering

A Cloudflare Worker that receives browser submissions and forwards them to SmartForm AI.
Use this instead of the Vercel Function when you want to host everything on Cloudflare.

## Setup

1. Get a form ID at https://usesmartform.com/dashboard.
2. Configure secrets:
   ```bash
   git clone https://github.com/yanghuai123456/smartform-example-serverless-cloudflare.git
   cd smartform-example-serverless-cloudflare
   wrangler kv:namespace create SESSIONS   # optional — only if you add rate-limit caching
   npx wrangler secret put SMARTFORM_ENDPOINT     # https://api.usesmartform.com
   npx wrangler secret put SMARTFORM_FORM_ID      # f_your_real_id
   npx wrangler deploy
   ```
3. Browser calls `POST https://your-worker.workers.dev/submit`. The Worker forwards to
   SmartForm.

## The Worker

```ts
// src/index.ts
export interface Env { SMARTFORM_ENDPOINT: string; SMARTFORM_FORM_ID: string; }

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/submit') {
      return new Response('Not Found', { status: 404 });
    }

    const body = await req.json();
    const r = await fetch(`${env.SMARTFORM_ENDPOINT}/api/v1/f/${env.SMARTFORM_FORM_ID}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body:    JSON.stringify(body),
    });

    return new Response(await r.text(), {
      status:  r.status,
      headers: {
        'Content-Type':  'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  },
};
```

`wrangler.toml` declares the Worker name and compatibility date; deploy with `wrangler deploy`.

## Static demo page

`index.html` is a plain HTML page that posts JSON to `/submit` on the Worker origin and
renders the response inline.

## How the SmartForm API works

- `POST {endpoint}/api/v1/f/{form_id}` — JSON or form-data, no API key.
- Response: `{ success, message, submission_id, is_spam, intent, next_url }`.

For the full contract, see https://usesmartform.com/docs.

## License

MIT.
