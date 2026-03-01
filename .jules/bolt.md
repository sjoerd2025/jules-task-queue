## 2024-03-01 - [Rate Limiter Local vs Database Trade-offs]
**Learning:** [Replacing a database rate limiter with a local map defeats global distributed limits and allows bypasses, but atomic DB upserts provide significant speed-ups without losing global correctness.]
**Action:** [Use atomic database `upsert` queries to optimize rate limits rather than attempting to introduce local memory caches.]
