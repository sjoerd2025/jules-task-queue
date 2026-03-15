## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Use Bounded Concurrency for Mixed DB/API Loops
**Learning:** When dealing with multiple installations or repositories that require both API and database operations, sequential `for...of` loops are too slow, and unbounded `Promise.all` triggers external API rate limits (like GitHub secondary limits) while blowing up connection pools.
**Action:** Always process mixed external API/database operation loops using bounded concurrent batches (e.g., chunk size of 10) combined with `Promise.all` to significantly reduce time while staying within rate limit safety margins.
