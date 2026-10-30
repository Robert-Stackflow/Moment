import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEvent } from '../hooks/useEvent'
import PhotoCard from '../components/gallery/PhotoCard'
import GalleryLightbox from '../components/gallery/GalleryLightbox'
import GalleryButton from '../components/gallery/GalleryButton'
import GalleryIcon from '../components/gallery/GalleryIcon'
import Presence from '../components/gallery/Presence'
import '../styles/gallery/share.css'

export default function ShareAlbum() {
  const { token } = useParams(),
    route = useLocation(),
    navigate = useNavigate(),
    base = '/share/' + token
  const [album, setAlbum] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [password, setPassword] = useState(''),
    [visiblePassword, setVisiblePassword] = useState(false),
    [error, setError] = useState(''),
    [unavailable, setUnavailable] = useState(false)
  const runtime = useRef({
    generation: 0,
    checking: false,
    busy: false,
    disposed: false,
    album: null,
  })
  const posts = album?.posts || [],
    query = new URLSearchParams(route.search),
    selected = posts.find((post) => String(post.id) === query.get('post')),
    postIndex = posts.indexOf(selected)
  const photoIndex = Math.max(
    0,
    selected?.images.findIndex((photo) => String(photo.id) === query.get('photo')) ?? 0,
  )
  const expiry = album?.expires_at
    ? new Date(album.expires_at * 1000).toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour12: false,
      })
    : ''
  const request = useEvent(async (path = '', options = {}) => {
    const response = await fetch('/api/shares/' + token + path, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
      }),
      result = await response.json()
    if (!response.ok)
      throw Object.assign(new Error(result.msg || '相册暂时无法打开'), { status: response.status })
    return result.data
  })
  const forget = useEvent(() => {
    runtime.current.album = null
    setAlbum(null)
    setPassword('')
    clearTimeout(runtime.current.deadline)
    document.title = '分享相册 · Moment'
  })
  const expire = useEvent(() => {
    forget()
    setUnavailable(true)
    setError('分享链接不存在或已失效')
  })
  const scheduleExpiry = useEvent((data) => {
    clearTimeout(runtime.current.deadline)
    if (!data?.expires_at) return
    const remaining = data.expires_at * 1000 - Date.now()
    if (remaining <= 0) expire()
    else
      runtime.current.deadline = setTimeout(
        () => scheduleExpiry(runtime.current.album),
        Math.min(remaining + 50, 2147483647),
      )
  })
  const load = useEvent(async (silent = false) => {
    const state = runtime.current
    if (state.checking || state.disposed) return
    state.checking = true
    const generation = state.generation
    if (!silent) {
      setLoading(true)
      setError('')
    }
    try {
      const data = await request()
      if (state.disposed || generation !== state.generation) return
      state.album = data
      setAlbum(data)
      setUnavailable(false)
      setError('')
      document.title = data.locked ? '解锁分享相册 · Moment' : data.title + ' · Moment'
      scheduleExpiry(data)
    } catch (reason) {
      if (generation === state.generation && !state.disposed) {
        forget()
        setUnavailable(reason.status === 404)
        setError(reason.message || '连接失败，请重试')
      }
    } finally {
      if (generation === state.generation) {
        state.checking = false
        if (!state.disposed) setLoading(false)
      }
    }
  })
  async function unlock(event) {
    event.preventDefault()
    if (runtime.current.busy) return
    runtime.current.busy = true
    setBusy(true)
    setError('')
    try {
      await request('/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      setPassword('')
      await load()
    } catch (reason) {
      setError(reason.message)
      if (reason.status === 404) expire()
    } finally {
      runtime.current.busy = false
      setBusy(false)
    }
  }
  async function lock() {
    if (runtime.current.busy) return
    runtime.current.busy = true
    setBusy(true)
    try {
      await request('/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      forget()
      await load()
    } catch (reason) {
      setError(reason.message)
    } finally {
      runtime.current.busy = false
      setBusy(false)
    }
  }
  const revalidate = useEvent(() => {
    if (
      document.visibilityState === 'visible' &&
      runtime.current.album &&
      !runtime.current.album.locked
    )
      void load(true)
  })
  useEffect(() => {
    runtime.current.disposed = false
    document.body.classList.add('shared-gallery')
    const interval = setInterval(revalidate, 30000)
    document.addEventListener('visibilitychange', revalidate)
    window.addEventListener('focus', revalidate)
    return () => {
      runtime.current.disposed = true
      runtime.current.generation++
      clearInterval(interval)
      clearTimeout(runtime.current.deadline)
      document.body.classList.remove('shared-gallery')
      document.removeEventListener('visibilitychange', revalidate)
      window.removeEventListener('focus', revalidate)
    }
  }, [])
  useEffect(() => {
    runtime.current.generation++
    runtime.current.checking = false
    forget()
    setUnavailable(false)
    void load()
  }, [token])
  function pathFor(post, photo = post.images[0]) {
    return `${base}?post=${post.id}&photo=${photo.id}`
  }
  return (
    <div className="shared-page">
      {!album || album.locked ? (
        <main id="blog-main" className="shared-gate">
          {album?.locked && !unavailable ? (
            <form className="shared-gate-card" onSubmit={unlock}>
              <span className="shared-lock-mark">
                <GalleryIcon name="lock" />
              </span>
              <h1>为你分享的相册</h1>
              <p>输入密码，查看这一组照片。</p>
              <label htmlFor="album-password">访问密码</label>
              <div className="shared-password">
                <input
                  id="album-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={visiblePassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={visiblePassword ? '隐藏密码' : '显示密码'}
                  aria-pressed={visiblePassword}
                  onClick={() => setVisiblePassword((value) => !value)}
                >
                  {visiblePassword ? '隐藏' : '显示'}
                </button>
              </div>
              {error && (
                <p className="shared-error" role="alert">
                  {error}
                </p>
              )}
              <button className="shared-primary" type="submit" disabled={busy}>
                {busy ? '正在解锁…' : '打开相册'}
              </button>
            </form>
          ) : (
            <div className="shared-gate-card" role="status">
              <span className="shared-lock-mark">
                <GalleryIcon name={unavailable ? 'lock' : 'grid'} />
              </span>
              <h1>{loading ? '正在打开相册' : unavailable ? '分享已失效' : '暂时无法连接'}</h1>
              <p>{loading ? '请稍候…' : error || '相册已到期、已撤销，或链接不正确。'}</p>
              {!loading && (
                <button className="shared-primary" onClick={() => void load()}>
                  重新检查
                </button>
              )}
            </div>
          )}
        </main>
      ) : (
        <>
          <section className="shared-heading">
            <div>
              <h1>{album.title}</h1>
              {album.description && <p>{album.description}</p>}
            </div>
            <span>{`${posts.length} 篇帖子`}</span>
          </section>
          <main id="blog-main" className="shared-wall">
            {posts.map((post, index) => (
              <PhotoCard
                key={post.id}
                data={post}
                index={index}
                pathFor={pathFor}
                contained
                onOpen={(value) => navigate(pathFor(value))}
              />
            ))}
            {!posts.length && <p className="shared-empty">相册中暂时没有可展示的照片。</p>}
          </main>
          <nav className="shared-navigation" aria-label="分享相册导航">
            <div>
              <span>{album.title}</span>
              <small>{expiry ? `有效期至 ${expiry}（北京时间）` : '分享相册'}</small>
            </div>
            {album.password_required && (
              <GalleryButton icon="lock" label="锁定相册" disabled={busy} onClick={lock} />
            )}
          </nav>
          {error && (
            <p role="alert" className="shared-error">
              {error}
            </p>
          )}
        </>
      )}
      {createPortal(
        <Presence show={!!selected} name="viewer-fade">
          {selected && (
            <GalleryLightbox
              post={selected}
              index={photoIndex}
              previous={posts[postIndex - 1]}
              following={posts[postIndex + 1]}
              pathFor={pathFor}
              contained
              onChoose={(index) =>
                navigate(pathFor(selected, selected.images[index]), { replace: true })
              }
              onPost={(post) => navigate(pathFor(post), { replace: true })}
              onClose={() => navigate(base, { replace: true })}
            />
          )}
        </Presence>,
        document.body,
      )}
    </div>
  )
}
