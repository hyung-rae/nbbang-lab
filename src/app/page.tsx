import { AppHeader } from "@/components/app-header";
import { NewTripForm } from "@/components/home/new-trip-form";
import { SectionTitle } from "@/components/trip/parts";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[36rem] flex-col gap-6 px-4 pt-3 pb-10">
      <AppHeader />
      <section className="rounded-[18px] bg-primary px-5 pt-5 pb-6 text-primary-foreground shadow-app-sm">
        <p className="inline-block rounded-full bg-sun px-2.5 pt-[5px] pb-1 font-heading text-[15px] leading-none text-sun-foreground">
          {SITE_TAGLINE}
        </p>
        <h1 className="mt-2.5 font-heading text-[clamp(32px,9vw,44px)] leading-[1.1] font-normal">{SITE_NAME}</h1>
        <p className="mt-1.5 text-[13.5px] opacity-90">
          같이 쓴 돈을 적으면 누가 누구에게 얼마를 보내면 되는지 바로 보여 줘요. 1원 단위로 나누고, 송금은 100원 단위로 깔끔하게.
        </p>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>새 여행</SectionTitle>
        <NewTripForm />
        <p className="text-[12.5px] text-muted-foreground">
          만들면 여행 링크가 생겨요. 그 링크를 친구들에게 보내면 로그인 없이 같이 보고 입력할 수 있어요. 만든 여행은 위의{" "}
          <strong>여행 목록</strong>에서 다시 열 수 있어요.
        </p>
      </section>
    </main>
  );
}
