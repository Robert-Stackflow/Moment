import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Link from './GalleryLink'
import { useSettings } from '../../state/settings'
import { versionedBrandIcon } from '../../lib/brand'
import api from '../../lib/api'
import GalleryButton from './GalleryButton'
import Presence from './Presence'
import '../../styles/gallery/header.css'

export default function GalleryHeader({ aboutOpen, onAbout }) {
  const route = useLocation(),
    { meta, content } = useSettings()
  const [categories, setCategories] = useState([]),
    [categoriesOpen, setCategoriesOpen] = useState(false)
  const [categoryError, setCategoryError] = useState(false),
    [fullscreen, setFullscreen] = useState(false)
  const categoryNav = useRef(null)
  async function loadCategories() {
    setCategoryError(false)
    try {
      setCategories((await api.getCategoriesVisitor()).data)
    } catch {
      setCategoryError(true)
    }
  }
  async function toggleFullScreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      /* Embedding browsers can disallow fullscreen. */
    }
  }
  useEffect(() => setCategoriesOpen(false), [route.pathname, route.search])
  useEffect(() => {
    let active = true
    api
      .getCategoriesVisitor()
      .then((result) => {
        if (active) setCategories(result.data)
      })
      .catch(() => {
        if (active) setCategoryError(true)
      })
    const outside = (event) => {
      if (!categoryNav.current?.contains(event.target)) setCategoriesOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape' && categoryNav.current?.querySelector('[aria-expanded="true"]')) {
        setCategoriesOpen(false)
        categoryNav.current?.querySelector('button')?.focus()
      }
    }
    const changed = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    document.addEventListener('fullscreenchange', changed)
    return () => {
      active = false
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('fullscreenchange', changed)
    }
  }, [])
  return (
    <header id="header">
      <Link to="/" className="gallery-brand">
        <img
          className="site-logo"
          src={versionedBrandIcon(meta.bottom_icon || import.meta.env.VITE_ICON)}
          alt=""
        />
        <strong>{meta.site_name || import.meta.env.VITE_TITLE}</strong>
      </Link>
      <span className="description">{meta.bottom_desc || import.meta.env.VITE_DESC}</span>
      <nav aria-label="相册导航">
        <GalleryButton
          className="gallery-fullscreen"
          icon="expand"
          label={fullscreen ? '退出全屏' : '全屏浏览'}
          pressed={fullscreen}
          onClick={toggleFullScreen}
        />
        <div ref={categoryNav} className="gallery-category-nav">
          <GalleryButton
            icon="categories"
            label="分类"
            className="gallery-explore-link"
            pressed={categoriesOpen || route.pathname.startsWith('/category/')}
            aria-controls="gallery-categories"
            aria-expanded={categoriesOpen}
            onClick={() => setCategoriesOpen((v) => !v)}
          />
          <Presence show={categoriesOpen} name="category-pop">
            <div id="gallery-categories" className="gallery-category-menu">
              <Link className="gallery-all" to="/" onClick={() => setCategoriesOpen(false)}>
                全部照片
              </Link>
              {categories.map((category) => (
                <div key={category.id} className="gallery-category-group">
                  <Link
                    to={'/category/' + encodeURIComponent(category.alias)}
                    onClick={() => setCategoriesOpen(false)}
                  >
                    {category.name}
                  </Link>
                  {!!category.children.length && (
                    <div className="gallery-category-children">
                      {category.children.map((child) => (
                        <Link
                          key={child.id}
                          to={'/category/' + encodeURIComponent(child.alias)}
                          onClick={() => setCategoriesOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {categoryError && (
                <button className="gallery-nav-link" onClick={loadCategories}>
                  加载失败，重试
                </button>
              )}
            </div>
          </Presence>
        </div>
        {content.map_enabled !== false && (
          <GalleryButton
            icon="map"
            label="地图"
            href="/map"
            className="gallery-explore-link"
            pressed={route.pathname === '/map'}
          />
        )}
        {content.timeline_enabled !== false && (
          <GalleryButton
            icon="timeline"
            label="拍摄时间线"
            href="/timeline"
            className="gallery-explore-link"
            pressed={route.pathname === '/timeline'}
          />
        )}
        <button
          id="header-about"
          type="button"
          className={'gallery-nav-link' + (aboutOpen ? ' active' : '')}
          aria-expanded={aboutOpen}
          aria-controls="footer"
          onClick={onAbout}
        >
          关于
        </button>
      </nav>
    </header>
  )
}
