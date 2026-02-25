import { createJulesLabelsForRepositories } from "@/lib/github-labels";
import logger from "@/lib/logger";
import { processJulesLabelEvent } from "@/lib/webhook-processor";
import { db } from "@/server/db";
import { GitHubLabelEventSchema } from "@/types";
import {
  GitHubInstallationEvent,
  GitHubInstallationRepositoriesEvent,
  GitHubIssueCommentEvent,
  GitHubLabel,
  GitHubWebhookRepository,
  GitHubWebhookEvent,
} from "@/types/github";

export type WebhookResult = {
  message: string;
  eventType?: string;
  action?: string;
  [key: string]: unknown;
};

/**
 * Handle GitHub App installation events
 */
export async function handleInstallationEvent(
  payload: GitHubInstallationEvent,
  action: string,
): Promise<WebhookResult> {
  const installation = payload.installation;

  if (action === "created") {
    await db.$transaction(async (prisma) => {
      // Install app
      await prisma.gitHubInstallation.upsert({
        where: { id: installation.id },
        update: {
          accountId: BigInt(installation.account.id),
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          targetType: installation.target_type,
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          singleFileName: installation.single_file_name,
          repositorySelection: installation.repository_selection,
          suspendedAt: installation.suspended_at
            ? new Date(installation.suspended_at)
            : null,
          suspendedBy: installation.suspended_by?.login || null,
          updatedAt: new Date(),
        },
        create: {
          id: installation.id,
          accountId: BigInt(installation.account.id),
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          targetType: installation.target_type,
          permissions: JSON.stringify(installation.permissions),
          events: JSON.stringify(installation.events),
          singleFileName: installation.single_file_name,
          repositorySelection: installation.repository_selection,
          suspendedAt: installation.suspended_at
            ? new Date(installation.suspended_at)
            : null,
          suspendedBy: installation.suspended_by?.login || null,
        },
      });

      // Add all repositories if "all" selection
      if (installation.repository_selection === "all" && payload.repositories) {
        await Promise.all(
          payload.repositories.map((repo: GitHubWebhookRepository) => {
            // Extract owner from full_name since installation webhooks don't include owner object
            const owner = repo.full_name.split("/")[0] || "unknown";

            return prisma.installationRepository.upsert({
              where: {
                installationId_repositoryId: {
                  installationId: installation.id,
                  repositoryId: BigInt(repo.id),
                },
              },
              update: {
                name: repo.name,
                fullName: repo.full_name,
                owner: owner,
                private: repo.private,
                htmlUrl:
                  repo.html_url || `https://github.com/${repo.full_name}`,
                description: repo.description,
                removedAt: null, // Reset if previously removed
              },
              create: {
                installationId: installation.id,
                repositoryId: BigInt(repo.id),
                name: repo.name,
                fullName: repo.full_name,
                owner: owner,
                private: repo.private,
                htmlUrl:
                  repo.html_url || `https://github.com/${repo.full_name}`,
                description: repo.description,
              },
            });
          }),
        );
      }

      // Note: Label creation is now handled through the user-driven setup process
      // Users can choose during installation whether to create labels automatically
      logger.info(
        `Installation ${installation.id} completed. Labels will be created based on user preference.`,
      );
    });

    logger.info(
      `GitHub App installed for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "deleted") {
    await db.$transaction(async (prisma) => {
      // Uninstall app - mark installation as suspended
      await prisma.gitHubInstallation.update({
        where: { id: installation.id },
        data: {
          suspendedAt: new Date(),
          suspendedBy: "uninstalled",
          updatedAt: new Date(),
          userAccessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          refreshTokenExpiresAt: null,
        },
      });

      // Mark all repositories as removed
      await prisma.installationRepository.updateMany({
        where: { installationId: installation.id },
        data: { removedAt: new Date() },
      });
    });

    logger.info(
      `GitHub App uninstalled for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "suspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: installation.suspended_at
          ? new Date(installation.suspended_at)
          : null,
        suspendedBy: installation.suspended_by?.login || null,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `GitHub App suspended for ${installation.account.login} (${installation.id})`,
    );
  } else if (action === "unsuspend") {
    await db.gitHubInstallation.update({
      where: { id: installation.id },
      data: {
        suspendedAt: null,
        suspendedBy: null,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `GitHub App unsuspended for ${installation.account.login} (${installation.id})`,
    );
  }

  return {
    message: "Installation event processed successfully",
    eventType: "installation",
    action: action,
    installation: installation.id,
  };
}

/**
 * Handle installation repository events
 */
export async function handleInstallationRepositoriesEvent(
  payload: GitHubInstallationRepositoriesEvent,
  action: string,
): Promise<WebhookResult> {
  const installation = payload.installation;
  const repositories =
    payload.repositories_added || payload.repositories_removed || [];

  if (action === "added") {
    await db.$transaction(async (prisma) => {
      await Promise.all(
        repositories.map((repo: GitHubWebhookRepository) => {
          // Extract owner from full_name since installation repository webhooks may not include owner object
          const owner =
            repo.owner?.login || repo.full_name.split("/")[0] || "unknown";

          return prisma.installationRepository.upsert({
            where: {
              installationId_repositoryId: {
                installationId: installation.id,
                repositoryId: BigInt(repo.id),
              },
            },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              owner: owner,
              private: repo.private,
              htmlUrl: repo.html_url || `https://github.com/${repo.full_name}`,
              description: repo.description,
              removedAt: null, // Reset if previously removed
            },
            create: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
              name: repo.name,
              fullName: repo.full_name,
              owner: owner,
              private: repo.private,
              htmlUrl: repo.html_url || `https://github.com/${repo.full_name}`,
              description: repo.description,
            },
          });
        }),
      );

      // Note: Label creation for new repositories should be handled based on user preferences
      // Check if user has "all" preference and create labels accordingly
      logger.info(
        `${repositories.length} repositories added to installation ${installation.id}`,
      );

      // Check user's label preference for this installation
      const labelPreference = await prisma.labelPreference.findUnique({
        where: { installationId: installation.id },
      });

      if (labelPreference?.setupType === "all") {
        // User chose to create labels in all repositories, so create them for new repos
        logger.info(
          `Creating Jules labels in ${repositories.length} newly added repositories`,
        );

        // Batch create label preference repositories
        const preferenceRepositories = repositories.map(
          (repo: GitHubWebhookRepository) => {
            const owner =
              repo.owner?.login || repo.full_name.split("/")[0] || "unknown";

            return {
              labelPreferenceId: labelPreference.id,
              repositoryId: BigInt(repo.id),
              name: repo.name,
              fullName: repo.full_name,
              owner: owner,
            };
          },
        );

        await prisma.labelPreferenceRepository.createMany({
          data: preferenceRepositories,
          skipDuplicates: true,
        });

        // Batch create labels in the repositories
        await createJulesLabelsForRepositories(
          repositories.map((repo: GitHubWebhookRepository) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            owner: repo.owner,
            private: repo.private,
            html_url: repo.html_url,
            description: repo.description || undefined,
          })),
          installation.id,
        );
      }

      logger.info(
        `Added ${repositories.length} repositories to installation ${installation.id}`,
      );
    });
  } else if (action === "removed") {
    await db.$transaction(async (prisma) => {
      await Promise.all(
        repositories.map((repo: GitHubWebhookRepository) =>
          prisma.installationRepository.updateMany({
            where: {
              installationId: installation.id,
              repositoryId: BigInt(repo.id),
            },
            data: { removedAt: new Date() },
          }),
        ),
      );

      logger.info(
        `Removed ${repositories.length} repositories from installation ${installation.id}`,
      );
    });
  }

  return {
    message: "Installation repositories event processed successfully",
    eventType: "installation_repositories",
    action: action,
    installation: installation.id,
  };
}

/**
 * Handle issue comment events
 */
export async function handleIssueCommentEvent(
  webhookEvent: GitHubWebhookEvent,
): Promise<WebhookResult | null> {
  const eventType = "issue_comment";

  // Only process comment creation for now
  if (webhookEvent.action !== "created") {
    return {
      message: "Comment action not processed",
      action: webhookEvent.action,
    };
  }

  const commentEvent = webhookEvent as unknown as GitHubIssueCommentEvent;

  // Check if the issue has 'jules' label
  const hasJulesLabel = commentEvent.issue.labels.some(
    (label: GitHubLabel) => label.name.toLowerCase() === "jules",
  );

  if (!hasJulesLabel) {
    return {
      message: "Issue comment ignored - no 'jules' label",
    };
  }

  // Log comment for monitoring Jules interactions
  logger.info(
    `New comment on Jules-labeled issue ${commentEvent.repository.full_name}#${commentEvent.issue.number} by ${commentEvent.comment.user.login}`,
  );

  return {
    message: "Issue comment logged successfully",
    eventType,
    action: commentEvent.action,
    repository: commentEvent.repository.full_name,
    issue: commentEvent.issue.number,
    commenter: commentEvent.comment.user.login,
    installation: commentEvent.installation?.id,
  };
}

/**
 * Handle issue events
 */
export async function handleIssuesEvent(
  webhookEvent: GitHubWebhookEvent,
  payload: unknown,
): Promise<WebhookResult | null> {
  const eventType = "issues";

  // Only process issue label events
  if (
    webhookEvent.action !== "labeled" &&
    webhookEvent.action !== "unlabeled"
  ) {
    return {
      message: "Action not processed",
      action: webhookEvent.action,
    };
  }

  // Parse as label event
  const labelEvent = GitHubLabelEventSchema.parse(payload);

  // Only process 'jules' and 'jules-queue' label events
  const labelName = labelEvent.label.name.toLowerCase();
  if (!["jules", "jules-queue"].includes(labelName)) {
    return {
      message: "Label not processed",
      label: labelName,
    };
  }

  // Only process open issues
  if (labelEvent.issue.state !== "open") {
    return {
      message: "Issue not open",
      state: labelEvent.issue.state,
    };
  }

  // Process the Jules label event with installation context
  logger.info(
    `Processing ${labelEvent.action} event for label '${labelName}' on ${labelEvent.repository.full_name}#${labelEvent.issue.number} (installation: ${webhookEvent.installation?.id})`,
  );

  const result = await processJulesLabelEvent(
    labelEvent,
    webhookEvent.installation?.id,
  );

  return {
    message: "Webhook processed successfully",
    eventType,
    action: labelEvent.action,
    label: labelName,
    repository: labelEvent.repository.full_name,
    issue: labelEvent.issue.number,
    installation: webhookEvent.installation?.id,
    result,
  };
}
