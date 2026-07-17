# SRCA 997 Data Lake → AICP integration

Goal: replace the command center's mock data (`lib/command-center-data.ts`) with
**real data served through AICP**, end-to-end, for every surface.

Pipeline: **SQL data lake → AICP SQL connector → AICP AI Capabilities → SRCA frontend**

---

## Stage 1 — SQL database ✅ DONE

A dedicated Postgres database `srca_datalake` on the existing `veevra-postgres-1`
container, seeded with a believable 997 operational snapshot. KPIs, sparklines and
day-over-day deltas are **computed by SQL views** from 7 days of history — not
hard-coded.

Load / reload:

```bash
docker exec -i veevra-postgres-1 psql -U veevra -d srca_datalake -q < 01_schema.sql
docker exec -i veevra-postgres-1 psql -U veevra -d srca_datalake -q < 02_seed.sql
```

Key objects (each maps to a command-center surface):

| Object                      | Surface                          |
|-----------------------------|----------------------------------|
| `v_exec_kpis` (view)        | Executive KPI row                |
| `exec_summary`              | AI executive summary             |
| `v_map_regions` (view)      | Interactive Saudi map            |
| `incidents`                 | Live incident feed               |
| `risks`                     | Risk intelligence                |
| `forecasts`, `response_prediction`, `hotspots`, `hospital_capacity`, `fleet_maintenance`, `crew_fatigue`, `ambulance_demand` | Predictive analytics |
| `recommendations`           | AI recommendations               |
| `emergency_type_mix`, `incidents_by_category`, `calls_hourly`, `region_daily`, `response_trend`, `ops_metrics`, `v_calls_by_region` | Operational analytics |
| `readiness`                 | Readiness scorecard              |
| `sim_baseline`, `sim_scenarios` | What-if simulator            |

> The AI Copilot and Knowledge Assistant are RAG/agent surfaces (per the
> `ARCHITECTURE` table in the mock), powered by AICP knowledge base + agent — not
> this SQL connector.

---

## Stage 2 — AICP SQL connector ⏳ NEXT (needs AICP console/auth)

Add a Postgres connector in the AICP **configuration** pointing at the data lake.
Connection details (AICP runs in Docker, so use the in-network host):

| Field     | Value                                   |
|-----------|-----------------------------------------|
| Host      | `postgres`  (Docker network alias; `localhost:5432` from the host) |
| Port      | `5432`                                   |
| Database  | `srca_datalake`                          |
| Username  | `srca_reader`  (read-only role)          |
| Password  | `srca_reader_2026`                       |
| SSL       | disable (internal network)               |

The `srca_reader` role has `SELECT`-only on all tables/views; writes are denied.

Endpoints involved: `POST /api/v1/connectors` (create), `/connectors/probe`
(test), `/connectors/browse` (list tables), `/connectors/{id}/test`.

---

## Stage 3 — AI Capabilities ⏳ (needs AICP console/auth)

One AI Capability per surface, each running a SELECT against the connector and
returning the exact JSON shape the component expects (see `lib/command-center-data.ts`
interfaces). e.g. capability `srca-exec-kpis` → `SELECT * FROM v_exec_kpis`.

---

## Stage 4 — Frontend wiring ⏳

Add a server-side adapter `lib/command-center-source.ts`: each surface calls its
AICP capability via the existing `serverApi()` proxy and **falls back to the mock**
in `command-center-data.ts` on any error, so the UI never breaks during migration.
Migrate the command-center components to read from the adapter one surface at a time.

---

## Environment facts

- Postgres container: `veevra-postgres-1` (pgvector/pg16), host port `5432`.
- Superuser: `veevra` / db `veevra`. Data lake db: `srca_datalake`.
- AICP backend: `veevra-api-1` at `localhost:8000`, API base `/api/v1`.
- AICP console: `localhost:3000`. SRCA workspace: `localhost:3010`.
