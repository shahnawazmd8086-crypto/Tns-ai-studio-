# TNS Chat Step 29 — Website task progress tracking

## Added
- Authenticated endpoints: `POST /api/tns-ai/browser/task/start`, `/task/update`, and `/task/status`.
- User-bound task/step tracking with statuses: pending, in_progress, waiting_for_user, blocked, completed, failed.
- Optional public website URL per step, validated with the existing public URL validator.
- Approval-required steps cannot be marked completed unless the caller indicates an approval record exists.
- Secret-like task goals and notes are rejected; no passwords, OTPs, tokens, cookies, or payment details should be stored.
- New `tests/browser-task-progress-audit.js` included in `npm test`.

## Important limitations
- This tracker is in-memory only. Server restart loses tracked tasks; it is not a durable task/session store.
- The endpoints record progress only; they do not operate a browser or prove that an external action succeeded.
- `approvalRecorded: true` is a caller-supplied status guard, not cryptographic proof of approval. Actual execution must still go through the separate ActionReview approval-ticket workflow.
- No live Browserless/website integration was tested as part of this step.

## Verification
- `npm run syntax`: PASS
- `npm test`: PASS (expected invalid-login messages appear during negative HTTP tests)
- ZIP integrity: checked after packaging.
