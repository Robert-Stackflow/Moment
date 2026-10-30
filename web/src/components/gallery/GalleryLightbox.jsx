import { useLightbox } from '../../hooks/useLightbox'
import { useSettings } from '../../state/settings'
import { imageURL } from '../../lib/gallery'
import GalleryButton from './GalleryButton'
import Presence from './Presence'
import AmbientBackground from './AmbientBackground'
import { MetadataLink } from './PhotoCard'
import '../../styles/gallery/lightbox.css'

export default function GalleryLightbox(props) {
  const { post, index, previous, following, contained, onPost, onClose } = props
  const { content } = useSettings(),
    view = useLightbox(props)
  const { refs, patch, scale, loaded, failed, dragging, showInfo, showThumbs, caption } = view
  return (
    <section
      ref={refs.dialog}
      className="gallery-viewer lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="照片浏览"
      tabIndex={-1}
    >
      <AmbientBackground url={view.ambientURL} />
      <header className="viewer-toolbar">
        <div className="viewer-heading">
          <span className="viewer-post-title">{post.title}</span>
          <span className="viewer-counter" aria-live="polite">
            {`${index + 1} `}
            <span>{`/ ${post.images.length}`}</span>
          </span>
        </div>
        <div className="viewer-tools">
          <GalleryButton
            icon={scale > 1 ? 'reset' : 'zoom'}
            label={scale > 1 ? '还原大小 · 0' : '放大 · 双击照片'}
            disabled={!loaded}
            pressed={scale > 1}
            onClick={() => view.toggleZoom()}
          />
          <GalleryButton
            icon="info"
            label="照片信息"
            pressed={showInfo}
            onClick={() => patch({ showInfo: !showInfo })}
          />
          {post.images.length > 1 && (
            <GalleryButton
              icon="grid"
              label="缩略图"
              pressed={showThumbs}
              onClick={() => patch({ showThumbs: !showThumbs })}
            />
          )}
          <GalleryButton icon="share" label="分享当前照片" onClick={view.share} />
          <GalleryButton icon="close" label="关闭 · Esc" onClick={onClose} />
        </div>
      </header>
      <div className="viewer-canvas">
        <div
          ref={refs.stage}
          className={`viewer-stage${scale > 1 ? ' is-zoomed' : ''}${dragging ? ' is-dragging' : ''}`}
          onPointerDown={view.pointerDown}
          onPointerMove={view.pointerMove}
          onPointerUp={view.pointerUp}
          onPointerCancel={view.pointerUp}
          onDoubleClick={view.doubleClick}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            ref={refs.frame}
            className="viewer-frame"
            style={view.frameStyle}
            aria-busy={!loaded && !failed}
          >
            <div className="viewer-transition-surface" aria-hidden="true" />
            {view.displayURL && (
              <img
                ref={refs.imageElement}
                className={'viewer-photo' + (!loaded ? ' is-pending' : '')}
                src={view.displayURL}
                alt={loaded ? view.title : ''}
                aria-hidden={!loaded}
                style={view.imageStyle}
                draggable={false}
              />
            )}
            {!loaded && view.loadingShown && (
              <div className="viewer-loading" onPointerDown={(event) => event.stopPropagation()}>
                {failed ? (
                  <>
                    <span>图片暂时无法加载</span>
                    <button onClick={view.load}>重新加载</button>
                  </>
                ) : (
                  <span className="viewer-spinner" role="status" aria-label="正在加载大图" />
                )}
              </div>
            )}
            <Presence show={showInfo && !!caption && loaded && scale === 1} name="viewer-info">
              <div
                key={view.displayURL}
                className="viewer-caption"
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <h2>{caption?.title}</h2>
                {caption?.description && (
                  <p className="viewer-description">{caption.description}</p>
                )}
                <div className="viewer-meta">
                  {content.detail_show_location !== false && caption?.location && (
                    <MetadataLink
                      contained={contained}
                      to={'/location/' + encodeURIComponent(caption.location)}
                    >
                      {caption.location}
                    </MetadataLink>
                  )}
                  {content.detail_show_time !== false && caption?.date && (
                    <span>{caption.date}</span>
                  )}
                  {caption?.metadata && <span>{caption.metadata}</span>}
                </div>
                {!!caption?.categories?.length && (
                  <div className="viewer-categories">
                    {caption.categories.map((category) => (
                      <MetadataLink
                        key={category.id}
                        contained={contained}
                        to={'/category/' + encodeURIComponent(category.alias)}
                      >
                        {category.name}
                      </MetadataLink>
                    ))}
                  </div>
                )}
              </div>
            </Presence>
          </div>
        </div>
        {post.images.length > 1 && (
          <>
            <GalleryButton
              className="viewer-arrow viewer-prev"
              icon="left"
              label="上一张 · ←"
              disabled={index === 0}
              onClick={() => view.choose(index - 1)}
            />
            <GalleryButton
              className="viewer-arrow viewer-next"
              icon="right"
              label="下一张 · →"
              disabled={index === post.images.length - 1}
              onClick={() => view.choose(index + 1)}
            />
          </>
        )}
        {scale > 1 && (
          <button className="viewer-scale" onClick={view.resetZoom}>
            {Math.round(scale * 100)}% · 还原
          </button>
        )}
      </div>
      <footer className="viewer-footer">
        {showThumbs && (
          <div ref={refs.thumbStrip} className="viewer-thumbnails" aria-label="本帖照片">
            {(post.images.length > 1 ? post.images : []).map((item, i) => (
              <button
                key={item.id}
                aria-label={'查看第 ' + (i + 1) + ' 张照片'}
                aria-current={index === i ? 'true' : undefined}
                onClick={() => view.choose(i)}
              >
                <img src={imageURL(item, content, 'thumbnail', 320)} alt="" loading="lazy" />
                <span>{i + 1}</span>
              </button>
            ))}
          </div>
        )}
        <div className="viewer-post-navigation">
          {previous ? (
            <button onClick={() => onPost(previous)}>
              <span>←</span> 上一篇<span className="viewer-nav-title">{previous.title}</span>
            </button>
          ) : (
            <span />
          )}
          <button className="viewer-back" onClick={onClose}>
            返回照片墙
          </button>
          {following ? (
            <button onClick={() => onPost(following)}>
              下一篇 <span className="viewer-nav-title">{following.title}</span>
              <span>→</span>
            </button>
          ) : (
            <span />
          )}
        </div>
      </footer>
      <Presence show={!!view.notice} name="gallery-tip">
        <div className="viewer-notice" role="status">
          {view.notice}
        </div>
      </Presence>
      {view.shareURL && (
        <div className="viewer-share">
          <label htmlFor="viewer-share-url">复制照片链接</label>
          <input
            id="viewer-share-url"
            className="viewer-share-input"
            value={view.shareURL}
            readOnly
          />
          <GalleryButton icon="close" label="关闭链接" onClick={() => patch({ shareURL: '' })} />
        </div>
      )}
    </section>
  )
}
