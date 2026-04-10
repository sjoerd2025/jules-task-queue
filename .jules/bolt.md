## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.
## 2026-03-08 - Fast-path local caching for GitHub API calls
**Learning:** The GitHub API can easily become an N+1 bottleneck when querying for local resource counterparts (like finding a specific repo across multiple installations). Always leverage local synced database records as a first-line fast-path to prevent unnecessary external network calls.
**Action:** When attempting to resolve a GitHub entity that has a local sync table representation, use `db.Model.findFirst()` before falling back to Octokit API methods.
