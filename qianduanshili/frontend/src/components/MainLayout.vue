<script setup>
import { ref, computed } from 'vue'
import { currentRoute, navigate, getUser, logout } from '../router'
import Jobs from '../views/Jobs.vue'
import ResumeManage from '../views/ResumeManage.vue'
import Applications from '../views/Applications.vue'
import AiInterview from '../views/AiInterview.vue'
import Profile from '../views/Profile.vue'
import Feedback from '../views/Feedback.vue'

const menus = [
  { path: '/jobs', name: '岗位大厅', icon: 'bi-briefcase-fill' },
  { path: '/resume', name: '简历管理', icon: 'bi-file-earmark-person-fill' },
  { path: '/applications', name: '投递管理', icon: 'bi-send-check-fill' },
  { path: '/interview', name: 'AI模拟面试', icon: 'bi-robot' },
  { path: '/profile', name: '个人信息', icon: 'bi-person-circle' },
  { path: '/feedback', name: '用户反馈', icon: 'bi-chat-heart-fill' },
]

const user = getUser()
const showUserMenu = ref(false)

// 默认路由
if (currentRoute.value === '/' || currentRoute.value === '' || currentRoute.value === '/login') {
  navigate('/jobs')
}

const activePath = computed(() => currentRoute.value)
const currentMenu = computed(() => menus.find((m) => m.path === activePath.value))

const go = (path) => navigate(path)
const onLogout = () => {
  logout()
}
</script>

<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <i class="bi bi-rocket-takeoff-fill"></i>
        <span>AI求职平台</span>
      </div>
      <div style="flex: 1">
        <div
          v-for="m in menus"
          :key="m.path"
          class="menu-item"
          :class="{ active: activePath === m.path }"
          @click="go(m.path)"
        >
          <i :class="m.icon"></i>
          <span>{{ m.name }}</span>
        </div>
      </div>
      <div style="padding: 12px 10px 0; border-top: 1px solid rgba(255,255,255,0.15); font-size: 12px; opacity: 0.7">
        <i class="bi bi-mortarboard-fill"></i> 学生端 v1.0
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="main-area">
      <header class="topbar">
        <div class="page-name">
          <i :class="currentMenu?.icon" style="color: var(--primary); margin-right: 8px"></i>
          {{ currentMenu?.name || '岗位大厅' }}
        </div>
        <div class="user-box" @click.stop="showUserMenu = !showUserMenu">
          <div class="avatar">{{ user?.name?.charAt(0) || '学' }}</div>
          <div>
            <div style="font-weight: 700; font-size: 14px; line-height: 1.2">{{ user?.name || '同学' }}</div>
            <div style="font-size: 12px; color: var(--text-muted)">{{ user?.school || '未设置学校' }}</div>
          </div>
          <i class="bi bi-chevron-down" style="color: var(--text-muted); font-size: 12px"></i>

          <div v-if="showUserMenu" class="user-menu" @click.stop>
            <div @click="go('/profile'); showUserMenu = false"><i class="bi bi-person-circle me-2"></i>个人信息</div>
            <div @click="onLogout()"><i class="bi bi-box-arrow-right me-2"></i>退出登录</div>
          </div>
        </div>
      </header>

      <main class="content" @click="showUserMenu = false">
        <Jobs v-if="activePath === '/jobs'" />
        <ResumeManage v-else-if="activePath === '/resume'" />
        <Applications v-else-if="activePath === '/applications'" />
        <AiInterview v-else-if="activePath === '/interview'" />
        <Profile v-else-if="activePath === '/profile'" />
        <Feedback v-else-if="activePath === '/feedback'" />
        <Jobs v-else />
      </main>
    </div>
  </div>
</template>
