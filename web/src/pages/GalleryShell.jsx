import { useEffect, useLayoutEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSettings } from '../state/settings'
import { createStyle } from '../lib/meta'
import GalleryHeader from '../components/gallery/GalleryHeader'
import AboutPanel from '../components/gallery/AboutPanel'
import '../styles/gallery/shell.css'
import '../styles/gallery/wall.css'

export default function GalleryShell() {
  const [aboutOpen, setAboutOpen] = useState(false),
    route = useLocation(),
    { meta } = useSettings()
  useEffect(() => {
    setAboutOpen(false)
  }, [route.pathname, route.search])
  useEffect(() => {
    document.body.classList.toggle('content-active', aboutOpen)
    return () => document.body.classList.remove('content-active')
  }, [aboutOpen])
  useLayoutEffect(() => {
    createStyle(
      'custom_primary_color',
      ':root {--moment-theme:' +
        (meta.primary_color || import.meta.env.VITE_PRIMARY_COLOR) +
        ' !important;}',
    )
  }, [meta.primary_color])
  return (
    <>
      <GalleryHeader aboutOpen={aboutOpen} onAbout={() => setAboutOpen((value) => !value)} />
      <div id="wrapper">
        <Outlet />
        {aboutOpen && (
          <button
            className="gallery-panel-backdrop"
            aria-label="关闭关于面板"
            onClick={() => setAboutOpen(false)}
          />
        )}
        <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
      </div>
    </>
  )
}
