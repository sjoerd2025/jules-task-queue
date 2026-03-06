## 2024-03-06 - Prisma Atomic Upserts over Read-Modify-Write
**Learning:** In the `src/lib/jules.ts` file, the `upsertJulesTask` was making two database round-trips by first using `findUnique` and then either `update` or `create`. This pattern can introduce race conditions and causes unnecessary latency compared to Prisma's built-in `upsert` functionality.
**Action:** Always prefer Prisma's `upsert` method for conditional record creation/updates to ensure atomic operations and minimize database round-trips.
