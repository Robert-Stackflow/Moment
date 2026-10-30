import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useSettings } from '../state/settings'
import { useEvent } from '../hooks/useEvent'
import api from '../lib/api'
import { photoPath } from '../lib/gallery'
import PhotoCard from '../components/gallery/PhotoCard'
import GalleryLightbox from '../components/gallery/GalleryLightbox'
import Presence from '../components/gallery/Presence'
import '../styles/gallery/wall.css'

export default function GalleryWall() {
  const route = useLocation(),
    params = useParams(),
    navigate = useNavigate(),
    { meta, content } = useSettings()
  const [blogs, setBlogs] = useState([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState(false)
  const [selected, setSelected] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(''),
    [photoIndex, setPhotoIndex] = useState(0)
  const sentinel = useRef(null),
    request = useRef({
      page: 0,
      busy: false,
      generation: 0,
      detailGeneration: 0,
      disposed: false,
      filters: {},
      wall:
        typeof route.state?.galleryReturn === 'string' &&
        /^\/(category\/|location\/|$)/.test(route.state.galleryReturn)
          ? route.state.galleryReturn
          : '/',
    })
  const more = blogs.length < total,
    postIndex = blogs.findIndex((post) => post.id === selected?.id)
  const baseTitle = meta.site_name || import.meta.env.VITE_TITLE
  const loadMore = useEvent(async () => {
    const state = request.current
    if (state.busy || (state.page && !more) || state.disposed) return
    const token = state.generation
    state.busy = true
    setLoading(true)
    setLoadError(false)
    let succeeded = false,
      remaining = false
    try {
      const result = await api.getBlogsVisitor({
        page: state.page + 1,
        page_size: Math.min(100, Math.max(1, Number(content.page_size || 20))),
        ...state.filters,
      })
      if (token !== state.generation || state.disposed) return
      setBlogs((previous) => [...previous, ...result.data])
      setTotal(result.total)
      state.page++
      state.count = (state.count || 0) + result.data.length
      remaining = state.count < result.total
      succeeded = true
    } catch {
      if (token === state.generation && !state.disposed) setLoadError(true)
    } finally {
      if (token === state.generation && !state.disposed) {
        state.busy = false
        setLoading(false)
        requestAnimationFrame(() => {
          if (
            succeeded &&
            remaining &&
            !state.disposed &&
            !/^\/post\//.test(window.location.pathname) &&
            sentinel.current?.getBoundingClientRect().top < innerHeight + 500
          )
            void loadMore()
        })
      }
    }
  })
  const resetWall = useEvent((path) => {
    const state = request.current
    state.generation++
    state.page = 0
    state.count = 0
    state.busy = false
    state.wall = path
    const match = path.match(/^\/(category|location)\/(.+)/)
    state.filters = match ? { [match[1]]: decodeURIComponent(match[2]) } : {}
    setTotal(0)
    setBlogs([])
    setLoading(false)
    void loadMore()
  })
  const resolveDetail = useEvent(async () => {
    const state = request.current,
      token = ++state.detailGeneration
    if (!params.post) {
      setSelected(null)
      setDetailLoading(false)
      setDetailError('')
      document.title = params.location ? params.location + ' · ' + baseTitle : baseTitle
      if (params.category)
        api
          .getCategoryByAliasVisitor({ alias: params.category })
          .then((result) => {
            if (!state.disposed && token === state.detailGeneration)
              document.title = result.data.name + ' · ' + baseTitle
          })
          .catch(() => {})
      if (state.wall !== route.pathname || (!state.page && !state.busy)) resetWall(route.pathname)
      return
    }
    setDetailError('')
    const id = Number(params.post)
    let post = selected?.id === id ? selected : blogs.find((item) => item.id === id)
    if (!post) {
      setSelected(null)
      setDetailLoading(true)
      try {
        post = (await api.getBlogVisitor(id)).data
      } catch {
        if (token === state.detailGeneration)
          setDetailError('这篇帖子不存在、未公开，或暂时无法加载。')
      }
    }
    if (token !== state.detailGeneration || state.disposed) return
    setDetailLoading(false)
    if (post) {
      setSelected(post)
      setPhotoIndex(
        Math.max(
          0,
          post.images.findIndex(
            (photo) => String(photo.id) === new URLSearchParams(route.search).get('photo'),
          ),
        ),
      )
      document.title = post.title + ' · ' + baseTitle
      if (blogs.findIndex((item) => item.id === id) === blogs.length - 1 && more) void loadMore()
    }
  })
  useEffect(() => {
    request.current.disposed = false
    resetWall(request.current.wall)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !request.current.disposed) void loadVisible()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel.current)
    return () => {
      request.current.disposed = true
      request.current.generation++
      request.current.detailGeneration++
      observer.disconnect()
    }
  }, [])
  const loadVisible = useEvent(() => {
    if (!loadError && !selected) void loadMore()
  })
  useEffect(() => {
    void resolveDetail()
  }, [route.pathname, route.search])
  const close = () =>
    route.state?.galleryOverlay ? navigate(-1) : navigate(request.current.wall, { replace: true })
  const choosePhoto = (index) => {
    if (selected && index >= 0 && index < selected.images.length)
      navigate(photoPath(selected, selected.images[index]), { replace: true, state: route.state })
  }
  return (
    <>
      <main id="blog-main" aria-busy={loading}>
        {blogs.map((blog, index) => (
          <PhotoCard
            key={blog.id}
            data={blog}
            index={index}
            onOpen={(post) =>
              navigate(photoPath(post), {
                state: { galleryOverlay: true, galleryReturn: request.current.wall },
              })
            }
          />
        ))}
        {loading &&
          !blogs.length &&
          Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="thumb gallery-skeleton" aria-hidden="true" />
          ))}
        {!loading && !loadError && !blogs.length && (
          <div className="gallery-status">
            这里还没有公开的照片。{route.pathname !== '/' && <Link to="/">查看全部</Link>}
          </div>
        )}
        {loadError && (
          <div className="gallery-status" role="alert">
            相册暂时无法加载。<button onClick={loadMore}>重试</button>
          </div>
        )}
      </main>
      <div ref={sentinel} className="gallery-sentinel">
        {loading ? (
          <span role="status">正在加载照片…</span>
        ) : more && !loadError ? (
          <button onClick={loadMore}>加载更多</button>
        ) : null}
      </div>
      {createPortal(
        <Presence show={!!selected || detailLoading || !!detailError} name="viewer-fade">
          {selected ? (
            <GalleryLightbox
              post={selected}
              index={photoIndex}
              previous={blogs[postIndex - 1]}
              following={postIndex >= 0 ? blogs[postIndex + 1] : null}
              onChoose={choosePhoto}
              onPost={(post) =>
                post && navigate(photoPath(post), { replace: true, state: route.state })
              }
              onClose={close}
            />
          ) : (
            <div className="gallery-detail-status" role="status">
              <p>{detailLoading ? '正在打开照片…' : detailError}</p>
              {detailError && <button onClick={resolveDetail}>重试</button>}
              <button onClick={close}>返回照片墙</button>
            </div>
          )}
        </Presence>,
        document.body,
      )}
    </>
  )
}
