import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JulesTask } from '@prisma/client';

// Hoist mocks to be accessible inside vi.mock
const { mockDb } = vi.hoisted(() => {
  return {
    mockDb: {
      julesTask: {
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/github', () => ({
  githubClient: {
    getIssue: vi.fn().mockResolvedValue({ labels: [{ name: 'jules-queue' }] }),
    swapLabels: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/token-manager', () => ({
  getUserAccessToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/lib/number', () => ({
  toSafeNumber: (n: unknown) => Number(n),
}));

// Import function under test
import { processTaskRetry } from './jules';

describe('processTaskRetry Optimization', () => {
  const mockTask: JulesTask = {
    id: 123,
    githubRepoId: BigInt(100),
    githubIssueId: BigInt(200),
    githubIssueNumber: BigInt(5),
    repoOwner: 'owner',
    repoName: 'repo',
    installationId: 1,
    flaggedForRetry: true,
    retryCount: 0,
    lastRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.julesTask.findUnique.mockResolvedValue(mockTask);
    mockDb.julesTask.update.mockResolvedValue({ ...mockTask, flaggedForRetry: false });
  });

  it('fetches task from DB when passed an ID', async () => {
    await processTaskRetry(123);
    expect(mockDb.julesTask.findUnique).toHaveBeenCalledWith({ where: { id: 123 } });
    expect(mockDb.julesTask.update).toHaveBeenCalled();
  });

  it('skips DB fetch when passed a task object', async () => {
    await processTaskRetry(mockTask);

    // Once optimized, findUnique should NOT be called
    expect(mockDb.julesTask.findUnique).not.toHaveBeenCalled();
    expect(mockDb.julesTask.update).toHaveBeenCalled();
  });
});
