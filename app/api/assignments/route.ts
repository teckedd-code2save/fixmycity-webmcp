import { database, ensureDatabase, json } from '@/lib/civic-db';

export async function GET(request: Request) {
  await ensureDatabase(); const url=new URL(request.url); const inspectorId=url.searchParams.get('inspectorId') ?? 'FIELD-TEAM-01';
  const rows=await database().prepare(`SELECT a.id,a.route_id AS routeId,a.stop_order AS stopOrder,a.status,a.assigned_at AS assignedAt,r.id AS reportId,r.title,r.address,r.description,r.severity,r.status AS reportStatus,r.latitude,r.longitude FROM assignments a JOIN reports r ON r.id=a.report_id WHERE a.inspector_id=? ORDER BY a.assigned_at DESC,a.stop_order ASC`).bind(inspectorId).all();
  return json({ assignments:rows.results });
}
