import dotenv from "dotenv";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { crawlMenuImages } from "./crawler";
import { sendMenuToDiscord } from "./discord";
import { sendMenuToSlack } from "./slack";
import { BotConfig, CrawlResult } from "./types";

// Load environment variables
dotenv.config();

/**
 * Load and validate bot configuration from environment variables
 */
function loadConfig(): BotConfig {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is not set");
  }

  return {
    webhookUrl,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL, // Optional: when unset, only Discord is used
    blogUrl: process.env.BLOG_URL || "https://blog.naver.com/sekyofood",
    headless: process.env.HEADLESS !== "false", // Default: true (headless mode)
  };
}

/**
 * Outcome of sending to a single channel.
 */
interface SendOutcome {
  channel: string;
  ok: boolean;
  error?: string;
}

/**
 * Removes webhook URLs (which embed secret tokens) from a message before it is
 * logged. fetch/URL errors can echo the full URL, which would leak the token.
 */
function redactSecrets(message: string, secrets: Array<string | undefined>): string {
  let result = message;
  for (const secret of secrets) {
    if (secret) {
      result = result.split(secret).join("[REDACTED]");
    }
  }
  return result;
}

/**
 * Sends to a single channel, isolating and sanitizing any failure so one
 * channel's error never rejects the combined Promise.all or leaks a token.
 */
async function sendChannel(
  channel: string,
  send: () => Promise<void>,
  secrets: Array<string | undefined>,
): Promise<SendOutcome> {
  try {
    await send();
    return { channel, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { channel, ok: false, error: redactSecrets(message, secrets) };
  }
}

/**
 * Sends the crawl result to every configured channel independently.
 * One channel failing never prevents the others from being sent.
 */
async function sendToAllChannels(config: BotConfig, result: CrawlResult): Promise<SendOutcome[]> {
  const secrets = [config.webhookUrl, config.slackWebhookUrl];

  const tasks: Array<Promise<SendOutcome>> = [
    sendChannel("Discord", () => sendMenuToDiscord(config.webhookUrl, result), secrets),
  ];

  if (config.slackWebhookUrl) {
    const slackWebhookUrl = config.slackWebhookUrl;
    tasks.push(sendChannel("Slack", () => sendMenuToSlack(slackWebhookUrl, result), secrets));
  }

  // Each task swallows its own error above, so Promise.all never rejects here.
  return Promise.all(tasks);
}

async function main() {
  console.log("=== Daily Menu Bot Started ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // Load configuration
  const config = loadConfig();
  console.log(`Blog URL: ${config.blogUrl}`);
  console.log(`Headless mode: ${config.headless}`);
  console.log(`Slack enabled: ${Boolean(config.slackWebhookUrl)}`);

  // Step 1: Crawl the blog. crawlMenuImages never throws — it returns a result
  // with success=false on failure — but we guard defensively just in case.
  console.log("Step 1: Crawling blog...");
  // crawlMenuImages handles its own errors and returns success=false, but its
  // Puppeteer cleanup path could still throw. A genuine crash is an infrastructure
  // failure: we still notify, but must exit non-zero (preserves prior behavior).
  let result: CrawlResult;
  let crawlCrashed = false;
  try {
    result = await crawlMenuImages(config.blogUrl, config.headless);
  } catch (error) {
    crawlCrashed = true;
    const errorMessage = redactSecrets(error instanceof Error ? error.message : "Unknown error", [
      config.webhookUrl,
      config.slackWebhookUrl,
    ]);
    console.error("Unexpected crawling error:", errorMessage);
    result = {
      success: false,
      date: format(new Date(), "M월 d일", { locale: ko }),
      dayOfWeek: format(new Date(), "EEEE", { locale: ko }),
      error: errorMessage,
    };
  }

  console.log("Crawl result:", JSON.stringify(result, null, 2));

  // Step 2: Send to all configured channels (Discord + optional Slack)
  console.log("Step 2: Sending to channels...");
  const outcomes = await sendToAllChannels(config, result);

  for (const outcome of outcomes) {
    if (outcome.ok) {
      console.log(`✓ ${outcome.channel}: sent`);
    } else {
      console.error(`✗ ${outcome.channel}: ${outcome.error}`);
    }
  }

  const failedChannels = outcomes.filter((o) => !o.ok).map((o) => o.channel);
  if (crawlCrashed || failedChannels.length > 0) {
    if (crawlCrashed) {
      console.error("=== Bot Failed: crawler crashed unexpectedly ===");
    }
    if (failedChannels.length > 0) {
      console.error(`=== Bot Failed: ${failedChannels.join(", ")} send failed ===`);
    }
    process.exit(1);
  }

  console.log("=== Bot Completed Successfully ===");
  process.exit(0);
}

// Run the bot
main();
