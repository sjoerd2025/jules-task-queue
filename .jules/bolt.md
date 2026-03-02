## 2024-03-24 - [Optimize GitHub Installation Lookup]
**Learning:** Checking the local database first for an existing installation avoids looping through `installation.id` arrays and issuing individual GitHub API calls via `getInstallationRepositories`. Because GitHub apps can have many installations and installations can have many repositories, avoiding this N+1 API call lookup drastically reduces latency for GitHub issue/comment operations on the server.
**Action:** Before issuing an external query, see if you can resolve the ID or relation locally via a pre-fetched database record.
