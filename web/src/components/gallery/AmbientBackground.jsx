import { useLayoutEffect, useState } from 'react'
import Presence from './Presence'

export default function AmbientBackground({ url }) {
  const [layers, setLayers] = useState(() => (url ? [url] : []))
  useLayoutEffect(() => {
    if (url) setLayers((previous) => [...previous.filter((value) => value !== url).slice(-1), url])
  }, [url])
  return layers.map((layer) => (
    <Presence key={layer} show={layer === url} name="viewer-ambient-swap">
      <div
        className="viewer-ambient"
        style={{ backgroundImage: 'url(' + JSON.stringify(layer) + ')' }}
        aria-hidden="true"
      />
    </Presence>
  ))
}
