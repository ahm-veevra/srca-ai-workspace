# Brief for the AICP terminal — add a live SQL "query" mode to the SQL connector

## Goal

Let an AICP **SQL connector** execute a read-only `SELECT` on demand and return the
**structured rows as JSON** — with **no knowledge-base ingestion, no embeddings, no
collection writes**. AICP fully controls what SQL runs; consumers (the SRCA workspace)
call an AICP endpoint and never touch the database directly.

Today the `sql` connector only supports `sync` (rows → `target_collection` for RAG).
Add a parallel **query** capability alongside it. Do **not** change the existing sync
behaviour.

## Where (files already in the repo)

- `app/app/modules/connectors/adapters/sql.py` — `SqlAdapter` (has `_dsn`, `health`, `browse`, `sync`)
- `app/app/modules/connectors/adapters/base.py` — `ConnectorAdapter` Protocol + result dataclasses
- `app/app/modules/connectors/router.py` — endpoints (`/{connector_id}/test`, `/sync`, `/browse`, …)
- `app/app/modules/connectors/service.py` — connector resolution + secret decryption
- `app/app/modules/connectors/schemas.py` — Pydantic in/out models
- `app/app/modules/connectors/catalog.py` — the `sql` `ConnectorKind` (config keys)
- `app/app/tests/test_connectors.py` — tests

## What to implement

### 0. Make knowledge-base ingestion / embeddings / RAG OPTIONAL per connector

Ingestion must be a **choice made when configuring the connector**, not something that
always happens. Add a config flag (default: **off** for new connectors):

```json
{ "ingestion_enabled": false }        // or an enum: "mode": "live" | "ingest" | "both"
```

Behaviour:
- **`ingestion_enabled: false` (live-only)** — the connector supports `POST /query`
  (section 3) and **skips all sync/embedding/collection writes**. `target_collection_key`
  is **not required** in this mode (it's already nullable in `ConnectorCreate`); creation
  and `sync` must not fail or embed when it's absent/off.
- **`ingestion_enabled: true`** — current behaviour: `sync` ingests rows into
  `target_collection_key` for RAG. Live `/query` still works too.

Wire the flag through: `catalog.py` (add `ingestion_enabled` / `mode` to the `sql` config
keys), connector create/update validation (don't require a collection when ingestion is
off), and the `sync` path (early-return / no-op when off). Surface the toggle in the
connector-config UI so the operator picks it at setup time.

### 1. Saved queries on the connector (safest design — no raw SQL over the API)

Extend the `sql` connector **config** with a non-secret `queries` map:

```json
{ "dsn": "...", "queries": { "exec_kpis": "SELECT ... FROM v_exec_kpis ORDER BY sort_order", "risks": "SELECT ..." } }
```

- Add `"queries"` to the `sql` entry's config keys in `catalog.py`.
- Validate on create/update: values must be single statements beginning with `SELECT` or `WITH`.

The caller runs a query **by key**, so the browser/workspace never sends SQL — AICP owns it.

### 2. Adapter method `SqlAdapter.query(...)`

Add alongside `browse`/`sync`, reusing `_dsn()` + `create_async_engine`:

```python
async def query(self, config, secret, *, statement_key=None, sql=None,
                params=None, max_rows=1000):
    dsn = _dsn(config, secret)
    engine = create_async_engine(dsn)
    try:
        text_sql = (config.get("queries", {}) or {}).get(statement_key) if statement_key else sql
        if not text_sql:
            raise ValueError("unknown statement_key")
        # read-only + single-statement + timeout guards (see safety)
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION READ ONLY"))
            result = await conn.execute(text(text_sql), params or {})
            cols = list(result.keys())
            rows = [dict(r._mapping) for r in result.fetchmany(max_rows + 1)]
        truncated = len(rows) > max_rows
        return QueryResult(columns=cols, rows=rows[:max_rows], truncated=truncated)
    finally:
        await engine.dispose()
```

Add a `QueryResult` dataclass to `base.py` and a `query(...)` method to the
`ConnectorAdapter` Protocol (optional; only the sql adapter needs it).

### 3. Endpoint `POST /api/v1/connectors/{connector_id}/query`

In `router.py`, mirror the `/{connector_id}/test` and `/sync` handlers:

- Resolve the connector via the service (tenant-scoped); 404 if missing; 400 if its
  adapter isn't `sql`.
- Require the **read** permission used by the other connector reads (`_READ`).
- Body `ConnectorQueryIn { statement_key?: str, sql?: str, params?: dict, max_rows?: int }`.
  - `statement_key` is the normal path.
  - Accept raw `sql` **only** behind an elevated permission (admin) — otherwise reject.
- Decrypt the secret (same helper `test`/`sync` use), call `adapter.query(...)`.
- Return `ConnectorQueryOut { columns: list[str], rows: list[dict], row_count: int, truncated: bool }`.
- Audit-log the connector id + statement_key (not the row data).

### 4. Schemas (`schemas.py`)

Add `ConnectorQueryIn` and `ConnectorQueryOut`. FastAPI then auto-updates `/openapi.json`.

### 5. Safety (must-haves)

- **Read-only**: `SET TRANSACTION READ ONLY` (and the connector already uses a
  read-only DB role, so it's defence-in-depth).
- **Single statement**: reject text containing `;` before the final char / multiple statements.
- **SELECT/WITH only** for any raw-SQL path.
- **Statement timeout** (e.g. 5s) and **row cap** (`max_rows`, default 1000, hard max e.g. 5000);
  set `truncated=true` when exceeded.
- Never echo the DSN/secret in errors.

### 6. Tests (`test_connectors.py`)

- Create a `sql` connector with a `queries` map against a temp table; assert
  `POST /{id}/query {statement_key}` returns the rows.
- Assert a non-SELECT raw `sql` is rejected; assert `max_rows` truncation; assert
  unknown `statement_key` → 400/404.

## Contract the SRCA workspace will call

```
POST /api/v1/connectors/{connector_id}/query
body: { "statement_key": "exec_kpis" }
→ 200 { "columns": [...], "rows": [ {...}, ... ], "row_count": N, "truncated": false }
```

The workspace fetches each command-center surface by `statement_key` through this
endpoint (via its existing `/api/*` proxy) and maps rows to the component shapes,
falling back to local mock data on any error. **No direct DB access from the workspace.**

## Appendix — saved queries to configure on the connector (one per surface)

Point the connector at db `srca_datalake` (host `postgres`, user `srca_reader`) with
this `queries` map:

| key | SQL |
|-----|-----|
| `exec_kpis` | `SELECT key,label,value,format,delta,good_when_up,status,spark FROM v_exec_kpis ORDER BY sort_order` |
| `exec_summary` | `SELECT headline,bullets,confidence,sources,horizon FROM exec_summary WHERE id=1` |
| `map_regions` | `SELECT key,name,name_ar,x,y,calls,active_incidents,avg_response,status FROM v_map_regions` |
| `map_stations` | `SELECT map_x AS x, map_y AS y, name AS label FROM stations` |
| `map_hospitals` | `SELECT map_x AS x, map_y AS y, name AS label FROM hospitals` |
| `map_incidents` | `SELECT map_x AS x, map_y AS y, (type||' — '||split_part(location,',',1)) AS label, lower(priority) AS priority FROM incidents WHERE map_x IS NOT NULL` |
| `incident_feed` | `SELECT id, to_char(occurred_at,'HH24:MI') AS time, type, location, priority, ambulance_code AS ambulance, eta, status FROM incidents ORDER BY occurred_at DESC` |
| `risks` | `SELECT label,score,level FROM risks ORDER BY sort_order` |
| `call_forecast` | `SELECT label,value,confidence FROM forecasts WHERE kind='calls' ORDER BY sort_order` |
| `response_prediction` | `SELECT hour_label,predicted_min,headline,explanation,confidence FROM response_prediction ORDER BY sort_order` |
| `hotspots` | `SELECT area,level,factors FROM hotspots ORDER BY sort_order` |
| `ambulance_demand` | `SELECT current,predicted_peak,weekend,holiday FROM ambulance_demand WHERE id=1` |
| `hospital_capacity` | `SELECT name,occupancy,predicted FROM hospital_capacity ORDER BY sort_order` |
| `fleet_maintenance` | `SELECT unit,issue,due_hours,probability FROM fleet_maintenance ORDER BY sort_order` |
| `crew_fatigue` | `SELECT shortage_risk,overtime_risk,fatigue_index,recommendation FROM crew_fatigue WHERE id=1` |
| `recommendations` | `SELECT id,title,reason,benefit,confidence,impact,priority FROM recommendations ORDER BY sort_order` |
| `emergency_type_mix` | `SELECT type AS label, count AS value, color_var FROM emergency_type_mix ORDER BY sort_order` |
| `response_trend` | `SELECT avg_response FROM response_trend ORDER BY bucket` |
| `calls_by_hour` | `SELECT calls FROM calls_hourly ORDER BY hour` |
| `calls_by_region` | `SELECT label,value FROM v_calls_by_region` |
| `incidents_by_category` | `SELECT category AS label, count AS value, color_var FROM incidents_by_category ORDER BY sort_order` |
| `ops_metrics` | `SELECT label,value,unit FROM ops_metrics ORDER BY sort_order` |
| `readiness` | `SELECT label,score FROM readiness ORDER BY sort_order` |
| `sim_baseline` | `SELECT response,coverage,hospital_load,fleet_util,lives,sla,cost FROM sim_baseline WHERE id=1` |
| `sim_scenarios` | `SELECT key,label,response_delta,coverage_delta,hospital_load_delta,fleet_util_delta,lives_delta,sla_delta,cost_delta FROM sim_scenarios ORDER BY sort_order` |
