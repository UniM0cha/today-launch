import { WebhookClient, EmbedBuilder } from "discord.js";
import { CrawlResult, DiscordMessage } from "./types";

/**
 * Sends menu images to Discord
 */
export async function sendMenuToDiscord(webhookUrl: string, result: CrawlResult): Promise<void> {
  const webhook = new WebhookClient({ url: webhookUrl });

  try {
    if (result.success && result.menuImageUrl) {
      // Success: Send menu images
      await sendSuccessMessage(webhook, result);
    } else {
      // Error: Send error notification
      await sendErrorMessage(webhook, result);
    }

    console.log("Message sent to Discord successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending to Discord:", errorMessage);
    throw error;
  } finally {
    webhook.destroy();
  }
}

/**
 * Builds success message with menu images
 */
function buildSuccessMessage(result: CrawlResult): DiscordMessage {
  const headerEmbed = new EmbedBuilder()
    .setColor(0x00ff00) // Green
    .setTitle(`🍴 오늘의 세교푸드 메뉴 (${result.date} ${result.dayOfWeek})`)
    .setDescription("오늘의 중식 & 석식 메뉴입니다.")
    .setTimestamp()
    .setFooter({ text: "세교푸드 메뉴 봇" });

  // Menu image embed
  const menuEmbed = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle("🍱 중식 & 🍽️ 석식")
    .setImage(result.menuImageUrl!);

  return {
    content: "",
    embeds: [headerEmbed, menuEmbed],
  };
}

/**
 * Sends success message with menu images
 */
async function sendSuccessMessage(webhook: WebhookClient, result: CrawlResult): Promise<void> {
  const message = buildSuccessMessage(result);
  await webhook.send(message);
}

/**
 * Builds error notification message
 */
function buildErrorMessage(result: CrawlResult): DiscordMessage {
  const embed = new EmbedBuilder()
    .setColor(0xffaa00) // Yellow/Orange
    .setTitle("⚠️ 메뉴를 찾을 수 없습니다")
    .setDescription(
      `오늘(${result.date} ${result.dayOfWeek}) 세교푸드 메뉴를 찾을 수 없습니다.\n\n` +
        `**오류 메시지:** ${result.error}\n\n` +
        `블로그를 직접 확인해주세요: https://blog.naver.com/sekyofood`,
    )
    .setTimestamp()
    .setFooter({ text: "세교푸드 메뉴 봇" });

  return {
    content: "",
    embeds: [embed],
  };
}

/**
 * Sends error notification
 */
async function sendErrorMessage(webhook: WebhookClient, result: CrawlResult): Promise<void> {
  const message = buildErrorMessage(result);
  await webhook.send(message);
}
