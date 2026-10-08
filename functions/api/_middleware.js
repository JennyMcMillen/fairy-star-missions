// Every /api request already sits behind Cloudflare Access (same hostname as the site).
// This adds a second guard: the request must carry Access's identity header,
// so the API never answers if Access is ever switched off by mistake.
export async function onRequest(context) {
  const email = context.request.headers.get('Cf-Access-Authenticated-User-Email');
  if (!email && context.env.ALLOW_WITHOUT_ACCESS !== 'yes') {
    return new Response('Not signed in', { status: 401 });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'no-store');
  return out;
}
