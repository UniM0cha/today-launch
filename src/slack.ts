import { CrawlResult } from "./types";

const BLOG_URL = "https://blog.naver.com/sekyofood";
const SLACK_WEBHOOK_HOST = "hooks.slack.com";
const SLACK_TIMEOUT_MS = 10_000;

/**
 * A single Slack Block Kit block.
 * Loosely typed because we only build a handful of fixed block shapes below.
 */
interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

/**
 * Slack Incoming Webhook payload (Block Kit)
 */
interface SlackMessage {
  blocks: SlackBlock[];
}

/**
 * Sends menu images to Slack via an Incoming Webhook.
 */
export async function sendMenuToSlack(webhookUrl: string, result: CrawlResult): Promise<void> {
  // Validate the webhook host before posting. SLACK_WEBHOOK_URL is operator-set,
  // but a typo (or a non-Slack URL) would otherwise send the menu payload to an
  // arbitrary host. Error messages here deliberately omit the URL (it is a secret).
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error("SLACK_WEBHOOK_URL is not a valid URL");
  }
  // Require HTTPS as well as the right host: the webhook URL carries a secret
  // token, so posting it over plaintext http:// would leak it on the wire.
  if (parsed.protocol !== "https:" || parsed.host !== SLACK_WEBHOOK_HOST) {
    throw new Error(`SLACK_WEBHOOK_URL must be https://${SLACK_WEBHOOK_HOST}`);
  }

  const message =
    result.success && result.menuImageUrl ? buildSuccessMessage(result) : buildErrorMessage(result);

  // Node's global fetch has no default timeout; without this an unresponsive
  // endpoint would keep the promise pending and hang the whole run (Promise.all).
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook responded with ${response.status}: ${body}`);
  }

  console.log("Message sent to Slack successfully");
}

/**
 * Builds success message with the consolidated menu image.
 */
function buildSuccessMessage(result: CrawlResult): SlackMessage {
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🍴 오늘의 세교푸드 메뉴 (${result.date} ${result.dayOfWeek})`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "오늘의 중식 & 석식 메뉴입니다.",
        },
      },
      {
        type: "image",
        image_url: result.menuImageUrl,
        alt_text: "오늘의 중식 & 석식 메뉴",
      },
    ],
  };
}

/**
 * Builds error notification message.
 */
function buildErrorMessage(result: CrawlResult): SlackMessage {
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⚠️ 메뉴를 찾을 수 없습니다",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `오늘(${result.date} ${result.dayOfWeek}) 세교푸드 메뉴를 찾을 수 없습니다.\n\n` +
            `*오류 메시지:* ${result.error}\n\n` +
            `<${BLOG_URL}|블로그에서 직접 확인하기>`,
        },
      },
    ],
  };
}
