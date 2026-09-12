<script setup>
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import { currentRoute, getUser, isLoggedIn, isAdmin, navigate, logout } from './router'

// 动态导入所有页面组件(首次访问才加载)
const views = {
  login: () => import('./views/Login.vue'),
  register: () => import('./views/Register.vue'),
  profile: () => import('./views/Profile.vue'),
  jobs: () => import('./views/Jobs.vue'),
  resume: () => import('./views/ResumeManage.vue'),
  applications: () => import('./views/Applications.vue'),
  interview: () => import('./views/AiInterview.vue'),
  feedback: () => import('./views/Feedback.vue'),
  // 管理员页面
  adminDashboard: () => import('./views/admin/AdminDashboard.vue'),
  adminUsers: () => import('./views/admin/AdminUsers.vue'),
  adminJobs: () => import('./views/admin/AdminJobs.vue'),
  adminResumes: () => import('./views/admin/AdminResumes.vue'),
  adminPrompts: () => import('./views/admin/AdminPrompts.vue'),
  adminQuestions: () => import('./views/admin/AdminQuestions.vue'),
  adminFeedbacks: () => import('./views/admin/AdminFeedbacks.vue'),
  adminLogs: () => import('./views/admin/AdminLogs.vue'),
  adminLogin: () => import('./views/admin/AdminLogin.vue'),
}

const userInfo = ref(getUser())

// 路由守卫 + 路由表
const routeMap = {
  '/login': { comp: 'login', public: true },
  '/register': { comp: 'register', public: true },
  '/admin-login': { comp: 'adminLogin', public: true },
  '/': { redirect: '/jobs' },
  // 学生端
  '/jobs': { comp: 'jobs' },
  '/profile': { comp: 'profile' },
  '/resume': { comp: 'resume' },
  '/applications': { comp: 'applications' },
  '/interview': { comp: 'interview' },
  '/feedback': { comp: 'feedback' },
  // 管理员端
  '/admin/dashboard': { comp: 'adminDashboard', admin: true },
  '/admin/users': { comp: 'adminUsers', admin: true },
  '/admin/jobs': { comp: 'adminJobs', admin: true },
  '/admin/resumes': { comp: 'adminResumes', admin: true },
  '/admin/prompts': { comp: 'adminPrompts', admin: true },
  '/admin/questions': { comp: 'adminQuestions', admin: true },
  '/admin/feedbacks': { comp: 'adminFeedbacks', admin: true },
  '/admin/logs': { comp: 'adminLogs', admin: true },
}

const currentComp = shallowRef(null)
const compKey = ref('')

async function loadRoute() {
  const path = currentRoute.value || '/'
  const route = routeMap[path] || { redirect: '/jobs' }

  // 重定向
  if (route.redirect) {
    navigate(route.redirect)
    return
  }

  // 权限检查
  if (!route.public && !isLoggedIn()) {
    navigate(isAdmin() || path.startsWith('/admin') ? '/admin-login' : '/login')
    return
  }
  if (route.admin && !isAdmin()) {
    navigate('/jobs')
    return
  }
  if (!route.admin && isAdmin() && path !== '/login') {
    navigate('/admin/dashboard')
    return
  }

  // 加载组件
  compKey.value = route.comp
  currentComp.value = (await views[route.comp]()).default
}

watch(currentRoute, loadRoute, { immediate: true })

function onUserUpdate() {
  userInfo.value = getUser()
}

// 导航激活态
function isActive(path) {
  if (path === '/') return currentRoute.value === '/'
  return currentRoute.value === path || currentRoute.value.startsWith(path + '/')
}

// 学生端导航
const stuNav = [
  { path: '/jobs', icon: 'bi-briefcase-fill', label: '岗位大厅' },
  { path: '/resume', icon: 'bi-file-earmark-text-fill', label: '简历管理' },
  { path: '/applications', icon: 'bi-send-fill', label: '求职投递' },
  { path: '/interview', icon: 'bi-chat-dots-fill', label: 'AI模拟面试' },
  { path: '/profile', icon: 'bi-person-fill', label: '个人信息' },
  { path: '/feedback', icon: 'bi-chat-left-text-fill', label: '用户反馈' },
]

// 管理员端导航
const adminNav = [
  { path: '/admin/dashboard', icon: 'bi-speedometer2', label: '数据总览' },
  { path: '/admin/users', icon: 'bi-people-fill', label: '用户管理' },
  { path: '/admin/jobs', icon: 'bi-briefcase-fill', label: '岗位管理' },
  { path: '/admin/resumes', icon: 'bi-file-earmark-check-fill', label: '简历审核' },
  { path: '/admin/prompts', icon: 'bi-lightbulb-fill', label: 'AI模板' },
  { path: '/admin/questions', icon: 'bi-question-circle-fill', label: '面试题库' },
  { path: '/admin/feedbacks', icon: 'bi-hand-thumbs-up-fill', label: 'AI反馈' },
  { path: '/admin/logs', icon: 'bi-journal-text', label: '操作日志' },
]

onMounted(() => {
  // 监听 localStorage 变化(跨标签页同步登录状态)
  window.addEventListener('storage', (e) => {
    if (e.key === 'stu_user') onUserUpdate()
  })
})

// 提供给子组件更新用户信息
import { provide } from 'vue'
provide('onUserUpdate', onUserUpdate)
</script>

<template>
  <!-- 认证相关页面(登录/注册/管理登录)全屏显示 -->
  <template v-if="compKey === 'login' || compKey === 'register' || compKey === 'adminLogin'">
    <component :is="currentComp" @update:user="onUserUpdate" />
  </template>

  <!-- 管理员后台 -->
  <template v-else-if="compKey.startsWith('admin')">
    <div class="admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-logo">
          <i class="bi bi-shield-lock-fill"></i>
          <span>管理后台</span>
        </div>
        <nav class="admin-nav">
          <a v-for="item in adminNav" :key="item.path" :class="['nav-item', { active: isActive(item.path) }]"
             @click="navigate(item.path)">
            <i :class="'bi ' + item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
        </nav>
        <div class="admin-footer">
          <div class="admin-user">
            <i class="bi bi-person-circle"></i>
            <span>{{ userInfo?.name || userInfo?.username }}</span>
          </div>
          <button class="btn-logout" @click="logout()">
            <i class="bi bi-box-arrow-right"></i> 退出
          </button>
        </div>
      </aside>
      <main class="admin-main">
        <component :is="currentComp" :userInfo="userInfo" />
      </main>
    </div>
  </template>

  <!-- 学生端 -->
  <template v-else>
    <nav class="stu-navbar">
      <div class="nav-brand" @click="navigate('/jobs')">
        <div class="logo-icon"><i class="bi bi-rocket-takeoff-fill"></i></div>
        <div class="brand-text">
          <span class="brand-title">AI求职平台</span>
          <span class="brand-sub">大学生专属求职助手</span>
        </div>
      </div>
      <div class="nav-links">
        <a v-for="item in stuNav" :key="item.path" :class="['nav-link', { active: isActive(item.path) }]"
           @click="navigate(item.path)">
          <i :class="'bi ' + item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      </div>
      <div class="nav-user">
        <div class="user-avatar">
          {{ (userInfo?.name || userInfo?.username || '?').charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <div class="user-name">{{ userInfo?.name || userInfo?.username }}</div>
          <div class="user-school">{{ userInfo?.school || '未填写学校' }}</div>
        </div>
        <button class="btn-logout-sm" @click="logout()" title="退出登录">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </nav>
    <main class="stu-main">
      <component :is="currentComp" :userInfo="userInfo" @update:user="onUserUpdate" />
    </main>
    <footer class="stu-footer">
      <span>© 2026 大学生求职与简历优化平台 · 毕设项目</span>
    </footer>
  </template>
</template>

<style scoped>
/* ============ 学生端布局 ============ */
.stu-navbar {
  display: flex;
  align-items: center;
  padding: 0 32px;
  height: 64px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
  gap: 32px;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.logo-icon {
  width: 38px; height: 38px;
  background: var(--gradient);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px;
}
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-title { font-weight: 700; font-size: 15px; color: var(--text); }
.brand-sub { font-size: 11px; color: var(--text-muted); }
.nav-links { display: flex; gap: 4px; flex: 1; }
.nav-link {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  font-size: 14px; color: var(--text-muted);
  cursor: pointer; transition: all .2s;
}
.nav-link:hover { background: var(--gradient-soft); color: var(--primary); }
.nav-link.active { background: var(--gradient); color: #fff; font-weight: 600; }
.nav-user { display: flex; align-items: center; gap: 12px; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--gradient); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
}
.user-info { line-height: 1.2; }
.user-name { font-size: 13px; font-weight: 600; color: var(--text); }
.user-school { font-size: 11px; color: var(--text-muted); }
.btn-logout-sm {
  background: none; border: none; color: var(--text-muted);
  padding: 6px; border-radius: 6px; cursor: pointer;
}
.btn-logout-sm:hover { background: #f1f3f9; color: var(--danger); }

.stu-main { min-height: calc(100vh - 64px - 40px); padding: 24px 32px; background: var(--bg); }
.stu-footer { text-align: center; padding: 12px; color: var(--text-muted); font-size: 12px; background: #fff; }

/* ============ 管理员布局 ============ */
.admin-layout { display: flex; min-height: 100vh; }
.admin-sidebar {
  width: 220px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  display: flex; flex-direction: column; padding: 20px 12px;
}
.admin-logo {
  display: flex; align-items: center; gap: 10px;
  color: #fff; font-weight: 700; font-size: 16px;
  padding: 4px 8px 20px; border-bottom: 1px solid rgba(255,255,255,0.08);
}
.admin-logo i { color: var(--orange); font-size: 20px; }
.admin-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; padding-top: 12px; }
.admin-nav .nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  color: rgba(255,255,255,0.6);
  font-size: 13px; cursor: pointer; transition: all .2s;
}
.admin-nav .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.admin-nav .nav-item.active { background: var(--gradient); color: #fff; font-weight: 600; }
.admin-footer {
  border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;
}
.admin-user { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.7); font-size: 13px; padding: 4px 8px; }
.btn-logout {
  width: 100%; margin-top: 8px; padding: 8px;
  background: rgba(239,68,68,0.15); border: none; border-radius: 8px;
  color: #ef4444; font-size: 13px; cursor: pointer;
}
.btn-logout:hover { background: rgba(239,68,68,0.25); }

.admin-main { flex: 1; padding: 24px 32px; background: var(--bg); overflow-y: auto; }
</style>
