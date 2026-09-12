<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const reviewModal = ref(false)
const reviewLoading = ref(false)
const currentResume = ref(null)
const reviewForm = ref({ status: 'approved', remark: '' })

const load = async () => {
  loading.value = true
  try {
    list.value = await api.get('/admin/resumes')
  } catch (e) {
    toast(e.message || '简历列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const openReview = (r) => {
  currentResume.value = r
  reviewForm.value = {
    status: r.review_status === '已通过' ? 'approved' : r.review_status === '未通过' ? 'rejected' : 'pending',
    remark: r.review_comment || r.review_remark || '',
  }
  reviewModal.value = true
}

const submitReview = async () => {
  if (!currentResume.value) return
  reviewLoading.value = true
  try {
    await api.post(`/admin/resumes/${currentResume.value.id}/review`, reviewForm.value)
    currentResume.value.review_status = reviewForm.value.status
    currentResume.value.review_remark = reviewForm.value.remark
    toast(reviewForm.value.status === 'approved' ? '审核已通过' : '已驳回')
    reviewModal.value = false
  } catch (e) {
    toast(e.message || '审核失败', 'error')
  } finally {
    reviewLoading.value = false
  }
}

const parseStatus = (v) => {
  const map = {
    '待解析': { text: '待解析', cls: 'orange', icon: 'bi-hourglass-split' },
    '已解析': { text: '已解析', cls: 'green', icon: 'bi-file-earmark-check' },
    '解析失败': { text: '解析失败', cls: 'red', icon: 'bi-exclamation-triangle' },
  }
  return map[v] || { text: v || '-', cls: 'gray', icon: 'bi-question-circle' }
}

const reviewStatus = (v) => {
  const map = {
    '待审核': { text: '待审核', cls: 'orange', icon: 'bi-hourglass-split' },
    '已通过': { text: '已通过', cls: 'green', icon: 'bi-check-circle-fill' },
    '未通过': { text: '未通过', cls: 'red', icon: 'bi-x-circle-fill' },
  }
  return map[v] || { text: v || '-', cls: 'gray', icon: 'bi-question-circle' }
}

onMounted(load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">简历审核</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-file-earmark-person-fill me-2" style="color: var(--primary)"></i>简历审核</h3>

    <div class="app-card">
      <div class="card-title"><i class="bi bi-list-ul"></i>简历列表</div>

      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无简历</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>文件名</th>
              <th style="width:80px">类型</th>
              <th>用户</th>
              <th style="width:110px">解析状态</th>
              <th style="width:110px">审核状态</th>
              <th style="width:120px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td>{{ r.id }}</td>
              <td style="font-weight: 600;">{{ r.filename || r.name }}</td>
              <td>
                <span class="badge-soft blue">{{ (r.filetype || r.type || 'pdf').toUpperCase() }}</span>
              </td>
              <td>{{ r.user_name || r.username || '-' }}</td>
              <td>
                <span :class="['badge-soft', parseStatus(r.status).cls]">
                  <i :class="parseStatus(r.status).icon"></i>
                  {{ parseStatus(r.status).text }}
                </span>
              </td>
              <td>
                <span :class="['badge-soft', reviewStatus(r.review_status).cls]">
                  <i :class="reviewStatus(r.review_status).icon"></i>
                  {{ reviewStatus(r.review_status).text }}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" @click="openReview(r)">
                  <i class="bi bi-pencil-square"></i> 审核
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="reviewModal" class="modal-mask" @click.self="reviewModal = false">
      <div class="modal-box">
        <div class="modal-header-x">
          <h5><i class="bi bi-pencil-square me-2" style="color: var(--primary)"></i>简历审核</h5>
          <button class="modal-close" @click="reviewModal = false">×</button>
        </div>
        <div class="modal-body-x">
          <div v-if="currentResume" class="mb-3" style="background: #f8faff; padding: 14px; border-radius: 12px;">
            <div style="font-weight: 600;">{{ currentResume.filename || currentResume.name }}</div>
            <div style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
              上传用户: {{ currentResume.user_name || currentResume.user?.name || '-' }}
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">审核结果 <span class="text-danger">*</span></label>
            <select v-model="reviewForm.status" class="form-select">
              <option value="approved">已通过</option>
              <option value="rejected">未通过</option>
            </select>
          </div>

          <div class="mb-0">
            <label class="form-label">备注说明</label>
            <textarea v-model="reviewForm.remark" class="form-control" rows="3"
                      placeholder="请输入审核备注,如不通过原因等..."></textarea>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="reviewModal = false">取消</button>
          <button class="btn-gradient" :disabled="reviewLoading" @click="submitReview">
            <span v-if="reviewLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ reviewLoading ? '提交中...' : '确认审核' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
