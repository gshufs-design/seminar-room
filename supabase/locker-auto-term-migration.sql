-- 사물함 이용 마감일을 관리자 입력 대신 "신청일 기준 자동 계산"으로 바꾸면서 필요한 DB 변경분입니다.
-- Supabase SQL Editor에서 실행하세요. 이미 실행했다면 다시 실행해도 안전합니다.
--
-- locker_requests.agreement_text_snapshot 컬럼은 이미 추가되어 있다고 하셨으니(ADD COLUMN IF NOT EXISTS라 다시 실행해도 안전),
-- 여기서는 공개 뷰(locker_status_public)에 created_at을 추가합니다 — 신청 시점을 알아야
-- 학기(term)별 이용 마감일(3월/9월 첫째 주 금요일)을 계산할 수 있기 때문입니다.

ALTER TABLE locker_requests
  ADD COLUMN IF NOT EXISTS agreement_text_snapshot TEXT;

CREATE OR REPLACE VIEW locker_status_public AS
  SELECT zone_id, block_id, locker_number, status, term, created_at
  FROM locker_requests
  WHERE status IN ('pending', 'approved');

GRANT SELECT ON locker_status_public TO anon;
