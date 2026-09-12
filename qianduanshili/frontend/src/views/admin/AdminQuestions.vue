<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const modalVisible = ref(false)
const modalLoading = ref(false)
const form = ref({ question: '', category: '', difficulty: 2 })

const load = async () => {
  loading.value = true
  try {
    list.value = await api.get('/admin/questions')
  } catch (e) {
    toast(e.message || '题库加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const openAdd = () => {
  form.value = { question: '', category: '', difficulty: 2 }
  modalVisible.value = true
}

const onSubmit = async () => {
  if (!form.value.question) {
    toast('请填写问题内容', 'error')
    return
  }
  modalLoading.value = true
  try {
    await api.post('/admin/questions', form.value)
    toast('添加成功')
    modalVisible.value = false
    load()
  } catch (e) {
    toast(e.message || '添加失败', 'error')
  } finally {
    modalLoading.value = false
  }
}

const onDelete = async (q) => {
  if (!confirm(`确定删除该题目吗?`)) return
  try {
    await api.delete(`/admin/questions/${q.id}`)
    toast('删除成功')
    load()
  } catch (e) {
    toast(e.message || '删除失败', 'error')
  }
}

const diffLabel = (v) => {
  const map = {
    1: { text: '简单', cls: 'green' },
    2: { text: '中等', cls: 'orange' },
    3: { text: '困难', cls: 'red' },
  }
  return map[v] || { text: v || '-', cls: 'gray' }
}

onMounted(load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">面试题库</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-question-circle-fill me-2" style="color: var(--primary)"></i>面试题库</h3>

    <div class="app-card">
      <div class="d-flex justify-content-between align-items-center">
        <div class="card-title mb-0"><i class="bi bi-list-ul"></i>题目列表</div>
        <button class="btn-gradient" @click="openAdd"><i class="bi bi-plus-circle me-1"></i>添加题目</button>
      </div>
    </div>

    <div class="app-card">
      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无题目</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>问题内容</th>
              <th style="width:120px">分类</th>
              <th style="width:100px">难度</th>
              <th style="width:100px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in list" :key="q.id">
              <td>{{ q.id }}</td>
              <td style="font-weight: 500; max-width: 500px;">{{ q.question }}</td>
              <td>
                <span v-if="q.category" class="badge-soft blue">{{ q.category }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span :class="['badge-soft', diffLabel(q.difficulty).cls]">{{ diffLabel(q.difficulty).text }}</span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-danger" @click="onDelete(q)">
                  <i class="bi bi-trash"></i> 删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalVisible" class="modal-mask" @click.self="modalVisible = false">
      <div class="modal-box">
        <div class="modal-header-x">
          <h5><i class="bi bi-plus-circle me-2" style="color: var(--primary)"></i>添加面试题目</h5>
          <button class="modal-close" @click="modalVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div class="mb-3">
            <label class="form-label">问题内容 <span class="text-danger">*</span></label>
            <textarea v-model="form.question" class="form-control" rows="3"
                      placeholder="请输入面试问题内容"></textarea>
          </div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">分类</label>
              <input v-model="form.category" class="form-control" placeholder="如:技术/行为/项目">
            </div>
            <div class="col-md-6">
              <label class="form-label">难度</label>
              <select v-model="form.difficulty" class="form-select">
                <option :value="1">简单</option>
                <option :value="2">中等</option>
                <option :value="3">困难</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="modalVisible = false">取消</button>
          <button class="btn-gradient" :disabled="modalLoading" @click="onSubmit">
            <span v-if="modalLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ modalLoading ? '提交中...' : '确认添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
