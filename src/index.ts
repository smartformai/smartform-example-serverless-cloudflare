export interface Env { SMARTFORM_ENDPOINT: string; SMARTFORM_FORM_ID: string; }

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
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
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  },
};
