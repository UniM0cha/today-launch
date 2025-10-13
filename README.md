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
