import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Plus,
  Images,
  FolderTree,
  EyeOff,
  Aperture,
} from "lucide-react";
import { api } from "../api";
import { PageTitle, Loading, ErrorState, Empty } from "../components/Common";
import { thumbnail } from "../types";
import type { Post, Settings } from "../types";

export default function Dashboard() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () =>
      api<{ blog: number; image: number; category: number; hidden: number }>(
        "/stats",
      ),
  });
  const recent = useQuery({
    queryKey: ["posts", "recent"],
    queryFn: () => api<Post[]>("/posts?page_size=6&order=created_at_desc"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const metrics = [
    { label: "帖子", key: "blog", icon: Aperture },
    { label: "图片", key: "image", icon: Images },
    { label: "分类", key: "category", icon: FolderTree },
    { label: "隐藏帖子", key: "hidden", icon: EyeOff },
  ] as const;
  return (
    <>
      <PageTitle title="工作台">
        <Button
          component={Link}
          to="/posts/new"
          leftSection={<Plus size={18} />}
        >
          新建帖子
        </Button>
      </PageTitle>
      {stats.error ? (
        <ErrorState error={stats.error} retry={stats.refetch} />
      ) : (
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg" mb={32}>
          {metrics.map(({ label, key, icon: Icon }) => (
            <Paper withBorder p="xl" key={key}>
              <Group justify="space-between">
                <Text c="dimmed" size="sm">
                  {label}
                </Text>
                <Icon
                  size={20}
                  color="var(--moment-accent)"
                  strokeWidth={1.5}
                />
              </Group>
              <Text size="32px" fw={600} mt={10}>
                {stats.data?.data[key] ?? "—"}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      )}
      <Group justify="space-between" mb={18}>
        <Title order={3}>最近帖子</Title>
        <Button
          component={Link}
          to="/posts"
          variant="subtle"
          rightSection={<ArrowUpRight size={16} />}
        >
          查看全部
        </Button>
      </Group>
      {recent.isPending ? (
        <Loading />
      ) : recent.error ? (
        <ErrorState error={recent.error} retry={recent.refetch} />
      ) : recent.data.data.length === 0 ? (
        <Paper withBorder>
          <Empty description="从上传第一张照片开始。">
            <Button component={Link} to="/posts/new">
              新建帖子
            </Button>
          </Empty>
        </Paper>
      ) : (
        <div className="post-grid">
          {recent.data.data.map((post) => (
            <Paper
              component={Link}
              to={`/posts/${post.id}`}
              withBorder
              p={12}
              key={post.id}
            >
              <Image
                className="photo-cover"
                src={thumbnail(
                  post.images[0]?.image_url || "",
                  settings.data?.data,
                )}
                alt={post.title}
                fallbackSrc="/assets/loading.gif"
              />
              <Stack gap={8} p={8} pt={16}>
                <Group justify="space-between">
                  <Text fw={600} lineClamp={1}>
                    {post.title}
                  </Text>
                  {post.is_hidden ? (
                    <Badge variant="light" color="gray">
                      隐藏
                    </Badge>
                  ) : null}
                </Group>
                <Text size="xs" c="dimmed">
                  {post.location || "未设置地点"} · {post.images.length} 张图片
                </Text>
              </Stack>
            </Paper>
          ))}
        </div>
      )}
    </>
  );
}
