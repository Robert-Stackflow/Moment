import { useLayoutEffect, useRef, useState } from 'react'

// Retain the existing enter/leave classes and exit timing without layout wrappers.
export default function Presence({ show, name, children }) {
  const [present, setPresent] = useState(show)
  const container = useRef(null),
    retained = useRef(children)
  if (show) retained.current = children
  useLayoutEffect(() => {
    if (show) setPresent(true)
  }, [show])
  useLayoutEffect(() => {
    if (!present) return
    const element = container.current?.firstElementChild
    if (!element) return
    const phase = show ? 'enter' : 'leave'
    const classes = [`${name}-${phase}-active`, `${name}-${phase}-from`, `${name}-${phase}-to`]
    element.classList.add(classes[0], classes[1])
    let frame2, timer
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        element.classList.remove(classes[1])
        element.classList.add(classes[2])
        const style = getComputedStyle(element)
        const milliseconds = (value) =>
          value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000
        const duration =
          Math.max(0, ...style.transitionDuration.split(',').map(milliseconds)) +
          Math.max(0, ...style.transitionDelay.split(',').map(milliseconds))
        timer = setTimeout(() => {
          element.classList.remove(...classes)
          if (!show) setPresent(false)
        }, duration + 20)
      })
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      clearTimeout(timer)
      element.classList.remove(...classes)
    }
  }, [show, present, name])
  return show || present ? (
    <span ref={container} style={{ display: 'contents' }}>
      {show ? children : retained.current}
    </span>
  ) : null
}
