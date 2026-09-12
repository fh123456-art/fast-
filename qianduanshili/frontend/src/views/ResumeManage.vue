<script setup>
import { ref, onMounted } from 'vue'
import { toast } from '../toast'
import api from '../api'

const list = ref([])
const loading = ref(true)

// 新建/编辑简历弹窗
const editVisible = ref(false)
const editForm = ref({ id: null, filename: '', content: '' })
const saving = ref(false)

// AI 解析弹窗
const aiVisible = ref(false)
const aiLoading = ref(false)
const aiDone = ref(false)
const currentResume = ref(null)
const aiResult = ref({ strengths: [], weaknesses: [], suggestions: [] })

// 预览弹窗
const previewVisible = ref(false)

const load = async () => {
  loading.value = true
  try {
    list.value = await api.get('/resumes')
  } catch (e) {
    toast(e.message || '加载简历失败', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const openCreate = () => {
  editForm.value = { id: null, filename: '', content: '' }
  uploadHint.value = ''
  editVisible.value = true
}

const openEdit = (resume) => {
  editForm.value = {
    id: resume.id,
    filename: resume.name || '',
    content: resume.content || '',
  }
  uploadHint.value = ''
  editVisible.value = true
}

const saveResume = async () => {
  const content = (editForm.value.content || '').trim()
  if (content.length < 10) {
    toast('简历内容至少 10 个字符', 'error')
    return
  }
  saving.value = true
  try {
    const payload = { filename: editForm.value.filename || '我的简历', content }
    if (editForm.value.id) {
      await api.put(`/resumes/${editForm.value.id}`, payload)
    } else {
      await api.post('/resumes', payload)
    }
    toast('简历保存成功')
    editVisible.value = false
    load()
  } catch (e) {
    toast(e.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const runAiParse = async (resume) => {
  currentResume.value = resume
  aiVisible.value = true
  aiLoading.value = true
  aiDone.value = false
  try {
    const data = await api.post(`/ai/resumes/${resume.id}/parse`)
    aiResult.value = data
    currentResume.value = { ...resume, status: '已解析', parsed: data.parsed }
    aiDone.value = true
    load()
  } catch (e) {
    toast(e.message || 'AI 解析失败', 'error')
    aiVisible.value = false
  } finally {
    aiLoading.value = false
  }
}

const setDefault = async (resume) => {
  try {
    await api.post(`/resumes/${resume.id}/default`)
    toast(`已将「${resume.name}」设为默认简历`)
    load()
  } catch (e) {
    toast(e.message, 'error')
  }
}

const removeResume = async (resume) => {
  if (!confirm(`确定删除简历「${resume.name}」吗?`)) return
  try {
    await api.delete(`/resumes/${resume.id}`)
    toast('删除成功')
    load()
  } catch (e) {
    toast(e.message, 'error')
  }
}

const preview = (resume) => {
  currentResume.value = resume
  previewVisible.value = true
}

// ============ 文件上传:图片截图/PDF 自动提取简历文本 ============
const uploading = ref(false)
const uploadHint = ref('')
const fileInput = ref(null)
const dragOver = ref(false)

const triggerUpload = () => fileInput.value?.click()

const onFileChange = async (e) => {
  const f = e.target.files?.[0]
  if (f) await doUpload(f)
  e.target.value = '' // 允许重复选同一文件
}

const onDrop = async (e) => {
  e.preventDefault()
  dragOver.value = false
  const f = e.dataTransfer.files?.[0]
  if (f) await doUpload(f)
}

const doUpload = async (file) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
    toast('仅支持 jpg/jpeg/png/pdf 格式', 'error')
    return
  }
  if (file.size > 15 * 1024 * 1024) {
    toast('文件不能超过 15MB', 'error')
    return
  }
  uploading.value = true
  uploadHint.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('filename', file.name)
    const data = await api.post('/resumes/upload', fd)
    // 上传已创建简历记录,把 id/filename/content 填入,后续「保存简历」走 PUT 更新文本
    editForm.value.id = data.id
    editForm.value.filename = data.filename
    editForm.value.content = data.content
    uploadHint.value = `提取成功(${data.filetype}),可校对文本后点击保存`
    toast('简历内容提取成功,可校对后保存')
  } catch (e) {
    toast(e.message || '上传提取失败', 'error')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>简历管理</h2>
      <p>直接输入简历文本内容,AI 自动解析提取关键信息并给出优化建议</p>
    </div>

    <!-- 新建简历入口 -->
    <div class="app-card">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <div style="font-size: 16px; font-weight: 700">创建 / 管理简历</div>
          <div style="color: var(--text-muted); font-size: 13px; margin-top: 4px">
            输入你的简历文本(姓名、教育、技能、经历等),AI 将智能解析并诊断
          </div>
        </div>
        <button class="btn-gradient" @click="openCreate">
          <i class="bi bi-plus-lg me-1"></i>新建简历
        </button>
      </div>
    </div>

    <!-- 简历列表 -->
    <div class="app-card">
      <div class="card-title"><i class="bi bi-files"></i>我的简历({{ list.length }} 份)</div>

      <div v-if="loading" class="loading-wrap"><div class="ai-loading"><span class="spinner"></span>加载中...</div></div>
      <div v-else-if="list.length === 0" class="empty-state">
        <i class="bi bi-file-earmark-x"></i>
        <p>还没有简历,点击上方「新建简历」创建第一份吧</p>
      </div>

      <div v-for="r in list" :key="r.id" class="resume-row">
        <div class="resume-file-icon" style="background: #4f6ef7">
          <i class="bi bi-file-text-fill"></i>
        </div>
        <div style="flex: 1; min-width: 0">
          <div style="font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
            {{ r.name }}
            <span v-if="r.isDefault" class="badge-soft green"><i class="bi bi-star-fill"></i>默认</span>
            <span class="badge-soft" :class="r.status === '已解析' ? 'green' : 'orange'">
              {{ r.status === '已解析' ? '✓ 已解析' : '待解析' }}
            </span>
          </div>
          <div style="color: var(--text-muted); font-size: 12.5px; margin-top: 4px">
            更新于 {{ r.updatedAt }} · {{ (r.content || '').length }} 字
            <template v-if="r.parsed"> · {{ r.parsed.school }} · {{ r.parsed.major }}</template>
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap" style="justify-content: flex-end">
          <button class="btn-sm-soft" style="color: var(--primary); border-color: var(--primary)" @click="runAiParse(r)">
            <i class="bi bi-stars me-1"></i>AI解析
          </button>
          <button class="btn-sm-soft" @click="preview(r)"><i class="bi bi-eye me-1"></i>预览</button>
          <button class="btn-sm-soft" @click="openEdit(r)"><i class="bi bi-pencil me-1"></i>编辑</button>
          <button v-if="!r.isDefault" class="btn-sm-soft" @click="setDefault(r)"><i class="bi bi-star me-1"></i>设默认</button>
          <button class="btn-sm-soft danger" @click="removeResume(r)"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>

    <!-- 新建/编辑简历弹窗 -->
    <div v-if="editVisible" class="modal-mask" @click.self="editVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5><i class="bi bi-file-earmark-text me-2" style="color: var(--primary)"></i>{{ editForm.id ? '编辑简历' : '新建简历' }}</h5>
          <button class="modal-close" @click="editVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div class="mb-3">
            <label class="form-label">简历名称</label>
            <input v-model="editForm.filename" class="form-control" placeholder="如:前端开发简历_默认版">
          </div>

          <!-- 上传简历附件:仅新建模式显示,上传后 AI 自动提取文本填入下方 -->
          <div v-if="!editForm.id" class="mb-3">
            <label class="form-label">或上传简历附件(PDF / 截图,AI 自动提取文本)</label>
            <div class="upload-zone" :class="{ drag: dragOver }"
                 @click="triggerUpload"
                 @dragover.prevent="dragOver = true"
                 @dragleave.prevent="dragOver = false"
                 @drop="onDrop">
              <input ref="fileInput" type="file" accept=".jpg,.jpeg,.png,.pdf" style="display:none" @change="onFileChange">
              <div v-if="uploading" class="ai-loading"><span class="spinner"></span>AI 正在识别简历内容,提取文本中(图片可能需 10-30 秒)...</div>
              <div v-else>
                <i class="bi bi-cloud-arrow-up-fill" style="font-size: 30px; color: var(--primary)"></i>
                <div style="margin-top: 6px; font-weight: 600">点击或拖拽上传简历</div>
                <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px">支持 jpg / png / pdf,单文件 ≤ 15MB</div>
              </div>
            </div>
            <div v-if="uploadHint" style="color: #2a9d8f; font-size: 12.5px; margin-top: 6px">
              <i class="bi bi-check-circle-fill me-1"></i>{{ uploadHint }}
            </div>
          </div>

          <div>
            <label class="form-label">简历内容(可粘贴输入,或上传后在此校对提取的文本)</label>
            <textarea v-model="editForm.content" class="form-control" rows="14"
              placeholder="在此输入你的简历内容,例如:&#10;&#10;姓名:张三&#10;电话:138xxxx8888&#10;邮箱:zhangsan@example.com&#10;学校:华南理工大学&#10;专业:软件工程&#10;学历:本科&#10;&#10;技能:&#10;Vue, JavaScript, TypeScript, Node.js, MySQL, Git...&#10;&#10;实习经历:&#10;2025.06-2025.09 某互联网公司 前端开发实习生&#10;- 负责管理后台 Vue3 项目开发&#10;- 优化页面加载速度提升 40%&#10;..."></textarea>
            <div style="color: var(--text-muted); font-size: 12px; margin-top: 4px">
              已输入 {{ (editForm.content || '').length }} 字,建议包含姓名/学校/专业/技能/经历等关键信息
            </div>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="editVisible = false">取消</button>
          <button class="btn-gradient" :disabled="saving" @click="saveResume">
            <i class="bi bi-check-lg me-1"></i>{{ saving ? '保存中...' : '保存简历' }}
          </button>
        </div>
      </div>
    </div>

    <!-- AI 解析结果弹窗 -->
    <div v-if="aiVisible" class="modal-mask" @click.self="aiVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5><i class="bi bi-stars me-2" style="color: var(--primary)"></i>AI 简历解析与优化建议</h5>
          <button class="modal-close" @click="aiVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div v-if="aiLoading" class="loading-wrap">
            <div class="ai-loading">
              <span class="spinner"></span>
              AI 正在解析简历内容,提取关键信息并生成优化建议...
            </div>
            <div style="color: var(--text-muted); font-size: 13px; margin-top: 10px">
              正在调用智谱 GLM 大模型:简历结构识别 → 信息抽取 → 诊断建议生成
            </div>
          </div>

          <template v-else-if="aiDone && currentResume?.parsed">
            <div class="ai-section tip">
              <h6><i class="bi bi-file-earmark-break-fill"></i>解析结果(结构化信息)</h6>
              <div class="row g-2" style="font-size: 13.5px">
                <div class="col-md-6"><b>姓名:</b>{{ currentResume.parsed.name }}</div>
                <div class="col-md-6"><b>学历:</b>{{ currentResume.parsed.degree }}</div>
                <div class="col-md-6"><b>学校:</b>{{ currentResume.parsed.school }}</div>
                <div class="col-md-6"><b>专业:</b>{{ currentResume.parsed.major }}</div>
                <div class="col-md-6"><b>电话:</b>{{ currentResume.parsed.phone }}</div>
                <div class="col-md-6"><b>邮箱:</b>{{ currentResume.parsed.email }}</div>
                <div class="col-12"><b>技能标签:</b>
                  <span v-for="s in currentResume.parsed.skills" :key="s" class="tag">{{ s }}</span>
                </div>
                <div class="col-12"><b>经历:</b>{{ currentResume.parsed.experience }}</div>
              </div>
            </div>

            <div class="ai-section good">
              <h6><i class="bi bi-hand-thumbs-up-fill"></i>简历优势</h6>
              <ul><li v-for="(s, i) in aiResult.strengths" :key="i">{{ s }}</li></ul>
            </div>
            <div class="ai-section warn">
              <h6><i class="bi bi-exclamation-triangle-fill"></i>待改进点</h6>
              <ul><li v-for="(s, i) in aiResult.weaknesses" :key="i">{{ s }}</li></ul>
            </div>
            <div class="ai-section tip">
              <h6><i class="bi bi-lightbulb-fill"></i>AI 优化建议</h6>
              <ul><li v-for="(s, i) in aiResult.suggestions" :key="i">{{ s }}</li></ul>
            </div>
          </template>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="aiVisible = false">关闭</button>
          <button v-if="aiDone" class="btn-gradient" @click="aiVisible = false; openEdit(currentResume)">
            <i class="bi bi-pencil me-1"></i>去完善简历
          </button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="previewVisible" class="modal-mask" @click.self="previewVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5><i class="bi bi-eye me-2" style="color: var(--primary)"></i>简历预览</h5>
          <button class="modal-close" @click="previewVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div style="font-weight: 700; margin-bottom: 10px">{{ currentResume?.name }}</div>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: var(--text); background: #fafbff; border: 1px solid var(--border); border-radius: 10px; padding: 16px">
            {{ currentResume?.content || '该简历暂无文本内容' }}
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-gradient" @click="previewVisible = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 简历上传区:可点击 + 可拖拽 */
.upload-zone {
  border: 2px dashed var(--border, #d8def0);
  border-radius: 12px;
  padding: 22px;
  text-align: center;
  cursor: pointer;
  background: #fafbff;
  transition: all 0.18s;
}
.upload-zone:hover,
.upload-zone.drag {
  border-color: var(--primary, #4f6ef7);
  background: #eef2ff;
}
.upload-zone .ai-loading {
  justify-content: center;
}
</style>
