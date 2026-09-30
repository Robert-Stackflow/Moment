import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, json } from "../api";
import type { PostDraft } from "../types";

// A single writer drains successive edits. A failed request retains its mutation
// ID so retries are safe even when the server saved it but the response was lost.
export function usePostDraft(
  serialized: string,
  initial: PostDraft | null,
  key: string,
  postID?: number,
  baseRevision = 0,
) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(serialized);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initial ? "saved" : "idle",
  );
  const [error, setError] = useState<Error | null>(null);
  const [savedAt, setSavedAt] = useState(initial?.updated_at || "");
  const latest = useRef(serialized);
  latest.current = serialized;
  const acknowledged = useRef(serialized);
  const identity = useRef({
    id: initial?.id || key,
    post_id: initial?.post_id ?? postID ?? null,
    base_revision: initial?.base_revision ?? baseRevision,
    revision: initial?.revision || 0,
  });
  const pending = useRef<{ serialized: string; mutation_id: string } | null>(
    null,
  );
  const running = useRef<Promise<{ id: string; revision: number }> | null>(
    null,
  );
  const mounted = useRef(true);
  const fatal = useRef(false);

  const flush = useCallback(async () => {
    if (running.current) return running.current;
    if (
      !pending.current &&
      latest.current === acknowledged.current &&
      identity.current.revision > 0
    )
      return { id: identity.current.id, revision: identity.current.revision };
    const task = async () => {
      if (mounted.current) {
        setStatus("saving");
        setError(null);
      }
      try {
        do {
          const change = pending.current || {
            serialized: latest.current,
            mutation_id: crypto.randomUUID(),
          };
          pending.current = change;
          const response = await api<PostDraft>(
            `/drafts/${identity.current.id}`,
            {
              ...json("PUT", {
                ...identity.current,
                mutation_id: change.mutation_id,
                payload: JSON.parse(change.serialized),
              }),
              signal: AbortSignal.timeout(15_000),
              preserveEditorOnUnauthorized: true,
            },
          );
          identity.current.revision = response.data.revision;
          acknowledged.current = change.serialized;
          pending.current = null;
          if (mounted.current) {
            setSaved(change.serialized);
            setSavedAt(response.data.updated_at);
          }
          void client.invalidateQueries({ queryKey: ["drafts"] });
          client.setQueryData(["draft", identity.current.id], response);
          if (identity.current.post_id)
            client.setQueryData(
              ["postDraft", String(identity.current.post_id)],
              response,
            );
        } while (mounted.current && latest.current !== acknowledged.current);
        fatal.current = false;
        if (mounted.current) setStatus("saved");
        return { id: identity.current.id, revision: identity.current.revision };
      } catch (cause) {
        const failure =
          cause instanceof Error ? cause : new Error("草稿保存失败");
        fatal.current =
          cause instanceof ApiError &&
          cause.status >= 400 &&
          cause.status < 500;
        if (mounted.current) {
          setError(failure);
          setStatus("error");
        }
        throw failure;
      } finally {
        running.current = null;
      }
    };
    running.current = task();
    return running.current;
  }, [client]);

  const reset = (value: string, id: number, revision: number) => {
    identity.current = {
      id: crypto.randomUUID(),
      post_id: id,
      base_revision: revision,
      revision: 0,
    };
    acknowledged.current = value;
    latest.current = value;
    pending.current = null;
    fatal.current = false;
    setSaved(value);
    setStatus("idle");
    setError(null);
    setSavedAt("");
  };
  const dirty = serialized !== saved || pending.current !== null;
  useEffect(() => {
    if (!dirty || status === "saving" || fatal.current) return;
    const timer = window.setTimeout(
      () => void flush().catch(() => {}),
      status === "error" ? 10_000 : 1200,
    );
    return () => window.clearTimeout(timer);
  }, [dirty, serialized, status, flush]);
  useEffect(() => {
    mounted.current = true;
    const retry = () => {
      if (
        !fatal.current &&
        (latest.current !== acknowledged.current || pending.current)
      )
        void flush().catch(() => {});
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") retry();
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [flush]);
  return {
    dirty,
    status,
    error,
    savedAt,
    flush,
    reset,
    conflict: error instanceof ApiError && error.status === 409,
  };
}
