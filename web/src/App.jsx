import { Component, lazy, Suspense, useLayoutEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { useSettings } from './state/settings'
const GalleryShell = lazy(() => import('./pages/GalleryShell'))
const GalleryWall = lazy(() => import('./pages/GalleryWall'))
const Explore = lazy(() => import('./pages/Explore'))
const ShareAlbum = lazy(() => import('./pages/ShareAlbum'))

function NotFound() {
  return (
    <main style={{ padding: '80px 24px', textAlign: 'center' }}>
      <h1>找不到这个页面</h1>
      <p>
        <Link to="/">返回相册</Link>
      </p>
    </main>
  )
}
function AdminRedirect() {
  const route = useLocation()
  useLayoutEffect(() => {
    window.location.assign(route.pathname + route.search + route.hash)
  }, [])
  return null
}
class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <>
        <p>相册暂时无法加载，请稍后重试。</p>
        <button onClick={() => window.location.reload()}>重新加载</button>
      </>
    ) : (
      this.props.children
    )
  }
}
export default function App() {
  const route = useLocation(),
    navigation = useNavigationType(),
    previous = useRef(route),
    positions = useRef(new Map()),
    { meta } = useSettings()
  useLayoutEffect(() => {
    document.title = meta.site_name || import.meta.env.VITE_TITLE
    const from = previous.current
    if (
      route.pathname !== from.pathname &&
      !route.pathname.startsWith('/post/') &&
      !from.pathname.startsWith('/post/')
    ) {
      const position = navigation === 'POP' ? positions.current.get(route.key) : null
      window.scrollTo(position?.x || 0, position?.y || 0)
    }
    previous.current = route
    return () => {
      positions.current.set(route.key, { x: scrollX, y: scrollY })
    }
  }, [route.pathname, route.search])
  const postPath = route.pathname.match(/^\/post\/([^/]+)\/?$/)
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {postPath && !/^\d+$/.test(postPath[1]) ? (
          <NotFound />
        ) : (
          <Routes>
            <Route element={<GalleryShell />}>
              <Route index element={<GalleryWall />} />
              <Route path="category/:category" element={<GalleryWall />} />
              <Route path="location/:location" element={<GalleryWall />} />
              <Route path="post/:post" element={<GalleryWall />} />
              <Route path="map" element={<Explore key="map" mode="map" />} />
              <Route path="timeline" element={<Explore key="timeline" mode="timeline" />} />
            </Route>
            <Route path="share/:token" element={<ShareAlbum />} />
            <Route path="admin/*" element={<AdminRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
