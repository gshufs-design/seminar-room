// 시스템 전체에서 "동일 인물"을 판단하는 단일 기준.
// 학번(student_id) 또는 전화번호(phone) 중 하나라도 일치하면 동일 인물로 본다.
// 이름·학과는 표기가 사람마다/시점마다 다를 수 있어 매칭 기준에서 제외하고 화면 표시용으로만 쓴다.
//
// 경고 시스템(누구에게 경고가 쌓였는지)과 9시간 예약 제한(같은 사람이 이미 얼마나 예약했는지) 판단이
// 서로 다른 기준을 쓰면 한쪽만 우회하는 구멍이 생기므로, 반드시 이 모듈 하나로 통일해서 쓴다.

export interface PersonIdentity {
  student_id: string
  phone: string
}

export function isSamePerson(a: PersonIdentity, b: PersonIdentity): boolean {
  return a.student_id === b.student_id || a.phone === b.phone
}

// Supabase .or() 필터 문자열 생성. 전화번호를 모르는 경우(예: 동반 이용자 입력폼엔 연락처가 없음)엔
// phone을 생략하면 학번만으로 매칭한다.
export function samePersonOrFilter(match: { student_id: string; phone?: string }): string {
  const conditions = [`student_id.eq.${match.student_id}`]
  if (match.phone) conditions.push(`phone.eq.${match.phone}`)
  return conditions.join(',')
}
