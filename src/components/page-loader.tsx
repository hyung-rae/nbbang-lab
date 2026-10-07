import { Center, VisuallyHidden } from "@mantine/core";
import Image from "next/image";
import classes from "./page-loader.module.css";

/**
 * 화면 이동 로딩: 가운데 엔빵 아이콘, 바깥으로 도는 원.
 * overlay 면 화면 전체를 1초 덮는다. 아래 loading.tsx 와 겹칠 수 있어 읽기 도구에는 한 번만 알리게 숨긴다
 */
export function PageLoader({ overlay = false }: { overlay?: boolean }) {
  return (
    <Center mih="100dvh" className={overlay ? classes.overlay : undefined} aria-hidden={overlay || undefined}>
      <div role={overlay ? undefined : "status"} className={classes.ring}>
        <Image src="/icon-192.png" alt="" width={56} height={56} loading="eager" className={classes.logo} />
        {!overlay && <VisuallyHidden>불러오는 중</VisuallyHidden>}
      </div>
    </Center>
  );
}
