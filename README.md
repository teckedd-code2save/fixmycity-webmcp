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
                            ├ Mapbox maps + directions
WebMCP agent ─ typed tools ─┴ Open-Meteo live conditions
```

The three actors receive responsive web surfaces from the same production URL:

- `/resident` — evidence intake and nearby-report confirmation
- `/` — live map, prioritization, agent proposals, and approval controls
- `/inspector` — assigned stops, navigation handoff, notes, and resolution

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
# Add a public Mapbox token to .env.local
npm run dev
```

The local Cloudflare runtime provisions D1 and R2 bindings and seeds a compact Accra demonstration dataset on first request. Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run build
npm audit --omit=dev
```

Then exercise the real workflow through the UI or APIs: create a report, confirm it, plan a route, approve assignment, and update it from the inspector portal.

## Integration policy

- Mapbox uses a public, read-only browser token. No secret scopes are required.
- Open-Meteo requires no API key.
- D1 and R2 are first-party runtime bindings, not developer-machine services.
- The repository contains no credentials. Runtime values are supplied by the hosting environment.
- When Mapbox or weather is unavailable, the product shows the integration as unavailable; it does not fabricate results.

## Challenge safety boundary

This build is an isolated challenge workspace with seeded civic records and named demonstration actors. It is not connected to a municipal system of record. Production adoption would connect the existing ChatGPT sign-in scaffold to municipality-managed role assignments before allowing operator or inspector writes.

## License

Apache-2.0. See [LICENSE](LICENSE).
