import { Stack, Text, Title } from "@mantine/core";
import { LinkButton } from "@/components/link-button";

export default function TripNotFound() {
  return (
    <Stack component="main" align="center" gap="sm" maw="36rem" mx="auto" px="md" py={80} ta="center">
      <Title order={1} size="h2">
        여행을 찾을 수 없어요
      </Title>
      <Text c="dimmed">링크가 잘못됐거나 지워진 여행이에요. 받은 링크를 다시 확인해 주세요.</Text>
      <LinkButton href="/trips" mt="xs">
        여행 목록으로
      </LinkButton>
    </Stack>
  );
}
