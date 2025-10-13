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

Copy `.env.example` to `.env` and set:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Testing Locally

```bash
npm run dev          # Executes immediately, simulating scheduled run
```

## Architecture

### Module Structure

The application follows a simple three-layer architecture:

1. **Entry Point** (`src/main.ts`)
   - Validates environment variables
   - Orchestrates the crawl → send workflow
   - Handles top-level error catching and Discord error notifications
   - Target blog: `https://blog.naver.com/sekyofood`

2. **Crawler Layer** (`src/crawler.ts`)
   - Uses Puppeteer to navigate Naver blog
   - Searches for posts matching today's date pattern: `{M}월 {d}일 {dayOfWeek} 메뉴`
   - Extracts two images from the post (assumed to be lunch and dinner in order)
   - Returns structured `CrawlResult` with success status and image URLs or error message
   - Key selectors:
     - Post list: `.se-section-documentList`
     - Images: `.se-image-resource`

3. **Discord Layer** (`src/discord.ts`)
   - Sends rich embeds via Discord webhook
   - Success: Sends 3 embeds (header + lunch image + dinner image)
   - Failure: Sends warning embed with error details and manual link to blog

### Data Flow

```
main.ts
  ├─> crawlMenuImages(blogUrl) → CrawlResult
  │     └─> Puppeteer: Navigate → Find post → Extract images
  │
  └─> sendMenuToDiscord(webhookUrl, result)
        └─> Discord: Build embeds → Send webhook
```

### Type Definitions (`src/types.ts`)

- **CrawlResult**: Union type that represents either successful crawl (with image URLs) or failure (with error message)
- **BotConfig**: Configuration interface (currently unused but available for future refactoring)
- **DiscordMessage**: Type reference for Discord payloads (currently unused)

## Important Implementation Details

### Date Formatting

- Uses `date-fns` with Korean locale to format dates matching the blog's post title pattern
- Example: `10월 14일 월요일 메뉴` (October 14th Monday Menu)

### Puppeteer Configuration

- Runs headless in production
- Uses `--no-sandbox` and `--disable-setuid-sandbox` for CI/CD compatibility (GitHub Actions)
- Waits for `networkidle2` to ensure content is fully loaded

### Error Handling Strategy

- **Graceful degradation**: If crawling fails, the bot still sends a Discord notification explaining the error
- **Exit codes**: Process exits with code 1 on failure, 0 on success (for CI/CD monitoring)
- **Double error handling**: If sending error notification to Discord also fails, logs to console

### Expected Image Count

The crawler expects exactly 2 images from each post:

1. First image = Lunch menu (중식)
2. Second image = Dinner menu (석식)

If fewer than 2 images are found, the bot reports an error.

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
4. **Selector brittleness**: Naver blog DOM structure may change. Consider adding fallback selectors or OCR-based extraction.
5. **Image validation**: Verify that extracted images are actually menu images (size, aspect ratio, etc.).
