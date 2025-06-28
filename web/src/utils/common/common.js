import dayjs from 'dayjs'
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * @desc  格式化时间
 * @param {(Object|string|number)} time
 * @param {string} format
 * @returns {string | null}
 */
export function formatDateTime(time = undefined, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(time).format(format)
}

export function parseDateTime(time = undefined, format = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(time, format)
}

export function formatDate(date = undefined, format = 'YYYY-MM-DD') {
  return formatDateTime(date, format)
}
export function isValueEmpty(value) {
  return value == undefined || value === ''
}
export function isValueNotEmpty(value) {
  return !isValueEmpty(value)
}
/**
 * @desc  函数节流
 * @param {Function} fn
 * @param {Number} wait
 * @returns {Function}
 */
export function throttle(fn, wait) {
  var context, args
  var previous = 0

  return function () {
    var now = +new Date()
    context = this
    args = arguments
    if (now - previous > wait) {
      fn.apply(context, args)
      previous = now
    }
  }
}

/**
 * @desc  函数防抖
 * @param {Function} func
 * @param {number} wait
 * @param {boolean} immediate
 * @return {*}
 */
export function debounce(method, wait, immediate) {
  let timeout
  return function (...args) {
    let context = this
    if (timeout) {
      clearTimeout(timeout)
    }
    // 立即执行需要两个条件，一是immediate为true，二是timeout未被赋值或被置为null
    if (immediate) {
      /**
       * 如果定时器不存在，则立即执行，并设置一个定时器，wait毫秒后将定时器置为null
       * 这样确保立即执行后wait毫秒内不会被再次触发
       */
      let callNow = !timeout
      timeout = setTimeout(() => {
        timeout = null
      }, wait)
      if (callNow) {
        method.apply(context, args)
      }
    } else {
      // 如果immediate为false，则函数wait毫秒后执行
      timeout = setTimeout(() => {
        /**
         * args是一个类数组对象，所以使用fn.apply
         * 也可写作method.call(context, ...args)
         */
        method.apply(context, args)
      }, wait)
    }
  }
}
export function scrollToload(elRef, onScrollTobottom) {
  let el = window
  const isBottom = ref(false)
  const scrollHeight = ref(0)
  const scrollTop = ref(0)
  const clientHeight = ref(0)

  const scroll = throttle(() => {
    if (!elRef) {
      scrollHeight.value = document.documentElement.scrollHeight
      scrollTop.value = document.documentElement.scrollTop
      clientHeight.value = document.documentElement.clientHeight
    } else {
      scrollHeight.value = el.scrollHeight
      scrollTop.value = el.scrollTop
      clientHeight.value = el.clientHeight
    }
    if (scrollTop.value + clientHeight.value >= scrollHeight.value) {
      isBottom.value = true
      if (onScrollTobottom) onScrollTobottom()
    }
  }, 100)

  onMounted(() => {
    if (elRef) el = elRef.value
    el.addEventListener('scroll', scroll, true)
  })

  onUnmounted(() => {
    el.removeEventListener('scroll', scroll, true)
  })

  return {
    isBottom,
    scrollHeight,
    scrollTop,
    clientHeight,
  }
}
