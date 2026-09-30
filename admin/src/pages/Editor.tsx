import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../api";
import { ErrorState, Loading } from "../components/Common";
import { PostEditor } from "../components/PostEditor";
import type { Category, Post, PostDraft, Settings } from "../types";

export function NewPost() {
  const [key] = useState(() => crypto.randomUUID());
  return <Navigate to={`/drafts/${key}`} replace />;
}

export default function Editor() {
  const { id, draftID } = useParams();
  const draft = useQuery({
    queryKey: draftID ? ["draft", draftID] : ["postDraft", id],
    queryFn: () =>
      api<PostDraft | null>(
        draftID ? `/drafts/${draftID}` : `/posts/${id}/draft`,
      ),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.data?.schedule?.status === "pending" ? 5_000 : false,
  });
  const postID =
    id ||
    (draft.data?.data?.post_id ? String(draft.data.data.post_id) : undefined);
  const post = useQuery({
    queryKey: ["post", postID],
    queryFn: () => api<Post>(`/posts/${postID}`),
    enabled: !!postID,
    staleTime: 0,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api<Category[]>("/categories"),
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  if (draft.data?.data?.published_post_id)
    return (
      <Navigate to={`/posts/${draft.data.data.published_post_id}`} replace />
    );
  if (
    draft.isPending ||
    (!draft.isFetchedAfterMount && draft.isFetching) ||
    (postID &&
      (post.isPending || (!post.isFetchedAfterMount && post.isFetching))) ||
    settings.isPending ||
    categories.isPending
  )
    return <Loading />;
  const error = draft.error || post.error || settings.error || categories.error;
  if (error)
    return (
      <ErrorState
        error={error}
        retry={() => {
          void draft.refetch();
          void post.refetch();
          void settings.refetch();
          void categories.refetch();
        }}
      />
    );
  return (
    <PostEditor
      key={id || draftID}
      draftKey={draftID}
      initialDraft={draft.data?.data || null}
      initial={post.data?.data}
      categories={categories.data?.data || []}
      settings={settings.data!.data}
    />
  );
}
