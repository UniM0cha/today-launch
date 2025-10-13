import { WebhookClient, EmbedBuilder } from "discord.js";
import { CrawlResult } from "./types";

/**
 * Sends menu images to Discord
 */
export async function sendMenuToDiscord(webhookUrl: string, result: CrawlResult): Promise<void> {
  const webhook = new WebhookClient({ url: webhookUrl });

  try {
    if (result.success && result.lunchImageUrl && result.dinnerImageUrl) {
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
 * Sends success message with menu images
 */
async function sendSuccessMessage(webhook: WebhookClient, result: CrawlResult): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x00ff00) // Green
    .setTitle(`🍴 오늘의 세교푸드 메뉴 (${result.date} ${result.dayOfWeek})`)
    .setDescription("오늘의 중식과 석식 메뉴입니다.")
    .setTimestamp()
    .setFooter({ text: "세교푸드 메뉴 봇" });

  // Send lunch image
  const lunchEmbed = new EmbedBuilder().setColor(0x0099ff).setTitle("🍱 중식").setImage(result.lunchImageUrl!);

  // Send dinner image
  const dinnerEmbed = new EmbedBuilder().setColor(0xff9900).setTitle("🍽️ 석식").setImage(result.dinnerImageUrl!);

  await webhook.send({
    embeds: [embed, lunchEmbed, dinnerEmbed],
  });
}

/**
 * Sends error notification
 */
async function sendErrorMessage(webhook: WebhookClient, result: CrawlResult): Promise<void> {
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

  await webhook.send({
    embeds: [embed],
  });
}
