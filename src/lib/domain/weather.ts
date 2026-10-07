/** 숙소 위치의 지금 날씨 (Open-Meteo `current`) */
export interface CurrentWeather {
  /** WMO weather code */
  code: number;
  /** 기온 ℃ (반올림) */
  temp: number;
  /** 체감 온도 ℃ (반올림) */
  feels: number;
  /** 관측 기준 시각, 한국 시간 "YYYY-MM-DDTHH:mm" — 문자열 비교로 새것을 가린다 */
  time: string;
}

// WMO weather code → 이모지·설명
const WEATHER: [codes: number[], icon: string, label: string][] = [
  [[0], "☀️", "맑음"],
  [[1], "🌤️", "대체로 맑음"],
  [[2], "⛅", "구름 조금"],
  [[3], "☁️", "흐림"],
  [[45, 48], "🌫️", "안개"],
  [[51, 53, 55, 56, 57], "🌦️", "이슬비"],
  [[61, 63, 65, 66, 67], "🌧️", "비"],
  [[80, 81, 82], "🌦️", "소나기"],
  [[71, 73, 75, 77, 85, 86], "🌨️", "눈"],
  [[95, 96, 99], "⛈️", "뇌우"],
];

export function weatherOf(code: number): { icon: string; label: string } {
  const hit = WEATHER.find(([codes]) => codes.includes(code));
  return hit ? { icon: hit[1], label: hit[2] } : { icon: "🌡️", label: "알 수 없음" };
}

/** 둘 중 더 최근 관측 (없으면 있는 쪽) */
export function newerWeather(a: CurrentWeather | null, b: CurrentWeather | null): CurrentWeather | null {
  if (!a || !b) return a ?? b;
  return b.time > a.time ? b : a;
}

/** "2026-10-07T14:00" → "14:00 기준" */
export function weatherTime(time: string): string {
  return `${time.slice(11, 16)} 기준`;
}
