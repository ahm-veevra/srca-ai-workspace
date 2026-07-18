# Brief for the AICP terminal — a workspace "activity events" endpoint (log map-location views)

**Goal:** give the workspace a way to **record a lightweight user-activity event** through AICP — the
first case being "operator opened a location on the ops map" (clicked a station / hospital / incident).
The workspace never writes to the database directly (AICP mediates all persistence + audit + tenant
scoping), so this needs a small **AICP endpoint + table**. Design it generically so the same endpoint
captures other UI interactions later (document opened, capability run from a screen, report exported…).

**Tenant:** Saudi Red Crescent Authority (`edbead82-7fb7-4d43-8bd2-7bc07e20c761`).

---

## Why (not just a client-side log)

- Auditability: "which facilities/incidents did operators inspect, and when" is useful for ops review
  and QA — it belongs in a governed, tenant-scoped, per-user store, not the browser.
- Architecture: the SRCA workspace only calls AICP APIs; it has no DB access. A user-facing "log this"
  must be an AICP write attributed to the signed-in user.

## Endpoint contract

`POST /api/v1/activity/events`  (runs under the **signed-in user session** — per-user attribution +
tenant scope; a basic perm like `inference.run` or a new `activity.write` is fine).

Request body:
```json
{
  "type": "map.location.viewed",
  "entity": { "kind": "hospital", "label": "King Fahad Medical City", "region": "riyadh", "id": null },
  "context": { "surface": "command-center-map", "coords": { "x": 60, "y": 32 } },
  "occurred_at": "2026-07-18T09:20:00Z"
}
```
- `type` (required): dotted event name, namespaced (e.g. `map.location.viewed`). Keep it a free string
  the caller sets, validated only for length.
- `entity` (optional object): what was acted on — `kind` (station/hospital/incident/…), `label`, `id`,
  `region`. Free-form JSON; don't hard-code a schema.
- `context` (optional object): where it happened + any small payload (surface, coords, filters).
- `occurred_at` (optional ISO-8601): client time; server stamps `created_at` regardless.

Response `201`:
```json
{ "id": "…uuid…", "recorded_at": "2026-07-18T09:20:00.123Z" }
```

Behaviour notes:
- **Best-effort / non-blocking:** the workspace will fire-and-forget and ignore the response, so a 2xx
  with the id is enough; failures must never surface to the user.
- **No inference pipeline:** this is telemetry/audit, not an AI call — a plain governed write, not the
  servicebus orchestrate path.
- **Volume:** map clicks can be frequent. Cheap insert; consider a per-user/per-type light rate cap or
  coalescing if needle-moving, and log (don't silently drop) anything shed.
- **Sensitivity:** entity labels are facility/incident names (INTERNAL, not PII); map coords are display
  coordinates. Classify low; no redaction needed.

## Table (suggested)

`activity_events`:
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| tenant_id | uuid | FK tenants, indexed |
| created_at | timestamptz | server time; index `(tenant_id, created_at desc)` |
| actor_id | uuid null | the signed-in user |
| type | varchar(128) | index `(tenant_id, type)` |
| entity | jsonb | |
| context | jsonb | |
| occurred_at | timestamptz null | client-reported |

## Retrieval (optional, for an activity feed / audit view)

`GET /api/v1/activity/events?type=&from=&to=&limit=` → tenant-scoped list, newest first, so the console
(or the workspace) can show "recent operator activity."

## Workspace wire-up (what we'll do once it exists)

On a marker click in `components/command-center/saudi-map.tsx`, in addition to showing the callout, the
workspace will `apiPost("/activity/events", { type: "map.location.viewed", entity, context })` under the
user session — fire-and-forget (`.catch(() => {})`), never blocking the UI. We'll gate it behind a small
config flag (default on) so it can be disabled. No other workspace change is needed.

## Paste-ready message to the terminal

> Add a governed **activity-events** write endpoint so the workspace can log lightweight user
> interactions (first use: "operator opened a map location"). `POST /api/v1/activity/events` under the
> signed-in user session, tenant-scoped, attributed to `actor_id`. Body: `{ type: string (dotted name),
> entity?: jsonb, context?: jsonb, occurred_at?: iso }` → `201 { id, recorded_at }`. It's telemetry, not
> inference — a plain insert into a new `activity_events` table (id, tenant_id, created_at, actor_id,
> type, entity jsonb, context jsonb, occurred_at), indexed on `(tenant_id, created_at)` and
> `(tenant_id, type)`. Keep `type` a free validated string and `entity`/`context` schema-less. Classify
> low sensitivity; never route through the AI pipeline. Optional companion: `GET /activity/events?
> type=&from=&to=&limit=` (newest-first, tenant-scoped) for an activity feed. The workspace will call it
> fire-and-forget on marker click; failures must never affect the UI.
