import { createRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSettings } from '../state/settings'
import { useEvent } from './useEvent'
import { lockPageScroll } from '../lib/scroll-lock'
import { imageURL, photoPath, photoDate, clamp, fitImage, boundedPan } from '../lib/gallery'
const afterPaint = (callback) =>
  new Promise((resolve) =>
    requestAnimationFrame(() => {
      callback?.()
      resolve()
    }),
  )
export function useLightbox(input) {
  const { content } = useSettings()
  const latest = useRef(input)
  latest.current = {
    pathFor: photoPath,
    ...input,
  }
  const refs = useMemo(
    () =>
      Object.fromEntries(
        ['dialog', 'stage', 'frame', 'imageElement', 'thumbStrip'].map((name) => [
          name,
          createRef(),
        ]),
      ),
    [],
  )
  const [state, setState] = useState(() => ({
    loaded: false,
    failed: false,
    displayURL: '',
    ambientURL: '',
    natural: {
      width: 0,
      height: 0,
    },
    loadingShown: false,
    caption: null,
    area: {
      width: innerWidth - 32,
      height: innerHeight - 210,
    },
    scale: 1,
    pan: {
      x: 0,
      y: 0,
    },
    dragging: false,
    swipe: 0,
    showInfo: !matchMedia('(max-width: 736px)').matches,
    showThumbs: true,
    notice: '',
    shareURL: '',
  }))
  const live = useRef(state)
  const patch = (changes) => {
    live.current = {
      ...live.current,
      ...changes,
    }
    setState(live.current)
  }
  const runtime = useRef({
    generation: 0,
    pointers: new Map(),
    hadPinch: false,
    lastTouchAt: -Infinity,
  })
  const derived = {
    get photo() {
      return latest.current.post.images[latest.current.index]
    },
    get fit() {
      const { natural, area } = live.current
      return natural.width
        ? fitImage(natural.width, natural.height, area.width, area.height)
        : {
            width: Math.min(area.width, 560),
            height: Math.min(area.height, 480),
          }
    },
    get title() {
      return this.photo.title || latest.current.post.title
    },
    get description() {
      return this.photo.desc || latest.current.post.desc
    },
    get location() {
      return this.photo.location || latest.current.post.location
    },
    get date() {
      return photoDate(
        this.photo.time || latest.current.post.time,
        content.detail_time_format || 'YYYY-MM-DD HH:mm',
      )
    },
    get frameStyle() {
      return {
        width: this.fit.width + 'px',
        height: this.fit.height + 'px',
      }
    },
    get imageStyle() {
      const { pan, swipe, scale } = live.current
      return {
        ...this.frameStyle,
        transform: `translate(-50%,-50%) translate(${pan.x + swipe}px,${pan.y}px) scale(${scale})`,
      }
    },
  }
  const emit = (event, ...args) =>
    latest.current[
      {
        choose: 'onChoose',
        post: 'onPost',
        close: 'onClose',
      }[event]
    ]?.(...args)
  function resetZoom() {
    patch({
      scale: 1,
    })
    patch({
      pan: {
        x: 0,
        y: 0,
      },
    })
    patch({
      swipe: 0,
    })
  }
  function constrain(x, y, zoom = live.current.scale) {
    return boundedPan(x, y, zoom, derived.fit, live.current.area)
  }
  function centerPoint(clientX, clientY) {
    const rect = refs.stage.current.getBoundingClientRect()
    return {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    }
  }
  function zoomTo(
    value,
    anchor = {
      x: 0,
      y: 0,
    },
  ) {
    if (!live.current.loaded) return
    const next = clamp(value, 1, 4),
      ratio = next / live.current.scale
    patch({
      pan: constrain(
        anchor.x - (anchor.x - live.current.pan.x) * ratio,
        anchor.y - (anchor.y - live.current.pan.y) * ratio,
        next,
      ),
    })
    patch({
      scale: next,
    })
  }
  function toggleZoom(event) {
    if (!live.current.loaded) return
    zoomTo(
      live.current.scale > 1 ? 1 : 2,
      event?.clientX ? centerPoint(event.clientX, event.clientY) : undefined,
    )
  }
  function wheel(event) {
    if (!live.current.loaded) return
    zoomTo(
      live.current.scale * Math.exp(-event.deltaY * 0.002),
      centerPoint(event.clientX, event.clientY),
    )
  }
  function pointerDown(event) {
    if (event.button !== 0) return
    if (event.pointerType === 'touch') runtime.current.lastTouchAt = performance.now()
    refs.stage.current.setPointerCapture(event.pointerId)
    runtime.current.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    patch({
      dragging: true,
    })
    if (runtime.current.pointers.size === 1) {
      runtime.current.hadPinch = false
      runtime.current.start = {
        x: event.clientX,
        y: event.clientY,
        pan: {
          ...live.current.pan,
        },
        time: performance.now(),
      }
    } else if (runtime.current.pointers.size === 2) {
      runtime.current.hadPinch = true
      const [a, b] = [...runtime.current.pointers.values()]
      runtime.current.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale: live.current.scale,
        pan: {
          ...live.current.pan,
        },
        anchor: centerPoint((a.x + b.x) / 2, (a.y + b.y) / 2),
      }
      patch({
        swipe: 0,
      })
    }
  }
  function pointerMove(event) {
    if (!runtime.current.pointers.has(event.pointerId)) return
    runtime.current.pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    if (runtime.current.pointers.size === 2 && runtime.current.pinch && live.current.loaded) {
      const [a, b] = [...runtime.current.pointers.values()]
      const zoom = clamp(
        (runtime.current.pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
          Math.max(1, runtime.current.pinch.distance),
        1,
        4,
      )
      const mid = centerPoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      patch({
        pan: constrain(
          mid.x -
            ((runtime.current.pinch.anchor.x - runtime.current.pinch.pan.x) * zoom) /
              runtime.current.pinch.scale,
          mid.y -
            ((runtime.current.pinch.anchor.y - runtime.current.pinch.pan.y) * zoom) /
              runtime.current.pinch.scale,
          zoom,
        ),
      })
      patch({
        scale: zoom,
      })
    } else if (runtime.current.pointers.size === 1 && runtime.current.start) {
      if (live.current.scale > 1)
        patch({
          pan: constrain(
            runtime.current.start.pan.x + event.clientX - runtime.current.start.x,
            runtime.current.start.pan.y + event.clientY - runtime.current.start.y,
          ),
        })
      else if (!runtime.current.hadPinch)
        patch({
          swipe: clamp((event.clientX - runtime.current.start.x) * 0.35, -65, 65),
        })
    }
  }
  function pointerUp(event) {
    if (!runtime.current.pointers.has(event.pointerId)) return
    const dx = event.clientX - runtime.current.start.x,
      dy = event.clientY - runtime.current.start.y
    runtime.current.pointers.delete(event.pointerId)
    if (!runtime.current.pointers.size) {
      patch({
        dragging: false,
      })
      patch({
        swipe: 0,
      })
      if (event.type !== 'pointercancel' && !runtime.current.hadPinch) {
        if (live.current.scale === 1 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25)
          choose(latest.current.index + (dx < 0 ? 1 : -1))
        else if (
          event.pointerType === 'touch' &&
          Math.hypot(dx, dy) < 10 &&
          performance.now() - runtime.current.start.time < 260
        ) {
          if (
            runtime.current.lastTap &&
            performance.now() - runtime.current.lastTap.time < 300 &&
            Math.hypot(
              event.clientX - runtime.current.lastTap.x,
              event.clientY - runtime.current.lastTap.y,
            ) < 30
          ) {
            toggleZoom(event)
            runtime.current.lastTap = null
          } else
            runtime.current.lastTap = {
              time: performance.now(),
              x: event.clientX,
              y: event.clientY,
            }
        }
      }
    } else {
      const point = [...runtime.current.pointers.values()][0]
      runtime.current.start = {
        ...point,
        pan: {
          ...live.current.pan,
        },
        time: performance.now(),
      }
    }
  }
  function choose(index) {
    if (index < 0 || index >= latest.current.post.images.length || index === latest.current.index)
      return
    emit('choose', index)
  }
  function doubleClick(event) {
    // Touch browsers also synthesize dblclick after our pointer-based double tap.
    if (performance.now() - runtime.current.lastTouchAt > 500) toggleZoom(event)
  }
  async function finishMotion(element, token) {
    // Read the actual transitions, including interrupted/reversed ones and the
    // reduced-motion override, rather than guessing when a timer has finished.
    while (token === runtime.current.generation && element?.isConnected) {
      const animations = element
        .getAnimations()
        .filter((animation) => animation.playState !== 'finished' && animation.playState !== 'idle')
      if (!animations.length) return
      await Promise.all(animations.map((animation) => animation.finished.catch(() => {})))
    }
  }
  function load() {
    const token = ++runtime.current.generation
    if (runtime.current.pending) {
      runtime.current.pending.onload = null
      runtime.current.pending.onerror = null
    }
    // Prepare the image while the old one fades out. Keep the old rectangle
    // until its successor is decoded, then morph the empty frame before reveal.
    patch({
      loaded: false,
    })
    patch({
      failed: false,
    })
    clearTimeout(runtime.current.loadingTimer)
    patch({
      loadingShown: false,
    })
    runtime.current.loadingTimer = setTimeout(() => {
      patch({
        loadingShown: true,
      })
    }, 500)
    resetZoom()
    runtime.current.pointers.clear()
    runtime.current.start = null
    runtime.current.pinch = null
    runtime.current.lastTap = null
    patch({
      dragging: false,
    })
    const faded = afterPaint().then(() => finishMotion(refs.imageElement.current, token))
    const request = new window.Image()
    runtime.current.pending = request
    request.onload = async () => {
      try {
        await request.decode()
      } catch {
        /* Some formats can display even when decode() rejects. */
      }
      if (token !== runtime.current.generation) return
      clearTimeout(runtime.current.loadingTimer)
      patch({
        loadingShown: false,
      })
      await faded
      if (token !== runtime.current.generation) return
      patch({
        natural: {
          width: request.naturalWidth,
          height: request.naturalHeight,
        },
      })
      await afterPaint()
      await finishMotion(refs.frame.current, token)
      if (token !== runtime.current.generation) return
      patch({
        displayURL: request.src,
      })
      patch({
        caption: {
          title: derived.title,
          description: derived.description,
          location: derived.location,
          date: derived.date,
          metadata: derived.photo.metadata,
          categories: latest.current.post.categories,
        },
      })
      await afterPaint()
      // Keep the newly assigned DOM image hidden until it too is ready to paint.
      try {
        await refs.imageElement.current?.decode()
      } catch {
        /* The preload already succeeded. */
      }
      if (token !== runtime.current.generation) return
      if (refs.imageElement.current) getComputedStyle(refs.imageElement.current).opacity
      patch({
        ambientURL: imageURL(derived.photo, content, 'thumbnail'),
      })
      patch({
        loaded: true,
      })
      if (!navigator.connection?.saveData) {
        for (const index of [latest.current.index - 1, latest.current.index + 1]) {
          const adjacent = latest.current.post.images[index]
          if (adjacent) {
            const image = new window.Image()
            image.fetchPriority = 'low'
            image.src = imageURL(adjacent, content)
          }
        }
      }
    }
    request.onerror = () => {
      if (token === runtime.current.generation) {
        clearTimeout(runtime.current.loadingTimer)
        patch({
          failed: true,
        })
        patch({
          loadingShown: true,
        })
      }
    }
    request.src = imageURL(derived.photo, content)
  }
  function notify(message) {
    clearTimeout(runtime.current.notificationTimer)
    patch({
      notice: message,
    })
    runtime.current.notificationTimer = setTimeout(() => {
      patch({
        notice: '',
      })
    }, 2400)
  }
  async function share() {
    const url = new URL(
      latest.current.pathFor(latest.current.post, derived.photo),
      window.location.origin,
    ).href
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({
          title: latest.current.post.title,
          url,
        })
        return
      } catch (error) {
        if (error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      notify('已复制当前照片的链接')
    } catch {
      patch({
        shareURL: url,
      })
      await afterPaint()
      refs.dialog.current.querySelector('.viewer-share-input')?.select()
    }
  }
  function keydown(event) {
    if (event.key === 'Tab') {
      const controls = [
        ...refs.dialog.current.querySelectorAll('button:not(:disabled),a[href],input'),
      ].filter((node) => node.getClientRects().length)
      const first = controls[0],
        last = controls[controls.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === refs.dialog.current)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
      return
    }
    if (event.target.matches('input,textarea')) {
      if (event.key === 'Escape')
        patch({
          shareURL: '',
        })
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      live.current.scale > 1 ? resetZoom() : emit('close')
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      if (live.current.scale > 1)
        patch({
          pan: constrain(
            live.current.pan.x + (event.key === 'ArrowLeft' ? 80 : -80),
            live.current.pan.y,
          ),
        })
      else choose(latest.current.index + (event.key === 'ArrowRight' ? 1 : -1))
    }
    if (live.current.scale > 1 && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      patch({
        pan: constrain(
          live.current.pan.x,
          live.current.pan.y + (event.key === 'ArrowUp' ? 80 : -80),
        ),
      })
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      zoomTo(live.current.scale + 0.5)
    }
    if (event.key === '-') {
      event.preventDefault()
      zoomTo(live.current.scale - 0.5)
    }
    if (event.key === '0') resetZoom()
    if (event.key === 'Home') {
      event.preventDefault()
      choose(0)
    }
    if (event.key === 'End') {
      event.preventDefault()
      choose(latest.current.post.images.length - 1)
    }
  }
  const onKeydown = useEvent(keydown)
  const onResize = useEvent(() => {
    patch({
      area: {
        width: refs.stage.current.clientWidth,
        height: refs.stage.current.clientHeight,
      },
    })
    patch({
      pan: constrain(live.current.pan.x, live.current.pan.y),
    })
  })
  useLayoutEffect(() => {
    const focused = document.activeElement,
      app = document.getElementById('app'),
      inert = app.inert
    app.inert = true
    const release = lockPageScroll()
    document.body.classList.add('viewer-open')
    refs.dialog.current.focus({
      preventScroll: true,
    })
    const observer = new ResizeObserver(onResize)
    observer.observe(refs.stage.current)
    const wheelListener = (event) => {
      if (event.target.closest('.viewer-caption,.viewer-loading')) return
      event.preventDefault()
      wheel(event)
    }
    const stage = refs.stage.current
    stage.addEventListener('wheel', wheelListener, {
      passive: false,
    })
    document.addEventListener('keydown', onKeydown)
    return () => {
      runtime.current.generation++
      if (runtime.current.pending) {
        runtime.current.pending.onload = null
        runtime.current.pending.onerror = null
      }
      observer.disconnect()
      clearTimeout(runtime.current.notificationTimer)
      clearTimeout(runtime.current.loadingTimer)
      stage.removeEventListener('wheel', wheelListener)
      document.removeEventListener('keydown', onKeydown)
      release()
      document.body.classList.remove('viewer-open')
      app.inert = inert
      if (focused?.isConnected)
        focused.focus({
          preventScroll: true,
        })
    }
  }, [])
  useEffect(() => {
    patch({
      shareURL: '',
      notice: '',
    })
    load()
    afterPaint(() => {
      const strip = refs.thumbStrip.current,
        item = strip?.querySelector('[aria-current="true"]')
      if (item)
        strip.scrollTo({
          left: item.offsetLeft - strip.clientWidth / 2 + item.clientWidth / 2,
          behavior: 'auto',
        })
    })
  }, [input.post.id, derived.photo.id, derived.photo.image_url])
  return {
    ...state,
    ...derived,
    refs,
    patch,
    choose,
    load,
    share,
    resetZoom,
    toggleZoom,
    pointerDown,
    pointerMove,
    pointerUp,
    doubleClick,
  }
}
