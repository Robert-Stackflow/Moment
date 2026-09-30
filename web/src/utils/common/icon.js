import { h } from 'vue'
import { Icon } from '@iconify/vue'
import SvgIcon from '@/components/icon/SvgIcon.vue'
import entryIcons from '../../../../shared/entry-icons.json'

export function renderIcon(icon, props = { size: 12 }) {
  const bundled = entryIcons.find(item => item.value === icon)
  return () => h(Icon, { icon: bundled?.icon || icon, width: props.size, height: props.size, color: props.color })
}

export function renderCustomIcon(icon, props = { size: 12 }) {
  return () => h(SvgIcon, { icon, style: { width: `${props.size}px`, height: `${props.size}px`, color: props.color } })
}
