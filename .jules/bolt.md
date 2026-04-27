## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2024-04-27 - [Bulk Webhook Repository Removal Optimization]
**Learning:** In standard webhook payloads for `installation_repositories.removed`, an N+1 query vulnerability exists when using a `Promise.all` with `.map` and a Prisma `updateMany` for each item individually. While the query concurrency helps, it still hits the database multiple times, increasing load and exhausting connection pools on mass removals.
**Action:** Replace `Promise.all(...map(updateMany))` with a single `updateMany` using Prisma's `in` operator to execute the modification in one batched SQL statement, improving backend database performance and stability during bulk actions.
