## 2024-02-28 - [Prisma N+1 Bulk Deletion]
**Learning:** Sequential Prisma queries inside loops (e.g., `for (const x of items) { await db.model.deleteMany(...) }`) cause N+1 query problems which degrade performance significantly on bulk cleanups.
**Action:** Always replace sequential O(N) database operations with a single O(1) batched database operation (e.g., using Prisma's `in` operator `db.model.deleteMany({ where: { id: { in: ids } } })`) to minimize network roundtrips.
