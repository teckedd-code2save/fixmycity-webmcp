import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const baseUrl = process.env.TEST_BASE_URL;
assert.ok(baseUrl, 'TEST_BASE_URL is required');

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

async function jsonRequest(path, method = 'GET', body) {
  return request(path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const reportBase = {
  description: 'Standing flood water blocks the roadside drain and creates a hazard for residents.',
  category: 'flooding',
  severity: 'high',
  address: 'Integration Test Street, Accra',
  landmark: 'Integration Test School',
  affectedPeople: 18,
};

let reportA;
let reportB;
let duplicateProposal;
let routeProposal;

describe('FixMyCity isolated API workflow', { concurrency: 1 }, () => {
  test('starts with a healthy, empty workspace and ten WebMCP tools', async () => {
    const { response, body } = await jsonRequest('/api/health');
    assert.equal(response.status, 200);
    assert.equal(body.status, 'healthy');
    assert.equal(body.database, 'connected');
    assert.equal(body.reports.total, 0);
    assert.equal(body.webmcp.toolCount, 10);
  });

  test('rejects incomplete and invalid resident reports', async () => {
    let result = await jsonRequest('/api/reports', 'POST', { title: 'Missing fields' });
    assert.equal(result.response.status, 400);

    result = await jsonRequest('/api/reports', 'POST', {
      ...reportBase,
      title: 'Invalid category',
      category: 'other',
      latitude: 5.5652,
      longitude: -0.1931,
    });
    assert.equal(result.response.status, 400);

    result = await jsonRequest('/api/reports', 'POST', {
      ...reportBase,
      title: 'Invalid coordinates',
      latitude: 500,
      longitude: -0.1931,
    });
    assert.equal(result.response.status, 400);
  });

  test('stores two genuine-shaped nearby reports and exposes search filters', async () => {
    let result = await jsonRequest('/api/reports', 'POST', {
      ...reportBase,
      title: 'Flooded drain beside school gate',
      latitude: 5.5752,
      longitude: -0.1831,
    });
    assert.equal(result.response.status, 201);
    reportA = result.body.report;
    assert.match(reportA.id, /^FC-/);

    result = await jsonRequest('/api/reports', 'POST', {
      ...reportBase,
      title: 'Same drain overflowing near the school',
      description: 'The same blocked drain is overflowing near the school entrance and needs inspection.',
      latitude: 5.57555,
      longitude: -0.18315,
      affectedPeople: 8,
    });
    assert.equal(result.response.status, 201);
    reportB = result.body.report;

    result = await jsonRequest('/api/reports?q=school&category=flooding&status=reported');
    assert.equal(result.response.status, 200);
    assert.equal(result.body.reports.length, 2);
    assert.deepEqual(new Set(result.body.reports.map((report) => report.id)), new Set([reportA.id, reportB.id]));

    result = await jsonRequest('/api/reports?latitude=5.5752&longitude=-0.1831&radiusMetres=100');
    assert.equal(result.response.status, 200);
    assert.equal(result.body.reports.length, 2);
    assert.ok(result.body.reports.every((report) => report.distanceMetres <= 100));
  });

  test('corroborates a report and records audited status updates', async () => {
    let result = await jsonRequest(`/api/reports/${reportA.id}/confirm`, 'POST');
    assert.equal(result.response.status, 200);
    assert.equal(result.body.confirmations, 2);

    result = await jsonRequest('/api/reports/DOES-NOT-EXIST');
    assert.equal(result.response.status, 404);

    result = await jsonRequest(`/api/reports/${reportA.id}`, 'PATCH', { status: 'invalid' });
    assert.equal(result.response.status, 400);

    result = await jsonRequest(`/api/reports/${reportA.id}`, 'PATCH', { status: 'triaged', note: 'Validated by integration test.' });
    assert.equal(result.response.status, 200);

    result = await jsonRequest(`/api/reports/${reportA.id}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.report.status, 'triaged');
    assert.ok(result.body.updates.some((update) => update.action === 'status:triaged'));
  });

  test('creates duplicate evidence and enforces explicit approval', async () => {
    let result = await jsonRequest('/api/proposals/duplicates', 'POST', { category: 'flooding', radiusMetres: 150 });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.proposals.length, 1);
    duplicateProposal = result.body.proposals[0];
    assert.ok(duplicateProposal.confidence >= 60);
    assert.equal(duplicateProposal.reportIds.length, 2);

    result = await jsonRequest(`/api/proposals/${duplicateProposal.id}/approve`, 'POST', { confirm: false });
    assert.equal(result.response.status, 409);

    result = await jsonRequest(`/api/proposals/${duplicateProposal.id}/approve`, 'POST', { confirm: true });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.mergedReportIds.length, 1);

    result = await jsonRequest(`/api/proposals/${duplicateProposal.id}/approve`, 'POST', { confirm: true });
    assert.equal(result.response.status, 409);
  });

  test('plans a live road route, enforces approval, and hands work to the field team', async () => {
    let result = await jsonRequest('/api/routes/plan', 'POST', { maxStops: 4 });
    assert.equal(result.response.status, 200);
    routeProposal = result.body;
    assert.equal(routeProposal.requiresHumanApproval, true);
    assert.equal(routeProposal.routingSource, 'Project OSRM / OpenStreetMap');
    assert.ok(routeProposal.totalDistanceMetres > 0);
    assert.ok(routeProposal.stops.length >= 1);

    result = await jsonRequest('/api/routes/assign', 'POST', { proposalId: routeProposal.proposalId, confirm: false });
    assert.equal(result.response.status, 409);

    result = await jsonRequest('/api/routes/assign', 'POST', { proposalId: routeProposal.proposalId, inspectorId: 'FIELD-TEAM-01', confirm: true });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.assignments, routeProposal.stops.length);

    result = await jsonRequest('/api/assignments?inspectorId=FIELD-TEAM-01');
    assert.equal(result.response.status, 200);
    assert.equal(result.body.assignments.length, routeProposal.stops.length);
    assert.ok(result.body.assignments.every((assignment) => assignment.status === 'accepted'));
  });

  test('supports inspector progress through resolution', async () => {
    const canonicalId = routeProposal.stops[0].id;
    let result = await jsonRequest(`/api/reports/${canonicalId}`, 'PATCH', { status: 'inspecting', note: 'Field team arrived.' });
    assert.equal(result.response.status, 200);

    result = await jsonRequest(`/api/reports/${canonicalId}`, 'PATCH', { status: 'resolved', note: 'Drain cleared and water flowing.' });
    assert.equal(result.response.status, 200);

    result = await jsonRequest(`/api/reports/${canonicalId}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.report.status, 'resolved');
    assert.ok(result.body.updates.some((update) => update.action === 'status:resolved'));

    result = await jsonRequest('/api/routes/plan', 'POST', { maxStops: 4 });
    assert.equal(result.response.status, 409);
  });

  test('validates uploads and persists supported evidence in isolated R2', async () => {
    let result = await request('/api/uploads', { method: 'POST', body: new FormData() });
    assert.equal(result.response.status, 400);

    let form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'evidence.txt');
    result = await request('/api/uploads', { method: 'POST', body: form });
    assert.equal(result.response.status, 415);

    form = new FormData();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
    form.append('file', new Blob([png], { type: 'image/png' }), 'drain-evidence.png');
    result = await request('/api/uploads', { method: 'POST', body: form });
    assert.equal(result.response.status, 201);
    assert.match(result.body.key, /^reports\/IMG-/);

    const stored = await request(result.body.url);
    assert.equal(stored.response.status, 200);
    assert.equal(stored.response.headers.get('content-type'), 'image/png');
  });

  test('validates coordinates and returns live road geometry', async () => {
    let result = await jsonRequest('/api/directions', 'POST', { coordinates: [[0, 0]] });
    assert.equal(result.response.status, 400);

    result = await jsonRequest('/api/directions', 'POST', {
      coordinates: [[-0.1931, 5.5652], [-0.187, 5.6037]],
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.source, 'Project OSRM / OpenStreetMap');
    assert.equal(result.body.geometry.type, 'LineString');
    assert.ok(result.body.geometry.coordinates.length > 1);
  });

  test('returns live weather from a named provider', async () => {
    const { response, body } = await jsonRequest('/api/weather');
    assert.equal(response.status, 200);
    assert.ok(['Open-Meteo', 'MET Norway Locationforecast'].includes(body.source));
    assert.equal(body.location, 'Accra');
    assert.equal(typeof body.temperatureC, 'number');
    assert.equal(typeof body.rainWatch, 'boolean');
  });
});
