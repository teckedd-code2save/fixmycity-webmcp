import { database, distanceMetres, ensureDatabase, entityId, json } from '@/lib/civic-db';

type ReportRow = { id: string; title: string; description: string; category: string; landmark: string | null; latitude: number; longitude: number; createdAt: number };

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json().catch(() => ({})) as { category?: string; radiusMetres?: number };
  const radius = Math.max(30, Math.min(500, Number(body.radiusMetres ?? 150)));
  const query = body.category ? 'SELECT id,title,description,category,landmark,latitude,longitude,created_at AS createdAt FROM reports WHERE duplicate_of IS NULL AND status != ? AND category = ?' : 'SELECT id,title,description,category,landmark,latitude,longitude,created_at AS createdAt FROM reports WHERE duplicate_of IS NULL AND status != ?';
  const rows = await database().prepare(query).bind('resolved', ...(body.category ? [body.category] : [])).all<ReportRow>();
  const reports = rows.results ?? []; const groups: Array<{ reportIds: string[]; distanceMetres: number; confidence: number; evidence: string[] }> = []; const used = new Set<string>();
  for (const report of reports) {
    if (used.has(report.id)) continue;
    const nearby = reports.filter((candidate) => candidate.id !== report.id && !used.has(candidate.id) && candidate.category === report.category && distanceMetres(report,candidate) <= radius);
    if (!nearby.length) continue;
    const members = [report,...nearby]; members.forEach((item) => used.add(item.id));
    const maxDistance = Math.round(Math.max(...nearby.map((item) => distanceMetres(report,item))));
    const sameLandmark = members.every((item) => item.landmark && item.landmark === report.landmark);
    const timeSpreadMinutes = Math.round((Math.max(...members.map((item) => item.createdAt))-Math.min(...members.map((item) => item.createdAt)))/60000);
    const confidence = Math.min(98, 60 + (sameLandmark ? 20 : 0) + Math.max(0, 18-Math.round(maxDistance/10)));
    groups.push({ reportIds: members.map((item) => item.id), distanceMetres: maxDistance, confidence, evidence: [`Same ${report.category} category`, `Within ${maxDistance} metres`, `${timeSpreadMinutes}-minute reporting window`, ...(sameLandmark ? [`Matching landmark: ${report.landmark}`] : [])] });
  }
  const created = [];
  for (const group of groups) {
    const id = entityId('PROP');
    await database().prepare(`INSERT INTO proposals (id,kind,payload,confidence,explanation,status,created_by,created_at) VALUES (?,'duplicate_merge',?,?,?,'pending','webmcp-agent',?)`).bind(id,JSON.stringify(group),group.confidence,group.evidence.join(' · '),Date.now()).run();
    created.push({ id, ...group, status: 'pending' });
  }
  return json({ proposals: created, inspectedReports: reports.length, radiusMetres: radius });
}
