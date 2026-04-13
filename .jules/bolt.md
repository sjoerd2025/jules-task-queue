## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Batch API calls in syncAllInstallations to prevent N+1 requests
**Learning:** Calling GitHub API endpoints like `getInstallations` inside loops processes multiple network requests sequentially, causing massive performance delays and secondary rate limit warnings.
**Action:** Extract list-type queries outside loops to pre-fetch required data, and pass them down conditionally into processing methods (`syncInstallation`). Processing multiple dependent records should be parallelized within bounds using concurrent chunking (e.g. `Promise.all` with a chunk size limit).
