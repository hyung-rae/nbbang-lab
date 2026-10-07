import { PageLoader } from "@/components/page-loader";

// 화면 이동 중 데이터를 기다리는 동안의 로딩 화면 (최소 1초는 template.tsx 가 덮어 둔다).
// 루트에 두면 Next 가 미리 받아 둬서 누르는 즉시 보인다. 대신 스트리밍이라 없는 여행 링크도 404 가 아닌 200(+noindex) 으로 응답한다
export default function Loading() {
  return <PageLoader />;
}
