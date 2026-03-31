## 2026-03-07 - Optimize syncAllInstallations with bounded concurrent execution
**Learning:** When making multiple external API calls (especially to the GitHub API which has secondary rate limits), processing them strictly sequentially can result in extremely long execution times, whereas unbounded concurrency (`Promise.all` over all items) can trigger rate limits.
**Action:** Use bounded concurrent execution (e.g., processing chunks of 10 items concurrently) to strike the right balance between performance improvement and API rate limit safety.
