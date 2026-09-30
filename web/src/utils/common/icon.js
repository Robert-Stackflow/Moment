import { h } from 'vue'
import { Icon } from '@iconify/vue'
import entryIcons from '../../../../shared/entry-icons.json'

export function renderIcon(icon, props = { size: 12 }) {
  const bundled = entryIcons.find(item => item.value === icon)
  return () => h(Icon, { icon: bundled?.icon || icon, width: props.size, height: props.size, color: props.color })
}
