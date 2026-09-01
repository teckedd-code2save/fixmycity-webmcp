import { database, distanceMetres, ensureDatabase, json, priorityScore, reportId } from '@/lib/civic-db';
const text = (value:unknown) => typeof value === 'string' ? value : '';
type ReportRow={id:string;title:string;description:string;category:string;severity:string;status:string;address:string;landmark:string|null;latitude:number;longitude:number;affectedPeople:number;confirmations:number;imageKey:string|null;priorityScore:number;createdAt:number;updatedAt:number};

export async function GET(request: Request) {
  await ensureDatabase();
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const query = url.searchParams.get('q');
  const latitudeValue=url.searchParams.get('latitude');const longitudeValue=url.searchParams.get('longitude');const latitude=Number(latitudeValue);const longitude=Number(longitudeValue);const hasLocation=latitudeValue!==null&&longitudeValue!==null&&Number.isFinite(latitude)&&Number.isFinite(longitude);
  const radiusMetres=Math.max(50,Math.min(5000,Number(url.searchParams.get('radiusMetres')??1000)));
  const clauses = ['duplicate_of IS NULL']; const values: unknown[] = [];
  if (category) { clauses.push('category = ?'); values.push(category); }
  if (status) { clauses.push('status = ?'); values.push(status); }
  if (query) { clauses.push('(title LIKE ? OR description LIKE ? OR address LIKE ? OR landmark LIKE ?)'); values.push(...Array(4).fill(`%${query}%`)); }
  const result = await database().prepare(`SELECT id,title,description,category,severity,status,address,landmark,latitude,longitude,affected_people AS affectedPeople,confirmations,image_key AS imageKey,priority_score AS priorityScore,created_at AS createdAt,updated_at AS updatedAt FROM reports WHERE ${clauses.join(' AND ')} ORDER BY priority_score DESC, created_at DESC LIMIT 100`).bind(...values).all<ReportRow>();
  if(hasLocation){const center={latitude,longitude};const reports=(result.results??[]).filter(report=>report.status!=='resolved').map(report=>({...report,distanceMetres:Math.round(distanceMetres(center,report))})).filter(report=>report.distanceMetres<=radiusMetres).sort((a,b)=>a.distanceMetres-b.distanceMetres||b.priorityScore-a.priorityScore);return json({center,radiusMetres,reports})}
  return json({ reports: result.results });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as Record<string, unknown>;
  const required = ['title','description','category','severity','address','latitude','longitude'];
  if (required.some((key) => body[key] === undefined || body[key] === '')) return json({ error: 'Complete all required report fields.' }, 400);
  const allowedCategories = ['flooding','drainage','road','lighting','waste'];
  const allowedSeverities = ['low','medium','high','critical'];
  if (!allowedCategories.includes(String(body.category)) || !allowedSeverities.includes(String(body.severity))) return json({ error: 'Invalid category or severity.' }, 400);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return json({ error: 'Provide valid report coordinates.' }, 400);
  }
  const affectedPeople = Number(body.affectedPeople ?? 1);
  if (!Number.isInteger(affectedPeople) || affectedPeople < 1 || affectedPeople > 10_000) {
    return json({ error: 'Affected people must be a whole number from 1 to 10,000.' }, 400);
  }
  const id = reportId(); const now = Date.now();
  const score = priorityScore({ severity: text(body.severity), affectedPeople, confirmations: 1, category: text(body.category), landmark: text(body.landmark) });
  await database().prepare(`INSERT INTO reports (id,title,description,category,severity,status,address,landmark,latitude,longitude,affected_people,confirmations,reporter_id,image_key,priority_score,created_at,updated_at) VALUES (?,?,?,?,?,'reported',?,?,?,?,?,1,?,?,?, ?,?)`)
    .bind(id,text(body.title),text(body.description),text(body.category),text(body.severity),text(body.address),text(body.landmark)||null,latitude,longitude,affectedPeople,'public-resident',text(body.imageKey)||null,score,now,now).run();
  const report = await database().prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
  return json({ report }, 201);
}
