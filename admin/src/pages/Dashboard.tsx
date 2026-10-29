import { PostCard } from "../components/PostCard";
import { Button, Card } from "@robert-stackflow/oneui";
import { useQuery } from "@tanstack/react-query";
import {
  Aperture,
  ArrowUpRight,
  EyeOff,
  FolderTree,
  Images,
  Plus,
} from "lucide-react";
import { api } from "../api";
import { Empty, ErrorState, Loading, PageTitle } from "../components/Common";
import type { Post, Settings } from "../types";
import { adminHref, gridStyle } from "../ui-data";
export default function Dashboard() {
  const stats = useQuery({
    queryKey: ["stats"],
    queryFn: () =>
      api<{
        blog: number;
        image: number;
        category: number;
        hidden: number;
      }>("/stats"),
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
        <Button href={adminHref("/posts/new")} variant="primary">
          {<Plus size={18} />}
          新建帖子
        </Button>
      </PageTitle>
      {stats.error ? (
        <ErrorState error={stats.error} retry={stats.refetch} />
      ) : (
        <div
          className="ui-grid"
          style={{
            ...gridStyle({ base: 2, md: 4 }, 24),
            marginBottom: 32,
          }}
        >
          {metrics.map(({ label, key, icon: Icon }) => (
            <Card key={key} className="moment-panel">
              <div
                className="ui-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <p
                  className="ui-text"
                  style={{
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  {label}
                </p>
                <Icon
                  size={20}
                  color="var(--moment-accent)"
                  strokeWidth={1.5}
                />
              </div>
              <p
                className="ui-text"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 10,
                }}
              >
                {stats.data?.data[key] ?? "—"}
              </p>
            </Card>
          ))}
        </div>
      )}
      <div
        className="ui-row"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <h3 className="ui-title">最近帖子</h3>
        <Button href={adminHref("/posts")} variant="ghost">
          查看全部
          {<ArrowUpRight size={16} />}
        </Button>
      </div>
      {recent.isPending ? (
        <Loading />
      ) : recent.error ? (
        <ErrorState error={recent.error} retry={recent.refetch} />
      ) : recent.data.data.length === 0 ? (
        <Card className="moment-panel">
          <Empty description="从上传第一张照片开始。">
            <Button href={adminHref("/posts/new")} variant="primary">
              新建帖子
            </Button>
          </Empty>
        </Card>
      ) : (
        <div className="post-grid">
          {recent.data.data.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              settings={settings.data?.data}
              detail="compact"
            />
          ))}
        </div>
      )}
    </>
  );
}
