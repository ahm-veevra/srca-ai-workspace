# Bug report for the AICP terminal — a fallback chain doesn't skip a circuit-broken primary

**Severity: high** — the tenant's routing fallback chain gives **no** protection against the exact
failure it exists for. When the chain's **primary** model has an **open circuit breaker** (or is marked
unavailable), routing **fails the request** instead of advancing to the next model in the chain.

## Symptom

Tenant SRCA has fallback chain `ha-chain = [Qwen3.6-27B, arabic-llm, cmd-llm]`, and the command-center
capabilities are un-pinned so they route through it. When `Qwen3.6-27B` goes down, every AI run fails:

```
selected_model_key = (none)   req_model_key = NULL (routing)
error: "Routing target model 'Qwen3.6-27B' is unavailable."
error: "routing circuit open"
```

It never falls through to `arabic-llm` / `cmd-llm`. So the dashboard briefing/forecast/recommendations
show "Awaiting…", and copilot/knowledge/chat all fail — despite a healthy fallback model being available.

## Why it happens (and why it differs from the 502 case)

There are **two different failure points**, and only one of them triggers fallback today:

- **Orchestrate stage (works):** during the earlier outage Qwen returned **502**. The orchestrator
  (`servicebus/pipeline/stages.py` `_build_chain` → try-loop) had already built the chain, *tried* Qwen,
  caught the 502, and advanced to `arabic-llm`. Fallback worked.
- **Routing stage (broken):** now Qwen is **circuit-broken / unavailable**. This fails **earlier**, in
  the router (`routing/engine.py`), *before* the orchestrator builds the try-chain. The fallback-chain
  action resolves the primary as `get_enabled(chain.model_keys[0])` (Qwen) and that resolution raises
  `"Routing target model 'Qwen3.6-27B' is unavailable"` / `"routing circuit open"` — so the request dies
  at routing and the remaining chain entries (`arabic-llm`, `cmd-llm`) are never considered.

Net: a circuit-open **primary** short-circuits the whole request; the chain's purpose (survive a bad
primary) is defeated.

## Fix

Make model **health / circuit state** part of chain (and route) resolution — not just the orchestrate
retry loop:

1. In the **fallback-chain** action (`routing/engine.py`, `_apply_fallback_chain` / the chain primary
   resolution): pick the effective **primary as the first *healthy* (circuit-closed, enabled) model in
   `chain.model_keys`**, and set fallbacks to the remaining healthy ones — i.e. skip any circuit-broken
   /unavailable model instead of raising on it. Only fail if **none** of the chain's models are usable.
2. Apply the same "skip unhealthy, advance to next" logic to the **`route` action's** `fallbacks` and to
   the model-level **`fallback_model_key`** pointer chain, so an open circuit anywhere in a declared
   chain is stepped over rather than fatal.
3. Ensure the **orchestrator** also honours the circuit: if the routed model's circuit is open, move to
   the next chain entry rather than attempting (and immediately erroring on) it.

Also worth confirming while you're in there:
- **Circuit auto-close:** verify the breaker half-opens/closes promptly once `Qwen3.6-27B` is reachable
  again (so recovery is automatic), and expose a way to reset it manually.
- **Error surfaced to the caller:** when the whole chain is exhausted, return a single clear "all chain
  models unavailable" rather than the leaked internal `"routing circuit open"`.

## Impact

Affects **every** AI surface that routes through `ha-chain` while Qwen's circuit is open: the dashboard
briefing / forecast / recommendations panels, Copilot, Knowledge, the Intelligence-Center "ask this
record" chats, and the Ask-Your-Data agent. With the fix, all of them transparently degrade to
`arabic-llm` (smaller, but available) instead of failing — which is the whole point of the chain.

## Paste-ready message to the terminal

> Our fallback chain `ha-chain=[Qwen3.6-27B, arabic-llm, cmd-llm]` doesn't protect against a
> circuit-broken primary. When Qwen's circuit opens, routing fails with "Routing target model
> 'Qwen3.6-27B' is unavailable" / "routing circuit open" and never advances to arabic-llm — unlike a 502,
> which falls through because it fails later at the orchestrate stage. Fix `routing/engine.py`'s
> fallback-chain (and `route`-action fallbacks + model-level `fallback_model_key`) to select the primary
> as the first *healthy/circuit-closed* model in the chain and skip unavailable ones, failing only when
> none are usable; and have the orchestrator skip a routed model whose circuit is open. Also verify the
> breaker auto-closes when Qwen recovers, and return a clean "all chain models unavailable" instead of
> leaking "routing circuit open". This currently blanks the dashboard AI panels and breaks copilot/
> knowledge/chat for tenant `edbead82-…` whenever Qwen is down.
