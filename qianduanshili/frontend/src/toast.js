import { reactive } from 'vue'

// 全局轻量提示
export const toasts = reactive([])

export function toast(msg, type = 'success') {
  const id = Date.now() + Math.random()
  toasts.push({ id, msg, type })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i > -1) toasts.splice(i, 1)
  }, 2600)
}
