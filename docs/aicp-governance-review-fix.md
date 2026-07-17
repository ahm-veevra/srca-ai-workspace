# Brief for the AICP terminal — fix the risk-model rules across ALL orgs (stop blanket human-review holds)

## Symptom
Every V-GPT / chat answer is "Held for human review" (no output); "Why this answer?" shows pending review. Reproduced on SRCA, but the defect is platform-wide.

## Root cause (confirmed)
AICP's risk classifier matches a workload's `signals` against the tenant's **risk model**, first-rule-wins, then enforces that level's obligations (`require_human_review`, etc.) in the `GovernanceGate`.

The matcher `_match(when, signals)` in **`app/modules/governance/risk_service.py`** only understands **dict** `when` conditions — keys: `tags_any`, `ai_task_any`, `capability_category`, `classification_min`. But the seeded risk models use bare **string** `when` values. When `when` is a string, every `"<key>" in when` test is a false substring check, so `_match` returns `not (False and …)` = **True unconditionally** → the **first rule matches every request**, so classification/sensitivity is never actually consulted and all traffic is pinned to `critical`/`high` → `require_human_review`.

### Affected risk models (all use string rules — all broken)
```
defense-risk-model      [{"when": "classified", "level": "critical"}, {"when": "personal_data", "level": "high"}]
government-risk-model    [{"when": "personal_data", "level": "high"}, {"when": "public_facing", "level": "high"}]
health-risk-model        [{"when": "classified", "level": "critical"}, {"when": "personal_data", "level": "high"}]
# eu-ai-act-risk is already correct (dict rules) — leave it.
```
### Affected source files (each defines the three models above)
`app/commissioning/{moc,moh,rslf,sfes,srca}/governance.py` — the `classification_rules` (the `i[5]` element of each risk-model tuple; grep `"when": "classified"` etc.).

## Fix — apply to ALL, in three parts

### Part A: Rewrite the string rules as dict conditions, in every commissioning file
In **each** of `app/commissioning/{moc,moh,rslf,sfes,srca}/governance.py`, replace the three models' `classification_rules` so ordinary INTERNAL/PUBLIC chat falls through to `default_level` (`"limited"`, no review) and only real signals escalate:

```python
# health-risk-model
[
    {"when": {"classification_min": "SECRET"},       "level": "critical"},
    {"when": {"classification_min": "CONFIDENTIAL"}, "level": "high"},
    {"when": {"tags_any": ["medical-diagnosis", "patient-data"]}, "level": "high"},
],

# defense-risk-model
[
    {"when": {"classification_min": "SECRET"},       "level": "critical"},
    {"when": {"classification_min": "CONFIDENTIAL"}, "level": "high"},
],

# government-risk-model
[
    {"when": {"classification_min": "SECRET"}, "level": "high"},
    {"when": {"tags_any": ["public-facing"]}, "level": "high"},
],
```
Keep each `default_level="limited"` and the existing `obligations` maps unchanged. Tune thresholds/tags to policy — the requirement is: **dict** conditions, and normal chat (INTERNAL, no high-risk tags) lands on `default_level`. (If the three definitions are duplicated verbatim across the five files, consider hoisting them to one shared constant to prevent future drift.)

### Part B: Migrate the already-seeded rows (all tenants, by model key)
Risk models are already persisted per tenant in `risk_models`, so a source change alone won't take effect. Re-seed, or ship a data migration updating existing rows **by key** (covers every org):

```sql
UPDATE risk_models SET classification_rules = '[
  {"when": {"classification_min": "SECRET"},       "level": "critical"},
  {"when": {"classification_min": "CONFIDENTIAL"}, "level": "high"},
  {"when": {"tags_any": ["medical-diagnosis","patient-data"]}, "level": "high"}
]'::jsonb WHERE key = 'health-risk-model' AND deleted_at IS NULL;

UPDATE risk_models SET classification_rules = '[
  {"when": {"classification_min": "SECRET"},       "level": "critical"},
  {"when": {"classification_min": "CONFIDENTIAL"}, "level": "high"}
]'::jsonb WHERE key = 'defense-risk-model' AND deleted_at IS NULL;

UPDATE risk_models SET classification_rules = '[
  {"when": {"classification_min": "SECRET"}, "level": "high"},
  {"when": {"tags_any": ["public-facing"]}, "level": "high"}
]'::jsonb WHERE key = 'government-risk-model' AND deleted_at IS NULL;
```

### Part C (safety net — do this too): fail-closed on non-dict `when`
So a stray string rule can never again silently match-all, make `_match`/`classify` in `app/modules/governance/risk_service.py` treat a non-dict `when` as an authoring error — **skip the rule and log a warning** (fail to "does not match"), consistent with the module's existing "no silent misconfiguration" stance (`unrecognized_obligations`). e.g. at the top of `_match`:
```python
if not isinstance(when, dict):
    logger.warning("risk rule 'when' is not a dict, ignoring rule: %r", when)
    return False
```
Note: Part C alone stops the blanket holds immediately (broken string rules get skipped → everything falls to `limited`), but Parts A+B are still required so genuinely sensitive workloads escalate correctly.

## Acceptance tests
1. An INTERNAL chat (no high-risk tags) under each of health/defense/government models → classifies as **`limited`**, obligations contain **no** `require_human_review` → V-GPT returns output with **no hold**.
2. A **SECRET** (or `medical-diagnosis`/`public-facing`-tagged) workload → still escalates to high/critical **with** `require_human_review`.
3. A rule authored with a bare string `when` → skipped + warned (Part C), not matched.
4. Extend the governance/risk_service tests to cover the above for all three models.

## Workspace-side note (coordination)
After this fix, ordinary V-GPT chat (INTERNAL) lands on `limited`, so no workspace change is required. Optionally the SRCA workspace can declare `classification: "PUBLIC"` on its inference calls (`components/workspace/v-gpt.tsx`) — but that only matters once the rules honor `classification_min`, which is exactly what Part A restores.
