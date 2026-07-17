# Bug report for the AICP terminal — analysis endpoints ignore output language (default to English)

The workspace "Intelligence" surfaces (letter triage, meeting minutes, contract/RFP/HR/compliance/
executive/project/research/spend analysis, document analysis) all call the AICP analysis endpoints and
render structured JSON. **Every one of them returns English field values regardless of the input
document's language or the user's locale** — so an Arabic letter analysed in Arabic mode comes back in
English. File refs are into the AICP backend (`/d/Projects/AI Platform`).

## Root cause

1. The request schema has **no language field**:
   - `backend/app/workspace/analysis/schemas.py` → `AnalyzeRequest` = `{ text, title, source }` (and
     the sibling request models `ComplianceRequest`, `ExecutiveRequest`, `ResearchRequest`, … likewise
     carry no `language`/`locale`).
2. The system prompts list **English field descriptions** and give no output-language instruction, so
   the model defaults the *values* to English:
   - `backend/app/workspace/analysis/prompts.py` → `CORRESPONDENCE_SYSTEM` ("You are a government
     correspondence officer triaging an incoming letter. Return ONLY a single valid JSON object … with
     exactly these keys: …") and the parallel `*_SYSTEM` prompts for meeting/contract/rfp/document/
     research/executive/spend/project/compliance.
3. The service builds `system + user` and runs inference with **no locale threaded through**:
   - `backend/app/workspace/analysis/service.py` → `AnalysisService._run(...)`.

So the language is never expressed anywhere in the pipeline; the model picks English.

## Impact

- Affects **all** `/{domain}-intelligence/analyze` (and `/analyze-*`) endpoints:
  correspondence, meeting, contract, rfp, document, hr, compliance, executive, project, spend,
  research. Bilingual (Arabic/English) tenants cannot get localized triage/summaries/analysis.
- Note: `/document-intelligence/translate` already takes `target_language` (`TranslateRequest`) and
  works correctly — that is the pattern the analysis endpoints should mirror.

## Fix (server) — preferred

1. Add an optional `language: str | None = None` (accept a name like "Arabic"/"English" or a BCP-47
   code) to `AnalyzeRequest` and the sibling analysis request schemas.
2. Thread it into the prompt: when set, append a directive such as *"Write all field VALUES in
   {language}. Keep the JSON keys exactly as specified (in English)."* to the system/user prompt in
   `AnalysisService._run` (or per-task prompt builder). Keys stay English (the UI maps them);
   only the human-readable values localize.
3. When `language` is omitted, **default to the language of the input document** (detect from `text`)
   rather than hard-defaulting to English — so an Arabic letter analyses in Arabic by default.

This keeps keys stable for parsing while localizing every value (summary, key points, suggested
response, decisions, action items, etc.).

## Current workspace workaround (temporary, remove once fixed)

Because the endpoint takes no language field, the workspace appends an explicit output-language
instruction to `text` for the correspondence triage
(`components/workspace/correspondence-tracking.tsx` → `analyse()`):
`"\n\n(تعليمات للمخرجات: اكتب قيم جميع الحقول باللغة العربية.)"` (or the English equivalent), keyed
to the UI locale. This is fragile (instruction rides inside the analysed text, and the 6000-char
server truncation can drop it on long inputs) and is only applied to correspondence so far — the
meeting/contract/hr/etc. analyses still default to English. A proper `language` param removes the need
for the hack across all centers.

## Paste-ready message to the terminal

> The analysis endpoints ignore output language and always return English. `AnalyzeRequest`
> (`backend/app/workspace/analysis/schemas.py`) has no language field, and the `*_SYSTEM` prompts
> (`prompts.py`, e.g. `CORRESPONDENCE_SYSTEM`) list English field descriptions with no output-language
> instruction, so `AnalysisService._run` (`service.py`) produces English values regardless of input
> language. Fix: add optional `language` to `AnalyzeRequest` and the sibling analysis request schemas,
> thread it into the prompt ("write all field VALUES in {language}, keep JSON keys in English"), and
> when it's omitted default to the input document's detected language instead of English. Mirror the
> existing `TranslateRequest.target_language` pattern. This affects correspondence, meeting, contract,
> rfp, document, hr, compliance, executive, project, spend and research analyses.
