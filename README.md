# TNS AI Studio v3

Mobile-first foundation for an all-purpose AI video studio.

## Added in v3
- Cleaner mobile UI and dark/light mode
- Universal video categories
- Structured long-video production plan
- Locked-character lab with the user's one-idea/one-character rule
- Separate voice/dialogue preparation for video + voice workflows
- Local project save/load
- Video upload preview
- Expanded editor tool surface
- Secure backend boundary for provider integration
- Health endpoint
- Provider-key safety guidance
- Modular structure for future providers, auth, storage, queues and admin controls

## Important
This package is a production-oriented foundation, not a claim that AI rendering or professional timeline export is already connected.
To make real generation work, connect one or more provider APIs server-side. For serious editing/export, add FFmpeg/WebCodecs on the server/client as appropriate.

## Run
1. Install Node.js 18+.
2. `npm install`
3. `npm start`
4. Open `http://localhost:3000`

## Production checklist
- Authentication + per-user authorization
- Database
- Private object storage + signed URLs
- Upload size/type limits and malware scanning
- FFmpeg sandboxing
- Background job queue and retries
- AI provider adapters with server-side secrets
- Webhook signature verification
- Rate limits / quotas / abuse protection
- HTTPS, secure headers, CSRF protection where applicable
- Audit logs and monitoring
- Admin-configurable models/categories/prompt templates
- Terms, privacy policy and deletion/export flows

Payment is intentionally not included in this version.


## v4 integration layer
- Provider adapter interface + mock provider
- Server video-job API (`POST /api/video/jobs`, `GET /api/video/jobs/:id`)
- Safe FFmpeg worker skeleton using `spawn()` argument arrays
- Environment-variable template for server-side provider credentials
- Security headers and request-size protection
- Clear separation between browser UI and rendering backend

### To activate real rendering
Choose a provider whose API terms/costs fit the project, implement its adapter under `server/providers/`, set the server environment variables, and connect the adapter to the job queue. Do not expose API keys in the browser.

### Production editing
Install FFmpeg on a secured worker machine/container and implement only allow-listed operations. Generated files should live in private object storage with signed download URLs.

### Still intentionally excluded
Payments, because you asked to leave payment aside.
