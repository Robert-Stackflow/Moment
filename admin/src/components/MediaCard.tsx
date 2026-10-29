import { Card, IconButton } from "@robert-stackflow/oneui";
import { Check, Circle, Image as ImageIcon } from "lucide-react";
import {
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import s from "./MediaCard.module.css";

export type MediaCardLinkProps = ComponentPropsWithoutRef<"a"> & {
  href: string;
};
export type MediaCardProps = {
  src?: string;
  title: string;
  alt?: string;
  href?: string;
  renderLink?(props: MediaCardLinkProps): ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
  tags?: ReactNode;
  actions?: ReactNode;
  objectPosition?: CSSProperties["objectPosition"];
  className?: string;
  selection?: {
    selected: boolean;
    label: string;
    disabled?: boolean;
    onChange(selected: boolean): void;
  };
};

export function MediaCard({
  src,
  title,
  alt = title,
  href,
  renderLink,
  metadata,
  status,
  tags,
  actions,
  objectPosition,
  className = "",
  selection,
}: MediaCardProps) {
  const [failed, setFailed] = useState<string>();
  const link = (props: MediaCardLinkProps) =>
    renderLink ? renderLink(props) : <a {...props} />;
  const picture =
    src && failed !== src ? (
      <img
        key={src}
        src={src}
        alt={alt}
        loading="lazy"
        className={s.image}
        style={{ objectPosition }}
        onError={() => setFailed(src)}
      />
    ) : (
      <span className={s.placeholder} aria-hidden="true">
        <ImageIcon size={26} />
      </span>
    );
  const marker = selection && (
    <span className={s.marker} data-media-selection aria-hidden="true">
      {selection.selected ? <Check size={15} /> : <Circle size={15} />}
    </span>
  );
  return (
    <Card
      className={`media-card ${s.card} ${selection?.selected ? s.selected : ""} ${className}`}
    >
      <div className={s.frame} data-media-frame>
        {href ? (
          link({
            href,
            className: s.imageLink,
            "aria-label": title,
            children: picture,
          })
        ) : selection ? (
          <IconButton
            className={s.imageToggle}
            label={selection.label}
            aria-pressed={selection.selected}
            disabled={selection.disabled}
            onClick={() => selection.onChange(!selection.selected)}
          >
            {picture}
            {marker}
          </IconButton>
        ) : (
          picture
        )}
        {href && selection && (
          <div className={s.selection} data-media-selection>
            <IconButton
              className={s.selectButton}
              label={selection.label}
              aria-pressed={selection.selected}
              disabled={selection.disabled}
              onClick={() => selection.onChange(!selection.selected)}
            >
              {selection.selected ? <Check size={15} /> : <Circle size={15} />}
            </IconButton>
          </div>
        )}
      </div>
      <div className={s.details} data-media-details>
        <div className={s.heading}>
          <h3 className={s.title}>
            {href
              ? link({ href, className: s.titleLink, children: title })
              : title}
          </h3>
          {status}
        </div>
        {metadata != null && (
          <div className={s.metadata} data-media-metadata>
            {metadata}
          </div>
        )}
        {(tags || actions) && (
          <div className={s.footer} data-media-footer>
            {tags && <div className={s.tags}>{tags}</div>}
            {actions && <div className={s.actions}>{actions}</div>}
          </div>
        )}
      </div>
    </Card>
  );
}
