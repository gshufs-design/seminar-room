-- 사물함 "이용 안내 동의" 문구를 저장할 컬럼 추가
-- (신청 폼 제출 후, 실제 신청 접수 전에 학생에게 보여주고 동의를 받는 안내문)
-- Supabase SQL Editor에서 실행하세요. 이미 실행했다면 다시 실행해도 안전합니다.

ALTER TABLE locker_settings
  ADD COLUMN IF NOT EXISTS agreement_text text;
