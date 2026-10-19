# TNS Chat Step 33 — Task list filters and counts

## Change
- Task list supports `activeOnly: true`, a validated task `status` filter, and a bounded `limit` (1–50).
- Response includes counts for the signed-in user's total, active, completed, matched, and returned tasks.
- Filtering remains read-only: it never opens a website, executes a step, or reuses an approval.
- The bundled default task store is reset to an empty JSON array so sample/test task records are not shipped as real user data.

## API
Authenticated endpoint: `POST /api/tns-ai/browser/task/list`
Example body: `{ "activeOnly": true, "limit": 20 }`
Optional status filter: `pending`, `in_progress`, `waiting_for_user`, `blocked`, `completed`, or `failed`.

## Verification
Run `npm run syntax` and `npm test`. This is automated code-level verification only; it does not establish that live website automation works in a deployed environment.
