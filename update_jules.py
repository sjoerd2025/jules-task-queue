import re

file_path = 'src/lib/jules.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Add import
if 'import { retry } from "@/lib/retry";' not in content:
    content = content.replace(
        'import { toSafeNumber } from "@/lib/number";',
        'import { toSafeNumber } from "@/lib/number";\nimport { retry } from "@/lib/retry";'
    )

# New function definition
analyze_function = """/**
 * Check Jules comments on an issue and determine next action - extracted logic
 */
export async function analyzeLatestJulesComment(
  owner: string,
  repo: string,
  issueNumber: number,
  minConfidence: number = 0.6,
  installationId?: number,
): Promise<{
  action: CommentClassification;
  comment?: GitHubComment;
  analysis?: CommentAnalysis;
}> {
  // Get all comments on the issue
  const comments = await githubClient.getIssueComments(
    owner,
    repo,
    issueNumber,
    installationId,
  );

  // Filter for Jules comments (most recent first)
  const julesComments = comments
    .filter((comment) => comment.user && isJulesBot(comment.user.login))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  if (julesComments.length === 0) {
    logger.info(
      `No Jules comments found for ${owner}/${repo}#${issueNumber}`,
    );
    return { action: "no_action" };
  }

  // Analyze the most recent Jules comment
  const latestComment = julesComments[0] as GitHubComment;
  const analysis = analyzeComment(latestComment);

  logger.info(`Comment analysis for ${owner}/${repo}#${issueNumber}:`, {
    classification: analysis.classification,
    confidence: analysis.confidence,
    patterns: analysis.patterns_matched,
    age_minutes: analysis.age_minutes,
  });

  // Check if comment is too old (older than 2 hours might be stale)
  if (analysis.age_minutes > 120) {
    logger.info(
      `Latest Jules comment is ${analysis.age_minutes} minutes old, treating as stale`,
    );
    return {
      action: "no_action",
      comment: latestComment,
      analysis,
    };
  }

  // Apply confidence threshold
  if (analysis.confidence < minConfidence) {
    logger.info(
      `Comment confidence ${analysis.confidence} below threshold ${minConfidence}, treating as uncertain`,
    );

    // For uncertain comments, check if we have multiple recent comments
    const recentComments = julesComments.filter(
      (comment) =>
        (Date.now() - new Date(comment.created_at).getTime()) /
          (1000 * 60) <
        30,
    );

    if (recentComments.length > 1) {
      // Analyze the second most recent comment for context
      const secondAnalysis = analyzeComment(
        recentComments[1] as GitHubComment,
      );
      if (secondAnalysis.confidence >= minConfidence) {
        logger.info(
          `Using second comment with higher confidence: ${secondAnalysis.confidence}`,
        );
        return {
          action: secondAnalysis.classification,
          comment: recentComments[1] as GitHubComment,
          analysis: secondAnalysis,
        };
      }
    }

    return {
      action: "unknown",
      comment: latestComment,
      analysis,
    };
  }

  // Return successful analysis
  return {
    action: analysis.classification,
    comment: latestComment,
    analysis,
  };
}

/**
 * Check Jules comments on an issue and determine next action
 */
export async function checkJulesComments(
  owner: string,
  repo: string,
  issueNumber: number,
  maxRetries: number = 3,
  minConfidence: number = 0.6,
  installationId?: number,
): Promise<{
  action: CommentClassification;
  comment?: GitHubComment;
  analysis?: CommentAnalysis;
  retryCount?: number;
}> {
  try {
    const { result, lastAttempt } = await retry(
      async (attempt) => {
        logger.info(
          `Checking Jules comments for ${owner}/${repo}#${issueNumber} (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
        return await analyzeLatestJulesComment(
          owner,
          repo,
          issueNumber,
          minConfidence,
          installationId
        );
      },
      {
        maxRetries,
        initialDelay: 1000,
        backoffFactor: 2,
        onRetry: (error, attempt) => {
          logger.error(
            { error },
            `Attempt ${attempt + 1} failed for ${owner}/${repo}#${issueNumber}:`
          );
        },
      }
    );

    return { ...result, retryCount: lastAttempt };
  } catch (error) {
    logger.error(
      `All ${maxRetries} attempts failed for ${owner}/${repo}#${issueNumber}:`,
      error
    );

    return {
      action: "no_action",
      retryCount: maxRetries,
    };
  }
}
"""

# Regex to find the original checkJulesComments function
# It starts with 'export async function checkJulesComments' and ends before the next function 'handleTaskLimit'
pattern = r'(/\*\*\n \* Check Jules comments on an issue and determine next action\n \*/\nexport async function checkJulesComments[\s\S]*?)(?=/\*\*\n \* Handle task limit scenario)'

match = re.search(pattern, content)
if match:
    # Replace the function
    new_content = content.replace(match.group(1), analyze_function + "\n\n")

    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully updated checkJulesComments")
else:
    print("Could not find checkJulesComments function")
