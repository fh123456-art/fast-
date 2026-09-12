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
    const data = await api.get('/admin/feedbacks', {
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
    toast(e.message || '反馈列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const totalPages = () => Math.max(1, Math.ceil(total.value / pageSize.value))
const changePage = (p) => {
  if (p < 1 || p > totalPages()) return
  page.value = p
}

onMounted(load)
watch([page, pageSize], load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">AI 反馈</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-chat-heart-fill me-2" style="color: var(--primary)"></i>AI 反馈记录</h3>

    <div class="app-card">
      <div class="card-title"><i class="bi bi-list-ul"></i>反馈列表</div>

      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无反馈记录</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>用户</th>
              <th>反馈类型</th>
              <th>内容</th>
              <th style="width:100px">点赞</th>
              <th style="width:160px">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in list" :key="f.id">
              <td>{{ f.id }}</td>
              <td style="font-weight: 600;">{{ f.username || f.user_name || '-' }}</td>
              <td>
                <span v-if="f.source_type" class="badge-soft blue">{{ f.source_type }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td style="max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ f.comment || '-' }}
              </td>
              <td>
                <span v-if="f.feedback_type === 'like'" class="badge-soft green"><i class="bi bi-hand-thumbs-up-fill"></i> 点赞</span>
                <span v-else class="badge-soft red"><i class="bi bi-hand-thumbs-down-fill"></i> 点踩</span>
              </td>
              <td style="color: var(--text-muted); font-size: 13px;">{{ f.created_at || '-' }}</td>
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
