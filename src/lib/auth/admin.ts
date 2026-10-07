import "server-only";
import { cookies } from "next/headers";
import { verifySession } from "./token";

export const ADMIN_COOKIE = "nb_admin";
/** 서명 키가 이보다 짧으면 관리자 기능을 잠근다 (실수로 짧은 키를 넣는 것 방지) */
const MIN_SECRET = 32;

/** 관리자 비밀번호·서명 키. 둘 중 하나라도 없으면 null — 관리자 기능은 잠기고 나머지 앱은 그대로 (CI·빌드는 키 없이 돈다) */
export function adminConfig(): { password: string; secret: string } | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return password && secret && secret.length >= MIN_SECRET ? { password, secret } : null;
}

/** 이 요청이 관리자인지 (쿠키 서명·만료 확인). 쿠키를 읽으므로 부르는 페이지는 요청마다 렌더된다 */
export async function isAdmin(): Promise<boolean> {
  // 설정이 없어도 쿠키를 먼저 읽는다 — 그래야 부르는 페이지가 환경변수와 무관하게 늘 요청마다 렌더된다
  // (빌드 환경에 키가 없을 때 정적 페이지로 굳어 관리자 화면이 안 나오는 것 방지)
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const config = adminConfig();
  return !!config && !!token && verifySession(token, config.secret);
}
