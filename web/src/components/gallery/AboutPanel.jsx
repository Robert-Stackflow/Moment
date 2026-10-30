import { useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import entryIcons from '../../../../shared/entry-icons.json'
import { useSettings } from '../../state/settings'
import { versionedBrandIcon } from '../../lib/brand'
import { lockPageScroll } from '../../lib/scroll-lock'
import GalleryButton from './GalleryButton'
import '../../styles/gallery/about.css'

export default function AboutPanel({ open, onClose }) {
  const { meta } = useSettings(),
    panel = useRef(null)
  const focusPanel = () => {
    if (open && !panel.current?.contains(document.activeElement))
      panel.current?.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (!open) return
    const focused = document.activeElement,
      release = lockPageScroll()
    const background = [...document.querySelectorAll('#blog-main,#header,.gallery-sentinel')].map(
      (element) => [element, element.inert],
    )
    for (const [element] of background) element.inert = true
    let second
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(focusPanel)
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
      release()
      for (const [element, inert] of background) element.inert = inert
      if (focused?.isConnected) focused.focus({ preventScroll: true })
    }
  }, [open])
  function keydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
    if (event.key !== 'Tab') return
    const controls = [...panel.current.querySelectorAll('a[href],button')].filter(
        (node) => node.getClientRects().length,
      ),
      first = controls[0],
      last = controls.at(-1)
    if (event.shiftKey && [first, panel.current].includes(document.activeElement)) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
  return (
    <footer
      id="footer"
      ref={panel}
      className={'about-panel panel' + (open ? ' active' : '')}
      inert={!open}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
      tabIndex={-1}
      onKeyDown={keydown}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) focusPanel()
      }}
    >
      <div className="about-close-position">
        <GalleryButton
          className="about-close"
          icon="close"
          label="关闭关于 · Esc"
          onClick={onClose}
        />
      </div>
      <div className="about-content">
        <section className="about-story">
          <img
            className="about-logo"
            src={versionedBrandIcon(meta.bottom_icon || import.meta.env.VITE_ICON)}
            alt=""
          />
          <h2 id="about-title">{`关于${meta.site_name || import.meta.env.VITE_TITLE}`}</h2>
          <p>{meta.site_desc || import.meta.env.VITE_DESC}</p>
        </section>
        {!!meta.entries?.length && (
          <nav className="about-links" aria-label="联系与更多">
            <h3>联系与更多</h3>
            <div className="about-link-list">
              {meta.entries.map((entry) => (
                <a
                  key={entry.name + entry.url}
                  href={entry.url}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  <Icon
                    icon={entryIcons.find((item) => item.value === entry.icon)?.icon || entry.icon}
                    width={19}
                    height={19}
                  />
                  <span>{entry.name}</span>
                  <svg
                    className="about-link-arrow"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    width="14"
                    height="14"
                    aria-hidden="true"
                  >
                    <path d="M4 12 12 4M4 4h8v8" />
                  </svg>
                </a>
              ))}
            </div>
          </nav>
        )}
      </div>
      {meta.icp && (
        <div className="about-legal">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener nofollow">
            {meta.icp}
          </a>
        </div>
      )}
    </footer>
  )
}
