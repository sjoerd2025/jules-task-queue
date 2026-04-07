## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-04-07 - Optimize database cleanup with relational filtering
**Learning:** When processing bulk database operations, avoid fetching arrays of IDs into application memory for use with an `in` operator. Instead, leverage Prisma's nested relational filtering (e.g., `deleteMany` with `where: { relation: { field: condition } }`) to execute the operation entirely within the database, eliminating unnecessary round-trips and memory overhead.
**Action:** Use relational conditions directly in queries to optimize bulk deletes and updates.
