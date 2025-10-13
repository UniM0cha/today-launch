import puppeteer, { Browser, Page } from 'puppeteer';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CrawlResult } from './types';

/**
 * Crawls the Naver blog and extracts menu images
 */
export async function crawlMenuImages(blogUrl: string): Promise<CrawlResult> {
  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Navigate to blog
    console.log(`Navigating to ${blogUrl}...`);
    await page.goto(blogUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for blog posts to load
    await page.waitForSelector('.se-section-documentList', { timeout: 10000 });

    // Get today's date in Korean format
    const today = new Date();
    const month = format(today, 'M', { locale: ko }); // "10"
    const day = format(today, 'd', { locale: ko }); // "14"
    const dayOfWeek = format(today, 'EEEE', { locale: ko }); // "월요일"
    const expectedTitle = `${month}월 ${day}일 ${dayOfWeek} 메뉴`;

    console.log(`Looking for post with title: ${expectedTitle}`);

    // Find the post with today's date
    const postLink = await findTodaysPost(page, month, day, dayOfWeek);

    if (!postLink) {
      return {
        success: false,
        date: `${month}월 ${day}일`,
        dayOfWeek,
        error: 'Today\'s menu post not found',
      };
    }

    // Navigate to the post
    await page.goto(postLink, { waitUntil: 'networkidle2' });

    // Extract images
    const images = await extractMenuImages(page);

    if (images.length < 2) {
      return {
        success: false,
        date: `${month}월 ${day}일`,
        dayOfWeek,
        error: `Expected 2 images (lunch & dinner), found ${images.length}`,
      };
    }

    return {
      success: true,
      date: `${month}월 ${day}일`,
      dayOfWeek,
      lunchImageUrl: images[0],
      dinnerImageUrl: images[1],
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Crawling error:', errorMessage);

    return {
      success: false,
      date: format(new Date(), 'M월 d일', { locale: ko }),
      dayOfWeek: format(new Date(), 'EEEE', { locale: ko }),
      error: errorMessage,
    };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Finds today's post link on the blog list
 */
async function findTodaysPost(
  page: Page,
  month: string,
  day: string,
  dayOfWeek: string
): Promise<string | null> {
  try {
    // Naver blog post titles are usually in <a> tags
    const posts = await page.$$eval('.se-section-documentList a', (links, args) => {
      const { month, day, dayOfWeek } = args;

      for (const link of links) {
        const title = link.textContent || '';
        // Match "10월 14일 월요일 메뉴" format
        if (title.includes(`${month}월 ${day}일`) && title.includes(dayOfWeek)) {
          return (link as HTMLAnchorElement).href;
        }
      }
      return null;
    }, { month, day, dayOfWeek });

    return posts;
  } catch (error) {
    console.error('Error finding today\'s post:', error);
    return null;
  }
}

/**
 * Extracts menu images from the post
 */
async function extractMenuImages(page: Page): Promise<string[]> {
  try {
    // Wait for images to load
    await page.waitForSelector('.se-image-resource', { timeout: 10000 });

    // Extract image URLs
    const imageUrls = await page.$$eval('.se-image-resource', (imgs) => {
      return imgs
        .map((img) => (img as HTMLImageElement).src)
        .filter((src) => src && src.startsWith('http'));
    });

    console.log(`Found ${imageUrls.length} images in the post`);
    return imageUrls;

  } catch (error) {
    console.error('Error extracting images:', error);
    return [];
  }
}
