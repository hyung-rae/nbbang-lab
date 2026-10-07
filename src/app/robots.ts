import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// 여행 화면(/t/…)과 여행 목록(/trips)은 링크를 아는 사람만 보는 곳이라 검색에서 뺀다
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/t/", "/trips"] },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
