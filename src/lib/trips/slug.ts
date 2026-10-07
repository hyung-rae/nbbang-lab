// 여행 링크 /t/[slug]. 로그인이 없는 동안 링크를 아는 것이 곧 접근 권한이므로 추측할 수 없어야 한다.
// 62^12 ≈ 3.2×10^21 (약 71비트). DB check 와 형식을 맞춘다 (supabase/migrations/…_init.sql trips.slug).

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SLUG_LENGTH = 12;

export function newSlug(): string {
  // 256 은 62 로 나눠떨어지지 않으므로 248 이상은 버려 편향을 없앤다
  const out: string[] = [];
  while (out.length < SLUG_LENGTH) {
    for (const b of crypto.getRandomValues(new Uint8Array(SLUG_LENGTH * 2))) {
      if (b < 248 && out.length < SLUG_LENGTH) out.push(ALPHABET[b % 62]);
    }
  }
  return out.join("");
}

export function isValidSlug(s: string): boolean {
  return /^[A-Za-z0-9]{12,32}$/.test(s);
}
