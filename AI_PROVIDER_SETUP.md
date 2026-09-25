# TNS Studio — AI Provider Setup

TNS Studio uses a provider-independent AI layer. No API key is stored in the repository.

## Development
The `mock` provider is available for local UI/testing only. It must not be used as the production AI service.

## Production HTTP provider
Set:
- `VIDEO_PROVIDER=http`
- `IMAGE_PROVIDER=http`
- `VOICE_PROVIDER=http`
- `TNS_VIDEO_PROVIDER_URL=...`
- `TNS_IMAGE_PROVIDER_URL=...`
- `TNS_VOICE_PROVIDER_URL=...`
- `TNS_VIDEO_PROVIDER_STATUS_URL=...` (optional; use `{jobId}` or `{id}` for the provider job ID)
- `TNS_IMAGE_PROVIDER_STATUS_URL=...` (optional; use `{jobId}` or `{id}` for the provider job ID)
- `TNS_VOICE_PROVIDER_STATUS_URL=...` (optional; use `{jobId}` or `{id}` for the provider job ID)
- `TNS_AI_PROVIDER_API_KEY=...` (only if the selected provider requires a bearer key)

The configured endpoints should return JSON describing the created job/result. This adapter is intentionally provider-neutral so TNS Studio can later use a commercial provider or a self-hosted TNS AI engine without redesigning the app.

## Production rule
When `NODE_ENV=production`, the server refuses the `mock` provider and returns a configuration error until a real provider is connected.

Never commit provider API keys, passwords, OTP secrets, OAuth client secrets, payment secrets or storage credentials to GitHub. Use deployment secrets/environment variables.

## Editor
FFmpeg is used for server-side MP4 export. The deployment environment must provide FFmpeg or set `FFMPEG_PATH` to the executable.
