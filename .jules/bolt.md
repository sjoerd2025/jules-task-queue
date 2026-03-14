## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.
## 2025-03-14 - Optimize `syncAllInstallations` API calls with bounded concurrency
**Learning:** Sequential processing in loops (`for...of`) when interacting with external APIs (like GitHub App installations) leads to an N+1 API call pattern. Unbounded concurrency (e.g. `Promise.all` with all elements) triggers secondary rate limits.
**Action:** When handling bulk syncing with external APIs, always use bounded batching (e.g. `Array.slice` inside a chunked loop with `Promise.all`) to optimize API call volume without hitting rate limits.
