import { env } from 'cloudflare:workers';
import { entityId, json } from '@/lib/civic-db';

const allowed = new Set(['image/jpeg','image/png','image/webp']);

export async function POST(request: Request) {
  const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File)) return json({ error:'Choose an image to upload.' },400);
  if (!allowed.has(file.type)) return json({ error:'Use a JPEG, PNG or WebP image.' },415);
  if (file.size > 5_000_000) return json({ error:'Images must be smaller than 5 MB.' },413);
  const extension = file.type.split('/')[1].replace('jpeg','jpg'); const key = `reports/${entityId('IMG')}.${extension}`;
  await env.FILES.put(key,await file.arrayBuffer(),{ httpMetadata:{ contentType:file.type }, customMetadata:{ originalName:file.name.slice(0,120) } });
  return json({ key, url:`/api/uploads/${encodeURIComponent(key)}` },201);
}
