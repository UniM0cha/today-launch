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

/**
 * Discord message payload
 */
export interface DiscordMessage {
  content: string;
  embeds?: Array<{
    color: number;
    description?: string;
    image?: { url: string };
  }>;
  files?: Array<{
    attachment: Buffer;
    name: string;
  }>;
}
