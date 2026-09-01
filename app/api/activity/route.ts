import { database, ensureDatabase, json } from '@/lib/civic-db';

type ProposalRow = {
  id: string;
  kind: string;
  payload: string;
  confidence: number;
  status: string;
  createdAt: number;
  reviewedAt: number | null;
};
type UpdateRow = {
  id: string;
  reportId: string;
  reportTitle: string;
  action: string;
  note: string | null;
  createdAt: number;
};
type AssignmentRow = {
  id: string;
  reportId: string;
  reportTitle: string;
  inspectorId: string;
  routeId: string;
  createdAt: number;
};
type ReportRow = {
  id: string;
  title: string;
  status: string;
  createdAt: number;
};
type ActivityEvent = {
  id: string;
  actor: 'Resident' | 'WebMCP agent' | 'Human approval' | 'Field team';
  title: string;
  detail: string;
  occurredAt: number;
};

export async function GET() {
  await ensureDatabase();
  const db = database();
  const [
    proposalRows,
    updateRows,
    assignmentRows,
    reportRows,
    inspectionCount,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT id,kind,payload,confidence,status,created_at AS createdAt,reviewed_at AS reviewedAt FROM proposals WHERE created_by='webmcp-agent' ORDER BY created_at DESC LIMIT 20`,
      )
      .all<ProposalRow>(),
    db
      .prepare(
        `SELECT u.id,u.report_id AS reportId,r.title AS reportTitle,u.action,u.note,u.created_at AS createdAt FROM updates u JOIN reports r ON r.id=u.report_id ORDER BY u.created_at DESC LIMIT 20`,
      )
      .all<UpdateRow>(),
    db
      .prepare(
        `SELECT a.id,a.report_id AS reportId,r.title AS reportTitle,a.inspector_id AS inspectorId,a.route_id AS routeId,a.assigned_at AS createdAt FROM assignments a JOIN reports r ON r.id=a.report_id ORDER BY a.assigned_at DESC LIMIT 20`,
      )
      .all<AssignmentRow>(),
    db
      .prepare(
        `SELECT id,title,status,created_at AS createdAt FROM reports WHERE duplicate_of IS NULL ORDER BY created_at DESC LIMIT 20`,
      )
      .all<ReportRow>(),
    db
      .prepare(
        `SELECT COUNT(*) AS count FROM reports WHERE status='inspecting' AND duplicate_of IS NULL`,
      )
      .first<{ count: number }>(),
  ]);
  const proposals = proposalRows.results ?? [];
  const events: ActivityEvent[] = [];
  let signalsUnified = 0;
  let routesPrepared = 0;
  for (const proposal of proposals) {
    const payload = JSON.parse(proposal.payload) as {
      reportIds?: string[];
      stops?: Array<{ id: string }>;
      totalDistanceMetres?: number;
    };
    if (proposal.kind === 'duplicate_merge') {
      signalsUnified += Math.max(0, (payload.reportIds?.length ?? 1) - 1);
      events.push({
        id: proposal.id,
        actor: 'WebMCP agent',
        title: 'Matched repeated community signals',
        detail: `${payload.reportIds?.length ?? 0} reports · ${proposal.confidence}% confidence · ${proposal.status}`,
        occurredAt: proposal.createdAt,
      });
    }
    if (proposal.kind === 'route') {
      routesPrepared += 1;
      events.push({
        id: proposal.id,
        actor: 'WebMCP agent',
        title: 'Prepared an inspection route',
        detail: `${payload.stops?.length ?? 0} stops · ${((payload.totalDistanceMetres ?? 0) / 1000).toFixed(1)} km · ${proposal.status}`,
        occurredAt: proposal.createdAt,
      });
    }
  }
  for (const update of updateRows.results ?? []) {
    const status = update.action.startsWith('status:')
      ? update.action.slice(7)
      : null;
    const fieldAction =
      status && ['inspecting', 'resolved', 'reopened'].includes(status);
    events.push({
      id: update.id,
      actor: fieldAction ? 'Field team' : 'Human approval',
      title: status
        ? `Report moved to ${status}`
        : 'Human approved the duplicate merge',
      detail: `${update.reportId} · ${update.note ?? update.reportTitle}`,
      occurredAt: update.createdAt,
    });
  }
  for (const assignment of assignmentRows.results ?? [])
    events.push({
      id: assignment.id,
      actor: 'Human approval',
      title: 'Dispatched the approved route',
      detail: `${assignment.reportId} → ${assignment.inspectorId}`,
      occurredAt: assignment.createdAt,
    });
  for (const report of reportRows.results ?? [])
    events.push({
      id: `report-${report.id}`,
      actor: 'Resident',
      title: 'Resident signal became structured work',
      detail: `${report.id} · ${report.title}`,
      occurredAt: report.createdAt,
    });
  return json({
    impact: {
      agentProposals: proposals.length,
      approvedAgentPlans: proposals.filter((item) => item.status === 'approved')
        .length,
      signalsUnified,
      routesPrepared,
      fieldAssignments: assignmentRows.results?.length ?? 0,
      activeInspections: inspectionCount?.count ?? 0,
    },
    events: events.sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 8),
  });
}
