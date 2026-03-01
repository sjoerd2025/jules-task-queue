import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, mockGithubAppClient } = vi.hoisted(() => {
  return {
    mockDb: {
      gitHubInstallation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      installationRepository: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      julesTask: {
        count: vi.fn(),
      },
    },
    mockGithubAppClient: {
      getInstallations: vi.fn(),
      getInstallationRepositories: vi.fn(),
    },
  };
});

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/github-app', () => ({
  githubAppClient: mockGithubAppClient,
}));

vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { installationService } from './installation-service';

describe('InstallationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncInstallation', () => {
    it('should sync installation and repositories', async () => {
      const installationId = 123;
      const mockGithubInstallation = {
        id: installationId,
        account: { id: 456, login: 'test-org', type: 'Organization' },
        target_type: 'Organization',
        permissions: {},
        events: [],
        single_file_name: null,
        repository_selection: 'all',
        suspended_at: null,
        suspended_by: null,
      };

      const mockRepositories = Array.from({ length: 10 }, (_, i) => ({
        id: 1000 + i,
        name: `repo-${i}`,
        full_name: `test-org/repo-${i}`,
        owner: { login: 'test-org' },
        private: true,
        html_url: `https://github.com/test-org/repo-${i}`,
        description: `Test repo ${i}`,
      }));

      mockGithubAppClient.getInstallations.mockResolvedValue([mockGithubInstallation]);
      mockGithubAppClient.getInstallationRepositories.mockResolvedValue(mockRepositories);

      mockDb.gitHubInstallation.upsert.mockResolvedValue({});
      mockDb.installationRepository.upsert.mockResolvedValue({});
      mockDb.gitHubInstallation.findUnique.mockResolvedValue({
        id: installationId,
        repositories: [],
        tasks: [],
      });

      await installationService.syncInstallation(installationId);

      expect(mockGithubAppClient.getInstallations).toHaveBeenCalled();
      expect(mockDb.gitHubInstallation.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: installationId },
      }));
      expect(mockGithubAppClient.getInstallationRepositories).toHaveBeenCalledWith(installationId);

      // Verify repository sync
      expect(mockDb.installationRepository.updateMany).toHaveBeenCalledWith({
        where: { installationId },
        data: { removedAt: expect.any(Date) },
      });

      // Check if upsert was called for each repo
      expect(mockDb.installationRepository.upsert).toHaveBeenCalledTimes(mockRepositories.length);
    });

    it('should handle suspended installations', async () => {
      const installationId = 123;
      // Mock getInstallations returning empty or not containing the ID
      mockGithubAppClient.getInstallations.mockResolvedValue([]);

      await installationService.syncInstallation(installationId);

      expect(mockDb.gitHubInstallation.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: installationId },
        data: expect.objectContaining({
          suspendedBy: 'github_sync',
        }),
      }));

      expect(mockDb.installationRepository.updateMany).toHaveBeenCalledWith({
        where: { installationId },
        data: { removedAt: expect.any(Date) },
      });
    });
  });

  describe('cleanupSuspendedInstallations', () => {
    it('should cleanup suspended installations correctly', async () => {
      const mockSuspendedInstallations = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];

      mockDb.gitHubInstallation.findMany.mockResolvedValue(mockSuspendedInstallations);
      mockDb.gitHubInstallation.deleteMany.mockResolvedValue({ count: 3 });

      await installationService.cleanupSuspendedInstallations(30);

      expect(mockDb.gitHubInstallation.findMany).toHaveBeenCalled();

      // After optimization, deleteMany should be called once with all IDs
      expect(mockDb.installationRepository.deleteMany).toHaveBeenCalledWith({
        where: { installationId: { in: [1, 2, 3] } },
      });
      expect(mockDb.gitHubInstallation.deleteMany).toHaveBeenCalled();
    });
  });
});
