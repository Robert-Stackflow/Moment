import {
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { ApiError } from "../api";
import { useAuth } from "../session";

export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" mb={28} wrap="wrap">
      <div>
        <Title order={2}>{title}</Title>
        {description && (
          <Text c="dimmed" mt={8} size="sm">
            {description}
          </Text>
        )}
      </div>
      {children}
    </Group>
  );
}
export function Loading() {
  return (
    <Center mih={260}>
      <Loader aria-label="加载数据" />
    </Center>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => unknown;
}) {
  const auth = useAuth();
  return (
    <Alert color="red" title="暂时无法显示内容">
      <Stack gap="sm">
        <Text size="sm">{error.message}</Text>
        <Button
          variant="light"
          color="red"
          onClick={() => {
            if (error instanceof ApiError && error.status === 401)
              void auth.refresh();
            else retry();
          }}
        >
          重试
        </Button>
      </Stack>
    </Alert>
  );
}
export function Empty({
  title = "还没有内容",
  description,
  children,
}: {
  title?: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Center mih={280}>
      <Stack align="center" gap="md">
        <ImageOff
          size={36}
          strokeWidth={1.4}
          color="var(--mantine-color-dimmed)"
        />
        <Title order={4}>{title}</Title>
        <Text c="dimmed" size="sm" ta="center">
          {description}
        </Text>
        {children}
      </Stack>
    </Center>
  );
}
