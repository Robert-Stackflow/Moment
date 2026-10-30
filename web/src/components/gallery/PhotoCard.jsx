import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../state/settings'
import { imageURL, thumbnailSources, focusPosition, photoPath, photoDate } from '../../lib/gallery'
import '../../styles/gallery/photo.css'

export function MetadataLink({ contained, to, children }) {
  return contained ? <span>{children}</span> : <Link to={to}>{children}</Link>
}
export default function PhotoCard({ data, index = 0, contained, pathFor = photoPath, onOpen }) {
  const { content } = useSettings(),
    cover = data.images[0],
    item = useRef(null)
  const [visible, setVisible] = useState(false),
    [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(item.current)
    return () => observer.disconnect()
  }, [])
  async function imageLoaded(event) {
    const image = event.currentTarget
    try {
      await image.decode()
    } catch {
      /* A loaded image can still be displayed. */
    }
    if (image.isConnected) setLoaded(true)
  }
  return (
    <article
      ref={item}
      className={`thumb img-area${loaded ? ' is-loaded' : ''}${failed ? ' is-failed' : ''}${visible && (loaded || failed) ? ' is-revealed' : ''}`}
      style={{ '--entrance-delay': (index % 4) * 45 + 'ms' }}
    >
      <a
        className="thumb-a my-photo"
        href={pathFor(data)}
        aria-label={`${data.title}，${`${data.images.length} 张`}照片`}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button)
            return
          event.preventDefault()
          onOpen(data)
        }}
      >
        {!failed && (
          <img
            key={attempt}
            className="thumb-image my-photo"
            src={imageURL(cover, content, 'thumbnail')}
            srcSet={thumbnailSources(cover, content)}
            alt={cover.title || data.title}
            loading={index < 3 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            decoding="async"
            style={{ objectPosition: focusPosition(cover) }}
            onLoad={imageLoaded}
            onError={() => setFailed(true)}
          />
        )}
        <h2 className="thumb-title">{data.title}</h2>
        {data.images.length > 1 && (
          <span className="thumb-count">{`${data.images.length} 张`}</span>
        )}
      </a>
      {failed && (
        <div className="thumb-error">
          <span>照片暂时无法加载</span>
          <button
            type="button"
            onClick={() => {
              setFailed(false)
              setLoaded(false)
              setAttempt((v) => v + 1)
            }}
          >
            重试
          </button>
        </div>
      )}
      <ul className="tags">
        <li className="tag-categories">
          {content.thumbnail_show_location !== false && data.location && (
            <MetadataLink
              contained={contained}
              to={'/location/' + encodeURIComponent(data.location)}
            >
              {data.location}
            </MetadataLink>
          )}
          {content.thumbnail_show_time && data.time && (
            <span>{photoDate(data.time, content.thumbnail_time_format || 'YYYY年M月D日')}</span>
          )}
          {data.categories.map((category) => (
            <MetadataLink
              key={category.id}
              contained={contained}
              to={'/category/' + encodeURIComponent(category.alias)}
            >
              {category.name}
            </MetadataLink>
          ))}
        </li>
      </ul>
    </article>
  )
}
