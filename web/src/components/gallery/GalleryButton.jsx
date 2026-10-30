import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import GalleryIcon from './GalleryIcon'
import Presence from './Presence'
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
  const button = useRef(null),
    tooltip = useRef(null),
    timer = useRef()
  const [visible, setVisible] = useState(false),
    [position, setPosition] = useState({ left: '-1000px', top: '-1000px' })
  const id = useId()
  const hide = () => {
    clearTimeout(timer.current)
    setVisible(false)
  }
  function show(event) {
    if (disabled || event.pointerType === 'touch') return
    if (event.type === 'focus' && !button.current?.matches(':focus-visible')) return
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(true), 280)
  }
  useLayoutEffect(() => {
    if (!visible || !tooltip.current || !button.current) return
    const rect = button.current.getBoundingClientRect(),
      box = tooltip.current.getBoundingClientRect()
    setPosition({
      left: `${Math.max(8, Math.min(innerWidth - box.width - 8, rect.left + (rect.width - box.width) / 2))}px`,
      top: `${rect.top > box.height + 16 ? rect.top - box.height - 8 : rect.bottom + 8}px`,
    })
  }, [visible])
  useEffect(() => {
    setVisible(false)
    clearTimeout(timer.current)
  }, [label])
  useEffect(() => {
    window.addEventListener('resize', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener('resize', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])
  const internal = href && /^(\/(?!\/)|\?|#)/.test(href)
  const Tag = internal ? Link : href ? 'a' : 'button'
  const destination = internal ? { to: href } : { href }
  return (
    <>
      <Tag
        {...attrs}
        {...destination}
        ref={button}
        type={href ? undefined : 'button'}
        className={`gallery-button ${className}`}
        aria-label={label}
        aria-pressed={pressed}
        disabled={href ? undefined : disabled}
        aria-describedby={visible ? id : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        onPointerDown={hide}
        onClick={(event) => {
          hide()
          onClick?.(event)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') hide()
        }}
      >
        {icon && <GalleryIcon name={icon} />}
        {children}
      </Tag>
      {createPortal(
        <Presence show={visible} name="gallery-tip">
          <span id={id} ref={tooltip} role="tooltip" className="gallery-tooltip" style={position}>
            {label}
          </span>
        </Presence>,
        document.body,
      )}
    </>
  )
}
