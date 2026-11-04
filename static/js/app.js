﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿(function () {
  "use strict";

  var API = "";
  var _allJobs = [];
  var _allResumes = [];
  var _editingResumeId = null;
  var _filterCity = "";
  var _posType = "";
  var _posSort = "new";
  var _salaryMinK = 0;
  var _collectedIds = {};
  var _compareIds = [];
  var _skillsCache = null;

  document.addEventListener("DOMContentLoaded", init);

  function authHeaders(json) {
    var h = { "Authorization": "Bearer " + getToken() };
    if (json !== false) h["Content-Type"] = "application/json";
    return h;
  }
  function toList(data) {
    if (Array.isArray(data)) return data;
    if (data && data.data && Array.isArray(data.data.items)) return data.data.items;
    if (data && data.data && Array.isArray(data.data.recommendations)) return data.data.recommendations;
    if (data && data.data && Array.isArray(data.data)) return data.data;
    return [];
  }
  function extractMsg(d) {
    if (!d) return "";
    if (typeof d === "string") return d;
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail)) {
      return d.detail.map(function (e) { return e.msg || String(e); }).join("; ");
    }
    return d.message || "";
  }

  function getToken() { return localStorage.getItem("token") || ""; }
  function getMe() { try { return JSON.parse(localStorage.getItem("user") || "null"); } catch (e) { return null; } }
  function setAuth(token, me) {
    if (token) localStorage.setItem("token", token);
    if (me) localStorage.setItem("user", JSON.stringify(me));
    _recommendCache = null;
    loadCollectedIds();
  }
  function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    _recommendCache = null;
    _collectedIds = {};
    _skillsCache = null;
  }

  function init() {
    document.querySelectorAll(".modal, .modal-mask, .exam-mask").forEach(function (n) { n.remove(); });
    initAuth();
    bindTabBar();
    bindSearch();
    bindRegionSwitch();
    bindEduSearch();
    bindJobCardClick();
    bindPositionFilter();
    bindBackTop();
    bindThemeToggle();
    bindCompareBar();
    bindLoginForm();
    applyLoginState();
    loadCollectedIds();
    bindFABDrag();
    switchTab("home");
    validateTokenSilently();
  }

  async function validateTokenSilently() {
    var token = getToken();
    if (!token) return;
    try {
      var r = await fetch(API + "/api/auth/me", {
        headers: { "Authorization": "Bearer " + token }
      });
      if (!r.ok) {
        var u = null;
        try { u = JSON.parse(localStorage.getItem("user") || "null"); } catch (e) {}
        clearAuth();
        applyLoginState();
        if (u && u.username) {
          alert("检测到登录已失效，请重新登录。");
        }
      }
    } catch (e) { }
  }

  function bindFABDrag() {
    var fab = document.querySelector(".fab-ai");
    if (!fab) return;

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("fab_pos") || "null"); } catch (e) { }
    if (saved && typeof saved.left === "number") {
      fab.style.right = "auto";
      fab.style.bottom = saved.bottom + "px";
      fab.style.left = saved.left + "px";
    }

    var isDragging = false;
    var startX = 0, startY = 0;
    var startLeft = 0, startBottom = 0;
    var moved = false;

    function onStart(clientX, clientY) {
      var rect = fab.getBoundingClientRect();
      startX = clientX;
      startY = clientY;
      startLeft = rect.left;
      startBottom = window.innerHeight - rect.bottom;
      fab.style.left = rect.left + "px";
      fab.style.bottom = startBottom + "px";
      fab.style.right = "auto";
      isDragging = true;
      moved = false;
      fab.style.transition = "none";
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      var dx = clientX - startX;
      var dy = clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      var newLeft = Math.max(0, Math.min(window.innerWidth - fab.offsetWidth, startLeft + dx));
      var newBottom = Math.max(0, Math.min(window.innerHeight - fab.offsetHeight, startBottom - dy));
      fab.style.left = newLeft + "px";
      fab.style.bottom = newBottom + "px";
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;
      fab.style.transition = "";
      if (moved) {
        var pos = { left: parseFloat(fab.style.left), bottom: parseFloat(fab.style.bottom) };
        try { localStorage.setItem("fab_pos", JSON.stringify(pos)); } catch (e) { }
      }
    }

    fab.addEventListener("mousedown", function (e) {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", function (e) { onMove(e.clientX, e.clientY); });
    fab.addEventListener("mouseup", function (e) {
      e.preventDefault();
      if (!isDragging) return;
      var wasMoved = moved;
      onEnd();
      if (!wasMoved) switchTab("ai");
    });
    fab.addEventListener("mouseleave", function () {
      if (isDragging) { onEnd(); }
    });

    fab.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    fab.addEventListener("touchmove", function (e) {
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    fab.addEventListener("touchend", function (e) {
      if (!isDragging) return;
      var wasMoved = moved;
      onEnd();
      if (!wasMoved) switchTab("ai");
    });
  }

  function initAuth() {
    var url = new URL(location.href);
    var token = url.searchParams.get("token");
    var meStr = url.searchParams.get("me");
    if (token) {
      try {
        var me = meStr ? JSON.parse(decodeURIComponent(meStr)) : null;
        setAuth(token, me);
        url.searchParams.delete("token");
        if (meStr) url.searchParams.delete("me");
        history.replaceState(null, "", url.toString());
      } catch (e) { }
    }
  }

  function applyLoginState() {
    var me = getMe();
    var loginArea = document.getElementById("user-area");
    if (!loginArea) return;
    if (me) {
      loginArea.innerHTML = '<div class="hdr-user">你好, ' + _esc(me.username || me.name || "用户") + '</div><button class="btn-mini" onclick="logout()">退出</button>';
    } else {
      loginArea.innerHTML = '<a class="hdr-login" href="/login">登录</a><button class="btn-mini btn-primary-mini" onclick="goRegister()">注册</button>';
    }
  }

  function bindLoginForm() {
    var form = document.getElementById("login-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var payload = {
        username: (f.get("username") || "").trim(),
        password: (f.get("password") || "").trim(),
        role: f.get("role") || "student"
      };
      var isRegister = location.pathname.indexOf("register") > -1;
      var url = isRegister ? API + "/api/auth/register" : API + "/api/auth/login";
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) { alert((res.d && res.d.detail) || "登录失败"); return; }
        var data = res.d.data || res.d;
        var token = data.access_token || data.token || "";
        var me = data.user || data;
        if (token) setAuth(token, me);
        location.href = "/";
      }).catch(function (err) { alert("网络错误: " + err.message); });
    });
  }

  /* ========= Tab 切换 ========= */
  function bindTabBar() {
    document.querySelectorAll(".tabbar .tab, .sidebar .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.getAttribute("data-tab");
        switchTab(name);
      });
    });
  }

  function switchTab(name) {
    var sectionMap = {
      "home": "sec-home",
      "position": "sec-position",
      "intern": "sec-intern",
      "ai": "sec-ai",
      "recommend": "sec-recommend",
      "resume": "sec-resume",
      "collected": "sec-collected",
      "applies": "sec-applies",
      "me": "sec-me"
    };

    document.querySelectorAll(".page-section").forEach(function (s) { s.style.display = "none"; });

    var secId = sectionMap[name] || ("sec-" + name);
    var sec = document.getElementById(secId);
    if (sec) sec.style.display = "";

    document.querySelectorAll(".tabbar .tab, .sidebar .tab").forEach(function (t) {
      t.classList.toggle("active", t.getAttribute("data-tab") === name);
    });

    if (name === "home") loadHome();
    if (name === "position") loadPositions();
    if (name === "intern") loadIntern();
    if (name === "resume") loadResumes();
    if (name === "recommend") loadRecommend();
    if (name === "collected") loadCollected();
    if (name === "applies") loadApplies();
    if (name === "me") loadMe();
  }

  function gotoAI(mode) {
    if (mode === "exam") {
      switchTab("ai");
      setTimeout(function () { startAIExam(); }, 200);
    } else if (mode === "interview") {
      switchTab("ai");
      setTimeout(function () { startAIInterview(); }, 200);
    } else if (mode === "wrong-exam") {
      switchTab("ai");
      setTimeout(function () { loadWrongQuestions("exam"); }, 200);
    } else if (mode === "wrong-interview") {
      switchTab("ai");
      setTimeout(function () { loadWrongQuestions("interview"); }, 200);
    } else if (mode === "diagnose") {
      switchTab("resume");
    } else if (mode === "match") {
      switchTab("recommend");
    } else {
      switchTab("ai");
    }
  }

  /* ========= 搜索 ========= */
  function bindSearch() {
    var input = document.getElementById("searchInput");
    if (!input) return;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var keyword = input.value.trim();
        if (keyword) {
          switchTab("position");
          setTimeout(function () {
            var ps = document.getElementById("positionSearch");
            if (ps) { ps.value = keyword; applyPositionFilter(); }
          }, 100);
        }
      }
    });
    var btn = document.getElementById("searchBtn");
    if (btn) btn.addEventListener("click", function () { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); });

    var ps = document.getElementById("positionSearch");
    if (ps) {
      ps.addEventListener("input", applyPositionFilter);
      ps.addEventListener("keydown", function (e) { if (e.key === "Enter") applyPositionFilter(); });
    }
  }

  /* ========= 顶部地区切换 ========= */
  function cityFilteredJobs() {
    if (!_filterCity) return _allJobs;
    return _allJobs.filter(function (j) { return (j.city || "") === _filterCity; });
  }

  function regionCities() {
    var seen = {};
    var list = [];
    _allJobs.forEach(function (j) {
      var c = j.city || "";
      if (c && !seen[c]) { seen[c] = 1; list.push(c); }
    });
    return list;
  }

  function renderRegionMenu() {
    var menu = document.getElementById("regionMenu");
    if (!menu) return;
    var cities = regionCities();
    var items = ["全国"].concat(cities);
    menu.innerHTML = items.map(function (c) {
      var active = (c === "全国" && !_filterCity) || c === _filterCity;
      return '<div class="region-item' + (active ? " active" : "") + '" data-city="' + (c === "全国" ? "" : c) + '">' + c + '</div>';
    }).join("");
  }

  function bindRegionSwitch() {
    var sw = document.getElementById("regionSwitch");
    var menu = document.getElementById("regionMenu");
    if (!sw || !menu) return;

    sw.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.hidden) { renderRegionMenu(); menu.hidden = false; }
      else { menu.hidden = true; }
    });

    menu.addEventListener("click", function (e) {
      e.stopPropagation();
      var item = e.target.closest(".region-item");
      if (!item) return;
      _filterCity = item.getAttribute("data-city") || "";
      sw.textContent = (_filterCity || "全国") + " ▾";
      menu.hidden = true;
      renderHomeJobs();
      applyPositionFilter();
    });

    document.addEventListener("click", function () { menu.hidden = true; });
  }

  /* ========= 顶部放大镜搜索 ========= */
  function bindEduSearch() {
    var btn = document.getElementById("eduSearchBtn");
    var input = document.getElementById("eduSearchInput");
    if (!btn || !input) return;

    function doSearch() {
      var keyword = input.value.trim();
      if (!keyword) { input.hidden = true; return; }
      switchTab("position");
      setTimeout(function () {
        var ps = document.getElementById("positionSearch");
        if (ps) { ps.value = keyword; applyPositionFilter(); }
      }, 100);
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (input.hidden) { input.hidden = false; input.focus(); }
      else { doSearch(); }
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
    });
  }


  function _hint(icon, text, cls) {
    return '<div class="state-hint ' + (cls || "") + '"><div class="sh-icon">' + icon + '</div><div>' + text + '</div></div>';
  }

  /* 薪资字段单位为 K（月薪千位），直接展示，不再换算 */
  function _salary(j) {
    if (!j.salary_min && !j.salary_max) return "";
    return (j.salary_min || 0) + "-" + (j.salary_max || 0) + "K";
  }

  /* ========= 职位卡片 ========= */
  function jobCard(j) {
    if (!j) return "";
    var salary = _salary(j);
    var tags = [];
    if (j.job_type) tags.push(j.job_type);
    if (j.education) tags.push(j.education);
    if (j.experience) tags.push(j.experience);
    var skills = [];
    try { skills = Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills); } catch (e) { skills = []; }

    var matchBadge = "";
    if (j.match_score && j.match_score > 0) {
      var mc = j.match_score >= 80 ? "match-high" : j.match_score >= 60 ? "match-mid" : "match-low";
      matchBadge = '<span class="jc-badge ' + mc + '">🎯 ' + j.match_score + ' 分</span>';
    }

    var aiBadge = "";
    if (j.ai_generated) {
      aiBadge = '<span class="jc-badge ai-gen">⚡ AI 生成</span>';
    } else if (j.ai_match) {
      aiBadge = '<span class="jc-badge ai-match">✨ AI 匹配</span>';
    }

    var collected = !!_collectedIds[j.id];
    var logoText = _esc((j.company || j.title || "?").trim().charAt(0));
    var btns = '<div class="jc-actions">' +
      '<button class="btn-mini' + (collected ? " btn-collected" : "") + '" onclick="event.stopPropagation();toggleCollect(' + j.id + ')">' + (collected ? "✅ 已收藏" : "⭐ 收藏") + '</button>' +
      '<button class="btn-mini btn-primary-mini" onclick="event.stopPropagation();matchJob(' + j.id + ')">🎯 AI 匹配</button>' +
      '<button class="btn-mini" onclick="event.stopPropagation();applyJob(' + j.id + ')">📤 投递</button>' +
    '</div>';

    return (
      '<div class="card job-card" data-id="' + j.id + '">' +
        '<div class="jc-head">' +
          '<div class="jc-main">' +
            '<div class="jc-logo">' + logoText + '</div>' +
            '<div style="min-width:0;">' +
              '<div class="jc-title">' + _esc(j.title || "") + matchBadge + aiBadge + '</div>' +
              '<div class="jc-sub">' + _esc(j.company || "") + (j.city ? ' · ' + _esc(j.city) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="jc-salary">' + salary + '</div>' +
        '</div>' +
        (tags.length ? '<div class="jc-tags">' + tags.map(function (t) { return '<span class="jc-tag">' + _esc(t) + '</span>'; }).join("") + '</div>' : "") +
        (skills.length ? '<div class="jc-skills">' + skills.slice(0, 4).map(function (s) {
          return '<span class="jc-skill">' + _esc(s) + '</span>';
        }).join("") + '</div>' : "") +
        btns +
      '</div>'
    );
  }

  /* ========= 职位详情 ========= */
  function openJobDetail(jobId) {
    var job = _allJobs.find(function (j) { return j.id === jobId; });
    if (!job) return;
    var panel = document.getElementById("job-detail-panel");
    var body = document.getElementById("job-detail-body");
    if (!panel || !body) return;
    body.scrollTop = 0;
    body.innerHTML = renderJobDetail(job);
    panel.style.display = "flex";
  }

  function closeJobDetail() {
    var panel = document.getElementById("job-detail-panel");
    if (panel) panel.style.display = "none";
  }

  function renderJobDetail(j) {
    var salary = _salary(j);
    var skills = [];
    try { skills = Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills); } catch (e) { skills = []; }
    var tags = [];
    if (j.job_type) tags.push(j.job_type);
    if (j.education) tags.push(j.education);
    if (j.experience) tags.push(j.experience);
    if (j.category) tags.push(j.category);

    function block(title, text) {
      if (!text) return "";
      return '<div class="detail-block">' +
        '<div class="db-title">' + title + '</div>' +
        '<div class="db-text">' + _esc(text) + '</div>' +
      '</div>';
    }

    return '<div class="detail-head">' +
        '<div class="detail-title">' + _esc(j.title || "") + '</div>' +
        '<div class="detail-salary">' + salary + '</div>' +
      '</div>' +
      '<div class="detail-sub">' + _esc(j.company || "") + (j.city ? ' · ' + _esc(j.city) : '') + '</div>' +
      (tags.length ? '<div class="jc-tags">' + tags.map(function (t) { return '<span class="jc-tag">' + _esc(t) + '</span>'; }).join("") + '</div>' : "") +
      (skills.length ? '<div class="jc-skills" style="margin-bottom:16px;">' + skills.map(function (s) {
        return '<span class="jc-skill">' + _esc(s) + '</span>';
      }).join("") + '</div>' : "") +
      block("岗位描述", j.description) +
      block("任职要求", j.requirement) +
      (j.risk_hint ? block("求职风险提示", j.risk_hint) : "") +
      '<div class="jc-actions">' +
        '<button class="btn-mini' + (_collectedIds[j.id] ? " btn-collected" : "") + '" onclick="event.stopPropagation();toggleCollect(' + j.id + ')">' + (_collectedIds[j.id] ? "✅ 已收藏" : "⭐ 收藏") + '</button>' +
        '<button class="btn-mini btn-primary-mini" onclick="event.stopPropagation();matchJob(' + j.id + ')">🎯 AI 匹配</button>' +
        '<button class="btn-mini" onclick="event.stopPropagation();applyJob(' + j.id + ')">📤 投递</button>' +
        '<button class="btn-mini" onclick="event.stopPropagation();toggleCompare(' + j.id + ')">' + (_compareIds.indexOf(j.id) > -1 ? "✔️ 已加入对比" : "⚖️ 加入对比") + '</button>' +
      '</div>';
  }

  function bindJobCardClick() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (btn) return;
      var card = e.target.closest(".job-card");
      if (!card) return;
      var id = parseInt(card.getAttribute("data-id"), 10);
      if (!isNaN(id)) openJobDetail(id);
    });
  }

  /* ========= 职位对比 ========= */
  function toggleCompare(jobId) {
    var idx = _compareIds.indexOf(jobId);
    if (idx > -1) {
      _compareIds.splice(idx, 1);
    } else {
      if (_compareIds.length >= 3) { alert("最多对比 3 个职位"); return; }
      _compareIds.push(jobId);
    }
    updateCompareBar();
    var dp = document.getElementById("job-detail-panel");
    if (dp && dp.style.display === "flex") {
      var job = _allJobs.find(function (j) { return j.id === jobId; });
      if (job) document.getElementById("job-detail-body").innerHTML = renderJobDetail(job);
    }
  }

  function updateCompareBar() {
    var bar = document.getElementById("compareBar");
    if (!bar) return;
    if (_compareIds.length === 0) { bar.style.display = "none"; return; }
    bar.style.display = "flex";
    bar.querySelector(".cmp-count").textContent = _compareIds.length;
  }

  function clearCompare() {
    _compareIds = [];
    updateCompareBar();
  }

  function closeCompare() {
    var p = document.getElementById("compare-panel");
    if (p) p.style.display = "none";
  }

  function openCompare() {
    var jobs = _compareIds.map(function (id) { return _allJobs.find(function (j) { return j.id === id; }); }).filter(Boolean);
    if (jobs.length < 2) { alert("请至少选择 2 个职位进行对比"); return; }
    var panel = document.getElementById("compare-panel");
    var body = document.getElementById("compare-body");
    body.innerHTML = renderCompareTable(jobs);
    panel.style.display = "flex";
  }

  function renderCompareTable(jobs) {
    function sal(j) {
      return _salary(j) || "—";
    }
    function skills(j) {
      var s = [];
      try { s = Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills); } catch (e) { s = []; }
      return s.length ? s.join("、") : "—";
    }
    var rows = [
      ["职位", function (j) { return j.title || "—"; }],
      ["公司", function (j) { return j.company || "—"; }],
      ["城市", function (j) { return j.city || "—"; }],
      ["薪资", sal],
      ["类型", function (j) { return j.job_type || "—"; }],
      ["学历", function (j) { return j.education || "—"; }],
      ["经验", function (j) { return j.experience || "—"; }],
      ["分类", function (j) { return j.category || "—"; }],
      ["技能", skills],
    ];
    var th = '<th class="cmp-label"></th>' +
      jobs.map(function (j) { return '<th class="cmp-col">' + _esc(j.title || "") + '</th>'; }).join("");
    var trs = rows.map(function (row) {
      var label = row[0], fn = row[1];
      return '<tr><td class="cmp-label">' + label + '</td>' +
        jobs.map(function (j) { return '<td class="cmp-col">' + _esc(fn(j)) + '</td>'; }).join("") + '</tr>';
    }).join("");
    return '<div class="cmp-scroll"><table class="cmp-table">' +
      '<thead><tr>' + th + '</tr></thead><tbody>' + trs + '</tbody></table></div>';
  }

  function bindCompareBar() {
    var bar = document.getElementById("compareBar");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      if (e.target.closest(".cmp-clear")) { clearCompare(); return; }
      if (e.target.closest(".cmp-open")) { openCompare(); return; }
    });
  }

  /* ========= 各页面加载 ========= */
  async function loadHome() {
    var box = document.getElementById("home-job-list");
    if (!box) return;
    try {
      var r = await fetch(API + "/api/jobs");
      var data = await r.json();
      _allJobs = toList(data);
      renderHomeJobs();
    } catch (e) {
      box.innerHTML = _hint("⚠️", "加载失败", "is-error");
    }
  }

  function renderHomeJobs() {
    var box = document.getElementById("home-job-list");
    if (!box) return;
    var top = cityFilteredJobs().slice(0, 6);
    box.innerHTML = top.map(jobCard).join("") || _hint("🔍", "暂无职位");
  }

  async function loadPositions() {
    var box = document.getElementById("position-list");
    if (!box) return;
    box.innerHTML = _hint("⏳", "加载中…", "is-loading");
    try {
      var r = await fetch(API + "/api/jobs");
      var data = await r.json();
      _allJobs = toList(data);
      applyPositionFilter();
    } catch (e) {
      box.innerHTML = _hint("⚠️", "加载失败", "is-error");
    }
  }

  function renderPositionList(list) {
    var box = document.getElementById("position-list");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="empty-state"><div class="e-icon">🔍</div>没有匹配的职位<br><span style="font-size:12px;color:#999;">试试换个关键词</span></div>';
      return;
    }
    box.innerHTML = list.map(jobCard).join("");
  }

  function sortJobs(list) {
    var out = list.slice();
    if (_posSort === "salary") {
      out.sort(function (a, b) { return (b.salary_max || 0) - (a.salary_max || 0); });
    } else {
      out.sort(function (a, b) { return String(b.created_at || "").localeCompare(String(a.created_at || "")); });
    }
    return out;
  }

  function applyPositionFilter() {
    var base = cityFilteredJobs();
    if (_posType) {
      base = base.filter(function (j) { return (j.job_type || "") === _posType; });
    }
    if (_salaryMinK) {
      base = base.filter(function (j) { return (j.salary_max || 0) >= _salaryMinK; });
    }
    var ps = document.getElementById("positionSearch");
    var raw = ps ? ps.value.trim() : "";
    var q = raw.toLowerCase();
    if (!q) { renderPositionList(sortJobs(base)); return; }

    pushSearchHistory(raw);

    var filtered = base.filter(function (j) {
      return (j.title || "").toLowerCase().indexOf(q) > -1
          || (j.company || "").toLowerCase().indexOf(q) > -1
          || (j.category || "").toLowerCase().indexOf(q) > -1
          || (j.city || "").toLowerCase().indexOf(q) > -1
          || JSON.stringify(j.skills || []).toLowerCase().indexOf(q) > -1;
    });

    if (filtered.length > 0) {
      renderPositionList(sortJobs(filtered));
    } else {
      aiSearchAndRender(q);
    }
  }

  /* ========= 搜索历史 ========= */
  function getSearchHistory() {
    try { return JSON.parse(localStorage.getItem("job_search_history") || "[]"); } catch (e) { return []; }
  }
  function pushSearchHistory(keyword) {
    if (!keyword) return;
    var list = getSearchHistory().filter(function (k) { return k !== keyword; });
    list.unshift(keyword);
    localStorage.setItem("job_search_history", JSON.stringify(list.slice(0, 6)));
    renderSearchHistory();
  }
  function clearSearchHistory() {
    localStorage.removeItem("job_search_history");
    renderSearchHistory();
  }
  function renderSearchHistory() {
    var box = document.getElementById("searchHistory");
    if (!box) return;
    var list = getSearchHistory();
    if (!list.length) { box.innerHTML = ""; box.style.display = "none"; return; }
    box.style.display = "flex";
    box.innerHTML = '<span style="color:#999;">🕘 历史:</span>' +
      list.map(function (k) { return '<span class="hist-chip" data-kw="' + k.replace(/"/g, "&quot;") + '">' + k + '</span>'; }).join("") +
      '<span class="hist-clear" id="histClear">清空</span>';
  }

  function bindPositionFilter() {
    document.querySelectorAll(".pos-type-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        _posType = chip.getAttribute("data-type") || "";
        document.querySelectorAll(".pos-type-chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        applyPositionFilter();
      });
    });
    var sortSel = document.getElementById("positionSort");
    if (sortSel) {
      sortSel.addEventListener("change", function () {
        _posSort = sortSel.value || "new";
        applyPositionFilter();
      });
    }
    var salarySel = document.getElementById("positionSalary");
    if (salarySel) {
      salarySel.addEventListener("change", function () {
        _salaryMinK = parseInt(salarySel.value, 10) || 0;
        applyPositionFilter();
      });
    }
    var histBox = document.getElementById("searchHistory");
    if (histBox) {
      histBox.addEventListener("click", function (e) {
        if (e.target.id === "histClear") { clearSearchHistory(); return; }
        var chip = e.target.closest(".hist-chip");
        if (!chip) return;
        var ps = document.getElementById("positionSearch");
        if (ps) { ps.value = chip.getAttribute("data-kw"); applyPositionFilter(); }
      });
    }
    renderSearchHistory();
  }

  function bindBackTop() {
    var btn = document.getElementById("backTop");
    if (!btn) return;
    function onScroll() {
      btn.style.display = window.scrollY > 400 ? "flex" : "none";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    onScroll();
  }

  function setTheme(dark) {
    var btn = document.getElementById("themeToggle");
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      if (btn) btn.textContent = "☀️";
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.body.removeAttribute("data-theme");
      if (btn) btn.textContent = "🌙";
    }
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
  }

  function bindThemeToggle() {
    var saved = "light";
    try { saved = localStorage.getItem("theme") || "light"; } catch (e) {}
    setTheme(saved === "dark");
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      setTheme(!isDark);
    });
  }

  async function aiSearchAndRender(keyword) {
    var box = document.getElementById("position-list");
    box.innerHTML = _hint("🤖", 'AI 正在联网搜索「' + keyword + '」最新岗位…', "is-loading");
    try {
      var r = await fetch(API + "/api/jobs/ai-search?keyword=" + encodeURIComponent(keyword));
      var data = await r.json();
      renderPositionList(toList(data));
    } catch (e) {
      renderPositionList([]);
    }
  }

  async function loadIntern() {
    var box = document.getElementById("intern-list");
    if (!box) return;
    try {
      var r = await fetch(API + "/api/jobs?job_type=实习");
      var data = await r.json();
      var list = toList(data);
      box.innerHTML = list.map(jobCard).join("") || _hint("🌱", "暂无实习岗位");
    } catch (e) { box.innerHTML = _hint("⚠️", "加载失败", "is-error"); }
  }

  async function loadResumes() {
    var box = document.getElementById("resume-list");
    if (!box) return;
    if (!getToken()) { box.innerHTML = _hint("🔒", "请先登录后查看"); return; }
    box.innerHTML = _hint("⏳", "加载中…", "is-loading");
    try {
      var r = await fetch(API + "/api/resumes", { headers: authHeaders() });
      var data = await r.json();
      _allResumes = toList(data);
      box.innerHTML = _allResumes.map(function (res) {
        var hasSource = !!res.source_file;
        var editBtn;
        if (hasSource) {
          editBtn = '<button class="btn-mini btn-primary-mini" onclick="openSourceFile(' + res.id + ')">📂 打开原文件</button>' +
                    '<button class="btn-mini" onclick="openEditor(' + res.id + ')">✏️ 网页编辑</button>';
        } else {
          editBtn = '<button class="btn-mini btn-primary-mini" onclick="openEditor(' + res.id + ')">✏️ 编辑</button>';
        }
        return '<div class="card resume-card">' +
          '<div class="jc-title">📄 ' + _esc(res.title || "") + '</div>' +
          '<div class="jc-sub">更新时间: ' + _esc(res.updated_at || res.created_at || "") +
            (hasSource ? ' <span class="rs-ok">· 已上传源文件</span>' : '') + '</div>' +
          '<div class="jc-actions">' +
            editBtn +
            '<button class="btn-mini" onclick="diagnoseResume(' + res.id + ')">🩺 AI 诊断</button>' +
            '<button class="btn-mini btn-danger" onclick="deleteResume(' + res.id + ')">🗑 删除</button>' +
          '</div>' +
        '</div>';
      }).join("") || '<div class="empty-state"><div class="e-icon">📄</div>暂无简历</div>';
    } catch (e) { box.innerHTML = _hint("⚠️", "加载失败", "is-error"); }
  }

  function setUploadStatus(msg, type) {
    var el = document.getElementById("resume-upload-status");
    if (!el) return;
    if (!msg) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.className = "upload-status" + (type ? " is-" + type : "");
    el.textContent = msg;
  }

  async function uploadResume(input) {
    if (!input || !input.files || !input.files[0]) return;
    var file = input.files[0];
    var token = getToken();
    if (!token) { alert("请先登录"); input.value = ""; return; }
    setUploadStatus("正在上传并解析 " + file.name + " ...");
    try {
      var fd = new FormData();
      fd.append("file", file);
      var r = await fetch(API + "/api/resumes/parse", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: fd,
      });
      var data = await r.json();
      if (!r.ok) { setUploadStatus("解析失败: " + (data.detail || "未知错误"), "error"); return; }
      var structured = data.structured || {};
      var title = (structured.basics && structured.basics.name ? structured.basics.name : "") || data.original_filename || file.name.replace(/\.[^.]+$/, "");
      title = title + " 的简历";
      var saveR = await fetch(API + "/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ title: title, content: structured, source_file: data.source_file }),
      });
      var saveData = await saveR.json();
      if (!saveR.ok) { setUploadStatus("简历已解析但保存失败: " + (saveData.detail || ""), "error"); return; }
      setUploadStatus("✅ 简历上传成功（ID=" + saveData.data.id + "），已保存到列表", "success");
      input.value = "";
      loadResumes();
      loadRecommend && loadRecommend();
    } catch (e) {
      setUploadStatus("上传出错: " + e.message, "error");
    }
  }

  async function createBlankResume() {
    var token = getToken();
    if (!token) { alert("请先登录"); return; }
    try {
      var r = await fetch(API + "/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ title: "未命名简历", content: { basics: {}, education: [], experience: [], skills: [] } }),
      });
      var data = await r.json();
      if (!r.ok) { alert("创建失败: " + (data.detail || "")); return; }
      setUploadStatus("✅ 空白简历已创建，请在下方填写内容", "success");
      openEditor(data.data.id);
      loadResumes();
    } catch (e) { alert("创建出错: " + e.message); }
  }

  function openSourceFile(id) {
    var token = getToken();
    if (!token) { alert("请先登录"); return; }
    var url = API + "/api/resumes/" + id + "/source";
    var a = document.createElement("a");
    a.href = url;
    a.download = "";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.responseType = "blob";
    xhr.onload = function () {
      if (xhr.status === 200) {
        var blob = xhr.response;
        var contentDisposition = xhr.getResponseHeader("Content-Disposition") || "";
        var fname = contentDisposition.match(/filename="?([^"]+)"?/);
        var filename = fname ? fname[1] : ("resume_" + id);
        var blobUrl = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (xhr.status === 404) {
        setUploadStatus("❌ 源文件已丢失或不存在", "error");
      } else {
        setUploadStatus("❌ 打开文件失败 (HTTP " + xhr.status + ")", "error");
      }
    };
    xhr.onerror = function () {
      setUploadStatus("❌ 网络错误，无法打开源文件", "error");
    };
    xhr.send();
    setUploadStatus("📂 正在下载原文件，请在浏览器下载列表中打开...");
  }

  function openEditor(id) {
    var token = getToken();
    if (!token) { alert("请先登录"); return; }
    var loadingStatus = setUploadStatus("⏳ 正在加载简历 #"+id+" ...");
    fetch(API + "/api/resumes/" + id, { headers: authHeaders() })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var c = data.content || {};
        var basics = c.basics || {};
        _editingResumeId = id;
        document.getElementById("editor-title").textContent = "ID=" + id;
        document.getElementById("ed-title").value = data.title || "";
        document.getElementById("ed-name").value = basics.name || "";
        document.getElementById("ed-target").value = basics.target || "";
        document.getElementById("ed-email").value = basics.email || "";
        document.getElementById("ed-phone").value = basics.phone || "";
        document.getElementById("ed-summary").value = basics.summary || "";
        renderEntryList("education", c.education || []);
        renderEntryList("experience", c.experience || []);
        renderEntryList("skills", c.skills || []);
        document.getElementById("resume-editor").style.display = "block";
        document.getElementById("resume-editor").scrollIntoView({ behavior: "smooth", block: "start" });
        setUploadStatus("");
      })
      .catch(function (e) {
        setUploadStatus("❌ 加载简历失败: " + e.message, "error");
      });
  }

  function closeEditor() {
    _editingResumeId = null;
    document.getElementById("resume-editor").style.display = "none";
  }

  function addEntry(type) {
    var c = getEditorContent();
    if (!Array.isArray(c[type])) c[type] = [];
    var empty = {};
    if (type === "education") empty = { school: "", major: "", degree: "", start_date: "", end_date: "", description: "" };
    else if (type === "experience") empty = { company: "", position: "", start_date: "", end_date: "", description: "" };
    else if (type === "skills") empty = { name: "", level: "" };
    c[type].push(empty);
    renderEntryList(type, c[type]);
  }

  function removeEntry(type, idx) {
    var c = getEditorContent();
    c[type].splice(idx, 1);
    renderEntryList(type, c[type]);
  }

  function getEditorContent() {
    var c = {
      basics: {
        name: document.getElementById("ed-name").value,
        target: document.getElementById("ed-target").value,
        email: document.getElementById("ed-email").value,
        phone: document.getElementById("ed-phone").value,
        summary: document.getElementById("ed-summary").value,
      },
      education: [],
      experience: [],
      skills: [],
    };
    document.querySelectorAll('[data-entry-type="education"]').forEach(function (el) {
      c.education.push({
        school: el.querySelector('[data-f="school"]').value,
        major: el.querySelector('[data-f="major"]').value,
        degree: el.querySelector('[data-f="degree"]').value,
        start_date: el.querySelector('[data-f="start_date"]').value,
        end_date: el.querySelector('[data-f="end_date"]').value,
        description: el.querySelector('[data-f="description"]').value,
      });
    });
    document.querySelectorAll('[data-entry-type="experience"]').forEach(function (el) {
      c.experience.push({
        company: el.querySelector('[data-f="company"]').value,
        position: el.querySelector('[data-f="position"]').value,
        start_date: el.querySelector('[data-f="start_date"]').value,
        end_date: el.querySelector('[data-f="end_date"]').value,
        description: el.querySelector('[data-f="description"]').value,
      });
    });
    document.querySelectorAll('[data-entry-type="skills"]').forEach(function (el) {
      c.skills.push({
        name: el.querySelector('[data-f="name"]').value,
        level: el.querySelector('[data-f="level"]').value,
      });
    });
    return c;
  }

  function renderEntryList(type, items) {
    var box = document.getElementById("ed-" + type + "-list");
    if (!box) return;
    if (!Array.isArray(items)) items = [];
    if (items.length === 0) { box.innerHTML = _hint("➕", "暂无，点击上方 + 添加"); return; }
    var html = items.map(function (item, idx) {
      if (type === "education") {
        return '<div data-entry-type="education" class="entry-block">' +
          '<div class="eb-head"><span class="eb-title">教育 #' + (idx + 1) + '</span><button class="btn-mini eb-remove" onclick="removeEntry(\'education\',' + idx + ')">删除</button></div>' +
          '<div class="ed-grid">' +
            '<input class="eb-input" data-f="school" placeholder="学校" value="' + _esc(item.school || "") + '">' +
            '<input class="eb-input" data-f="major" placeholder="专业" value="' + _esc(item.major || "") + '">' +
            '<input class="eb-input" data-f="degree" placeholder="学历(本科/硕士)" value="' + _esc(item.degree || "") + '">' +
            '<input class="eb-input" data-f="start_date" placeholder="开始 2022-09" value="' + _esc(item.start_date || "") + '">' +
            '<input class="eb-input" data-f="end_date" placeholder="结束 2026-06" value="' + _esc(item.end_date || "") + '">' +
          '</div>' +
          '<textarea class="eb-input eb-textarea" data-f="description" rows="2" placeholder="GPA、奖项、相关课程...">' + _esc(item.description || "") + '</textarea>' +
        '</div>';
      }
      if (type === "experience") {
        return '<div data-entry-type="experience" class="entry-block">' +
          '<div class="eb-head"><span class="eb-title">经历 #' + (idx + 1) + '</span><button class="btn-mini eb-remove" onclick="removeEntry(\'experience\',' + idx + ')">删除</button></div>' +
          '<div class="ed-grid">' +
            '<input class="eb-input" data-f="company" placeholder="公司/项目" value="' + _esc(item.company || "") + '">' +
            '<input class="eb-input" data-f="position" placeholder="职位/角色" value="' + _esc(item.position || "") + '">' +
            '<input class="eb-input" data-f="start_date" placeholder="开始" value="' + _esc(item.start_date || "") + '">' +
            '<input class="eb-input" data-f="end_date" placeholder="结束" value="' + _esc(item.end_date || "") + '">' +
          '</div>' +
          '<textarea class="eb-input eb-textarea" data-f="description" rows="2" placeholder="做了什么、用了什么技术、取得了什么成果...">' + _esc(item.description || "") + '</textarea>' +
        '</div>';
      }
      if (type === "skills") {
        return '<div data-entry-type="skills" class="entry-block eb-inline">' +
          '<span class="eb-title">技能 #' + (idx + 1) + '</span>' +
          '<input class="eb-input eb-grow" data-f="name" placeholder="技能名(如 Python)" value="' + _esc(item.name || "") + '">' +
          '<input class="eb-input" data-f="level" placeholder="熟练度(如 熟练/精通)" value="' + _esc(item.level || "") + '">' +
          '<button class="btn-mini eb-remove" onclick="removeEntry(\'skills\',' + idx + ')">删除</button>' +
        '</div>';
      }
      return "";
    }).join("");
    box.innerHTML = html;
  }

  async function saveResume() {
    if (!_editingResumeId) { alert("没有正在编辑的简历"); return; }
    var token = getToken();
    if (!token) { alert("请先登录"); return; }
    var title = document.getElementById("ed-title").value.trim();
    var content = getEditorContent();
    try {
      var r = await fetch(API + "/api/resumes/" + _editingResumeId, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ title: title, content: content }),
      });
      var data = await r.json();
      if (!r.ok) { alert("保存失败: " + (data.detail || "")); return; }
      setUploadStatus("✅ 简历已保存", "success");
      closeEditor();
      loadResumes();
      loadRecommend && loadRecommend();
    } catch (e) { alert("保存出错: " + e.message); }
  }

  async function deleteResume(id) {
    if (!confirm("确定删除这份简历吗？")) return;
    var token = getToken();
    if (!token) return;
    try {
      var r = await fetch(API + "/api/resumes/" + id, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) { var d = await r.json(); alert("删除失败: " + (d.detail || "")); return; }
      setUploadStatus("✅ 已删除", "success");
      loadResumes();
    } catch (e) { alert("删除出错: " + e.message); }
  }

  var _recommendCache = null;

  async function loadRecommend(force) {
    var box = document.getElementById("recommend-list");
    if (!box) return;
    if (!force && _recommendCache) {
      box.innerHTML = _recommendCache;
      return;
    }
    box.innerHTML = _hint("✨", "AI 正在读取你的简历，联网搜索并智能匹配最新岗位…", "is-loading");
    try {
      if (!_allResumes.length) {
        try { await loadResumes(); } catch (e) {}
      }
      var url = API + "/api/jobs/ai-recommend";
      if (_allResumes.length) {
        url += "?resume_id=" + _allResumes[0].id;
      }
      var r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) {
        var msg = _hint("🔒", (r.status === 401 ? "请先登录后查看推荐" : "请先上传简历"));
        _recommendCache = msg;
        box.innerHTML = msg;
        return;
      }
      var data = await r.json();
      var list = toList(data);
      var html = list.map(jobCard).join("") || _hint("✨", "暂无推荐，先上传简历让 AI 读一读");
      _recommendCache = html;
      box.innerHTML = html;
    } catch (e) {
      box.innerHTML = _hint("📄", '暂时还没有推荐结果<span class="sh-sub">请先登录并上传简历</span>', "is-error");
    }
  }

  function refreshRecommend() {
    _recommendCache = null;
    loadRecommend(true);
  }

  async function loadCollected() {
    var box = document.getElementById("collected-list");
    if (!box) return;
    if (!getToken()) { box.innerHTML = _hint("🔒", "请先登录后查看"); return; }
    try {
      var r = await fetch(API + "/api/jobs/me/collected", { headers: authHeaders() });
      var data = await r.json();
      var list = toList(data);
      box.innerHTML = list.map(jobCard).join("") || _hint("⭐", "还没有收藏，去职位列表逛逛");
    } catch (e) { box.innerHTML = _hint("⚠️", "加载失败", "is-error"); }
  }

  var _myApplies = [];

  async function loadApplies() {
    var box = document.getElementById("applies-list");
    if (!box) return;
    if (!getToken()) { box.innerHTML = _hint("🔒", "请先登录后查看"); return; }
    try {
      var r = await fetch(API + "/api/applies", { headers: authHeaders() });
      var data = await r.json();
      var list = toList(data);
      _myApplies = list;
      if (!list.length) {
        box.innerHTML = _hint("📨", "暂无投递记录，去首页浏览岗位投递吧");
        return;
      }
      var STATUS_MAP = {
        submitted: "已投递", viewed: "已查看", interview: "面试中",
        offer: "已录用", accepted: "已录用", rejected: "已拒绝",
      };
      box.innerHTML = list.map(function (a) {
        var cur = a.status || "submitted";
        var opts = ["submitted", "viewed", "interview", "offer", "rejected"].map(function (s) {
          return '<option value="' + s + '"' + (s === cur || (s === "offer" && cur === "accepted") ? " selected" : "") + '>' + STATUS_MAP[s] + '</option>';
        }).join("");
        return '<div class="card apply-card" data-apply-id="' + a.id + '">' +
          '<div class="jc-head">' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="apply-title">' + _esc(a.job_title || "") + '</div>' +
              '<div class="apply-company">🏢 ' + _esc(a.company || "") + '</div>' +
            '</div>' +
            '<select class="apply-status-select status-' + cur + '" data-apply-id="' + a.id + '" onchange="changeApplyStatus(this)">' + opts + '</select>' +
          '</div>' +
          '<div class="jc-actions">' +
            '<button class="btn-mini btn-primary-mini" onclick="startAIInterview(' + a.job_id + ')" style="flex:1;min-width:120px;">🎯 模拟面试</button>' +
            '<button class="btn-mini" onclick="switchTab(\'position\')" style="flex:1;min-width:80px;">查看岗位</button>' +
          '</div>' +
        '</div>';
      }).join("");
    } catch (e) { box.innerHTML = _hint("⚠️", "加载失败", "is-error"); }
  }

  var APPLY_STATUS = {
    submitted: "已投递", viewed: "已查看", interview: "面试中",
    offer: "已录用", accepted: "已录用", rejected: "已拒绝",
  };

  async function changeApplyStatus(sel) {
    var id = sel.getAttribute("data-apply-id");
    var val = sel.value;
    var token = getToken();
    if (!token) { alert("请先登录"); loadApplies(); return; }
    sel.disabled = true;
    try {
      var r = await fetch(API + "/api/applies/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ status: val }),
      });
      if (!r.ok) {
        var data = await r.json().catch(function () { return {}; });
        alert("状态更新失败: " + (data.detail || ""));
        sel.disabled = false;
        return;
      }
      for (var i = 0; i < _myApplies.length; i++) {
        if (String(_myApplies[i].id) === String(id)) { _myApplies[i].status = val; break; }
      }
      sel.disabled = false;
      sel.className = "apply-status-select status-" + val;
    } catch (e) {
      alert("状态更新出错: " + e.message);
      sel.disabled = false;
    }
  }

  function renderAuthBox(box) {
    box.innerHTML = (
      '<div class="card" style="margin:20px 0;">' +
        '<div class="auth-hero">' +
          '<div class="auth-avatar">👤</div>' +
          '<div class="auth-title">欢迎使用</div>' +
          '<div class="auth-sub">登录后解锁全部功能</div>' +
        '</div>' +
        '<div class="auth-tabs">' +
          '<div id="tab-login" class="auth-tab active" onclick="authSwitch(\'login\')">登录</div>' +
          '<div id="tab-register" class="auth-tab" onclick="authSwitch(\'register\')">注册</div>' +
        '</div>' +
        '<form id="auth-form" onsubmit="return authSubmit(event,\'login\');">' +
          '<input type="text" class="auth-field" id="a-username" required placeholder="用户名">' +
          '<input type="password" class="auth-field" id="a-password" required placeholder="密码（至少6位）" minlength="6">' +
          '<div id="register-fields" style="display:none;">' +
            '<input type="text" class="auth-field" id="a-realname" placeholder="真实姓名（选填）">' +
            '<input type="text" class="auth-field" id="a-school" placeholder="学校（选填）">' +
            '<input type="text" class="auth-field" id="a-major" placeholder="专业（选填）">' +
            '<select class="auth-field" id="a-education">' +
              '<option value="">学历（选填）</option><option>大专</option><option>本科</option><option>硕士</option><option>博士</option>' +
            '</select>' +
          '</div>' +
          '<button type="submit" class="auth-submit">立即登录</button>' +
        '</form>' +
        '<div class="auth-links">' +
          '<a href="/login?role=admin">🛡️ 管理员入口 →</a>' +
        '</div>' +
        '<div class="auth-fine">' +
          '登录即表示同意 <a href="#">服务协议</a>' +
        '</div>' +
      '</div>'
    );
  }

  var _meChart = null;

  async function loadMe() {
    var box = document.getElementById("me-content");
    if (!box) return;
    var me = getMe();
    if (!me) { renderAuthBox(box); return; }

    if (_meChart) { try { _meChart.destroy(); } catch (e) {} _meChart = null; }

    box.innerHTML = _hint("📊", "AI 正在分析你的简历能力画像…", "is-loading");
    try {
      if (!_allResumes.length) { try { await loadResumes(); } catch (e) {} }
      var url = API + "/api/auth/me";
      var r1 = await fetch(url, { headers: authHeaders() });
      var data = r1.ok ? await r1.json() : {};
      var resumeId = _allResumes.length ? _allResumes[0].id : 0;

      var quotaText = (data.ai_quota === null || data.ai_quota === undefined) ? "—" : data.ai_quota;
      var header = '<div class="me-avatar-banner">' +
        '<div class="quota-badge">⚡ AI 剩余 ' + quotaText + ' 次</div>' +
        '<div class="avatar-circle">' + _esc(((me.username || "U").charAt(0)).toUpperCase()) + '</div>' +
        '<div class="m-name">' + _esc(data.username || me.username || "用户") + '</div>' +
        '<div class="m-sub">' + _esc(data.role || me.role || "") + ' · 欢迎回来</div>' +
        '</div>';

      var chartHtml = '<div class="card">' +
        '<div class="card-title">🎯 我的能力画像</div>' +
        '<div class="radar-wrap"><canvas id="skill-radar"></canvas></div>' +
        '<div id="skill-summary" class="radar-summary"></div>' +
        '<div id="skill-analysis"></div>' +
        '<div class="card-foot"><button class="btn-mini" onclick="refreshSkills()" id="refresh-skills-btn">🔄 重新分析</button></div>' +
        '</div>';

      box.innerHTML = header + chartHtml +
        '<div class="me-logout"><button class="btn-mini" onclick="logout()">退出登录</button></div>';
      if (resumeId) {
        if (_skillsCache && _skillsCache.resumeId === resumeId) {
          drawSkillRadar(_skillsCache.data);
        } else {
          try {
            var r2 = await fetch(API + "/api/resumes/" + resumeId + "/skills", { headers: authHeaders() });
            if (r2.ok) {
              var _raw = await r2.json();
              var sk = _raw.data || _raw;
              _skillsCache = { resumeId: resumeId, data: sk };
              drawSkillRadar(sk);
            } else {
              document.getElementById("skill-summary").textContent = "AI 分析失败，请稍后重试";
            }
          } catch (e) {
            document.getElementById("skill-summary").textContent = "AI 分析异常";
          }
        }
      } else {
        document.getElementById("skill-summary").textContent = "请先上传简历以生成能力画像";
      }
    } catch (e) {
      box.innerHTML = '<div class="card"><div class="card-title">' + _esc(me.username || "用户") + '</div>' +
        '<div class="jc-sub">登录状态正常，AI 能力画像需联网加载</div>' +
        '<div class="jc-actions"><button class="btn-mini" onclick="logout()">退出登录</button></div></div>';
    }
  }

  function drawSkillRadar(sk) {
    if (!sk || !Chart || typeof Chart === "undefined") {
      document.getElementById("skill-summary").textContent = "Chart.js 未加载，请检查网络";
      return;
    }
    var summary = sk.summary || "";
    var dims = sk.dimensions || [];
    var scores = sk.scores || [];
    if (!dims.length) {
      dims = ["技术熟练度", "项目经验", "教育背景", "实习经历", "软技能", "岗位匹配"];
      scores = [60, 60, 60, 60, 60, 60];
    }
    if (summary) document.getElementById("skill-summary").textContent = summary;
    var ctx = document.getElementById("skill-radar");
    if (!ctx) return;
    _meChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: dims,
        datasets: [{
          label: "能力得分",
          data: scores,
          backgroundColor: "rgba(124, 58, 237, 0.25)",
          borderColor: "rgba(124, 58, 237, 0.9)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(43, 125, 233, 0.9)",
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 20, font: { size: 11 } },
            pointLabels: { font: { size: 13, weight: "bold", color: "#1a3c6e" } },
            grid: { color: "rgba(0,0,0,0.08)" },
            angleLines: { color: "rgba(0,0,0,0.12)" }
          }
        }
      }
    });
    renderSkillAnalysis(sk);
  }

  function renderSkillAnalysis(sk) {
    var box = document.getElementById("skill-analysis");
    if (!box) return;
    var level = sk.level || "";
    var avg = sk.avg_score || "";
    var strengths = sk.strengths || [];
    var improvements = sk.improvements || [];
    var advice = sk.advice || "";
    var levelColor = level === "准高级" ? "#ea580c" : level === "中级" ? "#16a34a" : level === "初级" ? "#2b7de9" : "#8b94a3";

    var parts = [];
    if (level || avg) {
      parts.push('<div class="skill-meta">' +
        (level ? '<span class="skill-level" style="--lvl:' + levelColor + ';">' + _esc(level) + '</span>' : '') +
        (avg ? '<span class="skill-avg">综合均分 <b>' + avg + '</b> / 100</span>' : '') +
        '</div>');
    }
    if (strengths && strengths.length) {
      parts.push('<div class="skill-block">' +
        '<div class="skill-block-title is-good">✨ 你的优势</div>' +
        '<ul class="skill-list">' +
        strengths.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        '</ul></div>');
    }
    if (improvements && improvements.length) {
      parts.push('<div class="skill-block">' +
        '<div class="skill-block-title is-warn">⚠️ 待提升方向</div>' +
        '<ul class="skill-list">' +
        improvements.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        '</ul></div>');
    }
    if (advice) {
      parts.push('<div class="advice-box">' +
        '<div class="advice-title">💡 AI 职业建议</div>' +
        '<div class="advice-text">' + advice + '</div></div>');
    }
    box.innerHTML = parts.join("");
  }

  async function refreshSkills() {
    if (!getToken()) return;
    if (!_allResumes.length) { try { await loadResumes(); } catch (e) {} }
    var btn = document.getElementById("refresh-skills-btn");
    if (btn) { btn.disabled = true; btn.textContent = "分析中..."; }
    var resumeId = _allResumes.length ? _allResumes[0].id : 0;
    if (!resumeId) { alert("请先上传简历"); return; }
    try {
      var r = await fetch(API + "/api/resumes/" + resumeId + "/skills", { headers: authHeaders() });
      if (r.ok) {
        var _raw = await r.json();
        var sk = _raw.data || _raw;
        _skillsCache = { resumeId: resumeId, data: sk };
        if (_meChart) { try { _meChart.destroy(); } catch (e) {} _meChart = null; }
        drawSkillRadar(sk);
      } else { alert("分析失败"); }
    } catch (e) { alert("网络错误"); }
    finally { if (btn) { btn.disabled = false; btn.textContent = "🔄 重新分析"; } }
  }

  /* ========= 动作 ========= */
  async function loadCollectedIds() {
    if (!getToken()) { _collectedIds = {}; return; }
    try {
      var r = await fetch(API + "/api/jobs/me/collected", { headers: authHeaders() });
      if (!r.ok) return;
      var list = toList(await r.json());
      var map = {};
      list.forEach(function (j) { map[j.id] = true; });
      _collectedIds = map;
      refreshJobLists();
    } catch (e) {}
  }

  function refreshJobLists() {
    renderHomeJobs();
    applyPositionFilter();
    if (document.getElementById("sec-collected") && document.getElementById("sec-collected").style.display !== "none") {
      loadCollected();
    }
  }

  async function toggleCollect(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    try {
      var r = await fetch(API + "/api/jobs/" + jobId + "/collect", { method: "POST", headers: authHeaders() });
      var d = await r.json();
      _collectedIds[jobId] = !_collectedIds[jobId];
      if (!_collectedIds[jobId]) delete _collectedIds[jobId];
      refreshJobLists();
      var dp = document.getElementById("job-detail-panel");
      if (dp && dp.style.display === "flex") {
        var job = _allJobs.find(function (j) { return j.id === jobId; });
        if (job) document.getElementById("job-detail-body").innerHTML = renderJobDetail(job);
      }
      alert((d && d.message) || "操作成功");
    } catch (e) { alert("操作失败"); }
  }

  async function matchJob(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    await loadResumes();
    if (!_allResumes.length) { alert("请先上传简历"); switchTab("resume"); return; }
    var job = _allJobs.find(function (j) { return j.id === jobId; });
    if (!job) return;
    var panel = document.getElementById("match-panel");
    var body = document.getElementById("match-body");
    panel.style.display = "flex";
    body.scrollTop = 0;
    body.innerHTML = _hint("🎯", 'AI 正在对比简历与岗位要求...<span class="sh-sub">通常需要 10-20 秒</span>', "is-loading");
    try {
      var r = await fetch(API + "/api/jobs/" + jobId + "/match?resume_id=" + _allResumes[0].id, {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() },
        body: JSON.stringify({})
      });
      var data;
      try { data = await r.json(); } catch (_) { data = {}; }
      if (!r.ok) {
        var msg = data.detail;
        if (typeof msg === "object" && msg !== null) msg = msg.msg || msg.message || JSON.stringify(msg);
        if (!msg) msg = "HTTP " + r.status;
        throw new Error(msg);
      }
      body.innerHTML = renderMatchReport(data, job);
    } catch (e) {
      body.innerHTML = _hint("❌", '匹配失败: ' + _esc(e.message || e), "is-error");
    }
  }

  function closeMatchPanel() {
    document.getElementById("match-panel").style.display = "none";
  }

  function renderMatchReport(d, job) {
    var score = Math.round(d.match_score || 0);
    var matched = d.matched_skills || [];
    var missing = d.missing_skills || [];
    var analysis = d.analysis || "";

    var scoreColor = score >= 80 ? "#16a34a" : score >= 60 ? "#f59e0b" : score >= 40 ? "#ea580c" : "#ef4444";
    var scoreLabel = score >= 80 ? "高度匹配" : score >= 60 ? "基本匹配" : score >= 40 ? "部分匹配" : "不太匹配";

    var total = matched.length + missing.length || 1;
    var matchedPct = Math.round((matched.length / total) * 100);
    var missingPct = Math.round((missing.length / total) * 100);

    function chips(items, tone) {
      if (!items.length) return '<span class="mr-chip-none">无</span>';
      return items.map(function (s) {
        return '<span class="mr-chip ' + tone + '">' + _esc(s) + '</span>';
      }).join("");
    }

    var html = '';

    html += '<div class="mr-head">' +
      '<div class="mr-info">' +
        '<div class="mr-title">' + _esc(job.title || "") + '</div>' +
        '<div class="mr-sub">' + _esc(job.company || "") + ' · ' + _esc(job.city || "") + '</div>' +
        '<div class="mr-sub">' + _esc(job.experience || "") + ' · ' + _esc(job.education || "") + '</div>' +
      '</div>' +
      '<div class="mr-ring" style="--ring:' + scoreColor + ';">' +
        '<div class="mr-score">' + score + '</div>' +
        '<div class="mr-score-max">/ 100</div>' +
      '</div>' +
    '</div>';

    html += '<div class="mr-rating" style="--ring:' + scoreColor + ';">🎯 匹配度评级：' + scoreLabel + '</div>';

    html += '<div>' +
      '<div class="mr-cov-head">' +
        '<b>🔧 技能覆盖对比</b>' +
        '<span class="mr-hit">' + matched.length + ' / ' + (matched.length + missing.length) + ' 命中</span>' +
      '</div>' +
      '<div class="mr-bar">' +
        '<i class="is-matched" style="width:' + matchedPct + '%"></i>' +
        '<i class="is-missing" style="width:' + missingPct + '%"></i>' +
      '</div>' +
      '<div class="mr-cols">' +
        '<div class="mr-col">' +
          '<div class="mr-col-title is-good">✅ 已匹配技能 (' + matched.length + ')</div>' +
          '<div class="mr-chips">' + chips(matched, "is-good") + '</div>' +
        '</div>' +
        '<div class="mr-col">' +
          '<div class="mr-col-title is-warn">❌ 缺失技能 (' + missing.length + ')</div>' +
          '<div class="mr-chips">' + chips(missing, "is-warn") + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    if (analysis) {
      html += '<div class="mr-analysis">' +
        '<div>📊 AI 深度分析</div>' +
        '<div class="mr-analysis-body">' + analysis + '</div>' +
      '</div>';
    }

    var suggestSkills = missing.slice(0, 3);
    if (suggestSkills.length) {
      html += '<div class="mr-suggest">' +
        '<div class="mr-suggest-title">💡 建议补强</div>' +
        '<div class="mr-suggest-text">优先学习 <b>' + suggestSkills.map(_esc).join('、') + '</b>' + (missing.length > 3 ? ' 等 ' + missing.length + ' 项技能' : '') + '，可大幅提升匹配度</div>' +
      '</div>';
    }

    return html;
  }

  async function applyJob(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    await loadResumes();
    if (!_allResumes.length) { alert("请先上传简历"); switchTab("resume"); return; }
    try {
      var payload = { resume_id: _allResumes[0].id, job_id: jobId };
      var r = await fetch(API + "/api/applies", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      var d = await r.json();
      alert(extractMsg(d) || (r.ok ? "投递成功" : "投递失败"));
    } catch (e) { alert("投递失败: " + e.message); }
  }

  async function diagnoseResume(id) {
    var token = getToken();
    if (!token) { alert("请先登录"); return; }
    var report = document.getElementById("diagnose-report");
    var body = document.getElementById("diagnose-body");
    report.style.display = "block";
    body.scrollTop = 0;
    body.innerHTML = _hint("🩺", 'AI 正在深度诊断简历，请稍候...<span class="sh-sub">通常需要 15-30 秒</span>', "is-loading");
    report.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      var r = await fetch(API + "/api/resumes/" + id + "/diagnose", { method: "POST", headers: authHeaders() });
      var data = await r.json();
      if (!r.ok) throw new Error(data.detail || "诊断失败");
      body.innerHTML = renderDiagnoseReport(data);
    } catch (e) {
      body.innerHTML = _hint("❌", '诊断失败: ' + _esc(e.message || e), "is-error");
    }
  }

  function renderDiagnoseReport(d) {
    var score = d.score || 0;
    var dims = d.dimension_scores || {};
    var strengths = d.strengths || [];
    var weaknesses = d.weaknesses || [];
    var suggestions = d.suggestions || [];
    var polished = d.polished_segments || {};

    var scoreColor = score >= 80 ? "#16a34a" : score >= 60 ? "#f59e0b" : "#ef4444";
    var scoreLabel = score >= 80 ? "优秀" : score >= 60 ? "中等" : score >= 40 ? "需要大幅优化" : "急需重写";

    var dimKeys = Object.keys(dims);
    var dimHtml = dimKeys.map(function (k) {
      var v = dims[k];
      var barColor = v >= 70 ? "#16a34a" : v >= 40 ? "#f59e0b" : "#ef4444";
      return '<div class="dr-dim">' +
        '<div class="dr-dim-head"><span>' + _esc(k) + '</span><b>' + v + '</b></div>' +
        '<div class="dr-dim-bar"><i style="width:' + v + '%;background:' + barColor + ';"></i></div>' +
      '</div>';
    }).join("");

    function listHtml(items) {
      if (!items.length) return "";
      return '<ul class="dr-list">' +
        items.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
      '</ul>';
    }

    function suggestList(items) {
      if (!items.length) return "";
      return '<div class="dr-steps">' +
        items.map(function (s, i) {
          var t = String(s).replace(/^\d+[\.\、]\s*/, "");
          return '<div class="dr-step">' +
            '<div class="dr-step-no">' + (i + 1) + '</div>' +
            '<div class="dr-step-text">' + t + '</div>' +
          '</div>';
        }).join("") +
      '</div>';
    }

    var polishHtml = "";
    var pkeys = Object.keys(polished);
    if (pkeys.length) {
      polishHtml = pkeys.map(function (k) {
        return '<div class="dr-polish">' +
          '<div class="dr-polish-label is-origin">📝 原文</div>' +
          '<div class="dr-polish-text is-origin">' + k + '</div>' +
          '<div class="dr-polish-label is-ai">✨ AI 润色后</div>' +
          '<div class="dr-polish-text is-ai">' + polished[k] + '</div>' +
        '</div>';
      }).join("");
    }

    var html = '';

    html += '<div class="dr-head">' +
      '<div class="dr-ring" style="--ring:' + scoreColor + ';">' +
        '<div class="dr-score">' + score + '</div>' +
        '<div class="mr-score-max">总分 100</div>' +
      '</div>' +
      '<div class="dr-info">' +
        '<div class="dr-rate">简历评级：<span>' + scoreLabel + '</span></div>' +
        '<div class="dr-note">以下 ' + dimKeys.length + ' 个维度综合评分，每项 0-100 分</div>' +
        '<div class="dr-dims">' + dimHtml + '</div>' +
      '</div>' +
    '</div>';

    if (strengths.length) {
      html += '<div class="dr-sec">' +
        '<div class="dr-sec-title is-good">👍 优点 <span class="dr-count">(' + strengths.length + ' 条)</span></div>' +
        listHtml(strengths) +
      '</div>';
    }

    if (weaknesses.length) {
      html += '<div class="dr-sec">' +
        '<div class="dr-sec-title is-warn">⚠️ 待改进 <span class="dr-count">(' + weaknesses.length + ' 条)</span></div>' +
        listHtml(weaknesses) +
      '</div>';
    }

    if (suggestions.length) {
      html += '<div class="dr-sec">' +
        '<div class="dr-sec-title is-info">🎯 修改建议 <span class="dr-count">(按优先级排序)</span></div>' +
        suggestList(suggestions) +
      '</div>';
    }

    if (polishHtml) {
      html += '<div class="dr-sec">' +
        '<div class="dr-sec-title is-violet">✨ 关键片段润色对比</div>' +
        polishHtml +
      '</div>';
    }

    return html;
  }

  function authSwitch(mode) {
    var loginTab = document.getElementById("tab-login");
    var regTab = document.getElementById("tab-register");
    var regFields = document.getElementById("register-fields");
    var form = document.getElementById("auth-form");
    var btn = form ? form.querySelector("button[type=submit]") : null;
    if (mode === "login") {
      loginTab.classList.add("active"); regTab.classList.remove("active");
      regFields.style.display = "none";
      if (btn) btn.textContent = "立即登录";
      if (form) form.onsubmit = function (e) { return authSubmit(e, "login"); };
    } else {
      regTab.classList.add("active"); loginTab.classList.remove("active");
      regFields.style.display = "";
      if (btn) btn.textContent = "立即注册";
      if (form) form.onsubmit = function (e) { return authSubmit(e, "register"); };
    }
  }

  async function authSubmit(event, mode) {
    event.preventDefault();
    var username = (document.getElementById("a-username").value || "").trim();
    var password = (document.getElementById("a-password").value || "").trim();
    if (!username || !password) { alert("请填写用户名和密码"); return false; }
    if (password.length < 6) { alert("密码至少6位"); return false; }

    var payload = { username: username, password: password };
    if (mode === "register") {
      payload.real_name = (document.getElementById("a-realname").value || "").trim() || null;
      payload.school = (document.getElementById("a-school").value || "").trim() || null;
      payload.major = (document.getElementById("a-major").value || "").trim() || null;
      payload.education = document.getElementById("a-education").value || null;
    }

    var url = mode === "login" ? API + "/api/auth/login" : API + "/api/auth/register";
    try {
      var r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var d = await r.json();
      if (!r.ok) { alert((d && d.detail) || (d && d.message) || "请求失败"); return false; }

      if (mode === "register") {
        var data = d.data || d;
        alert("注册成功！请登录");
        authSwitch("login");
        document.getElementById("a-password").value = "";
        return false;
      }

      var token = d.access_token || (d.data && d.data.access_token) || "";
      var me = {
        username: username,
        role: d.role || (d.data && d.data.role) || "student",
        user_id: d.user_id || (d.data && d.data.user_id)
      };
      setAuth(token, me);
      if (me.role === "admin") {
        alert("管理员登录成功，正在进入管理后台...");
        location.href = "/admin";
        return false;
      }
      applyLoginState();
      loadMe();
    } catch (e) { alert("网络错误: " + e.message); }
    return false;
  }

  function previewResume(id) { location.href = "/resume-preview/" + id; }

  var _ivState = { sessionId: null, jobId: null, mode: "hr", difficulty: "medium", chat: [], busy: false };

  function _openIVSetup(preselectedJobId) {
    if (!getToken()) { alert("请先登录"); return; }
    if (document.getElementById("iv-setup")) return;
    var mask = document.createElement("div");
    mask.id = "iv-setup"; mask.className = "modal"; mask.classList.add("show");
    mask.innerHTML = '<div class="modal-mask" onclick="document.getElementById(\'iv-setup\').remove()"></div>' +
      '<div class="modal-box" style="max-width:520px;">' +
        '<div class="modal-header"><div class="modal-title">🤖 AI 模拟面试</div>' +
        '<div class="modal-close" onclick="document.getElementById(\'iv-setup\').remove()">×</div></div>' +
        '<div id="iv-setup-body" style="padding:20px;"></div>' +
      '</div>';
    document.body.appendChild(mask);
    _bindIVSetup(preselectedJobId);
  }

  async function _bindIVSetup(preselectedJobId) {
    var body = document.getElementById("iv-setup-body");
    body.innerHTML = _hint("⏳", "加载岗位列表…", "is-loading");
    if (!_myApplies.length) { try { await loadApplies(); } catch (e) {} }
    if (!_allJobs.length) { try { await loadPositions(); } catch (e) {} }
    var jobOptions = '<option value="">— 选择岗位 —</option>';
    var seenIds = {};
    var ordered = [];
    _myApplies.forEach(function (a) {
      if (a.job_id && !seenIds[a.job_id]) { seenIds[a.job_id] = true; ordered.push({ id: a.job_id, title: a.job_title, company: a.company, fromApply: true }); }
    });
    _allJobs.forEach(function (j) {
      if (j && j.id && !seenIds[j.id]) { seenIds[j.id] = true; ordered.push({ id: j.id, title: j.title, company: j.company, fromApply: false }); }
    });
    ordered.forEach(function (j) {
      var tag = j.fromApply ? ' <span style="font-size:11px;color:#2b7de9;background:#e8f3ff;padding:1px 6px;border-radius:8px;">已投递</span>' : '';
      jobOptions += '<option value="' + j.id + '"' + (preselectedJobId == j.id ? ' selected' : '') + '>' + (j.title || "") + ' · ' + (j.company || "") + tag + '</option>';
    });
    var modeOptions = [
      { v: "hr", n: "HR 面（自我介绍 / 项目 / 职业规划）" },
      { v: "tech", n: "技术面（算法 / 架构 / 项目深挖）" },
      { v: "behavioral", n: "行为面（STAR / 抗压 / 价值观）" },
    ];
    var diffOptions = [
      { v: "easy", n: "🌱 初级（应届/实习）" },
      { v: "medium", n: "⚡ 中级（社招/骨干）" },
      { v: "hard", n: "🔥 高级（专家/技术总监）" },
    ];
    body.innerHTML =
      '<div class="iv-field">' +
        '<div class="iv-label">🎯 面试岗位 <span class="iv-req">*</span></div>' +
        '<select id="iv-job" class="iv-select">' + jobOptions + '</select>' +
      '</div>' +
      '<div class="iv-field">' +
        '<div class="iv-label">🎤 面试模式</div>' +
        '<div id="iv-mode" class="iv-radio-row">' + modeOptions.map(function (m) {
          return '<label class="iv-radio"><input type="radio" name="iv-mode" value="' + m.v + '"' + (m.v === "hr" ? " checked" : "") + '><span>' + m.n + '</span></label>';
        }).join("") + '</div>' +
      '</div>' +
      '<div class="iv-field">' +
        '<div class="iv-label">⚡ 难度等级</div>' +
        '<div id="iv-diff" class="iv-radio-row">' + diffOptions.map(function (d) {
          return '<label class="iv-radio"><input type="radio" name="iv-diff" value="' + d.v + '"' + (d.v === "medium" ? " checked" : "") + '><span>' + d.n + '</span></label>';
        }).join("") + '</div>' +
      '</div>' +
      '<div class="iv-note">💡 消耗 AI 次数：每轮回答 1 次</div>' +
      '<div class="iv-actions">' +
        '<button class="btn-mini iv-cancel" onclick="this.closest(\'.modal\').remove()">取消</button>' +
        '<button class="btn-mini btn-primary-mini iv-start" id="iv-start-btn">🚀 开始面试</button>' +
      '</div>';
    document.getElementById("iv-start-btn").onclick = async function () {
      var jobEl = document.getElementById("iv-job");
      if (!jobEl.value) { alert("请选择岗位"); return; }
      var mode = document.querySelector('input[name="iv-mode"]:checked').value;
      var diff = document.querySelector('input[name="iv-diff"]:checked').value;
      await _ivCreate(parseInt(jobEl.value), mode, diff);
    };
  }

  async function _ivCreate(jobId, mode, diff) {
    var btn = document.getElementById("iv-start-btn");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ AI 正在生成第一题…"; }
    _ivState.jobId = jobId; _ivState.mode = mode; _ivState.difficulty = diff; _ivState.chat = [];
    try {
      var r = await fetch(API + "/api/interviews", { method: "POST", headers: authHeaders(), body: JSON.stringify({ job_id: jobId, mode: mode, difficulty: diff }) });
      if (!r.ok) { throw new Error(extractMsg(await r.json())); }
      var d = await r.json();
      var data = d.data || d;
      _ivState.sessionId = data.session_id;
      _ivState.chat.push({ role: "interviewer", content: data.first_question, difficulty: data.difficulty });
      document.getElementById("iv-setup").remove();
      _openIVChat();
    } catch (e) { alert("创建面试失败：" + e.message); if (btn) { btn.disabled = false; btn.textContent = "🚀 开始面试"; } }
  }

  function _openIVChat() {
    if (document.getElementById("iv-chat")) return;
    var mask = document.createElement("div");
    mask.id = "iv-chat"; mask.className = "modal"; mask.classList.add("show");
    mask.innerHTML = '<div class="modal-mask" onclick="return false;"></div>' +
      '<div class="modal-box iv-box">' +
        '<div class="modal-header iv-head">' +
          '<div class="modal-title">🤖 AI 模拟面试 <span id="iv-mode-badge" class="iv-badge"></span><span id="iv-diff-badge" class="iv-badge is-diff"></span></div>' +
          '<div class="iv-head-actions">' +
            '<button id="iv-finish-btn" class="btn-mini iv-finish">结束面试</button>' +
            '<button class="modal-close" onclick="if(confirm(\'确定退出？面试会丢失\')){this.closest(\'.modal\').remove();}">×</button>' +
          '</div>' +
        '</div>' +
        '<div id="iv-chat-job" class="iv-jobbar"></div>' +
        '<div id="iv-chat-log" class="iv-log"></div>' +
        '<div class="iv-foot">' +
          '<textarea id="iv-answer" class="iv-input" rows="3" placeholder="在此输入你的回答…（Enter 发送 / Shift+Enter 换行）"></textarea>' +
          '<div class="iv-foot-row">' +
            '<div id="iv-tip" class="iv-tip">💡 每轮消耗 1 次 AI 配额</div>' +
            '<button id="iv-send-btn" class="btn-mini btn-primary-mini iv-send">发送回答</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    _bindIVChat();
  }

  function _bindIVChat() {
    document.getElementById("iv-mode-badge").textContent = ({ hr: "HR面", tech: "技术面", behavioral: "行为面" })[_ivState.mode] || _ivState.mode;
    document.getElementById("iv-diff-badge").textContent = ({ easy: "初级", medium: "中级", hard: "高级" })[_ivState.difficulty] || _ivState.difficulty;
    var jobInfo = _allJobs.concat(_myApplies.map(function (a) { return { id: a.job_id, title: a.job_title, company: a.company }; })).find(function (j) { return j && j.id === _ivState.jobId; });
    document.getElementById("iv-chat-job").textContent = "🎯 岗位：" + ((jobInfo && jobInfo.title) || "未知") + " · " + ((jobInfo && jobInfo.company) || "");
    _renderIVLog();
    var answerEl = document.getElementById("iv-answer");
    document.getElementById("iv-send-btn").onclick = _ivSend;
    document.getElementById("iv-finish-btn").onclick = _ivFinish;
    answerEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); _ivSend(); }
    });
    setTimeout(function () { answerEl.focus(); }, 300);
  }

  function _diffBadge(d) {
    var map = { easy: ["🌱 初级", "#22c55e"], medium: ["⚡ 中级", "#f59e0b"], hard: ["🔥 高级", "#ef4444"] };
    var m = map[d] || ["⚡", "#8b94a3"];
    return '<span class="iv-diff" style="--diff:' + m[1] + '">' + m[0] + '</span>';
  }

  function _renderIVLog() {
    var log = document.getElementById("iv-chat-log");
    if (!log) return;
    log.innerHTML = _ivState.chat.map(function (m) {
      if (m.role === "interviewer") {
        var diff = m.difficulty ? _diffBadge(m.difficulty) : "";
        var score = m.score != null ? '<div class="iv-review"><b>👀 AI 点评：</b>' + (m.comment || "") + '<span class="iv-review-score">得分 ' + m.score + '/100</span></div>' : "";
        return '<div class="iv-row">' +
          '<div class="iv-flex">' +
            '<div class="iv-avatar is-interviewer">🤖</div>' +
            '<div class="iv-bubble">' +
              '<div class="iv-name">面试官' + diff + '</div>' +
              '<div class="iv-text">' + m.content + '</div>' +
              score +
            '</div>' +
          '</div>' +
        '</div>';
      } else {
        return '<div class="iv-row is-me">' +
          '<div class="iv-flex">' +
            '<div class="iv-avatar is-me">🙂</div>' +
            '<div class="iv-bubble">' +
              '<div class="iv-text">' + m.content + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    }).join("") + (_ivState.busy ? '<div class="iv-thinking">⏳ AI 正在思考…</div>' : "");
    log.scrollTop = log.scrollHeight;
  }

  async function _ivSend() {
    if (_ivState.busy) return;
    var input = document.getElementById("iv-answer");
    var btn = document.getElementById("iv-send-btn");
    var text = input.value.trim();
    if (!text) { alert("请输入回答"); return; }
    _ivState.busy = true;
    _ivState.chat.push({ role: "user", content: text });
    input.value = ""; btn.disabled = true; btn.textContent = "⏳ 思考中…";
    _renderIVLog();
    try {
      var r = await fetch(API + "/api/interviews/" + _ivState.sessionId + "/answer", { method: "POST", headers: authHeaders(), body: JSON.stringify({ content: text }) });
      if (!r.ok) { throw new Error(extractMsg(await r.json())); }
      var d = await r.json(); var ev = d.data || d;
      var lastIV = _ivState.chat.filter(function (m) { return m.role === "interviewer"; });
      if (lastIV.length) {
        lastIV[lastIV.length - 1].score = ev.score;
        lastIV[lastIV.length - 1].comment = ev.comment;
      }
      _ivState.difficulty = ev.next_difficulty || _ivState.difficulty;
      _ivState.chat.push({ role: "interviewer", content: ev.next_question, difficulty: ev.next_difficulty });
      _renderIVLog();
    } catch (e) { alert("提交失败：" + e.message); }
    finally {
      _ivState.busy = false; btn.disabled = false; btn.textContent = "发送回答";
    }
  }

  async function _ivFinish() {
    if (!confirm("确定结束面试并生成报告吗？")) return;
    var btn = document.getElementById("iv-finish-btn");
    btn.disabled = true; btn.textContent = "⏳ 生成报告中…";
    try {
      var r = await fetch(API + "/api/interviews/" + _ivState.sessionId + "/finish", { method: "POST", headers: authHeaders() });
      if (!r.ok) { throw new Error(extractMsg(await r.json())); }
      var d = await r.json(); var data = d.data || d; var report = data.report || data;
      document.getElementById("iv-chat").remove();
      _openIVReport(report);
    } catch (e) { alert("生成报告失败：" + e.message); btn.disabled = false; btn.textContent = "结束面试"; }
  }

  function _openIVReport(report) {
    var score = report.overall_score ?? report.score ?? 0;
    var scoreColor = score >= 85 ? "#22c55e" : score >= 70 ? "#3b82f6" : score >= 55 ? "#f59e0b" : "#ef4444";
    var modal = document.createElement("div");
    modal.className = "modal"; modal.classList.add("show");
    modal.innerHTML = '<div class="modal-mask" onclick="this.parentElement.remove()"></div>' +
      '<div class="modal-box rp-box">' +
        '<div class="modal-header"><div class="modal-title">📊 面试报告</div>' +
        '<div class="modal-close" onclick="this.closest(\'.modal\').remove()">×</div></div>' +
        '<div class="rp-body">' +
          '<div class="rp-hero">' +
            '<div class="rp-score" style="--ring:' + scoreColor + ';">' + score + '</div>' +
            '<div class="rp-hero-label">综合评分</div>' +
          '</div>' +
          '<div class="dr-sec">' +
            '<div class="dr-sec-title is-deep">📝 总体评价</div>' +
            '<div class="rp-summary">' + (report.summary || report.overall || "-") + '</div>' +
          '</div>' +
          (report.strengths && report.strengths.length ? '<div class="dr-sec"><div class="dr-sec-title is-good">✨ 亮点优势</div>' + report.strengths.map(function (s) { return '<div class="rp-item">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          (report.improvements && report.improvements.length ? '<div class="dr-sec"><div class="dr-sec-title is-warn">⚠️ 待改进</div>' + report.improvements.map(function (s) { return '<div class="rp-item">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          (report.suggestions && report.suggestions.length ? '<div class="dr-sec"><div class="dr-sec-title is-violet">💡 建议</div>' + report.suggestions.map(function (s) { return '<div class="rp-item">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          '<div class="rp-foot"><button class="btn-mini btn-primary-mini rp-close" onclick="this.closest(\'.modal\').remove()">关闭</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    _ivState = { sessionId: null, jobId: null, mode: "hr", difficulty: "medium", chat: [], busy: false };
  }

  function startAIInterview(jobId) { _openIVSetup(jobId || null); }
  function _esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function startAIExam() {
    if (!getToken()) { alert("请先登录"); return; }
    fetch(API + "/api/applies", { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (raw) {
        var jobs = toList(raw);
        if (!jobs.length) { alert("你还没有投递记录，请先去投递岗位吧～"); return; }
        var diffs = [
          { key: "easy", label: "简单", desc: "基础概念题", icon: "🌱" },
          { key: "medium", label: "中等", desc: "进阶应用题", icon: "🔥" },
          { key: "hard", label: "困难", desc: "综合场景题", icon: "⚡" }
        ];
        var diffCards = diffs.map(function (d) {
          return '<div class="exam-diff-card" data-diff="' + d.key + '" onclick="document.querySelectorAll(\'.exam-diff-card\').forEach(function(c){c.classList.remove(\'sel\')});this.classList.add(\'sel\');document.getElementById(\'_examDiff\').value=\'' + d.key + '\'">' +
            '<div class="exam-diff-icon">' + d.icon + '</div>' +
            '<div class="exam-diff-label">' + d.label + '</div>' +
            '<div class="exam-diff-desc">' + d.desc + '</div>' +
          '</div>';
        }).join("");
        var jobOpts = jobs.map(function (j) {
          return '<option value="' + j.job_id + '">' + _esc(j.job_title) + ' · ' + _esc(j.company) + '</option>';
        }).join("");
        var html =
          '<div class="modal-mask" onclick="if(event.target===this)this.remove()">' +
            '<div class="modal-card" style="width:560px">' +
              '<div class="modal-header"><span>📝 AI 笔试</span><button onclick="this.closest(\'.modal-mask\').remove()" class="modal-close">✕</button></div>' +
              '<div class="modal-body">' +
                '<div class="form-row"><label>选择岗位</label><select id="_examJob" class="form-input">' + jobOpts + '</select></div>' +
                '<div class="form-row"><label>难度</label>' +
                  '<input type="hidden" id="_examDiff" value="easy">' +
                  '<div class="exam-diff-row">' + diffCards + '</div>' +
                '</div>' +
                '<div class="form-row"><label>题数：<span id="_examCountLabel">5</span> 道</label>' +
                  '<input type="range" id="_examCount" min="3" max="10" value="5" oninput="document.getElementById(\'_examCountLabel\').textContent=this.value">' +
                '</div>' +
              '</div>' +
              '<div class="modal-footer">' +
                '<button onclick="this.closest(\'.modal-mask\').remove()" class="btn btn-ghost">取消</button>' +
                '<button id="_examGo" class="btn btn-primary">开始笔试</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        document.body.insertAdjacentHTML("beforeend", html);
        var firstCard = document.querySelector(".exam-diff-card[data-diff='easy']");
        if (firstCard) firstCard.classList.add("sel");
        var btn = document.getElementById("_examGo");
        btn.onclick = function () {
          var jobId = document.getElementById("_examJob").value;
          var diff = document.getElementById("_examDiff").value;
          var count = parseInt(document.getElementById("_examCount").value);
          _examCreate(jobId, diff, count);
        };
      })
      .catch(function (e) { alert("加载投递记录失败: " + e.message); });
  }

  function _examCreate(jobId, difficulty, count) {
    var btn = document.getElementById("_examGo");
    if (btn) { btn.disabled = true; btn.textContent = "AI 正在出题…"; }
    fetch(API + "/api/exams/sessions", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ job_id: parseInt(jobId), difficulty: difficulty, total_count: count })
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(extractMsg(d) || "HTTP " + r.status); });
      return r.json();
    })
    .then(function (data) {
      document.querySelectorAll(".modal-mask").forEach(function (m) { m.remove(); });
      _openExamPanel(data.id);
    })
    .catch(function (e) {
      alert("创建笔试失败：" + e.message);
      if (btn) { btn.disabled = false; btn.textContent = "开始笔试"; }
    });
  }

  var _examSession = null;

  function _openExamPanel(sessionId) {
    fetch(API + "/api/exams/sessions/" + sessionId, { headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (s) {
        _examSession = s;
        var total = s.questions.length;
        var idx = -1;
        for (var i = 0; i < total; i++) { if (!s.questions[i].user_answer) { idx = i; break; } }
        if (idx === -1) idx = 0;

        var mask = document.createElement("div");
        mask.className = "modal-mask exam-mask";
        mask.innerHTML =
          '<div class="exam-panel">' +
            '<div class="exam-panel-header">' +
              '<div>' +
                '<div class="exam-panel-title">📝 ' + _esc(s.job_title || "AI 笔试") + '</div>' +
                '<div class="exam-panel-sub">' + _esc(s.company || "") + '</div>' +
              '</div>' +
              '<div style="text-align:right">' +
                '<div class="exam-progress-text"><span id="_examIdx">' + (idx + 1) + '</span> / ' + total + '</div>' +
                '<button id="_examExit" class="btn btn-ghost btn-sm">退出</button>' +
              '</div>' +
            '</div>' +
            '<div class="exam-progress-bar"><div id="_examProgressFill" class="exam-progress-fill" style="width:' + ((idx / total) * 100) + '%"></div></div>' +
            '<div id="_examBody" class="exam-panel-body"></div>' +
            '<div class="exam-panel-footer" id="_examFooter"></div>' +
          '</div>';
        document.body.appendChild(mask);
        document.getElementById("_examExit").onclick = function () {
          if (confirm("退出后当前作答会自动保存，可稍后继续。确认退出？")) mask.remove();
        };
        _renderExamQ(idx);
      })
      .catch(function (e) { alert("加载笔试失败：" + e.message); });
  }

  function _renderExamQ(idx) {
    var q = _examSession.questions[idx];
    var body = document.getElementById("_examBody");
    var footer = document.getElementById("_examFooter");
    document.getElementById("_examIdx").textContent = idx + 1;
    var total = _examSession.questions.length;

    var typeLabel = { single: "单选", multiple: "多选", code: "编程题", text: "简答题" }[q.question_type] || q.question_type;
    var html = '<div class="exam-q-meta">第 ' + (idx + 1) + ' 题 · ' + typeLabel + '</div>' +
               '<div class="exam-q-stem">' + _esc(q.question) + '</div>';

    var prevAnswer = null;
    if (q.user_answer) { try { prevAnswer = JSON.parse(q.user_answer); } catch (e) { prevAnswer = q.user_answer; } }

    if (q.question_type === "single" || q.question_type === "multiple") {
      var opts = q.options;
      if (typeof opts === "string") { try { opts = JSON.parse(opts); } catch (e) { opts = null; } }
      if (Array.isArray(opts)) {
        html += '<div class="exam-opts">' + opts.map(function (o, i) {
          var label = String.fromCharCode(65 + i);
          var val, txt;
          if (typeof o === "object" && o !== null) { val = o.key || o.label || label; txt = o.value || o.text || o.content || JSON.stringify(o); }
          else { val = label; txt = o; }
          var checked = false;
          if (prevAnswer) {
            if (Array.isArray(prevAnswer)) checked = prevAnswer.indexOf(val) !== -1;
            else checked = prevAnswer === val;
          }
          return '<label class="exam-opt">' +
            '<input type="' + (q.question_type === "multiple" ? "checkbox" : "radio") + '" name="_examOpt" value="' + val + '"' + (checked ? " checked" : "") + '>' +
            '<span class="exam-opt-key">' + label + '.</span><span>' + _esc(String(txt)) + '</span>' +
          '</label>';
        }).join("") + '</div>';
      }
    } else if (q.question_type === "code") {
      html += '<textarea id="_examAns" class="exam-code-box" placeholder="在此输入你的代码…">' + _esc(typeof prevAnswer === "string" ? prevAnswer : "") + '</textarea>';
    } else {
      html += '<textarea id="_examAns" class="exam-text-box" placeholder="在此作答…">' + _esc(typeof prevAnswer === "string" ? prevAnswer : "") + '</textarea>';
    }

    body.innerHTML = html;

    var fhtml = '<div style="display:flex;gap:8px">';
    if (idx > 0) fhtml += '<button class="btn btn-ghost" onclick="_renderExamQ(' + (idx - 1) + ')">← 上一题</button>';
    if (idx < total - 1) fhtml += '<button class="btn btn-primary" id="_examNext">下一题 →</button>';
    fhtml += '</div><div><button class="btn btn-outline" id="_examFinishBtn">提交试卷</button></div>';
    footer.innerHTML = fhtml;

    var nextBtn = document.getElementById("_examNext");
    if (nextBtn) {
      nextBtn.onclick = function () { _examSubmit(q.id, _collectExamAnswer(q), idx); };
    }
    document.getElementById("_examFinishBtn").onclick = function () {
      if (!confirm("确认提交试卷？提交后不可修改。")) return;
      _examFinish();
    };

    if (q.question_type === "single") {
      body.querySelectorAll('input[name="_examOpt"]').forEach(function (el) {
        el.addEventListener("change", function () { _examSubmit(q.id, _collectExamAnswer(q), idx); });
      });
    }
  }

  function _collectExamAnswer(q) {
    if (q.question_type === "single") {
      var sel = document.querySelector('input[name="_examOpt"]:checked');
      return sel ? sel.value : "";
    } else if (q.question_type === "multiple") {
      var arr = [];
      document.querySelectorAll('input[name="_examOpt"]:checked').forEach(function (x) { arr.push(x.value); });
      return arr;
    } else {
      var ta = document.getElementById("_examAns");
      return ta ? ta.value : "";
    }
  }

  function _examSubmit(qid, answer, idx) {
    fetch(API + "/api/exams/sessions/" + _examSession.id + "/submit", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ user_answer: String(answer || "") })
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(extractMsg(d) || "HTTP " + r.status); });
      return r.json();
    })
    .then(function () {
      return fetch(API + "/api/exams/sessions/" + _examSession.id, { headers: authHeaders() }).then(function (r) { return r.json(); });
    })
    .then(function (s) {
      _examSession = s;
      var total = s.questions.length;
      var nextIdx = -1;
      for (var i = 0; i < total; i++) {
        if (i > idx && !s.questions[i].user_answer) { nextIdx = i; break; }
      }
      if (nextIdx === -1) {
        for (var j = 0; j < total; j++) { if (!s.questions[j].user_answer) { nextIdx = j; break; } }
      }
      if (nextIdx === -1) {
        document.getElementById("_examIdx").textContent = total;
        document.getElementById("_examProgressFill").style.width = "100%";
        alert("已答完所有题目，点击右下角『提交试卷』结束考试");
      } else {
        document.getElementById("_examProgressFill").style.width = ((nextIdx / total) * 100) + "%";
        _renderExamQ(nextIdx);
      }
    })
    .catch(function (e) { alert("提交失败：" + e.message); });
  }

  function _examFinish() {
    fetch(API + "/api/exams/sessions/" + _examSession.id + "/finish", {
      method: "POST", headers: authHeaders()
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(extractMsg(d) || "HTTP " + r.status); });
      return r.json();
    })
    .then(function (s) {
      document.querySelectorAll(".exam-mask, .modal-mask").forEach(function (m) { m.remove(); });
      _openExamReport(s, "exam");
    })
    .catch(function (e) { alert("提交失败：" + e.message); });
  }

  function _openExamReport(s, kind) {
    kind = kind || "exam";
    var r = s.report || {};
    var score = s.score || 0;
    var levelLabel = { excellent: "优秀", good: "良好", pass: "及格", weak: "需加强" }[r.level] || r.level || "-";
    var levelColor = { excellent: "#10b981", good: "#3b82f6", pass: "#f59e0b", weak: "#ef4444" }[r.level] || "#666";
    var correct = s.correct_count || 0;
    var total = s.total_count || 0;
    var accPct = total ? Math.round((correct / total) * 100) : 0;
    var questions = s.questions || [];

    var qHtml = "";
    if (questions.length) {
      qHtml = '<div class="form-row" style="margin-bottom:8px">' +
        '<label>答题详情（' + questions.length + ' 道）</label>' +
        '<div class="report-list">' + questions.map(function (q) {
          var isRight = q.is_correct === true || q.is_correct === 1;
          var typeLabel = { single: "单选", multiple: "多选", qa: "问答", code: "代码" }[q.type || q.question_type] || "";
          var optHtml = "";
          try {
            var opts = typeof q.options === "string" ? JSON.parse(q.options) : (q.options || []);
            if (opts.length) {
              optHtml = '<div style="margin:6px 0 2px;color:#666;font-size:12px">选项：' + opts.map(function (o, i) { return String.fromCharCode(65 + i) + ". " + _esc(o); }).join(" &nbsp;&nbsp; ") + '</div>';
            }
          } catch (e) {}
          return '<div class="report-item" style="border-left:3px solid ' + (isRight ? "#10b981" : "#ef4444") + '">' +
            '<div class="report-item-q"><span style="color:#888;font-size:12px;margin-right:6px">' + typeLabel + '</span><span style="font-weight:600">第' + q.seq + '题</span> · ' + _esc(q.question || "") + '</div>' +
            optHtml +
            '<div class="report-item-a">你的答案：<span style="color:#' + (isRight ? '10b981' : 'ef4444') + '">' + _esc(String(q.user_answer || "未作答")) + '</span></div>' +
            '<div class="report-item-a">正确答案：<span style="color:#10b981">' + _esc(String(q.answer || "")) + '</span></div>' +
            (q.analysis ? '<div style="color:#666;font-size:12px;margin-top:4px">解析：' + _esc(String(q.analysis)) + '</div>' : '') +
          '</div>';
        }).join("") +
        '</div></div>';
    } else {
      var weaknesses = r.weaknesses || [];
      if (weaknesses.length) {
        qHtml = '<div class="form-row" style="margin-bottom:8px">' +
          '<label>错题回顾（' + weaknesses.length + ' 道）</label>' +
          '<div class="report-list">' + weaknesses.map(function (w) {
            return '<div class="report-item">' +
              '<div class="report-item-q">第' + w.seq + '题 · ' + _esc(w.question || "") + '</div>' +
              '<div class="report-item-a">你的答案：<span style="color:#ef4444">' + _esc(String(w.user_answer || "未作答")) + '</span> &nbsp; 正确答案：<span style="color:#10b981">' + _esc(String(w.reference || w.correct_answer || "")) + '</span></div>' +
            '</div>';
          }).join("") +
          '</div></div>';
      }
    }

    var sugHtml = "";
    var suggestions = r.suggestions || [];
    if (suggestions.length) {
      sugHtml = '<div class="form-row">' +
        '<label>提升建议</label>' +
        '<ul class="report-suggestions">' + suggestions.map(function (x) { return '<li>' + _esc(x) + '</li>'; }).join("") + '</ul>' +
      '</div>';
    }

    var html =
      '<div class="modal-mask" onclick="if(event.target===this)this.remove()">' +
        '<div class="modal-card" style="width:680px;max-height:88vh">' +
          '<div class="modal-header"><span>📊 笔试报告</span><button onclick="this.closest(\'.modal-mask\').remove()" class="modal-close">✕</button></div>' +
          '<div class="modal-body exam-body">' +
            '<div class="exam-hero">' +
              '<div class="exam-hero-score">' + score + '</div>' +
              '<div class="exam-hero-job">' + _esc(s.job_title || "") + ' · ' + _esc(s.company || "") + '</div>' +
              '<div class="exam-hero-meta"><span class="sess-level" style="--lvl:' + levelColor + '">' + levelLabel + '</span> 正确率 ' + accPct + '% · ' + correct + '/' + total + ' 题</div>' +
            '</div>' +
            '<div class="form-row" style="margin-bottom:12px">' +
              '<label>报告摘要</label>' +
              '<div class="report-summary">' + _esc(r.summary || "") + '</div>' +
            '</div>' +
            qHtml +
            sugHtml +
          '</div>' +
          '<div class="modal-footer">' +
            '<button onclick="rejudgeAndRefresh(\'' + kind + '\', ' + s.id + ')" class="btn btn-outline" style="margin-right:10px">🔄 重新评定</button>' +
            '<button onclick="this.closest(\'.modal-mask\').remove()" class="btn btn-primary">好的</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.insertAdjacentHTML("beforeend", html);
  }

  function loadWrongQuestions(type) {
    if (!getToken()) { alert("请先登录"); return; }
    var url = type === "exam" ? (API + "/api/exams/sessions") : (API + "/api/interviews/sessions");
    fetch(url, { headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (raw) {
        var list = toList(raw);
        var valid = list.filter(function (s) { return s.status === "finished" && s.report; });
        var typeLabel = type === "exam" ? "笔试" : "面试";
        var openFn = type === "exam" ? "_openExamSessionReport" : "_openSessionReport";

        var inner = "";
        if (!valid.length) {
          inner = _hint("📚", "暂无已完成的" + typeLabel + "记录");
        } else {
          inner = '<div class="sess-list">' + valid.map(function (s) {
            var r = typeof s.report === "string" ? (function () { try { return JSON.parse(s.report); } catch (e) { return {}; } })() : (s.report || {});
            var score = s.score || 0;
            var levelLabel = { excellent: "优秀", good: "良好", pass: "及格", weak: "需加强" }[r.level] || "";
            var levelColor = { excellent: "#10b981", good: "#3b82f6", pass: "#f59e0b", weak: "#ef4444" }[r.level] || "#8b94a3";
            var dateStr = "";
            try { dateStr = new Date(s.finished_at || s.created_at).toLocaleString("zh-CN"); } catch (e) { dateStr = ""; }
            var summary = (r.summary || "").length > 120 ? (r.summary || "").slice(0, 120) + "…" : (r.summary || "");
            return '<div class="sess-card">' +
              '<div class="sess-head">' +
                '<div class="sess-main">' +
                  '<div class="sess-title">' + _esc(s.job_title || "") + '</div>' +
                  '<div class="sess-meta">' + _esc(s.company || "") + ' · ' + dateStr + '</div>' +
                '</div>' +
                '<div class="sess-score-col">' +
                  '<div class="sess-score">' + score + '</div>' +
                  '<span class="sess-level" style="--lvl:' + levelColor + '">' + levelLabel + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="sess-summary">' + _esc(summary) + '</div>' +
              '<button class="btn btn-outline btn-sm" onclick="' + openFn + '(' + s.id + ')">查看完整报告 →</button>' +
            '</div>';
          }).join("") + '</div>';
        }

        var html =
          '<div class="modal-mask" onclick="if(event.target===this)this.remove()">' +
            '<div class="modal-card" style="width:600px">' +
              '<div class="modal-header"><span>📚 ' + typeLabel + '历史报告</span><button onclick="this.closest(\'.modal-mask\').remove()" class="modal-close">✕</button></div>' +
              '<div class="modal-body">' + inner + '</div>' +
              '<div class="modal-footer"><button onclick="this.closest(\'.modal-mask\').remove()" class="btn btn-primary">关闭</button></div>' +
            '</div>' +
          '</div>';
        document.body.insertAdjacentHTML("beforeend", html);
      })
      .catch(function (e) { alert("加载失败：" + e.message); });
  }

  function _openSessionReport(id) {
    fetch(API + "/api/interviews/sessions/" + id, { headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (s) { try { _openExamReport(s, "interview"); } catch (e) { alert("渲染报告出错：" + e.message); } })
      .catch(function (e) { alert("加载面试报告失败：" + e.message); });
  }

  function _openExamSessionReport(id) {
    fetch(API + "/api/exams/sessions/" + id, { headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (s) { try { _openExamReport(s, "exam"); } catch (e) { alert("渲染报告出错：" + e.message + "\n" + e.stack); } })
      .catch(function (e) { alert("加载报告失败：" + e.message); });
  }


  function rejudgeAndRefresh(kind, id) {
    if (!confirm("确定要让 AI 重新评定这次" + (kind === "exam" ? "笔试" : "面试") + "吗？")) return;
    var url = kind === "exam" ? (API + "/api/exams/sessions/" + id + "/rejudge") : (API + "/api/interviews/sessions/" + id + "/rejudge");
    var btn = document.querySelector(".modal-mask:last-of-type .modal-footer button");
    var origText = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "评定中..."; }
    fetch(url, { method: "POST", headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) {
        var s = data.data || data;
        document.querySelectorAll(".modal-mask").forEach(function (m) { m.remove(); });
        _openExamReport(s, kind);
      })
      .catch(function (e) { alert("重新评定失败：" + e.message); if (btn) { btn.disabled = false; btn.textContent = origText; } });
  }

  /* ========= 全局暴露 ========= */
  window.switchTab = switchTab;
  window.gotoAI = gotoAI;
  window.toggleCollect = toggleCollect;
  window.matchJob = matchJob;
  window.openJobDetail = openJobDetail;
  window.closeJobDetail = closeJobDetail;
  window.toggleCompare = toggleCompare;
  window.openCompare = openCompare;
  window.closeCompare = closeCompare;
  window.clearCompare = clearCompare;
  window.refreshRecommend = refreshRecommend;
  window.changeApplyStatus = changeApplyStatus;
  window.closeMatchPanel = closeMatchPanel;
  window.applyJob = applyJob;
  window.previewResume = previewResume;
  window.openEditor = openEditor;
  window.openSourceFile = openSourceFile;
  window.closeEditor = closeEditor;
  window.addEntry = addEntry;
  window.removeEntry = removeEntry;
  window.saveResume = saveResume;
  window.deleteResume = deleteResume;
  window.createBlankResume = createBlankResume;
  window.uploadResume = uploadResume;
  window.setUploadStatus = setUploadStatus;
  window.diagnoseResume = diagnoseResume;
  window.startAIInterview = startAIInterview;
  window.startAIExam = startAIExam;
  window.loadWrongQuestions = loadWrongQuestions;
  window.rejudgeAndRefresh = rejudgeAndRefresh;
  window._openSessionReport = _openSessionReport;
  window._openExamSessionReport = _openExamSessionReport;
  window.authSwitch = authSwitch;
  window.authSubmit = authSubmit;
  window.refreshSkills = refreshSkills;
  window.logout = function () { clearAuth(); location.href = "/login"; };
  window.goRegister = function () { location.href = "/login"; };

})();


