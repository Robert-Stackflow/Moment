import { Button } from '@robert-stackflow/oneui/Button'
import { IconButton } from '@robert-stackflow/oneui/IconButton'
import { Popover } from '@robert-stackflow/oneui/Popover'
import { imageURL, focusPosition } from '../../lib/gallery'
import GalleryIcon from './GalleryIcon'

export default function MapPhotoPreview({
  selection,
  emptyAnchor,
  feed,
  onClose,
  onEnter,
  onLeave,
  onZoom,
}) {
  const { photos, total, loading, error, onMore, onPhoto, href, content } = feed
  const point = selection?.point
  return (
    <Popover
      open={!!selection?.open}
      anchor={selection?.anchorRef || emptyAnchor}
      onClose={onClose}
      width={370}
      maxHeight={selection?.maxHeight || 420}
      side={selection?.side || 'auto'}
      autoFocus={false}
      label="此处的照片"
      className="map-photo-popup"
    >
      <div onPointerEnter={onEnter} onPointerLeave={onLeave}>
        <header className="map-photo-heading">
          <div>
            <strong>
              {point && point.east - point.west < 0.001 && point.north - point.south < 0.001
                ? point.location || '此处的照片'
                : '附近的照片'}
            </strong>
            <span>{point?.count || total} 张照片</span>
          </div>
          <div className="map-photo-actions">
            <IconButton label="放大此区域" onClick={onZoom}>
              <GalleryIcon name="expand" />
            </IconButton>
            <IconButton label="关闭位置照片" onClick={onClose}>
              <GalleryIcon name="close" />
            </IconButton>
          </div>
        </header>
        {loading && !photos.length ? (
          <p className="map-photo-status" role="status">
            正在加载照片…
          </p>
        ) : null}
        {error ? (
          <div className="map-photo-status" role="alert">
            {error}
            <Button onClick={onMore} size="small">
              重试
            </Button>
          </div>
        ) : null}
        <div className="map-photo-list">
          {photos.map((photo) => (
            <a
              key={photo.photo_id}
              href={href(photo)}
              onClick={(event) => {
                if (
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault()
                  onClose()
                  onPhoto(photo)
                }
              }}
            >
              <img
                src={imageURL(photo, content, 'thumbnail', 320)}
                style={{ objectPosition: focusPosition(photo) }}
                alt=""
                loading="lazy"
                onError={(event) => {
                  if (!event.currentTarget.dataset.fallback) {
                    event.currentTarget.dataset.fallback = '1'
                    event.currentTarget.src = photo.image_url
                  }
                }}
              />
              <span>{photo.title}</span>
            </a>
          ))}
        </div>
        {!loading && !photos.length && !error ? (
          <p className="map-photo-status">这个位置暂时没有照片</p>
        ) : null}
        {photos.length < total && !error ? (
          <div className="map-photo-more">
            <Button loading={loading} size="small" onClick={onMore}>
              加载更多
            </Button>
          </div>
        ) : null}
      </div>
    </Popover>
  )
}
