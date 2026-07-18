# SRCA Workspace ↔ AICP — briefs & bug reports

These documents are written for the **AICP platform team ("the terminal")**. The SRCA AI Workspace
runs no AI itself — it only calls AICP HTTP APIs — so anything that needs a capability/agent built, a
platform bug fixed, or config set lives here as a brief. Status reflects what was observed as of the
last check; verify against the live platform before acting.

Legend: ✅ done · 🟡 partial / pending your action · ❌ open (not started) · ❔ unverified

## Platform bugs (fix in AICP)

| Doc | What it's about | Status |
|---|---|---|
| `aicp-lifecycle-versioning-bugs.md` | 4 bugs: active→draft dead-end, agent + capability edits landing unversioned, missing model-fallback field | ✅ all 4 fixed (verified in code); capabilities also un-pinned |
| `aicp-ui-bugs-and-audit-brief.md` | Shared Dialog: vertical-overflow clipping + closes-on-text-selection; plus a full UI/RTL audit | ❌ open — `web/components/ui/dialog.tsx` unchanged |
| `aicp-analysis-output-language-bug.md` | `/{domain}-intelligence/analyze` ignores output language (always English) | 🟡 workspace workaround for correspondence; add a `language` param for the rest |
| `aicp-model-test-button-modality-bug.md` | Model "Test configuration" chat-probes every modality → false 404 for STT/embedding/rerank/vision | ❌ open |
| `aicp-connection-leak-fix.md` | `idle in transaction` connection leak stalls requests (transcription, dashboard) | 🟡 mitigated (300s timeout); recurs — needs a real fix for what leaks the txn |
| `aicp-routing-circuit-fallback-bug.md` | Fallback chain doesn't skip a circuit-broken primary — Qwen circuit-open fails instead of dropping to arabic-llm | ✅ fixed — verified runs now fall through to arabic-llm while Qwen is down |
| `aicp-pinned-models-widget-fix.md` | AICP Studio shows unpinned models in the Pinned Models panel | ❔ console bug — not verifiable from the workspace |

## Capabilities / agents / endpoints to build

| Doc | What it's about | Status |
|---|---|---|
| `aicp-command-center-capabilities-brief.md` | Dashboard capabilities (briefing / forecast / recommendations / copilot / knowledge / what-if) | ✅ built + wired |
| `aicp-askdata-agent-brief.md` | Ask-Your-Data agent (SQL over the data lake) | ✅ built + wired (`askDataAgentId`) |
| `aicp-document-chat-capability-brief.md` | Grounded "Ask this record" Q&A capability | ✅ built + wired (`documentChatCapabilityId`) |
| `aicp-activity-events-brief.md` | New `POST /activity/events` to log user interactions (first use: map-location views) | ❌ open — workspace wire-up pending the endpoint |

## Config & setup

| Doc | What it's about | Status |
|---|---|---|
| `aicp-configuration-requirements.md` | Which connectors/capabilities/agents the workspace needs configured | 🟡 mostly done; `triageCapabilityId` + `replyDraftCapabilityId` still empty (fall back to Copilot) |
| `aicp-governance-review-fix.md` | Rebind SRCA governance profiles to the v2 risk models (stop the human-review holds) | ✅ applied — bound to `ems-ai-risk-model-v2` / `government-services-risk-model-v2` |

## Testing

| Doc | What it's about | Status |
|---|---|---|
| `aicp-test-strategy-brief.md` | Systematic write-path-parity / lifecycle / contract / fault-injection tests to catch this whole bug class | ❌ proposal — coverage unverified |

---

**Runtime reference (SRCA tenant `edbead82-7fb7-4d43-8bd2-7bc07e20c761`):**
- Primary chat model `Qwen3.6-27B` (on-prem `aiservices-ksa.d-intalio.com`); routing chain `ha-chain`
  = `[Qwen3.6-27B, arabic-llm, cmd-llm]` provides failover.
- Transcription: `transcribe-ar` → local whisper (`http://whisper:8000/v1`, `Systran/faster-whisper-small`).
- The `workspaceApiToken` is a secret in `data/aicp-config.json` (gitignored) — never commit it.
