import { database, ensureDatabase, json } from '@/lib/civic-db';

export async function GET() {
  try {
    await ensureDatabase();
    const counts = await database().prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status != 'resolved' AND duplicate_of IS NULL THEN 1 ELSE 0 END) AS open,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN severity = 'critical' AND status != 'resolved' AND duplicate_of IS NULL THEN 1 ELSE 0 END) AS critical
      FROM reports
    `).first<{ total: number; open: number; resolved: number; critical: number }>();
    const assignments = await database().prepare(`SELECT COUNT(*) AS count FROM assignments WHERE status IN ('proposed','accepted')`).first<{ count: number }>();
    const proposals = await database().prepare(`SELECT COUNT(*) AS count FROM proposals WHERE status = 'pending'`).first<{ count: number }>();
    return json({
      status: 'healthy',
      database: 'connected',
      reports: {
        total: counts?.total ?? 0,
        open: counts?.open ?? 0,
        resolved: counts?.resolved ?? 0,
        critical: counts?.critical ?? 0,
      },
      activeAssignments: assignments?.count ?? 0,
      pendingProposals: proposals?.count ?? 0,
      webmcp: { registeredOnClient: true, toolCount: 8 },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return json({ status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }, 503);
  }
}
