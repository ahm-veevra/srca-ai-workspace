# Bug report for the AICP terminal — lifecycle / versioning + model-fallback UI

Found while wiring an on-prem model fallback for SRCA (Qwen down → route to cmd-llm) and editing
the command-center capabilities/agents. Four issues, three of them governance/data-integrity, one
frontend gap. File:line references are into the AICP backend (`/d/Projects/AI Platform`).

---

## Bug 1 — Model registry UI has no field to set `fallback_model_key` (frontend gap)

- **Symptom:** neither the *create model* nor the *edit model* form in the console exposes a
  "fallback model" field, so a model-level failover can't be configured from the UI at all.
- **The backend already supports it fully:**
  - `registry/models.py:134` — `fallback_model_key` column exists.
  - `registry/schemas.py:81` (`ModelCreate`) and `:96` (`ModelUpdate`) both accept it.
  - `registry/service.py:278` (create) and `:317` (update) persist it; `router.py:75` returns it.
- **Fix (frontend only):** add a `fallback_model_key` input to the model create/edit form (a model
  picker), and ideally a small "fallback chain" editor. No backend change needed.
- **Workaround available today:** set it via the model-update API even without the UI —
  `PATCH /api/v1/…/models/{id}` (or the registry update route) with `{"fallback_model_key": "cmd-llm"}`.

## Bug 2 — "Revise it back to draft" is an impossible instruction (systemic UX/logic)

- **Symptom:** editing an **active** agent or capability errors with
  *"…is 'active'; revise it back to draft before editing."* — but there is **no** button to do that;
  only **Deprecate** and **Retire** exist.
- **Root cause:** in **every** lifecycle, `active`'s only legal transitions are `deprecated` / `retired`:
  - `authoring/core.py:70, 84, 99` → `"active": {"deprecated", "retired"}` (no `draft`).
  - The error text is raised at `authoring/core.py:284`, instructing a transition that exists in **no**
    lifecycle. The UI correctly shows only Deprecate/Retire because those are the only legal moves.
  - The intended edit flow is **"create a new version / clone → draft"** (`authoring/core.py:486`,
    "Clone / Save As / Create Custom Version — a new editable draft"), but there is **no UI affordance**
    for it from the active state.
- **Fix:** (a) change the message to point at the real action ("Create a new version to edit"), and
  (b) add an **"Edit / New version"** action from the active state that spawns a draft revision (via
  the existing clone / version-snapshot machinery) while the active version keeps serving. Applies to
  agents, capabilities, and workflows/solutions (shared lifecycle).

## Bug 3 — Agent Studio edits an ACTIVE agent in place, no new version, bypassing the guard (data integrity) ⚠️

- **Symptom:** editing an active agent's routing shows the "revise it back to draft" error on
  publish, **yet the modification is saved** — and **no new version is generated.**
- **Root cause — two write paths that disagree:**
  - The **Agent Studio definition save** explicitly treats `active` as editable:
    `agent_studio/definition.py:74` (`agent.status in SOLUTION.editable or agent.status == "active"`)
    and `:212` (`if agent.status not in SOLUTION.editable and agent.status != "active": raise`).
    So an active agent **passes** the check and is mutated in place (name/description/bindings synced)
    **without a version snapshot.**
  - The **authoring-core update/publish** path rejects the same edit at `authoring/core.py:281-284`
    ("revise to draft") — which is what surfaces the error.
  - Net effect: the guard message fires from one path while the other path has already persisted the
    change unversioned. That's the "shows the error but saves anyway, no new version" bug.
- **Fix:** make the Studio definition-save honor the same lifecycle guard (either block active edits,
  or route them through the version-snapshot machinery so a new draft version is created). Active,
  in-use agents must not be mutated in place without a version + provenance record.

## Bug 4 — AI Capability PATCH edits an ACTIVE capability in place, no version, no guard ⚠️

- **Symptom:** editing a capability **auto-saves** with no friction, and on publish there is no
  "save a new version" option like the agent has — only Deprecate/Retire, no revise-to-draft.
- **Root cause:** `PATCH /ai-capabilities/{id}` → `CapabilityService.update`
  (`ai_capability/service.py:480`) raw-`setattr`s `name, description, category, objective, status,
  version, environment, document_types, ai_tasks, workspace_exposed, workspace_config, tags` with
  **no editable-state check and no version snapshot** — bypassing the guarded authoring path
  (`PUT /ai-capabilities/{key}` via `ResourceAuthoringService`, `ai_capability/authoring.py:19`).
  It even lets you set `status` directly, side-stepping the transition state machine.
- **Fix:** route substantive edits through the authoring core (guard + snapshot), or restrict this
  PATCH to genuinely light/live-safe fields (e.g. `workspace_exposed`, `tags`) and block config
  changes (`objective`, `components`, `status`, `model` binding) on non-editable states.

---

## Common root cause

The lifecycle **"editable states" guard** (`authoring/core.py:281`, editable = draft/validate/
simulate/review) is enforced **only on the authoring-core update path**. Two alternate write paths —
the **Agent Studio definition save** (Bug 3) and the **Capability PATCH** (Bug 4) — mutate active,
versioned assets in place, skipping the guard *and* the "every save is a snapshot version" invariant
the authoring core otherwise guarantees. Combined with the missing "create new version" UI affordance
and the misleading error message (Bug 2), users are told to do an impossible thing while their edits
silently land unversioned on a live asset.

## Audit — where the pattern does / doesn't occur

- **Affected (authored + versioned, with a bypass path):** `agents` (Studio definition save),
  `ai_capability` (PATCH). Workflows/solutions share the same lifecycle and the same missing-affordance
  UX (Bug 2), so verify their edit paths too.
- **The active-as-editable carve-out** is unique to `agent_studio/definition.py:74,212` — no other
  module treats `active` as editable (other `status == "active"` hits are query filters in
  governance/connectors/iam/etc., not edit guards).
- **Not affected (correctly in-place):** non-versioned resources with a plain `update()` — connectors,
  iam, dashboards, knowledge, routing, registry, quota, notifications — these aren't on the
  draft→…→active lifecycle, so in-place update is expected.

## Suggested fix priority

1. **Bug 3 & 4** (data integrity) — stop in-place mutation of active versioned assets; force a new
   version. Highest priority.
2. **Bug 2** — add the "Create new version to edit" action + fix the message. Unblocks users.
3. **Bug 1** — add the `fallback_model_key` field to the model form (backend already supports it).
