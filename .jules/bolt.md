## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition

**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-07 - Optimize findInstallationForRepo to prevent N+1 API calls
**Learning:** When retrieving installation IDs for repositories, calling the GitHub API in a loop (getting installations and then iterating through their repositories) creates significant N+1 API call overhead and rate-limit risks.
**Action:** Use a fast-path database query to check `InstallationRepository` first. Only fall back to API iteration if the local database lookup fails. This conceptually optimizes mixed Database/API operations by decoupling them and prioritizing the faster, less constrained resource.
