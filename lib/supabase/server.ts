import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Next.js는 fetch()를 기본적으로 캐싱(Data Cache)하는데, supabase-js도 내부적으로 fetch를 쓰기 때문에
// 그대로 두면 조회 쿼리 응답이 캐시되어 방금 바뀐 DB 상태가 아니라 예전 응답을 계속 돌려주는 문제가
// 생길 수 있다. 예약/사물함/경고 데이터는 항상 최신 상태를 봐야 하므로 캐시를 명시적으로 끈다.
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // Server Component에서 호출 시 무시
          }
        },
      },
      global: { fetch: noStoreFetch },
    }
  )
}

export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
      global: { fetch: noStoreFetch },
    }
  )
}
