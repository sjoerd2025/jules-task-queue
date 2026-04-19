## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Optimize bulk repository removal
**Learning:** The repository removal handler in `src/app/api/webhooks/github-app/route.ts` can cause an N+1 problem by doing multiple `updateMany` calls using `Promise.all`.
**Action:** It is optimized to use a single `updateMany` call with the `in` operator, reducing the database query count from O(N) to O(1) for bulk repository removals.
