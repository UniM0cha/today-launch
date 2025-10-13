import dotenv from "dotenv";
import { crawlMenuImages } from "./crawler";
import { sendMenuToDiscord } from "./discord";
import { BotConfig } from "./types";

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
    blogUrl: process.env.BLOG_URL || "https://blog.naver.com/sekyofood",
    headless: process.env.HEADLESS !== "false", // Default: true (headless mode)
  };
}

async function main() {
  console.log("=== Daily Menu Bot Started ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // Load configuration
  const config = loadConfig();
  console.log(`Blog URL: ${config.blogUrl}`);
  console.log(`Headless mode: ${config.headless}`);

  try {
    // Step 1: Crawl the blog
    console.log("Step 1: Crawling blog...");
    const result = await crawlMenuImages(config.blogUrl, config.headless);

    console.log("Crawl result:", JSON.stringify(result, null, 2));

    // Step 2: Send to Discord
    console.log("Step 2: Sending to Discord...");
    await sendMenuToDiscord(config.webhookUrl, result);

    console.log("=== Bot Completed Successfully ===");
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("=== Bot Failed ===");
    console.error("Error:", errorMessage);

    // Try to send error notification to Discord
    try {
      await sendMenuToDiscord(config.webhookUrl, {
        success: false,
        date: new Date().toLocaleDateString("ko-KR"),
        dayOfWeek: new Date().toLocaleDateString("ko-KR", { weekday: "long" }),
        error: errorMessage,
      });
    } catch (discordError) {
      console.error("Failed to send error to Discord:", discordError);
    }

    process.exit(1);
  }
}

// Run the bot
main();
