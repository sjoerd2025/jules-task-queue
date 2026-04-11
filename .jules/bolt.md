## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-04-11 - Optimize repository bulk upserts to prevent connection exhaustion
**Learning:** Unbounded concurrent database operations (e.g., `Promise.all(array.map(upsert))`) can lead to N+1 bottlenecks, connection pool exhaustion, and memory spikes when the input array is very large (e.g., hundreds of repositories).
**Action:** Always process large bulk database operations using batched concurrent execution (e.g., `for` loop with chunks of 50 inside `Promise.all`) to balance speed and stability, as implemented in `upsertInstallationRepositories`.
