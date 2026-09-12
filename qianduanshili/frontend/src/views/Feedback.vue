<script setup>
import { ref, onMounted } from 'vue'
import { feedbacks as mockFeedbacks } from '../mock/data'
import { toast } from '../toast'
import api from '../api'

// AI 服务评价(点赞/点踩,前端状态;第二阶段后端 ai_feedback 表)
const list = ref([...mockFeedbacks])
const vote = (item, type) => {
  if (item.myVote === type) {
    item[type === 'up' ? 'likes' : 'dislikes']--
    item.myVote = null
  } else {
    if (item.myVote === 'up') item.likes--
    if (item.myVote === 'down') item.dislikes--
    item[type === 'up' ? 'likes' : 'dislikes']++
    item.myVote = type
    toast(type === 'up' ? '感谢点赞!AI 会继续努力~' : '已收到点踩,我们会改进', 'info')
  }
}

// 提交反馈(真实接口)
const form = ref({ category: '简历诊断', type: '建议', content: '' })
const myFeedbacks = ref([])

const loadMine = async () => {
  try {
    myFeedbacks.value = await api.get('/feedback')
  } catch (e) {
    toast(e.message || '反馈加载失败', 'error')
  }
}
onMounted(loadMine)

const submit = async () => {
  if (!form.value.content.trim()) {
    toast('请填写反馈内容', 'error')
    return
  }
  try {
    await api.post('/feedback', {
      category: form.value.category,
      fb_type: form.value.type,
      content: form.value.content,
    })
    form.value.content = ''
    toast('反馈提交成功,感谢你的建议!')
    loadMine()
  } catch (e) {
    toast(e.message || '提交失败', 'error')
  }
}

const catColor = { 简历诊断: 'blue', 面试点评: 'orange', 岗位匹配: 'green' }
</script>

<template>
  <div>
    <div class="page-header">
      <h2>用户反馈</h2>
      <p>对 AI 简历建议、面试点评进行点赞 / 点踩,或提交你的建议帮助平台改进</p>
    </div>

    <div class="row g-4">
      <!-- AI 服务评价 -->
      <div class="col-lg-7">
        <div class="app-card">
          <div class="card-title"><i class="bi bi-hand-thumbs-up-fill"></i>AI 服务评价</div>

          <div v-for="f in list" :key="f.id" style="border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 14px">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge-soft" :class="catColor[f.category] || 'blue'">{{ f.category }}</span>
              <span style="color: var(--text-light); font-size: 12.5px">{{ f.date }}</span>
            </div>
            <div style="font-size: 14px; line-height: 1.8; color: #374151">{{ f.summary }}</div>
            <div class="d-flex gap-2 mt-3">
              <button class="vote-btn up" :class="{ active: f.myVote === 'up' }" @click="vote(f, 'up')">
                <i class="bi bi-hand-thumbs-up me-1"></i>有帮助 ({{ f.likes }})
              </button>
              <button class="vote-btn down" :class="{ active: f.myVote === 'down' }" @click="vote(f, 'down')">
                <i class="bi bi-hand-thumbs-down me-1"></i>不准确 ({{ f.dislikes }})
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 提交反馈 + 我的记录 -->
      <div class="col-lg-5">
        <div class="app-card">
          <div class="card-title"><i class="bi bi-chat-square-text-fill"></i>提交反馈</div>

          <label class="form-label">反馈类型</label>
          <div class="d-flex gap-2 mb-3 flex-wrap">
            <button
              v-for="t in ['建议', 'Bug', '表扬']"
              :key="t"
              class="btn-sm-soft"
              :style="form.type === t ? { background: 'var(--gradient)', color: '#fff', borderColor: 'transparent' } : {}"
              @click="form.type = t"
              style="padding: 6px 16px"
            >{{ t }}</button>
          </div>

          <label class="form-label">相关模块</label>
          <select v-model="form.category" class="form-select mb-3">
            <option>简历诊断</option>
            <option>面试点评</option>
            <option>岗位匹配</option>
            <option>其他问题</option>
          </select>

          <label class="form-label">反馈内容</label>
          <textarea v-model="form.content" class="form-control" rows="4" placeholder="详细描述你遇到的问题或建议..."></textarea>

          <button class="btn-gradient w-100 mt-3" @click="submit">
            <i class="bi bi-send me-1"></i>提交反馈
          </button>
        </div>

        <div class="app-card">
          <div class="card-title"><i class="bi bi-inbox-fill"></i>我的反馈</div>
          <div v-for="m in myFeedbacks" :key="m.id" style="padding: 12px 0; border-bottom: 1px dashed var(--border)">
            <div class="d-flex justify-content-between">
              <span class="badge-soft blue">{{ m.category }}</span>
              <span class="badge-soft" :class="m.status === '已采纳' ? 'green' : 'orange'">{{ m.status }}</span>
            </div>
            <div style="font-size: 13.5px; margin-top: 6px; color: #374151">{{ m.content }}</div>
            <div style="font-size: 12px; color: var(--text-light); margin-top: 4px">{{ m.date }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
