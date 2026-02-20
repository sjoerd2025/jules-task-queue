/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processTaskRetry } from './jules';
// We need to mock these modules before importing jules.ts
import { db } from '@/server/db';
import { githubClient } from '@/lib/github';
import { getUserAccessToken } from '@/lib/token-manager';

// Mock dependencies
vi.mock('@/server/db', () => ({
  db: {
    julesTask: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/github', () => ({
  githubClient: {
    getIssue: vi.fn(),
    swapLabels: vi.fn(),
  },
}));

vi.mock('@/lib/token-manager', () => ({
  getUserAccessToken: vi.fn(),
}));

describe('processTaskRetry Performance', () => {
  const mockTask = {
    id: 1,
    githubRepoId: 100n,
    githubIssueId: 200n,
    githubIssueNumber: 123n,
    repoOwner: 'owner',
    repoName: 'repo',
    installationId: 1,
    flaggedForRetry: true,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastRetryAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.julesTask.findUnique as any).mockResolvedValue(mockTask);
    (db.julesTask.update as any).mockResolvedValue(mockTask);
    (githubClient.getIssue as any).mockResolvedValue({ labels: [{ name: 'jules-queue' }] });
    (githubClient.swapLabels as any).mockResolvedValue(undefined);
    (getUserAccessToken as any).mockResolvedValue('fake-token');
  });

  it('fetches task from DB when ID is passed', async () => {
    await processTaskRetry(1);
    expect(db.julesTask.findUnique).toHaveBeenCalledTimes(1);
    expect(db.julesTask.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('does NOT fetch task from DB when task object is passed (OPTIMIZATION)', async () => {
    // Cast to any because JulesTask type from Prisma might not match mockTask exactly in test env
    // without full type generation or if properties are optional/different.
    // However, the function now accepts JulesTask, so passing an object that matches the shape is fine.
    await processTaskRetry(mockTask as any);
    expect(db.julesTask.findUnique).toHaveBeenCalledTimes(0);
  });
});
