## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize `syncAllInstallations` to prevent N+1 GitHub API queries
**Learning:** During bulk operations (`syncAllInstallations`), fetching external data inside a loop creates significant N+1 API request bottlenecks and can trigger rate limits or timeouts.
**Action:** Always prefer fetching a single, bulk dataset upfront (e.g., `githubAppClient.getInstallations()`) before the loop, and pass the specific matching entry to the processing function in order to eliminate N+1 latency. Concurrency bounded by `Promise.all` alongside chunking will significantly reduce synchronization time securely.
