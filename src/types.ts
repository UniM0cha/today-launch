/**
 * Result of crawling the blog
 */
export interface CrawlResult {
  success: boolean;
  date: string; // "10월 14일"
  dayOfWeek: string; // "월요일"
  menuImageUrl?: string;
  error?: string;
}

/**
 * Configuration for the bot
 */
export interface BotConfig {
  webhookUrl: string;
  slackWebhookUrl?: string; // Optional: Slack incoming webhook. When unset, only Discord is used.
  blogUrl: string;
  headless: boolean;
}

import { EmbedBuilder } from "discord.js";

/**
 * Discord message payload
 * Compatible with Discord.js WebhookMessageCreateOptions
 */
export interface DiscordMessage {
  content?: string;
  embeds?: EmbedBuilder[];
  files?: Array<{
    attachment: Buffer;
    name: string;
  }>;
}
