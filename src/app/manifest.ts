import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// 폰 홈 화면에 추가했을 때의 이름·아이콘·색
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "ko",
    start_url: "/",
    display: "standalone",
    // Mantine 기본 팔레트 값(gray-0·teal-filled)을 그대로 박았다 — 테마 색을 바꾸면 같이 바꾼다
    background_color: "#f8f9fa",
    theme_color: "#12b886",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
