"use client";

import { Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useState, useTransition } from "react";
import { DateRangePicker } from "@/components/form/date-picker";
import { createTrip } from "@/lib/trips/actions";
import { firstError, newTripSchema } from "@/lib/trips/schema";

export function NewTripForm() {
  const [form, setForm] = useState({ name: "", start: "", end: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Paper
      component="form"
      noValidate
      withBorder
      radius="lg"
      p="md"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = newTripSchema.safeParse(form);
        // 날짜 규칙(종료일 < 시작일 등)도 newTripSchema 안에 있다
        if (!parsed.success) return setError(firstError(parsed.error));
        setError("");
        // 성공하면 서버가 새 여행 링크로 이동시킨다
        startTransition(async () => {
          const r = await createTrip(form);
          if (!r.ok) setError(r.error);
        });
      }}
    >
      <Stack gap="sm">
        <TextInput
          id="n-name"
          label="여행 이름"
          maxLength={30}
          autoComplete="off"
          placeholder="예: 26년 가을 가평"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
        />
        <DateRangePicker
          id="n-dates"
          label="여행 날짜"
          start={form.start}
          end={form.end}
          onChange={(start, end) => setForm({ ...form, start, end })}
        />
        {error && (
          <Text size="sm" c="red" fw={500} role="alert">
            {error}
          </Text>
        )}
        <Group>
          <Button type="submit" loading={pending}>
            여행 만들기
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
