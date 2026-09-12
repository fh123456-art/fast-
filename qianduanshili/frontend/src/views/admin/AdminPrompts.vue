<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const modalVisible = ref(false)
const modalLoading = ref(false)
const isEdit = ref(false)
const form = ref({ id: null, name: '', scene: '', template: '' })

const load = async () => {
  loading.value = true
  try {
    list.value = await api.get('/admin/prompts')
  } catch (e) {
    toast(e.message || '模板列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  isEdit.value = false
  form.value = { id: null, name: '', scene: '简历诊断', template: '' }
  modalVisible.value = true
}

const openEdit = (p) => {
  isEdit.value = true
  form.value = { id: p.id, name: p.name, scene: p.scene || '', template: p.template }
  modalVisible.value = true
}

const onSubmit = async () => {
  if (!form.value.name || !form.value.template) {
    toast('请填写模板名称和内容', 'error')
    return
  }
  modalLoading.value = true
  try {
    if (isEdit.value) {
      await api.put(`/admin/prompts/${form.value.id}`, form.value)
      toast('更新成功')
    } else {
      await api.post('/admin/prompts', form.value)
      toast('创建成功')
    }
    modalVisible.value = false
    load()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    modalLoading.value = false
  }
}

const onDelete = async (p) => {
  if (!confirm(`确定删除模板「${p.name}」吗?`)) return
  try {
    await api.delete(`/admin/prompts/${p.id}`)
    toast('删除成功')
    load()
  } catch (e) {
    toast(e.message || '删除失败', 'error')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">AI 模板管理</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-lightbulb-fill me-2" style="color: var(--primary)"></i>AI 模板管理</h3>

    <div class="app-card">
      <div class="d-flex justify-content-between align-items-center">
        <div class="card-title mb-0"><i class="bi bi-list-ul"></i>模板列表</div>
        <button class="btn-gradient" @click="openCreate"><i class="bi bi-plus-circle me-1"></i>新增模板</button>
      </div>
    </div>

    <div class="app-card">
      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无模板,点击右上角新增</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>模板名称</th>
              <th style="width:120px">场景</th>
              <th style="width:200px">内容预览</th>
              <th style="width:180px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list" :key="p.id">
              <td>{{ p.id }}</td>
              <td style="font-weight: 600;">{{ p.name }}</td>
              <td>
                <span v-if="p.scene" class="badge-soft blue">{{ p.scene }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-muted);">
                {{ p.template }}
              </td>
              <td>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" @click="openEdit(p)">
                    <i class="bi bi-pencil"></i> 编辑
                  </button>
                  <button class="btn btn-sm btn-outline-danger" @click="onDelete(p)">
                    <i class="bi bi-trash"></i> 删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalVisible" class="modal-mask" @click.self="modalVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5>
            <i class="bi bi-lightbulb-fill me-2" style="color: var(--primary)"></i>
            {{ isEdit ? '编辑模板' : '新增模板' }}
          </h5>
          <button class="modal-close" @click="modalVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">模板名称 <span class="text-danger">*</span></label>
              <input v-model="form.name" class="form-control" placeholder="如:自我介绍生成">
            </div>
            <div class="col-md-6">
              <label class="form-label">场景</label>
              <select v-model="form.scene" class="form-select">
                <option value="简历诊断">简历诊断</option>
                <option value="岗位匹配">岗位匹配</option>
                <option value="面试打分">面试打分</option>
                <option value="通用">通用</option>
              </select>
            </div>
            <div class="col-12">
              <label class="form-label">模板内容 <span class="text-danger">*</span></label>
              <textarea v-model="form.template" class="form-control" rows="8"
                        placeholder="支持变量:{{ '{{user_name}}' }},{{ '{{job_title}}' }} 等..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="modalVisible = false">取消</button>
          <button class="btn-gradient" :disabled="modalLoading" @click="onSubmit">
            <span v-if="modalLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ modalLoading ? '保存中...' : (isEdit ? '确认更新' : '确认创建') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
