import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { installationService } from "@/lib/installation-service";
import logger from "@/lib/logger";
import { toSafeNumber } from "@/lib/number";
import {
  InstallationRepository,
  InstallationTask,
  InstallationWithCounts,
} from "@/types/api";

export const adminInstallationsRouter = createTRPCRouter({
  // Get all installations
  list: adminProcedure.query(async () => {
    const installations = await installationService.getActiveInstallations();

    return {
      installations: installations.map(
        (installation: InstallationWithCounts) => ({
          id: installation.id,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          repositorySelection: installation.repositorySelection,
          repositoryCount: installation._count.repositories,
          taskCount: installation._count.tasks,
          createdAt: installation.createdAt,
          updatedAt: installation.updatedAt,
          suspendedAt: installation.suspendedAt,
          suspendedBy: installation.suspendedBy,
        }),
      ),
      count: installations.length,
    };
  }),

  // Get installation details
  detail: adminProcedure
    .input(z.object({ installationId: z.number() }))
    .query(async ({ input }) => {
      const installation = await installationService.getInstallation(
        input.installationId,
      );

      if (!installation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Installation ${input.installationId} not found`,
        });
      }

      let permissions;
      try {
        permissions = JSON.parse(installation.permissions);
      } catch {
        permissions = { error: "Failed to parse permissions" };
      }

      let events;
      try {
        events = JSON.parse(installation.events);
      } catch {
        events = { error: "Failed to parse events" };
      }

      return {
        id: installation.id,
        accountLogin: installation.accountLogin,
        accountType: installation.accountType,
        targetType: installation.targetType,
        repositorySelection: installation.repositorySelection,
        permissions,
        events,
        singleFileName: installation.singleFileName,
        createdAt: installation.createdAt,
        updatedAt: installation.updatedAt,
        suspendedAt: installation.suspendedAt,
        suspendedBy: installation.suspendedBy,
        repositories: installation.repositories.map(
          (repo: InstallationRepository) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            owner: repo.owner,
            private: repo.private,
            htmlUrl: repo.htmlUrl,
            description: repo.description,
            addedAt: repo.addedAt,
          }),
        ),
        tasks: installation.tasks.map((task: InstallationTask) => ({
          id: task.id,
          githubIssueNumber: toSafeNumber(task.githubIssueNumber),
          repoOwner: task.repoOwner,
          repoName: task.repoName,
          flaggedForRetry: task.flaggedForRetry,
          retryCount: task.retryCount,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        })),
      };
    }),

  // Sync installation with GitHub
  sync: adminProcedure
    .input(z.object({ installationId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const result = await installationService.syncInstallation(
          input.installationId,
        );

        return {
          success: true,
          installationId: input.installationId,
          message: result
            ? `Installation ${input.installationId} synced successfully`
            : `Installation ${input.installationId} was suspended (not found in GitHub)`,
          data: result,
        };
      } catch (error) {
        logger.error(
          { error },
          `Failed to sync installation ${input.installationId}`,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Sync failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          cause: error,
        });
      }
    }),

  // Sync all installations
  syncAll: adminProcedure.mutation(async () => {
    try {
      const results = await installationService.syncAllInstallations();
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return {
        success: true,
        message: `Sync completed: ${successful} successful, ${failed} failed`,
        results,
        stats: { successful, failed, total: results.length },
      };
    } catch (error) {
      logger.error({ error }, "Failed to sync all installations");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Sync all failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        cause: error,
      });
    }
  }),

  // Get installation health
  health: adminProcedure
    .input(z.object({ installationId: z.number() }))
    .query(async ({ input }) => {
      return installationService.getInstallationHealth(input.installationId);
    }),

  // Get installation statistics
  stats: adminProcedure.query(async () => {
    return installationService.getInstallationStats();
  }),

  // Clean up old suspended installations
  cleanup: adminProcedure
    .input(
      z.object({ olderThanDays: z.number().min(1).max(365).default(30) }),
    )
    .mutation(async ({ input }) => {
      try {
        const deletedCount =
          await installationService.cleanupSuspendedInstallations(
            input.olderThanDays,
          );

        return {
          success: true,
          deletedCount,
          message: `Cleaned up ${deletedCount} suspended installations older than ${input.olderThanDays} days`,
        };
      } catch (error) {
        logger.error({ error }, "Failed to cleanup suspended installations");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Cleanup failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          cause: error,
        });
      }
    }),
});
