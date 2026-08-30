import { database, ensureDatabase, json, priorityScore, reportId } from '@/lib/civic-db';
const text = (value:unknown) => typeof value === 'string' ? value : '';

export async function GET(request: Request) {
  await ensureDatabase();
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const query = url.searchParams.get('q');
  const clauses = ['duplicate_of IS NULL']; const values: unknown[] = [];
  if (category) { clauses.push('category = ?'); values.push(category); }
  if (status) { clauses.push('status = ?'); values.push(status); }
  if (query) { clauses.push('(title LIKE ? OR description LIKE ? OR address LIKE ? OR landmark LIKE ?)'); values.push(...Array(4).fill(`%${query}%`)); }
  const result = await database().prepare(`SELECT id,title,description,category,severity,status,address,landmark,latitude,longitude,affected_people AS affectedPeople,confirmations,image_key AS imageKey,priority_score AS priorityScore,created_at AS createdAt,updated_at AS updatedAt FROM reports WHERE ${clauses.join(' AND ')} ORDER BY priority_score DESC, created_at DESC LIMIT 100`).bind(...values).all();
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
  const id = reportId(); const now = Date.now();
  const score = priorityScore({ severity: text(body.severity), affectedPeople: Number(body.affectedPeople ?? 1), confirmations: 1, category: text(body.category), landmark: text(body.landmark) });
  await database().prepare(`INSERT INTO reports (id,title,description,category,severity,status,address,landmark,latitude,longitude,affected_people,confirmations,reporter_id,image_key,priority_score,created_at,updated_at) VALUES (?,?,?,?,?,'reported',?,?,?,?,?,1,?,?,?, ?,?)`)
    .bind(id,text(body.title),text(body.description),text(body.category),text(body.severity),text(body.address),text(body.landmark)||null,Number(body.latitude),Number(body.longitude),Number(body.affectedPeople ?? 1),'demo-resident',text(body.imageKey)||null,score,now,now).run();
  const report = await database().prepare('SELECT * FROM reports WHERE id = ?').bind(id).first();
  return json({ report }, 201);
}
