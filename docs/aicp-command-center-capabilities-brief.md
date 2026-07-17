# Brief for the AICP terminal — build the command center's AI Capabilities

## Context / rule
The SRCA workspace must contain **no AI logic** — no prompts, no model choice, no grounding. Every
AI surface in the command center now calls an **AICP AI Capability** by id
(`POST /api/v1/ai-capabilities/{id}/run`) and only renders the result. All prompt/model/grounding
lives in the capability. The workspace passes a short trigger `input` and (for the structured
widgets) parses the capability's JSON output.

Data widgets (KPIs, incidents, risks, map, analytics) already work this way via the SQL connector
(`/connectors/{id}/query` + saved queries) — no changes needed there.

## What to build / wire (5 capabilities)

Each capability must **ground on the SRCA 997 data** itself (via the `srca-datalake-connector` /
its `srca-datalake-kb` collection, or a live query tool) so the workspace passes **no data** — only
a trigger. Configure the resulting capability ids in the workspace at `/settings/aicp`.

Run contract (all): `POST /api/v1/ai-capabilities/{id}/run` with body `{ "input": "<trigger>" }`
→ `{ "output": "<string>", "meta": {...} }`. Put the model in `meta.model` (or `selected_model_key`)
so the workspace lineage can show it. For the knowledge capability, put citations in
`meta.citations` (array of `{title, source}` or strings).

### 1. Executive Briefing  →  **structured JSON output**
- Purpose: the "Daily Operations Briefing" widget.
- Grounding: current KPIs, risks, regional load, forecast from the 997 data.
- `output` MUST be a JSON string: `{"headline": "...", "bullets": ["...", "..."]}` (4-5 one-sentence
  bullets, `**bold**` allowed for figures). No prose outside the JSON.
- Existing candidate to adapt: `command-briefing` ("Emergency Command Briefing Assistant") — but it
  must be set to emit the JSON above.

### 2. Forecast  →  **structured JSON output**
- Purpose: the call-demand forecast widget.
- `output` JSON: `{"forecast":[{"label":"Next Hour","value":"+9%","confidence":92}, ...]}` with the
  four labels "Next Hour","Today","Tomorrow","Next Week".

### 3. Recommendations  →  **structured JSON output**
- Purpose: the AI recommendations cards.
- `output` JSON: `{"recommendations":[{"id":"R1","title":"...","reason":"...","benefit":"...","confidence":94,"impact":"High","priority":"Critical"}, ...]}`
  (4-6 items; impact ∈ High/Medium/Low; priority ∈ Critical/High/Medium).

### 4. Copilot  →  **text output**
- Purpose: the AI Copilot chat. `input` = the user's question. Grounded on the 997 operational data.
- `output` = a plain-text answer. Existing candidate: a conversational capability grounded on the
  data lake / knowledge.

### 6. What-If Simulator  →  **structured JSON output** (optional)
- Purpose: estimate the projected operational impact of the scenarios the user selected.
- `input` = the selected scenario labels (e.g. "Add 5 ambulances; Simulate heavy rain").
- Grounding: the current baseline (response time, coverage, hospital load, fleet util, lives/day,
  SLA, cost) from the 997 data.
- `output` JSON: `{"projected":{"response":9.5,"coverage":96,"hospitalLoad":76,"fleetUtil":65,"lives":52,"sla":96.6,"cost":42000}}`
  — the projected values for each metric after applying the scenarios.
- If not built/configured, the workspace falls back to a deterministic delta calculation from the
  data-lake scenario table, so this one is optional.

### 5. Knowledge Assistant  →  **text output + citations**
- Purpose: the Knowledge Assistant. `input` = a first-aid/protocol question.
- `output` = grounded answer; `meta.citations` = the cited documents.
- Existing candidate: `knowledge-assistant` ("Secure Knowledge Search") or `guideline-qa`
  ("EMS Guideline Assistant"), grounded on `first-aid-training` / `ems-protocols`.

## Governance
These run through the risk-model governance (already fixed so normal INTERNAL requests classify as
`limited` and aren't held). Keep them non-blocking for routine operational briefings.

## Handoff back to the workspace
Give me (or set in `/settings/aicp`) the 5 capability ids:
`briefing`, `forecast`, `recommendations`, `copilot`, `knowledge`. The moment they're configured,
each widget lights up — no workspace code change. Until then those surfaces show "awaiting" empty
states (data widgets keep working via the connector).

## Acceptance
For each: `POST /ai-capabilities/{id}/run {"input":"..."}` returns the specified `output`
(valid JSON for 1-3; text for 4-5), `meta.model` populated, within governance (not held).
