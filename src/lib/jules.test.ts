import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies to avoid side effects and errors during import
vi.mock('@/lib/github', () => ({
  githubClient: {},
}));
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('@/lib/token-manager', () => ({
  getUserAccessToken: vi.fn(),
}));
vi.mock('@/server/db', () => ({
  db: {},
}));
vi.mock('@/lib/number', () => ({
  toSafeNumber: (n: unknown) => Number(n),
}));

import {
  analyzeComment,
  isTaskLimitComment,
  isWorkingComment,
  isJulesBot,
} from './jules';
import type { GitHubComment } from '@/types';

describe('Jules Comment Analysis', () => {
  describe('isJulesBot', () => {
    it('identifies jules bot username', () => {
      expect(isJulesBot('google-labs-jules[bot]')).toBe(true);
      expect(isJulesBot('google-labs-jules')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isJulesBot('Google-Labs-Jules[bot]')).toBe(true);
      expect(isJulesBot('GOOGLE-LABS-JULES')).toBe(true);
    });

    it('rejects other usernames', () => {
      expect(isJulesBot('some-other-bot')).toBe(false);
      expect(isJulesBot('jules-fan')).toBe(false);
    });
  });

  describe('isTaskLimitComment', () => {
    it('identifies task limit patterns', () => {
      expect(isTaskLimitComment('You are currently at your concurrent task limit')).toBe(true);
      expect(isTaskLimitComment('Jules has failed to create a task')).toBe(true);
      expect(isTaskLimitComment('You are currently at your limit')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isTaskLimitComment('YOU ARE CURRENTLY AT YOUR CONCURRENT TASK LIMIT')).toBe(true);
    });

    it('rejects unrelated text', () => {
      expect(isTaskLimitComment('Just a normal comment')).toBe(false);
      expect(isTaskLimitComment('Task limit is not reached')).toBe(false);
    });
  });

  describe('isWorkingComment', () => {
    it('identifies working patterns', () => {
      expect(isWorkingComment('When finished, you will see another comment')).toBe(true);
    });

    it('is case insensitive', () => {
      expect(isWorkingComment('WHEN FINISHED, YOU WILL SEE ANOTHER COMMENT')).toBe(true);
    });

    it('rejects unrelated text', () => {
      expect(isWorkingComment('I am working on it')).toBe(false);
    });
  });

  describe('analyzeComment', () => {
    const mockDate = new Date('2023-01-01T12:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const createComment = (body: string | undefined, createdAt: string = mockDate.toISOString()): GitHubComment => ({
      id: 1,
      body,
      created_at: createdAt,
      user: { login: 'google-labs-jules[bot]' },
    });

    it('analyzes task limit comments', () => {
      const comment = createComment('You are currently at your concurrent task limit');
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe('task_limit');
      expect(analysis.confidence).toBeGreaterThan(0.6);
      expect(analysis.patterns_matched).toContain('You are currently at your concurrent task limit');
    });

    it('analyzes working comments', () => {
      const comment = createComment('When finished, you will see another comment');
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe('working');
      expect(analysis.confidence).toBeGreaterThan(0.6);
      expect(analysis.patterns_matched).toContain('When finished, you will see another comment');
    });

    it('prioritizes task limit over working if both match', () => {
      const comment = createComment('You are currently at your limit. When finished, you will see another comment');
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe('task_limit');
    });

    it('handles unknown comments', () => {
      const comment = createComment('Just some random text');
      const analysis = analyzeComment(comment);

      expect(analysis.classification).toBe('unknown');
      expect(analysis.confidence).toBe(0);
      expect(analysis.patterns_matched).toHaveLength(0);
    });

    it('calculates age correctly', () => {
      // 10 minutes ago
      const tenMinutesAgo = new Date(mockDate.getTime() - 10 * 60 * 1000).toISOString();
      const comment = createComment('text', tenMinutesAgo);
      const analysis = analyzeComment(comment);

      expect(analysis.age_minutes).toBeCloseTo(10, 1);
    });

    it('handles empty body', () => {
       const comment = createComment(undefined);
       const analysis = analyzeComment(comment);
       expect(analysis.classification).toBe('unknown');
    });
  });
});
