# TNS per-reply feedback

Each completed TNS reply has its own Feedback control. A signed-in user can choose Positive or Negative; the server stores the selected reply text, sentiment, account ID, timestamp, and a SHA-256 reply hash in `server/Data/reply-feedback.json` (file permissions are restricted where supported).

To allow the TNS owner account to review feedback through the authenticated API, set `TNS_OWNER_EMAIL` to the exact email address of the owner's TNS account and restart the server. While signed in to that owner account, request `GET /api/tns-ai/reply-feedback`. Other accounts receive HTTP 403. The endpoint is not public.

The storage file can also be reviewed directly by an authorized server operator. No email/SMS push notification is configured by this change; feedback is persisted for owner review.
