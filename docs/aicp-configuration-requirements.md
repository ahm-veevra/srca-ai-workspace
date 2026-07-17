# SRCA Workspace → AICP Configuration Requirements & Enhancement Plan

Everything AI lives on the **AICP** side. The SRCA AI Workspace only calls APIs and renders
results. This document (a) validates that every page follows that rule, and (b) lists every
AICP-level configuration the workspace depends on — so the AICP terminal/admin can provision
it. Last updated 2026-07-17.

---

## Part 1 — Validation: does every page delegate AI to AICP?

| Surface | AICP call | Prompt owner | Verdict |
|---|---|---|---|
| Command Center (`/workspace`) | connector `/connectors/{id}/query` + 6 capabilities `/ai-capabilities/{id}/run` | AICP | ✅ aligned |
| AI Intelligence (`/ai-intelligence`) | `/governance/*`, `/metrics/*`, `/cost/*`, `/transcription/transcribe`, capability run | AICP | ✅ aligned |
| Contract (`/contract-intelligence`) | `/contract-intelligence/analyze` + `/report` | AICP service | ✅ |
| RFP/Tender (`/rfp-intelligence`) | `/rfp-intelligence/analyze` | AICP service | ✅ |
| Compliance | `/compliance-intelligence/analyze` | AICP service | ✅ |
| Correspondence | `/correspondence-intelligence/analyze` | AICP service | ✅ |
| Document | `/document-intelligence/analyze` `/compare` `/translate` `/searchable-pdf` | AICP service | ✅ |
| Executive | `/executive-intelligence/analyze` | AICP service | ✅ |
| HR | `/hr-intelligence/cv-review` `/job-description` | AICP service | ✅ |
| Meeting | `/meeting-intelligence/analyze` | AICP service | ✅ |
| Procurement | `/procurement-intelligence/spend-analysis` `/vendor-comparison` | AICP service | ✅ |
| Project | `/project-intelligence/analyze` | AICP service | ✅ |
| Research | `/research-intelligence/analyze` | AICP service | ✅ |
| Knowledge Center | `/knowledge/hybrid-search` → `/inference` | mixed (RAG synth) | ⚠️ passes a grounding instruction — move to a capability for strict purity |
| V-GPT (`/v-gpt`) | `/inference` (+ optional user `system`) | user/direct | ➖ direct-inference playground by design |
| Capabilities (`/capabilities`, `/capabilities-run`, `/create`) | `/ai-capabilities*`, `/agents*` | AICP | ✅ |
| Agent/Workflow marketplace | `/agents`, `/agents/{id}/run`, `/agents/workflows/{id}/run` | AICP | ✅ |
| Global "Ask" assistant | `/inference` | direct | ➖ playground by design |
| use-cases / showcase / coverage | raw `/inference` (+ demo `system`) | demo | ➖ QA/demo surfaces, NOT in production nav |

**Conclusion:** no production business page builds prompts in the workspace. The only strict-purity
item is Knowledge Center's answer synthesis (optional to convert). The `/inference` playground and
demo surfaces are intentionally direct.

---

## Part 2 — Required AICP configuration (by resource)

### A. Models (registry — must be **enabled** and **granted to the SRCA tenant**)
See [[srca-aicp-model-registry]] for the live state. Needed:
| Purpose | SRCA key | Base model | Needed by |
|---|---|---|---|
| Chat / reasoning | `Qwen3.6-27B` | Qwen/Qwen3.6-27B (Active) | every capability + every `*-intelligence` service + V-GPT |
| Transcription | `transcribe-ar` | whisper-large-v3 (Active) | 997 Call Triage |
| Embedding | `embed-sovereign` | nomic-embed-text (Active) | all RAG / knowledge / talk-to-document |
| Rerank | `rerank-sovereign` | bge-reranker-v2-m3 (Active) | retrieval quality |
| Vision / OCR | `vision-ocr` | qwen2-vl-7b-instruct (Active) | document/contract/RFP scan upload |
| (optional) Arabic chat | `arabic-llm`, `cmd-llm` | llama3.2:3b (**Turned OFF**) | enable only if a capability/route pins them |

**Action:** ensure a **routing policy** points SRCA chat/inference at `Qwen3.6-27B` (the llama chat
models are off). Confirm no capability or routing rule is pinned to `arabic-llm`/`cmd-llm`.

### B. Connector (Command Center data)
- **SQL connector** `srca_datalake` (id `e9f0d012-1429-4e49-9c65-c88531404039`) — live-query mode, 25
  saved queries. ✅ done. Keep the read-only role + saved queries in sync with the DB schema.

### C. AI Capabilities (`/ai-capabilities/{id}/run` — ids stored in workspace `/settings/aicp`)
| Capability | Purpose | Status |
|---|---|---|
| Executive Briefing | `{headline,bullets}` for the daily briefing | ✅ built (`cb471d19…`) |
| Forecast | `{forecast:[…]}` call-demand | ✅ built (`0a29054b…`) |
| Recommendations | `{recommendations:[…]}` | ✅ built (`12d0a4c0…`) |
| Copilot | conversational ops answer | ✅ built (`6f6ad705…`) |
| Knowledge | grounded knowledge answer | ✅ built (`e2936294…`) |
| What-If | `{projected:{…}}` scenario impact | ✅ built (`8cff00e9…`) |
| **Ask-Your-Data** | NL analytics over ops (AI Intelligence) | ⬜ optional — **falls back to Copilot**; build a NL→SQL/analytics capability for best results |
| **997 Call Triage** | transcript → `{severity,protocol,dispatch,summary}` (JSON) | ⬜ **build** — falls back to Copilot until then; set id in `/settings/aicp` |
| **Document Chat** (new) | `{collection/doc, question}` → grounded answer w/ citations | ⬜ **build** — for the talk-to-document enhancement (Part 3) |

### D. Intelligence services (the `/{domain}-intelligence/*` endpoints)
Each of the 11 services must be: **enabled**, **bound to an active chat model** (Qwen3.6-27B), with a
**governance policy** attached. Document/Contract/RFP additionally use an **OCR pipeline** for scans.
- Confirm each `analyze`/`report`/`cv-review`/`spend-analysis`/… service returns the structured JSON
  the centers expect (they render `analysis.*` fields; a non-structured response falls to raw text).

### E. Knowledge collections (RAG)
- Existing SRCA collections: `first-aid-training`, `ems-protocols`, `clinical-guidelines`,
  `medical-protocols`, `dispatch-procedures`, `disaster-response`.
- Knowledge Center + Copilot/Knowledge capabilities need at least one collection **granted to SRCA**,
  ingested with `embed-sovereign`, and searchable via `/knowledge/hybrid-search`.
- **New (talk-to-document):** a place to ingest an uploaded document — either a per-tenant
  `documents-scratch` collection or ephemeral per-session collections (see Part 3).

### F. OCR pipelines
- At least one OCR pipeline (traditional / vision via `vision-ocr` / hybrid) enabled for SRCA, since
  `UploadDocButton` lists `/ocr/pipelines` and falls back to `/documents?extract=false`.

### G. Agents & Workflows
- **Agents:** `/agents` must return SRCA-scoped agents for the Agent marketplace + `capabilities-run`;
  each runnable via `/agents/{id}/run`.
- **Workflows:** `/agents/workflows/{id}/run` targets must exist for the Workflow marketplace.

### H. Governance / HITL / Trust (read by AI Intelligence › Governance)
- Risk models, guardrails, compliance policies, control families configured (the governance bug fix is
  already applied). HITL **validation queues** created so the review-queue tile populates.

### I. Observability & cost (read by AI Intelligence › Model & Cost)
- Metrics + cost metering enabled (read-only; no build). Optional **cost budgets** for the burn bars.

---

## Part 3 — Enhancement plan: simulate the customer's enterprise apps with AICP embedded

**Purpose (demo intent):** show SRCA that these AICP use cases drop straight into their **existing
enterprise systems** — Document Management System, Correspondence Tracking System, Meeting Management
System, Contract/Tender management, HR system, etc. Each center should therefore *look and behave like a
realistic slice of that enterprise app* (its native views, records, metadata, workflow) with the AICP
capability embedded inside it — not a bare paste-box.

**Data strategy:** the enterprise **records are simulated/seeded** (a realistic set of SRCA documents,
correspondence, meetings, contracts — same approach as the Command Center's seeded data lake), so the
demo feels like the real system. The **intelligence is genuinely AICP** (upload/ingest → capability →
render). This keeps the pitch honest: "your DMS + AICP = this," with real AI over representative data.

Concretely, each center gains: the enterprise-app **shell** (list/inbox/library + record viewer +
metadata/workflow), a **"talk to the record"** chat scoped to the open item, and that domain's
structured analysis + actions.

### Enterprise-app framing per center (what the shell simulates)
- **Document** → **Document Management System**: library/folders, document list with metadata (type,
  owner, date, classification), viewer, version — AICP: talk-to-document, translate, compare, extract.
- **Correspondence** → **Correspondence Tracking System**: inbox/register with reference numbers,
  sender/recipient, routing status — AICP: summarise, triage, draft reply, "ask this letter".
- **Meeting** → **Meeting Management System**: meetings list, agenda, attendees, minutes, action items —
  AICP: transcribe/summarise, extract decisions & actions, "ask this meeting".
- **Contract / RFP** → **Contract & Tender Management**: contract/tender register + document viewer —
  AICP: clause/obligation Q&A, risk, compliance matrix (already structured).
- **HR** → **HR system**: candidate/job records — AICP: CV review, JD generation, "ask this CV".
- **Procurement / Project / Research / Compliance / Executive** → same shell over their record type.

### Reference implementation: **Document Center → Document Management System** (build first)
1. **Viewer** — render the uploaded/selected file (PDF via inline viewer; images inline; OCR text
   pane for scans). Source list of recent/selected documents from `/documents` + `/intelligence/history`.
2. **Talk-to-document** — a chat panel scoped to the open document:
   - On open: ensure the document text is available (upload → `/documents` OCR, or existing record).
   - Ingest into a document-scoped collection: `POST /knowledge/collections/{id}/documents` (embed via
     `embed-sovereign`).
   - Each question → a **Document Chat capability** (`{collection, question}` → grounded answer +
     citations) so the workspace stays prompt-free. Cite passages back into the viewer (highlight).
3. **Actions** — translate (`/document-intelligence/translate`), compare (`/compare`), searchable PDF
   (`/searchable-pdf`), extract entities (graph `/graph/*`), export report.

### Then replicate the pattern per center (viewer + chat + domain actions)
- **Contract** — viewer + "ask this contract" (clause/obligation Q&A grounded in the doc) + risk/renewal
  actions (already has the structured analysis).
- **Correspondence** — letter viewer + reply-draft + "summarise/triage this correspondence".
- **RFP/Tender** — document viewer + "does our proposal meet requirement X?" grounded chat + compliance
  matrix (already structured).
- **HR / Meeting / Procurement / Research / Project / Compliance / Executive** — the same shell: a
  source viewer + a document-/record-scoped chat + that domain's structured analysis and actions.

### Additional AICP configuration this enhancement needs
- ⬜ **Document Chat capability** (grounded doc-QA; returns answer + citations). One shared capability can
  serve all centers (parameterised by collection), or one per domain if prompts differ.
- ⬜ **Document-scoped ingestion** — decide ephemeral per-session collections vs. a reusable
  `documents-scratch` collection; ensure `embed-sovereign` + `rerank-sovereign` are used.
- ⬜ **Retention/governance** on ingested documents (clearance filtering, redaction on ingest) so
  talk-to-document respects the same governance as every other surface.
- ✅ Models already present: `vision-ocr` (OCR), `embed-sovereign` (embed), `rerank-sovereign` (rerank),
  `Qwen3.6-27B` (answer).

### Recommended build order
1. **Document Center** viewer + talk-to-document (reference implementation) — needs the Document Chat
   capability + ingestion decision from AICP.
2. Roll the shell out to **Contract → Correspondence → RFP** (highest-value document-centric centers).
3. Remaining centers reuse the same shell.

> Nothing in Part 3 puts AI in the workspace: the viewer is pure UI, ingestion is an AICP call, and
> every answer comes from an AICP capability. The workspace only uploads, calls, and renders.
