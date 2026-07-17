# Brief for the AICP terminal — build the "Ask-Your-Data" agent (SRCA)

**Goal:** stand up an AICP **agent** that answers natural-language questions about SRCA 997
operations by **querying the `srca_datalake` connector live** (via a tool) and reasoning over the
rows — instead of a single-shot capability that can't see the data.

The SRCA workspace is already wired to call it: set the resulting agent id/key in
`/settings/aicp → "Ask-Your-Data Agent"`. Until it's set, the workspace falls back to the Copilot
capability (works, but can't query live data). No workspace change is needed on your side.

**Tenant:** Saudi Red Crescent Authority (`edbead82-7fb7-4d43-8bd2-7bc07e20c761`).

---

## What the workspace sends / expects

- Call: `POST /api/v1/agents/{agent_id}/run` with body `{ "input": "<user question>" }`
  (the workspace may append `"\n\nRespond in Arabic."` when the UI locale is Arabic — the agent
  should honour it).
- Response the workspace reads: `status` must be a success value (`completed`/`succeeded`/`ok`/
  `done`), and the final answer in `output` — either a **string**, or an object with one of
  `text` / `answer` / `message` / `content` / `result`. Anything else is treated as "no answer".
- Runs under the **user session** (agents are user-entitled — the app token is 403 on capabilities/
  agents), so per-user audit/clearance applies.

## Step 1 — the data tool (already exists ✅)

A connector tool for the data lake is already registered:

```
key:    connector-srca-datalake-connector
type:   connector
config: { "connector_key": "srca-datalake-connector" }   # → connector id e9f0d012-1429-4e49-9c65-c88531404039
```

Attach that tool to the agent (`tool_keys: ["connector-srca-datalake-connector"]`). Confirm the
tool lets the agent run the connector's **saved read-only statements** (and/or parameterised
read-only SELECTs). The available statements/views in `srca_datalake` (see
`db/srca-datalake/01_schema.sql` + `AICP-live-query-brief.md`) include, by `statement_key`:
`exec_kpis`, `risks`, `hotspots`, `calls_by_region`, `calls_by_hour`, `ops_metrics`, `incidents`,
`emergency_types`, `hospital_capacity`, `fleet_maintenance`, `readiness`, and more (25 total).

If a raw-SQL tool is preferred over saved statements, create one:
```
POST /api/v1/agents/tools
{ "key": "srca-datalake-sql", "name": "SRCA Data Lake (SQL)", "type": "sql",
  "description": "Run a read-only SELECT against the srca_datalake connector and return rows.",
  "config": { "connector_key": "srca-datalake-connector", "read_only": true, "max_rows": 200 },
  "input_schema": { "type": "object", "properties": { "sql": { "type": "string" } }, "required": ["sql"] },
  "requires_approval": false }
```

## Step 2 — create the agent

```
POST /api/v1/agents
{
  "key": "srca-askdata-agent",
  "name": "SRCA Ask-Your-Data",
  "description": "Answers NL questions about SRCA 997 operations by querying the srca_datalake connector.",
  "category": "analytics",
  "model_key": "Qwen3.6-27B",              // active SRCA chat model; or leave null to use routing
  "memory_enabled": false,
  "max_steps": 6,
  "tool_keys": ["connector-srca-datalake-connector"],
  "system_prompt": "You are an operations data analyst for the Saudi Red Crescent Authority (997 EMS). Answer the user's question using ONLY the srca_datalake connector tool — never invent numbers. Decide which saved query / view to read (e.g. exec_kpis, risks, calls_by_region, ops_metrics, hospital_capacity, fleet_maintenance, readiness), call the tool, then answer concisely in the user's language with the concrete figures and a one-line 'so what'. If the data can't answer it, say so plainly. Format the answer in short Markdown (bold labels, bullet lists) — put each list item on its own line."
}
```

Notes:
- `max_steps` ≥ 4 so it can: pick a query → call the tool → (optionally a second query) → answer.
- The system prompt lives entirely on the AICP side (the workspace sends only the question).
- Ask it to return **Markdown** with real newlines between list items (the workspace renders
  Markdown; run-together lists are the usual "no newlines" symptom).

## Step 3 — governance (so it isn't held)

- The SRCA governance profiles/frameworks are now bound to `ems-ai-risk-model-v2` /
  `government-services-risk-model-v2` (no human-review at `high`), and the "Confidential Marking
  Detection" guardrail is set to `flag`. Make sure the agent + its tool calls resolve under those
  (limited risk, not held). If tool calls are separately governed, ensure the connector-read tool
  is `require_approval: false` for this agent.

## Step 4 — publish & hand off

1. Publish/activate the agent (status `active`).
2. Send the **agent id (or key)** back. It gets pasted into the workspace at
   `/settings/aicp → "Ask-Your-Data Agent"` — the workspace then calls `/agents/{id}/run` instead
   of the fallback capability.

## Acceptance criteria

- `POST /agents/{id}/run {"input":"Which region had the most calls today?"}` returns `status:
  completed` and an `output` answer citing real `calls_by_region` numbers, with at least one tool
  call to the connector visible in `steps`/trace.
- An Arabic question (or one with the "Respond in Arabic." directive) is answered in Arabic.
- The run is not held for human review for a normal (non-confidential) analytics question.

## Follow-on (optional, same pattern)
Once this works, the **Command-Center Copilot** is the next agent candidate — same connector tool
plus a knowledge (RAG) tool and, later, a governed "recommend action" tool.
