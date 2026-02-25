import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  handleInstallationEvent,
  handleInstallationRepositoriesEvent,
  handleIssueCommentEvent,
  handleIssuesEvent,
} from "@/lib/webhook-handlers";
import { logWebhookEvent, verifyGitHubAppSignature } from "@/lib/webhook-utils";
import { db } from "@/server/db";
import {
  GitHubInstallationEvent,
  GitHubInstallationRepositoriesEvent,
  GitHubWebhookEvent,
} from "@/types/github";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Process GitHub App webhook events
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let eventType = "unknown";
  let payload: unknown = null;

  try {
    // Basic rate limiting per source IP
    const realIpHeader = req.headers.get("x-real-ip");
    let ipSource =
      realIpHeader || req.headers.get("x-forwarded-for") || "unknown";
    // Parse X-Forwarded-For first entry if multiple
    if (!realIpHeader && ipSource.includes(",")) {
      ipSource = ipSource.split(",")[0]?.trim() || ipSource;
    }
    // Normalize and bound the identifier length
    const normalizedIp = ipSource.toLowerCase().slice(0, 64);
    // Optionally append user agent (truncated) to reduce spoofing
    const userAgent = (req.headers.get("user-agent") || "")
      .toLowerCase()
      .slice(0, 32);
    const identifier = userAgent
      ? `${normalizedIp}|${userAgent}`
      : normalizedIp;
    const rate = await checkRateLimit(identifier, "/api/webhooks/github-app");
    if (!rate.allowed) {
      await logWebhookEvent(eventType, payload, false, "Rate limit exceeded");
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Verify content type
    const contentType = req.headers.get("content-type");
    if (contentType !== "application/json") {
      await logWebhookEvent(eventType, payload, false, "Invalid content type");
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 },
      );
    }

    // Get GitHub event type
    eventType = req.headers.get("x-github-event") || "unknown";

    // Parse payload
    const payloadText = await req.text();
    payload = JSON.parse(payloadText);

    // Verify signature
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      // Allow unsigned webhooks only in development when secret is not configured
      if (!(env.NODE_ENV === "development" && !env.GITHUB_APP_WEBHOOK_SECRET)) {
        await logWebhookEvent(
          eventType,
          payload,
          false,
          "Missing signature header",
        );
        return NextResponse.json(
          { error: "Missing X-Hub-Signature-256 header" },
          { status: 401 },
        );
      }
    }

    if (signature && !verifyGitHubAppSignature(payloadText, signature)) {
      await logWebhookEvent(eventType, payload, false, "Invalid signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      );
    }

    const webhookEvent = payload as GitHubWebhookEvent;

    // Handle installation events
    if (eventType === "installation") {
      const installationEvent =
        webhookEvent as unknown as GitHubInstallationEvent;
      const result = await handleInstallationEvent(
        installationEvent,
        installationEvent.action,
      );

      const logMessage = result.message.includes("successfully") ? undefined : result.message;
      await logWebhookEvent(eventType, payload, true, logMessage);

      return NextResponse.json({
        ...result,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle installation repository events
    if (eventType === "installation_repositories") {
      const repositoriesEvent =
        webhookEvent as unknown as GitHubInstallationRepositoriesEvent;
      const result = await handleInstallationRepositoriesEvent(
        repositoriesEvent,
        repositoriesEvent.action,
      );

      const logMessage = result.message.includes("successfully") ? undefined : result.message;
      await logWebhookEvent(eventType, payload, true, logMessage);

      return NextResponse.json({
        ...result,
        processingTime: Date.now() - startTime,
      });
    }

    // Handle issue comment events
    if (eventType === "issue_comment") {
      const result = await handleIssueCommentEvent(webhookEvent);

      if (result) {
        const logMessage = result.message.includes("successfully") ? undefined : result.message;
        await logWebhookEvent(eventType, payload, true, logMessage);

        return NextResponse.json({
          ...result,
          processingTime: Date.now() - startTime,
        });
      }
      // Should not happen with current handler implementation, but as fallback
    }

    // Handle issue events (same as before, but with installation context)
    if (eventType === "issues") {
      const result = await handleIssuesEvent(webhookEvent, payload);

      if (result) {
        const logMessage = result.message.includes("successfully") ? undefined : result.message;
        await logWebhookEvent(eventType, payload, true, logMessage);

        return NextResponse.json({
          ...result,
          processingTime: Date.now() - startTime,
        });
      }
    }

    // Ignore other event types
    await logWebhookEvent(eventType, payload, true, "Event type ignored");
    return NextResponse.json({
      message: "Event type not processed",
      eventType,
      processingTime: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("GitHub App webhook processing error:", {
      eventType,
      error: errorMessage,
      payload: payload ? JSON.stringify(payload).slice(0, 500) : null,
    });

    await logWebhookEvent(eventType, payload, false, errorMessage);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid webhook payload",
          details: error.errors,
          processingTime: Date.now() - startTime,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint for GitHub App webhooks
 */
export async function GET() {
  try {
    // Test database connectivity
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "healthy",
      service: "GitHub App webhook handler",
      database: "connected",
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV === "production" ? undefined : env.NODE_ENV,
      webhookSecretConfigured:
        env.NODE_ENV === "production"
          ? undefined
          : !!env.GITHUB_APP_WEBHOOK_SECRET,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        service: "GitHub App webhook handler",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
