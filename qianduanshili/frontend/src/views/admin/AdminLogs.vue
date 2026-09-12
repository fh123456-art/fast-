<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const load = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/logs', {
      params: { page: page.value, page_size: pageSize.value },
    })
    if (Array.isArray(data)) {
      list.value = data
      total.value = data.length
    } else {
      list.value = data.items || data.data || []
      total.value = data.total || list.value.length
    }
  } catch (e) {
    toast(e.message || '日志加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const totalPages = () => Math.max(1, Math.ceil(total.value / pageSize.value))
const changePage = (p) => {
  if (p < 1 || p > totalPages()) return
  page.value = p
}

const levelLabel = (v) => {
  const map = {
    info: { text: 'INFO', cls: 'blue' },
    warn: { text: 'WARN', cls: 'orange' },
    warning: { text: 'WARN', cls: 'orange' },
    error: { text: 'ERROR', cls: 'red' },
    success: { text: 'OK', cls: 'green' },
  }
  return map[(v || '').toLowerCase()] || { text: v || '-', cls: 'gray' }
}

onMounted(load)
watch([page, pageSize], load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">操作日志</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-journal-text me-2" style="color: var(--primary)"></i>操作日志</h3>

    <div class="app-card">
      <div class="card-title"><i class="bi bi-list-ul"></i>日志列表</div>

      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无日志记录</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th style="width:100px">级别</th>
              <th>操作模块</th>
              <th>描述</th>
              <th>操作人</th>
              <th>IP 地址</th>
              <th style="width:160px">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in list" :key="l.id">
              <td>{{ l.id }}</td>
              <td>
                <span class="badge-soft blue">操作</span>
              </td>
              <td>
                <span v-if="l.action" class="badge-soft gray">{{ l.action }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td style="max-width: 350px;">{{ l.detail || l.target || '-' }}</td>
              <td style="font-weight: 500;">{{ l.admin_name || '管理员' }}</td>
              <td style="color: var(--text-muted); font-size: 13px; font-family: monospace;">{{ l.ip || '-' }}</td>
              <td style="color: var(--text-muted); font-size: 13px;">{{ l.created_at || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav v-if="list.length > 0" class="mt-3" aria-label="分页">
        <ul class="pagination justify-content-center mb-0">
          <li :class="['page-item', page === 1 && 'disabled']">
            <a class="page-link" href="#" @click.prevent="changePage(page - 1)">上一页</a>
          </li>
          <li v-for="p in totalPages()" :key="p" :class="['page-item', page === p && 'active']">
            <a class="page-link" href="#" @click.prevent="changePage(p)">{{ p }}</a>
          </li>
          <li :class="['page-item', page === totalPages() && 'disabled']">
            <a class="page-link" href="#" @click.prevent="changePage(page + 1)">下一页</a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
