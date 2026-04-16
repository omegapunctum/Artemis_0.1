# Moderation Publish Runbook (Airtable staging)

## 1) Purpose / scope
This runbook is for operators/moderators handling moderation publish failures and recovery in the Airtable-backed runtime moderation flow.
It covers only current implemented behavior (submit/review/approve/reject + Airtable staging sync), not future automation.

## 2) Normal path (expected)
1. User submits draft for review (`draft` -> `pending`).
2. Moderator approves draft.
3. Runtime attempts Airtable publish/sync.
4. On success:
   - draft is marked as approved/published;
   - `airtable_record_id` is linked;
   - `publish_status` is `published`.

## 3) Failed publish handling (`publish_status=failed`)
What it means:
- Runtime approve reached Airtable publish step but Airtable request failed (network/HTTP/external error path).

Safe first checks:
1. Confirm draft currently has `publish_status=failed`.
2. Check whether `airtable_record_id` is already present (duplicate/already-published case may exist).
3. Check moderation result hint (response header `X-Moderation-Result`, if present) and recent moderation publish logs/events.

What **not** to do:
- Do not manually mutate draft system fields in DB.
- Do not bypass moderation runtime path with direct dataset/public publish actions.

## 4) Retry guidance (safe operator behavior)
Retry via regular approve endpoint is acceptable when:
- failure is external/transient (Airtable/network);
- draft remains in moderation-eligible state;
- no conflicting duplicate signal indicates ambiguous final state.

Before retry:
1. Check whether existing Airtable record linkage is already detected.
2. Check last moderation result (`published_created`, `published_skipped_duplicate`, `approved_already_published` when available).

When repeated retries are inappropriate:
- repeated 502/failures with no signal change;
- inconsistent local state vs Airtable reality;
- unclear duplicate identity outcome.

## 5) Escalation conditions
Escalate to engineering/owner when any of the following occurs:
- repeated publish failures (502/external) for the same draft after safe retries;
- suspected duplicate ambiguity (state does not converge to clear published/skipped result);
- inconsistency between draft status and Airtable record reality;
- expected moderation signals (result hint/log events/metrics) are missing or contradictory.

## 6) Observability cues to use
Use only currently available cues:
- draft fields: `status`, `publish_status`, `airtable_record_id`;
- moderation response hint header: `X-Moderation-Result` (when endpoint returns it);
- moderation publish logs/events and publish success/fail metrics.

## 7) Constraint note
This runbook is intentionally short and operational.
It does not redefine architecture, does not introduce new tooling, and does not promise automatic recovery beyond current runtime behavior.
