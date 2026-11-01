-- 관리자 화면에 "승인일"을 표시하기 위한 DB 변경분입니다.
-- Supabase SQL Editor에서 실행하세요. 이미 실행했다면 다시 실행해도 안전합니다.
-- (칸을 새로 추가하기만 하므로 기존 예약·신청 데이터는 바뀌거나 지워지지 않습니다.)
--
-- 관리자가 세미나실 예약 / 사물함 신청을 "승인"하는 순간의 시각이 이 칸에 기록됩니다.
-- 이 변경 전에 이미 승인된 건은 승인 시각이 기록되어 있지 않아 관리자 화면에 "-"로 표시됩니다.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE locker_requests
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Supabase API가 새 칸을 바로 인식하도록 스키마 캐시를 새로고침합니다.
NOTIFY pgrst, 'reload schema';
