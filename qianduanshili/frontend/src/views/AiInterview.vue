<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { toast } from '../toast'
import api from '../api'

// 岗位列表(从后端拉取)
const jobs = ref([])
const selectedJob = ref(null)
const mode = ref('技术面')
const configLoading = ref(true)

// 会话状态
const chatVisible = ref(false)
const messages = ref([])
const inputText = ref('')
const typing = ref(false)
const chatBox = ref(null)
let currentSessionId = null
let currentJobTitle = ''

// 历史记录
const history = ref([])
const historyLoading = ref(false)

// 报告弹窗
const reportVisible = ref(false)
const reportData = ref(null)
const reportLoading = ref(false)

// 初始化:加载岗位 + 历史记录
onMounted(async () => {
  try {
    const jobList = await api.get('/jobs')
    jobs.value = jobList
    if (jobList.length > 0) selectedJob.value = jobList[0].id
  } catch (e) {
    toast(e.message || '加载岗位失败', 'error')
  } finally {
    configLoading.value = false
  }
  loadHistory()
})

const loadHistory = async () => {
  historyLoading.value = true
  try {
    history.value = await api.get('/interview/sessions')
  } catch (e) {
    // 静默失败
  } finally {
    historyLoading.value = false
  }
}

const scrollBottom = async () => {
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

const startInterview = async () => {
  const job = jobs.value.find((j) => j.id === selectedJob.value)
  if (!job) {
    toast('请先选择岗位', 'error')
    return
  }
  currentJobTitle = job.title
  messages.value = []
  chatVisible.value = true
  typing.value = true
  try {
    const data = await api.post('/interview/sessions', null, {
      params: { job_id: selectedJob.value, mode: mode.value },
    })
    currentSessionId = data.sessionId
    messages.value.push({ role: 'hr', text: data.content })
    await scrollBottom()
  } catch (e) {
    toast(e.message || '面试启动失败', 'error')
    chatVisible.value = false
  } finally {
    typing.value = false
  }
}

const sendMsg = async () => {
  const text = inputText.value.trim()
  if (!text || typing.value) return
  messages.value.push({ role: 'me', text })
  inputText.value = ''
  typing.value = true
  await scrollBottom()

  try {
    const data = await api.post(
      `/interview/sessions/${currentSessionId}/message`,
      { content: text }
    )

    if (data.ended) {
      // 面试结束,显示报告
      typing.value = false
      chatVisible.value = false
      reportData.value = data.report
      reportVisible.value = true
      loadHistory()
    } else {
      // 显示 AI 评分提示 + 追问
      if (data.suggestion) {
        messages.value.push({
          role: 'score',
          score: data.score,
          suggestion: data.suggestion,
        })
      }
      messages.value.push({ role: 'hr', text: data.content })
      await scrollBottom()
    }
  } catch (e) {
    toast(e.message || '发送失败,请重试', 'error')
  } finally {
    typing.value = false
  }
}

const viewReport = async (session) => {
  reportLoading.value = true
  reportVisible.value = true
  reportData.value = null
  try {
    const data = await api.get(`/interview/sessions/${session.id}`)
    reportData.value = data.report || {
      grade: '?',
      totalScore: session.score || 0,
      questionsAnswered: 0,
      mode: session.mode,
      strengths: [],
      weaknesses: [],
      suggestions: ['该面试报告数据不完整'],
    }
  } catch (e) {
    toast(e.message || '报告加载失败', 'error')
  } finally {
    reportLoading.value = false
  }
}

const endInterview = async () => {
  if (!confirm('确定结束本次面试?结束后将生成 AI 评估报告')) return
  chatVisible.value = false
  // 重新加载会话详情看报告
  if (currentSessionId) {
    reportLoading.value = true
    reportVisible.value = true
    reportData.value = null
    try {
      const data = await api.get(`/interview/sessions/${currentSessionId}`)
      if (data.report) {
        reportData.value = data.report
      } else {
        reportData.value = {
          grade: '?',
          totalScore: data.score || 0,
          questionsAnswered: data.messages?.filter(m => m.role === 'user').length || 0,
          mode: data.mode,
          strengths: ['面试已结束'],
          weaknesses: ['未生成完整报告'],
          suggestions: ['可重新开始一场面试获取完整评估'],
        }
      }
    } catch (e) {
      toast(e.message || '报告加载失败', 'error')
    } finally {
      reportLoading.value = false
    }
    loadHistory()
  }
}

const deleteHistory = async (session) => {
  if (!confirm(`确定删除这场面试记录吗?`)) return
  try {
    await api.delete(`/interview/sessions/${session.id}`)
    toast('删除成功')
    loadHistory()
  } catch (e) {
    toast(e.message, 'error')
  }
}

const scoreStyle = (score) => ({
  background: `conic-gradient(#4f6ef7 ${score * 3.6}deg, #eef0f5 0deg)`,
})

const gradeColor = (grade) => {
  if (grade === 'A') return '#10b981'
  if (grade === 'B') return '#4f6ef7'
  if (grade === 'C') return '#f59e0b'
  return '#ef4444'
}
</script>

<template>
  <div>
    <div class="page-header">
      <h2>AI 模拟面试</h2>
      <p>选择岗位与面试模式,AI 面试官将基于大模型进行真实多轮对话面试,结束后生成结构化评估报告</p>
    </div>

    <div class="row g-4">
      <!-- 左:开始面试 -->
      <div class="col-lg-5">
        <div class="app-card">
          <div class="card-title"><i class="bi bi-rocket-takeoff-fill"></i>开启模拟面试</div>

          <label class="form-label">选择目标岗位</label>
          <select v-model="selectedJob" class="form-select mb-3" :disabled="configLoading">
            <option v-for="j in jobs" :key="j.id" :value="j.id">{{ j.title }} · {{ j.company }}</option>
          </select>

          <label class="form-label">面试模式</label>
          <div class="d-flex gap-2 mb-4">
            <button
              class="btn-ghost flex-fill"
              :style="mode === 'HR面' ? { background: 'var(--gradient)', color: '#fff', borderColor: 'transparent' } : {}"
              @click="mode = 'HR面'"
            >
              <i class="bi bi-person-badge me-1"></i>HR 面
            </button>
            <button
              class="btn-ghost flex-fill"
              :style="mode === '技术面' ? { background: 'var(--gradient)', color: '#fff', borderColor: 'transparent' } : {}"
              @click="mode = '技术面'"
            >
              <i class="bi bi-code-slash me-1"></i>技术面
            </button>
          </div>

          <button class="btn-gradient w-100" style="padding: 12px" @click="startInterview">
            <i class="bi bi-play-fill me-1"></i>开始面试
          </button>

          <div style="background: var(--gradient-soft); border-radius: 12px; padding: 12px 14px; margin-top: 16px; font-size: 12.5px; color: var(--text-muted); line-height: 1.8">
            <i class="bi bi-info-circle me-1" style="color: var(--primary)"></i>
            面试由智谱 GLM 大模型驱动,AI 会根据你的回答真实评分并动态追问;共 8 轮问答,结束后生成评估报告。
          </div>
        </div>
      </div>

      <!-- 右:历史记录 -->
      <div class="col-lg-7">
        <div class="app-card">
          <div class="card-title"><i class="bi bi-clock-history"></i>历史面试记录</div>

          <div v-if="historyLoading" class="loading-wrap">
            <div class="ai-loading"><span class="spinner"></span>加载中...</div>
          </div>
          <div v-else>
            <div v-for="h in history" :key="h.id" class="resume-row">
              <div class="resume-file-icon" :style="{ background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)' }">
                <i class="bi bi-robot"></i>
              </div>
              <div style="flex: 1; min-width: 0">
                <div style="font-weight: 700">{{ h.jobTitle || '通用面试' }}</div>
                <div style="color: var(--text-muted); font-size: 12.5px; margin-top: 3px">
                  {{ h.mode }} · {{ h.startedAt }} · {{ h.status }}
                </div>
              </div>
              <div class="text-center me-2">
                <div style="font-size: 22px; font-weight: 800" :style="{ color: h.score >= 85 ? '#10b981' : h.score >= 70 ? '#4f6ef7' : '#f59e0b' }">{{ h.score }}</div>
                <div style="font-size: 11px; color: var(--text-light)">综合评分</div>
              </div>
              <button class="btn-sm-soft" @click="viewReport(h)"><i class="bi bi-file-earmark-bar-graph me-1"></i>查看报告</button>
              <button class="btn-sm-soft danger" @click="deleteHistory(h)"><i class="bi bi-trash"></i></button>
            </div>

            <div v-if="history.length === 0" class="empty-state">
              <i class="bi bi-chat-square-dots"></i>
              <p>还没有面试记录,快去开启第一场模拟面试吧</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 面试对话弹窗 -->
    <div v-if="chatVisible" class="modal-mask" @click.self="endInterview">
      <div class="modal-box lg" style="max-width: 760px">
        <div class="modal-header-x">
          <h5>
            <i class="bi bi-robot me-2" style="color: var(--primary)"></i>
            AI 模拟面试 · {{ mode }} · {{ currentJobTitle }}
            <span class="badge-soft blue ms-2"><i class="bi bi-circle-fill" style="font-size: 8px"></i> 进行中</span>
          </h5>
          <button class="modal-close" @click="endInterview">×</button>
        </div>
        <div class="modal-body-x" style="padding: 18px 22px">
          <div ref="chatBox" class="chat-box">
            <div v-for="(m, i) in messages" :key="i" :class="['chat-msg', { me: m.role === 'me', 'score-msg': m.role === 'score' }]">
              <!-- 评分提示 -->
              <template v-if="m.role === 'score'">
                <div class="score-tip" :style="{ borderColor: m.score >= 85 ? '#10b981' : m.score >= 70 ? '#4f6ef7' : '#f59e0b' }">
                  <span style="font-weight: 700" :style="{ color: m.score >= 85 ? '#10b981' : m.score >= 70 ? '#4f6ef7' : '#f59e0b' }">{{ m.score }}分</span>
                  <span style="color: var(--text-muted); margin-left: 8px">{{ m.suggestion }}</span>
                </div>
              </template>
              <!-- 正常对话 -->
              <template v-else>
                <div class="chat-avatar" :style="{ background: m.role === 'hr' ? 'linear-gradient(135deg,#4f6ef7,#7c3aed)' : '#10b981' }">
                  <i :class="m.role === 'hr' ? 'bi-robot' : 'bi-person-fill'"></i>
                </div>
                <div class="chat-bubble">{{ m.text }}</div>
              </template>
            </div>
            <div v-if="typing" class="chat-msg">
              <div class="chat-avatar" style="background: linear-gradient(135deg,#4f6ef7,#7c3aed)">
                <i class="bi bi-robot"></i>
              </div>
              <div class="chat-bubble"><span class="typing"><span></span><span></span><span></span></span></div>
            </div>
          </div>

          <div class="d-flex gap-2 mt-3">
            <input
              v-model="inputText"
              class="form-control"
              placeholder="输入你的回答,回车发送..."
              :disabled="typing"
              @keyup.enter="sendMsg"
            >
            <button class="btn-gradient" :disabled="typing" @click="sendMsg"><i class="bi bi-send-fill"></i></button>
          </div>
        </div>
        <div class="modal-footer-x">
          <button class="btn-ghost" @click="endInterview"><i class="bi bi-stop-circle me-1"></i>结束面试并生成报告</button>
        </div>
      </div>
    </div>

    <!-- 评估报告弹窗 -->
    <div v-if="reportVisible" class="modal-mask" @click.self="reportVisible = false">
      <div class="modal-box lg">
        <div class="modal-header-x">
          <h5><i class="bi bi-file-earmark-bar-graph me-2" style="color: var(--primary)"></i>AI 面试评估报告</h5>
          <button class="modal-close" @click="reportVisible = false">×</button>
        </div>
        <div class="modal-body-x">
          <div v-if="reportLoading" class="loading-wrap">
            <div class="ai-loading"><span class="spinner"></span>AI 正在生成评估报告...</div>
          </div>
          <template v-else-if="reportData">
            <div class="row align-items-center mb-4">
              <div class="col-4 text-center">
                <div class="score-ring" :style="scoreStyle(reportData.totalScore || 0)">
                  <span class="score-num">{{ reportData.totalScore || 0 }}<span style="font-size: 15px">分</span></span>
                </div>
                <div style="margin-top: 8px">
                  <span class="badge-soft" :style="{ background: gradeColor(reportData.grade) + '22', color: gradeColor(reportData.grade) }">
                    等级 {{ reportData.grade }}
                  </span>
                </div>
              </div>
              <div class="col-8">
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px">
                  {{ reportData.mode }} · 回答 {{ reportData.questionsAnswered || 0 }} 题
                </div>
                <div class="ai-section good">
                  <h6><i class="bi bi-stars"></i>回答亮点</h6>
                  <ul><li v-for="(s, i) in reportData.strengths" :key="i">{{ s }}</li></ul>
                </div>
              </div>
            </div>

            <div class="ai-section warn">
              <h6><i class="bi bi-exclamation-triangle-fill"></i>待改进问题</h6>
              <ul><li v-for="(s, i) in reportData.weaknesses" :key="i">{{ s }}</li></ul>
            </div>
            <div class="ai-section tip">
              <h6><i class="bi bi-lightbulb-fill"></i>提升建议</h6>
              <ul><li v-for="(s, i) in reportData.suggestions" :key="i">{{ s }}</li></ul>
            </div>
          </template>
        </div>
        <div class="modal-footer-x">
          <button class="btn-gradient" @click="reportVisible = false"><i class="bi bi-check-lg me-1"></i>我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-msg {
  width: 100% !important;
  margin: 4px 0;
}
.score-tip {
  width: 100%;
  background: #f8faff;
  border-left: 3px solid #4f6ef7;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
}
</style>
