import { Prisma } from "@prisma/client";
import { GitHubWebhookRepository } from "@/types/github";

/**
 * Upsert multiple repositories for an installation.
 * This function handles the repository upsert logic, including owner extraction
 * and BigInt conversion for repository ID.
 */
export async function upsertInstallationRepositories(
  tx: Prisma.TransactionClient,
  installationId: number,
  repositories: GitHubWebhookRepository[]
): Promise<void> {
  await Promise.all(
    repositories.map((repo) => {
      // Extract owner from full_name since installation webhooks don't always include owner object
      const owner =
        repo.owner?.login || repo.full_name.split("/")[0] || "unknown";

      return tx.installationRepository.upsert({
        where: {
          installationId_repositoryId: {
            installationId: installationId,
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
          installationId: installationId,
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
    })
  );
}
