import { NavLink } from 'react-router-dom'

export default function GalleryLink({ className = '', ...props }) {
  return (
    <NavLink
      {...props}
      end
      className={({ isActive }) =>
        className + (isActive ? ' router-link-active router-link-exact-active' : '')
      }
    />
  )
}
