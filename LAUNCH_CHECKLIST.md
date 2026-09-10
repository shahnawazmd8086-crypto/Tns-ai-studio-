# TNS AI Studio — Launch Checklist

## Already included
- Mobile-first studio UI
- Universal video categories
- Realistic-video prompt rules
- One-idea/one-locked-character workflow
- Separate voice/dialogue workflow
- Project save/load
- Video upload/preview
- AI job API boundary
- Provider adapter architecture
- FFmpeg worker foundation
- Server-side secret configuration
- Security headers and request-size limit
- No payment

## Required before REAL public AI rendering
1. Choose an AI video provider/model.
2. Put its API key ONLY in server environment variables.
3. Implement that provider's adapter in `server/providers/`.
4. Add a production job queue (Redis/managed queue) and database.
5. Add private object storage + signed URLs.
6. Add authentication and per-user authorization.
7. Add upload scanning/limits and sandboxed FFmpeg workers.
8. Add monitoring, retries, quotas and abuse protection.
9. Deploy behind HTTPS.
10. Test generated videos on Android and desktop.

## Important
This package does not pretend that a provider is connected when no provider credentials exist. The included mock job proves the UI/backend job flow only. A real rendered video requires a live provider account/API and its current API terms/costs.
