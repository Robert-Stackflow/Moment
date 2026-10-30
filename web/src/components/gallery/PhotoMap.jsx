import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { createPhotoMap } from '../../lib/map-controller'
import GalleryButton from './GalleryButton'
import '../../styles/gallery/map.css'

export default function PhotoMap({ year, initial, onBounds, onSelect, ref }) {
  const host = useRef(null),
    consentCard = useRef(null),
    controller = useRef(null),
    latest = useRef(null),
    previousYear = useRef(year)
  latest.current = { year, initial, onBounds, onSelect }
  const [state, setState] = useState({
    busy: false,
    consent: false,
    detailed: false,
    error: '',
    tileError: false,
    provider: 'local',
  })
  const update = (patch) => setState((value) => ({ ...value, ...patch }))
  useImperativeHandle(ref, () => ({ reset: () => controller.current?.reset() }), [])
  useEffect(() => {
    let disposed = false,
      map
    const request = new AbortController()
    async function initialize() {
      let config
      try {
        const response = await fetch('/api/v1/visitor/maps/config', { signal: request.signal })
        if (response.ok) config = (await response.json()).data
      } catch {
        /* An unconfigured host retains the existing local outline map. */
      }
      if (disposed) return
      const factory =
        config?.provider === 'amap'
          ? (await import('../../lib/amap-controller')).createAMap
          : createPhotoMap
      if (disposed) return
      update({ provider: config?.provider === 'amap' ? 'amap' : 'local' })
      map = factory(
        host.current,
        () => latest.current,
        (event, value) => latest.current[event === 'bounds' ? 'onBounds' : 'onSelect'](value),
        update,
        config,
      )
      controller.current = map
      void map.mount()
    }
    void initialize()
    return () => {
      disposed = true
      request.abort()
      controller.current = null
      map?.dispose()
    }
  }, [])
  useEffect(() => {
    if (previousYear.current !== year) {
      previousYear.current = year
      controller.current?.changed()
    }
  }, [year])
  useEffect(() => {
    if (state.consent) consentCard.current?.focus()
  }, [state.consent])
  return (
    <div
      className="explore-map-wrap"
      data-provider={state.provider}
      data-hide-attribution={import.meta.env.VITE_AMAP_HIDE_ATTRIBUTION === 'true' || undefined}
      aria-busy={state.busy}
    >
      <div
        ref={host}
        className="photo-map-canvas"
        aria-label="照片地图，可用方向键移动，加减键缩放"
      />
      <div className="explore-map-tools">
        <GalleryButton icon="zoom" label="放大地图" onClick={() => controller.current?.zoomIn()} />
        <GalleryButton
          icon="reset"
          label="缩小地图"
          onClick={() => controller.current?.zoomOut()}
        />
        <GalleryButton
          icon="expand"
          label="查看全部位置"
          onClick={() => controller.current?.reset()}
        />
        {state.provider === 'local' && (
          <GalleryButton
            icon="map"
            label={state.detailed ? '仅使用本地轮廓' : '加载详细地图'}
            pressed={state.detailed}
            onClick={() => controller.current?.toggleDetailed()}
          />
        )}
      </div>
      {state.busy && (
        <div className="map-loading" role="status">
          正在加载位置…
        </div>
      )}
      {(state.error || state.tileError) && (
        <div className="map-message" role="status">
          {state.error || '详细地图暂时无法加载，可切回本地轮廓。'}
          {state.error && <button onClick={() => controller.current?.load()}>重试</button>}
        </div>
      )}
      {state.consent && (
        <div
          ref={consentCard}
          className="map-consent"
          role="dialog"
          tabIndex={-1}
          aria-label="加载详细地图"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              update({ consent: false })
            }
          }}
        >
          <strong>查看街道与地名</strong>
          <p>将向 OpenStreetMap 发送当前地图区域和网络地址。坐标不会用于搜索或地理编码。</p>
          <div>
            <button onClick={() => update({ consent: false })}>暂不加载</button>
            <button onClick={() => controller.current?.accept()}>加载详细地图</button>
          </div>
        </div>
      )}
    </div>
  )
}
