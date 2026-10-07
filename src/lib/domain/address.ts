/**
 * 주소에서 지역 부분만: 읍·면·동까지, 없으면 시·군·구까지.
 * 펜션처럼 번지가 지도 DB 에 없는 주소를 지오코딩할 때 두 번째 시도에 쓴다 (날씨는 동네 단위면 충분).
 * "경기 가평군 설악면 예시로 1" → "경기 가평군 설악면", "서울 강남구 테헤란로 152" → "서울 강남구".
 * 더 줄일 게 없거나 지역을 못 찾으면 null
 */
export function addressRegion(address: string): string | null {
  const t = address.trim().split(/\s+/);
  let end = t.findIndex((w) => /[읍면동]$/.test(w));
  if (end < 0) end = t.findIndex((w) => /[시군구]$/.test(w));
  if (end < 0 || end === t.length - 1) return null;
  return t.slice(0, end + 1).join(" ");
}
