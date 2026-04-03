## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-08 - Use local DB sync tables as fast-path cache to prevent N+1 API calls
**Learning:** Sequential, unbounded GitHub API fetching (e.g., when searching for repository installations) creates massive N+1 bottlenecks.
**Action:** When searching for resources that exist in local sync tables (like `installationRepository`), always query the database first as a fast-path caching mechanism before falling back to the GitHub API.
