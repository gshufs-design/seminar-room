-- 한 사람이 사물함 1개만 신청할 수 있도록 제한하되, 예외적으로 여러 개를
-- 신청할 수 있게 허용해줄 학번(사번) 목록을 저장하는 테이블입니다.
-- Supabase SQL Editor에서 실행하세요. 이미 실행했다면 다시 실행해도 안전합니다.

CREATE TABLE IF NOT EXISTS locker_duplicate_exceptions (
  student_id  VARCHAR(20)  PRIMARY KEY,
  note        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE locker_duplicate_exceptions ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon 직접 접근 불가. 서버 액션(서비스 롤, 관리자 세션 확인)을 통해서만 읽고 씁니다.
