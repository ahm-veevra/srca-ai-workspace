-- ============================================================================
-- SRCA 997 Data Lake — seed data (believable operational snapshot)
-- Values mirror lib/command-center-data.ts. Days are anchored to CURRENT_DATE
-- so the "today" surfaces stay current. Safe to re-run (truncates first).
-- ============================================================================

TRUNCATE regions, stations, hospitals, ambulances, kpi_daily, calls_hourly,
  emergency_type_mix, incidents_by_category, region_daily, response_trend,
  ops_metrics, incidents, forecasts, response_prediction, hotspots,
  hospital_capacity, fleet_maintenance, crew_fatigue, ambulance_demand, risks,
  recommendations, readiness, sim_baseline, sim_scenarios, exec_summary
  RESTART IDENTITY CASCADE;

-- ── Regions ─────────────────────────────────────────────────────────────────
INSERT INTO regions (key, name, name_ar, map_x, map_y) VALUES
  ('riyadh',  'Riyadh',           'الرياض',        55, 46),
  ('makkah',  'Makkah',           'مكة المكرمة',   28, 52),
  ('jeddah',  'Jeddah',           'جدة',           22, 55),
  ('eastern', 'Eastern Province', 'الشرقية',       72, 44),
  ('madinah', 'Madinah',          'المدينة',       30, 38),
  ('asir',    'Asir',             'عسير',          34, 74);

-- ── Stations ────────────────────────────────────────────────────────────────
INSERT INTO stations (name, region_key, map_x, map_y) VALUES
  ('Riyadh Central Station', 'riyadh',  53, 44),
  ('Riyadh East Station',    'riyadh',  58, 48),
  ('Makkah Station 3',       'makkah',  26, 53),
  ('Dammam Station',         'eastern', 70, 43),
  ('Madinah Station',        'madinah', 31, 39);

-- ── Hospitals ───────────────────────────────────────────────────────────────
INSERT INTO hospitals (name, region_key, map_x, map_y) VALUES
  ('King Fahad Medical City',   'riyadh',  56, 45),
  ('Jeddah General',            'jeddah',  24, 54),
  ('Eastern Regional Hospital', 'eastern', 71, 45),
  ('Ascentral Hospital',        'asir',    33, 74),
  ('Riyadh Care Hospital',      'riyadh',  57, 46);

-- ── Ambulances (fleet status → feeds "in service" / "available" KPIs) ────────
-- Representative named units used elsewhere; status mix is illustrative.
INSERT INTO ambulances (code, station_id, status) VALUES
  ('Ambulance 142', 1, 'en_route'),
  ('Ambulance 118', 1, 'en_route'),
  ('Ambulance 307', 3, 'en_route'),
  ('Ambulance 221', 5, 'in_service'),
  ('Ambulance 402', 4, 'en_route'),
  ('Ambulance 512', 4, 'available'),
  ('Ambulance 214', 2, 'available'),
  ('Ambulance 117', 1, 'maintenance'),
  ('Ambulance 244', 2, 'maintenance'),
  ('Ambulance 391', 3, 'maintenance');

-- ── Executive KPIs — 7 days of history from the sparkline arrays ─────────────
-- (key, label, format, good_when_up, status, sort, spark[oldest→newest])
INSERT INTO kpi_daily (day, kpi_key, label, value, format, good_when_up, status, sort_order)
SELECT
  CURRENT_DATE - (7 - g.idx),          -- idx 1..7  → 6 days ago … today
  k.kpi_key, k.label, k.spark[g.idx], k.format, k.good_when_up, k.status, k.sort_order
FROM (
  VALUES
    ('calls',     'Emergency Calls Today',   'int',   true,  'warn'::ops_status,     1, ARRAY[980,1020,1100,1075,1160,1210,1284]::numeric[]),
    ('active',    'Active Incidents',        'int',   false, 'warn'::ops_status,     2, ARRAY[22,26,24,29,31,34,37]::numeric[]),
    ('inservice', 'Ambulances In Service',   'int',   true,  'good'::ops_status,     3, ARRAY[470,472,480,478,483,484,486]::numeric[]),
    ('available', 'Available Ambulances',    'int',   true,  'warn'::ops_status,     4, ARRAY[240,232,228,225,220,218,214]::numeric[]),
    ('response',  'Avg Response Time',       'min',   false, 'good'::ops_status,     5, ARRAY[9.6,9.3,9.0,8.9,8.7,8.5,8.4]::numeric[]),
    ('sla',       'SLA Compliance',          'pct',   true,  'good'::ops_status,     6, ARRAY[91,92,92.5,93,93.4,93.9,94.2]::numeric[]),
    ('patients',  'Patients Assisted',       'int',   true,  'good'::ops_status,     7, ARRAY[860,900,940,980,1020,1060,1102]::numeric[]),
    ('transfers', 'Hospital Transfers',      'int',   true,  'good'::ops_status,     8, ARRAY[360,372,388,395,402,410,418]::numeric[]),
    ('critical',  'Critical Cases',          'int',   false, 'critical'::ops_status, 9, ARRAY[42,46,48,52,55,59,63]::numeric[]),
    ('readiness', 'Operational Readiness',   'score', true,  'good'::ops_status,    10, ARRAY[86,87,88,89,90,90,91]::numeric[])
) AS k(kpi_key, label, format, good_when_up, status, sort_order, spark)
CROSS JOIN generate_series(1, 7) AS g(idx);

-- ── Calls by hour (today) ────────────────────────────────────────────────────
INSERT INTO calls_hourly (day, hour, calls)
SELECT CURRENT_DATE, c.ord - 1, c.calls
FROM unnest(ARRAY[18,14,11,9,8,12,21,34,47,52,58,61,66,63,59,55,60,71,78,74,65,51,38,27])
     WITH ORDINALITY AS c(calls, ord);

-- ── Emergency type mix (today) ───────────────────────────────────────────────
INSERT INTO emergency_type_mix (day, type, count, color_var, sort_order) VALUES
  (CURRENT_DATE, 'Road Traffic',    486, '--chart-1',           1),
  (CURRENT_DATE, 'Cardiac',         312, '--chart-4',           2),
  (CURRENT_DATE, 'Trauma & Falls',  224, '--chart-2',           3),
  (CURRENT_DATE, 'Respiratory',     152, '--chart-5',           4),
  (CURRENT_DATE, 'Obstetric',        63, '--chart-3',           5),
  (CURRENT_DATE, 'Other',            47, '--muted-foreground',  6);

-- ── Incidents by category (today) ────────────────────────────────────────────
INSERT INTO incidents_by_category (day, category, count, color_var, sort_order) VALUES
  (CURRENT_DATE, 'Critical',    63, '--danger',  1),
  (CURRENT_DATE, 'Urgent',     214, '--warning', 2),
  (CURRENT_DATE, 'Standard',   712, '--info',    3),
  (CURRENT_DATE, 'Non-urgent', 295, '--success', 4);

-- ── Regional daily rollup (today) ────────────────────────────────────────────
INSERT INTO region_daily (day, region_key, calls, active_incidents, avg_response, status) VALUES
  (CURRENT_DATE, 'riyadh',  412, 14, 8.1, 'warn'),
  (CURRENT_DATE, 'makkah',  356, 11, 8.6, 'warn'),
  (CURRENT_DATE, 'jeddah',  289,  7, 7.9, 'good'),
  (CURRENT_DATE, 'eastern', 241,  5, 8.9, 'good'),
  (CURRENT_DATE, 'madinah', 168,  3, 9.2, 'critical'),
  (CURRENT_DATE, 'asir',    121,  2, 8.4, 'good');

-- ── Response-time trend (today, last 8 intervals) ────────────────────────────
INSERT INTO response_trend (day, bucket, avg_response)
SELECT CURRENT_DATE, t.bucket - 1, t.val
FROM unnest(ARRAY[9.6,9.3,9.1,8.9,8.8,8.6,8.5,8.4]) WITH ORDINALITY AS t(val, bucket);

-- ── Operational metrics ──────────────────────────────────────────────────────
INSERT INTO ops_metrics (metric_key, label, value, unit, sort_order) VALUES
  ('dispatch',   'Avg Dispatch Time',      1.8, 'min', 1),
  ('handover',   'Hospital Handover Time', 17,  'min', 2),
  ('fleet_util', 'Fleet Utilization',      71,  '%',   3),
  ('crew_util',  'Crew Utilization',       78,  '%',   4),
  ('avail',      'Resource Availability',  44,  '%',   5);

-- ── Live incident feed ───────────────────────────────────────────────────────
INSERT INTO incidents (id, occurred_at, type, location, region_key, priority, ambulance_code, eta, status, map_x, map_y) VALUES
  ('I-4471', now() - interval '2 min',  'Traffic Accident',     'King Fahd Road, Riyadh', 'riyadh',  'High',   'Ambulance 142', '4 min',        'En Route',     54, 45),
  ('I-4470', now() - interval '4 min',  'Cardiac Arrest',       'Al Malaz, Riyadh',       'riyadh',  'High',   'Ambulance 118', 'On scene',     'On Scene',     57, 47),
  ('I-4469', now() - interval '7 min',  'Fall Injury',          'Al Aziziyah, Makkah',    'makkah',  'Medium', 'Ambulance 307', '6 min',        'En Route',     27, 51),
  ('I-4468', now() - interval '11 min', 'Respiratory Distress', 'Quba, Madinah',          'madinah', 'Medium', 'Ambulance 221', 'Transporting', 'Transporting', 30, 40),
  ('I-4467', now() - interval '14 min', 'Trauma',               'Corniche, Dammam',       'eastern', 'Medium', 'Ambulance 402', '3 min',        'En Route',     72, 45),
  ('I-4466', now() - interval '18 min', 'Heat Exhaustion',      'Ring Road, Asir',        'asir',    'Low',    'Ambulance 512', 'Resolved',     'Resolved',     34, 73);

-- ── Forecasts (call demand) ──────────────────────────────────────────────────
INSERT INTO forecasts (kind, label, value, confidence, sort_order) VALUES
  ('calls', 'Next Hour', '+9%',    92, 1),
  ('calls', 'Today',     '1,460',  88, 2),
  ('calls', 'Tomorrow',  '1,510',  81, 3),
  ('calls', 'Next Week', '10,240', 74, 4);

-- ── Response-time prediction (next 6 hours) ──────────────────────────────────
INSERT INTO response_prediction (hour_label, predicted_min, sort_order, headline, explanation, confidence) VALUES
  ('15:00', 8.4, 1, '9.3 min expected at 18:00', 'Expected increase due to evening traffic congestion and rising hospital saturation.', 89),
  ('16:00', 8.6, 2, NULL, NULL, NULL),
  ('17:00', 9.0, 3, NULL, NULL, NULL),
  ('18:00', 9.3, 4, NULL, NULL, NULL),
  ('19:00', 9.1, 5, NULL, NULL, NULL),
  ('20:00', 8.8, 6, NULL, NULL, NULL);

-- ── Hotspots ─────────────────────────────────────────────────────────────────
INSERT INTO hotspots (area, level, factors, sort_order) VALUES
  ('Northern Riyadh — Exit 8', 'critical', ARRAY['Traffic','Historical pattern','School dismissal'], 1),
  ('Makkah — Central Ring',    'warn',     ARRAY['Weekend','Public event'],                          2),
  ('Dammam — Corniche',        'warn',     ARRAY['Weather','Historical pattern'],                    3),
  ('Madinah — Quba',           'good',     ARRAY['Prayer times'],                                    4);

-- ── Hospital capacity ────────────────────────────────────────────────────────
INSERT INTO hospital_capacity (name, occupancy, predicted, sort_order) VALUES
  ('King Fahad Medical City', 88, 97, 1),
  ('Riyadh Care Hospital',    74, 83, 2),
  ('Jeddah General',          69, 78, 3),
  ('Eastern Regional',        62, 70, 4);

-- ── Fleet maintenance (predictive) ───────────────────────────────────────────
INSERT INTO fleet_maintenance (unit, issue, due_hours, probability, sort_order) VALUES
  ('Ambulance 117', 'Brake wear',        36, 0.82, 1),
  ('Ambulance 244', 'Battery health',    48, 0.67, 2),
  ('Ambulance 391', 'Engine temperature', 20, 0.74, 3);

-- ── Crew fatigue ─────────────────────────────────────────────────────────────
INSERT INTO crew_fatigue (id, shortage_risk, overtime_risk, fatigue_index, recommendation) VALUES
  (1, 'High', 72, 68, 'Add 2 crews to the Riyadh evening shift; rotate 3 responders nearing 12h duty.');

-- ── Ambulance demand ─────────────────────────────────────────────────────────
INSERT INTO ambulance_demand (id, current, predicted_peak, weekend, holiday) VALUES
  (1, 272, 341, 388, 512);

-- ── Risk intelligence ────────────────────────────────────────────────────────
INSERT INTO risks (label, score, level, sort_order) VALUES
  ('Traffic Risk',           74, 'warn',     1),
  ('Weather Risk',           38, 'good',     2),
  ('Hospital Capacity Risk', 81, 'critical', 3),
  ('Resource Risk',          59, 'warn',     4),
  ('Operational Risk',       46, 'good',     5);

-- ── AI recommendations ───────────────────────────────────────────────────────
INSERT INTO recommendations (id, title, reason, benefit, confidence, impact, priority, sort_order) VALUES
  ('R1', 'Move Ambulance 214 from Station 4 to King Abdullah Road', 'Predicted response gap in Northern Riyadh during evening peak.', '18% faster response',        94, 'High',   'Critical', 1),
  ('R2', 'Deploy two additional crews between 18:00 and 22:00',      'Predicted 17% increase in emergency calls after 17:00.',        'Sustains SLA at peak',       91, 'High',   'High',     2),
  ('R3', 'Redirect trauma patients from Hospital A to Hospital C',   'Hospital A expected occupancy 97% within 3 hours.',             'Avoids diversion delays',    88, 'High',   'High',     3),
  ('R4', 'Pre-position ambulances near Exit 8',                      'Traffic congestion + weather + historical accident pattern.',   '12% faster on-scene',        86, 'Medium', 'High',     4),
  ('R5', 'Schedule maintenance for Ambulance 117',                  'Predicted brake-failure probability 82% within 36h.',           'Prevents unplanned downtime', 82, 'Medium', 'Medium',  5),
  ('R6', 'Redistribute ambulances between overloaded and idle stations', 'Stations 4 and 9 over capacity; 2 and 7 underutilized.',    'Balances coverage',          84, 'Medium', 'Medium',   6);

-- ── Readiness scorecard ──────────────────────────────────────────────────────
INSERT INTO readiness (label, score, sort_order) VALUES
  ('Fleet Readiness',           88, 1),
  ('Hospital Readiness',        72, 2),
  ('Operational Readiness',     91, 3),
  ('Medical Capacity',          84, 4),
  ('Communication Health',      97, 5),
  ('Resource Availability',     69, 6),
  ('Predicted SLA Compliance',  93, 7);

-- ── What-if simulator ────────────────────────────────────────────────────────
INSERT INTO sim_baseline (id, response, coverage, hospital_load, fleet_util, lives, sla, cost) VALUES
  (1, 8.4, 92, 78, 71, 46, 94.2, 0);

INSERT INTO sim_scenarios (key, label, response_delta, coverage_delta, hospital_load_delta, fleet_util_delta, lives_delta, sla_delta, cost_delta, sort_order) VALUES
  ('add5',          'Add 5 ambulances',       -1.1,  4, -2, -6,  6,  2.4,  42000, 1),
  ('closeHospital', 'Close a hospital',         0.9, -3, 11,  7, -5, -3.1,      0, 2),
  ('demand20',      'Increase demand 20%',      1.6, -6,  9, 12, -8, -4.7,      0, 3),
  ('cutStaff',      'Reduce staffing',          1.9, -7,  4,  9, -9, -5.2, -28000, 4),
  ('rain',          'Simulate heavy rain',      1.3, -4,  6,  8, -4, -3.4,      0, 5),
  ('match',         'Simulate football match',  1.0, -3,  5,  6, -3, -2.6,  15000, 6);

-- ── AI executive summary ─────────────────────────────────────────────────────
INSERT INTO exec_summary (id, headline, bullets, confidence, sources, horizon) VALUES
  (1,
   'Today''s Operational Summary',
   ARRAY[
     'Emergency calls are up **12%** versus yesterday, led by road-traffic incidents.',
     '**Northern Riyadh** is seeing higher accident frequency driven by traffic congestion.',
     'Response time remains **below the 9-minute SLA** target across all regions.',
     'Hospital occupancy is expected to rise during the evening peak (18:00–21:00).',
     'AI predicts a **17% increase** in emergency calls after 17:00 — pre-positioning advised.'
   ],
   96,
   ARRAY['Historical incidents','Live GPS','Traffic','Weather','Hospital occupancy','Calendar events'],
   'Next 12 hours');
