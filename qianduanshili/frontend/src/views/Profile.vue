<script setup>
import { ref, onMounted, computed } from 'vue'
import { toast } from '../toast'
import { updateUser } from '../router'
import api from '../api'

const form = ref({
  name: '', gender: '男', phone: '', email: '', school: '', major: '',
  degree: '本科', graduate_year: '2026', intention: '', expect_city: '', expect_salary: '',
})
const editing = ref(false)
const loading = ref(true)

const load = async () => {
  try {
    const data = await api.get('/profile')
    form.value = { ...form.value, ...data }
  } catch (e) {
    toast(e.message || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

// 资料完整度:按关键字段计算
const completeness = computed(() => {
  const keys = ['name', 'phone', 'email', 'school', 'major', 'degree', 'graduate_year', 'intention', 'expect_city', 'expect_salary']
  const filled = keys.filter((k) => form.value[k] && String(form.value[k]).trim()).length
  return Math.round((filled / keys.length) * 100)
})

const save = async () => {
  try {
    const data = await api.put('/profile', form.value)
    form.value = { ...form.value, ...data }
    // 同步顶栏显示的学校
    const u = JSON.parse(localStorage.getItem('stu_user') || '{}')
    updateUser({ ...u, name: data.name, school: data.school, major: data.major })
    editing.value = false
    toast('个人信息保存成功')
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>个人信息</h2>
      <p>完善学校、专业等信息,AI 匹配岗位时会更精准</p>
    </div>

    <!-- 个人资料卡 -->
    <div class="app-card">
      <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap">
        <div class="avatar" style="width: 72px; height: 72px; font-size: 28px">{{ form.name.charAt(0) }}</div>
        <div style="flex: 1; min-width: 200px">
          <div style="font-size: 20px; font-weight: 800">{{ form.name }}
            <span class="badge-soft blue ms-2"><i class="bi bi-mortarboard-fill"></i> 学生</span>
          </div>
          <div style="color: var(--text-muted); margin-top: 6px">
            <i class="bi bi-geo-alt-fill me-1"></i>{{ form.school }} · {{ form.major }} · {{ form.degree }}
          </div>
          <div style="margin-top: 8px">
            <span class="tag">求职意向:{{ form.intention }}</span>
            <span class="tag">{{ form.expect_city }}</span>
            <span class="tag">期望 {{ form.expect_salary }}</span>
          </div>
        </div>
        <div style="text-align: center">
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px">资料完整度</div>
          <div class="score-ring" :style="{ background: `conic-gradient(#4f6ef7 ${completeness * 3.6}deg, #eef0f5 0deg)`, width: '86px', height: '86px' }">
            <span class="score-num" style="font-size: 22px">{{ completeness }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 基本信息表单 -->
    <div class="app-card">
      <div class="card-title">
        <i class="bi bi-pencil-square"></i>基本信息
        <button v-if="!editing" class="btn-sm-soft ms-auto" @click="editing = true">
          <i class="bi bi-pencil me-1"></i>编辑
        </button>
      </div>

      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">姓名</label>
          <input v-model="form.name" class="form-control" :disabled="!editing">
        </div>
        <div class="col-md-4">
          <label class="form-label">性别</label>
          <select v-model="form.gender" class="form-select" :disabled="!editing">
            <option>男</option><option>女</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">手机号码</label>
          <input v-model="form.phone" class="form-control" :disabled="!editing">
        </div>
        <div class="col-md-4">
          <label class="form-label">邮箱</label>
          <input v-model="form.email" class="form-control" :disabled="!editing">
        </div>
        <div class="col-md-4">
          <label class="form-label">学校 <span style="color: var(--danger)">*</span></label>
          <input v-model="form.school" class="form-control" :disabled="!editing" placeholder="如:华南理工大学">
        </div>
        <div class="col-md-4">
          <label class="form-label">专业 <span style="color: var(--danger)">*</span></label>
          <input v-model="form.major" class="form-control" :disabled="!editing" placeholder="如:软件工程">
        </div>
        <div class="col-md-4">
          <label class="form-label">学历</label>
          <select v-model="form.degree" class="form-select" :disabled="!editing">
            <option>大专</option><option>本科</option><option>硕士</option><option>博士</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">毕业年份</label>
          <select v-model="form.graduate_year" class="form-select" :disabled="!editing">
            <option>2025</option><option>2026</option><option>2027</option><option>2028</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">求职意向</label>
          <input v-model="form.intention" class="form-control" :disabled="!editing" placeholder="如:前端开发工程师">
        </div>
        <div class="col-md-4">
          <label class="form-label">期望城市</label>
          <input v-model="form.expectCity" class="form-control" :disabled="!editing">
        </div>
        <div class="col-md-4">
          <label class="form-label">期望薪资</label>
          <input v-model="form.expectSalary" class="form-control" :disabled="!editing">
        </div>
      </div>

      <div v-if="editing" class="mt-4 d-flex gap-2">
        <button class="btn-gradient" @click="save"><i class="bi bi-check-lg me-1"></i>保存</button>
        <button class="btn-ghost" @click="editing = false; load()">取消</button>
      </div>
    </div>
  </div>
</template>
