import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSettings } from '../state/settings'
import { useEvent } from '../hooks/useEvent'
import api, { exploreRequest } from '../lib/api'
import { imageURL, focusPosition } from '../lib/gallery'
import GalleryLightbox from '../components/gallery/GalleryLightbox'
import Presence from '../components/gallery/Presence'
import ExploreYears from '../components/gallery/ExploreYears'
import '../styles/gallery/explore.css'
const PhotoMap = lazy(() => import('../components/gallery/PhotoMap'))

export default function Explore({ mode }) {
  const route = useLocation(),
    navigate = useNavigate(),
    { content } = useSettings(),
    map = useRef(null)
  const query = new URLSearchParams(route.search),
    year = query.get('year') || '',
    enabled = content[mode + '_enabled'] !== false
  const [photos, setPhotos] = useState([]),
    [years, setYears] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState('')
  const request = useRef({
    page: 0,
    generation: 0,
    detailGeneration: 0,
    busy: false,
    disposed: false,
    bounds: '',
  })
  const updateQuery = useEvent((changes, replace = true, state = route.state) => {
    const next = new URLSearchParams(route.search)
    for (const [key, value] of Object.entries(changes))
      value == null || value === '' ? next.delete(key) : next.set(key, String(value))
    navigate(route.pathname + (next.size ? '?' + next : ''), { replace, state })
  })
  const load = useEvent(async (reset = false) => {
    if (!enabled) return
    const state = request.current
    if (reset) {
      state.controller?.abort()
      state.generation++
      state.page = 0
      state.busy = false
      setPhotos([])
      setTotal(0)
    }
    if (state.busy) return
    const token = state.generation,
      controller = new AbortController()
    state.controller = controller
    state.busy = true
    setLoading(true)
    setError('')
    try {
      const data = await exploreRequest(
        'photos',
        { view: mode, year, bounds: state.bounds, page: state.page + 1, page_size: 48 },
        controller.signal,
      )
      if (state.disposed || token !== state.generation) return
      setPhotos((previous) => [...previous, ...data.photos])
      setTotal(data.total)
      state.page++
    } catch (reason) {
      if (reason.name !== 'AbortError' && token === state.generation && !state.disposed)
        setError(reason.message)
    } finally {
      if (token === state.generation && !state.disposed) {
        state.busy = false
        setLoading(false)
      }
    }
  })
  const loadYears = useEvent(async () => {
    try {
      const result = await exploreRequest('years', { view: mode })
      if (!request.current.disposed) setYears(result)
    } catch {
      if (!request.current.disposed) setError('年份暂时无法加载，请重试')
    }
  })
  const detail = useEvent(async () => {
    const state = request.current,
      token = ++state.detailGeneration,
      id = new URLSearchParams(route.search).get('post')
    setDetailError('')
    if (!id) {
      setSelected(null)
      setDetailLoading(false)
      return
    }
    if (selected?.id === Number(id)) return
    setSelected(null)
    setDetailLoading(true)
    try {
      const result = await api.getBlogVisitor(id)
      if (!state.disposed && token === state.detailGeneration) setSelected(result.data)
    } catch {
      if (token === state.detailGeneration && !state.disposed)
        setDetailError('照片暂时无法打开，可能已隐藏或删除。')
    } finally {
      if (token === state.detailGeneration && !state.disposed) setDetailLoading(false)
    }
  })
  useEffect(() => {
    request.current.disposed = false
    if (enabled) {
      void loadYears()
      if (mode === 'timeline') void load(true)
    }
    return () => {
      request.current.disposed = true
      request.current.generation++
      request.current.detailGeneration++
      request.current.controller?.abort()
    }
  }, [])
  const previousYear = useRef(year)
  useEffect(() => {
    if (previousYear.current !== year) {
      previousYear.current = year
      if (mode === 'timeline') void load(true)
    }
  }, [year])
  useEffect(() => {
    void detail()
  }, [query.get('post'), query.get('photo')])
  function pathFor(post, photo = post.images[0]) {
    const next = new URLSearchParams(route.search)
    next.set('post', String(post.id))
    next.set('photo', String(photo.id))
    return route.pathname + '?' + next
  }
  const close = () =>
    route.state?.discoveryOverlay ? navigate(-1) : updateQuery({ post: null, photo: null })
  const index = Math.max(
    0,
    selected?.images.findIndex((photo) => String(photo.id) === query.get('photo')) ?? 0,
  )
  const position = photos.findIndex((photo) => String(photo.photo_id) === query.get('photo'))
  const postStub = (photo) =>
    photo ? { id: photo.post_id, title: photo.title, images: [{ id: photo.photo_id }] } : null
  const previous = postStub(
      photos
        .slice(0, position)
        .reverse()
        .find((photo) => photo.post_id !== selected?.id),
    ),
    following = postStub(photos.slice(position + 1).find((photo) => photo.post_id !== selected?.id))
  const groups = []
  for (const photo of photos) {
    const label =
      mode === 'map'
        ? '当前区域'
        : photo.time
          ? photo.time.slice(0, 7).replace('-', ' 年 ') + ' 月'
          : '日期未记录'
    if (groups.at(-1)?.label !== label) groups.push({ label, photos: [] })
    groups.at(-1).photos.push(photo)
  }
  return (
    <>
      <main id="blog-main" className={'explore-page explore-' + mode}>
        <div className="explore-heading">
          <div>
            <h1>{mode === 'map' ? '地图' : '拍摄时间线'}</h1>
            <span>
              {mode === 'map'
                ? years
                    .filter((item) => !year || item.year === year)
                    .reduce((sum, item) => sum + item.count, 0)
                : total}{' '}
              张照片
            </span>
          </div>
        </div>
        {!enabled ? (
          <div className="explore-status">
            此浏览入口已关闭。<Link to="/">返回照片墙</Link>
          </div>
        ) : (
          <>
            <ExploreYears
              year={year}
              years={years}
              onChange={(value) => updateQuery({ year: value, post: null, photo: null })}
            />
            <div className="explore-content">
              {mode === 'map' && (
                <Suspense fallback={null}>
                  <PhotoMap
                    ref={map}
                    year={year}
                    initial={Object.fromEntries(query)}
                    onBounds={(area) => {
                      request.current.bounds = area.bounds
                      updateQuery({ lat: area.lat, lng: area.lng, z: area.z })
                    }}
                    onSelect={(bounds) => {
                      request.current.bounds = bounds
                      void load(true)
                    }}
                    preview={{
                      photos,
                      total,
                      loading,
                      error,
                      content,
                      onMore: () => void load(),
                      href: (photo) => pathFor(postStub(photo)),
                      onPhoto: (photo) =>
                        updateQuery({ post: photo.post_id, photo: photo.photo_id }, false, {
                          discoveryOverlay: true,
                        }),
                    }}
                  />
                </Suspense>
              )}
              {mode === 'timeline' && (
                <div className="explore-feed" aria-busy={loading}>
                  {groups.map((group) => (
                    <section key={group.label} className="explore-group">
                      <h2>{group.label}</h2>
                      <div className="explore-photos">
                        {group.photos.map((photo) => (
                          <a
                            key={photo.photo_id}
                            href={pathFor(postStub(photo))}
                            className="explore-photo"
                            onClick={(event) => {
                              if (
                                !event.metaKey &&
                                !event.ctrlKey &&
                                !event.shiftKey &&
                                !event.altKey &&
                                event.button === 0
                              ) {
                                event.preventDefault()
                                updateQuery({ post: photo.post_id, photo: photo.photo_id }, false, {
                                  discoveryOverlay: true,
                                })
                              }
                            }}
                          >
                            <img
                              src={imageURL(photo, content, 'thumbnail', 640)}
                              style={{ objectPosition: focusPosition(photo) }}
                              alt=""
                              loading="lazy"
                              onError={(event) => {
                                const image = event.currentTarget
                                if (!image.dataset.fallback) {
                                  image.dataset.fallback = '1'
                                  image.src = photo.image_url
                                } else image.classList.add('failed')
                              }}
                            />
                            <div>
                              <strong>{photo.title}</strong>
                              {content.thumbnail_show_location !== false && (
                                <span>{photo.location}</span>
                              )}
                              {photo.time && content.thumbnail_show_time !== false && (
                                <time dateTime={photo.time.replace(' ', 'T')}>
                                  {photo.time.slice(0, 10)}
                                </time>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  ))}
                  {!photos.length && !loading && !error && (
                    <div className="explore-status">
                      {mode === 'map'
                        ? '这里还没有公开位置的照片。试试其他区域或年份。'
                        : '这个年份还没有照片。'}
                      {mode === 'map' && (
                        <button onClick={() => map.current?.reset()}>查看全部位置</button>
                      )}
                    </div>
                  )}
                  {error && (
                    <div className="explore-status" role="alert">
                      {error}
                      <button
                        onClick={() => {
                          void load(true)
                          void loadYears()
                        }}
                      >
                        重试
                      </button>
                    </div>
                  )}
                  <div className="explore-more">
                    {loading ? (
                      <span role="status">正在加载照片…</span>
                    ) : (
                      photos.length < total &&
                      !error && <button onClick={() => void load()}>加载更多</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      {createPortal(
        <Presence show={!!selected || detailLoading || !!detailError} name="viewer-fade">
          {selected ? (
            <GalleryLightbox
              post={selected}
              index={index}
              previous={previous}
              following={following}
              pathFor={pathFor}
              onChoose={(i) => {
                if (selected.images[i])
                  navigate(pathFor(selected, selected.images[i]), {
                    replace: true,
                    state: route.state,
                  })
              }}
              onPost={(post) =>
                post && navigate(pathFor(post), { replace: true, state: route.state })
              }
              onClose={close}
            />
          ) : (
            <div className="explore-detail-status" role="status">
              <p>{detailError || '正在打开照片…'}</p>
              {detailError && <button onClick={detail}>重试</button>}
              <button onClick={close}>返回浏览</button>
            </div>
          )}
        </Presence>,
        document.body,
      )}
    </>
  )
}
