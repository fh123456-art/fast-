<script setup>
import { ref } from 'vue'
import { login, navigate } from '../../router'
import { toast } from '../../toast'
import api from '../../api'

const form = ref({ username: '', password: '' })
const loading = ref(false)

const onLogin = async () => {
  if (!form.value.username || !form.value.password) {
    toast('请输入账号和密码', 'error')
    return
  }
  loading.value = true
  try {
    const res = await api.post('/auth/login', form.value)
    if (res.user.role !== 'admin') {
      toast('该账号不是管理员,请使用学生端登录', 'error')
      return
    }
    login(res.access_token, res.user)
    toast('管理员登录成功')
    navigate('/admin/dashboard')
  } catch (e) {
    toast(e.message || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-left" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);">
      <div class="brand" style="color: #fff;">
        <i class="bi bi-shield-lock-fill" style="color: #ff7a45;"></i>
        管理后台
      </div>
      <h2 style="color: #fff; font-size: 28px;">管理员专属控制台</h2>
      <p style="color: rgba(255,255,255,0.7);">平台数据监控、用户管理、AI 配置一站式后台</p>
      <div class="auth-features">
        <div style="color: rgba(255,255,255,0.85);"><i class="bi bi-speedometer2"></i> 数据统计可视化</div>
        <div style="color: rgba(255,255,255,0.85);"><i class="bi bi-people-fill"></i> 用户账号管控</div>
        <div style="color: rgba(255,255,255,0.85);"><i class="bi bi-lightbulb-fill"></i> AI 模板/题库管理</div>
      </div>
    </div>

    <div class="auth-right">
      <h3>管理员登录</h3>
      <p class="sub">默认账号: admin / 123456</p>
      <div class="mb-3">
        <label class="form-label">管理员账号</label>
        <input v-model="form.username" type="text" class="form-control" placeholder="请输入管理员账号" @keyup.enter="onLogin">
      </div>
      <div class="mb-3">
        <label class="form-label">密码</label>
        <input v-model="form.password" type="password" class="form-control" placeholder="请输入密码" @keyup.enter="onLogin">
      </div>
      <button class="btn-gradient" :disabled="loading" @click="onLogin">
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? '登录中...' : '登 录' }}
      </button>
      <div class="auth-footer">没有账号?<a @click="navigate('/login')" style="cursor:pointer;font-weight:600">去学生端</a></div>
    </div>
  </div>
</template>
