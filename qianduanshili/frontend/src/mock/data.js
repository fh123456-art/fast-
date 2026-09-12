// ============ 学生端 Mock 数据(后续接后端时替换为 API 请求) ============

export const defaultProfile = {
  name: '李同学',
  gender: '男',
  phone: '138****8888',
  email: 'litongxue@example.com',
  school: '华南理工大学',
  major: '软件工程',
  degree: '本科',
  graduateYear: '2026',
  intention: '前端开发工程师',
  expectCity: '广州 / 深圳',
  expectSalary: '8K-12K',
}

export const resumes = [
  {
    id: 1,
    name: '前端开发简历_默认版.pdf',
    type: 'PDF',
    updatedAt: '2026-08-28 14:32',
    status: '已解析',
    isDefault: true,
    parsed: {
      name: '李同学',
      school: '华南理工大学',
      major: '软件工程',
      degree: '本科 · 2026届',
      skills: ['Vue', 'JavaScript', 'HTML/CSS', 'Git', 'Webpack'],
      experience: '2025.06-2025.09 某互联网公司 前端开发实习生',
    },
  },
  {
    id: 2,
    name: '全栈方向简历.docx',
    type: 'Word',
    updatedAt: '2026-08-20 09:15',
    status: '已解析',
    isDefault: false,
    parsed: {
      name: '李同学',
      school: '华南理工大学',
      major: '软件工程',
      degree: '本科 · 2026届',
      skills: ['Vue', 'Node.js', 'MySQL', 'Python'],
      experience: '2025.03-2025.06 校内项目组 全栈开发',
    },
  },
  {
    id: 3,
    name: '校园经历简历_初稿.pdf',
    type: 'PDF',
    updatedAt: '2026-07-30 20:08',
    status: '待解析',
    isDefault: false,
    parsed: null,
  },
]

// AI 简历解析 & 诊断结果(模拟)
export const resumeAiResult = {
  strengths: [
    '教育背景与目标岗位匹配度高,软件工程专业课程覆盖全面',
    '具备前端实习经历,技术栈(Vue/JS)与岗位要求一致',
    '项目经历有量化结果意识,技能关键词覆盖较好',
  ],
  weaknesses: [
    '实习经历缺少可量化成果(如性能提升百分比、用户量)',
    '未体现 TypeScript、工程化(CI/CD、单元测试)等加分项',
    '自我评价偏空泛,缺少与岗位 JD 关键词的呼应',
  ],
  suggestions: [
    '将"负责页面开发"改写为"独立负责 3 个核心模块,页面加载速度提升 35%"',
    '补充 TypeScript / Vite 等现代前端工具链的项目实践',
    '针对目标岗位 JD 调整技能排序,把岗位要求的关键词前置',
  ],
}

export const jobs = [
  {
    id: 1,
    title: '前端开发工程师(校招)',
    company: '字节跳动',
    logo: '字',
    logoColor: '#3b55d9',
    salary: '12K-18K',
    city: '深圳',
    experience: '应届生',
    education: '本科及以上',
    tags: ['Vue', 'React', 'TypeScript', '五险一金'],
    match: 86,
    collected: true,
    description:
      '参与公司核心业务 Web 前端开发,负责 PC/移动端页面的架构设计与性能优化,与产品、后端、设计紧密配合,打造极致用户体验。',
    requirements: [
      '本科及以上学历,计算机、软件工程相关专业',
      '熟练掌握 HTML/CSS/JavaScript,熟悉 Vue 或 React 框架',
      '了解前端工程化工具链(Webpack/Vite、Git、CI/CD)',
      '有良好的沟通能力和团队协作精神',
    ],
  },
  {
    id: 2,
    title: 'Java 后端开发工程师',
    company: '腾讯',
    logo: '腾',
    logoColor: '#0f9d58',
    salary: '13K-20K',
    city: '广州',
    experience: '应届生',
    education: '本科及以上',
    tags: ['Java', 'Spring Boot', 'MySQL', '微服务'],
    match: 62,
    collected: false,
    description: '负责微信生态相关业务后端系统开发,参与高并发服务架构设计与优化。',
    requirements: [
      '扎实的 Java 基础,熟悉 JVM、并发编程',
      '熟悉 Spring Boot / Spring Cloud 微服务生态',
      '熟悉 MySQL、Redis,了解消息队列',
    ],
  },
  {
    id: 3,
    title: '前端开发实习生',
    company: '网易',
    logo: '网',
    logoColor: '#e6462d',
    salary: '4K-6K',
    city: '广州',
    experience: '每周4天以上',
    education: '本科在读',
    tags: ['Vue', '实习', '转正机会', '餐补'],
    match: 91,
    collected: true,
    description: '参与网易云音乐相关前端项目开发,导师一对一带教,表现优秀可转正。',
    requirements: [
      '熟练使用 HTML/CSS/JavaScript',
      '了解 Vue 或 React 框架,有个人项目优先',
      '实习期 3 个月以上,每周到岗 4 天以上',
    ],
  },
  {
    id: 4,
    title: '产品经理(校招)',
    company: '阿里巴巴',
    logo: '阿',
    logoColor: '#ff6a00',
    salary: '11K-16K',
    city: '杭州',
    experience: '应届生',
    education: '本科及以上',
    tags: ['产品设计', '数据分析', '用户增长'],
    match: 45,
    collected: false,
    description: '负责核心产品线的需求分析、功能设计与项目推进,用数据驱动产品迭代。',
    requirements: [
      '逻辑清晰,具备优秀的沟通与推动力',
      '有产品实习经历或校园项目经历优先',
      '熟练使用 Axure、SQL 等工具优先',
    ],
  },
  {
    id: 5,
    title: '数据分析工程师',
    company: '美团',
    logo: '美',
    logoColor: '#ffc300',
    salary: '10K-15K',
    city: '北京',
    experience: '应届生',
    education: '硕士优先',
    tags: ['Python', 'SQL', '数据建模', 'BI'],
    match: 58,
    collected: false,
    description: '构建业务指标体系,通过数据分析支持业务决策,搭建可视化报表。',
    requirements: ['熟练使用 SQL/Python 进行数据分析', '熟悉常用统计模型与数据可视化工具', '对业务敏感,具备良好的报告撰写能力'],
  },
  {
    id: 6,
    title: 'Web 前端开发(Vue 方向)',
    company: '广州某某科技',
    logo: '科',
    logoColor: '#7c3aed',
    salary: '8K-12K',
    city: '广州',
    experience: '1年以内',
    education: '大专及以上',
    tags: ['Vue', 'Element UI', '双休', '弹性工作'],
    match: 93,
    collected: false,
    description: '负责公司 SaaS 管理后台前端开发,技术栈 Vue3 + Element Plus,团队氛围好。',
    requirements: ['熟练 Vue2/Vue3 及周边生态', '熟悉 Element UI/Plus 组件库', '有后台管理系统项目经验优先'],
  },
]

// AI 简历-岗位匹配分析(模拟)
export const jobMatchResult = {
  score: 86,
  dimensions: [
    { name: '技能匹配', value: 90 },
    { name: '学历匹配', value: 100 },
    { name: '经验匹配', value: 70 },
    { name: '地域意向', value: 85 },
  ],
  strengths: ['Vue 技术栈与岗位要求高度重合', '本科学历满足岗位硬性要求', '有前端实习经历,上手快'],
  gaps: ['岗位提到 TypeScript,简历中未体现', '缺少大型项目工程化经验描述'],
  suggestions: ['简历中补充 TypeScript 相关项目或学习经历', '实习经历增加性能优化、组件库建设等亮点描述'],
}

export const applications = [
  {
    id: 1,
    jobTitle: '前端开发工程师(校招)',
    company: '字节跳动',
    logo: '字',
    logoColor: '#3b55d9',
    salary: '12K-18K',
    resumeName: '前端开发简历_默认版.pdf',
    appliedAt: '2026-08-25 10:22',
    step: 3, // 当前到达第几步(0-4)
    steps: ['已投递', '简历通过', '笔试', '面试中', 'Offer'],
  },
  {
    id: 2,
    jobTitle: 'Web 前端开发(Vue 方向)',
    company: '广州某某科技',
    logo: '科',
    logoColor: '#7c3aed',
    salary: '8K-12K',
    resumeName: '前端开发简历_默认版.pdf',
    appliedAt: '2026-08-22 15:40',
    step: 4,
    steps: ['已投递', '简历通过', '笔试', '面试中', 'Offer'],
  },
  {
    id: 3,
    jobTitle: '前端开发实习生',
    company: '网易',
    logo: '网',
    logoColor: '#e6462d',
    salary: '4K-6K',
    resumeName: '全栈方向简历.docx',
    appliedAt: '2026-08-18 09:05',
    step: 2,
    steps: ['已投递', '简历通过', '笔试', '面试中', 'Offer'],
  },
  {
    id: 4,
    jobTitle: 'Java 后端开发工程师',
    company: '腾讯',
    logo: '腾',
    logoColor: '#0f9d58',
    salary: '13K-20K',
    resumeName: '全栈方向简历.docx',
    appliedAt: '2026-08-12 16:30',
    step: 1,
    steps: ['已投递', '简历通过', '笔试', '面试中', 'Offer'],
  },
  {
    id: 5,
    jobTitle: '数据分析工程师',
    company: '美团',
    logo: '美',
    logoColor: '#ffc300',
    salary: '10K-15K',
    resumeName: '校园经历简历_初稿.pdf',
    appliedAt: '2026-08-05 11:12',
    step: 0,
    steps: ['已投递', '简历通过', '笔试', '面试中', 'Offer'],
  },
]

// 求职日历提醒
export const schedules = [
  { id: 1, type: '面试', title: '字节跳动 · 前端一面(技术面)', time: '2026-09-06 14:00', online: true },
  { id: 2, type: '笔试', title: '网易 · 前端实习生在线笔试', time: '2026-09-08 19:00', online: true },
  { id: 3, type: '面试', title: '广州某某科技 · HR 面', time: '2026-09-10 10:30', online: false },
]

// AI 模拟面试
export const interviewHistory = [
  {
    id: 1,
    jobTitle: '前端开发工程师(校招)',
    mode: '技术面',
    date: '2026-08-30 16:00',
    duration: '18 分钟',
    score: 82,
    rounds: 8,
  },
  {
    id: 2,
    jobTitle: 'Web 前端开发(Vue 方向)',
    mode: 'HR面',
    date: '2026-08-27 20:10',
    duration: '12 分钟',
    score: 88,
    rounds: 6,
  },
]

// HR 模拟提问池
export const hrQuestions = [
  '你好,欢迎参加面试~ 先做个简单的自我介绍吧。',
  '你为什么对我们公司的这个岗位感兴趣?',
  '你在实习中遇到的最大困难是什么?是怎么解决的?',
  '你怎么看待加班?未来 3 年的职业规划是什么?',
  '你觉得自己相比其他应届生,最大的优势是什么?',
  '如果和同事在技术方案上产生分歧,你会怎么处理?',
]

export const techQuestions = [
  '请说一下 Vue 的响应式原理,Vue3 和 Vue2 有什么区别?',
  'v-if 和 v-for 为什么不建议一起使用?key 的作用是什么?',
  '浏览器输入 URL 到页面展示,中间发生了什么?',
  '你做过哪些前端性能优化?具体怎么做的?',
  '闭包是什么?在实际开发中有哪些应用场景?',
  '如果让你设计一个组件库,你会考虑哪些方面?',
]

// 面试评估报告(模拟)
export const interviewReport = {
  score: 84,
  dimensions: [
    { name: '表达能力', value: 85 },
    { name: '专业匹配', value: 88 },
    { name: '逻辑思维', value: 80 },
    { name: '岗位意愿', value: 86 },
  ],
  highlights: ['自我介绍结构清晰,突出了实习经历与岗位的相关性', '技术问题回答准确,能结合项目实例说明'],
  problems: ['回答性能优化问题时缺少量化数据支撑', '部分问题回答偏短,可主动展开更多细节'],
  suggestions: ['采用 STAR 法则组织回答(情境-任务-行动-结果)', '面试前针对 JD 准备 2-3 个量化成果故事'],
}

// 用户反馈
export const feedbacks = [
  {
    id: 1,
    category: '简历诊断',
    summary: 'AI 建议:将"负责页面开发"改写为带量化成果的表述',
    date: '2026-08-28',
    likes: 12,
    dislikes: 1,
    myVote: 'up',
  },
  {
    id: 2,
    category: '面试点评',
    summary: 'AI 点评:技术面第 3 题回答缺少深度,建议复习浏览器缓存策略',
    date: '2026-08-30',
    likes: 8,
    dislikes: 0,
    myVote: null,
  },
  {
    id: 3,
    category: '岗位匹配',
    summary: 'AI 匹配:你与「字节跳动-前端开发」匹配度 86%,差距项为 TypeScript',
    date: '2026-08-25',
    likes: 20,
    dislikes: 2,
    myVote: null,
  },
]
