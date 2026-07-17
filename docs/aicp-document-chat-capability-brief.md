# Brief for the AICP terminal — build the "Document-Chat" capability (SRCA)

**Goal:** stand up an AICP **AI Capability** that answers a user's question **grounded in an
attached reference document** (a meeting transcript/MoM, a letter, a contract, an uploaded file's
OCR text, etc.). This is the engine behind every Intelligence Center's **"Ask this record"** chat
(Meetings, Documents, Correspondence, Contract, RFP, HR, Procurement, Compliance, Executive,
Project, Research) and the Meetings **Ask this meeting** panel.

## Why this is needed (the bug it fixes)

The workspace's `Document-Chat Capability` slot is currently **blank**, so all "Ask this record"
chats fall back to the **Copilot** capability (`6f6ad705-06e0-4776-8171-a9f56f651674`). That
capability's prompt is the *"SRCA 997 operations copilot"* scoped to **live operational data** — so
when a chat sends an attached document, the copilot **refuses to read it** and answers e.g.:

> "The meeting minutes are irrelevant to the SRCA 997 operations copilot, which relies on live
> operational data rather than historical project documentation."

That is why "Ask this meeting" appears to not answer *about the meeting*. The runs complete
successfully — the wrong capability just won't ground on the document. The fix is a dedicated
grounded-Q&A capability.

**Tenant:** Saudi Red Crescent Authority (`edbead82-7fb7-4d43-8bd2-7bc07e20c761`).

---

## What the workspace sends / expects

- Call: `POST /api/v1/ai-capabilities/{capability_id}/run` with body:
  ```json
  { "input": "<user question>\n\n[Reference document: \"<title>\"]\n<document text>\n\nRespond in English." }
  ```
  - The **question comes first**, then a `[Reference document: "…"]` block with the full text.
  - The last line is a language directive — **`Respond in Arabic.`** or **`Respond in English.`** —
    which the capability must honour (answer in that language regardless of the document's language).
  - Document text is truncated by the workspace to ~12k chars.
- Response the workspace reads: `output` as a **string** (the answer), plus optional
  `meta.model` / `meta.selected_model_key` for lineage. An empty/non-string `output` is treated as
  "no answer".
- Runs under the **signed-in user session** (capabilities are user-entitled — do **not** grant this
  to the SRCA Workspace application; it is not a kiosk/data-plane surface). Per-user audit/clearance
  applies.

## Capability spec

| Field | Value |
|---|---|
| key | `srca-document-chat` |
| name | SRCA Document Chat (grounded Q&A) |
| kind | `chat` |
| model | a capable **multilingual** model (Qwen3.6-27B is fine, or the SRCA default) |
| tools | none |
| live-data grounding | **none** — must NOT inject 997 live ops data (that's what breaks it) |

### System prompt (paste-ready)

```
You are a document assistant for the Saudi Red Crescent Authority (SRCA). Each request contains a
user question followed by a reference block in the form:

  [Reference document: "TITLE"]
  <the full text of the document>

Answer the user's question using ONLY the information in that reference document. Quote or
paraphrase the relevant parts. If the answer is not present in the document, say clearly that the
document does not contain it — do not invent facts and do not fall back to any other data source.
Do not claim you only have "live operational data"; your source is the attached document.

Always answer in the language requested by the final directive line ("Respond in Arabic." or
"Respond in English."), even if the document is written in the other language. Keep answers concise
and use Markdown (short paragraphs, bullet lists, tables) when it aids clarity.
```

## Governance note

Meeting/EMS/clinical content can classify high. Ensure the SRCA governance profile bound to this
tenant does **not** escalate this capability's `chat` runs to *require_human_review* (this was
already rebound to `ems-ai-risk-model-v2` / `government-services-risk-model-v2`, and the
"Confidential Marking Detection" guardrail set to `flag`). Grounded Q&A over an internal document
should complete without a human-review hold.

## Wire-up (workspace side — already done ✅)

Set the resulting capability **id or key** in `/settings/aicp → "Document-Chat Capability"`. That
one setting powers every center's "Ask this record" chat. No further workspace change is needed.
