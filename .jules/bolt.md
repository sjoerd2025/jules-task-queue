## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-07 - Eliminate N+1 GitHub API calls in syncAllInstallations
**Learning:** Performing multiple individual GitHub App syncs inside a loop can lead to an N+1 API fetching bottleneck when the API requires fetching all installations to find a specific one.
**Action:** Pre-fetch the list of all installations via `getInstallations()` once before the batch processing loop, and pass the specific installation data down to individual processing functions (like `syncInstallation`) to drastically reduce API requests.

## 2026-03-07 - Fixing syncAllInstallations bug when prefetch fails
**Learning:** If an optimization relies on prefetching data but fails due to a network or API error, the fallback logic must not accidentally treat the absence of data as the deletion of all resources.
**Action:** When prefetching `getInstallations()`, initialize the container to `null` instead of `[]`. If the fetch fails, check against `null` to explicitly trigger the fallback logic (`githubData = undefined`) rather than passing `null` which falsely signals that the resource was not found on GitHub.
