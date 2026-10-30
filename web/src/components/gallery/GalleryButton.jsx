import { Tooltip } from '@robert-stackflow/oneui/Tooltip'
import { Link } from 'react-router-dom'
import GalleryIcon from './GalleryIcon'
import '../../styles/gallery/button.css'

export default function GalleryButton({
  label,
  icon,
  href,
  disabled,
  pressed,
  children,
  className = '',
  onClick,
  ...attrs
}) {
  const internal = href && /^(\/(?!\/)|\?|#)/.test(href) && !/^\/admin(?:\/|\?|#|$)/.test(href)
  const Tag = internal ? Link : href ? 'a' : 'button'
  const destination = internal ? { to: href } : { href }
  return (
    <Tooltip content={label}>
      <Tag
        {...attrs}
        {...destination}
        type={href ? undefined : 'button'}
        className={`gallery-button ${className}`}
        aria-label={label}
        aria-pressed={pressed}
        disabled={href ? undefined : disabled}
        onClick={onClick}
      >
        {icon && <GalleryIcon name={icon} />}
        {children}
      </Tag>
    </Tooltip>
  )
}
