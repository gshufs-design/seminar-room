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
                       CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'admin_cancelled')),
  admin_memo         TEXT,
  purpose            TEXT         NOT NULL DEFAULT '',
  co_users           JSONB        DEFAULT NULL,
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
  id                 INTEGER      PRIMARY KEY DEFAULT 1,
  room_password      VARCHAR(20)  NOT NULL DEFAULT '0000',
  notification_email VARCHAR(255),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- 기존 테이블에 컬럼 추가 (이미 생성된 경우)
ALTER TABLE room_settings ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255);

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

-- =============================================
-- 4. locker_requests 테이블 (사물함 예약 신청)
-- =============================================
CREATE TABLE IF NOT EXISTS locker_requests (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id        VARCHAR(30)  NOT NULL,
  zone_label     VARCHAR(50)  NOT NULL,
  block_id       VARCHAR(30)  NOT NULL,
  block_label    VARCHAR(50)  NOT NULL,
  locker_number  INTEGER      NOT NULL,
  department     VARCHAR(100) NOT NULL,
  name           VARCHAR(50)  NOT NULL,
  student_id     VARCHAR(20)  NOT NULL,
  phone          VARCHAR(20)  NOT NULL,
  email          VARCHAR(255) NOT NULL,
  term           VARCHAR(1)   NOT NULL CHECK (term IN ('1', '2')),
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  admin_memo     TEXT,
  agreement_text_snapshot TEXT, -- 신청 시점에 실제로 동의받은 "이용 안내" 문구 그대로 보존 (관리자가 나중에 문구를 바꿔도 이 건은 영향받지 않음)
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE locker_requests ADD COLUMN IF NOT EXISTS agreement_text_snapshot TEXT;

CREATE INDEX idx_locker_requests_locker ON locker_requests (zone_id, block_id, locker_number);
CREATE INDEX idx_locker_requests_status ON locker_requests (status);
CREATE INDEX idx_locker_requests_student ON locker_requests (student_id, phone);

CREATE TRIGGER trg_locker_requests_updated_at
  BEFORE UPDATE ON locker_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 같은 칸에 대기중/승인된 신청이 이미 있으면 새 신청을 막음 (DB 레벨 이중 방지 —
-- 프론트에서도 확인하지만, 동시에 두 명이 같은 칸을 신청하는 경쟁 상태를 여기서 최종 차단)
CREATE OR REPLACE FUNCTION check_locker_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM locker_requests
    WHERE zone_id = NEW.zone_id
      AND block_id = NEW.block_id
      AND locker_number = NEW.locker_number
      AND status IN ('pending', 'approved')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RAISE EXCEPTION 'Locker already requested or reserved: %-%-%', NEW.zone_id, NEW.block_id, NEW.locker_number;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_locker_conflict
  BEFORE INSERT OR UPDATE ON locker_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_locker_conflict();

ALTER TABLE locker_requests ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon은 원본 테이블에 직접 접근 불가, service_role만 가능.
-- (신청자의 학과·이름·학번·연락처·이메일이 담긴 테이블이라, reservations보다
--  한 단계 더 보수적으로 anon 접근을 아예 막고 아래 공개 뷰로만 상태를 노출합니다.)

-- 공개 화면(사물함 안내)에서는 "이 칸이 비었는지"만 필요하므로,
-- 개인정보를 뺀 뷰를 anon에게만 SELECT 허용합니다.
-- term(신청 학기)·created_at(신청일)도 같이 노출합니다 — 개인정보가 아니고, 이용 마감일이
-- 지났는지 계산하려면(마감일이 "신청일 + 학기"로 자동 계산되므로) 언제·어떤 학기로
-- 신청했는지 알아야 합니다.
CREATE OR REPLACE VIEW locker_status_public AS
  SELECT zone_id, block_id, locker_number, status, term, created_at
  FROM locker_requests
  WHERE status IN ('pending', 'approved');

GRANT SELECT ON locker_status_public TO anon;

-- =============================================
-- 5. locker_layouts 테이블 (관리자가 도면에서 직접 옮긴 배치)
-- =============================================
CREATE TABLE IF NOT EXISTS locker_layouts (
  scene_id    VARCHAR(20)  PRIMARY KEY,   -- 'map' | 'lobby' | 'reading'
  elements    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE locker_layouts ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon 직접 접근 불가. 읽기·쓰기 모두 서버 액션(서비스 롤)을 통해서만 이뤄집니다.
-- 쓰기는 saveLockerLayoutOverrides()에서 관리자 세션을 확인한 뒤에만 실행됩니다.

-- =============================================
-- 6. locker_settings 테이블 (단일 행) — 신청 기간·이용 마감일·비우는 기간
-- =============================================
CREATE TABLE IF NOT EXISTS locker_settings (
  id                    INTEGER      PRIMARY KEY DEFAULT 1,
  applications_open     BOOLEAN      NOT NULL DEFAULT false,
  term1_end_date        DATE,
  term2_end_date        DATE,
  clearing_period_days  INTEGER      NOT NULL DEFAULT 7,
  notice_text           TEXT,
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT locker_settings_single_row CHECK (id = 1)
);

ALTER TABLE locker_settings ADD COLUMN IF NOT EXISTS notice_text TEXT;

CREATE TRIGGER trg_locker_settings_updated_at
  BEFORE UPDATE ON locker_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO locker_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE locker_settings ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon 직접 접근 불가. 서버 액션(서비스 롤)을 통해서만 읽고 씁니다.
