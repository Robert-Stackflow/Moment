import dayjs from 'dayjs'

export function imageURL(photo, content, kind = 'detail', size = 640) {
  const url = photo?.image_url || ''
  if (kind === 'thumbnail' && url.startsWith('/uploads/') && content?.local_thumbnails !== false)
    return `/thumbnails/${size}/` + url.slice('/uploads/'.length).split(/[?#]/)[0]
  return /^https?:/i.test(url) ? url + (content?.[`${kind}_suffix`] || '') : url
}
export function thumbnailSources(photo, content) {
  const url = imageURL(photo, content, 'thumbnail')
  return url.startsWith('/thumbnails/640/')
    ? `${url} 1x, ${url.replace('/640/', '/1280/')} 2x`
    : undefined
}
export function focusPosition(photo) {
  return `${photo?.focus_x ?? 50}% ${photo?.focus_y ?? 50}%`
}
export function photoPath(post, photo = post.images[0]) {
  return `/post/${post.id}?photo=${photo.id}`
}
export function photoDate(value, format = 'YYYY-MM-DD HH:mm') {
  return value && dayjs(value).isValid() ? dayjs(value).format(format) : ''
}
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
export function fitImage(width, height, areaWidth, areaHeight) {
  const ratio = Math.min(areaWidth / (width || 1), areaHeight / (height || 1), 1)
  return { width: width * ratio, height: height * ratio }
}
export function boundedPan(x, y, scale, size, area) {
  const maxX = Math.max(0, (size.width * scale - area.width) / 2)
  const maxY = Math.max(0, (size.height * scale - area.height) / 2)
  return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) }
}
