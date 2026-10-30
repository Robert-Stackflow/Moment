import { useCallback, useLayoutEffect, useRef } from 'react'

export function useEvent(callback) {
  const latest = useRef(callback)
  useLayoutEffect(() => {
    latest.current = callback
  })
  return useCallback((...args) => latest.current(...args), [])
}
