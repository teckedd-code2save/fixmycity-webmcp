import { database, ensureDatabase, entityId, json } from '@/lib/civic-db';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await ensureDatabase(); const { id } = await context.params; const body = await request.json() as { confirm?: boolean };
  if (body.confirm !== true) return json({ error: 'Explicit human confirmation is required.' }, 409);
  const proposal = await database().prepare('SELECT * FROM proposals WHERE id = ?').bind(id).first<{ id:string; kind:string; payload:string; status:string }>();
  if (!proposal) return json({ error: 'Proposal not found.' }, 404);
  if (proposal.status !== 'pending') return json({ error: `Proposal is already ${proposal.status}.` }, 409);
  if (proposal.kind !== 'duplicate_merge') return json({ error: 'This proposal type cannot be merged.' }, 400);
  const payload = JSON.parse(proposal.payload) as { reportIds: string[] }; const [canonicalId,...duplicates] = payload.reportIds; const now = Date.now(); const db = database();
  await db.batch([
    ...duplicates.map((reportId) => db.prepare(`UPDATE reports SET duplicate_of = ?, status = 'triaged', updated_at = ? WHERE id = ?`).bind(canonicalId,now,reportId)),
    db.prepare(`UPDATE reports SET confirmations = confirmations + ?, status = 'triaged', updated_at = ? WHERE id = ?`).bind(duplicates.length,now,canonicalId),
    db.prepare(`UPDATE proposals SET status = 'approved', reviewed_at = ? WHERE id = ?`).bind(now,id),
    db.prepare(`INSERT INTO updates (id,report_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?,?)`).bind(entityId('UPD'),canonicalId,'operations-user','reports_merged',`${duplicates.length} duplicate reports merged after human approval.`,now),
  ]);
  return json({ ok:true, canonicalReportId: canonicalId, mergedReportIds: duplicates, proposalId:id });
}
