# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Today Launch** is an automated Discord bot that scrapes the daily cafeteria menu from a Naver blog (세교푸드) and posts it to Discord every weekday morning at 9 AM KST. The bot uses Puppeteer for web scraping and Discord.js webhooks for messaging.

## Common Commands

### Development

```bash
npm install          # Install dependencies
npm run dev          # Run in development mode with tsx (hot reload)
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled JavaScript from dist/
npm run lint         # Run ESLint on TypeScript files
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
BLOG_URL=https://blog.naver.com/sekyofood  # Optional, defaults to sekyofood
HEADLESS=true                                # Optional, defaults to true
```

### Testing Locally

```bash
npm run dev          # Executes immediately, simulating scheduled run
```

## Architecture

### Module Structure

The application follows a simple three-layer architecture:

1. **Entry Point** (`src/main.ts`)
   - Loads configuration from environment variables via `loadConfig()`
   - Validates required `DISCORD_WEBHOOK_URL`
   - Configurable blog URL (defaults to `https://blog.naver.com/sekyofood`)
   - Configurable headless mode (defaults to `true`)
   - Orchestrates the crawl → send workflow
   - Handles top-level error catching and Discord error notifications

2. **Crawler Layer** (`src/crawler.ts`)
   - Uses Puppeteer with configurable headless mode
   - Sets desktop user agent to ensure proper page rendering
   - Navigates to Naver blog and waits for `iframe#mainFrame` to load
   - Switches context to iframe to access blog content
   - Searches for posts matching today's date pattern: `{M}월 {d}일 {dayOfWeek} 메뉴`
   - Extracts menu image(s) from the matching post (consolidated lunch & dinner)
   - Returns structured `CrawlResult` with success status and image URL or error message
   - Key selectors:
     - Main iframe: `iframe#mainFrame`
     - Post list container: `#postListBody`
     - Individual posts: `.post._post_wrap`
     - Post titles: `.se-title-text .se-text-paragraph`
     - Images: `.se-image-resource`
   - Image extraction strategy:
     1. First tries to get original URL from `data-linkdata` JSON attribute and adds `?type=w773` parameter for optimal Discord display size
     2. Falls back to `img.src` directly (which may include lazy-loading parameters)

3. **Discord Layer** (`src/discord.ts`)
   - Sends rich embeds via Discord webhook using `discord.js` WebhookClient
   - Success: Sends 2 embeds (header + combined lunch/dinner menu image)
     - Header embed: Green color, shows date and description
     - Menu embed: Blue color, displays the consolidated menu image
   - Failure: Sends warning embed with error details and manual link to blog
     - Orange/yellow color for visibility
     - Includes error message and direct blog link

### Data Flow

```
main.ts
  ├─> loadConfig() → BotConfig
  │     └─> Validates DISCORD_WEBHOOK_URL
  │     └─> Sets blogUrl (default: https://blog.naver.com/sekyofood)
  │     └─> Sets headless mode (default: true)
  │
  ├─> crawlMenuImages(blogUrl, headless) → CrawlResult
  │     └─> Puppeteer: Launch → Navigate to iframe → Find post → Extract images
  │
  └─> sendMenuToDiscord(webhookUrl, result)
        └─> Discord: Build embeds → Send webhook
```

### Type Definitions (`src/types.ts`)

- **CrawlResult**: Interface representing crawl outcome
  - `success: boolean` - Whether crawling succeeded
  - `date: string` - Formatted date (e.g., "10월 14일")
  - `dayOfWeek: string` - Day of week in Korean (e.g., "월요일")
  - `menuImageUrl?: string` - URL of the consolidated menu image (present on success)
  - `error?: string` - Error message (present on failure)
- **BotConfig**: Configuration loaded from environment
  - `webhookUrl: string` - Discord webhook URL (required)
  - `blogUrl: string` - Naver blog URL to crawl
  - `headless: boolean` - Puppeteer headless mode setting
- **DiscordMessage**: Type for Discord webhook payloads
  - `content?: string` - Text content
  - `embeds?: EmbedBuilder[]` - Array of Discord embeds
  - `files?: Array<{...}>` - File attachments (currently unused)

## Important Implementation Details

### Date Formatting

- Uses `date-fns` with Korean locale to format dates matching the blog's post title pattern
- Example: `10월 14일 월요일 메뉴` (October 14th Monday Menu)

### Puppeteer Configuration

- Configurable headless mode (defaults to `true`, can be set to `false` via `HEADLESS=false` for debugging)
- Uses `--no-sandbox` and `--disable-setuid-sandbox` for CI/CD compatibility (GitHub Actions)
- Sets desktop user agent with platform info to ensure desktop version of blog is loaded
- Waits for `networkidle2` to ensure content is fully loaded
- Handles Naver blog's iframe architecture:
  - Waits for `iframe#mainFrame` to load
  - Switches to iframe context to access blog posts
  - Waits for `#postListBody` within iframe

### Error Handling Strategy

- **Graceful degradation**: If crawling fails, the bot still sends a Discord notification explaining the error
- **Exit codes**: Process exits with code 1 on failure, 0 on success (for CI/CD monitoring)
- **Double error handling**: If sending error notification to Discord also fails, logs to console

### Menu Image Handling

The crawler expects at least 1 image from each post:

- The cafeteria now provides a **consolidated menu image** that includes both lunch (중식) and dinner (석식)
- Extracts the first image found in the matching post
- If fewer than 1 image is found, the bot reports an error
- Image quality optimization:
  - Extracts original URL from `data-linkdata` attribute to avoid lazy-loading blur
  - Adds `?type=w773` parameter to get optimal image size for Discord embeds (large enough to be readable, small enough to load quickly)
  - Note: Without the size parameter, Naver's CDN may serve a very small thumbnail; with it, Discord displays the image at a good readable size

## GitHub Actions Deployment

Workflow file: `.github/workflows/daily-menu.yml`

- **Schedule**: Runs at 00:00 UTC (09:00 KST) on weekdays (Mon-Fri)
- **Manual trigger**: Available via `workflow_dispatch`
- **Required secret**: `DISCORD_WEBHOOK_URL` must be set in repository secrets
- **Build process**: Compiles TypeScript → Runs `npm start` with compiled code

## Potential Improvement Areas

If you're asked to enhance this bot, consider these common needs:

1. **Testing**: No tests exist yet. Consider adding integration tests for the crawler with mocked Puppeteer responses.
2. **Retry logic**: Add exponential backoff for transient network failures.
3. **Caching**: Consider caching results to avoid duplicate posts if the bot runs multiple times per day.
4. **Selector brittleness**: Naver blog DOM structure may change. Consider adding:
   - Fallback selectors for different blog layouts
   - More robust iframe detection
   - Better error messages when selectors fail
5. **Image validation**: Verify that extracted images are actually menu images (size, aspect ratio, etc.).
6. **Multi-image support**: If the cafeteria switches back to separate lunch/dinner images, the bot would need to handle multiple images again.
