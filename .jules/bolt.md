## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.
## 2024-05-18 - Optimize findInstallationForRepo with database fast-path lookup
**Learning:** The `GitHubAppClient.findInstallationForRepo` method was causing an N+1 API bottleneck by retrieving the list of all installations and then iterating over each to fetch their repositories from GitHub to find the installation for a given repo.
**Action:** Use a fast-path local lookup on the `installationRepository` table (`db.installationRepository.findFirst`) before falling back to the GitHub API. This prevents expensive, sequential network calls for a commonly accessed operation.
