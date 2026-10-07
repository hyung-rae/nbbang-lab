import type { Metadata, Viewport } from "next";
import { Do_Hyeon, IBM_Plex_Sans_KR } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import "./globals.css";

// 한글 글리프는 subsets 로 미리 받을 수 없어(latin 만 제공) preload 를 끈다
const display = Do_Hyeon({
  variable: "--font-display",
  weight: "400",
  preload: false,
});

const body = IBM_Plex_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "600"],
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
    { media: "(prefers-color-scheme: light)", color: "#ecf1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1412" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        {/* 하단 탭바·지출 추가 버튼 위에 뜨도록 */}
        <Toaster position="bottom-center" offset={{ bottom: 150 }} mobileOffset={{ bottom: 150 }} duration={2400} />
      </body>
    </html>
  );
}
