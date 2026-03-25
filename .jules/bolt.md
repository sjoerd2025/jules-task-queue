## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition

**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize GitHub App Webhook Repository Removal

**Learning:** Processing bulk operations (like repository removal in a webhook) using `Promise.all` with individual `updateMany` calls can lead to N+1 database bottlenecks, increasing latency and DB load, especially when handling many records at once.
**Action:** Replace `Promise.all(array.map(...))` database operations with a single `updateMany` or `deleteMany` call using the `in` operator (e.g., `repositoryId: { in: ids }`) to batch operations efficiently.
