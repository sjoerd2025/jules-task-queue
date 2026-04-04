## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize N+1 repository removal with updateMany
**Learning:** When performing bulk deletion or soft-deletion of associated entities, mapping over an array with `Promise.all(model.updateMany(...))` can result in N+1 database queries. A much more efficient approach is to extract the IDs and perform a single `updateMany` query with the `in` operator.
**Action:** Use a single `updateMany` (or `deleteMany`) call with the `in` operator instead of individual `Promise.all()` mapping for bulk entity updates.
