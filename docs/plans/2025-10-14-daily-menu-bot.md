# Daily Menu Bot Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Build an automated bot that crawls Naver blog daily and posts cafeteria menu images to Discord at 9 AM KST on weekdays.

**Architecture:** GitHub Actions scheduled workflow triggers a Node.js/TypeScript script that uses Puppeteer to crawl the Naver blog, extracts menu images, and sends them to Discord via Webhook. Error notifications are also sent to Discord.

**Tech Stack:**

- TypeScript
- Puppeteer (v24.x) - Web scraping
- discord.js (v14.22.1) - Discord Webhook client
- GitHub Actions - Scheduling & hosting
- date-fns - Date manipulation

---

## Task 1: Project Initialization

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore` (already exists, verify)

### Step 1: Initialize package.json

Create package.json with dependencies:

```json
{
  "name": "today-launch",
  "version": "1.0.0",
  "description": "Daily cafeteria menu bot for Discord",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/main.ts",
    "start": "node dist/main.js",
    "lint": "eslint src --ext .ts",
    "test": "echo \"No tests yet\" && exit 0"
  },
  "keywords": ["discord", "bot", "cafeteria", "menu"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "discord.js": "^14.22.1",
    "puppeteer": "^24.11.1",
    "date-fns": "^4.1.0",
    "dotenv": "^16.4.7"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### Step 2: Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Create .env.example

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Step 4: Verify .gitignore

Run: `cat .gitignore`

Expected: Should contain `.worktrees/`, `node_modules/`, `.env`, `dist/`, `*.log`

### Step 5: Install dependencies

Run: `npm install`

Expected: All dependencies installed successfully

### Step 6: Commit

```bash
git add package.json tsconfig.json .env.example
git commit -m "chore: initialize project with TypeScript and dependencies"
```

---

## Task 2: Type Definitions

**Files:**

- Create: `src/types.ts`

### Step 1: Create types file

Create `src/types.ts`:

```typescript
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
```

### Step 2: Commit

```bash
git add src/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Crawler Module

**Files:**

- Create: `src/crawler.ts`

### Step 1: Create crawler skeleton

Create `src/crawler.ts`:

```typescript
import puppeteer, { Browser, Page } from "puppeteer";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CrawlResult } from "./types";

/**
 * Crawls the Naver blog and extracts menu images
 */
export async function crawlMenuImages(blogUrl: string): Promise<CrawlResult> {
  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Navigate to blog
    console.log(`Navigating to ${blogUrl}...`);
    await page.goto(blogUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for blog posts to load
    await page.waitForSelector(".se-section-documentList", { timeout: 10000 });

    // Get today's date in Korean format
    const today = new Date();
    const month = format(today, "M", { locale: ko }); // "10"
    const day = format(today, "d", { locale: ko }); // "14"
    const dayOfWeek = format(today, "EEEE", { locale: ko }); // "월요일"
    const expectedTitle = `${month}월 ${day}일 ${dayOfWeek} 메뉴`;

    console.log(`Looking for post with title: ${expectedTitle}`);

    // Find the post with today's date
    const postLink = await findTodaysPost(page, month, day, dayOfWeek);

    if (!postLink) {
      return {
        success: false,
        date: `${month}월 ${day}일`,
        dayOfWeek,
        error: "Today's menu post not found",
      };
    }

    // Navigate to the post
    await page.goto(postLink, { waitUntil: "networkidle2" });

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
 * Finds today's post link on the blog list
 */
async function findTodaysPost(page: Page, month: string, day: string, dayOfWeek: string): Promise<string | null> {
  try {
    // Naver blog post titles are usually in <a> tags
    const posts = await page.$$eval(
      ".se-section-documentList a",
      (links, args) => {
        const { month, day, dayOfWeek } = args;

        for (const link of links) {
          const title = link.textContent || "";
          // Match "10월 14일 월요일 메뉴" format
          if (title.includes(`${month}월 ${day}일`) && title.includes(dayOfWeek)) {
            return (link as HTMLAnchorElement).href;
          }
        }
        return null;
      },
      { month, day, dayOfWeek },
    );

    return posts;
  } catch (error) {
    console.error("Error finding today's post:", error);
    return null;
  }
}

/**
 * Extracts menu images from the post
 */
async function extractMenuImages(page: Page): Promise<string[]> {
  try {
    // Wait for images to load
    await page.waitForSelector(".se-image-resource", { timeout: 10000 });

    // Extract image URLs
    const imageUrls = await page.$$eval(".se-image-resource", (imgs) => {
      return imgs.map((img) => (img as HTMLImageElement).src).filter((src) => src && src.startsWith("http"));
    });

    console.log(`Found ${imageUrls.length} images in the post`);
    return imageUrls;
  } catch (error) {
    console.error("Error extracting images:", error);
    return [];
  }
}
```

### Step 2: Test the types compile

Run: `npm run build`

Expected: TypeScript compiles successfully with no errors

### Step 3: Commit

```bash
git add src/crawler.ts
git commit -m "feat: implement blog crawler with Puppeteer"
```

---

## Task 4: Discord Module

**Files:**

- Create: `src/discord.ts`

### Step 1: Create Discord sender module

Create `src/discord.ts`:

```typescript
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
```

### Step 2: Test the types compile

Run: `npm run build`

Expected: TypeScript compiles successfully

### Step 3: Commit

```bash
git add src/discord.ts
git commit -m "feat: implement Discord webhook sender with embeds"
```

---

## Task 5: Main Entry Point

**Files:**

- Create: `src/main.ts`

### Step 1: Create main entry point

Create `src/main.ts`:

```typescript
import dotenv from "dotenv";
import { crawlMenuImages } from "./crawler";
import { sendMenuToDiscord } from "./discord";

// Load environment variables
dotenv.config();

const BLOG_URL = "https://blog.naver.com/sekyofood";
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function main() {
  console.log("=== Daily Menu Bot Started ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // Validate environment variables
  if (!WEBHOOK_URL) {
    console.error("ERROR: DISCORD_WEBHOOK_URL is not set");
    process.exit(1);
  }

  try {
    // Step 1: Crawl the blog
    console.log("Step 1: Crawling blog...");
    const result = await crawlMenuImages(BLOG_URL);

    console.log("Crawl result:", JSON.stringify(result, null, 2));

    // Step 2: Send to Discord
    console.log("Step 2: Sending to Discord...");
    await sendMenuToDiscord(WEBHOOK_URL, result);

    console.log("=== Bot Completed Successfully ===");
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("=== Bot Failed ===");
    console.error("Error:", errorMessage);

    // Try to send error notification to Discord
    try {
      await sendMenuToDiscord(WEBHOOK_URL, {
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
```

### Step 2: Build the project

Run: `npm run build`

Expected: TypeScript compiles successfully, `dist/` folder created with compiled JS

### Step 3: Commit

```bash
git add src/main.ts
git commit -m "feat: implement main entry point with error handling"
```

---

## Task 6: GitHub Actions Workflow

**Files:**

- Create: `.github/workflows/daily-menu.yml`

### Step 1: Create workflow directory

Run: `mkdir -p .github/workflows`

### Step 2: Create workflow file

Create `.github/workflows/daily-menu.yml`:

```yaml
name: Daily Menu Bot

on:
  schedule:
    # Runs at 00:00 UTC every weekday (Mon-Fri)
    # 00:00 UTC = 09:00 KST (UTC+9)
    - cron: "0 0 * * 1-5"

  # Allow manual trigger for testing
  workflow_dispatch:

jobs:
  send-menu:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build TypeScript
        run: npm run build

      - name: Run bot
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_WEBHOOK_URL }}
        run: npm start
```

### Step 3: Commit

```bash
git add .github/workflows/daily-menu.yml
git commit -m "ci: add GitHub Actions workflow for daily scheduling"
```

---

## Task 7: Documentation

**Files:**

- Create: `README.md`

### Step 1: Create README

Create `README.md`:

````markdown
# Today Launch - Daily Menu Bot

매일 아침 9시에 세교푸드 구내식당 메뉴를 Discord로 전송하는 자동화 봇입니다.

## 🚀 Features

- 📅 평일 오전 9시(KST) 자동 실행
- 🍱 네이버 블로그에서 중식/석식 메뉴 크롤링
- 📨 Discord Webhook으로 이미지 전송
- ⚠️ 에러 발생 시 Discord로 알림

## 🛠️ Tech Stack

- **Runtime:** Node.js 20 + TypeScript
- **Crawler:** Puppeteer
- **Discord:** discord.js Webhook
- **CI/CD:** GitHub Actions

## 📦 Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd today-launch
```
````

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your Discord Webhook URL:

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 4. Run locally

```bash
npm run dev
```

## 🔧 GitHub Actions Setup

1. Go to your repository's **Settings** → **Secrets and variables** → **Actions**
2. Add a new secret:
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: Your Discord Webhook URL

3. The bot will automatically run every weekday at 9 AM KST

### Manual Trigger

You can manually trigger the workflow:

1. Go to **Actions** tab
2. Select **Daily Menu Bot** workflow
3. Click **Run workflow**

## 📝 How to Get Discord Webhook URL

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Set a name (e.g., "세교푸드 메뉴")
5. Select the channel where you want to receive messages
6. Copy the **Webhook URL**

## 🤝 Contributing

Feel free to open issues or submit pull requests!

## 📄 License

MIT

````

### Step 2: Commit

```bash
git add README.md
git commit -m "docs: add comprehensive README"
````

---

## Task 8: Final Testing & Verification

**Files:**

- Verify: All files created and committed

### Step 1: Verify project structure

Run: `find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' | sort`

Expected output should include:

```
./.env.example
./.github/workflows/daily-menu.yml
./.gitignore
./README.md
./package.json
./src/crawler.ts
./src/discord.ts
./src/main.ts
./src/types.ts
./tsconfig.json
```

### Step 2: Build the project

Run: `npm run build`

Expected: Success with no errors

### Step 3: Check git status

Run: `git status`

Expected: Working tree clean, all changes committed

### Step 4: View commit history

Run: `git log --oneline`

Expected: Should show all commits from Tasks 1-7

---

## Deployment Checklist

Before deploying to production:

- [ ] Create Discord Webhook in target channel
- [ ] Add `DISCORD_WEBHOOK_URL` to GitHub Secrets
- [ ] Test workflow with `workflow_dispatch` (manual trigger)
- [ ] Verify timezone (cron runs at 00:00 UTC = 09:00 KST)
- [ ] Test error handling (e.g., invalid webhook URL)
- [ ] Confirm bot works on weekdays only

## Notes

- GitHub Actions free tier provides 2000 minutes/month (more than enough)
- Puppeteer runs in headless mode on GitHub Actions
- The bot will NOT run on weekends (cron: `1-5` = Monday to Friday)
- If blog post is not found, error notification will be sent to Discord
