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
  // Use batch processing with Promise.all to handle N+1 upserts efficiently
  // Batch size of 50 keeps memory usage low and prevents connection pool exhaustion
  const BATCH_SIZE = 50;
  for (let i = 0; i < repositories.length; i += BATCH_SIZE) {
    const batch = repositories.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((repo) => {
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
}
