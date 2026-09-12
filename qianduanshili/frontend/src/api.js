import axios from 'axios'
import { navigate } from './router'

// 统一 axios 实例:baseURL=/api 会被 vite 代理转发到后端 8000 端口
// timeout 设为 120s:AI 接口(简历解析/面试评分)调用大模型需要较长时间
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

// 请求拦截:自动带上登录 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stu_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截:直接返回 data;401 自动跳登录
api.interceptors.response.use(
  (resp) => resp.data,
  (err) => {
    const status = err.response?.status
    const detail = err.response?.data?.detail || '请求失败,请稍后重试'
    if (status === 401) {
      localStorage.removeItem('stu_token')
      localStorage.removeItem('stu_user')
      navigate('/login')
    }
    return Promise.reject(new Error(detail))
  }
)

export default api
