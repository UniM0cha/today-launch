import dotenv from 'dotenv';
import { crawlMenuImages } from './crawler';
import { sendMenuToDiscord } from './discord';

// Load environment variables
dotenv.config();

const BLOG_URL = 'https://blog.naver.com/sekyofood';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function main() {
  console.log('=== Daily Menu Bot Started ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Validate environment variables
  if (!WEBHOOK_URL) {
    console.error('ERROR: DISCORD_WEBHOOK_URL is not set');
    process.exit(1);
  }

  try {
    // Step 1: Crawl the blog
    console.log('Step 1: Crawling blog...');
    const result = await crawlMenuImages(BLOG_URL);

    console.log('Crawl result:', JSON.stringify(result, null, 2));

    // Step 2: Send to Discord
    console.log('Step 2: Sending to Discord...');
    await sendMenuToDiscord(WEBHOOK_URL, result);

    console.log('=== Bot Completed Successfully ===');
    process.exit(0);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== Bot Failed ===');
    console.error('Error:', errorMessage);

    // Try to send error notification to Discord
    try {
      await sendMenuToDiscord(WEBHOOK_URL, {
        success: false,
        date: new Date().toLocaleDateString('ko-KR'),
        dayOfWeek: new Date().toLocaleDateString('ko-KR', { weekday: 'long' }),
        error: errorMessage,
      });
    } catch (discordError) {
      console.error('Failed to send error to Discord:', discordError);
    }

    process.exit(1);
  }
}

// Run the bot
main();
