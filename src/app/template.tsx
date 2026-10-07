"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageLoader } from "@/components/page-loader";

// page-loader.module.css .overlay 의 1초 + 흐려지기 0.2초. 보이고 사라지는 건 CSS 가 하고, 여기서는 다 끝난 뒤 걷어 낸다
const COVER_MS = 1200;

// 루트 template 은 첫 경로가 바뀔 때(/ · /trips · /t) 새로 그려진다 — 그때마다 로딩 화면을 1초 덮어 둔다. /t/a → /t/b 는 안 덮는다.
// 서버에서 기다리지 않는 이유: 같은 화면을 다시 받는 refresh()(저장·실시간 갱신)까지 느려진다. template 은 refresh 로는 다시 그려지지 않는다
export default function Template({ children }: { children: ReactNode }) {
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setCovered(false), COVER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {children}
      {covered && <PageLoader overlay />}
    </>
  );
}
