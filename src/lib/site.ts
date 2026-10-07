// 앱 이름·설명·주소 — 메타데이터, manifest, 화면 헤더가 같이 쓴다

export const SITE_NAME = "엔빵";
export const SITE_TAGLINE = "친구 여행 가계부";
/** 소스 저장소 (공개) — 홈 헤더의 GitHub 버튼 */
export const REPO_URL = "https://github.com/hyung-rae/nbbang-lab";
export const SITE_DESCRIPTION =
  "친구들과 쓴 여행 경비를 기록하면 누가 누구에게 얼마를 보내면 되는지 바로 알려 주는 여행 가계부. 1원 단위 N빵, 100원 단위 송금 정리, 최소 송금.";

/** 절대 주소 기준 (OG 이미지 등). 배포 주소가 정해지면 NEXT_PUBLIC_SITE_URL 로 고정한다 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}
