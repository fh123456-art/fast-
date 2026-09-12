<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const list = ref([])
const loading = ref(true)
const keyword = ref('')
const modalVisible = ref(false)
const modalLoading = ref(false)
const form = ref({
  title: '', company: '', salary: '', city: '', education: '', experience: '',
  description: '', requirements: '', tags: '',
})

const load = async () => {
  loading.value = true
  try {
    const params = {}
    if (keyword.value) params.keyword = keyword.value
    list.value = await api.get('/admin/jobs', { params })
  } catch (e) {
    toast(e.message || '岗位列表加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const toggleOnline = async (job) => {
  try {
    await api.post(`/admin/jobs/${job.id}/toggle`)
    job.status = job.status === 'online' ? 'offline' : 'online'
    toast(job.status === 'online' ? '已上线' : '已下线')
  } catch (e) {
    toast(e.message || '操作失败', 'error')
  }
}

const openCreate = () => {
  form.value = {
    title: '', company: '', salary: '', city: '', education: '', experience: '',
    description: '', requirements: '', tags: '',
  }
  modalVisible.value = true
}

const onSubmit = async () => {
  if (!form.value.title || !form.value.company) {
    toast('请填写岗位名称和公司名称', 'error')
    return
  }
  modalLoading.value = true
  try {
    await api.post('/admin/jobs', form.value)
    toast('岗位创建成功')
    modalVisible.value = false
    load()
  } catch (e) {
    toast(e.message || '创建失败', 'error')
  } finally {
    modalLoading.value = false
  }
}

const onSearch = () => load()
const onReset = () => { keyword.value = ''; load() }

// ============ 批量导入岗位 ============
const importVisible = ref(false)
const importing = ref(false)
const importFile = ref(null)
const importResult = ref(null)

const openImport = () => {
  importFile.value = null
  importResult.value = null
  importVisible.value = true
}

// 下载导入模板(接口需要登录 token,用 axios 拿 blob 再触发下载)
const downloadTemplate = async () => {
  try {
    const blob = await api.get('/admin/jobs/template', { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '岗位导入模板.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast(e.message || '模板下载失败', 'error')
  }
}

const onFilePick = (e) => {
  importFile.value = e.target.files?.[0] || null
  importResult.value = null
}

const doImport = async () => {
  if (!importFile.value) {
    toast('请先选择填好的 Excel/CSV 文件', 'error')
    return
  }
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', importFile.value)
    const data = await api.post('/admin/jobs/batch', fd)
    importResult.value = data
    toast(data.msg || '导入完成')
    load()
  } catch (e) {
    toast(e.message || '导入失败', 'error')
  } finally {
    importing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">岗位管理</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-briefcase-fill me-2" style="color: var(--primary)"></i>岗位管理</h3>

    <div class="app-card">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label">关键字</label>
          <input v-model="keyword" class="form-control" placeholder="岗位/公司" @keyup.enter="onSearch">
        </div>
        <div class="col-md-auto d-flex gap-2">
          <button class="btn-gradient" @click="onSearch"><i class="bi bi-search me-1"></i>搜索</button>
          <button class="btn-ghost" @click="onReset">重置</button>
        </div>
        <div class="col-md-auto ms-auto d-flex gap-2">
          <button class="btn-ghost" @click="openImport"><i class="bi bi-file-earmark-arrow-up me-1"></i>批量导入</button>
          <button class="btn-gradient" @click="openCreate"><i class="bi bi-plus-circle me-1"></i>发布岗位</button>
        </div>
      </div>
    </div>

    <div class="app-card">
      <div class="card-title"><i class="bi bi-list-ul"></i>岗位列表</div>

      <div v-if="loading" class="loading-wrap">
        <div class="ai-loading"><span class="spinner"></span>加载中...</div>
      </div>

      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-inbox"></i>
        <p>暂无岗位</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead style="background: #f8faff;">
            <tr>
              <th style="width:60px">ID</th>
              <th>岗位名称</th>
              <th>公司</th>
              <th>薪资</th>
              <th>城市</th>
              <th>浏览</th>
              <th style="width:100px">状态</th>
              <th style="width:140px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in list" :key="j.id">
              <td>{{ j.id }}</td>
              <td style="font-weight: 600;">{{ j.title }}</td>
              <td>{{ j.company }}</td>
              <td style="color: var(--orange); font-weight: 700;">{{ j.salary || '-' }}</td>
              <td>{{ j.city || '-' }}</td>
              <td>{{ j.collects || 0 }}</td>
              <td>
                <span v-if="j.status === 'online'" class="badge-soft green">
                  <i class="bi bi-circle-fill" style="font-size:6px"></i> 已上线
                </span>
                <span v-else class="badge-soft gray">
                  <i class="bi bi-circle-fill" style="font-size:6px"></i> 已下线
                </span>
              </td>
              <td>
                <button
                  :class="['btn btn-sm', j.status === 'online' ? 'btn-outline-warning' : 'btn-outline-success']"
                  @click="toggleOnline(j)">
                  <i :class="j.status === 'online' ? 'bi bi-pause-circle' : 'bi bi-play-circle'"></i>
                  {{ j.status === 'online' ? '下线' : '上线' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalVisible" class="modal-mask" @click.self="modalVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5><i class="bi bi-plus-circle me-2" style="color: var(--primary)"></i>发布新岗位</h5>
          <button class="modal-close" @click="modalVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">岗位名称 <span class="text-danger">*</span></label>
              <input v-model="form.title" class="form-control" placeholder="如:前端开发工程师">
            </div>
            <div class="col-md-6">
              <label class="form-label">公司名称 <span class="text-danger">*</span></label>
              <input v-model="form.company" class="form-control" placeholder="如:字节跳动">
            </div>
            <div class="col-md-4">
              <label class="form-label">薪资范围</label>
              <input v-model="form.salary" class="form-control" placeholder="如:15-25K">
            </div>
            <div class="col-md-4">
              <label class="form-label">城市</label>
              <input v-model="form.city" class="form-control" placeholder="如:深圳">
            </div>
            <div class="col-md-4">
              <label class="form-label">经验要求</label>
              <input v-model="form.experience" class="form-control" placeholder="如:1-3年">
            </div>
            <div class="col-md-6">
              <label class="form-label">学历要求</label>
              <input v-model="form.education" class="form-control" placeholder="如:本科">
            </div>
            <div class="col-md-6">
              <label class="form-label">标签(逗号分隔)</label>
              <input v-model="form.tags" class="form-control" placeholder="如:Vue,React,TypeScript">
            </div>
            <div class="col-12">
              <label class="form-label">岗位职责</label>
              <textarea v-model="form.description" class="form-control" rows="3" placeholder="请输入岗位职责描述"></textarea>
            </div>
            <div class="col-12">
              <label class="form-label">任职要求</label>
              <textarea v-model="form.requirements" class="form-control" rows="3" placeholder="请输入任职要求,每行一条"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="modalVisible = false">取消</button>
          <button class="btn-gradient" :disabled="modalLoading" @click="onSubmit">
            <span v-if="modalLoading" class="spinner-border spinner-border-sm me-2"></span>
            {{ modalLoading ? '提交中...' : '确认发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 批量导入岗位弹窗 -->
    <div v-if="importVisible" class="modal-mask" @click.self="importVisible = false">
      <div class="modal-box">
        <div class="modal-header-x">
          <h5><i class="bi bi-file-earmark-arrow-up me-2" style="color: var(--primary)"></i>批量导入岗位</h5>
          <button class="modal-close" @click="importVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div class="mb-3" style="background: #f8faff; border: 1px solid var(--border); border-radius: 10px; padding: 14px; font-size: 13px; line-height: 1.9">
            <b>使用步骤:</b><br>
            1. 先下载 Excel 模板,按列填写(岗位名称、公司名称必填);<br>
            2. 标签多个用逗号分隔(如 Vue,React),任职要求每行一条;<br>
            3. 保存后选择文件,点「开始导入」,一次可批量发布几十个岗位。
          </div>
          <button class="btn-ghost mb-3" @click="downloadTemplate">
            <i class="bi bi-download me-1"></i>下载导入模板(.xlsx)
          </button>
          <div>
            <label class="form-label">选择填好的文件(.xlsx / .csv)</label>
            <input type="file" class="form-control" accept=".xlsx,.xls,.csv" @change="onFilePick">
          </div>
          <div v-if="importResult" style="margin-top: 14px; font-size: 13.5px">
            <div style="color: #2a9d8f; font-weight: 700">
              <i class="bi bi-check-circle-fill me-1"></i>{{ importResult.msg }}
            </div>
            <div v-if="importResult.skipped_count" style="margin-top: 8px; color: var(--orange)">
              以下 {{ importResult.skipped_count }} 行被跳过:
              <ul style="margin-top: 4px">
                <li v-for="s in importResult.skipped" :key="s.row">第 {{ s.row }} 行:{{ s.reason }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="importVisible = false">关闭</button>
          <button class="btn-gradient" :disabled="importing" @click="doImport">
            <span v-if="importing" class="spinner-border spinner-border-sm me-2"></span>
            {{ importing ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
