/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { githubClient } from './github';

// Mock logger to avoid cluttering output
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock GitHub App Client
vi.mock('@/lib/github-app', () => ({
  githubAppClient: {},
}));

// Mock Env
vi.mock('@/lib/env', () => ({
  env: {
    GITHUB_APP_ID: '123',
  },
}));

describe('GitHubClient', () => {
  describe('checkIfUserStarredRepository', () => {
    let mockOctokit: any;

    beforeEach(() => {
      mockOctokit = {
        request: vi.fn(),
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should iterate through pages until found', async () => {
      // Mock 3 pages, found on 3rd
      mockOctokit.request
        .mockResolvedValueOnce({
          data: Array(100).fill({ name: 'other-repo', owner: { login: 'other-owner' } }),
        })
        .mockResolvedValueOnce({
          data: Array(100).fill({ name: 'other-repo', owner: { login: 'other-owner' } }),
        })
        .mockResolvedValueOnce({
          data: [{ name: 'target-repo', owner: { login: 'target-owner' } }],
        });

      const result = await githubClient.checkIfUserStarredRepository(
        mockOctokit,
        'username',
        'target-owner',
        'target-repo'
      );

      expect(result).toBe(true);
      expect(mockOctokit.request).toHaveBeenCalledTimes(3);
    });

    it('should stop after reasonable limit (Security Fix Check)', async () => {
      // Simulate endless pages of unrelated repos
      mockOctokit.request.mockResolvedValue({
        data: Array(100).fill({ name: 'other-repo', owner: { login: 'other-owner' } }),
      });

      // This call should NOT hang indefinitely if fixed.
      // If NOT fixed, it will loop forever (and timeout the test).
      // We expect it to stop after MAX_PAGES (e.g. 20).

      const result = await githubClient.checkIfUserStarredRepository(
        mockOctokit,
        'username',
        'target-owner',
        'target-repo'
      );

      expect(result).toBe(false);

      // We assert it stopped at 20 (our intended fix limit)
      expect(mockOctokit.request).toHaveBeenCalledTimes(20);
    });
  });
});
