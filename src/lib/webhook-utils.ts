import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { db } from "@/server/db";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify GitHub App webhook signature
 */
export function verifyGitHubAppSignature(
  payload: string,
  signature: string,
): boolean {
  if (!env.GITHUB_APP_WEBHOOK_SECRET) {
    if (env.NODE_ENV === "development") {
      logger.warn(
        "GITHUB_APP_WEBHOOK_SECRET not configured - allowing unsigned webhooks in development only",
      );
      return true;
    }
    logger.error(
      "GITHUB_APP_WEBHOOK_SECRET not configured in production - denying webhook",
    );
    return false;
  }

  if (!signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
  const computedSignature = createHmac("sha256", env.GITHUB_APP_WEBHOOK_SECRET)
    .update(payload, "utf8")
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(computedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Log webhook event to database
 */
export async function logWebhookEvent(
  eventType: string,
  payload: unknown,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    await db.webhookLog.create({
      data: {
        eventType: `github-app:${eventType}`,
        payload: JSON.stringify(payload),
        success,
        error: error || null,
      },
    });
  } catch (logError) {
    // Log to console if database logging fails
    logger.error("Failed to log webhook event:", logError);
  }
}
