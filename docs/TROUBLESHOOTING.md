# Troubleshooting Guide

이 문서는 Today Launch 봇의 일반적인 문제와 해결 방법을 설명합니다.

## 스케줄된 워크플로우가 실행되지 않음

### 증상
- 워크플로우가 매일 오전 9시(KST)에 자동으로 실행되지 않음
- Actions 탭에서 실행 기록이 모두 수동 실행(`workflow_dispatch`)으로만 표시됨
- 스케줄에 의한 자동 실행 기록이 없음

### 원인 및 해결 방법

#### 1. 워크플로우가 기본 브랜치에 없음 ⭐ 가장 흔한 원인

**원인**: GitHub Actions의 스케줄된 워크플로우는 **오직 기본 브랜치(main 또는 master)에서만 실행**됩니다.

**확인 방법**:
```bash
# 현재 기본 브랜치 확인
git remote show origin | grep "HEAD branch"

# 워크플로우 파일이 있는 브랜치 확인
git branch --contains $(git rev-parse HEAD)
```

**해결 방법**:
1. 워크플로우 파일이 포함된 브랜치를 기본 브랜치에 병합합니다
2. PR을 생성하고 기본 브랜치에 병합합니다
3. 병합 후 다음 스케줄 시간(다음날 오전 9시)에 자동으로 실행됩니다

#### 2. 워크플로우를 방금 추가함

**원인**: 워크플로우 파일을 기본 브랜치에 추가한 직후에는 GitHub Actions가 파일을 인식하는데 시간이 걸립니다.

**해결 방법**:
1. 워크플로우를 수동으로 한 번 실행해보세요 (Actions 탭 → Run workflow)
2. 다음 스케줄 시간까지 기다려보세요
3. 첫 스케줄 실행은 워크플로우 추가 후 다음 예정 시간에 발생합니다

#### 3. 리포지토리가 비활성 상태

**원인**: 공개 리포지토리에서 60일 이상 활동이 없으면 GitHub가 자동으로 스케줄된 워크플로우를 비활성화합니다.

**확인 방법**:
1. **Actions** 탭으로 이동
2. "Daily Menu Bot" 워크플로우 선택
3. 비활성화 경고 메시지 확인

**해결 방법**:
1. Actions 탭에서 워크플로우를 다시 활성화합니다
2. "Enable workflow" 버튼 클릭

#### 4. GitHub Actions 권한 문제

**원인**: 리포지토리의 Actions 권한이 비활성화되어 있을 수 있습니다.

**확인 방법**:
1. **Settings** → **Actions** → **General**로 이동
2. "Actions permissions" 섹션 확인

**해결 방법**:
1. "Allow all actions and reusable workflows" 선택
2. "Save" 클릭

#### 5. GitHub Actions의 스케줄 지연

**원인**: GitHub Actions의 cron 스케줄은 정확한 시간을 보장하지 않습니다. 높은 부하 시간대에는 최대 몇 분에서 몇 시간까지 지연될 수 있습니다.

**특징**:
- 무료 티어에서는 우선순위가 낮아 지연이 더 심할 수 있습니다
- 드물게 스케줄이 완전히 건너뛰어질 수도 있습니다

**해결 방법**:
- 이는 GitHub Actions의 한계로, 완벽한 해결책은 없습니다
- 중요한 경우 외부 cron 서비스 사용을 고려하세요:
  - [cron-job.org](https://cron-job.org)
  - [EasyCron](https://www.easycron.com)
  - [GitHub Actions API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)를 호출하는 외부 서비스

### 빠른 확인 체크리스트

스케줄 실행 문제 해결을 위한 체크리스트:

- [ ] 워크플로우 파일(`.github/workflows/daily-menu.yml`)이 기본 브랜치(main)에 있는가?
- [ ] Actions 탭에서 워크플로우가 활성화되어 있는가?
- [ ] Repository Settings → Actions → General에서 Actions 권한이 활성화되어 있는가?
- [ ] `DISCORD_WEBHOOK_URL` 시크릿이 올바르게 설정되어 있는가?
- [ ] 최근 60일 이내에 리포지토리에 커밋이 있는가?
- [ ] 수동 실행(`workflow_dispatch`)은 정상적으로 작동하는가?

## 봇이 메뉴를 찾지 못함

### 증상
- Discord에 "오늘 메뉴를 찾을 수 없습니다" 에러 메시지 표시
- 워크플로우는 실행되지만 메뉴 이미지가 전송되지 않음

### 원인 및 해결 방법

#### 1. 블로그에 오늘 메뉴가 아직 게시되지 않음

**원인**: 세교푸드 블로그에 오늘 날짜의 메뉴가 아직 게시되지 않았습니다.

**확인 방법**:
- 에러 메시지의 블로그 링크를 클릭하여 수동으로 확인

**해결 방법**:
- 블로그에 메뉴가 게시될 때까지 기다립니다
- 필요시 워크플로우를 나중에 수동으로 다시 실행합니다

#### 2. 블로그 구조 변경

**원인**: 네이버 블로그의 HTML 구조가 변경되어 크롤러가 메뉴를 찾지 못합니다.

**확인 방법**:
```bash
npm run dev  # 로컬에서 실행하여 에러 메시지 확인
```

**해결 방법**:
1. `src/crawler.ts` 파일의 셀렉터를 업데이트해야 합니다
2. 이슈를 등록하여 관리자에게 알립니다

## Discord 메시지가 전송되지 않음

### 증상
- 워크플로우가 성공적으로 완료되지만 Discord에 메시지가 표시되지 않음

### 원인 및 해결 방법

#### 1. Webhook URL이 잘못됨

**확인 방법**:
1. **Settings** → **Secrets and variables** → **Actions**로 이동
2. `DISCORD_WEBHOOK_URL` 시크릿 확인

**해결 방법**:
1. Discord에서 Webhook URL을 다시 복사합니다
2. GitHub 시크릿을 업데이트합니다

#### 2. Webhook이 삭제됨

**원인**: Discord에서 Webhook이 삭제되었습니다.

**해결 방법**:
1. Discord 서버 설정 → 연동 → 웹후크에서 새 웹후크를 생성합니다
2. 새 Webhook URL로 GitHub 시크릿을 업데이트합니다

## 로컬 실행 문제

### Puppeteer 브라우저 다운로드 오류

**증상**: `npm install` 실행 시 Chrome 다운로드 실패

**해결 방법**:
```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

그리고 시스템에 Chrome 또는 Chromium을 수동으로 설치합니다.

### 환경 변수 오류

**증상**: "DISCORD_WEBHOOK_URL is required" 에러

**해결 방법**:
```bash
cp .env.example .env
# .env 파일을 편집하여 올바른 Webhook URL 입력
```

## 추가 도움이 필요한 경우

- [GitHub Issues](https://github.com/UniM0cha/today-launch/issues)에 새 이슈를 등록하세요
- 이슈 등록 시 다음 정보를 포함해주세요:
  - 증상 설명
  - 에러 메시지 (있는 경우)
  - 워크플로우 실행 로그
  - 시도한 해결 방법
