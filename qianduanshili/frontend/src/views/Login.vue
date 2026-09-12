<script setup>
import { ref } from 'vue'
import { login, navigate } from '../router'
import { toast } from '../toast'
import api from '../api'

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
    login(res.access_token, res.user)
    toast('登录成功,欢迎回来!')
    navigate('/jobs')
  } catch (e) {
    toast(e.message || '登录失败', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-left">
      <div class="brand">
        <i class="bi bi-rocket-takeoff-fill"></i>
        AI求职与简历优化平台
      </div>
      <h2>让 AI 成为你的<br />专属求职辅导老师</h2>
      <p>简历智能诊断、岗位精准匹配、模拟面试训练<br />一站式助力大学生拿到心仪 Offer</p>
      <div class="auth-features">
        <div><i class="bi bi-file-earmark-text-fill"></i>上传简历,AI 自动解析并输出优化建议</div>
        <div><i class="bi bi-bullseye"></i>简历-岗位智能匹配,差距一目了然</div>
        <div><i class="bi bi-chat-dots-fill"></i>AI 扮演 HR 流式模拟面试,生成评估报告</div>
      </div>
    </div>

    <div class="auth-right">
      <h3>学生登录</h3>
      <p class="sub">还没有账号?<a @click="navigate('/register')" style="cursor: pointer; font-weight: 600">立即注册</a></p>

      <div class="mb-3">
        <label class="form-label">账号 / 学号</label>
        <input v-model="form.username" type="text" class="form-control" placeholder="请输入账号或学号" @keyup.enter="onLogin">
      </div>
      <div class="mb-3">
        <label class="form-label">密码</label>
        <input v-model="form.password" type="password" class="form-control" placeholder="请输入密码" @keyup.enter="onLogin">
      </div>
      <div class="d-flex justify-content-between mb-3" style="font-size: 13px">
        <label class="d-flex align-items-center gap-1" style="color: var(--text-muted)">
          <input type="checkbox" checked> 记住我
        </label>
        <a style="cursor: pointer">忘记密码?</a>
      </div>
      <button class="btn-gradient" :disabled="loading" @click="onLogin">
        <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
        {{ loading ? '登录中...' : '登 录' }}
      </button>
      <div class="auth-footer">学生端 · 没有账号请先<a @click="navigate('/register')" style="cursor:pointer;font-weight:600">注册</a></div>
    </div>
  </div>
</template>
