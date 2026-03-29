## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize N+1 database operations using the 'in' operator
**Learning:** When performing bulk updates or deletes based on a list of IDs, using `Promise.all` with `.map` and an individual `updateMany` or `deleteMany` creates an N+1 database operations issue. This generates excessive round trips to the database.
**Action:** Always replace `Promise.all` mapping over an array of updates/deletes with a single database operation utilizing the `in` operator (e.g., `updateMany` or `deleteMany` with `where: { id: { in: ids } }`) to handle all entries in a single query.
