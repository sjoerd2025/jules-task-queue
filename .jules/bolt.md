## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2024-05-20 - Optimize bulk database updates with Prisma `in` operator
**Learning:** For bulk database updates using Prisma, using `Promise.all` with individual `updateMany` queries inside an iteration creates an O(N) database operations bottleneck.
**Action:** Always prefer a single database operation using Prisma's `in` operator where the `where` clause filters on an array of IDs. This optimizes bulk updates to O(1) operations, preventing N+1 query bottlenecks and connection pool exhaustion.
