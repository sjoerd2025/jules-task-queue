## 2026-03-07 - Optimize rate-limiter.ts to prevent TOCTOU race condition
**Learning:** Performance optimizations should prioritize atomic database operations (e.g., Prisma `upsert`) where appropriate instead of the read-modify-write pattern (`findUnique` followed by `create` or `update`) to prevent unnecessary database round-trips and Time-of-Check to Time-of-Use (TOCTOU) race conditions.
**Action:** The database operations in `src/lib/rate-limiter.ts` should use `upsert` followed by `update` to optimize performance and prevent race conditions.

## 2026-03-07 - Prevent scope ReferenceErrors when updating API interfaces in catch blocks
**Learning:** When updating function signatures to accept object alternatives (e.g., changing `taskId` to `taskOrId`), variable names change. If an error block attempts to log a variable that was previously defined but is now conditionally extracted, it will throw an uncaught ReferenceError.
**Action:** Always verify all variable scopes, especially within error handling `catch` blocks, when refactoring function parameter names. Specifically ensure to conditionally extract the ID (`const id = typeof param === 'number' ? param : param.id;`) before logging.
