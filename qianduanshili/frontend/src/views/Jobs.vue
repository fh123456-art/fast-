<script setup>
import { ref, computed, onMounted } from 'vue'
import { toast } from '../toast'
import api from '../api'

const list = ref([])
const loading = ref(true)
const filters = ref({ keyword: '', city: '', education: '' })

const load = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.keyword) params.keyword = filters.value.keyword
    if (filters.value.city) params.city = filters.value.city
    if (filters.value.education) params.education = filters.value.education
    const data = await api.get('/jobs', { params })
    list.value = data
  } catch (e) {
    toast(e.message || '岗位加载失败', 'error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const filtered = computed(() => list.value)

const resetFilters = () => {
  filters.value = { keyword: '', city: '', education: '' }
  load()
}

const toggleFav = async (job) => {
  try {
    if (job.collected) {
      await api.delete(`/jobs/${job.id}/collect`)
      job.collected = false
      toast('已取消收藏', 'info')
    } else {
      await api.post(`/jobs/${job.id}/collect`)
      job.collected = true
      toast(`已收藏「${job.title}」`)
    }
  } catch (e) {
    toast(e.message, 'error')
  }
}

// 详情弹窗
const detailVisible = ref(false)
const currentJob = ref(null)
const openDetail = (job) => {
  currentJob.value = job
  detailVisible.value = true
}

// 投递
const applyJob = async (job) => {
  try {
    await api.post('/applications', { job_id: job.id })
    toast(`已投递「${job.title}」,可在投递管理中查看进度`)
  } catch (e) {
    toast(e.message || '投递失败', 'error')
  }
}

// AI 匹配弹窗(调用大模型真实分析)
const matchVisible = ref(false)
const matchLoading = ref(false)
const matchResult = ref(null)
const runAiMatch = async (job) => {
  matchVisible.value = true
  matchLoading.value = true
  matchResult.value = null
  try {
    // 先获取用户默认简历
    const resumes = await api.get('/resumes')
    const defaultResume = resumes.find((r) => r.isDefault) || resumes[0]
    if (!defaultResume) {
      toast('请先创建简历后再进行匹配分析', 'error')
      matchLoading.value = false
      matchVisible.value = false
      return
    }
    const data = await api.post('/ai/match', null, {
      params: { resume_id: defaultResume.id, job_id: job.id },
    })
    matchResult.value = data
  } catch (e) {
    toast(e.message || 'AI 匹配分析失败', 'error')
  } finally {
    matchLoading.value = false
  }
}
const scoreStyle = (score) => ({
  background: `conic-gradient(#4f6ef7 ${score * 3.6}deg, #eef0f5 0deg)`,
})
</script>

<template>
  <div>
    <div class="page-header">
      <h2>岗位大厅</h2>
      <p>多条件搜索心仪岗位,AI 一键分析你的简历与岗位的匹配度</p>
    </div>

    <!-- 筛选栏 -->
    <div class="app-card">
      <div class="row g-3 align-items-end">
        <div class="col-md-4">
          <label class="form-label">关键词</label>
          <input v-model="filters.keyword" class="form-control" placeholder="岗位 / 公司 / 技能,如:前端、Vue" @keyup.enter="load">
        </div>
        <div class="col-md-3">
          <label class="form-label">城市</label>
          <select v-model="filters.city" class="form-select">
            <option value="">全部城市</option>
            <option>广州</option><option>深圳</option><option>杭州</option><option>北京</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">学历要求</label>
          <select v-model="filters.education" class="form-select">
            <option value="">不限</option>
            <option>大专及以上</option><option>本科在读</option><option>本科及以上</option><option>硕士优先</option>
          </select>
        </div>
        <div class="col-md-2 d-flex gap-2">
          <button class="btn-gradient flex-fill" @click="load"><i class="bi bi-search me-1"></i>搜索</button>
          <button class="btn-ghost" @click="resetFilters">重置</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="app-card loading-wrap"><div class="ai-loading"><span class="spinner"></span>岗位加载中...</div></div>

    <!-- 岗位卡片 -->
    <div v-else class="job-grid">
      <div v-for="job in filtered" :key="job.id" class="job-card">
        <button class="fav-btn" :class="{ active: job.collected }" @click="toggleFav(job)">
          <i :class="job.collected ? 'bi-heart-fill' : 'bi-heart'"></i>
        </button>

        <div class="d-flex gap-3">
          <div class="job-logo" :style="{ background: job.logo_color }">{{ job.logo }}</div>
          <div style="min-width: 0">
            <div style="font-weight: 700; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ job.title }}</div>
            <div class="job-salary mt-1">{{ job.salary }}</div>
            <div style="color: var(--text-muted); font-size: 13px">{{ job.company }}</div>
          </div>
        </div>

        <div style="color: var(--text-muted); font-size: 13px; margin: 12px 0 8px">
          <i class="bi bi-geo-alt me-1"></i>{{ job.city }} · {{ job.experience }} · {{ job.education }}
        </div>
        <div>
          <span v-for="t in job.tags.slice(0, 4)" :key="t" class="tag">{{ t }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="d-flex gap-2 mt-3">
          <button class="btn-ghost flex-fill" @click="openDetail(job)"><i class="bi bi-eye me-1"></i>详情</button>
          <button class="btn-gradient flex-fill" @click="applyJob(job)"><i class="bi bi-send me-1"></i>立即投递</button>
        </div>
      </div>
    </div>

    <div v-if="!loading && filtered.length === 0" class="empty-state app-card">
      <i class="bi bi-inbox"></i>
      <p>没有符合条件的岗位,换个筛选条件试试吧</p>
    </div>

    <!-- 岗位详情弹窗 -->
    <div v-if="detailVisible" class="modal-mask" @click.self="detailVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5>岗位详情</h5>
          <button class="modal-close" @click="detailVisible = false">×</button>
        </div>
        <div class="modal-body-x" v-if="currentJob">
          <div class="d-flex gap-3 align-items-center mb-3">
            <div class="job-logo" :style="{ background: currentJob.logo_color, width: '56px', height: '56px', fontSize: '24px' }">{{ currentJob.logo }}</div>
            <div>
              <div style="font-size: 19px; font-weight: 800">{{ currentJob.title }}</div>
              <div><span class="job-salary">{{ currentJob.salary }}</span>
                <span style="color: var(--text-muted); margin-left: 10px; font-size: 13px">{{ currentJob.company }} · {{ currentJob.city }}</span>
              </div>
            </div>
          </div>

          <div class="mb-3">
            <span v-for="t in currentJob.tags" :key="t" class="tag">{{ t }}</span>
          </div>

          <h6 style="font-weight: 700; margin: 16px 0 8px"><i class="bi bi-briefcase me-2" style="color: var(--primary)"></i>岗位职责</h6>
          <p style="color: #4b5563; line-height: 1.9; font-size: 14px">{{ currentJob.description }}</p>

          <h6 style="font-weight: 700; margin: 16px 0 8px"><i class="bi bi-list-check me-2" style="color: var(--primary)"></i>任职要求</h6>
          <ul style="color: #4b5563; line-height: 2; font-size: 14px; padding-left: 20px">
            <li v-for="(r, i) in currentJob.requirements" :key="i">{{ r }}</li>
          </ul>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="runAiMatch(currentJob)"><i class="bi bi-stars me-1"></i>AI简历匹配分析</button>
          <button class="btn-gradient" @click="applyJob(currentJob); detailVisible = false"><i class="bi bi-send me-1"></i>立即投递</button>
        </div>
      </div>
    </div>

    <!-- AI 匹配分析弹窗 -->
    <div v-if="matchVisible" class="modal-mask" @click.self="matchVisible = false">
      <div class="modal-box">
        <div class="modal-header-x">
          <h5><i class="bi bi-stars me-2" style="color: var(--primary)"></i>AI 简历-岗位匹配分析</h5>
          <button class="modal-close" @click="matchVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div v-if="matchLoading" class="loading-wrap">
            <div class="ai-loading"><span class="spinner"></span>AI 正在对比你的简历与岗位要求...</div>
            <div style="color: var(--text-muted); font-size: 13px; margin-top: 10px">正在调用智谱 GLM 大模型:技能匹配 → 学历经验 → 关键词覆盖 → 优化建议</div>
          </div>

          <template v-else-if="matchResult">
            <div class="score-ring mb-3" :style="scoreStyle(matchResult.score)">
              <span class="score-num">{{ matchResult.score }}<span style="font-size: 16px">分</span></span>
            </div>
            <p class="text-center" style="color: var(--text-muted); font-size: 13px; margin-bottom: 18px">
              {{ matchResult.jobTitle }} · {{ matchResult.company }}
            </p>

            <div class="ai-section good mt-3">
              <h6><i class="bi bi-hand-thumbs-up-fill"></i>匹配优势</h6>
              <ul><li v-for="(s, i) in matchResult.matchPoints" :key="i">{{ s }}</li></ul>
            </div>
            <div class="ai-section warn">
              <h6><i class="bi bi-exclamation-triangle-fill"></i>差距项</h6>
              <ul><li v-for="(s, i) in matchResult.gapPoints" :key="i">{{ s }}</li></ul>
            </div>
            <div class="ai-section tip">
              <h6><i class="bi bi-lightbulb-fill"></i>投递前优化建议</h6>
              <ul><li v-for="(s, i) in matchResult.suggestions" :key="i">{{ s }}</li></ul>
            </div>
          </template>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="matchVisible = false">关闭</button>
          <button v-if="matchResult" class="btn-gradient" @click="matchVisible = false; applyJob(currentJob); toast('已采纳建议并投递!')">
            <i class="bi bi-send me-1"></i>采纳建议并投递
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
