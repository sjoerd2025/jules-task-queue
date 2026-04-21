## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-04-21 - Prevent N+1 API calls during GitHub installation sync
**Learning:** Sequential processing of database records (e.g., in a `for...of` loop) that triggers external API calls can quickly create N+1 bottlenecks, significantly increasing total execution time and risking rate limits.
**Action:** Prefetch the necessary external data once before the loop (using an array or map), and use bounded concurrency (e.g., chunks with `Promise.all`) to process the records, passing the prefetched data down to eliminate the redundant API calls.
