import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import { theme } from "@/theme";
import "./globals.css";

// 한글 글리프는 subsets 로 미리 받을 수 없어(latin 만 제공) preload 를 끈다
const body = IBM_Plex_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  preload: false,
});

// 아이콘·OG 이미지는 파일 규칙으로 자동 연결된다: app/icon.png · app/apple-icon.png · app/favicon.ico · app/opengraph-image.png
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: SITE_NAME,
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["엔빵", "N빵", "더치페이", "여행 가계부", "정산", "경비 정산", "여행 경비", "송금 정리"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    // 바탕(--app-bg)과 같게: Mantine gray-0 / dark-8
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1f1f1f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" {...mantineHtmlProps} className={body.variable}>
      <head>
        {/* 첫 그림 전에 색 모드를 정해 깜빡임을 막는다. 시스템 설정을 따른다 */}
        <ColorSchemeScript defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          {children}
          {/* 위에서 내려오고 닫기 버튼 없이 저절로 사라진다 (notify.ts autoClose) */}
          <Notifications position="top-center" />
        </MantineProvider>
      </body>
    </html>
  );
}
