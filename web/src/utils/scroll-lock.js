export function lockPageScroll() {
  const body = document.body
  const overflow = body.style.overflow
  const padding = body.style.paddingRight
  // The root gutter also keeps fixed navigation in place. Only compensate
  // manually in browsers that cannot reserve that space themselves.
  const stable = getComputedStyle(document.documentElement).scrollbarGutter?.includes('stable')
  const gap = stable ? 0 : innerWidth - document.documentElement.clientWidth
  const inset = parseFloat(getComputedStyle(body).paddingRight) || 0
  body.style.overflow = 'hidden'
  if (gap > 0) body.style.paddingRight = inset + gap + 'px'
  return () => {
    body.style.overflow = overflow
    body.style.paddingRight = padding
  }
}
