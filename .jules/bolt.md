## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-04-29 - Parallelize Installation Syncing
**Learning:** Found an N+1 API call bottleneck where `githubAppClient.getInstallations()` was called inside a loop for each installation. Parallelizing without fixing the N+1 would still be inefficient.
**Action:** Always check for redundant API calls inside loops before parallelizing, and use pre-fetching with bounded concurrency (`Promise.all` with chunking) to optimize throughput safely.
