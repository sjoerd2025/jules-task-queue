## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.
## 2024-05-24 - Use bounded batched concurrent execution for DB bulk operations
**Learning:** Using unbounded `Promise.all` for bulk database upserts (`repositories.map(...)`) causes memory spikes, N+1 connection pool exhaustion, and potential database timeouts when processing large arrays (e.g., webhook events).
**Action:** When upserting multiple records via Prisma, use a `for` loop to chunk the array into smaller batches (e.g., `BATCH_SIZE = 50`) and process each chunk with `Promise.all` to maintain bounded concurrency.
