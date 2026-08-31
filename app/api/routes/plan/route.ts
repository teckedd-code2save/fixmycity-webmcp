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
  if (!stops.length) return json({ error:'No unresolved reports are available for routing.' },409);
  const coordinates = [[start.longitude,start.latitude],...stops.map((stop)=>[stop.longitude,stop.latitude])];
  const encoded = coordinates.map(([longitude,latitude])=>`${longitude},${latitude}`).join(';');
  const routingResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${encoded}?overview=false&steps=false`,{ headers:{ Accept:'application/json','User-Agent':'FixMyCity-WebMCP-Challenge/1.0' } });
  if (!routingResponse.ok) return json({ error:'Live road routing is temporarily unavailable.' },502);
  const routing = await routingResponse.json() as { code?:string;routes?:Array<{distance:number;duration:number}> }; const roadRoute=routing.routes?.[0];
  if (routing.code!=='Ok'||!roadRoute) return json({ error:'No drivable inspection route was found.' },409);
  const totalDistanceMetres=Math.round(roadRoute.distance);const drivingMinutes=Math.max(1,Math.round(roadRoute.duration/60));const durationMinutes=drivingMinutes+stops.length*18;const routeId = entityId('ROUTE');
  const payload = { routeId, start, stops, totalDistanceMetres, drivingMinutes, durationMinutes, routingSource:'Project OSRM / OpenStreetMap' };
  const proposalId = entityId('PROP');
  await database().prepare(`INSERT INTO proposals (id,kind,payload,confidence,explanation,status,created_by,created_at) VALUES (?,'route',?,90,?,'pending','webmcp-agent',?)`).bind(proposalId,JSON.stringify(payload),`${stops.length} priority stops ordered by travel distance and urgency.`,Date.now()).run();
  return json({ proposalId, ...payload, status:'pending', requiresHumanApproval:true });
}
