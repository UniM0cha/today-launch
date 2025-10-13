/**
 * Result of crawling the blog
 */
export interface CrawlResult {
  success: boolean;
  date: string; // "10월 14일"
  dayOfWeek: string; // "월요일"
  lunchImageUrl?: string;
  dinnerImageUrl?: string;
  error?: string;
}

/**
 * Configuration for the bot
 */
export interface BotConfig {
  webhookUrl: string;
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
