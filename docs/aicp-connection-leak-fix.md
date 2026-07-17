# AICP Bug Report — backend leaks DB connections (`idle in transaction`), exhausts Postgres

**Component:** AICP backend (`veevra-api`) — database session / transaction lifecycle
**Not** the SRCA AI Workspace — the workspace only reported the resulting error.
**Severity:** **High** — when the pool fills, the data plane fails **platform-wide** (any connector
query, and anything else using the DB) until connections are manually cleared.
**Reported:** 2026-07-17

---

## Summary

The AICP backend's database user (`veevra_app`) accumulates connections stuck in the
**`idle in transaction`** state — transactions that are opened and never committed or rolled back,
and whose pooled connection is never released. Over time these fill Postgres's `max_connections`,
after which **no new connections can be made** (Postgres reserves the last slots for superusers), so
every data-plane query fails.

## Symptom (as seen from the SRCA workspace)

The `srca_datalake` SQL connector query started returning **HTTP 422** wrapping a Postgres error:

```
POST /api/v1/connectors/{id}/query
→ 422 { "code": "validation_error",
        "message": "Query failed: remaining connection slots are reserved for roles with the SUPERUSER attribute" }
```

The SRCA command center then shows empty "Awaiting live data" panels (it degrades gracefully).

## Evidence (`pg_stat_activity`, 2026-07-17)

Postgres `max_connections = 200`. Snapshot after ~30h backend uptime:

```
    datname    |  usename   |        state        | count
---------------+------------+---------------------+-------
 veevra        | veevra_app | idle in transaction |   193   ← the leak
 veevra        | veevra_app | idle                |     4
 srca_datalake | veevra     | active              |     1
```

**193 of ~200 connections were `veevra_app` idle-in-transaction** — abandoned transactions holding
the entire pool (and potentially locks). That is ~6 leaked connections/hour that are never reaped.

## Root cause (backend)

A database session/transaction is being opened but not closed on every code path — typically one of:
- A request-scoped async session (SQLAlchemy `AsyncSession`) whose dependency/`async with` context
  isn't guaranteed to `close()` on all paths (early returns, exceptions, background tasks).
- An explicit `session.begin()` / transaction that isn't matched by `commit()`/`rollback()`.
- A pooled connection checked out and never returned (missing `async with engine.connect()` / the
  pool `checkin`), or a pool with no recycle/timeout so leaked connections live forever.

The tell is specifically **`idle in transaction`** (not plain `idle`): a `BEGIN` ran and nothing ended
it. Plain-idle pooled connections are normal; idle-**in-transaction** at this scale is a leak.

## Suggested fix (backend)

1. Ensure the DB session dependency **always** closes and rolls back on exit — e.g. a FastAPI
   dependency that does `try: yield session … finally: await session.close()`, and rolls back if a
   transaction is still open. Use `async with session.begin(): …` so commit/rollback is automatic.
2. Audit any code that opens a transaction/connection outside the request session (background jobs,
   startup tasks, the connector query path, health checks) for the same guarantee.
3. Configure the SQLAlchemy engine pool defensively: `pool_pre_ping=True`, a sane `pool_recycle`,
   and a bounded `pool_size` + `max_overflow` so a leak can't grow unbounded.
4. Add a backend safeguard: set `idle_in_transaction_session_timeout` on the app connection (session
   setting) so the DB reaps any transaction the app forgets to end.

## Interim mitigation already applied (stopgap, not a fix)

On the Postgres server (`veevra-postgres-1`), to recover and to stop recurrence until the backend is
fixed:

```sql
-- 1. Free the pool now:
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
 WHERE usename = 'veevra_app' AND state = 'idle in transaction';
-- (freed 193 connections; usage dropped 203 → 10; connector query returned 200 again)

-- 2. Auto-reap future leaks after 5 minutes:
ALTER ROLE veevra_app SET idle_in_transaction_session_timeout = '300s';
```

⚠️ These treat the symptom. The backend must stop leaking transactions; otherwise the timeout just
masks it (and could abort a legitimately long transaction if one ever exceeds 5 minutes).

## Acceptance criteria

- Under sustained load, `SELECT count(*) FROM pg_stat_activity WHERE usename='veevra_app' AND
  state='idle in transaction'` stays low (≈0–a handful), not monotonically increasing.
- Connection count does not trend toward `max_connections` over hours/days of uptime.
- `POST /connectors/{id}/query` never fails with "remaining connection slots are reserved…".
- The `idle_in_transaction_session_timeout` stopgap can be removed with the leak fixed in place.

## Out of scope

- No SRCA AI Workspace change. The workspace correctly surfaced the DB error and recovers on its own
  once connections are available.
