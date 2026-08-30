import { env } from 'cloudflare:workers';

let ready: Promise<void> | null = null;

const schema = [
  `CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'resident', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'reported', address TEXT NOT NULL, landmark TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, affected_people INTEGER NOT NULL DEFAULT 1, confirmations INTEGER NOT NULL DEFAULT 1, reporter_id TEXT NOT NULL, duplicate_of TEXT, image_key TEXT, priority_score INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (reporter_id) REFERENCES profiles(id))`,
  `CREATE TABLE IF NOT EXISTS inspectors (id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL, phone TEXT, transport TEXT NOT NULL DEFAULT 'car', availability TEXT NOT NULL DEFAULT 'available', start_latitude REAL NOT NULL, start_longitude REAL NOT NULL, FOREIGN KEY (profile_id) REFERENCES profiles(id))`,
  `CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY NOT NULL, inspector_id TEXT NOT NULL, report_id TEXT NOT NULL, stop_order INTEGER NOT NULL, route_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'proposed', assigned_at INTEGER NOT NULL, FOREIGN KEY (inspector_id) REFERENCES inspectors(id), FOREIGN KEY (report_id) REFERENCES reports(id))`,
  `CREATE TABLE IF NOT EXISTS updates (id TEXT PRIMARY KEY NOT NULL, report_id TEXT NOT NULL, actor_id TEXT NOT NULL, action TEXT NOT NULL, note TEXT, image_key TEXT, created_at INTEGER NOT NULL, FOREIGN KEY (report_id) REFERENCES reports(id), FOREIGN KEY (actor_id) REFERENCES profiles(id))`,
  `CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, confidence INTEGER NOT NULL, explanation TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL, created_at INTEGER NOT NULL, reviewed_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_status_category ON reports(status, category)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority_score)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude)`,
  `CREATE INDEX IF NOT EXISTS idx_assignments_inspector_status ON assignments(inspector_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_updates_report_created ON updates(report_id, created_at)`,
];

const seedReports = [
  ['FC-0241','Blocked storm drain','Water is rising quickly around the blocked drain and entering two storefronts.','drainage','critical','reported','Nii Nortei Nyanchi Street','Nortei Junction',5.57511,-0.19692,34,4,96],
  ['FC-0238','Drain overflowing beside shops','The same junction is flooding from a drain covered with plastic waste.','drainage','high','reported','Nii Nortei Nyanchi Street','Nortei Junction',5.57548,-0.19655,18,3,84],
  ['FC-0234','Floodwater crossing pavement','Pedestrians are stepping into traffic to avoid water near the junction.','flooding','high','reported','Nii Nortei Nyanchi Street','Nortei Junction',5.57479,-0.19712,22,2,82],
  ['FC-0237','Road flooding near school','Standing water is blocking the school entrance and one lane of traffic.','flooding','high','triaged','Independence Avenue','Unity Primary School',5.56871,-0.18625,120,7,91],
  ['FC-0229','Broken streetlight','Two streetlights have been dark for three nights.','lighting','medium','reported','Ringway Link','Community Library',5.56135,-0.1907,40,2,54],
  ['FC-0225','Deep pothole at junction','Vehicles are swerving sharply around a growing pothole.','road','high','assigned','Castle Road','Castle Road Junction',5.55892,-0.18291,60,6,78],
  ['FC-0218','Uncollected waste','Waste has blocked part of the pedestrian path.','waste','medium','reported','Oxford Street','Osu Market',5.55643,-0.18213,25,3,48],
  ['FC-0211','Damaged pavement','Loose slabs create a trip hazard beside the clinic.','road','medium','resolved','Kanda Highway','Kanda Clinic',5.58644,-0.20672,12,2,41],
];

export function database() { return env.DB; }

export async function ensureDatabase() {
  ready ??= (async () => {
    const db = database();
    await db.batch(schema.map((sql) => db.prepare(sql)));
    const row = await db.prepare('SELECT COUNT(*) AS count FROM reports').first<{ count: number }>();
    if ((row?.count ?? 0) > 0) return;
    const now = Date.now();
    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO profiles (id,email,name,role,created_at) VALUES (?,?,?,?,?)`).bind('demo-resident','resident@fixmycity.demo','Ama Mensah','resident',now),
      db.prepare(`INSERT OR IGNORE INTO profiles (id,email,name,role,created_at) VALUES (?,?,?,?,?)`).bind('demo-operator','operations@fixmycity.demo','Edward Twumasi','operator',now),
      db.prepare(`INSERT OR IGNORE INTO profiles (id,email,name,role,created_at) VALUES (?,?,?,?,?)`).bind('demo-inspector','inspector@fixmycity.demo','Kojo Owusu','inspector',now),
      db.prepare(`INSERT OR IGNORE INTO inspectors (id,profile_id,phone,transport,availability,start_latitude,start_longitude) VALUES (?,?,?,?,?,?,?)`).bind('INS-001','demo-inspector',null,'motorbike','available',5.5652,-0.1931),
      ...seedReports.map((r, index) => db.prepare(`INSERT OR IGNORE INTO reports (id,title,description,category,severity,status,address,landmark,latitude,longitude,affected_people,confirmations,priority_score,reporter_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...r,'demo-resident',now-(index+1)*720000,now-(index+1)*240000)),
    ]);
  })();
  return ready;
}

export function reportId() { return `FC-${String(Math.floor(1000 + Math.random() * 8999))}`; }
export function entityId(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function priorityScore(input: { severity: string; affectedPeople: number; confirmations: number; category: string; landmark?: string | null }) {
  const severity = { low: 10, medium: 25, high: 45, critical: 65 }[input.severity] ?? 0;
  const people = Math.min(20, Math.ceil(input.affectedPeople / 10) * 2);
  const corroboration = Math.min(10, input.confirmations * 2);
  const infrastructure = input.landmark && /(school|clinic|market)/i.test(input.landmark) ? 10 : 0;
  const weather = ['flooding','drainage'].includes(input.category) ? 6 : 0;
  return Math.min(100, severity + people + corroboration + infrastructure + weather);
}

export function distanceMetres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180; const dLat = (b.latitude-a.latitude)*rad; const dLon = (b.longitude-a.longitude)*rad;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dLon/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
