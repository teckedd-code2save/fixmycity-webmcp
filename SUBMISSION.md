# Devpost submission draft — review required

This file is the working submission copy. Do not submit it until the project owner completes the final review.

## Project name

FixMyCity

## Elevator pitch

FixMyCity turns scattered citizen reports into coordinated city action, using WebMCP agents to detect duplicates, prioritize incidents, plan routes, and safely execute approved workflows.

## Inspiration

City problems rarely begin as neat work orders. They begin as several residents describing the same flooded junction, a photo with an imprecise address, or a hazard that becomes urgent when rain approaches. The information exists, but it is fragmented across people and systems. FixMyCity explores a more useful civic interface: one where residents, operators, field teams, and AI agents collaborate on the same live workflow.

## What it does

FixMyCity gives each actor a purpose-built surface:

- Residents submit geolocated reports and photo evidence, or corroborate a nearby incident.
- City operators see live incidents on a map, ranked by severity, affected people, corroboration, nearby infrastructure, and weather context.
- A WebMCP-capable agent searches current reports, detects probable duplicates, and prepares priority inspection routes.
- Operators see the agent's evidence and confidence before approving any merge or assignment.
- Field inspectors receive the approved route, open navigation, add an inspection note, and move work through inspecting, resolved, or blocked states.

The complete loop uses persistent D1 records, R2 evidence storage, live weather from Open-Meteo, OpenStreetMap maps, and OSRM road directions. Nothing important is represented only as a front-end animation.

## How we used WebMCP

The operations page registers eight typed tools through `document.modelContext.registerTool`. Read tools expose city health and report search. Planning tools produce reviewable duplicate and route proposals. Action tools create reports, approve merges, assign routes, and record status changes.

The key design choice is separating preparation from execution. An agent can autonomously investigate and propose. High-impact tools require a proposal ID and explicit human approval, which the server validates again. Resident-authored descriptions are also marked as untrusted content so the agent treats them as evidence, never as instructions.

This is not a chatbot placed beside a dashboard. WebMCP makes the working civic product itself legible and operable to an agent.

## How we built it

- React and Vinext for the responsive multi-role web application
- Cloudflare D1 for civic records and audit history
- Cloudflare R2 for uploaded photo evidence
- Leaflet and OpenStreetMap for live incident maps
- Project OSRM for road-following route geometry
- Open-Meteo with MET Norway fallback for current Accra conditions and rain-watch context
- WebMCP imperative API for eight discoverable, typed browser tools
- Sites for a single hosted environment shared by residents, operators, inspectors, and judges

## Challenges

The hardest part was designing agent autonomy without hiding irreversible actions. Duplicate detection and routing are useful only if they can influence real records, but silently merging reports or dispatching a person would be the wrong default. We solved this with a proposal-first data model, explicit approval contracts, server-side confirmation checks, and an audit trail.

We also made integrations honest. Missing map configuration is reported as unavailable instead of replaced with fabricated results, weather is fetched live, uploads reach object storage, and every role reads from the same database.

## Accomplishments

- A complete resident-to-resolution workflow across three actor surfaces
- Eight WebMCP tools detected by the browser with typed schemas and safety annotations
- Evidence-backed duplicate detection using category, distance, time, and landmark context
- Priority route planning with a human approval checkpoint and field-team handoff
- Persistent reports, assignments, proposals, audit updates, and photo evidence
- A reproducible deployment with no local database or storage services for judges to install
- A clean production workspace that never presents fabricated incidents as city activity

## What we learned

WebMCP is most powerful when tools are designed as part of the product workflow, not added as a second API after the interface is finished. Good tool boundaries also improve the human product: the same proposal and approval model that keeps an agent safe makes operator decisions clearer and more auditable.

## What's next

The next production step is municipality-managed role assignment on top of the included ChatGPT sign-in scaffold, followed by service-level routing to real departments, multilingual and voice reporting, offline field capture, and published response-time metrics.

## 90-second demo plan

1. **0:00–0:12 — The problem.** Show three actors and explain that scattered citizen signals rarely become coordinated action.
2. **0:12–0:28 — Resident.** Open `/resident`, pin and submit a blocked-drain report with a photo, then corroborate a nearby signal.
3. **0:28–0:48 — WebMCP discovery.** Show that the browser sees eight tools. Ask the agent to search flooding reports and find likely duplicates.
4. **0:48–1:05 — Human review.** Open the proposal evidence, approve the merge, simulate a priority route, and explicitly approve assignment.
5. **1:05–1:20 — Field action.** Open `/inspector`, select the assigned stop, start inspection, add a note, and resolve it.
6. **1:20–1:30 — Proof.** Return to operations and show the persisted status. Close with: “The agent did not replace the city team; WebMCP connected every actor to the same accountable workflow.”

## Review checklist

- [ ] Public deployment works in a signed-out browser
- [ ] Resident report, photo upload, duplicate proposal, route assignment, and inspector resolution all pass in production
- [ ] All eight WebMCP tools are discoverable on the deployed URL
- [ ] Keyless maps and road-following directions render in production
- [ ] GitHub repository is public and contains no secrets
- [ ] Demo video is uploaded to YouTube and plays without sign-in
- [ ] Screenshots, repository URL, live URL, and video URL are added to Devpost
- [ ] Project owner reviews every Devpost field
- [ ] Project owner explicitly approves final submission
