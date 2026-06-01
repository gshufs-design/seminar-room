/**
 * 관리자 계정 비밀번호 해시 생성 스크립트
 * 사용법: node supabase/seed-admin.js <비밀번호>
 *
 * 예시: node supabase/seed-admin.js admin1234
 */

const bcrypt = require('bcryptjs')

const password = process.argv[2]
if (!password) {
  console.error('사용법: node supabase/seed-admin.js <비밀번호>')
  process.exit(1)
}

bcrypt.hash(password, 10).then((hash) => {
  console.log('\n아래 SQL을 Supabase SQL Editor에서 실행하세요:\n')
  console.log(`UPDATE admins SET password_hash = '${hash}' WHERE username = 'admin';`)
  console.log('\n또는 새 관리자 추가:\n')
  console.log(`INSERT INTO admins (username, password_hash) VALUES ('admin', '${hash}');`)
  console.log()
})
