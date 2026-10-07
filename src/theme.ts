import { createTheme } from "@mantine/core";

// Mantine 기본 테마에 포인트 색·한글 글꼴만 얹는다 (2026-10-07 사용자 결정: 기본 테마 기반, teal, 제목도 본문 글꼴)
const KO_FALLBACK = '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

// 크기는 sm 이 기본 (2026-10-07 사용자 결정). 단 iOS Safari 는 16px 미만 입력창에 포커스하면 화면을 확대하므로
// 입력칸 글자만 16px 로 둔다. 라벨과 입력칸 사이는 6px (칩 묶음의 legend 와 같은 간격)
const INPUT_DEFAULTS = {
  defaultProps: { size: "sm" },
  styles: { input: { fontSize: "var(--mantine-font-size-md)" }, label: { marginBottom: 6 } },
};

// .extend() 는 클라이언트 컴포넌트 참조라 서버 파일(layout)에서 못 쓴다 — 평범한 객체로 둔다
export const theme = createTheme({
  primaryColor: "teal",
  fontFamily: `var(--font-body), ${KO_FALLBACK}`,
  headings: { fontFamily: `var(--font-body), ${KO_FALLBACK}` },
  components: {
    TextInput: INPUT_DEFAULTS,
    NumberInput: INPUT_DEFAULTS,
    Textarea: INPUT_DEFAULTS,
    Select: INPUT_DEFAULTS,
    DatePickerInput: INPUT_DEFAULTS,
    // 버튼 둥글기 md (2026-10-07 사용자 결정)
    Button: { defaultProps: { size: "sm", radius: "md" } },
    Chip: { defaultProps: { size: "sm" } },
    Checkbox: { defaultProps: { size: "sm" } },
  },
});
