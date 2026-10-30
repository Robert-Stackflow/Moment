import { imageURL, focusPosition } from './gallery'

export function createPhotoMarker(point, getProps, emit) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'explore-map-marker'
  button.setAttribute('aria-label', `${point.location || '此处'}，${point.count} 张照片`)
  button.setAttribute('aria-haspopup', 'dialog')
  if (point.image_url) {
    const image = document.createElement('img')
    image.alt = ''
    image.src = imageURL(point, getProps().content || {}, 'thumbnail', 320)
    image.style.objectPosition = focusPosition(point)
    image.addEventListener('error', () => {
      if (!image.dataset.fallback) {
        image.dataset.fallback = '1'
        image.src = point.image_url
      } else {
        image.remove()
        button.classList.add('without-thumbnail')
      }
    })
    button.append(image)
  } else button.classList.add('without-thumbnail')
  const count = document.createElement('span')
  count.className = 'map-marker-count'
  count.textContent = String(point.count)
  count.setAttribute('aria-hidden', 'true')
  button.append(count)
  const choose = (reason) =>
    emit('select', {
      bounds: [point.west, point.south, point.east, point.north].join(','),
      point,
      anchor: button,
      reason,
    })
  button.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && matchMedia('(hover: hover)').matches) choose('hover')
  })
  button.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') emit('leave', button)
  })
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) choose('focus')
  })
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    choose('activate')
  })
  return button
}
