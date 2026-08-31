# FixMyCity

FixMyCity is an agent-native civic operations product built for the WebMCP Challenge. Residents submit geolocated evidence, city operators review agent proposals, and field inspectors receive approved routes in one shared, persistent workflow.

The product demonstrates why WebMCP matters: the same working interface used by people exposes typed browser tools to an AI agent. The agent can investigate and prepare work, while consequential changes remain behind explicit human approval.

## Working product loop

1. A resident submits a report with a map location and optional photo evidence.
2. Nearby residents corroborate the incident instead of creating noise.
3. An agent searches live records, detects probable duplicates, and simulates a priority route.
4. An operator reviews the evidence before approving a merge or assignment.
5. A field inspector receives the ordered route and records progress or resolution.
6. Every change persists in D1 and is visible across the role-specific surfaces.

## WebMCP tools

| Tool | Purpose | Changes records? |
| --- | --- | --- |
| `get_city_summary` | Read live workspace health and counts | No |
| `search_civic_reports` | Search resident evidence and workflow state | No |
| `find_duplicate_reports` | Create an evidence-backed merge proposal | Proposal only |
| `simulate_inspection_route` | Create an urgency-and-distance route proposal | Proposal only |
| `create_civic_report` | Submit a complete resident report | Yes |
| `approve_duplicate_merge` | Merge an explicitly approved proposal | Yes, approval required |
| `assign_inspection_route` | Assign an explicitly approved route | Yes, approval required |
| `update_report_status` | Record a field workflow update | Yes |

Resident-authored text is marked as untrusted content in the tool annotations. The two highest-impact actions require an existing proposal plus a literal human-approval flag, and the server independently enforces that flag.

## Architecture

```text
Resident portal ─┐
Operations UI ───┼─ Next/Vinext routes ─ D1 civic records
Inspector app ───┘          │          └ R2 photo evidence
                            ├ Leaflet + OpenStreetMap raster maps
                            ├ OSRM road directions
WebMCP agent ─ typed tools ─┴ Open-Meteo with MET Norway fallback
```

The three actors receive responsive web surfaces from the same production URL:

- `/resident` — evidence intake and nearby-report confirmation
- `/` — live map, prioritization, agent proposals, and approval controls
- `/inspector` — assigned stops, navigation handoff, notes, and resolution

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The local Cloudflare runtime provisions isolated D1 and R2 bindings. It does not seed incident records. Open `http://localhost:3000` and submit test reports locally when exercising the workflow.

## Verify

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Then exercise the real workflow through the UI or APIs: create a report, confirm it, plan a route, approve assignment, and update it from the inspector portal.

Workflow tests use the isolated local D1/R2 environment, where test reports cannot appear on the public site. Production verification is read-only: route health, empty-state behavior, map and weather integrations, WebMCP discovery, and actor-page rendering. A real production report is created only from an actual resident submission.

## Integration policy

- Leaflet renders OpenStreetMap raster tiles without a vendor API key.
- Project OSRM supplies road-following route geometry; no API key is required.
- Open-Meteo requires no API key.
- MET Norway Locationforecast provides a second keyless weather path when Open-Meteo is rate-limited.
- D1 and R2 are first-party runtime bindings, not developer-machine services.
- The repository contains no credentials. Runtime values are supplied by the hosting environment.
- When maps, routing, or weather are unavailable, the product reports the integration failure; it does not fabricate results.

## Challenge safety boundary

This challenge deployment is a standalone civic workspace, not a municipal system of record. Its public database contains only reports submitted through FixMyCity; fabricated incidents are never inserted for presentation. The field surface uses a neutral team identity until municipality-managed role assignments are connected to the included sign-in scaffold.

## License

Apache-2.0. See [LICENSE](LICENSE).
