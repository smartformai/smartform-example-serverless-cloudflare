# Cloudflare Workers contact form proxy — Formspree alternative with AI spam filtering

A Cloudflare Worker that receives browser submissions and forwards them to SmartForm AI.
Use this instead of the Vercel Function when you want to host everything on Cloudflare.

## What you're POSTing

The endpoint accepts a standard HTML form POST or JSON via AJAX. Two
kinds of fields:

**Your form fields** — `name`, `email`, `message`, whatever you
want. Every non-reserved field lands in your dashboard as a column in
the submissions table.

**Reserved fields** — names starting with `_` are interpreted by
the API, not stored:

| Field | Purpose |
|---|---|
| ``_gotcha`` | **Honeypot.** Keep it empty. Hidden from humans via CSS; bots fill it automatically. Any non-empty value silently drops the submission. Add this to every form. |
| ``_hp_email`` / ``_website`` / ``_url`` / ``_phone`` | Honeypot aliases for `_gotcha` (WordPress / WPForms / Contact Form 7 migrations). Same drop semantics. |
| ``_next`` | Same-origin URL to redirect to after a successful submission. Browser POST results in a 302 here. AJAX calls (with `Accept: application/json`) get the same value back as `next_url` in the JSON response. Only http(s) and in-site paths allowed. |
| ``_subject`` | Override the AI-generated email subject line. Max 200 chars; control characters stripped. |
| `X-Gotcha` header | Same as `_gotcha` for JSON requests where you can't add a hidden form field. |

Field names are Formspree-compatible — migrating from
`formspree.io/f/{form_id}` requires no renaming.

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


## FAQ

### Why use this instead of Formspree?

At the basic level, SmartForm and Formspree are very similar: get a
form ID, POST a plain HTML form to a hosted endpoint with `_gotcha`
for spam filtering, and the API delivers the submission. The reserved
fields (`_gotcha`, `_next`, `_subject`, honeypot aliases) are
Formspree-compatible — a migration does not require renaming
anything.

The differences are operational, not API surface:

- **No email confirmation flow.** Formspree requires verifying your
  domain before submissions reach your inbox; SmartForm submissions
  land in your dashboard immediately.
- **AI spam filtering on the free tier.** Formspree's free tier uses
  only a honeypot field, which catches naive bots but lets semantic
  spam through. SmartForm applies AI-based classification by default,
  free of charge.
- **AI intent classification** (`sales` / `support` / `inquiry`
  / `spam`) on the Pro tier, for routing submissions without writing
  rules yourself.
- **No per-submission metering** on the basic plan.

### Is there a free tier?

Yes. AI spam filtering is enabled by default on every plan. AI intent
classification and high-value lead detection require a paid plan (Pro
or Business) — the dashboard enforces this and returns HTTP 402 if
you try to enable them on a free workspace.

### Do I need an API key?

No. The form posts directly to a public endpoint using only an 8-char
form ID, which is non-enumerable. The example also includes a hidden
`_gotcha` honeypot field so naive bots cannot submit.

### Why use a Worker?
The Worker hides the form ID and lets you add KV-based rate limiting in front of the public endpoint. Pure edge — no cold starts.

## Related examples
[Vercel Functions proxy](https://github.com/yanghuai123456/smartform-example-serverless-vercel) | [Cloudflare Pages contact form](https://github.com/yanghuai123456/smartform-example-cloudflare-react) | [Astro contact form](https://github.com/yanghuai123456/smartform-example-astro)


## License

MIT.

