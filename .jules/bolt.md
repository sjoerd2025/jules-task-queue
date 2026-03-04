
## 2024-05-24 - [Optimize GitHub API Iteration with Database Caching]
**Learning:** `findInstallationForRepo` previously fetched *all* installations and looped over *each* installation's repositories via the GitHub API to find a match. This is a severe N+1 API bottleneck. However, the local database (`InstallationRepository`) maintains this relational map.
**Action:** When finding a repository's installation ID, always query the local database (`db.installationRepository`) first to short-circuit the O(N) GitHub API calls. Fallback to API polling only if the database lookup fails.
