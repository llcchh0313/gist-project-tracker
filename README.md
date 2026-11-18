# GIST 학생회 사업 아카이브

**GitHub Pages + React/Vite + Supabase**로 구성된 학생회 사업 관리 웹사이트입니다. 학생은 GIST 학교 이메일 인증 후 사업을 읽을 수 있고, 지정된 학생회장 관리자만 정보를 수정할 수 있습니다.

## 제공 기능

- 사업 목록 / 검색 / 카테고리 및 진행 상태 필터
- 사업 상세 설명, 담당 부서, 사업 기간
- 4단계 사업 추진 프로세스: 기획 → 준비·승인 → 추진 중 → 결과·평가
- 날짜별 추진 기록과 다음 작업 메모
- 관리자 전용 사업 추가/수정/삭제 및 단계 변경
- 비공개 문서 저장소, 학생 공개/관리자 전용 문서 구분, 다운로드
- 학교 이메일 OTP 또는 이메일 링크 인증
- DB Row Level Security(RLS), 관리 권한 분리, 서버 수정 이력
- 모바일/노트북 반응형 디자인
- Supabase 연결 전에도 작동하는 **체험 모드**(가상 데이터, 로컬 임시 편집)

> 참고: 체험 모드에서 입력한 사항은 새로고침하면 초기화됩니다. 실제 사용자 데이터는 Supabase 연결 이후에 저장됩니다.

## A. 먼저 화면부터 확인하기 — 5분

1. 컴퓨터에 Node.js 22 이상 설치
2. 터미널에서 프로젝트 폴더 열기
3. 아래 명령어 실행

```bash
npm install
npm run dev
```

4. 터미널에 표시된 로컬 주소(일반적으로 `http://localhost:5173/`)로 접속
5. `관리자 체험` 버튼을 누르면 사업 등록과 진행 코멘트도 시험 가능

이 상태에서는 **실제 이메일 인증, DB 저장, 파일 업로드가 되지 않습니다.** 사이트에 체험용 가상 데이터를 보여줍니다.

## B. Supabase 실제 데이터베이스와 로그인 연결하기

1. https://supabase.com/ 에서 **새 프로젝트**를 생성합니다.
2. Supabase Dashboard → **SQL Editor** → New query를 엽니다.
3. `supabase/schema.sql` 파일 내용을 복사·붙여넣고 **Run**을 클릭합니다.
4. Project Settings / Connect 등에서 **Project URL**과 **publishable key**(또는 구형 `anon` key)를 복사합니다.
5. 프로젝트 폴더에 `.env.example`을 복사하여 `.env` 파일을 만들고 다음 값으로 바꿉니다.

```dotenv
VITE_SUPABASE_URL=https://실제프로젝트ID.supabase.co
VITE_SUPABASE_ANON_KEY=실제_publishable_또는_anon_key
```

6. `npm run dev`를 **재시작**합니다. 이제 가상 데이터 대신 빈 실제 사업 DB가 뜹니다.

⚠️ **service_role 키, secret 키, DB 비밀번호를 `.env`의 `VITE_` 변수에 넣지 마세요.** 브라우저에 포함됩니다. 공개 가능한 publishable/anon 키만 사용하며, RLS 정책이 실제 보안을 담당합니다.

### B-1. 이메일 인증 설정

1. Supabase Dashboard → Authentication → Providers → Email에서 이메일 인증(OTP)을 활성화합니다.
2. Authentication → URL Configuration: **Site URL**을 나중에 배포할 `https://YOUR_ID.github.io/YOUR_REPO/`로 설정합니다. **Redirect URLs**에도 같은 주소를 추가합니다. 로컬 테스트에는 `http://localhost:5173/**`도 추가합니다.
3. Authentication → Email Templates → Magic Link에서 `{{ .Token }}`을 포함하는 메일 템플릿을 설정하면 **6자리 코드**를 받을 수 있습니다. 기본 설정을 유지하는 경우 이메일 **인증 링크 클릭 방식**도 작동합니다.
4. 여러 실제 학생이 사용하려면 Supabase에 **Custom SMTP**(이메일 발송 서비스)를 연결합니다. 기본 SMTP는 사용 목적·수신자·발송량 제한이 있으므로 운영용으로 사용하지 마세요.
5. `@gm.gist.ac.kr`과 `@gist.ac.kr` 도메인을 허용하도록 기본 설정했습니다. 학교의 실제 계정 발급·유지 정책에 맞게 `src/supabase.ts`와 `schema.sql`의 허용 도메인을 함께 변경해야 합니다.

**중요:** 로그인 화면에서 이메일을 제한하는 것은 편의 기능입니다. 실제 사업 열람 차단은 SQL의 `is_gist_member()`와 RLS 정책에서 수행합니다. 이메일 주소 보유 자체가 현재 재학생 신분을 입증하는 것은 아닙니다. 필요하면 별도 재학 확인 절차 또는 허용 사용자 명단을 도입하세요.

### B-2. 최초 학생회장 계정 지정

1. 학생회장이 자신의 **학교 이메일로 실제 로그인**해 Supabase Auth 사용자로 등록됩니다.
2. 관리자가 Supabase Dashboard → Authentication → Users에서 가입된 계정을 확인합니다.
3. Supabase **SQL Editor**에서 아래 SQL을 실행합니다. 이메일을 실제 학생회장 이메일로 교체하세요.

```sql
insert into public.admins (user_id)
select id from auth.users
where lower(email) = lower('PRESIDENT@gm.gist.ac.kr')
  and email_confirmed_at is not null
on conflict (user_id) do nothing;
```

4. 학생회장이 브라우저에서 **새로고침**하면 상단에 `관리자` 메뉴가 나타납니다.

관리자 권한은 이메일 문자열만으로 부여하지 않고 Supabase `auth.users.id`에 연결됩니다. 관리자 교체 시 SQL Editor에서 기존 관리자를 제거하고 새 관리자를 등록합니다.

```sql
-- 기존 관리자 권한 회수
DELETE FROM public.admins WHERE user_id = (
  SELECT id FROM auth.users WHERE lower(email) = lower('OLD@gm.gist.ac.kr')
);

-- 새 관리자 권한 부여 (새 계정으로 한번 로그인한 뒤 수행)
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users
WHERE lower(email) = lower('NEW@gm.gist.ac.kr')
  AND email_confirmed_at IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
```

이 작업은 **SQL Editor에서만** 수행해야 합니다. 일반 이용자는 자신에게 관리자 권한을 부여할 수 없습니다.

## C. GitHub Pages 자동 배포

1. GitHub에 **빈 공개 저장소**를 만듭니다. 예: `gist-project-tracker`.
2. 이 폴더의 **내용 전체**를 저장소의 최상위에 업로드합니다. `.github/workflows/deploy.yml`도 포함해야 합니다. `.env`, `node_modules`는 올리지 마세요.
3. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**에서 다음 이름 두 개를 추가합니다.
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: publishable/anon 키
4. GitHub 저장소 → **Settings → Pages → Build and deployment → Source: GitHub Actions**로 설정합니다.
5. `main` 브랜치에 push하면 **Actions**가 자동으로 사이트를 빌드하고 배포합니다.
6. 주소 예: `https://YOUR_ID.github.io/gist-project-tracker/`.

**아직 Supabase를 만들기 전**이라면 Secrets 없이도 빌드 가능하지만, 배포 화면은 **공개된 체험 모드**로 작동합니다. 공식 운영 전에는 반드시 Supabase 인증과 RLS를 설정하고 테스트해야 합니다.

`vite.config.ts`는 GitHub 저장소 이름을 분석해 `/gist-project-tracker/` 같은 하위 경로를 자동으로 설정합니다. `username.github.io` 저장소인 경우 `/`을 사용합니다. 사용자 도메인을 사용할 때는 GitHub Actions의 build 단계에 `VITE_BASE_PATH: /` 환경 변수를 추가하세요.

## D. 운영 전 확인할 보안 점검표

- [ ] Supabase SQL을 **오류 없이** 적용했다.
- [ ] 학교 이메일로만 자료를 열람할 수 있다. (다른 도메인으로 가입해도 접근 불가)
- [ ] 이메일 **인증하지 않은** 계정으로 사업 데이터를 읽을 수 없다.
- [ ] 일반 학생은 URL을 임의 조작해도 사업을 수정할 수 없다.
- [ ] 학생회장만 `admins` 테이블에 등록되어 있다.
- [ ] 미공개 사업은 일반 학생 계정에 보이지 않는다.
- [ ] 관리자 전용 첨부파일은 일반 학생이 파일 경로를 알아도 다운로드할 수 없다.
- [ ] 학교 이메일 발송 서비스와 도메인 수신을 실제로 테스트했다.
- [ ] 개인정보·공문서 공개 범위에 대해 학교 승인 및 내부 지침을 확인했다.
- [ ] 운영 데이터를 외부로 정기 백업하고 관리자 권한 인수인계 절차를 마련했다.

**RLS와 Auth를 테스트하지 않고 실제 공문서를 업로드하지 마세요.** 학생회가 공개 권한을 가진 자료만 보관해야 합니다.

## E. 나중에 유료 서버로 이전하는 방법

화면은 **React/Vite 정적 빌드**로 구현되어 GitHub Pages에서 Cloudflare Pages, Vercel, 일반 웹 호스팅 등으로 쉽게 이동할 수 있습니다. Supabase 데이터베이스를 유지한다면 사용자·사업·첨부파일 데이터를 그대로 유지하고 새 배포 주소를 Authentication → URL Configuration에 추가하면 됩니다. Supabase를 다른 DB로 옮길 때는 인증 계정, Storage, RLS, SQL 스키마 마이그레이션까지 별도로 계획해야 합니다.

## F. 주의점

- 무료 Supabase 프로젝트는 장기간 비활성일 때 일시 정지될 수 있으며 사용량 한도가 있습니다.
- PDF·HWP 등의 첨부파일은 10 MB 이하로 제한했습니다. 클라이언트 검증 + Storage bucket 한도를 사용합니다.
- 사업 삭제는 되돌릴 수 없습니다. 삭제 전에 반드시 데이터 백업을 권장합니다.
- 학교 구성원 전체의 접근을 통제하려면 학교 재학/재직 여부 확인 정책이 추가로 필요할 수 있습니다.
- 도메인과 관리자 정책이 실제 학교의 운영 규칙에 맞는지 공식 사용 전에 검토해 주세요.
