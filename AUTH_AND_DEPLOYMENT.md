# TNS — Authentication and Deployment Notes

TNS is designed as an India-origin product with worldwide availability.

## Authentication

- Passwords are hashed server-side with Node.js `scrypt`.
- Sessions are stored server-side and exposed to the browser only through an HttpOnly cookie.
- Production cookies use `Secure` when deployed behind HTTPS.
- OTPs expire and are limited to five attempts by default.
- OTP codes are not returned by the API unless `OTP_EXPOSE_CODE=true` is explicitly enabled for development/testing.

## Persistent storage

The current base uses local filesystem storage so the project can run without a database. This is suitable for development and controlled testing, not a final worldwide production deployment. Use a persistent database and object storage before public launch.

## External services

Configure real providers for Google OAuth, OTP delivery, AI generation, and removed communication module. The code does not claim these external services are live when they are not configured.

## Live Web Research (TNS)

To enable real multi-site web search in the TNS chat Research toggle, configure `TAVILY_API_KEY` in the server environment. The server calls Tavily's search API, passes the returned snippets and source URLs to the configured chat provider, and returns source metadata to the client. If the key is missing, invalid, rate-limited, or the search service fails, the API returns a clear error instead of pretending live research succeeded.

Important: with `TNS_AI_PROVIDER=mock`, live search can run, but TNS will show the retrieved results rather than claim an AI-generated synthesis. Configure a real chat-capable AI provider for synthesis and source comparison. Never place the Tavily key in frontend code or commit it to the repository.
