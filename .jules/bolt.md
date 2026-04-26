## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2023-10-27 - Optimize syncAllInstallations to prevent N+1 API calls
**Learning:** Sequential loops that fetch data from an external API (like GitHub) inside each iteration can lead to severe N+1 performance bottlenecks and potential rate-limiting when the collection size grows.
**Action:** When synchronizing collections of data against an external API, always check if the API provides a bulk fetch endpoint. Pre-fetch the entire collection once, and then pass the relevant slice of data into the processing logic for each item. Combine this with bounded concurrency (e.g., `Promise.all` with a batch size of 10-50) to further speed up the process while preventing connection pool exhaustion or secondary rate limits.
