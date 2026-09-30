export interface User {
  id: number;
  username: string;
  alias: string | null;
  email: string;
  avatar: string;
  last_login: string | null;
}
export interface Category {
  id: number;
  name: string;
  alias: string;
  desc: string | null;
  order: number;
  parent_id: number;
  children?: Category[];
}
export interface Photo {
  id?: number;
  image_url: string;
  title: string | null;
  desc: string | null;
  location: string | null;
  time: string | null;
  metadata: string | null;
  is_hidden: boolean;
  order: number;
  _key?: string;
  focus_x?: number;
  focus_y?: number;
}
export interface Post {
  id: number;
  revision: number;
  title: string;
  desc: string | null;
  location: string | null;
  time: string | null;
  is_hidden: boolean;
  images: Photo[];
  category_ids: number[];
  categories: Category[];
  created_at: string;
  updated_at: string;
}
export type PostContent = Pick<
  Post,
  | "title"
  | "desc"
  | "location"
  | "time"
  | "is_hidden"
  | "images"
  | "category_ids"
>;
export interface TrashedPost extends Post {
  deleted_at: string;
  draft_count: number;
}
export interface PostDraft {
  id: string;
  post_id: number | null;
  base_revision: number;
  revision: number;
  mutation_id: string;
  payload: PostContent;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_post_id: number | null;
}
export interface DraftSummary {
  id: string;
  post_id: number | null;
  revision: number;
  title: string;
  description: string;
  cover: string | null;
  image_count: number;
  updated_at: string;
}
export interface Result<T> {
  code: number;
  msg: string;
  data: T;
  total?: number;
  page?: number;
  page_size?: number;
}
export type Section = "meta" | "content" | "storage" | "general";
export type Settings = Record<Section, Record<string, unknown>>;
export const orders = [
  { value: "created_at_desc", label: "最近创建" },
  { value: "updated_at_desc", label: "最近更新" },
  { value: "meta_time_desc", label: "拍摄时间从新到旧" },
  { value: "meta_time_asc", label: "拍摄时间从旧到新" },
  { value: "created_at_asc", label: "最早创建" },
  { value: "updated_at_asc", label: "最早更新" },
];
export const flatten = (items: Category[]): Category[] =>
  items.flatMap((item) => [item, ...flatten(item.children || [])]);
export function thumbnail(url: string, settings?: Settings): string {
  return /^https?:/.test(url)
    ? url + String(settings?.content.thumbnail_suffix || "")
    : url;
}
export function coverPosition(post: Post): string {
  const photo = post.images.find((image) => !image.is_hidden) || post.images[0];
  return `${photo?.focus_x ?? 50}% ${photo?.focus_y ?? 50}%`;
}
export function datetime(value: string | null): string {
  return value ? value.slice(0, 19).replace(" ", "T") : "";
}
