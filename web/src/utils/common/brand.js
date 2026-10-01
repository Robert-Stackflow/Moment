// Refresh bundled artwork without changing custom icon URLs in existing databases.
export function versionedBrandIcon(url) {
  if (typeof url !== 'string') return url
  const path = url.split(/[?#]/)[0]
  return ['/assets/moment-mark.svg', '/assets/moment-mark.png', '/assets/favicon.svg'].includes(path)
    ? `${path}?v=photo-1`
    : url
}
