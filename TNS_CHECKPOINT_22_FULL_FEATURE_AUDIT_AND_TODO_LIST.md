> **Historical record only:** This checkpoint describes an earlier build. It is superseded by `TNS_CHECKPOINT_45_MODULES_REMOVED_AUDIT.md`; the five standalone modules listed there are not part of the current build.

# TNS Studio — Checkpoint 22: Feature Audit & Master To-do List

## Scope and honesty
This audit was prepared from Checkpoint 21's source, its locked requirements, existing test scripts, server routes, and production-status notes. It is a **source/static audit**, not proof that every screen works in a real browser or on a phone. No application code, UI, or existing feature was changed for this audit; this file is the only intended addition in Checkpoint 22.

## Verification run on Checkpoint 21 before this audit
- ZIP integrity (`unzip -t`): PASS — no corrupt archive entries.
- `npm test`: PASS — `SMOKE_TESTS_OK`, `UI_AUDIT_OK`, `VOICE_DICTATION_AUDIT_OK`, `ATTACHMENT_RETRY_AUDIT_OK`, `DEMO_PROVIDER_HONESTY_AUDIT_OK`, `CHAT_RETRY_BUTTON_AUDIT_OK`.
- `npm run syntax`: PASS — `JS_SYNTAX_OK`.
- Two `Invalid email/mobile number or password` errors were printed by negative-login test cases; the test command still exited successfully. These are expected rejection paths, not proof of a successful login flow.
- Live browser/mobile end-to-end testing was **not performed**.

## What is verified in source/tests
| Area | Current evidence | Status / limitation |
|---|---|---|
| App packaging | Checkpoint 21 ZIP opens and integrity check passes | PASS for archive only |
| JavaScript syntax | `npm run syntax` | PASS |
| Existing smoke checks | `tests/smoke.js` | PASS; not full production E2E |
| UI structural audit | `tests/ui-audit.js` | PASS; static assertions, not visual mobile review |
| Voice/dictation | `tests/voice-dictation-audit.js` | PASS for audited source conditions; microphone/browser permission flow not device-tested |
| Attachment retry | `tests/attachment-retry-audit.js` | PASS for audited source conditions; real upload/retry not device-tested |
| AI demo/provider transparency | `tests/demo-provider-honesty-audit.js` | PASS for audited honesty conditions; does not mean real AI provider is connected |
| Chat retry button | `tests/chat-retry-button-audit.js` | PASS for static retry-button/guard checks; duplicate network requests not measured in a live browser |
| Exact retry payload | `public/app.js` restores original message and retained file before retry | Source behavior present; file-input/DataTransfer compatibility needs browser testing |
| Retry duplicate guard | `retryStarted` blocks a repeated click on the same retry button | Source behavior present; no live event/network test was performed |

## Server/API surface found in source
Routes are present for health, signup/login/logout/session, Google OAuth entry/callback, OTP request/verify/login, password change/reset, projects, TNS Contact users/matching/chats/groups/messages/status/settings, video/file uploads, editor export/tools, TNS AI chat/document understanding, and video/image/voice jobs.

**Important:** A route existing is not the same as an end-to-end feature working. Each route still needs authenticated integration tests and, where applicable, a real provider/storage configuration.

## Feature-by-feature status against locked requirements
| Feature | What source indicates | Current status |
|---|---|---|
| TNS Studio branding / chat-first home | Main app source and design references exist | Source present; real-device visual confirmation pending |
| Signup, email/mobile login, logout, session/password security | Auth routes and production-status notes exist; smoke tests pass | Partially verified by automated checks; full signup/login/recovery flow must be tested against a clean database and deployment |
| OTP delivery | OTP request/verify routes exist | Provider-dependent; real email/SMS delivery not verified/configured here |
| Google login | OAuth routes exist | Requires client credentials/callback configuration; not live-verified |
| Language selection | Language config reports 184 language choices; English/Hindi packs, other-language English fallback noted | Source present; translation completeness and mobile selection flow need review |
| TNS AI text chat | Chat and understand routes; mock/configurable provider architecture | Chat retry tests pass; production AI response requires configured provider; live request not tested |
| Voice input / conversation | Voice/dictation code and audit exist | Static audit passes; microphone permissions, recording, playback and mobile-browser behavior unverified |
| Photo/document attachments | Upload/understand routes and attachment retry audit exist | Source path present; supported file types, size limits, real upload and provider understanding need E2E testing |
| Edit Video | Editor JS/CSS and server tool/export routes exist; multiple rebuild/audit docs present | Architecture/source present; every editing tool and export quality must be manually tested; not declared fully complete |
| AI Video | Video job create/status routes exist | Provider-dependent; generation, preview, regenerate, download and quality not live-verified |
| AI Image | Image job create/status routes exist | Provider-dependent; generation/edit/upscale/download not live-verified |
| AI Voice | Voice job create/status routes exist | Provider-dependent; real generation/playback/download not live-verified |
| Projects | Project list/create/detail routes exist | Route presence only; persistence, ownership, save/reopen/delete workflow need integration tests |
| TNS Contact | Users, matching, chat, group, messages, status, settings routes exist | Basic API surface present; real-time delivery, media, privacy locks/hide, notifications and calls need full testing/integrations |
| Global/module settings | Requirements/docs define settings | Must verify every control persists and affects only the intended module in UI |
| Premium/payments/ads | Production notes say payment/subscription and ad services remain to configure | NOT production-ready until explicitly integrated and tested |
| Push notifications | Listed as external service still required | NOT connected/verified |
| Real calls | WebRTC signaling + STUN/TURN listed as required | NOT production-ready |
| Production database/storage | Persistent database and private object storage listed as required | Deployment dependency; cannot claim production persistence/private signed URLs without setup and tests |
| Monitoring/backups/secrets/WAF | Listed in production notes | Deployment tasks pending |
| Accessibility/mobile usability | Static UI audit only | Real iPhone/Android browser, keyboard, screen-reader, upload and viewport testing pending |

## Master to-do list (recommended verification order)

### P0 — Must verify before calling a release ready
- [ ] Run the app on a clean install and check `/health` plus static assets load without console errors.
- [ ] End-to-end signup → logout → login with email and mobile, including wrong password and password visibility toggle.
- [ ] Verify OTP request, expiry, attempt limit and successful verification using a configured test provider; do not treat an unconfigured provider as working.
- [ ] Verify forgot/reset password and session timeout on the configured database.
- [ ] Confirm authorization/ownership checks for projects, contact data, uploads, exports and AI jobs using two different test accounts.
- [ ] Test chat: text-only success/failure, repeated Retry clicks, exact old message retry when a new draft/file exists, attachment failure/retry, and request count in browser Network panel.
- [ ] Test TNS AI voice/mic permissions and file/photo/document understanding on Android Chrome and iPhone Safari where available.
- [ ] Verify no production secrets are bundled and all provider-missing states are clearly disclosed.

### P1 — Verify creator workflows end-to-end
- [ ] Edit Video: upload, preview, trim, split, crop, rotate, resize, speed, audio, text/captions, filters/effects, timeline, export, download and reopen output.
- [ ] Confirm export actually produces playable MP4 at selected resolution and handles large files/errors gracefully.
- [ ] AI Video: text/image-to-video, settings, job progress, failure/retry, preview and download with a real configured provider.
- [ ] AI Image: text/reference generation, edit/variation, output preview, save/download and hand-off to video/editor.
- [ ] AI Voice: create job, play/download output, and handle provider failure.
- [ ] Projects: create, save, list, reopen, update and delete; confirm user A cannot access user B's project.
- [ ] TNS Contact: 1:1/group messages, attachments, voice messages, status, settings, app/chat lock and hidden chats; test delivery across two accounts.
- [ ] Check global settings and each module's separate settings persist and do not alter other modules.

### P2 — Production integrations / release readiness
- [ ] Configure persistent database and private object/media storage with authorization and expiring signed URLs.
- [ ] Configure email/SMS OTP and Google OAuth credentials/callbacks.
- [ ] Configure real AI video/image/voice providers and test quota, timeout, retry and cost/error reporting.
- [ ] Configure WebRTC signaling, STUN/TURN, push notifications and privacy-safe notification previews.
- [ ] Configure payments/subscriptions and ads only according to the approved product decisions.
- [ ] Configure monitoring, alerts, backups/restore drill, secrets management, rate limiting and deployment security.
- [ ] Perform responsive visual/accessibility checks, upload limits, performance checks and a release regression run.

## Next focused code task
Do not start changing unrelated modules based only on this static report. First run the Retry scenario in a real browser with the Network panel and verify that repeated clicks result in exactly one request. If it fails, make one focused retry-only fix in the next checkpoint and add a behavioral regression test. If it passes, move to the next highest-priority P0 workflow and keep the other code unchanged.
