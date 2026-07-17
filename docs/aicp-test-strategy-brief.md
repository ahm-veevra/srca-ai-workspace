# Brief for the AICP terminal — systematic testing to catch lifecycle/contract/resilience bugs

The four bugs we just filed (`aicp-lifecycle-versioning-bugs.md`) are **not isolated** — they're one
class: *a resource has more than one way to be mutated, or the backend and UI disagree about what's
possible, and a bug hides in the gap.* Ad-hoc "test more" won't find these. The tests below are
**invariant / parity / fault-injection** suites driven from the code's own inventory, so they catch
this whole class and keep catching it as new resources are added.

Goal: produce (1) a **coverage matrix**, (2) a **gap report** of every violation, and (3) new
**regression tests** committed for each invariant.

---

## 0. Build the inventory first (single source of truth)

Enumerate, from code (not by hand):
- Every **versioned/authored resource** and its lifecycle (`authoring/core.py` `Lifecycle` defs:
  agents, ai_capability, workflows/solutions, guardrails, risk models, governance profiles, prompts,
  connectors, OCR pipelines, …).
- For each, **every mutation entry point**: `POST`, `PUT /{key}`, `PATCH /{id}`, studio
  `definition.save`, `apply`, `transition`, `clone`, `restore`, `import`, seed appliers.
- For each, which UI screen/action drives it.
Drive all suites below off this inventory so a newly-added resource or endpoint is auto-covered (and
a resource with an untested write path fails the meta-test).

## 1. Write-path parity (catches Bug 3 & 4) — highest value

For **every** versioned resource, for **every** mutation entry point, run the same substantive edit
against an asset in each state (draft, published, **active**, deprecated) and assert **identical**
governance behavior across paths:
- Editing a **non-editable state (active/published)** is **either blocked on all paths or produces a
  new version on all paths** — never one path blocks while another silently persists.
- Any successful edit to an active/published asset **creates a new version snapshot + audit/provenance
  record**; the prior version's manifest is **immutable** afterward.
- Property test: `for each resource, for each write path P: behavior(P, active) == behavior(authoring_core, active)`.
- Known offenders to assert-fail until fixed: `agent_studio/definition.py` (`or status=="active"`),
  `ai_capability/service.py:CapabilityService.update` (raw setattr, no guard/snapshot).

## 2. Lifecycle / state-machine conformance (catches Bug 2)

- For every lifecycle, assert **every guard/validation message that instructs a transition names a
  transition that is actually reachable** from the current state. The message "revise it back to draft"
  must fail this test wherever `active→draft` isn't in `allowed` (it never is).
- Assert the **UI action set for a state == the backend `transitions(state)`** — no missing button
  (no "New version/Edit" affordance from active) and no button the backend rejects.
- No **dead-end**: from any state an editable path to change the asset must exist and be discoverable
  (clone/new-version counts) — assert it's exposed in the UI.
- Round-trip E2E per resource: `create → publish → active → edit → re-publish` with **no dead-end and
  a version bump at each edit**.

## 3. Backend ↔ Frontend contract parity (catches Bug 1)

- For every **writable field** in each create/update schema (`ModelCreate/ModelUpdate.fallback_model_key`,
  `CapabilityCreate.objective/components`, agent spec, routing rule/chain, …) assert the console form
  **exposes it**, or it's on an explicit `INTENTIONALLY_HIDDEN` allowlist with a reason.
  (`fallback_model_key` present in API since `registry/schemas.py:81,96` but absent from the UI is the
  exact miss.)
- For every **UI action/button**, assert a backend endpoint performs it (drive from the OpenAPI).
- Snapshot-test the OpenAPI so a new backend field can't ship without a UI checklist entry.

## 4. Runtime resilience / routing fault-injection (catches the fallback split we hit)

- **Fault-inject the primary model endpoint (502/timeout/connection-refused)** and assert **every**
  invocation path degrades to the configured fallback — enumerate them all:
  capability run (auto-routed), capability run (**model-pinned** — bypasses routing), agent run,
  dashboard generators (**app-token** path), user-session chats, transcription, OCR/vision.
  The bug we hit: user-session chats fell back but **pinned/app-token dashboard runs did not**.
- Assert **model-level `fallback_model_key`** is honored on **both** the explicit-`model_key` path and
  the policy path (orchestrator `_build_chain` in `servicebus/pipeline/stages.py`).
- Assert **named fallback chains** actually fire: a rule referencing a chain, empty-condition catch-all
  ordering, and that the chain's contents match its name (we had `Qwen-cmd-llm` = `[arabic-llm,cmd-llm]`).
- Assert **no primary without a reachable fallback**: lint that any model used by an active
  capability/agent has a fallback (chain or `fallback_model_key`) or is flagged.
- Recovery: primary back → traffic returns to primary automatically.

## 5. Entitlement / identity parity

- For each surface, assert it works under its **intended identity** (app-token vs signed-in user) and
  fails **cleanly** (clear error, not a silent empty state) under the wrong one — the app-grant vs
  user-role split. Catches "works for superadmin, 403 for normal role" silently.

## 6. Error-message actionability lint

- Every user-facing guard/validation string that says "do X before Y" must map to a reachable UI
  action **and** an API transition. No "impossible instruction" messages ship.

---

## How to run it

- Prefer **property-based + matrix tests** (hypothesis-style) driven off the §0 inventory over
  hand-written per-endpoint cases — they generalize to new resources.
- Add a **meta-test**: every resource in the inventory must have a write-path-parity test and a
  lifecycle-conformance test, or CI fails (so coverage can't silently regress).
- Add the fault-injection suite to CI with a mock adapter that can return 502/timeout per model.
- Output a **gap report** (resource × write-path × state → pass/fail, plus contract-parity and
  fallback-coverage gaps) and open one issue per violation.

## Paste-ready one-liner to the terminal

> Build systematic tests for the bug class in `aicp-lifecycle-versioning-bugs.md`. From the code,
> inventory every versioned resource, its lifecycle, and **all** its mutation entry points. Then add:
> (1) **write-path parity** tests — every mutation path on an active/published asset must behave
> identically (block, or version+audit; never silently persist unversioned); (2) **lifecycle
> conformance** — every guard message names a reachable transition, and the UI action set equals the
> backend `transitions(state)` with no dead-ends; (3) **backend↔frontend contract parity** — every
> writable schema field is UI-exposed or explicitly allow-listed, every UI action has an endpoint;
> (4) **fault-injection** — take each primary model down and assert every invocation path (pinned,
> auto-routed, app-token, user, transcription, OCR) falls back, and `fallback_model_key`/named chains
> fire on all paths; (5) an **error-message actionability lint**. Make them property/matrix tests
> driven off the inventory with a CI meta-test so new resources are auto-covered. Produce a gap report
> and one issue per violation.
