## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize bulk repository deletions using nested relational filtering
**Learning:** When processing bulk database operations, fetching large arrays of IDs into application memory to use with an `in` operator causes memory overhead and unnecessary database round-trips. Prisma's nested relational filtering allows executing these operations entirely within the database.

## 2026-03-08 - Prisma relational filtering limitations
**Learning:** Prisma explicitly does not support relational filters in `deleteMany` or `updateMany` operations. Attempting to use them causes TypeScript compilation errors and runtime crashes.
**Action:** When performing bulk updates/deletes based on relations, the standard and correct approach in Prisma is to fetch the necessary IDs first (e.g., using `findMany` with `select: { id: true }`) and then use the `in` operator in a single bulk operation. Do not attempt to use nested relation objects in the `where` clause of a bulk operation.
