# Brief for the AICP terminal — complete the model editor's `default_params` fields

**Status update:** the **`enable_thinking` toggle now exists** in the model form — thank you. That
closes the single most important gap (Qwen3 no longer leaks chain-of-thought into the strict-JSON
capabilities). This brief is the **follow-up**: (a) make that toggle write the *full* reasoning set, not
just `enable_thinking`, and (b) surface the rest of the useful `default_params` so operators aren't
back to editing the DB for anything beyond thinking.

## Background — how `default_params` actually flows (grounds the field list)

AICP splits `default_params` into two classes at the orchestrate stage
(`backend/app/modules/servicebus/pipeline/stages.py:756`):

- **Platform-only keys** — `PLATFORM_PARAM_KEYS = {"reasoning", "suppress_reasoning"}`. Consumed by the
  pipeline, **never forwarded** upstream (an unknown body field 400s a strict OpenAI-compatible server).
- **Everything else** → `provider_extra()` (`stages.py:770`) → `payload.update(request.extra)` in
  `backend/app/adapters/openai_adapter.py:58`. Forwarded **verbatim** into the chat-completions body.

Two consequences the form/help-text should reflect:

1. **`default_params` is an override, not a default.** Because `payload.update(request.extra)` runs
   *after* the caller's `temperature`/`max_tokens`/`stop` (`openai_adapter.py:51–56`), a value set here
   **wins** over what a capability or agent requests. The name says "default"; the behavior is "force."
2. **Validate by key class.** Platform-only keys are always safe; provider-forwarded keys can 400 a
   strict server if misspelled — so the raw editor should **warn**, not hard-block, on unknown keys.

## 1. Make the existing "thinking" toggle write the full reasoning set

Today the toggle (per the label) sets `chat_template_kwargs.enable_thinking`. For a reasoning model
that's necessary but **not sufficient** — three keys belong together, and the platform relies on all
three:

```json
"default_params": {
  "reasoning": true,                                   // → 2048-token output floor (stages.py:_REASONING_MIN_OUTPUT_TOKENS)
  "suppress_reasoning": true,                          // → platform injects "final answer only" + strips CoT
  "chat_template_kwargs": { "enable_thinking": false } // → provider-side (vLLM) template switch
}
```

- `enable_thinking:false` (provider) stops Qwen3's template from emitting the `<think>` block.
- `suppress_reasoning:true` (platform-only) is belt-and-suspenders: `messages_for()` (`stages.py:782`)
  merges a "Return only the final answer…" instruction into the system message and strips leaked CoT, so
  even a fallback model or a template that ignores the kwarg stays clean.
- `reasoning:true` (platform-only) marks it a reasoning model so it gets the **2048-token minimum output
  floor** — otherwise a small caller budget is spent on thinking and the answer truncates (A67/PRR-003).

**Ask:** have the single toggle write all three (and clear all three when off), or split into a
labelled group "Reasoning model → [x] disable thinking output" that sets the trio. Recommended default:
**on** for any reasoning-capable chat model backing a structured capability.

## 2. Add the rest of the common inference params (so the DB is never needed again)

These are provider-forwarded (Tier 1–2) or platform (the reasoning trio above). All go through the same
`default_params` object; the typed controls are just sugar over the raw JSON editor.

**Tier 1 — typed controls, shown by default:**

| Control | Writes | Why |
|---|---|---|
| **Temperature** | `temperature` (0–2) | Structured/JSON capabilities need `0–0.2` for determinism; panels drift without it. |
| **Max output tokens** | `max_tokens` (int) | Cost/latency cap + guarantees the JSON completes. (Overrides caller — see note above.) |
| **JSON mode** (toggle) | `response_format:{"type":"json_object"}` | vLLM-supported; far more robust than prompting for the strict-JSON capabilities. Biggest reliability win after disable-thinking. |
| **Top-p** | `top_p` (0–1) | Standard nucleus-sampling default. |

**Tier 2 — advanced, collapsed:**

`stop` (stop sequences, string[]), `frequency_penalty`, `presence_penalty`, `seed` (reproducible test runs).

**Tier 3 — raw JSON escape hatch:**

A validated `default_params` JSON editor (object) for anything not worth a dedicated control:
`chat_template_kwargs` beyond `enable_thinking`, and vLLM extras (`top_k`, `repetition_penalty`, `min_p`,
`guided_json`/`guided_regex`). This is the general fix — everything above is optional sugar over it.

## 3. Show `default_params` on the model detail/read view

Right now the value is invisible unless you query the DB, so operators can't tell whether thinking is
actually disabled on a given model. Render the effective `default_params` (and ideally badge "Reasoning
suppressed" when the trio is set) on the model detail view.

## Scope notes

- **Modality-aware (optional):** non-chat models have their own useful params — STT/whisper:
  `language`, `temperature`; embeddings: `dimensions`, `encoding_format`. Only relevant if the form
  branches on modality; the chat set above is what the SRCA models need today.
- Wire it exactly like `fallback_model_key` was added to `models-manager.tsx`
  (form state → `ModelCreate`/`ModelUpdate.default_params`). API already persists it
  (`registry/schemas.py:76,91`; `service.py:274,313`).

## Paste-ready message to the terminal

> Thanks for adding the `enable_thinking` toggle. Two follow-ups on the model form's `default_params`:
> (1) For reasoning models, `enable_thinking:false` alone isn't enough — the platform also relies on
> `suppress_reasoning:true` (injects "final answer only" + strips leaked CoT, `stages.py:782`) and
> `reasoning:true` (gives the 2048-token output floor so the answer doesn't truncate). Have the toggle
> write all three together, not just `enable_thinking`. (2) Surface the rest of `default_params` so the DB
> is never needed: typed **temperature**, **max_tokens**, **JSON mode** (`response_format:{"type":"json_object"}`),
> **top_p**, plus advanced `stop`/`frequency_penalty`/`presence_penalty`/`seed`, and a validated raw-JSON
> editor for provider extras (`chat_template_kwargs`, `top_k`, `guided_json`, …). Note for the help text:
> because `payload.update(request.extra)` runs after the caller's values (`openai_adapter.py:58`),
> `default_params` *overrides* per-request temperature/max_tokens/stop rather than defaulting them. Also
> render the effective `default_params` on the model detail view — it's currently DB-only.
