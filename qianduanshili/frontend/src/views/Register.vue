<script setup>
import { ref } from 'vue'
import { login, navigate } from '../router'
import { toast } from '../toast'
import api from '../api'

const form = ref({
  username: '',
  email: '',
  password: '',
  confirm: '',
})
const loading = ref(false)

const onRegister = async () => {
  if (!form.value.username || !form.value.password) {
    toast('请填写账号和密码', 'error')
    return
  }
  if (form.value.password !== form.value.confirm) {
    toast('两次输入的密码不一致', 'error')
    return
  }
  loading.value = true
  try {
    const res = await api.post('/auth/register', {
      username: form.value.username,
      password: form.value.password,
      name: form.value.username,
      email: form.value.email,
    })
    login(res.access_token, res.user)
    toast('注册成功,已自动登录!请完善个人信息')
    navigate('/profile')
  } catch (e) {
    toast(e.message || '注册失败', 'error')
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
      <h2>加入我们<br />开启 AI 求职之旅</h2>
      <p>注册即可免费使用简历诊断、岗位匹配、<br />AI模拟面试等全部功能</p>
      <div class="auth-features">
        <div><i class="bi bi-shield-check"></i>学生信息加密存储,隐私安全有保障</div>
        <div><i class="bi bi-stars"></i>AI 能力持续升级,建议越来越懂你</div>
      </div>
    </div>

    <div class="auth-right">
      <h3>学生注册</h3>
      <p class="sub">已有账号?<a @click="navigate('/login')" style="cursor: pointer; font-weight: 600">返回登录</a></p>

      <div class="mb-3">
        <label class="form-label">昵称 / 姓名</label>
        <input v-model="form.username" type="text" class="form-control" placeholder="请输入昵称或姓名">
      </div>
      <div class="mb-3">
        <label class="form-label">邮箱</label>
        <input v-model="form.email" type="email" class="form-control" placeholder="用于接收面试通知">
      </div>
      <div class="mb-3">
        <label class="form-label">密码</label>
        <input v-model="form.password" type="password" class="form-control" placeholder="设置 6-20 位密码">
      </div>
      <div class="mb-3">
        <label class="form-label">确认密码</label>
        <input v-model="form.confirm" type="password" class="form-control" placeholder="再次输入密码" @keyup.enter="onRegister">
      </div>
      <button class="btn-gradient" @click="onRegister">注 册</button>
      <div class="auth-footer">注册即代表同意《用户协议》与《隐私政策》</div>
    </div>
  </div>
</template>
