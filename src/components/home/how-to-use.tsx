import { Box, List, ListItem, Text } from "@mantine/core";
import classes from "@/components/home/home.module.css";
import { ADMIN_EMAIL } from "@/lib/site";
import { MAX_MEMBERS } from "@/lib/trips/schema";

/** 홈 소개 카드(초록) 안 맨 아래 사용 방법 — 여행 신청부터 입장까지 (관리자·참여자 모두 본다). 글자는 카드 글자색을 따른다 */
export function HowToUse() {
  return (
    <Box className={classes.howTo}>
      <Text size="sm" fw={700}>
        사용 방법
      </Text>
      <List size="xs" c="inherit" opacity={0.9} spacing={4} mt={6}>
        <ListItem>
          관리자 이메일(
          <a href={`mailto:${ADMIN_EMAIL}`} className={classes.mail}>
            {ADMIN_EMAIL}
          </a>
          )로 여행을 신청해 주세요.
        </ListItem>
        <ListItem>관리자가 여행 링크와 그 여행의 입장 비밀번호를 보내 드려요.</ListItem>
        <ListItem>받은 내용을 확인하고, 여행 목록에서 그 여행을 골라 비밀번호를 입력하면 들어갈 수 있어요.</ListItem>
      </List>
      <Text size="sm" fw={700} mt="sm">
        여행 신청할 때 적어 주세요
      </Text>
      <List size="xs" c="inherit" opacity={0.9} spacing={4} mt={6}>
        <ListItem>여행 일정</ListItem>
        <ListItem>장소</ListItem>
        <ListItem>참여 인원 — 최대 {MAX_MEMBERS}명, 이름이나 닉네임으로 한 사람당 4글자 이하</ListItem>
      </List>
    </Box>
  );
}
