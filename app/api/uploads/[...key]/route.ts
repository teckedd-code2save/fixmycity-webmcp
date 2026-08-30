import { env } from 'cloudflare:workers';

export async function GET(_: Request, context: { params: Promise<{ key:string[] }> }) {
  const { key } = await context.params; const object = await env.FILES.get(key.join('/'));
  if (!object) return new Response('Not found',{ status:404 });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set('Cache-Control','public, max-age=31536000, immutable'); headers.set('ETag',object.httpEtag);
  return new Response(object.body,{ headers });
}
