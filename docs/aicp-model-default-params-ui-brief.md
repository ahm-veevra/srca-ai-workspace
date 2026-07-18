# Brief for the AICP terminal — expose `default_params` in the model editor (e.g. "disable thinking")

**Gap (frontend):** the model **create/edit form has no field for `default_params`**, so operators
can't set per-model inference parameters from the UI — most importantly the flags that **disable a
reasoning/"thinking" model's chain-of-thought**. The backend fully supports it; only the form is missing.

## Evidence

- API accepts and persists it:
  - `backend/app/modules/registry/schemas.py:76` — `ModelCreate.default_params: dict`
  - `backend/app/modules/registry/schemas.py:91` — `ModelUpdate.default_params: dict | None`
  - `backend/app/modules/registry/service.py:274, 313` — persisted on create/update
- UI does **not** expose it: no `default_params` / `thinking` / `reasoning` field in
  `web/components/models/models-manager.tsx` (the model form) — same class of gap as the model
  **fallback** field that was recently added there.

## Why it matters

`Qwen3.6-27B` (tenant SRCA) must run with:
```json
"default_params": { "suppress_reasoning": true, "chat_template_kwargs": { "enable_thinking": false } }
```
Without these, Qwen3 emits its "thinking" output, which **breaks the strict-JSON capabilities** — the
dashboard executive **briefing / forecast / recommendations** parse `{headline,bullets}` / `{forecast:…}`
/ `{recommendations:…}` and get garbage, blanking those panels. Because the form doesn't surface
`default_params`, **recreating/editing the model in the console silently drops these flags** — the value
only survives if you restore the row or PATCH the API directly. Operators have no in-product way to set
or even see it.

## Fix

Add `default_params` to the model **create/edit form** and the model **detail view**:

1. **A raw JSON editor** for `default_params` (advanced, validated as an object) — the general fix so
   any provider-specific param can be set (temperature/top_p defaults, stop sequences, template kwargs…).
2. **Plus a friendly control for the common case:** a **"Disable model reasoning / thinking"** toggle
   that writes `{"suppress_reasoning": true, "chat_template_kwargs": {"enable_thinking": false}}` (and
   clears them when off). Recommended default: on for reasoning-capable chat models used by structured
   capabilities.
3. Show the current `default_params` on the model **detail/read** view so it's discoverable (right now
   it's invisible unless you query the DB).

Wire it exactly like the `fallback_model_key` field was added to `models-manager.tsx` (form state →
`ModelCreate`/`ModelUpdate.default_params`).

## Paste-ready message to the terminal

> The model editor has no field for `default_params`, though the API supports it
> (`registry/schemas.py:76,91`; `service.py:274,313` persist it) — same gap as the fallback field you
> added to `web/components/models/models-manager.tsx`. This hides critical per-model inference settings,
> notably disabling a reasoning model's chain-of-thought: `Qwen3.6-27B` needs
> `default_params={"suppress_reasoning":true,"chat_template_kwargs":{"enable_thinking":false}}` or its
> "thinking" output breaks the dashboard's strict-JSON capabilities, and editing the model in the UI
> silently drops it. Fix: add a validated `default_params` JSON editor to the model create/edit form and
> the detail view, plus a friendly **"Disable model reasoning/thinking"** toggle that writes those keys.
