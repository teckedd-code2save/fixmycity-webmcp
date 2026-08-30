import { database, distanceMetres, ensureDatabase, entityId, json } from '@/lib/civic-db';

type Point = { id:string; title:string; address:string; latitude:number; longitude:number; priorityScore:number };

export async function POST(request: Request) {
  await ensureDatabase(); const body = await request.json().catch(() => ({})) as { reportIds?: string[]; maxStops?: number };
  const limit = Math.max(1, Math.min(8, Number(body.maxStops ?? 4))); let rows;
  if (body.reportIds?.length) {
    const ids = body.reportIds.slice(0,8); rows = await database().prepare(`SELECT id,title,address,latitude,longitude,priority_score AS priorityScore FROM reports WHERE id IN (${ids.map(() => '?').join(',')}) AND duplicate_of IS NULL`).bind(...ids).all<Point>();
  } else rows = await database().prepare(`SELECT id,title,address,latitude,longitude,priority_score AS priorityScore FROM reports WHERE duplicate_of IS NULL AND status IN ('reported','triaged') ORDER BY priority_score DESC LIMIT ?`).bind(limit).all<Point>();
  const remaining = [...(rows.results ?? [])]; const start = { latitude:5.5652, longitude:-0.1931 }; const stops: Array<Point & { distanceFromPreviousMetres:number }> = []; let current = start;
  while (remaining.length && stops.length < limit) {
    remaining.sort((a,b) => (distanceMetres(current,a)-a.priorityScore*4)-(distanceMetres(current,b)-b.priorityScore*4));
    const next = remaining.shift()!; const distance = Math.round(distanceMetres(current,next)); stops.push({ ...next, distanceFromPreviousMetres:distance }); current = next;
  }
  const totalDistanceMetres = stops.reduce((sum,stop) => sum+stop.distanceFromPreviousMetres,0); const durationMinutes = Math.round(totalDistanceMetres/260 + stops.length*18); const routeId = entityId('ROUTE');
  const payload = { routeId, start, stops, totalDistanceMetres, durationMinutes };
  const proposalId = entityId('PROP');
  await database().prepare(`INSERT INTO proposals (id,kind,payload,confidence,explanation,status,created_by,created_at) VALUES (?,'route',?,90,?,'pending','webmcp-agent',?)`).bind(proposalId,JSON.stringify(payload),`${stops.length} priority stops ordered by travel distance and urgency.`,Date.now()).run();
  return json({ proposalId, ...payload, status:'pending', requiresHumanApproval:true });
}
