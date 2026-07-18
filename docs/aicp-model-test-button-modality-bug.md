# Bug report for the AICP terminal — model "Test configuration" always chat-probes (false failure for non-chat models)

The model registry's **"Test configuration"** action reports a failure for a **correctly configured,
working** transcription (STT) model — and would do the same for embedding / rerank / vision models —
because the test always sends a **chat** request regardless of the model's modality.

## Symptom

Testing an enabled `modality=transcription` model returns:

```
All models failed after 2 attempt(s): onprem returned 404: {"detail":"Not Found"}  (stage: orchestrate)
```

The model itself is fine — audio transcription through `/api/v1/transcription/transcribe` works
(verified: 200 in ~2.4s, `{"text":"…","model":"transcribe-ar","language":"en"}`).

## Root cause

The test sends a **chat completion**, hard-coded, to every model:

- `backend/app/modules/registry/schemas.py:149` — `ModelTestRequest.prompt` defaults to
  `"Reply with the single word: pong."` (a chat prompt).
- The run resolves to the chat path: `backend/app/adapters/openai_adapter.py:63` →
  `POST {base_url}/chat/completions`.
- A transcription/STT provider (e.g. a Whisper-compatible service) exposes
  `POST {base_url}/audio/transcriptions` and `GET {base_url}/models` — **but no `/chat/completions`** —
  so the probe 404s. The real transcription path uses the correct endpoint
  (`openai_adapter.py:208` → `POST {base_url}/audio/transcriptions`), which is why actual
  transcription works while the test button fails.

The same false failure applies to **embedding**, **rerank**, and **vision** models — none of them
serve `/chat/completions`, but the test always chat-probes them.

## Impact

- Operators can't validate a transcription/embedding/rerank/vision model from the UI; the button
  reports a hard failure on models that are correctly configured and working.
- The misleading 404 sends people to debug the model/provider config when nothing is wrong.

## Fix

Make the test **modality-aware** — send a probe appropriate to `model.modality`:

| modality | probe |
|---|---|
| chat | current `POST /chat/completions` with the pong prompt |
| transcription | `POST /audio/transcriptions` with a tiny bundled audio clip (a fraction of a second of silence) |
| embedding | `POST /embeddings` with a short string |
| rerank | `POST /rerank` with a trivial query/doc pair |
| vision | `POST /chat/completions` (or the provider's vision path) with a tiny bundled image |

At minimum, if a modality-specific probe isn't implemented, **don't run the chat probe** for non-chat
modalities — skip it and label the result "not testable from here / validate via the feature" rather
than reporting a false 404.

## Reference — a correctly-configured transcription model (that the button still fails)

Tenant SRCA (`edbead82-…`), model `transcribe-ar`:
- `modality = transcription`, `status = enabled`
- `model_name = Systran/faster-whisper-small`
- provider `base_url = http://whisper:8000/v1` (local `veevra-whisper-1` STT container, OpenAI-compatible;
  internal service name `whisper:8000`, host port `:8001`)

`/transcription/transcribe` against this returns 200 and a transcript — only the chat-based test
button reports failure.
