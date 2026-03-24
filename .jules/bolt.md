## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-07 - Optimize bulk repository database operations
**Learning:** Mapping over an array of items and executing individual database operations (e.g., `updateMany`, `deleteMany`) within a `Promise.all` creates an N+1 database query bottleneck, negatively impacting performance when dealing with large payloads.
**Action:** When applying the same update or delete operation to multiple records, extract the unique identifiers into an array and execute a single Prisma query using the `in` operator (e.g., `where: { id: { in: itemIds } }`) to minimize database round-trips.
