# AICP Bug Report — "Pinned Models" widget ignores the actual pin state / tenant scope

**Component:** AICP Console / Studio (dashboard "PINNED MODELS" widget)
**Not** the SRCA AI Workspace — this is entirely console-side.
**Tenant:** Saudi Red Crescent Authority · Environment: Production
**Severity:** Low (cosmetic/trust) — but it misrepresents governance state, so worth fixing.
**Reported:** 2026-07-17

---

## Summary

The Studio "PINNED MODELS" widget lists ~6 models, but only **one** model is actually
pinned in the tenant's Model registry. The widget is not filtering by the real pin flag
(and/or not scoping to the active tenant), so it shows models that are neither pinned nor
even registered for this tenant.

## Steps to reproduce

1. Sign in with the **Saudi Red Crescent Authority** tenant active (Production).
2. Go to **Models** (registry). Observe the pin/star column: only **`Qwen3.6-27B`** has a
   filled (active) star. Every other model's star is empty.
3. Go to the Studio dashboard containing the **PINNED MODELS** widget.

## Expected

The widget shows **only the models that are pinned for the active tenant** — i.e. exactly
**`Qwen3.6-27B`**.

## Actual

The widget shows **six** entries by their base-model display names:

- Llama 3.2 3B (local)
- Nomic Embed Text (local)
- Qwen3.6-27B
- Qwen 2.5 Mini (0.5B)
- Whisper (local)
- Whisper Tiny (local)

Two of these (**Whisper Tiny**, **Qwen 2.5 Mini 0.5B**) are not even in the SRCA tenant's
Model registry, which lists these keys: `arabic-llm`, `cmd-llm`, `embed-sovereign`,
`Qwen3.6-27B`, `rerank-sovereign`, `transcribe-ar`, `vision-ocr`.

## Analysis / likely cause

The widget appears to be sourcing from **all locally-available / platform-global models**
(base model names, incl. models not in this tenant's registry) and labeling them "Pinned",
rather than reading the per-model pin flag the registry star writes to, scoped to the
active tenant.

Note for whoever picks this up: the pin flag is **not exposed** on `GET /api/v1/models`
(the response item has `id, provider_id, provider_type, key, display_name, model_name,
modality, status, endpoint, default_params, context_window, is_onprem, tags,
fallback_model_key, capability_codes, has_credential, latest_health, created_at` — no
`pinned`/`favorite`/`is_pinned`). So pin state is stored/served elsewhere (a separate
pins/favorites store or a preference the registry star toggles). **The widget must read the
same source the registry star writes to** — whatever that is — and filter on it.

## Additional evidence (probed 2026-07-17)

- The panel still shows unpinned models after the first report: **Llama 3.2 3B (local), Nomic Embed
  Text (local), Qwen 2.5 Mini (0.5B), Whisper (local), Whisper Tiny (local)**.
- **The one model actually pinned in the registry — `Qwen3.6-27B` — is NOT in the panel.** So the
  widget is provably not driven by the pin flag.
- **Every model in the panel is labelled "(local)".** The panel is almost certainly querying
  *local / on-prem models* (or a seeded/default list) and mislabelling them "Pinned Models".
- `GET /api/v1/models` returns **403** to the application token (registry listing is admin-scoped),
  and there is **no `pin`/`favorite`/`star` field or endpoint** anywhere in the public API. So the
  pin/star state (the star toggle on the Models page) is a **console-side concept** — the fix is
  entirely in the Console/Studio, and the widget must read the same store the star writes to.

## Suggested fix

1. Back the widget with the **same pin source as the Models-registry star**, scoped to the
   **active tenant** (respect the tenant switcher / `X-Tenant-Id`).
2. Render only entries where `pinned == true` for that tenant. Do not fall back to
   "all local models" / "all enabled models" / global favorites when the tenant has few or
   no pins — show an empty state instead.
3. Prefer showing the **registry key + display name** (e.g. `Qwen3.6-27B`) so the widget is
   consistent with the Models page, rather than raw base-model names.

## Acceptance criteria

- With only `Qwen3.6-27B` starred in the SRCA registry, the widget shows **exactly**
  `Qwen3.6-27B` — nothing else.
- Pinning/unpinning a model on the Models page is reflected in the widget (after refresh).
- The widget is **tenant-scoped**: switching tenants shows that tenant's pins only.
- Models not registered for the tenant never appear.

## Out of scope

- No change to the SRCA AI Workspace. The workspace only calls capabilities and lets AICP
  route to models; it does not read or render the pinned-models list.
- Not asking to change which models are pinned — only to make the widget reflect reality.
