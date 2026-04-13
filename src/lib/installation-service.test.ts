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

  describe('syncAllInstallations', () => {
    it('should fetch all installations once and process in batches', async () => {
      const mockActiveInstallations = [
        { id: 1, accountLogin: 'org1' },
        { id: 2, accountLogin: 'org2' },
        { id: 3, accountLogin: 'org3' },
      ];

      const mockGithubInstallations = [
        { id: 1, account: { login: 'org1' } },
        { id: 2, account: { login: 'org2' } },
        { id: 3, account: { login: 'org3' } },
      ];

      // Mock getting active installations from DB
      mockDb.gitHubInstallation.findMany.mockResolvedValueOnce(mockActiveInstallations);

      // Mock GitHub API returning all installations
      mockGithubAppClient.getInstallations.mockResolvedValue(mockGithubInstallations);

      // Spy on syncInstallation to avoid mocking everything internal to it, or mock it directly
      const syncSpy = vi.spyOn(installationService, 'syncInstallation')
        .mockResolvedValue(({} as // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any));

      const results = await installationService.syncAllInstallations();

      expect(mockGithubAppClient.getInstallations).toHaveBeenCalledTimes(1);

      expect(syncSpy).toHaveBeenCalledTimes(3);
      expect(syncSpy).toHaveBeenCalledWith(1, mockGithubInstallations[0]);
      expect(syncSpy).toHaveBeenCalledWith(2, mockGithubInstallations[1]);
      expect(syncSpy).toHaveBeenCalledWith(3, mockGithubInstallations[2]);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);

      syncSpy.mockRestore();
    });

    it('should continue if fetching installations fails', async () => {
      const mockActiveInstallations = [
        { id: 1, accountLogin: 'org1' },
      ];

      mockDb.gitHubInstallation.findMany.mockResolvedValueOnce(mockActiveInstallations);
      mockGithubAppClient.getInstallations.mockRejectedValue(new Error('API failure'));

      const syncSpy = vi.spyOn(installationService, 'syncInstallation')
        .mockResolvedValue(({} as // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any));

      const results = await installationService.syncAllInstallations();

      expect(mockGithubAppClient.getInstallations).toHaveBeenCalledTimes(1);
      // It should pass undefined for pre-fetched data
      expect(syncSpy).toHaveBeenCalledWith(1, undefined);
      expect(results.length).toBe(1);

      syncSpy.mockRestore();
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
