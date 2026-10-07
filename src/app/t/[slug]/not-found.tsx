import Link from "next/link";

export default function TripNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[36rem] flex-col items-center gap-3 px-4 py-20 text-center">
      <p className="font-heading text-2xl">여행을 찾을 수 없어요</p>
      <p className="text-muted-foreground">링크가 잘못됐거나 지워진 여행이에요. 받은 링크를 다시 확인해 주세요.</p>
      <Link
        href="/trips"
        className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
      >
        여행 목록으로
      </Link>
    </main>
  );
}
