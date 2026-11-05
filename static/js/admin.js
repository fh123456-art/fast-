(function () {
  "use strict";

  var API = "/api";
  var ADMIN = API + "/admin";

  var token = localStorage.getItem("token") || "";
  var userInfo = JSON.parse(localStorage.getItem("user") || "null");

  var pageTitles = {
    "dashboard": "📊 仪表盘",
    "screen": "🖥️ 数据大屏",
    "users": "👥 用户管理",
    "enterprises": "🏢 企业审核",
    "jobs": "💼 岗位审核",
    "resumes": "📄 简历审核",
    "reviews": "💬 用户点评",
    "prompts": "🧠 Prompt 模板",
    "interview-bank": "🗣️ 面试题库",
    "exam-bank": "📝 笔试题库",
    "feedback": "👍 AI 用户反馈",
    "bad-cases": "🐞 坏案例库",
    "ai-usage": "📈 AI 使用情况",
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
      var msg = "请求失败";
      if (data) {
        if (typeof data.message === "string") msg = data.message;
        else if (typeof data.detail === "string") msg = data.detail;
        else if (Array.isArray(data.detail)) msg = data.detail.map(function (d) { return d.msg || JSON.stringify(d); }).join("; ");
      }
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
    if (key !== "screen") _destroyScreenCharts();

    var loaders = {
      "dashboard": loadDashboard,
      "screen": loadScreen,
      "users": loadUsers,
      "enterprises": loadEnterprises,
      "jobs": loadJobsAudit,
      "resumes": loadResumesAudit,
      "reviews": loadReviews,
      "prompts": loadPrompts,
      "interview-bank": loadInterviewBank,
      "exam-bank": loadExamBank,
      "feedback": loadFeedback,
      "bad-cases": loadBadCases,
      "ai-usage": loadAIUsage,
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
      "pending": ['badge-warn', "待审核"],
      "approved": ['badge-success', "已通过"],
      "rejected": ['badge-danger', "已拒绝"],
      "active": ['badge-success', "活跃"],
      "closed": ['badge-gray', "已关闭"],
      "draft": ['badge-gray', "草稿"],
      "published": ['badge-success', "已发布"],
    };
    if (s === null || s === undefined || s === "") s = "pending";
    if (map[s]) return '<span class="badge badge-' + map[s][0] + '">' + map[s][1] + "</span>";
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

  window.openCreateEntForm = function () {
    openModal("➕ 管理员注册企业",
      '<div style="color:#64748b;font-size:12px;margin-bottom:12px;">提交后状态为"待审核"，请在企业审核列表中手动点通过</div>' +
      '<div class="modal-form-row"><label>登录用户名 <span style="color:#ef4444;">*</span></label><input id="ce_username" type="text" placeholder="例如：google_china"></div>' +
      '<div class="modal-form-row"><label>登录密码 <span style="color:#ef4444;">*</span></label><input id="ce_password" type="text" value="ent123456" placeholder="默认 ent123456"></div>' +
      '<div class="modal-form-row"><label>企业名称 <span style="color:#ef4444;">*</span></label><input id="ce_company" type="text" placeholder="例如：谷歌中国"></div>' +
      '<div class="modal-form-row"><label>所属行业</label><input id="ce_industry" type="text" placeholder="例如：互联网/AI"></div>' +
      '<div class="modal-form-row"><label>联系人</label><input id="ce_contact" type="text" placeholder="HR 张先生"></div>' +
      '<div class="modal-form-row"><label>联系电话</label><input id="ce_phone" type="text" placeholder="13800000000"></div>' +
      '<div class="modal-form-row"><label>企业简介</label><textarea id="ce_intro" rows="3" placeholder="一句话介绍企业..."></textarea></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createEnt()">提交待审核</button>' +
      "</div>"
    );
  };

  window.createEnt = async function () {
    var username = document.getElementById("ce_username").value.trim();
    var password = document.getElementById("ce_password").value.trim();
    var company = document.getElementById("ce_company").value.trim();
    var industry = document.getElementById("ce_industry").value.trim();
    var contact = document.getElementById("ce_contact").value.trim();
    var phone = document.getElementById("ce_phone").value.trim();
    var intro = document.getElementById("ce_intro").value.trim();
    if (!username || !password || !company) { toast("请填写必填项", "warn"); return; }
    try {
      await api("POST", "/enterprises", null, {
        username: username, password: password, company_name: company,
        industry: industry || undefined, contact_name: contact || undefined,
        contact_phone: phone || undefined, intro: intro || undefined,
      });
      toast("企业已提交，等待审核");
      closeModal();
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

  window.openCreateJobForm = function () {
    openModal("➕ 管理员发布岗位",
      '<div style="color:#64748b;font-size:12px;margin-bottom:12px;">提交后状态为"待审核"，请在岗位审核列表中手动点通过</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">' +
      '<div class="modal-form-row"><label>岗位名称 <span style="color:#ef4444;">*</span></label><input id="cj_title" type="text" placeholder="例如：高级后端工程师"></div>' +
      '<div class="modal-form-row"><label>企业名称 <span style="color:#ef4444;">*</span></label><input id="cj_company" type="text" placeholder="例如：字节跳动"></div>' +
      '<div class="modal-form-row"><label>城市</label><input id="cj_city" type="text" placeholder="例如：北京/上海"></div>' +
      '<div class="modal-form-row"><label>岗位类型</label><select id="cj_type"><option value="">请选择</option><option value="全职">全职</option><option value="实习">实习</option></select></div>' +
      '<div class="modal-form-row"><label>最低月薪(K)</label><input id="cj_sal_min" type="number" placeholder="例如：15"></div>' +
      '<div class="modal-form-row"><label>最高月薪(K)</label><input id="cj_sal_max" type="number" placeholder="例如：30"></div>' +
      '<div class="modal-form-row"><label>经验要求</label><input id="cj_exp" type="text" placeholder="例如：1-3年 / 应届"></div>' +
      '<div class="modal-form-row"><label>学历要求</label><input id="cj_edu" type="text" placeholder="例如：本科"></div>' +
      '<div class="modal-form-row"><label>岗位分类</label><input id="cj_cat" type="text" placeholder="例如：后端开发"></div>' +
      '<div class="modal-form-row"><label>技能标签(逗号分隔)</label><input id="cj_skills" type="text" placeholder="例如：Java,MySQL,Redis"></div>' +
      '</div>' +
      '<div class="modal-form-row" style="margin-top:8px;"><label>岗位描述</label><textarea id="cj_desc" rows="3" placeholder="JD 简介，工作内容..."></textarea></div>' +
      '<div class="modal-form-row"><label>任职要求</label><textarea id="cj_req" rows="2" placeholder="任职资格，技术栈..."></textarea></div>' +
      '<div class="modal-form-row"><label>状态</label><select id="cj_status"><option value="pending" selected>待审核(默认)</option><option value="approved">已通过</option><option value="rejected">已下架</option></select></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createJob()">提交待审核</button>' +
      "</div>"
    );
  };

  window.createJob = async function () {
    var title = document.getElementById("cj_title").value.trim();
    var company = document.getElementById("cj_company").value.trim();
    if (!title || !company) { toast("请填写必填项：岗位名称、企业名称", "warn"); return; }
    var city = document.getElementById("cj_city").value.trim();
    var jtype = document.getElementById("cj_type").value;
    var salMin = document.getElementById("cj_sal_min").value.trim();
    var salMax = document.getElementById("cj_sal_max").value.trim();
    var exp = document.getElementById("cj_exp").value.trim();
    var edu = document.getElementById("cj_edu").value.trim();
    var cat = document.getElementById("cj_cat").value.trim();
    var skills = document.getElementById("cj_skills").value.trim();
    var desc = document.getElementById("cj_desc").value.trim();
    var req = document.getElementById("cj_req").value.trim();
    var status = document.getElementById("cj_status").value;
    try {
      await api("POST", "/jobs", null, {
        title: title, company: company, city: city || undefined,
        job_type: jtype || undefined,
        salary_min: salMin ? parseInt(salMin) : undefined,
        salary_max: salMax ? parseInt(salMax) : undefined,
        experience: exp || undefined, education: edu || undefined,
        category: cat || undefined, skills: skills || undefined,
        description: desc || undefined, requirement: req || undefined,
        status: status,
      });
      toast("岗位已提交，等待审核");
      closeModal();
      loadJobsAudit();
    } catch (e) {}
  };

  /* ============ 简历审核 ============ */
  async function loadResumesAudit() {
    var status = document.getElementById("resumeStatus").value;
    var keywordEl = document.getElementById("resumeKeyword");
    var keyword = keywordEl ? keywordEl.value.trim() : "";
    var params = {};
    if (status) params.status = status;
    if (keyword) params.keyword = keyword;
    var data = await api("GET", "/resumes/audit", null, params);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (r) {
      var schoolMajor = [fmt(r.school), fmt(r.major)].filter(Boolean).join(" / ");
      var userCell = '<div><b>' + fmt(r.real_name || r.username) + '</b> <span style="color:#94a3b8;font-size:12px;">@' + fmt(r.username) + '</span></div>' +
                     '<div style="color:#94a3b8;font-size:11px;">UID:' + r.user_id + ' v' + (r.version || 1) + (r.is_default ? " ⭐" : "") + '</div>';
      html += "<tr>" +
        '<td class="mono-id">' + r.id + "</td>" +
        "<td>" + userCell + "</td>" +
        '<td style="font-size:12px;color:#64748b;">' + schoolMajor + "</td>" +
        "<td>" + fmt(r.title) + "</td>" +
        '<td style="font-size:12px;color:#64748b;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + fmt(r.summary).replace(/"/g, "&quot;") + '">' + fmt(r.summary) + "</td>" +
        "<td>" + statusBadge(r.status) + "</td>" +
        "<td>" + fmtDate(r.updated_at || r.created_at) + "</td>" +
        '<td>' + resumeAuditBtns(r.id, r.status) + "</td>" +
        "</tr>";
    });
    document.getElementById("resumeTbody").innerHTML = html || '<tr><td colspan="8" style="text-align:center;padding:40px;color:#94a3b8;">暂无数据</td></tr>';
  }

  function resumeAuditBtns(id, cur) {
    var html = '<button class="btn-info btn-sm btn-table" onclick="viewResume(' + id + ')">👁 查看</button>';
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

  window.viewResume = async function (id) {
    try {
      var data = await api("GET", "/resumes/" + id);
      document.getElementById("modalTitle").textContent = "📄 简历详情 #" + data.id + " · " + (data.title || "未命名");
      var c = data.content || {};
      var rows = [
        ["用户", (data.real_name || "") + (data.username ? "(@" + data.username + ")" : "")],
        ["学校 / 专业", [data.school, data.major].filter(Boolean).join(" / ")],
        ["联系电话", data.phone || (c.phone || "")],
        ["邮箱", c.email || ""],
        ["状态", data.status],
        ["默认版本", data.is_default ? "是 ⭐" : "否"],
        ["版本号", "v" + (data.version || 1)],
        ["上传源文件", data.source_file || "（在线创建）"],
        ["创建时间", fmtDate(data.created_at)],
        ["更新时间", fmtDate(data.updated_at)],
      ];
      var infoHtml = '<div class="kv-grid">' + rows.map(function (r) {
        return '<div class="kv-item"><span class="kv-k">' + r[0] + '</span><span class="kv-v">' + fmt(r[1]) + '</span></div>';
      }).join("") + '</div>';

      var contentJson = "";
      try { contentJson = JSON.stringify(c, null, 2); } catch (e) { contentJson = String(c); }

      var html = infoHtml +
        '<div style="margin-top:16px;"><div class="sub-title">📋 结构化简历内容（JSON）</div>' +
        '<pre style="background:#0f172a;color:#e2e8f0;padding:14px;border-radius:8px;font-size:12px;max-height:340px;overflow:auto;margin:8px 0;white-space:pre-wrap;word-break:break-all;">' +
        (contentJson || "（空）") + '</pre></div>';

      if (data.raw_text) {
        html += '<div style="margin-top:16px;"><div class="sub-title">📝 解析后的原始文本</div>' +
          '<pre style="background:#f1f5f9;color:#334155;padding:14px;border-radius:8px;font-size:12px;max-height:220px;overflow:auto;margin:8px 0;white-space:pre-wrap;">' +
          fmt(data.raw_text) + '</pre></div>';
      }

      html += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="btn-primary" onclick="closeModal()">关闭</button>' +
        (data.source_file ? '<button class="btn-info" onclick="openResumeSource(' + data.id + ',\'' + (data.source_file.replace(/'/g, "\\'")) + '\')">📎 查看原文件</button>' : "") +
        (data.status !== "published" ? '<button class="btn-primary" onclick="auditResume(' + data.id + ',\'published\');closeModal()">直接发布</button>' : "") +
        (data.status !== "rejected" ? '<button class="btn-danger" onclick="auditResume(' + data.id + ',\'rejected\');closeModal()">退回</button>' : "") +
        '</div>';

      document.getElementById("modalBody").innerHTML = html;
      document.getElementById("modal").style.display = "flex";
    } catch (e) {
      toast("加载简历失败: " + (e && e.message || e), "error");
    }
  };

  window.openResumeSource = async function (id, filename) {
    try {
      var headers = {};
      if (token) headers["Authorization"] = "Bearer " + token;
      var resp = await fetch(ADMIN + "/resumes/" + id + "/source", { headers: headers });
      if (!resp.ok) {
        var msg = "";
        try { msg = (await resp.json()).message || resp.statusText; } catch (e) { msg = resp.statusText; }
        toast("无法打开原文件: " + msg, "error");
        return;
      }
      var blob = await resp.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      var name = filename ? filename.split("/").pop() : "resume";
      var ext = name.includes(".") ? "" : "." + (blob.type.split("/")[1] || "bin");
      a.download = name + ext;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    } catch (e) {
      toast("打开原文件失败: " + (e && e.message || e), "error");
    }
  };
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
      await api("POST", "/interview-bank", { category: category, question: question, difficulty: difficulty, reference_answer: answer || undefined });
      toast("添加成功");
      closeModal();
      loadInterviewBank();
    } catch (e) {}
  };

  window.openInterviewImport = function () {
    var example = JSON.stringify([
      { category: "Java", question: "HashMap 和 ConcurrentHashMap 有什么区别？", difficulty: "medium", reference_answer: "HashMap 非线程安全...", tags: "Java,集合" },
      { category: "前端", question: "说说 React 的虚拟 DOM", difficulty: "easy", reference_answer: "虚拟 DOM 是..." }
    ], null, 2);
    openModal("批量导入面试题",
      '<div style="font-size:13px;color:#475569;background:#f1f5f9;padding:10px;border-radius:6px;margin-bottom:10px;">' +
      '📋 格式：JSON 数组，每项包含 <code>category</code>、<code>question</code> 必填，<code>difficulty</code>(easy/medium/hard)、<code>reference_answer</code>、<code>tags</code> 可选。最多 500 条。' +
      '</div>' +
      '<div class="modal-form-row"><label>粘贴 JSON</label><textarea id="iq_import" rows="10" placeholder=\'示例：\n' + example.replace(/'/g, "&#39;") + '\'></textarea></div>' +
      '<div class="modal-form-row" style="display:flex;gap:10px;align-items:center;">' +
      '<label style="margin:0;">或选择 JSON 文件</label>' +
      '<input type="file" id="iq_import_file" accept=".json,application/json" style="font-size:13px;">' +
      '</div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="submitInterviewImport()">导入</button>' +
      "</div>"
    );
    var fileInput = document.getElementById("iq_import_file");
    fileInput.onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { document.getElementById("iq_import").value = reader.result; };
      reader.readAsText(f, "utf-8");
    };
  };

  window.submitInterviewImport = async function () {
    var text = document.getElementById("iq_import").value.trim();
    if (!text) { toast("请粘贴 JSON 内容或选择文件", "warn"); return; }
    var arr;
    try { arr = JSON.parse(text); } catch (e) { toast("JSON 解析失败: " + e.message, "error"); return; }
    if (!Array.isArray(arr)) { toast("内容必须是 JSON 数组", "error"); return; }
    try {
      var r = await api("POST", "/interview-bank/import", arr);
      var d = r && r.data ? r.data : (r || {});
      var msg = "成功导入 " + (d.created || 0) + " 条";
      if (d.failed) msg += "，失败 " + d.failed + " 条";
      if (d.errors && d.errors.length) msg += "\n" + d.errors.slice(0, 5).join("\n");
      toast(msg, d.failed ? "warn" : "ok");
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

  window.openExamForm = function () {
    openModal("添加笔试题目",
      '<div class="modal-form-row"><label>类别（如 前端、后端、算法）</label><input id="eq_cat" type="text"></div>' +
      '<div class="modal-form-row"><label>题型</label>' +
      '<select id="eq_type" onchange="var s=this.value;document.getElementById(\'eq_opts_row\').style.display=(s===\'single\'||s===\'multiple\')?\'\':\'none\';">' +
      '<option value="single">单选题</option><option value="multiple">多选题</option><option value="qa" selected>问答题</option><option value="code">代码题</option>' +
      '</select></div>' +
      '<div class="modal-form-row"><label>难度</label><select id="eq_diff"><option value="easy">简单</option><option value="medium" selected>中等</option><option value="hard">困难</option></select></div>' +
      '<div class="modal-form-row"><label>题目</label><textarea id="eq_q" rows="3"></textarea></div>' +
      '<div class="modal-form-row" id="eq_opts_row" style="display:none;"><label>选项（每行一个，无需 A/B/C/D 前缀）</label><textarea id="eq_opts" rows="4" placeholder="选项 1&#10;选项 2&#10;选项 3&#10;选项 4"></textarea></div>' +
      '<div class="modal-form-row"><label>参考答案（选择题填选项字母，如 A 或 ABC）</label><textarea id="eq_ans" rows="2"></textarea></div>' +
      '<div class="modal-form-row"><label>解析（可选）</label><textarea id="eq_analysis" rows="3"></textarea></div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="createExamQ()">添加</button>' +
      "</div>"
    );
  };

  window.createExamQ = async function () {
    var category = document.getElementById("eq_cat").value.trim();
    var qtype = document.getElementById("eq_type").value;
    var difficulty = document.getElementById("eq_diff").value;
    var question = document.getElementById("eq_q").value.trim();
    var optsText = document.getElementById("eq_opts").value.trim();
    var answer = document.getElementById("eq_ans").value.trim();
    var analysis = document.getElementById("eq_analysis").value.trim();
    if (!category || !question) { toast("请填写类别和题目", "warn"); return; }
    var options = null;
    if (qtype === "single" || qtype === "multiple") {
      if (!optsText) { toast("选择题必须填写选项", "warn"); return; }
      options = optsText.split("\n").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
      if (options.length < 2) { toast("至少 2 个选项", "warn"); return; }
    }
    try {
      await api("POST", "/exam-bank", {
        category: category, question: question, question_type: qtype,
        options: options, answer: answer || undefined, analysis: analysis || undefined,
        difficulty: difficulty
      });
      toast("添加成功");
      closeModal();
      loadExamBank();
    } catch (e) {}
  };

  window.openExamImport = function () {
    var example = JSON.stringify([
      { category: "Java", question_type: "single", question: "下列哪个不是 Java 基本类型？", options: ["int", "String", "boolean", "double"], answer: "B", analysis: "String 是引用类型", difficulty: "easy" },
      { category: "数据库", question_type: "qa", question: "简述索引的优缺点", answer: "优点：加快查询速度...", difficulty: "medium" },
      { category: "算法", question_type: "code", question: "实现一个快速排序函数", answer: "def quicksort(arr):...", difficulty: "hard" }
    ], null, 2);
    openModal("批量导入笔试题",
      '<div style="font-size:13px;color:#475569;background:#f1f5f9;padding:10px;border-radius:6px;margin-bottom:10px;">' +
      '📋 格式：JSON 数组，必填 <code>category</code>、<code>question</code>、<code>question_type</code>(single/multiple/qa/code)。选择题必须提供 <code>options</code> 数组。<code>answer</code>、<code>analysis</code>、<code>difficulty</code> 可选。最多 500 条。' +
      '</div>' +
      '<div class="modal-form-row"><label>粘贴 JSON</label><textarea id="eq_import" rows="10" placeholder=\'示例：\n' + example.replace(/'/g, "&#39;") + '\'></textarea></div>' +
      '<div class="modal-form-row" style="display:flex;gap:10px;align-items:center;">' +
      '<label style="margin:0;">或选择 JSON 文件</label>' +
      '<input type="file" id="eq_import_file" accept=".json,application/json" style="font-size:13px;">' +
      '</div>' +
      '<div class="modal-form-actions">' +
      '<button class="btn-ghost btn-ghost-dark" onclick="closeModal()">取消</button>' +
      '<button class="btn-primary" onclick="submitExamImport()">导入</button>' +
      "</div>"
    );
    var fileInput = document.getElementById("eq_import_file");
    fileInput.onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { document.getElementById("eq_import").value = reader.result; };
      reader.readAsText(f, "utf-8");
    };
  };

  window.submitExamImport = async function () {
    var text = document.getElementById("eq_import").value.trim();
    if (!text) { toast("请粘贴 JSON 内容或选择文件", "warn"); return; }
    var arr;
    try { arr = JSON.parse(text); } catch (e) { toast("JSON 解析失败: " + e.message, "error"); return; }
    if (!Array.isArray(arr)) { toast("内容必须是 JSON 数组", "error"); return; }
    try {
      var r = await api("POST", "/exam-bank/import", arr);
      var d = r && r.data ? r.data : (r || {});
      var msg = "成功导入 " + (d.created || 0) + " 条";
      if (d.failed) msg += "，失败 " + d.failed + " 条";
      if (d.errors && d.errors.length) msg += "\n" + d.errors.slice(0, 5).join("\n");
      toast(msg, d.failed ? "warn" : "ok");
      closeModal();
      loadExamBank();
    } catch (e) {}
  };

  /* ============ 用户点评 ============ */
  async function loadReviews() {
    try {
      var stats = await api("GET", "/reviews/stats");
      if (stats) {
        var shtml =
          '<div class="stat-card"><div class="stat-label">💬 总点评数</div><div class="stat-value">' + stats.total + '</div><div class="stat-sub">👍 ' + stats.like + ' / 👎 ' + stats.dislike + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">🏢 企业点评</div><div class="stat-value">' + stats.enterprise.total + '</div><div class="stat-sub">👍 ' + stats.enterprise.like + ' · 👎 ' + stats.enterprise.dislike + ' · ⏳ ' + stats.enterprise.pending + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">💼 岗位点评</div><div class="stat-value">' + stats.job.total + '</div><div class="stat-sub">👍 ' + stats.job.like + ' · 👎 ' + stats.job.dislike + ' · ⏳ ' + stats.job.pending + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">⏳ 待审核 / 点赞率</div><div class="stat-value" style="color:#f59e0b;">' + stats.pending + '</div><div class="stat-sub">企业点赞 ' + stats.enterprise.like_rate + '% · 岗位点赞 ' + stats.job.like_rate + '%</div></div>';
        document.getElementById("reviewStats").innerHTML = shtml;
      }
    } catch (e) {}

    var keyword = document.getElementById("reviewKeyword").value.trim();
    var targetType = document.getElementById("reviewTarget").value;
    var ratingRaw = document.getElementById("reviewRating").value;
    var rating = ratingRaw === "" ? null : parseInt(ratingRaw, 10);
    var status = document.getElementById("reviewStatus").value;

    var params = {};
    if (keyword) params.keyword = keyword;
    if (targetType) params.target_type = targetType;
    if (rating !== null && !isNaN(rating)) params.rating = rating;
    if (status) params.status = status;

    var data = await api("GET", "/reviews", null, params);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    if (!rows.length) {
      html = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">暂无点评记录</td></tr>';
    } else {
      rows.forEach(function (r) {
        var userLabel = r.real_name ? (r.username + "（" + r.real_name + "）") : r.username;
        var targetLabel = r.target_type === "enterprise" ? "🏢 " + r.target_name : "💼 " + r.target_name;

        var ratingHtml = "";
        if (r.rating === 1) ratingHtml = '<span class="badge badge-success">👍 点赞</span>';
        else if (r.rating === -1) ratingHtml = '<span class="badge badge-danger">👎 点踩</span>';
        else ratingHtml = '<span class="badge">💬 仅点评</span>';

        var statusClass = r.status === "approved" ? "badge-success" : r.status === "rejected" ? "badge-danger" : "badge-warn";
        var statusText = r.status === "approved" ? "已通过" : r.status === "rejected" ? "已拒绝" : "待审核";

        html += "<tr>" +
          '<td class="mono-id">' + r.id + "</td>" +
          "<td>" + fmt(userLabel) + "</td>" +
          "<td>" + (r.target_type === "enterprise" ? "🏢 企业" : "💼 岗位") + "</td>" +
          "<td style='max-width:220px;white-space:normal;word-break:break-all;' title='" + fmt(r.target_name) + "'>" + fmt(r.target_name) + "</td>" +
          "<td>" + ratingHtml + "</td>" +
          "<td style='max-width:260px;white-space:normal;word-break:break-all;' title='" + fmt(r.content) + "'>" + fmt(r.content) + "</td>" +
          '<td><span class="badge ' + statusClass + '">' + statusText + "</span></td>" +
          "<td>" + fmtDate(r.created_at) + "</td>" +
          "<td>" +
            (r.status !== "approved" ? '<button class="btn-primary btn-sm btn-table" onclick="setReviewStatus(' + r.id + ', \'approved\')">通过</button> ' : "") +
            (r.status !== "rejected" ? '<button class="btn-warn btn-sm btn-table" onclick="setReviewStatus(' + r.id + ', \'rejected\')">拒绝</button> ' : "") +
            '<button class="btn-ghost btn-sm btn-table" onclick="deleteReview(' + r.id + ')">删除</button>' +
          "</td>" +
          "</tr>";
      });
    }
    document.getElementById("reviewTbody").innerHTML = html;
  }

  window.setReviewStatus = async function (id, status) {
    try {
      await api("PUT", "/reviews/" + id + "/status" + "?status=" + encodeURIComponent(status));
      toast(status === "approved" ? "已通过" : "已拒绝");
      loadReviews();
    } catch (e) {}
  };

  window.deleteReview = async function (id) {
    if (!confirm("确定删除这条点评吗？")) return;
    try {
      await api("DELETE", "/reviews/" + id);
      toast("已删除");
      loadReviews();
    } catch (e) {}
  };


  /* ============ AI 反馈 ============ */
  async function loadFeedback() {
    var type = document.getElementById("fbType").value;
    var data = await api("GET", "/feedback", null, type ? { target_type: type } : null);
    var rows = Array.isArray(data) ? data : (data.data || []);
    var html = "";
    rows.forEach(function (f) {
      var userLabel = f.real_name ? (f.username + "（" + f.real_name + "）") : f.username;
      if (!userLabel) userLabel = "用户#" + f.user_id;
      var feedbackHtml = f.feedback === "like"
        ? '<span class="badge badge-success">👍 喜欢</span>'
        : '<span class="badge badge-danger">👎 点踩</span>';
      html += "<tr>" +
        '<td class="mono-id">' + f.id + "</td>" +
        "<td>" + fmt(userLabel) + "</td>" +
        "<td>" + fmt(f.target_label || f.target_type) + "</td>" +
        "<td style='max-width:220px;' title='" + fmt(f.target_name) + "'>" + fmt(f.target_name) + "</td>" +
        "<td>" + feedbackHtml + "</td>" +
        "<td class='long-text'>" + fmt(f.comment) + "</td>" +
        "<td>" + fmtDate(f.created_at) + "</td>" +
        "</tr>";
    });
    document.getElementById("fbTbody").innerHTML = html || '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">暂无反馈</td></tr>';
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
      await api("POST", "/messages", { title: title, content: content, target_role: role });
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

  /* ============ 数据大屏 ============ */
  var _screenCharts = [];

  function _destroyScreenCharts() {
    _screenCharts.forEach(function (c) { try { c.destroy(); } catch (_) {} });
    _screenCharts = [];
  }

  async function loadScreen() {
    try {
      var data = await api("GET", "/stats/overview");
      var d = data.data || data;
      var k = d.kpis || {};
      document.getElementById("sc-students").textContent = fmt(k.student_count);
      document.getElementById("sc-enterprises").textContent = fmt(k.enterprise_count);
      document.getElementById("sc-jobs").textContent = fmt(k.job_count);
      document.getElementById("sc-resumes").textContent = fmt(k.resume_count);
      document.getElementById("sc-applies").textContent = fmt(k.apply_count);
      document.getElementById("sc-interviews").textContent = fmt(k.interview_done);
      document.getElementById("sc-exams").textContent = fmt(k.exam_done);
      document.getElementById("sc-likerate").textContent = (k.ai_like_rate == null ? "-" : k.ai_like_rate + "%");

      if (!window.Chart) return;
      _destroyScreenCharts();
      var palette = ["#7b5cc7", "#f6d34d", "#15b375", "#ff7a45", "#5aa9ff", "#b79ce0", "#ef4444", "#8b7bd8"];

      var days = d.new_students_7d || [];
      _screenCharts.push(new Chart(document.getElementById("scLineStudents"), {
        type: "line",
        data: {
          labels: days.map(function (x) { return x.date; }),
          datasets: [{
            label: "新增学生", data: days.map(function (x) { return x.count; }),
            borderColor: "#7b5cc7", backgroundColor: "rgba(123,92,199,.15)", fill: true, tension: 0.35,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      }));

      var cats = d.job_categories || [];
      _screenCharts.push(new Chart(document.getElementById("scDoughnutCats"), {
        type: "doughnut",
        data: {
          labels: cats.map(function (x) { return x.name; }),
          datasets: [{ data: cats.map(function (x) { return x.count; }), backgroundColor: palette, borderWidth: 2, borderColor: "#fff" }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } },
      }));

      var st = d.apply_status || [];
      var stNames = { submitted: "已投递", viewed: "已查看", accepted: "邀面试", rejected: "未通过" };
      _screenCharts.push(new Chart(document.getElementById("scPieApply"), {
        type: "pie",
        data: {
          labels: st.map(function (x) { return stNames[x.name] || x.name; }),
          datasets: [{ data: st.map(function (x) { return x.count; }), backgroundColor: ["#7b5cc7", "#f6d34d", "#15b375", "#ef4444"], borderWidth: 2, borderColor: "#fff" }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } },
      }));

      var cities = d.top_cities || [];
      _screenCharts.push(new Chart(document.getElementById("scBarCities"), {
        type: "bar",
        data: {
          labels: cities.map(function (x) { return x.name; }),
          datasets: [{ label: "岗位数", data: cities.map(function (x) { return x.count; }), backgroundColor: "#7b5cc7", borderRadius: 6 }],
        },
        options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      }));
    } catch (e) { /* api() 已 toast */ }
  }

  /* ============ AI 使用情况 ============ */
  var _aiAgentChart = null;
  var _aiDailyChart = null;

  async function loadAIUsage() {
    try {
      var data = await api("GET", "/ai-usage");
      var d = data.data || data;
      var ov = d.overview || {};

      document.getElementById("ai-interview-total").textContent = fmt(ov.interview_total);
      document.getElementById("ai-interview-msgs").textContent = fmt(ov.interview_msgs);
      document.getElementById("ai-exam-sessions").textContent = fmt(ov.exam_sessions);
      document.getElementById("ai-exam-q").textContent = fmt(ov.exam_q_count);
      document.getElementById("ai-resume").textContent = fmt(ov.resume_count);
      document.getElementById("ai-fb-like").textContent = fmt(ov.feedback_like);
      document.getElementById("ai-fb-dislike").textContent = fmt(ov.feedback_dislike);
      document.getElementById("ai-total").textContent = fmt(ov.total_ai_actions);

      // Agent 柱状图
      if (window.Chart) {
        var bars = (d.by_agent || []).map(function (a) { return a.count; });
        var labels = (d.by_agent || []).map(function (a) { return a.agent; });
        if (_aiAgentChart) _aiAgentChart.destroy();
        _aiAgentChart = new Chart(document.getElementById("agentBarChart"), {
          type: "bar",
          data: {
            labels: labels,
            datasets: [{
              label: "调用次数",
              data: bars,
              backgroundColor: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"],
              borderRadius: 6,
            }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });

        // 7 天趋势折线图
        var days = d.daily_trend || [];
        if (_aiDailyChart) _aiDailyChart.destroy();
        _aiDailyChart = new Chart(document.getElementById("dailyLineChart"), {
          type: "line",
          data: {
            labels: days.map(function (x) { return x.date; }),
            datasets: [
              { label: "AI面试", data: days.map(function (x) { return x.interview; }), borderColor: "#3b82f6", tension: 0.3, fill: false },
              { label: "AI笔试", data: days.map(function (x) { return x.exam; }), borderColor: "#10b981", tension: 0.3, fill: false },
              { label: "用户反馈", data: days.map(function (x) { return x.feedback; }), borderColor: "#f59e0b", tension: 0.3, fill: false },
              { label: "坏案例", data: days.map(function (x) { return x.bad_case; }), borderColor: "#ef4444", tension: 0.3, fill: false },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false },
        });
      }

      // TOP 用户
      var top = d.top_users || [];
      var html = "";
      top.forEach(function (u, i) {
        var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
        html += "<tr>" +
          "<td>" + medal + "</td>" +
          '<td class="mono-id">' + fmt(u.user_id) + "</td>" +
          "<td>" + fmt(u.username) + "</td>" +
          "<td>" + fmt(u.real_name) + "</td>" +
          "<td>" + fmt(u.school) + "</td>" +
          '<td class="mono-id">' + fmt(u.interview || 0) + "</td>" +
          '<td class="mono-id">' + fmt(u.exam || 0) + "</td>" +
          '<td class="mono-id">' + fmt(u.resume || 0) + "</td>" +
          '<td class="mono-id"><b>' + fmt(u.total || 0) + "</b></td>" +
          "</tr>";
      });
      document.getElementById("aiTopTbody").innerHTML = html || '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8;">暂无 AI 使用记录</td></tr>';
    } catch (e) {}
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
