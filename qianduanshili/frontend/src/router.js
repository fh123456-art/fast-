import { ref } from 'vue'

// 轻量 hash 路由(无需 vue-router 依赖)
export const currentRoute = ref(window.location.hash.replace('#', '') || '/')

window.addEventListener('hashchange', () => {
  currentRoute.value = window.location.hash.replace('#', '') || '/'
})

export function navigate(path) {
  window.location.hash = path
}

// 登录态
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('stu_user') || 'null')
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem('stu_token')
}

export function isAdmin() {
  const u = getUser()
  return u && u.role === 'admin'
}

export function login(token, user) {
  localStorage.setItem('stu_token', token)
  localStorage.setItem('stu_user', JSON.stringify(user))
}

export function updateUser(user) {
  localStorage.setItem('stu_user', JSON.stringify(user))
}

export function logout() {
  localStorage.removeItem('stu_user')
  localStorage.removeItem('stu_token')
  navigate('/login')
}
