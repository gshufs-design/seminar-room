# 한국외국어대학교 대학원 세미나실 예약 시스템

대학원생이 공용 세미나실을 예약하고, 관리자가 승인/거절하는 웹 예약 시스템입니다.

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Auth**: JWT (jose) + bcryptjs
- **Charts**: Recharts
- **Icons**: Lucide React

---

## 주요 기능

### 사용자
- 월간 캘린더로 예약 현황 확인
- 날짜 클릭 → 시간대별 현황(07:00~23:00) 조회
- 1~3시간 단위 예약 신청 (24시간 전 제한)
- 학번 + 연락처로 내 예약 조회
- 예약 취소
- 승인된 예약의 세미나실 비밀번호 확인 (예약 시작 24시간 전부터 공개)

### 관리자
- 예약 승인 / 거절 처리
- 관리자 메모 작성
- 세미나실 비밀번호 변경
- 월간 통계 조회 (차트)

---

## 로컬 실행 방법

### 1. 저장소 클론 및 의존성 설치

```bash
cd seminar-room
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Supabase 정보를 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
```

### 3. Supabase 데이터베이스 설정

1. [Supabase](https://supabase.com) 에 접속하여 새 프로젝트 생성
2. **SQL Editor** 에서 `supabase/schema.sql` 전체 내용을 실행
3. 관리자 비밀번호 설정:

```bash
node supabase/seed-admin.js 원하는비밀번호
```

출력된 SQL을 Supabase SQL Editor에서 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

관리자 페이지: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Vercel 배포 방법

### 1. GitHub 저장소 생성 후 Push

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/seminar-room.git
git push -u origin main
```

### 2. Vercel에서 프로젝트 연결

1. [vercel.com](https://vercel.com) 접속 → New Project
2. GitHub 저장소 선택
3. Framework: **Next.js** 자동 감지됨
4. **Environment Variables** 설정:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `JWT_SECRET` | 32자 이상의 랜덤 문자열 |

5. **Deploy** 클릭

---

## 프로젝트 구조

```
seminar-room/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 메인 페이지 (캘린더 + 예약)
│   ├── globals.css
│   ├── admin/
│   │   ├── layout.tsx          # 관리자 레이아웃 (인증 검증)
│   │   ├── AdminNav.tsx        # 관리자 네비게이션
│   │   ├── page.tsx            # 관리자 대시보드
│   │   ├── login/page.tsx      # 관리자 로그인
│   │   └── stats/page.tsx      # 이용 통계
│   └── my-reservations/
│       └── page.tsx            # 내 예약 조회
├── components/
│   ├── ui/
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── Header.tsx
│   ├── Calendar.tsx            # 월간 캘린더
│   ├── TimeSlotView.tsx        # 시간대별 현황
│   ├── ReservationForm.tsx     # 예약 신청 폼
│   ├── MyReservations.tsx      # 내 예약 조회/관리
│   ├── AdminTable.tsx          # 관리자 예약 테이블
│   ├── PasswordManager.tsx     # 비밀번호 관리
│   └── StatsView.tsx           # 통계 차트
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저 클라이언트
│   │   └── server.ts           # 서버 클라이언트
│   ├── actions/
│   │   ├── reservations.ts     # 예약 Server Actions
│   │   └── admin.ts            # 관리자 Server Actions
│   ├── auth.ts                 # JWT 인증 유틸리티
│   └── utils.ts                # 공통 유틸리티
├── types/index.ts              # TypeScript 타입 정의
├── middleware.ts               # 관리자 라우트 보호
├── supabase/
│   ├── schema.sql              # DB 스키마 (DDL)
│   └── seed-admin.js           # 관리자 비밀번호 해시 생성
└── .env.example
```

---

## 예약 규칙

| 항목 | 내용 |
|------|------|
| 운영 시간 | 07:00 ~ 23:00 |
| 예약 단위 | 1시간 |
| 최소 예약 | 1시간 |
| 최대 예약 | 3시간 (연속) |
| 사전 예약 | 시작 시각 기준 24시간 전까지 |
| 비밀번호 공개 | 예약 시작 24시간 전부터 |

## 예약 상태

| 상태 | 색상 | 설명 |
|------|------|------|
| 신청 대기 | 노란색 | 관리자 승인 전 (시간 점유됨) |
| 승인 | 남색 | 관리자 승인 완료 (시간 점유됨) |
| 거절 | 표시 안 함 | 관리자 거절 |
| 취소 | 표시 안 함 | 사용자 취소 |

---

## 보안 사항

- 관리자 세션은 HttpOnly JWT 쿠키로 관리 (8시간 유효)
- 비밀번호는 bcrypt (salt rounds: 10) 해싱
- Supabase Row Level Security (RLS) 적용
- Service Role Key는 서버 사이드에서만 사용
- 비밀번호는 예약자 본인 + 예약 시작 24시간 전만 공개
- DB 트리거로 중복 예약 이중 방지

---

## 환경변수 가이드

**JWT_SECRET 생성 방법:**

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

**Supabase 키 확인 위치:**

Supabase 대시보드 → Settings → API → Project URL / anon key / service_role key
