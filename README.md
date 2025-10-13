# Today Launch - 일일 메뉴 봇

매일 아침 9시에 세교푸드 구내식당 메뉴를 Discord로 전송하는 자동화 봇입니다.

## 주요 기능

- 평일 오전 9시(KST) 자동 실행
- 네이버 블로그에서 중식/석식 메뉴 크롤링
- Discord Webhook으로 이미지 전송
- 에러 발생 시 Discord로 알림

## 기술 스택

- **런타임:** Node.js 20 + TypeScript
- **크롤러:** Puppeteer
- **Discord:** discord.js Webhook
- **CI/CD:** GitHub Actions

## 설치 및 설정

### 1. 저장소 복제

```bash
git clone <repository-url>
cd today-launch
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 Discord Webhook URL을 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 수정:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### 4. 로컬 실행

```bash
npm run dev
```

## GitHub Actions 설정

1. 저장소의 **Settings** → **Secrets and variables** → **Actions**로 이동
2. 새로운 시크릿 추가:
   - 이름: `DISCORD_WEBHOOK_URL`
   - 값: Discord Webhook URL

3. 평일 오전 9시(KST)에 자동으로 실행됩니다

### 수동 실행

워크플로우를 수동으로 실행할 수 있습니다:

1. **Actions** 탭으로 이동
2. **Daily Menu Bot** 워크플로우 선택
3. **Run workflow** 클릭

## Discord Webhook URL 얻는 방법

1. Discord 서버 열기
2. **서버 설정** → **연동** → **웹후크**로 이동
3. **새 웹후크** 클릭
4. 이름 설정 (예: "세교푸드 메뉴")
5. 메시지를 받을 채널 선택
6. **웹후크 URL** 복사

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 모드로 실행 (tsx 사용, 핫 리로드)
npm run build        # TypeScript를 JavaScript로 컴파일
npm start            # 컴파일된 JavaScript 실행 (dist/ 폴더)
npm run lint         # ESLint 실행
```

## 기여하기

이슈를 등록하거나 Pull Request를 제출해주세요!

## 라이선스

MIT
