## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.
## 2024-03-08 - Optimize bulk repository removal
**Learning:** Using `Promise.all` with multiple single-record update queries for bulk operations leads to N+1 queries, which slows down the database.
**Action:** When performing bulk updates, use Prisma's `in` operator to execute the operation entirely within the database, eliminating unnecessary round-trips and memory overhead.
