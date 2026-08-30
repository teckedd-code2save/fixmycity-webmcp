import { database, ensureDatabase, entityId, json } from '@/lib/civic-db';
const text = (value:unknown) => typeof value === 'string' ? value : '';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase(); const { id } = await context.params;
  const report = await database().prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
  if (!report) return json({ error: 'Report not found.' }, 404);
  const updates = await database().prepare('SELECT action,note,image_key AS imageKey,created_at AS createdAt FROM updates WHERE report_id = ? ORDER BY created_at DESC').bind(id).all();
  return json({ report, updates: updates.results });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase(); const { id } = await context.params; const body = await request.json() as Record<string, unknown>;
  const status = text(body.status);
  if (!['reported','triaged','assigned','inspecting','resolved','reopened'].includes(status)) return json({ error: 'Invalid report status.' }, 400);
  const existing = await database().prepare('SELECT id FROM reports WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'Report not found.' }, 404);
  const now = Date.now();
  await database().batch([
    database().prepare('UPDATE reports SET status = ?, updated_at = ? WHERE id = ?').bind(status,now,id),
    database().prepare('INSERT INTO updates (id,report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?,?)').bind(entityId('UPD'),id,'demo-operator',`status:${status}`,text(body.note)||null,now),
  ]);
  return json({ ok: true, id, status, updatedAt: now });
}
