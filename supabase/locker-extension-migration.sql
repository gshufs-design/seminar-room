-- 사물함 "연장 신청" 기능과 "관리자 취소" 기능을 위한 DB 변경분입니다.
-- Supabase SQL Editor에서 실행하세요. 이미 실행했다면 다시 실행해도 안전합니다.
-- (칸을 추가하고 허용 상태값을 늘리기만 하므로 기존 신청 데이터는 바뀌거나 지워지지 않습니다.)
--
-- 연장 규칙
--   · 연장 단위: 한 학기 (원래 마감일 다음의 마감일 = 3월/9월 첫째 주 금요일까지)
--   · 신청 가능 기간: 원래 마감일 30일 전 ~ 마감일 당일
--   · 1회만 가능, 관리자 승인 필요 (승인일 기록)
--   · 한 학기 / 두 학기 신청자 모두 가능

-- 1. 연장 관련 칸 추가
ALTER TABLE locker_requests ADD COLUMN IF NOT EXISTS extension_status       VARCHAR(20);  -- NULL(연장 신청 없음) | pending | approved | rejected
ALTER TABLE locker_requests ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMPTZ;  -- 이용자가 연장을 신청한 일시
ALTER TABLE locker_requests ADD COLUMN IF NOT EXISTS extension_approved_at  TIMESTAMPTZ;  -- 관리자가 연장을 승인한 일시
ALTER TABLE locker_requests ADD COLUMN IF NOT EXISTS extended_end_date      DATE;         -- 연장 승인 후의 새 이용 마감일

ALTER TABLE locker_requests DROP CONSTRAINT IF EXISTS locker_requests_extension_status_check;
ALTER TABLE locker_requests
  ADD CONSTRAINT locker_requests_extension_status_check
  CHECK (extension_status IS NULL OR extension_status IN ('pending', 'approved', 'rejected'));

-- 2. 신청 상태에 'admin_cancelled'(관리자 취소 — 예: 졸업생) 추가
--    기존 상태 제한 규칙의 이름이 환경마다 다를 수 있어, status 값을 제한하는 규칙을 찾아 지운 뒤 새로 만듭니다.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'locker_requests'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND pg_get_constraintdef(con.oid) NOT ILIKE '%extension_status%'
  LOOP
    EXECUTE format('ALTER TABLE locker_requests DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE locker_requests
  ADD CONSTRAINT locker_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'admin_cancelled'));

-- 3. 공개 화면(사물함 지도)용 뷰에 연장 정보 추가
--    (이게 없으면 연장된 사물함이 원래 마감일 이후 지도에서 "비우는 중"으로 잘못 보입니다.)
CREATE OR REPLACE VIEW locker_status_public AS
  SELECT zone_id, block_id, locker_number, status, term, created_at, extension_status, extended_end_date
  FROM locker_requests
  WHERE status IN ('pending', 'approved');

GRANT SELECT ON locker_status_public TO anon;

-- Supabase API가 새 칸을 바로 인식하도록 스키마 캐시를 새로고침합니다.
NOTIFY pgrst, 'reload schema';
