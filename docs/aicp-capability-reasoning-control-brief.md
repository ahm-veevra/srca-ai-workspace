# Brief for the AICP terminal — let an AI capability decide reasoning ("thinking") on/off

**Ask:** make the reasoning/"thinking" decision a property of the **capability (the task)**, not only the
**model**. Today it's model-global; add a per-capability override that wins over the model default.

## Why (the limitation today)

- Reasoning suppression currently lives only on the **model** (`model.default_params`), which the pipeline
  documents as global: *"Applies to EVERY consumer of the gateway — agents, capabilities, workspace — for
  that model"* (`backend/app/modules/servicebus/pipeline/stages.py:761`).
- Capabilities carry **no** reasoning field: `CapabilityInvokeRequest`
  (`backend/app/modules/capabilities/invoke.py:95`) exposes only `temperature`/`max_tokens`, and the
  authoring schema stores none — so a capability cannot say "think" or "don't think."
- Whether you want visible reasoning is a property of the **task**, not the model:
  - the dashboard **briefing / forecast / recommendations** parse strict JSON → must **not** think;
  - a **what-if / deep-analysis** capability on the **same Qwen model** genuinely **would** benefit from it.
- With a model-global flag you can't have both on one model — turning thinking off for the JSON
  capabilities also kills it for a reasoning one. That's the gap.

## Semantics

A tri-state on the capability config:

```
reasoning_mode: "inherit" | "off" | "on"        (default: "inherit")
```

- `inherit` → use the model's default (today's behavior — back-compatible).
- `off` → force no visible reasoning, regardless of model default (strict-JSON capabilities).
- `on` → allow reasoning even if the model defaults to suppressed.

**Precedence: capability > model default.** The model default is the safety net; an explicit capability
choice wins. (This also fixes today's wart where `model.default_params` *force-overrides* the caller
because `payload.update(request.extra)` runs last in `openai_adapter.py:58`.)

**Store *intent*, not `enable_thinking`.** A run can fall through the fallback chain
`ha-chain = [Qwen3.6-27B, arabic-llm, cmd-llm]`, and `enable_thinking` is a Qwen/vLLM chat-template kwarg
the other two models don't have. So the capability stores abstract intent; the pipeline maps it to each
model's mechanism **per attempt**.

## Implementation touchpoints (verified)

1. **Store it** — add `reasoning_mode` to the capability config schema (`authoring/schemas.py`) and
   persist it alongside the existing `workspace_config` (where `model_key` already lives).
   Migration default: `"inherit"`.
2. **Carry it** — add `reasoning_mode` to `CapabilityInvokeRequest` (`capabilities/invoke.py:95`) and to
   the `InferenceRunRequest` built in `run_capability` (`invoke.py:145`), populated from capability
   config, so it reaches the pipeline context.
3. **Resolve it** — in `OrchestrateStage`, replace the direct model reads (`stages.py:782` `messages_for`,
   plus `_is_reasoning_model`/token-floor and `provider_extra`) with an *effective* resolver:

   ```python
   def _effective_suppress(reasoning_mode, model) -> bool:
       if reasoning_mode == "off": return True
       if reasoning_mode == "on":  return False
       return bool((model.default_params or {}).get("suppress_reasoning"))  # inherit
   ```

   Then `messages_for` (the "final answer only" injection), the 2048-token reasoning floor, and the
   suppression kwargs all key off `_effective_suppress(...)` instead of the raw model flag — computed
   **per attempt**, so a fallback model resolves against its own default.

## The one elegant move — derive `enable_thinking`, stop storing it

Today `chat_template_kwargs.enable_thinking:false` is a static value baked into `default_params` and
*always* forwarded (via `provider_extra`), so a capability can't flip it. Make it **derived**: when a model
is flagged reasoning-capable, compute per attempt

```python
chat_template_kwargs["enable_thinking"] = not _effective_suppress(reasoning_mode, model)
```

instead of reading it from static `default_params`. That single change:

- makes **one** Qwen serve both strict-JSON (`off`) and deep-reasoning (`on`) capabilities;
- works across the fallback chain (each attempt recomputes for its own model);
- **retires the "operator hand-sets / silently-drops `enable_thinking`" problem entirely** — operators
  only ever set *intent* (`suppress_reasoning` default on the model, `reasoning_mode` on the capability);
  the provider kwarg becomes a consequence, not a field anyone edits by hand.

## Acceptance test

On one **un-pinned** Qwen model, tenant SRCA:

- capability A with `reasoning_mode:"off"` → clean JSON, no `<think>` / "thinking process" text;
- capability B with `reasoning_mode:"on"` → visible step-by-step reasoning;
- same model, same tenant, identical request otherwise.

Plus: `reasoning_mode:"inherit"` reproduces today's behavior (model default), and a capability override
survives a fallback hop (each model resolves against its own default when the capability says `inherit`).

## Paste-ready message to the terminal

> Reasoning/"thinking" is currently model-global (`stages.py:761`) and capabilities have no field for it
> (`CapabilityInvokeRequest`, `invoke.py:95`), so one model can't serve both a strict-JSON capability and a
> reasoning one. Add a per-capability tri-state `reasoning_mode: inherit|off|on` (default `inherit`) that
> overrides the model default (capability wins). Store abstract intent, not `enable_thinking` — a run can
> fall through `ha-chain` to models without that kwarg. Touchpoints: add the field to `authoring/schemas.py`
> + capability config, carry it through `CapabilityInvokeRequest`/`InferenceRunRequest`
> (`invoke.py:95,145`), and in `OrchestrateStage` compute an `_effective_suppress(reasoning_mode, model)`
> per attempt that drives `messages_for`, the 2048-token floor, and the suppression kwargs. Best move:
> derive `chat_template_kwargs.enable_thinking = not effective_suppress` instead of storing it statically —
> that lets one Qwen serve both modes, works across fallback, and retires the "operator silently drops
> enable_thinking" problem. Accept: on one un-pinned Qwen, a capability with `off` returns clean JSON and
> one with `on` returns visible reasoning, same model/tenant.
