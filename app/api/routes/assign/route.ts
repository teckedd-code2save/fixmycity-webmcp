import { database, ensureDatabase, entityId, json } from '@/lib/civic-db';

export async function POST(request: Request) {
  await ensureDatabase(); const body = await request.json() as { proposalId?:string; inspectorId?:string; confirm?:boolean };
  if (body.confirm !== true) return json({ error:'Explicit human confirmation is required.' },409);
  const proposal = await database().prepare(`SELECT * FROM proposals WHERE id = ? AND kind = 'route'`).bind(body.proposalId).first<{ payload:string; status:string }>();
  if (!proposal) return json({ error:'Route proposal not found.' },404); if (proposal.status !== 'pending') return json({ error:`Route is already ${proposal.status}.` },409);
  const inspectorId = body.inspectorId ?? 'FIELD-TEAM-01'; const route = JSON.parse(proposal.payload) as { routeId:string; stops:Array<{id:string}> }; const now=Date.now(); const db=database();
  await db.batch([
    ...route.stops.map((stop,index) => db.prepare(`INSERT INTO assignments (id,inspector_id,report_id,stop_order,route_id,status,assigned_at) VALUES (?,?,?,?,?,'accepted',?)`).bind(entityId('ASG'),inspectorId,stop.id,index+1,route.routeId,now)),
    ...route.stops.map((stop) => db.prepare(`UPDATE reports SET status = 'assigned', updated_at = ? WHERE id = ?`).bind(now,stop.id)),
    db.prepare(`UPDATE inspectors SET availability = 'assigned' WHERE id = ?`).bind(inspectorId), db.prepare(`UPDATE proposals SET status = 'approved', reviewed_at = ? WHERE id = ?`).bind(now,body.proposalId),
  ]);
  return json({ ok:true, routeId:route.routeId, inspectorId, assignments:route.stops.length });
}
