<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { schedules } from '../mock/data'
import { toast } from '../toast'
import api from '../api'

const list = ref([])
const loading = ref(true)

const load = async () => {
  try {
    list.value = await api.get('/applications')
  } catch (e) {
    toast(e.message || '加载失败', 'error')
  } finally {
    loading.value = false
  }
}

// 统计数据:从真实投递记录计算
const stats = computed(() => [
  { label: '累计投递', num: list.value.length, icon: 'bi-send-fill', color: 'linear-gradient(135deg,#4f6ef7,#7c3aed)' },
  { label: '面试中', num: list.value.filter((a) => a.step === 3).length, icon: 'bi-chat-dots-fill', color: 'linear-gradient(135deg,#f59e0b,#f97316)' },
  { label: '已拿 Offer', num: list.value.filter((a) => a.step >= 4).length, icon: 'bi-trophy-fill', color: 'linear-gradient(135deg,#10b981,#059669)' },
  { label: '待反馈', num: list.value.filter((a) => a.step <= 1).length, icon: 'bi-hourglass-split', color: 'linear-gradient(135deg,#64748b,#475569)' },
])

onMounted(async () => {
  await load()
  await nextTick()
  initCharts()
  window.addEventListener('resize', resizeCharts)
})

let lineChart = null
let pieChart = null

function initCharts() {
  if (!window.echarts) return
  const lineEl = document.getElementById('trendChart')
  const pieEl = document.getElementById('statusChart')
  if (lineEl) {
    lineChart = echarts.init(lineEl)
    lineChart.setOption({
      title: { text: '近 6 个月投递趋势', textStyle: { fontSize: 14, fontWeight: 700 }, left: 0, top: 0 },
      tooltip: { trigger: 'axis' },
      grid: { left: 36, right: 20, top: 44, bottom: 28 },
      xAxis: {
        type: 'category',
        data: ['4月', '5月', '6月', '7月', '8月', '9月'],
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#9ca3af' },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af' } },
      series: [
        {
          name: '投递数',
          data: [1, 2, 1, 3, 4, 1],
          type: 'line',
          smooth: true,
          symbolSize: 8,
          lineStyle: { width: 3, color: '#4f6ef7' },
          itemStyle: { color: '#4f6ef7' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79,110,247,0.28)' },
              { offset: 1, color: 'rgba(79,110,247,0.02)' },
            ]),
          },
        },
      ],
    })
  }
  if (pieEl) {
    pieChart = echarts.init(pieEl)
    pieChart.setOption({
      title: { text: '投递状态分布', textStyle: { fontSize: 14, fontWeight: 700 }, left: 0, top: 0 },
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, icon: 'circle', textStyle: { fontSize: 12, color: '#6b7280' } },
      color: ['#4f6ef7', '#10b981', '#f59e0b', '#94a3b8', '#ef4444'],
      series: [
        {
          type: 'pie',
          radius: ['46%', '70%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: [
            { value: 3, name: '简历筛选' },
            { value: 2, name: '笔试' },
            { value: 2, name: '面试中' },
            { value: 1, name: 'Offer' },
            { value: 4, name: '已投递' },
          ],
        },
      ],
    })
  }
}

function resizeCharts() {
  lineChart?.resize()
  pieChart?.resize()
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>求职投递管理</h2>
      <p>追踪投递进度状态,查看个人求职数据看板与笔面提醒</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card">
        <div class="stat-icon" :style="{ background: s.color }"><i :class="s.icon"></i></div>
        <div>
          <div class="num">{{ s.num }}</div>
          <div class="label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="chart-grid">
      <div class="app-card">
        <div id="trendChart" class="chart-box"></div>
      </div>
      <div class="app-card">
        <div id="statusChart" class="chart-box"></div>
      </div>
    </div>

    <!-- 笔面提醒 -->
    <div class="app-card">
      <div class="card-title"><i class="bi bi-calendar-event-fill"></i>求职日历 · 笔面提醒</div>
      <div v-for="s in schedules" :key="s.id" class="d-flex align-items-center gap-3 py-2"
           style="border-bottom: 1px dashed var(--border)">
        <div class="resume-file-icon" :style="{ background: s.type === '面试' ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' : 'linear-gradient(135deg,#f59e0b,#f97316)', width: '40px', height: '40px', fontSize: '17px' }">
          <i :class="s.type === '面试' ? 'bi-chat-dots-fill' : 'bi-pencil-square'"></i>
        </div>
        <div style="flex: 1">
          <div style="font-weight: 600">{{ s.title }}</div>
          <div style="color: var(--text-muted); font-size: 12.5px">
            <i class="bi bi-clock me-1"></i>{{ s.time }} · {{ s.online ? '线上进行' : '线下到场' }}
          </div>
        </div>
        <span class="badge-soft" :class="s.type === '面试' ? 'blue' : 'orange'">{{ s.type }}</span>
      </div>
    </div>

    <!-- 投递记录 -->
    <div class="app-card">
      <div class="card-title"><i class="bi bi-send-check-fill"></i>投递记录({{ list.length }})</div>

      <div v-for="a in list" :key="a.id" style="border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; margin-bottom: 14px">
        <div class="d-flex align-items-center gap-3">
          <div class="job-logo" :style="{ background: a.logoColor, width: '42px', height: '42px', fontSize: '17px' }">{{ a.logo }}</div>
          <div style="flex: 1; min-width: 0">
            <div style="font-weight: 700">{{ a.jobTitle }}
              <span class="job-salary ms-2" style="font-size: 14px">{{ a.salary }}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 12.5px; margin-top: 2px">
              {{ a.company }} · 投递于 {{ a.appliedAt }} · 使用简历:{{ a.resumeName }}
            </div>
          </div>
          <span class="badge-soft" :class="a.step >= 4 ? 'green' : a.step >= 2 ? 'blue' : 'gray'">
            {{ a.step >= 4 ? '🎉 已拿 Offer' : a.steps[a.step] }}
          </span>
        </div>

        <!-- 状态步骤条 -->
        <div class="steps">
          <template v-for="(label, i) in a.steps" :key="i">
            <div class="step-item" :class="{ done: i < a.step, current: i === a.step }">
              <div class="step-dot">
                <i v-if="i < a.step" class="bi bi-check-lg"></i>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <span class="step-label">{{ label }}</span>
            </div>
            <div v-if="i < a.steps.length - 1" class="step-line" :class="{ done: i < a.step }"></div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
