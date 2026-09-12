<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import api from '../../api'
import { toast } from '../../toast'

const stats = ref({
  users: 0,
  jobs: 0,
  resumes: 0,
  interviews: 0,
})
const weekly_interviews = ref([])
const weekly_feedbacks = ref([])
const hot_jobs = ref([])
const loading = ref(true)

const chartRef = ref(null)
let chartInstance = null

const load = async () => {
  loading.value = true
  try {
    const data = await api.get('/admin/stats')
    stats.value = data.stats || data
    weekly_interviews.value = data.weekly_interviews || []
    weekly_feedbacks.value = data.weekly_feedbacks || []
    hot_jobs.value = data.hot_jobs || []
    await nextTick()
    initChart()
  } catch (e) {
    toast(e.message || '仪表盘数据加载失败', 'error')
  } finally {
    loading.value = false
  }
}

const initChart = () => {
  if (!chartRef.value || !window.echarts) return
  chartInstance = window.echarts.init(chartRef.value)
  const days = weekly_interviews.value.map((_, i) => `周${'一二三四五六日'.charAt(i % 7)}`)
  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['面试数', '反馈数'], top: 0 },
    grid: { left: 30, right: 20, top: 40, bottom: 30, containLabel: true },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#e5e7eb' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f2f8' } } },
    series: [
      {
        name: '面试数',
        type: 'bar',
        data: weekly_interviews.value,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: '#4f6ef7' },
        barWidth: 18,
      },
      {
        name: '反馈数',
        type: 'bar',
        data: weekly_feedbacks.value,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: '#7c3aed' },
        barWidth: 18,
      },
    ],
  })
}

const onResize = () => chartInstance?.resize()
onMounted(() => {
  load()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chartInstance?.dispose()
})

const statCards = [
  { key: 'users', label: '注册学生', icon: 'bi-people-fill', color: '#4f6ef7' },
  { key: 'jobs', label: '有效岗位', icon: 'bi-briefcase-fill', color: '#10b981' },
  { key: 'resumes', label: '简历数', icon: 'bi-file-earmark-text-fill', color: '#f59e0b' },
  { key: 'interviews', label: '面试次数', icon: 'bi-robot', color: '#7c3aed' },
]
</script>

<template>
  <div>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0" style="background: transparent; padding: 0;">
        <li class="breadcrumb-item"><a href="#/admin/dashboard">管理后台</a></li>
        <li class="breadcrumb-item active" aria-current="page">仪表盘</li>
      </ol>
    </nav>
    <h3 class="mb-3" style="font-weight: 800;"><i class="bi bi-speedometer2 me-2" style="color: var(--primary)"></i>数据概览</h3>

    <div v-if="loading" class="app-card">
      <div class="ai-loading"><span class="spinner"></span>数据加载中...</div>
    </div>

    <template v-else>
      <div class="stat-grid">
        <div v-for="c in statCards" :key="c.key" class="stat-card">
          <div class="stat-icon" :style="{ background: c.color }"><i :class="c.icon"></i></div>
          <div>
            <div class="num">{{ stats[c.key] || 0 }}</div>
            <div class="label">{{ c.label }}</div>
          </div>
        </div>
      </div>

      <div class="chart-grid">
        <div class="app-card">
          <div class="card-title"><i class="bi bi-bar-chart-fill"></i>本周面试 & 反馈趋势</div>
          <div ref="chartRef" class="chart-box"></div>
        </div>
        <div class="app-card">
          <div class="card-title"><i class="bi bi-fire"></i>岗位热度 Top5</div>
          <div v-if="hot_jobs.length === 0" class="empty-state" style="padding: 30px">
            <i class="bi bi-inbox"></i>
            <p>暂无数据</p>
          </div>
          <ul v-else class="list-group list-group-flush">
            <li v-for="(j, i) in hot_jobs" :key="j.id || i"
                class="list-group-item d-flex justify-content-between align-items-center"
                style="padding: 12px 0; border-color: var(--border);">
              <div class="d-flex align-items-center gap-3">
                <span :class="['badge rounded-pill', i < 3 ? 'bg-danger' : 'bg-secondary']"
                      style="width: 24px; height: 24px; display:flex; align-items:center; justify-content:center;">{{ i + 1 }}</span>
                <div>
                  <div style="font-weight: 600;">{{ j.title || j.name }}</div>
                  <div style="color: var(--text-muted); font-size: 12px;">{{ j.company || '' }}</div>
                </div>
              </div>
              <span class="badge-soft blue"><i class="bi bi-fire me-1"></i>{{ j.collects || j.view_count || j.views || 0 }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>
