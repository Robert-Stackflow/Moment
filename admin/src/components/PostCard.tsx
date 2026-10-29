import { Badge, Button, IconButton } from "@robert-stackflow/oneui";
import { Pencil, Trash2 } from "lucide-react";
import { Link, useLinkClickHandler } from "react-router-dom";
import type { Post, Settings } from "../types";
import { coverPosition, thumbnail } from "../types";
import { adminHref } from "../ui-data";
import { MediaCard, type MediaCardLinkProps } from "./MediaCard";

const routerLink = ({ href, ...props }: MediaCardLinkProps) => (
  <Link to={href} {...props} />
);

export function PostCard({
  post,
  settings,
  detail = "compact",
  selected = false,
  disabled = false,
  onSelect,
  onDelete,
}: {
  post: Post;
  settings?: Settings;
  detail?: "compact" | "full";
  selected?: boolean;
  disabled?: boolean;
  onSelect?(selected: boolean): void;
  onDelete?(): void;
}) {
  const path = `/posts/${post.id}`;
  const edit = useLinkClickHandler<HTMLAnchorElement>(path);
  const cover = post.images.find((image) => !image.is_hidden) || post.images[0];
  const metadata = [
    post.location,
    `${post.images.length} 张图片`,
    detail === "full" ? post.time?.slice(0, 10) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <MediaCard
      className="post-card"
      src={cover ? thumbnail(cover.image_url, settings) : undefined}
      title={post.title}
      href={path}
      renderLink={routerLink}
      objectPosition={coverPosition(post)}
      metadata={metadata}
      status={
        detail === "full" || post.is_hidden ? (
          <Badge tone={post.is_hidden ? "neutral" : "accent"}>
            {post.is_hidden ? "隐藏" : "公开"}
          </Badge>
        ) : undefined
      }
      selection={
        onSelect
          ? {
              selected,
              label: `选择 ${post.title}`,
              disabled,
              onChange: onSelect,
            }
          : undefined
      }
      tags={
        detail === "full" && post.categories.length
          ? post.categories.slice(0, 2).map((category) => (
              <Badge key={category.id} tone="neutral">
                {category.name}
              </Badge>
            ))
          : undefined
      }
      actions={
        detail === "full" ? (
          <>
            <Button
              href={adminHref(path)}
              aria-label={`编辑 ${post.title}`}
              onClick={edit}
              variant="ghost"
            >
              <Pencil size={16} />
            </Button>
            {onDelete && (
              <IconButton
                label={`删除 ${post.title}`}
                disabled={disabled}
                onClick={onDelete}
                variant="danger"
              >
                <Trash2 size={16} />
              </IconButton>
            )}
          </>
        ) : undefined
      }
    />
  );
}
