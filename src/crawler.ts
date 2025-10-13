import puppeteer, { Browser } from "puppeteer";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CrawlResult } from "./types";

/**
 * Crawls the Naver blog and extracts menu images
 */
export async function crawlMenuImages(blogUrl: string, headless: boolean = true): Promise<CrawlResult> {
  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set user agent to desktop browser to ensure we get the desktop version
    await page.setUserAgent({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "MacIntel",
    });

    // Navigate to blog
    console.log(`Navigating to ${blogUrl}...`);
    await page.goto(blogUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for iframe to load (Naver blog uses iframe for content)
    await page.waitForSelector("iframe#mainFrame", { timeout: 10000 });
    console.log("Found mainFrame iframe");

    // Get the iframe content
    const frameHandle = await page.$("iframe#mainFrame");
    if (!frameHandle) {
      throw new Error("mainFrame iframe not found");
    }

    const frame = await frameHandle.contentFrame();
    if (!frame) {
      throw new Error("Could not access iframe content");
    }

    console.log("Switched to iframe context");

    // Wait for blog posts to load inside the iframe
    await frame.waitForSelector("#postListBody", { timeout: 10000 });
    console.log("Found #postListBody inside iframe");

    // Get today's date in Korean format
    const today = new Date();
    const month = format(today, "M", { locale: ko }); // "10"
    const day = format(today, "d", { locale: ko }); // "14"
    const dayOfWeek = format(today, "EEEE", { locale: ko }); // "화요일"
    const expectedTitle = `${month}월 ${day}일 ${dayOfWeek} 메뉴`;

    console.log(`Looking for post with title: ${expectedTitle}`);

    // Find today's post and extract images directly from the iframe
    const images = await findTodaysPostAndExtractImages(frame, month, day, dayOfWeek);

    if (!images) {
      return {
        success: false,
        date: `${month}월 ${day}일`,
        dayOfWeek,
        error: "Today's menu post not found",
      };
    }

    if (images.length < 1) {
      return {
        success: false,
        date: `${month}월 ${day}일`,
        dayOfWeek,
        error: `Expected at least 1 menu image, found ${images.length}`,
      };
    }

    return {
      success: true,
      date: `${month}월 ${day}일`,
      dayOfWeek,
      menuImageUrl: images[0],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Crawling error:", errorMessage);

    return {
      success: false,
      date: format(new Date(), "M월 d일", { locale: ko }),
      dayOfWeek: format(new Date(), "EEEE", { locale: ko }),
      error: errorMessage,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Finds today's post and extracts images directly from the iframe
 */
async function findTodaysPostAndExtractImages(
  frame: import("puppeteer").Frame,
  month: string,
  day: string,
  dayOfWeek: string,
): Promise<string[] | null> {
  try {
    // Get all post elements
    const posts = await frame.$$(".post._post_wrap");
    console.log(`Found ${posts.length} posts on the page`);

    // Search through each post
    for (const post of posts) {
      try {
        // Extract title from the post
        const titleElement = await post.$(".se-title-text .se-text-paragraph");
        if (!titleElement) continue;

        const title = await frame.evaluate((el: Element) => el.textContent || "", titleElement);
        console.log(`Checking post title: ${title.trim()}`);

        // Check if this is today's menu post
        if (title.includes(`${month}월 ${day}일`) && title.includes(dayOfWeek)) {
          console.log("Found matching post! Extracting images...");

          // Extract images from this post
          const imageElements = await post.$$(".se-image-resource");
          const imageUrls: string[] = [];

          for (const imgElement of imageElements) {
            // Try to get original image URL from data-linkdata
            const linkElement = await imgElement.evaluateHandle((el: Element) => el.closest("a.se-module-image-link"));

            let imageUrl: string | null = null;

            // Try to get original image URL from data-linkdata and add size parameter
            if (linkElement) {
              imageUrl = await frame.evaluate((link: Element | null) => {
                const linkData = (link as HTMLAnchorElement)?.getAttribute("data-linkdata");
                if (linkData) {
                  try {
                    const data = JSON.parse(linkData);
                    if (data.src) {
                      // Add w773 parameter for larger image size
                      return data.src + "?type=w773";
                    }
                  } catch {
                    return null;
                  }
                }
                return null;
              }, linkElement);
            }

            // Fallback: Use img src attribute directly
            if (!imageUrl) {
              imageUrl = await frame.evaluate((img: Element) => {
                return (img as HTMLImageElement).src;
              }, imgElement);
            }

            if (imageUrl && imageUrl.startsWith("http")) {
              imageUrls.push(imageUrl);
            }
          }

          console.log(`Extracted ${imageUrls.length} images from today's post`);
          return imageUrls;
        }
      } catch (postError) {
        console.error("Error processing post:", postError);
      }
    }

    console.log("Today's menu post not found");
    return null;
  } catch (error) {
    console.error("Error finding today's post:", error);
    return null;
  }
}
