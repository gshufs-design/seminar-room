-- =============================================
-- 한국외국어대학교 대학원 세미나실 예약 시스템
-- Supabase PostgreSQL 스키마
-- =============================================

-- 1. reservations 테이블
CREATE TABLE IF NOT EXISTS reservations (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_number SERIAL       UNIQUE NOT NULL,
  name               VARCHAR(50)  NOT NULL,
  department         VARCHAR(100) NOT NULL,
  student_id         VARCHAR(20)  NOT NULL,
  phone              VARCHAR(20)  NOT NULL,
  participant_count  INTEGER      NOT NULL CHECK (participant_count >= 1 AND participant_count <= 100),
  reservation_date   DATE         NOT NULL,
  start_time         TIME         NOT NULL,
  end_time           TIME         NOT NULL,
  status             VARCHAR(20)  NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_memo         TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 예약 시간 유효성 검증 (시작 < 종료, 운영 시간 07:00~23:00)
ALTER TABLE reservations
  ADD CONSTRAINT chk_time_range CHECK (
    start_time >= '07:00:00'::TIME AND
    end_time <= '23:00:00'::TIME AND
    end_time > start_time
  );

-- 예약 기간 제한 (1~3시간)
ALTER TABLE reservations
  ADD CONSTRAINT chk_duration CHECK (
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 BETWEEN 1 AND 3
  );

-- 인덱스
CREATE INDEX idx_reservations_date ON reservations (reservation_date);
CREATE INDEX idx_reservations_student ON reservations (student_id, phone);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservations_date_status ON reservations (reservation_date, status);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. admins 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 3. room_settings 테이블 (단일 행)
-- =============================================
CREATE TABLE IF NOT EXISTS room_settings (
  id            INTEGER      PRIMARY KEY DEFAULT 1,
  room_password VARCHAR(20)  NOT NULL DEFAULT '0000',
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TRIGGER trg_room_settings_updated_at
  BEFORE UPDATE ON room_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 초기 데이터
-- =============================================

-- 기본 room_settings (최초 1회만 삽입)
INSERT INTO room_settings (id, room_password)
VALUES (1, '4837')
ON CONFLICT (id) DO NOTHING;

-- 기본 관리자 계정 (password: admin1234)
-- 실제 배포 전 반드시 비밀번호를 변경하세요!
-- bcrypt hash of "admin1234": $2b$10$...
-- 아래 명령으로 해시를 생성하세요:
--   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin1234', 10).then(h => console.log(h))"
-- 생성한 해시를 아래 password_hash 값에 넣으세요.
INSERT INTO admins (username, password_hash)
VALUES (
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'  -- password: "password" (예시)
)
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- Row Level Security (RLS) 설정
-- =============================================

-- reservations: 공개 읽기는 허용하되 insert/update/delete는 서비스 롤만 허용
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 서비스 롤(service_role)은 RLS 우회
-- anon 역할은 읽기만 허용 (캘린더 표시용 - pending/approved만 노출)
CREATE POLICY "Public can view non-sensitive reservations"
  ON reservations FOR SELECT
  USING (status IN ('pending', 'approved'));

-- admins 테이블: 외부에서 접근 불가
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon은 접근 불가, service_role만 가능

-- room_settings: 서비스 롤만 접근
ALTER TABLE room_settings ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon은 접근 불가

-- =============================================
-- 중복 예약 방지 함수 (DB 레벨)
-- =============================================
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM reservations
    WHERE reservation_date = NEW.reservation_date
      AND status IN ('pending', 'approved')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND start_time < NEW.end_time
      AND end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Reservation time conflict: the requested time slot is already occupied.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_overlap
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_overlap();
