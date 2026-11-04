(function () {
  "use strict";

  var API = "/api";
  var ADMIN = API + "/admin";

  var token = localStorage.getItem("token") || "";
  var userInfo = JSON.parse(localStorage.getItem("user") || "null");

  var pageTitles = {
    "dashboard": "📊 仪表盘",
    "users": "👥 用户管理",
    "enterprises": "🏢 企业审核",
    "jobs": "💼 岗位审核",
    "resumes": "📄 简历审核",
    "prompts": "🧠 Prompt 模板",
    "interview-bank": "🗣️ 面试题库",
    "exam-bank": "📝 笔试题库",
    "feedback": "👍 AI 用户反馈",
    "bad-cases": "🐞 坏案例库",
    "messages": "📢 系统公告",
    "logs": "📋 操作审计日志",
  };

  /* ============ 通用工具 ============ */
  function toast(msg, type) {
    var el = document.getElementById("toast");
    el.textContent = msg;
    el.style.display = "block";
    el.style.background = type === "error" ? "#ef4444" : type === "warn" ? "#f59e0b" : "#1e293b";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.style.display = "none"; }, 2000);
  }

  function qs(obj) {
    var p = [];
    for (var k in obj) if (obj[k] !== undefined && obj[k] !== "") p.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
    return p.length ? "?" + p.join("&") : "";
  }

  async function api(method, path, body, params) {
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    var url = path.startsWith("/api") ? path : ADMIN + path;
    if (params) url += qs(params);

    var resp;
    try {
      resp = await fetch(url, {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      toast("网络错误：" + e.message, "error");
      throw e;
    }

    if (resp.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      token = "";
      userInfo = null;
      location.href = "/login?role=admin";
      throw new Error("Unauthorized");
    }

    var data = null;
    try { data = await resp.json(); } catch (_) {}

    if (!resp.ok) {
      var msg = (data && (data.detail || data.message)) || "请求失败";
      toast(msg, "error");
      throw new Error(msg);
    }
    return data;
  }

  function fmt(v) {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "object") {
      try { return JSON.stringify(v, null, 2); } catch (_) { return String(v); }
    }
    return String(v);
  }
  function fmtDate(v) {
    if (!v) return "-";
    try {
      var d = new Date(v);
      return d.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (_) { return String(v); }
  }

  /* ============ 登录 ============ */
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    token = ""; userInfo = null;
    location.href = "/login?role=admin";
  }

  /* ============ 路由 ============ */
  function switchPage(key) {
    document.querySelectorAll(".page").forEach(function (p) { p.style.display = "none"; });
    var target = document.getElementById("page-" + key);
    if (target) target.style.display = "block";
    document.querySelectorAll(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.getAttribute("data-key") === key);
    });
    document.getElementById("crumb").textContent = pageTitles[key] || key;

    var loaders = {
      "dashboard": loadDashboard,
      "users": loadUsers,
      "enterprises": loadEnterprises,
      "jobs": loadJobsAudit,
      "resumes": loadResumesAudit,
      "prompts": loadPrompts,
      "interview-bank": loadInterviewBank,
      "exam-bank": loadExamBank,
      "feedback": loadFeedback,
      "bad-cases": loadBadCases,
      "messages": loadMessages,
      "logs": loadLogs,
    };
    if (loaders[key]) loaders[key]();
  }

  document.querySelectorAll(".nav-item").forEach(function (n) {
    n.addEventListener("click", function (e) {
      e.preventDefault();
      switchPage(n.getAttribute("data-key"));
    });
  });

  /* ============ Modal ============ */
  function openModal(title, bodyHtml) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = bodyHtml;
    document.getElementById("modal").style.display = "flex";
  }
  function closeModal() {
    document.getElementById("modal").style.display = "none";
  }
  window.closeModal = closeModal;
  window.openModal = openModal;

  /* ============ 仪表盘 ============ */
  async function loadDashboard() {
    try {
      var data = await api("GET", "/stats");
      var d = data.data || data;
      document.getElementById("stat-users").textContent = fmt(d.user_count);
      document.getElementById("stat-enterprises").textContent = fmt(d.enterprise_count);
      document.getElementById("stat-jobs").textContent = fmt(d.job_count);
      document.getElementById("stat-resumes").textContent = fmt(d.resume_count);
      document.getElementById("stat-applies").textContent = fmt(d.apply_count);
      document.getElementById("stat-interviews").textContent = fmt(d.interview_count);
      document.getElementById("stat-like").textContent = fmt(d.feedback_like);
      document.getElementById("stat-dislike").textContent = fmt(d.feedback_dislike);
    } catch (e) {}
  }

  /* ============ 用户管理 ============ */
  async function loadUsers() {
    var kw = document.getElementById("userKeyword").value.trim();
    var data = await api("GET", "/users", null, kw ? { keyword: kw } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (u) {
      var status = u.is_active
        ? '<span class="badge badge-success">启用</span>'
        : '<span class="badge badge-gray">禁用</span>';
      html += "<tr>" +
        '<td class="mono-id">' + u.id + "</td>" +
        "<td>" + fmt(u.username) + "</td>" +
        "<td>" + fmt(u.real_name) + "</td>" +
        "<td>" + fmt(u.school) + "</td>" +
        "<td>" + fmt(u.major) + "</td>" +
        "<td>" + fmt(u.ai_quota) + "</td>" +
        "<td>" + fmt(u.resume_limit) + "</td>" +
        "<td>" + status + "</td>" +
        '<td>' +
        '<button class="btn-primary btn-sm btn-table" onclick="toggleUser(' + u.id + ',' + u.is_active + ')">' +
        (u.is_active ? "禁用" : "启用") + "</button>" +
        '<button class="btn-info btn-sm btn-table" onclick="openQuota(' + u.id + ',' + u.ai_quota + ',' + u.resume_limit + ')">配额</button>' +
        "</td>" +
        "</tr>";
    });
    document.getElementById("userTbody").innerHTML = html || '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">暂无数据</td></tr>';
  }

  window.toggleUser = async function (id, cur) {
    try {
      await api("PUT", "/users/" + id + "/toggle");
      toast(cur ? "已禁用" : "已启用");
      loadUsers();
    } catch (e) {}
  };

  window.openQuota = function (id, quota, limit) {
    openModal("设置用户配额",
      '<div class="modal-form-row"><label>AI 调用次数配额</label><input id="q_quota" type="number" min="0" value="' + quota + '"></div>' +
      '<div class="modal-form-row"><label>简历上限</label><input id="q_limit" type="number" min="1" value="' + limit + '"></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="saveQuota(' + id + ')">保存</button>' +
      "</div>"
    );
  };

  window.saveQuota = async function (id) {
    var quota = parseInt(document.getElementById("q_quota").value, 10);
    var limit = parseInt(document.getElementById("q_limit").value, 10);
    try {
      await api("PUT", "/users/" + id + "/quota", null, { ai_quota: quota, resume_limit: limit });
      toast("配额已更新");
      closeModal();
      loadUsers();
    } catch (e) {}
  };

  /* ============ 企业审核 ============ */
  async function loadEnterprises() {
    var status = document.getElementById("entStatus").value;
    var data = await api("GET", "/enterprises", null, status ? { status: status } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (e) {
      html += "<tr>" +
        '<td class="mono-id">' + e.id + "</td>" +
        "<td>" + fmt(e.username) + "</td>" +
        "<td>" + fmt(e.company_name) + "</td>" +
        "<td>" + fmt(e.industry) + "</td>" +
        "<td>" + statusBadge(e.status) + "</td>" +
        "<td>" + fmtDate(e.created_at) + "</td>" +
        '<td>' + entAuditBtns(e.id, e.status) + "</td>" +
        "</tr>";
    });
    document.getElementById("entTbody").innerHTML = html || '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">暂无数据</td></tr>';
  }

  function statusBadge(s) {
    var map = {
      "pending": ['badge-warn", "待审核'],
      "approved": ['badge-success", "已通过'],
      "rejected": ['badge-danger", "已拒绝'],
      "active": ['badge-success", "活跃'],
      "closed": ['badge-gray", "已关闭'],
      "draft": ['badge-gray", "草稿'],
      "published": ['badge-success", "已发布'],
    };
    if (map[s]) return '<span class="badge badge-' + map[s][0].split('"')[0] + '">' + map[s][1] + "</span>";
    return '<span class="badge badge-info">' + fmt(s) + "</span>";
  }

  function entAuditBtns(id, cur) {
    var html = "";
    if (cur !== "approved") html += '<button class="btn-primary btn-sm btn-table" onclick="auditEnt(' + id + ',\'approved\')">通过</button>';
    if (cur !== "rejected") html += '<button class="btn-danger btn-sm btn-table" onclick="auditEnt(' + id + ',\'rejected\')">拒绝</button>';
    return html;
  }

  window.auditEnt = async function (id, status) {
    try {
      await api("PUT", "/enterprises/" + id + "/audit", null, { status: status });
      toast(status === "approved" ? "已通过" : "已拒绝");
      loadEnterprises();
    } catch (e) {}
  };

  /* ============ 岗位审核 ============ */
  async function loadJobsAudit() {
    var status = document.getElementById("jobStatus").value;
    var data = await api("GET", "/jobs/audit", null, { status: status });
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (j) {
      html += "<tr>" +
        '<td class="mono-id">' + j.id + "</td>" +
        "<td class='long-text'>" + fmt(j.title) + "</td>" +
        "<td>" + fmt(j.company) + "</td>" +
        "<td>" + statusBadge(j.status) + "</td>" +
        "<td>" + fmtDate(j.created_at) + "</td>" +
        '<td>' + jobAuditBtns(j.id, j.status) + "</td>" +
        "</tr>";
    });
    document.getElementById("jobTbody").innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">暂无数据</td></tr>';
  }

  function jobAuditBtns(id, cur) {
    var html = "";
    if (cur !== "approved") html += '<button class="btn-primary btn-sm btn-table" onclick="auditJob(' + id + ',\'approved\')">通过</button>';
    if (cur !== "rejected") html += '<button class="btn-danger btn-sm btn-table" onclick="auditJob(' + id + ',\'rejected\')">下架</button>';
    return html;
  }

  window.auditJob = async function (id, status) {
    try {
      await api("PUT", "/jobs/" + id + "/audit", null, { status: status });
      toast(status === "approved" ? "已通过" : "已下架");
      loadJobsAudit();
    } catch (e) {}
  };

  /* ============ 简历审核 ============ */
  async function loadResumesAudit() {
    var status = document.getElementById("resumeStatus").value;
    var data = await api("GET", "/resumes/audit", null, { status: status });
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (r) {
      html += "<tr>" +
        '<td class="mono-id">' + r.id + "</td>" +
        '<td class="mono-id">' + r.user_id + "</td>" +
        "<td>" + fmt(r.title) + "</td>" +
        "<td>" + statusBadge(r.status) + "</td>" +
        "<td>" + fmtDate(r.created_at) + "</td>" +
        '<td>' + resumeAuditBtns(r.id, r.status) + "</td>" +
        "</tr>";
    });
    document.getElementById("resumeTbody").innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">暂无数据</td></tr>';
  }

  function resumeAuditBtns(id, cur) {
    var html = "";
    if (cur !== "published") html += '<button class="btn-primary btn-sm btn-table" onclick="auditResume(' + id + ',\'published\')">发布</button>';
    if (cur !== "rejected") html += '<button class="btn-danger btn-sm btn-table" onclick="auditResume(' + id + ',\'rejected\')">退回</button>';
    return html;
  }

  window.auditResume = async function (id, status) {
    try {
      await api("PUT", "/resumes/" + id + "/audit", null, { status: status });
      toast("操作成功");
      loadResumesAudit();
    } catch (e) {}
  };

  /* ============ Prompt 模板 ============ */
  async function loadPrompts() {
    var agent = document.getElementById("promptAgent").value;
    var data = await api("GET", "/prompts", null, agent ? { agent_name: agent } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (p) {
      html += "<tr>" +
        '<td class="mono-id">' + p.id + "</td>" +
        "<td>" + fmt(p.agent_name) + "</td>" +
        "<td>" + fmt(p.name) + "</td>" +
        "<td>" + fmt(p.version) + "</td>" +
        "<td>" + (p.is_active ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-gray">停用</span>') + "</td>" +
        '<td>' +
        '<button class="btn-info btn-sm btn-table" onclick="viewPrompt(' + p.id + ')">查看/编辑</button>' +
        "</td>" +
        "</tr>";
    });
    document.getElementById("promptTbody").innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">暂无模板</td></tr>';
  }

  window.openPromptForm = function () {
    openModal("新建 Prompt 模板",
      '<div class="modal-form-row"><label>Agent 名称</label><select id="np_agent">' +
      ['ResumeParserAgent', 'ResumeDiagnoseAgent', 'JobMatchAgent', 'JobSearchAgent', 'HRInterviewAgent', 'ExamGeneratorAgent']
        .map(function (a) { return '<option value="' + a + '">' + a + "</option>"; }).join("") +
      "</select></div>" +
      '<div class="modal-form-row"><label>模板名称</label><input id="np_name" type="text" placeholder="例如：简历诊断 v2"></div>' +
      '<div class="modal-form-row"><label>版本</label><input id="np_version" type="text" value="v1"></div>' +
      '<div class="modal-form-row"><label>Prompt 内容</label><textarea id="np_prompt" rows="8" placeholder="请输入系统提示词..."></textarea></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createPrompt()">创建</button>' +
      "</div>"
    );
  };

  window.createPrompt = async function () {
    var agent = document.getElementById("np_agent").value;
    var name = document.getElementById("np_name").value.trim();
    var version = document.getElementById("np_version").value.trim() || "v1";
    var prompt = document.getElementById("np_prompt").value.trim();
    if (!name || !prompt) { toast("请填写完整", "warn"); return; }
    try {
      await api("POST", "/prompts", null, { agent_name: agent, name: name, version: version, prompt: prompt });
      toast("创建成功");
      closeModal();
      loadPrompts();
    } catch (e) {}
  };

  window.viewPrompt = async function (id) {
    var rows = await api("GET", "/prompts");
    var p = (Array.isArray(rows) ? rows : []).find(function (x) { return x.id === id; });
    if (!p) { toast("模板不存在", "error"); return; }
    openModal("编辑模板：" + p.name,
      '<div class="modal-form-row"><label>Agent</label><input value="' + fmt(p.agent_name) + '" disabled></div>' +
      '<div class="modal-form-row"><label>模板名称</label><input value="' + fmt(p.name) + '" disabled></div>' +
      '<div class="modal-form-row"><label>是否启用</label>' +
      '<select id="ep_active"><option value="1"' + (p.is_active ? " selected" : "") + '>启用</option><option value="0"' + (p.is_active ? "" : " selected") + '>停用</option></select>' +
      "</div>" +
      '<div class="modal-form-row"><label>Prompt 内容</label><textarea id="ep_prompt" rows="10">' + fmt(p.prompt) + "</textarea></div>" +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="updatePrompt(' + p.id + ')">保存</button>' +
      "</div>"
    );
  };

  window.updatePrompt = async function (id) {
    var prompt = document.getElementById("ep_prompt").value;
    var active = document.getElementById("ep_active").value === "1";
    try {
      await api("PUT", "/prompts/" + id, null, { prompt: prompt, is_active: active });
      toast("已保存");
      closeModal();
      loadPrompts();
    } catch (e) {}
  };

  /* ============ 面试题库 ============ */
  async function loadInterviewBank() {
    var cat = document.getElementById("interviewCat").value.trim();
    var data = await api("GET", "/interview-bank", null, cat ? { category: cat } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (i) {
      html += "<tr>" +
        '<td class="mono-id">' + i.id + "</td>" +
        "<td>" + fmt(i.category) + "</td>" +
        "<td>" + fmt(i.difficulty) + "</td>" +
        "<td>" + fmt(i.question) + "</td>" +
        "</tr>";
    });
    document.getElementById("interviewTbody").innerHTML = html || '<tr><td colspan="4" style="text-align:center;padding:40px;color:#94a3b8;">暂无题目</td></tr>';
  }

  window.openInterviewForm = function () {
    openModal("添加面试题目",
      '<div class="modal-form-row"><label>类别（如 java、前端、算法）</label><input id="iq_cat" type="text"></div>' +
      '<div class="modal-form-row"><label>难度</label><select id="iq_diff"><option value="easy">简单</option><option value="medium" selected>中等</option><option value="hard">困难</option></select></div>' +
      '<div class="modal-form-row"><label>问题</label><textarea id="iq_q" rows="3"></textarea></div>' +
      '<div class="modal-form-row"><label>参考答案（可选）</label><textarea id="iq_ans" rows="4"></textarea></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createInterviewQ()">添加</button>' +
      "</div>"
    );
  };

  window.createInterviewQ = async function () {
    var category = document.getElementById("iq_cat").value.trim();
    var question = document.getElementById("iq_q").value.trim();
    var difficulty = document.getElementById("iq_diff").value;
    var answer = document.getElementById("iq_ans").value.trim();
    if (!category || !question) { toast("请填写完整", "warn"); return; }
    try {
      await api("POST", "/interview-bank", null, { category: category, question: question, difficulty: difficulty, reference_answer: answer || undefined });
      toast("添加成功");
      closeModal();
      loadInterviewBank();
    } catch (e) {}
  };

  /* ============ 笔试题库 ============ */
  async function loadExamBank() {
    var cat = document.getElementById("examCat").value.trim();
    var data = await api("GET", "/exam-bank", null, cat ? { category: cat } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (e) {
      html += "<tr>" +
        '<td class="mono-id">' + e.id + "</td>" +
        "<td>" + fmt(e.category) + "</td>" +
        "<td>" + fmt(e.difficulty) + "</td>" +
        "<td>" + fmt(e.question) + "</td>" +
        "</tr>";
    });
    document.getElementById("examTbody").innerHTML = html || '<tr><td colspan="4" style="text-align:center;padding:40px;color:#94a3b8;">暂无题目</td></tr>';
  }

  /* ============ AI 反馈 ============ */
  async function loadFeedback() {
    var type = document.getElementById("fbType").value;
    var data = await api("GET", "/feedback", null, type ? { target_type: type } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (f) {
      var likeBadge = f.feedback === "like"
        ? '<span class="badge badge-success">👍 喜欢</span>'
        : '<span class="badge badge-danger">👎 点踩</span>';
      html += "<tr>" +
        '<td class="mono-id">' + f.id + "</td>" +
        '<td class="mono-id">' + f.user_id + "</td>" +
        "<td>" + fmt(f.target_type) + "</td>" +
        "<td>" + likeBadge + "</td>" +
        "<td class='long-text'>" + fmt(f.comment) + "</td>" +
        "<td>" + fmtDate(f.created_at) + "</td>" +
        "</tr>";
    });
    document.getElementById("fbTbody").innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">暂无反馈</td></tr>';
  }

  /* ============ 坏案例库 ============ */
  async function loadBadCases() {
    var status = document.getElementById("bcStatus").value;
    var data = await api("GET", "/bad-cases", null, status ? { status: status } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (b) {
      html += "<tr>" +
        '<td class="mono-id">' + b.id + "</td>" +
        "<td>" + fmt(b.agent_name) + "</td>" +
        "<td class='long-text'>" + fmt(b.request) + "</td>" +
        "<td class='long-text'>" + fmt(b.response) + "</td>" +
        "<td class='long-text'>" + fmt(b.reason) + "</td>" +
        "<td>" + (b.status === "fixed" ? '<span class="badge badge-success">已修复</span>' : '<span class="badge badge-warn">未修复</span>') + "</td>" +
        '<td>' + (b.status !== "fixed" ? '<button class="btn-primary btn-sm btn-table" onclick="fixBadCase(' + b.id + ')">标记修复</button>' : "-") + "</td>" +
        "</tr>";
    });
    document.getElementById("bcTbody").innerHTML = html || '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">暂无坏案例</td></tr>';
  }

  window.fixBadCase = async function (id) {
    try {
      await api("PUT", "/bad-cases/" + id + "/fix");
      toast("已标记修复");
      loadBadCases();
    } catch (e) {}
  };

  /* ============ 系统公告 ============ */
  async function loadMessages() {
    var data = await api("GET", "/messages");
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (m) {
      html += "<tr>" +
        '<td class="mono-id">' + m.id + "</td>" +
        "<td>" + fmt(m.title) + "</td>" +
        "<td>" + fmt(m.target_role) + "</td>" +
        "<td class='long-text'>" + fmt(m.content) + "</td>" +
        "<td>" + fmtDate(m.created_at) + "</td>" +
        "</tr>";
    });
    document.getElementById("msgTbody").innerHTML = html || '<tr><td colspan="5" style="text-align:center;padding:40px;color:#94a3b8;">暂无公告</td></tr>';
  }

  window.openMessageForm = function () {
    openModal("发布系统公告",
      '<div class="modal-form-row"><label>标题</label><input id="msg_title" type="text"></div>' +
      '<div class="modal-form-row"><label>接收角色</label><select id="msg_role">' +
      '<option value="all">全部</option><option value="student">学生</option><option value="enterprise">企业</option>' +
      "</select></div>" +
      '<div class="modal-form-row"><label>公告内容</label><textarea id="msg_content" rows="5"></textarea></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createMessage()">发布</button>' +
      "</div>"
    );
  };

  window.createMessage = async function () {
    var title = document.getElementById("msg_title").value.trim();
    var content = document.getElementById("msg_content").value.trim();
    var role = document.getElementById("msg_role").value;
    if (!title || !content) { toast("请填写完整", "warn"); return; }
    try {
      await api("POST", "/messages", null, { title: title, content: content, target_role: role });
      toast("发布成功");
      closeModal();
      loadMessages();
    } catch (e) {}
  };

  /* ============ 操作日志 ============ */
  async function loadLogs() {
    var data = await api("GET", "/logs");
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (l) {
      html += "<tr>" +
        '<td class="mono-id">' + l.id + "</td>" +
        '<td class="mono-id">' + l.admin_id + "</td>" +
        "<td><span class='badge badge-info'>" + fmt(l.action) + "</span></td>" +
        "<td>" + fmt(l.target) + "</td>" +
        "<td class='long-text'>" + fmt(l.detail) + "</td>" +
        "<td>" + fmtDate(l.created_at) + "</td>" +
        "</tr>";
    });
    document.getElementById("logTbody").innerHTML = html || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#94a3b8;">暂无日志</td></tr>';
  }

  /* ============ 导出 ============ */
  window.exportUsers = function () {
    var url = ADMIN + "/export/users";
    if (token) url += "?token=" + encodeURIComponent(token);
    window.open(url, "_blank");
    toast("正在导出...", "warn");
  };

  /* ============ 启动 ============ */
  function initApp() {
    if (!token || !userInfo || userInfo.role !== "admin") {
      location.replace("/login?role=admin&redirect=/admin");
      return;
    }
    document.getElementById("app").style.display = "flex";
    document.getElementById("adminInfo").textContent = "👤 " + userInfo.username;
    switchPage("dashboard");
  }

  window.logout = logout;
  window.switchPage = switchPage;

  document.addEventListener("DOMContentLoaded", initApp);
})();
