import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { PostEditor } from "../components/PostEditor";
import type { Category, Post, Settings } from "../types";
export default function Editor() {
  const { id } = useParams();
  const post = useQuery({
    queryKey: ["post", id],
    queryFn: () => api<Post>(`/posts/${id}`),
    enabled: !!id,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  if ((id && post.isPending) || settings.isPending || categories.isPending)
    return <Loading />;
  const error = post.error || settings.error || categories.error;
  if (error)
    return (
      <ErrorState
        error={error}
        retry={() => {
          void post.refetch();
          void settings.refetch();
          void categories.refetch();
        }}
      />
    );
  return (
    <PostEditor
      key={id || "new"}
      initial={post.data?.data}
      categories={categories.data?.data || []}
      settings={settings.data!.data}
    />
  );
}
