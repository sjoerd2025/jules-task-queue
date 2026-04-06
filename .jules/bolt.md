## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2024-05-24 - [Avoid N+1 queries by batching GitHub API Calls]
**Learning:** Found an N+1 API fetching performance pattern in `InstallationService.syncAllInstallations`, where `githubAppClient.getInstallations()` fetches all installations but was re-requested multiple times for each active installation. This severely hits the GitHub App rate limits.
**Action:** When updating or syncing list properties, pre-fetch resources completely using the initial single API call, then pass down pre-fetched information. Further avoid hitting internal/external API rate limits during bulk updates using bounded concurrent executions (`Promise.all` over batch sizes vs completely serialized execution).
