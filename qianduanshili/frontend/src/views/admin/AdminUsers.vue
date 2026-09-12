<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const keyword = ref('')

const load = async () => {
  loading.value = true
  try {
    const params = {}
    if (keyword.value) params.keyword = keyword.value
    list.value = await api.get('/admin/users', { params })
  } catch (e) {
    toast(e.message || '用户列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const toggleStatus = async (user) => {
  try {
    await api.post(`/admin/users/${user.id}/toggle`)
    user.is_active = !user.is_active
    toast(user.is_active ? '已启用' : '已禁用')
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  }
}

const onSearch = () => load()
const onReset = () => {
  keyword.value = ''
  load()
}

onMounted(load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">用户管理</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-people-fill me-2" style="color: var(--primary)"></i>用户管理</h3>

    <div class="app-card">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label">账号搜索</label>
          <input v-model="keyword" class="form-control" placeholder="输入账号关键字" @keyup.enter="onSearch">
        </div>
        <div class="col-md-auto d-flex gap-2">
          <button class="btn-gradient" @click="onSearch"><i class="bi bi-search me-1"></i>搜索</button>
          <button class="btn-ghost" @click="onReset">重置</button>
        </div>
      </div>
    </div>

    <div class="app-card">
      <div class="card-title"><i class="bi bi-list-ul"></i>用户列表</div>

      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无用户</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>账号</th>
              <th>姓名</th>
              <th>学校</th>
              <th>专业</th>
              <th style="width:100px">状态</th>
              <th style="width:140px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list" :key="u.id">
              <td>{{ u.id }}</td>
              <td style="font-weight: 600;">{{ u.username }}</td>
              <td>{{ u.name || '-' }}</td>
              <td>{{ u.school || '-' }}</td>
              <td>{{ u.major || '-' }}</td>
              <td>
                <span v-if="u.is_active !== false" class="badge-soft green">
                  <i class="bi bi-check-circle-fill"></i> 已启用
                </span>
                <span v-else class="badge-soft gray">
                  <i class="bi bi-pause-circle-fill"></i> 已禁用
                </span>
              </td>
              <td>
                <button
                  :class="['btn btn-sm', u.is_active !== false ? 'btn-outline-danger' : 'btn-outline-success']"
                  @click="toggleStatus(u)">
                  <i :class="u.is_active !== false ? 'bi bi-person-x' : 'bi bi-person-check'"></i>
                  {{ u.is_active !== false ? '禁用' : '启用' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
