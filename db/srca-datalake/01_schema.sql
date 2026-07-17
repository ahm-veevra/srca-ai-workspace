-- ============================================================================
-- SRCA 997 Operations — Data Lake (schema)
-- ----------------------------------------------------------------------------
-- Target: a dedicated Postgres database `srca_datalake` that AICP connects to
-- via a SQL connector. This models the First Aid / 997 operational data lake:
--   * dimension tables  (regions, stations, hospitals, ambulances)
--   * fact/aggregate tables that an ETL would populate daily
--   * analytical-output tables (forecasts, risks, recommendations, …)
--   * views that COMPUTE the executive KPIs from history (so nothing is a
--     hard-coded number — the command center reads real query results)
--
-- Shapes mirror lib/command-center-data.ts so each AICP capability can return
-- exactly what a command-center surface expects.
-- ============================================================================

-- Idempotent: drop and recreate the public objects we own.
DROP VIEW  IF EXISTS v_exec_kpis            CASCADE;
DROP VIEW  IF EXISTS v_calls_by_region      CASCADE;
DROP VIEW  IF EXISTS v_map_regions          CASCADE;

DROP TABLE IF EXISTS kpi_daily              CASCADE;
DROP TABLE IF EXISTS calls_hourly           CASCADE;
DROP TABLE IF EXISTS emergency_type_mix     CASCADE;
DROP TABLE IF EXISTS incidents_by_category  CASCADE;
DROP TABLE IF EXISTS response_trend         CASCADE;
DROP TABLE IF EXISTS ops_metrics            CASCADE;
DROP TABLE IF EXISTS incidents              CASCADE;
DROP TABLE IF EXISTS map_incidents          CASCADE;
DROP TABLE IF EXISTS forecasts              CASCADE;
DROP TABLE IF EXISTS response_prediction    CASCADE;
DROP TABLE IF EXISTS hotspots               CASCADE;
DROP TABLE IF EXISTS hospital_capacity      CASCADE;
DROP TABLE IF EXISTS fleet_maintenance      CASCADE;
DROP TABLE IF EXISTS crew_fatigue           CASCADE;
DROP TABLE IF EXISTS ambulance_demand       CASCADE;
DROP TABLE IF EXISTS risks                  CASCADE;
DROP TABLE IF EXISTS recommendations        CASCADE;
DROP TABLE IF EXISTS readiness              CASCADE;
DROP TABLE IF EXISTS sim_scenarios          CASCADE;
DROP TABLE IF EXISTS sim_baseline           CASCADE;
DROP TABLE IF EXISTS exec_summary           CASCADE;
DROP TABLE IF EXISTS ambulances             CASCADE;
DROP TABLE IF EXISTS hospitals              CASCADE;
DROP TABLE IF EXISTS stations               CASCADE;
DROP TABLE IF EXISTS regions                CASCADE;

DROP TYPE  IF EXISTS ops_status             CASCADE;

CREATE TYPE ops_status AS ENUM ('good', 'warn', 'critical');

-- ── Dimensions ──────────────────────────────────────────────────────────────
CREATE TABLE regions (
  key              text PRIMARY KEY,
  name             text NOT NULL,
  name_ar          text NOT NULL,
  map_x            numeric(5,2) NOT NULL,   -- 0–100 over the map viewBox
  map_y            numeric(5,2) NOT NULL
);

CREATE TABLE stations (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  region_key       text REFERENCES regions(key),
  map_x            numeric(5,2) NOT NULL,
  map_y            numeric(5,2) NOT NULL
);

CREATE TABLE hospitals (
  id               serial PRIMARY KEY,
  name             text NOT NULL,
  region_key       text REFERENCES regions(key),
  map_x            numeric(5,2) NOT NULL,
  map_y            numeric(5,2) NOT NULL
);

CREATE TABLE ambulances (
  id               serial PRIMARY KEY,
  code             text UNIQUE NOT NULL,     -- e.g. "Ambulance 142"
  station_id       int REFERENCES stations(id),
  status           text NOT NULL             -- in_service | available | maintenance | en_route
);

-- ── KPI history (sparkline + delta are derived from this) ────────────────────
-- One row per KPI per day; the last 7 days give the sparkline, the last two
-- give the day-over-day delta.
CREATE TABLE kpi_daily (
  day              date NOT NULL,
  kpi_key          text NOT NULL,
  label            text NOT NULL,
  value            numeric(10,2) NOT NULL,
  format           text NOT NULL,            -- int | min | pct | score
  good_when_up     boolean NOT NULL,
  status           ops_status NOT NULL,
  sort_order       int NOT NULL,
  PRIMARY KEY (day, kpi_key)
);

-- ── Aggregate fact tables (daily ETL rollups) ───────────────────────────────
CREATE TABLE calls_hourly (
  day              date NOT NULL,
  hour             int  NOT NULL,            -- 0–23
  calls            int  NOT NULL,
  PRIMARY KEY (day, hour)
);

CREATE TABLE emergency_type_mix (
  day              date NOT NULL,
  type             text NOT NULL,
  count            int  NOT NULL,
  color_var        text NOT NULL,
  sort_order       int  NOT NULL,
  PRIMARY KEY (day, type)
);

CREATE TABLE incidents_by_category (
  day              date NOT NULL,
  category         text NOT NULL,            -- Critical | Urgent | Standard | Non-urgent
  count            int  NOT NULL,
  color_var        text NOT NULL,
  sort_order       int  NOT NULL,
  PRIMARY KEY (day, category)
);

-- Regional daily rollup used by the map + calls-by-region analytics.
CREATE TABLE region_daily (
  day              date NOT NULL,
  region_key       text NOT NULL REFERENCES regions(key),
  calls            int  NOT NULL,
  active_incidents int  NOT NULL,
  avg_response     numeric(4,1) NOT NULL,
  status           ops_status NOT NULL,
  PRIMARY KEY (day, region_key)
);

CREATE TABLE response_trend (
  day              date NOT NULL,
  bucket           int  NOT NULL,            -- 0..n interval index
  avg_response     numeric(4,1) NOT NULL,
  PRIMARY KEY (day, bucket)
);

CREATE TABLE ops_metrics (
  metric_key       text PRIMARY KEY,
  label            text NOT NULL,
  value            numeric(10,2) NOT NULL,
  unit             text,
  sort_order       int NOT NULL
);

-- ── Live operational feed ───────────────────────────────────────────────────
CREATE TABLE incidents (
  id               text PRIMARY KEY,         -- e.g. "I-4471"
  occurred_at      timestamptz NOT NULL,
  type             text NOT NULL,
  location         text NOT NULL,
  region_key       text REFERENCES regions(key),
  priority         text NOT NULL,            -- High | Medium | Low
  ambulance_code   text,
  eta              text,
  status           text NOT NULL,            -- En Route | On Scene | Transporting | Dispatched | Resolved
  map_x            numeric(5,2),
  map_y            numeric(5,2)
);

-- ── Predictive / analytical outputs ─────────────────────────────────────────
CREATE TABLE forecasts (
  kind             text NOT NULL,            -- "calls"
  label            text NOT NULL,            -- Next Hour | Today | Tomorrow | Next Week
  value            text NOT NULL,
  confidence       int  NOT NULL,
  sort_order       int  NOT NULL,
  PRIMARY KEY (kind, label)
);

CREATE TABLE response_prediction (
  hour_label       text NOT NULL,            -- "15:00" …
  predicted_min    numeric(4,1) NOT NULL,
  sort_order       int NOT NULL,
  headline         text,
  explanation      text,
  confidence       int,
  PRIMARY KEY (hour_label)
);

CREATE TABLE hotspots (
  area             text PRIMARY KEY,
  level            ops_status NOT NULL,
  factors          text[] NOT NULL,
  sort_order       int NOT NULL
);

CREATE TABLE hospital_capacity (
  name             text PRIMARY KEY,
  occupancy        int NOT NULL,
  predicted        int NOT NULL,
  sort_order       int NOT NULL
);

CREATE TABLE fleet_maintenance (
  unit             text PRIMARY KEY,
  issue            text NOT NULL,
  due_hours        int NOT NULL,
  probability      numeric(3,2) NOT NULL,
  sort_order       int NOT NULL
);

CREATE TABLE crew_fatigue (
  id               int PRIMARY KEY DEFAULT 1,
  shortage_risk    text NOT NULL,
  overtime_risk    int NOT NULL,
  fatigue_index    int NOT NULL,
  recommendation   text NOT NULL
);

CREATE TABLE ambulance_demand (
  id               int PRIMARY KEY DEFAULT 1,
  current          int NOT NULL,
  predicted_peak   int NOT NULL,
  weekend          int NOT NULL,
  holiday          int NOT NULL
);

CREATE TABLE risks (
  label            text PRIMARY KEY,
  score            int NOT NULL,
  level            ops_status NOT NULL,
  sort_order       int NOT NULL
);

CREATE TABLE recommendations (
  id               text PRIMARY KEY,         -- R1 …
  title            text NOT NULL,
  reason           text NOT NULL,
  benefit          text NOT NULL,
  confidence       int NOT NULL,
  impact           text NOT NULL,            -- High | Medium | Low
  priority         text NOT NULL,            -- Critical | High | Medium
  sort_order       int NOT NULL
);

CREATE TABLE readiness (
  label            text PRIMARY KEY,
  score            int NOT NULL,
  sort_order       int NOT NULL
);

-- ── What-if simulator ───────────────────────────────────────────────────────
CREATE TABLE sim_baseline (
  id               int PRIMARY KEY DEFAULT 1,
  response         numeric(4,1) NOT NULL,
  coverage         int NOT NULL,
  hospital_load    int NOT NULL,
  fleet_util       int NOT NULL,
  lives            int NOT NULL,
  sla              numeric(4,1) NOT NULL,
  cost             int NOT NULL
);

CREATE TABLE sim_scenarios (
  key                text PRIMARY KEY,
  label              text NOT NULL,
  response_delta     numeric(4,1) NOT NULL,
  coverage_delta     int NOT NULL,
  hospital_load_delta int NOT NULL,
  fleet_util_delta   int NOT NULL,
  lives_delta        int NOT NULL,
  sla_delta          numeric(4,1) NOT NULL,
  cost_delta         int NOT NULL,
  sort_order         int NOT NULL
);

-- ── AI executive summary (narrative + provenance) ───────────────────────────
CREATE TABLE exec_summary (
  id               int PRIMARY KEY DEFAULT 1,
  headline         text NOT NULL,
  bullets          text[] NOT NULL,
  confidence       int NOT NULL,
  sources          text[] NOT NULL,
  horizon          text NOT NULL
);

-- ============================================================================
-- Views — the executive KPIs, computed from kpi_daily history.
-- ============================================================================
CREATE VIEW v_exec_kpis AS
WITH ranked AS (
  SELECT
    kpi_key, label, format, good_when_up, status, sort_order, day, value,
    row_number() OVER (PARTITION BY kpi_key ORDER BY day DESC) AS rn_desc
  FROM kpi_daily
),
latest AS (
  SELECT * FROM ranked WHERE rn_desc = 1
),
prev AS (
  SELECT * FROM ranked WHERE rn_desc = 2
),
spark AS (
  -- last 7 days as an ordered array (oldest → newest)
  SELECT kpi_key, array_agg(value ORDER BY day) AS spark
  FROM (
    SELECT kpi_key, day, value,
           row_number() OVER (PARTITION BY kpi_key ORDER BY day DESC) AS rn
    FROM kpi_daily
  ) s
  WHERE rn <= 7
  GROUP BY kpi_key
)
SELECT
  l.kpi_key                                            AS key,
  l.label,
  l.value,
  l.format,
  CASE WHEN p.value IS NULL OR p.value = 0 THEN 0
       ELSE round(((l.value - p.value) / p.value) * 100)::int
  END                                                  AS delta,
  l.good_when_up,
  l.status,
  sp.spark,
  l.sort_order
FROM latest l
LEFT JOIN prev  p  USING (kpi_key)
LEFT JOIN spark sp USING (kpi_key)
ORDER BY l.sort_order;

-- Regions enriched for the map (today's rollup).
CREATE VIEW v_map_regions AS
SELECT r.key, r.name, r.name_ar, r.map_x AS x, r.map_y AS y,
       d.calls, d.active_incidents, d.avg_response, d.status
FROM regions r
JOIN region_daily d ON d.region_key = r.key
WHERE d.day = (SELECT max(day) FROM region_daily)
ORDER BY d.calls DESC;

-- Calls-by-region (analytics bar) for the latest day.
CREATE VIEW v_calls_by_region AS
SELECT r.name AS label, d.calls AS value
FROM region_daily d
JOIN regions r ON r.key = d.region_key
WHERE d.day = (SELECT max(day) FROM region_daily)
ORDER BY d.calls DESC;
