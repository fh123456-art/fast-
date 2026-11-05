(function () {
  "use strict";

  var API = "";
  var _allJobs = [];
  var _allInterns = [];
  var _allResumes = [];
  var _internCat = "全部";
  var _editingResumeId = null;
  var _selectedCity = "全国";

  var CHINA_CITIES = {
    "直辖市": ["北京", "上海", "天津", "重庆"],
    "河北": ["石家庄", "唐山", "秦皇岛", "邯郸", "保定", "张家口", "承德", "沧州", "廊坊", "衡水"],
    "山西": ["太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁"],
    "内蒙古": ["呼和浩特", "包头", "乌海", "赤峰", "通辽", "鄂尔多斯", "呼伦贝尔", "巴彦淖尔", "乌兰察布"],
    "辽宁": ["沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛"],
    "吉林": ["长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边"],
    "黑龙江": ["哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭"],
    "江苏": ["南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁"],
    "浙江": ["杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水"],
    "安徽": ["合肥", "芜湖", "蚌埠", "淮南", "马鞍山", "淮北", "铜陵", "安庆", "黄山", "滁州", "阜阳", "宿州", "六安", "亳州", "池州", "宣城"],
    "福建": ["福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德"],
    "江西": ["南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶"],
    "山东": ["济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"],
    "河南": ["郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店"],
    "湖北": ["武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施", "仙桃", "潜江", "天门"],
    "湖南": ["长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西"],
    "广东": ["广州", "深圳", "珠海", "汕头", "佛山", "韶关", "湛江", "肇庆", "江门", "茂名", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮"],
    "广西": ["南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左"],
    "海南": ["海口", "三亚", "三沙", "儋州"],
    "四川": ["成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳"],
    "贵州": ["贵阳", "六盘水", "遵义", "安顺", "毕节", "铜仁"],
    "云南": ["昆明", "曲靖", "玉溪", "保山", "昭通", "丽江", "普洱", "临沧"],
    "西藏": ["拉萨", "日喀则", "昌都", "林芝", "山南", "那曲", "阿里"],
    "陕西": ["西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛"],
    "甘肃": ["兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南"],
    "青海": ["西宁", "海东", "海北", "黄南", "海南州", "果洛", "玉树", "海西"],
    "宁夏": ["银川", "石嘴山", "吴忠", "固原", "中卫"],
    "新疆": ["乌鲁木齐", "克拉玛依", "吐鲁番", "哈密", "昌吉", "博尔塔拉", "巴音郭楞", "阿克苏", "克孜勒苏", "喀什", "和田", "伊犁", "塔城", "阿勒泰"],
    "特别行政区": ["香港", "澳门"],
    "台湾": ["台北", "高雄", "台中", "台南", "新北"]
  };

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
  }
  function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function init() {
    document.querySelectorAll(".modal, .modal-mask, .exam-mask").forEach(function (n) { n.remove(); });
    initAuth();
    bindTabBar();
    bindSearch();
    bindLoginForm();
    applyLoginState();
    bindFABDrag();
    bindCitySwitchClick();
    updateCityLabel();
    renderCityChips();
    switchTab("home");
    validateTokenSilently();
    loadNotices();
  }

  var _allNotices = [];

  async function loadNotices() {
    var bar = document.getElementById("notice-bar");
    var bell = document.getElementById("edu-bell");
    var dot = document.getElementById("bell-dot");
    if (!bar) return;
    try {
      var headers = {};
      var token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
      var r = await fetch(API + "/api/messages?limit=50", { headers: headers });
      if (!r.ok) return;
      var data = await r.json();
      if (!data || !Array.isArray(data) || data.length === 0) return;

      _allNotices = data;

      var latest = data[0];
      document.getElementById("notice-title").textContent = latest.title || "系统公告";
      document.getElementById("notice-content").textContent = latest.content || "";
      bar.style.display = "flex";

      document.getElementById("notice-close").onclick = function () {
        bar.style.display = "none";
        if (dot) dot.style.display = "block";
      };
      document.getElementById("notice-more").onclick = function (e) { e.preventDefault(); showNoticeModal(); };

      if (bell) {
        bell.onclick = function () {
          if (bar.style.display === "flex") {
            showNoticeModal();
          } else {
            bar.style.display = "flex";
            if (dot) dot.style.display = "none";
          }
        };
      }
    } catch (e) { }
  }

  function showNoticeModal() {
    if (_allNotices.length === 0) return;

    var mask = document.createElement("div");
    mask.className = "modal-mask";

    var listHtml = _allNotices.map(function (m) {
      var time = m.created_at ? m.created_at.slice(0, 10) : "";
      var role = "";
      if (m.target_role === "student") role = '<span class="tag tag-blue">学生</span>';
      else if (m.target_role === "enterprise") role = '<span class="tag tag-green">企业</span>';
      else if (m.target_role === "all") role = '<span class="tag tag-gray">全站</span>';

      return '<div class="notice-item-row">' +
        '<div class="notice-item-head">' +
          '<span class="notice-item-title">' + (m.title || "系统公告") + '</span>' +
          role +
          '<span class="notice-item-time">' + time + '</span>' +
        '</div>' +
        '<div class="notice-item-body">' + (m.content || "") + '</div>' +
      '</div>';
    }).join("");

    mask.innerHTML =
      '<div class="modal-card notice-modal">' +
        '<div class="modal-header">' +
          '<div class="modal-title">📢 全部系统公告</div>' +
          '<div class="modal-close">×</div>' +
        '</div>' +
        '<div class="modal-body notice-modal-body">' + listHtml + '</div>' +
      '</div>';

    document.body.appendChild(mask);

    var close = function () { mask.remove(); };
    mask.onclick = function (e) { if (e.target === mask) close(); };
    mask.querySelector(".modal-close").onclick = close;
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
      fab.style.right = "auto";
      isDragging = true;
      moved = false;
      fab.style.transition = "none";
      fab.style.zIndex = 9999;
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
      if (!isDragging) return false;
      isDragging = false;
      fab.style.transition = "";
      fab.style.zIndex = "";
      if (moved) {
        var pos = { left: parseFloat(fab.style.left), bottom: parseFloat(fab.style.bottom) };
        try { localStorage.setItem("fab_pos", JSON.stringify(pos)); } catch (e) { }
        return true;
      }
      return false;
    }

    fab.addEventListener("mousedown", function (e) {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", function (e) { onMove(e.clientX, e.clientY); });
    document.addEventListener("mouseup", function (e) {
      if (!isDragging) return;
      e.preventDefault();
      var wasMoved = moved;
      onEnd();
      if (!wasMoved) switchTab("ai");
    });

    fab.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      onStart(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!isDragging) return;
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
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
      loginArea.innerHTML = '<div style="font-size:12px;color:#333;margin-right:8px;">你好, ' + (me.username || me.name || "用户") + '</div><button class="btn-mini" onclick="logout()">退出</button>';
    } else {
      loginArea.innerHTML = '<a href="/login" style="font-size:12px;color:#7b5cc7;text-decoration:none;margin-right:10px;">登录</a><button class="btn-mini btn-primary-mini" onclick="goRegister()">注册</button>';
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
    document.querySelectorAll(".tabbar .tab").forEach(function (tab) {
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

    document.querySelectorAll(".tabbar .tab").forEach(function (t) {
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
    } else if (mode === "letter") {
      switchTab("ai");
      setTimeout(function () { window.runCoverLetter(); }, 200);
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

    var is = document.getElementById("internSearch");
    if (is) {
      is.addEventListener("input", applyInternFilter);
      is.addEventListener("keydown", function (e) { if (e.key === "Enter") applyInternFilter(); });
    }
  }

  /* ========= 职位卡片 ========= */
  function jobCard(j) {
    if (!j) return "";
    var salary = "";
    if (j.salary_min || j.salary_max) salary = ((j.salary_min || 0) / 1000) + "-" + ((j.salary_max || 0) / 1000) + "K";
    var tags = [];
    if (j.job_type) tags.push(j.job_type);
    if (j.education) tags.push(j.education);
    if (j.experience) tags.push(j.experience);
    var skills = [];
    try { skills = Array.isArray(j.skills) ? j.skills : JSON.parse(j.skills); } catch (e) { skills = []; }

    var matchBadge = "";
    if (j.match_score && j.match_score > 0) {
      var color = j.match_score >= 80 ? "#22c55e" : j.match_score >= 60 ? "#f59e0b" : "#ef4444";
      matchBadge = '<span style="display:inline-flex;align-items:center;background:' + color + ';color:#fff;font-size:11px;padding:2px 10px;border-radius:12px;margin-left:6px;font-weight:600;">🎯 匹配 ' + j.match_score + ' 分</span>';
    }

    var aiBadge = "";
    if (j.ai_generated) {
      aiBadge = '<span style="display:inline-block;background:linear-gradient(90deg,#f59e0b,#ef4444);color:#fff;font-size:10px;padding:1px 7px;border-radius:8px;margin-left:6px;font-weight:500;">⚡ AI 生成</span>';
    } else if (j.ai_match) {
      aiBadge = '<span style="display:inline-block;background:linear-gradient(90deg,#7b5cc7,#5a3fa0);color:#fff;font-size:10px;padding:1px 7px;border-radius:8px;margin-left:6px;font-weight:500;">✨ AI 匹配</span>';
    }

    var btns = '<div style="display:flex;gap:8px;margin-top:10px;">' +
      '<button class="btn-mini" onclick="toggleCollect(' + j.id + ')">⭐ 收藏</button>' +
      '<button class="btn-mini btn-primary-mini" onclick="matchJob(' + j.id + ')">🎯 AI 匹配</button>' +
      '<button class="btn-mini" onclick="applyJob(' + j.id + ')">📤 投递</button>' +
    '</div>';

    return (
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px;">' +
          '<div style="font-weight:600;color:#2a2140;">' + (j.title || "") + matchBadge + aiBadge + '</div>' +
          '<div style="color:#ff4d4f;font-size:13px;">' + salary + '</div>' +
        '</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:6px;">' + (j.company || "") + ' · ' + (j.city || "") + '</div>' +
        '<div style="font-size:12px;color:#999;margin-bottom:6px;">' + tags.join(" · ") + '</div>' +
        (skills.length ? '<div style="margin-top:4px;">' + skills.slice(0, 4).map(function (s) {
          return '<span style="display:inline-block;background:#efe9fb;color:#7b5cc7;font-size:11px;padding:2px 8px;border-radius:10px;margin-right:5px;">' + s + '</span>';
        }).join("") + '</div>' : "") +
        btns +
      '</div>'
    );
  }

  /* ========= 各页面加载 ========= */
  async function loadHome() {
    try {
      var saved = localStorage.getItem("selected_city");
      if (saved) _selectedCity = saved;
      updateCityLabel();
      bindCitySwitchClick();
    } catch (e) { }

    var box = document.getElementById("home-job-list");
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">加载中…</div>';
    try {
      var r = await fetch(API + "/api/jobs");
      var data = await r.json();
      _allJobs = toList(data);
      renderCityChips();
      var filtered = applyCityToJobs(_allJobs);
      var top = filtered.slice(0, 6);
      if (top.length > 0) {
        box.innerHTML = top.map(jobCard).join("");
      } else {
        if (!_selectedCity || _selectedCity === "全国") {
          box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">暂无职位</div>';
        } else {
          box.innerHTML = '<div style="text-align:center;padding:20px;color:#7b5cc7;"><div style="font-size:24px;">🤖</div><div style="font-weight:600;margin-top:4px;">「' + _selectedCity + '」暂无本地职位</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">AI 正在联网搜索该城市热门职位…</div></div>';
          try {
            var ar = await fetch(API + "/api/jobs/ai-search?keyword=%E7%83%AD%E9%97%A8%E8%81%8C%E4%BD%8D&city=" + encodeURIComponent(_selectedCity));
            var aJobs = toList(await ar.json());
            if (aJobs && aJobs.length) {
              _allJobs = _allJobs.concat(aJobs.filter(function (j) { return !_allJobs.some(function (e) { return e.id === j.id; }); }));
              renderCityChips();
              box.innerHTML = aJobs.slice(0, 6).map(jobCard).join("");
            } else {
              box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">「' + _selectedCity + '」AI 也未搜到职位，试试其他城市</div>';
            }
          } catch (e2) {
            box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">「' + _selectedCity + '」暂无职位，试试切换城市</div>';
          }
        }
      }
    } catch (e) {
      box.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">加载失败</div>';
    }
  }

  async function loadPositions() {
    var box = document.getElementById("position-list");
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">加载中…</div>';
    try {
      var r = await fetch(API + "/api/jobs");
      var data = await r.json();
      _allJobs = toList(data);
      renderCityChips();
      applyPositionFilter();
    } catch (e) {
      box.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">加载失败</div>';
    }
  }

  function renderPositionList(list) {
    var box = document.getElementById("position-list");
    if (!box) return;
    if (!list.length) {
      var tip = _selectedCity === "全国" ? "没有匹配的职位" : "「" + _selectedCity + "」暂无匹配职位";
      box.innerHTML = '<div class="empty-state"><div class="e-icon">🔍</div>' + tip + '<br><span style="font-size:12px;color:#999;">试试换个关键词或切换城市</span></div>';
      return;
    }
    box.innerHTML = list.map(jobCard).join("");
  }

  function applyPositionFilter() {
    var ps = document.getElementById("positionSearch");
    var base = applyCityToJobs(_allJobs);
    if (!ps) { renderPositionList(base); return; }
    var q = ps.value.trim().toLowerCase();
    if (!q) { renderPositionList(base); return; }

    var filtered = base.filter(function (j) {
      return (j.title || "").toLowerCase().indexOf(q) > -1
          || (j.company || "").toLowerCase().indexOf(q) > -1
          || (j.category || "").toLowerCase().indexOf(q) > -1
          || (j.city || "").toLowerCase().indexOf(q) > -1
          || JSON.stringify(j.skills || []).toLowerCase().indexOf(q) > -1;
    });

    if (filtered.length > 0) {
      renderPositionList(filtered);
    } else {
      aiSearchAndRender(q);
    }
  }

  function applyCityToJobs(list) {
    if (!_selectedCity || _selectedCity === "全国") return list;
    return list.filter(function (j) {
      var c = (j.city || "").replace(/\s+/g, "");
      if (!c) return false;
      if (c === _selectedCity) return true;
      if (c.indexOf("/") > -1) {
        var parts = c.split("/");
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].trim() === _selectedCity) return true;
        }
      }
      return false;
    });
  }

  function getCityJobCount(city) {
    if (!city || city === "全国") return _allJobs.length;
    return applyCityToJobs(_allJobs).length;
  }

  function renderCityChips() {
    var count = getCityJobCount(_selectedCity);
    var html = '<button onclick="openCityPicker()" style="flex-shrink:0;padding:6px 16px;border-radius:16px;border:1.5px solid #7b5cc7;background:#eaf2ff;color:#7b5cc7;font-size:13px;cursor:pointer;white-space:nowrap;font-weight:600;">📍 ' + _selectedCity + ' · ' + count + ' ▾</button>' +
      '<button onclick="openCityPicker()" style="flex-shrink:0;padding:6px 14px;border-radius:16px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;font-size:12px;cursor:pointer;font-weight:500;">🗺 选择城市</button>' +
      (_selectedCity !== "全国" ? '<button onclick="setCity(\'全国\')" style="flex-shrink:0;padding:6px 12px;border-radius:16px;border:1px dashed #7b5cc7;background:#fff;color:#7b5cc7;font-size:12px;cursor:pointer;">✕ 清除</button>' : '');

    var homeBox = document.getElementById("home-city-chips");
    var posBox = document.getElementById("position-city-chips");
    var internBox = document.getElementById("intern-city-chips");
    if (homeBox) homeBox.innerHTML = html;
    if (posBox) posBox.innerHTML = html;
    if (internBox) internBox.innerHTML = html;

    updateCityLabel();
  }

  function updateCityLabel() {
    var lbl = document.getElementById("edu-city-name");
    if (lbl) lbl.textContent = _selectedCity;
  }

  function bindCitySwitchClick() {
    var sw = document.getElementById("edu-city-switch");
    if (!sw || sw._boundCity) return;
    sw._boundCity = true;
    sw.addEventListener("click", function () { openCityPicker(); });
  }

  window.openCityPicker = function () {
    var existing = document.getElementById("city-picker-mask");
    if (existing) { existing.style.display = "flex"; return; }

    var provinces = Object.keys(CHINA_CITIES);
    var firstProv = provinces[0];

    var mask = document.createElement("div");
    mask.id = "city-picker-mask";
    mask.style.cssText = "display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;";
    mask.innerHTML =
      '<div style="background:#fff;border-radius:16px;width:92%;max-width:560px;max-height:80vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:slideUp .2s ease-out;">' +
      '<div style="background:linear-gradient(90deg,#7b5cc7,#5a3fa0);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="font-weight:600;font-size:16px;">🗺 选择所在地区</div>' +
      '<button onclick="document.getElementById(\'city-picker-mask\').style.display=\'none\'" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px;">关闭 ✕</button>' +
      '</div>' +
      '<div style="display:flex;padding:10px;border-bottom:1px solid #f1f5f9;gap:6px;">' +
      '<input id="city-search-input" placeholder="🔍 搜索城市名..." style="flex:1;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none;" />' +
      '<button onclick="setCity(\'全国\');document.getElementById(\'city-picker-mask\').style.display=\'none\'" style="padding:8px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">🌐 全国</button>' +
      '</div>' +
      '<div style="display:flex;flex:1;overflow:hidden;">' +
      '<div id="city-prov-col" style="width:40%;overflow-y:auto;border-right:1px solid #f1f5f9;"></div>' +
      '<div id="city-city-col" style="width:60%;overflow-y:auto;"></div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(mask);
    mask.addEventListener("click", function (e) { if (e.target === mask) mask.style.display = "none"; });

    window._cityPickerProv = firstProv;
    renderCityPickerProvinces(provinces);
    renderCityPickerCities(firstProv);

    var search = document.getElementById("city-search-input");
    if (search) {
      search.focus();
      search.addEventListener("input", function () {
        var q = this.value.trim();
        if (!q) {
          renderCityPickerProvinces(provinces);
          renderCityPickerCities(window._cityPickerProv);
          return;
        }
        var matches = [];
        provinces.forEach(function (p) {
          CHINA_CITIES[p].forEach(function (c) {
            if (c.indexOf(q) > -1) matches.push({ province: p, city: c });
          });
        });
        renderCityPickerSearchResult(matches, q);
      });
    }
  };

  function renderCityPickerProvinces(provinces) {
    var col = document.getElementById("city-prov-col");
    if (!col) return;
    var html = "";
    provinces.forEach(function (p) {
      var active = window._cityPickerProv === p;
      var count = CHINA_CITIES[p].length;
      html += '<div onclick="selectCityPickerProv(\'' + p + '\')" style="padding:10px 16px;cursor:pointer;border-left:3px solid ' +
        (active ? '#7b5cc7' : 'transparent') + ';background:' +
        (active ? '#eaf2ff' : '#fff') + ';color:' +
        (active ? '#7b5cc7' : '#334155') + ';font-size:13px;font-weight:' +
        (active ? '600' : '400') + ';display:flex;justify-content:space-between;align-items:center;">' +
        '<span>' + p + '</span><span style="font-size:11px;color:#94a3b8;">' + count + '市</span></div>';
    });
    col.innerHTML = html;
  }

  window.selectCityPickerProv = function (p) {
    window._cityPickerProv = p;
    renderCityPickerProvinces(Object.keys(CHINA_CITIES));
    renderCityPickerCities(p);
  };

  function renderCityPickerCities(prov) {
    var col = document.getElementById("city-city-col");
    if (!col) return;
    var cities = CHINA_CITIES[prov] || [];
    var html = "";
    cities.forEach(function (c) {
      var cnt = getCityJobCount(c);
      var isSel = _selectedCity === c;
      html += '<div onclick="confirmCity(\'' + c + '\')" style="padding:10px 16px;cursor:pointer;background:' +
        (isSel ? '#f0eafc' : '#fff') + ';border-bottom:1px solid #f8fafc;font-size:13px;color:' +
        (isSel ? '#7b5cc7' : '#334155') + ';display:flex;justify-content:space-between;align-items:center;">' +
        '<span>' + c + (isSel ? ' ✓' : '') + '</span>' +
        '<span style="font-size:11px;color:' + (cnt > 0 ? '#7b5cc7' : '#94a3b8') + ';">' +
        (cnt > 0 ? '📦 ' + cnt + ' 个本地岗位' : '🤖 AI 智能搜寻') + '</span></div>';
    });
    col.innerHTML = html;
  }

  function renderCityPickerSearchResult(matches, q) {
    var col = document.getElementById("city-city-col");
    var provCol = document.getElementById("city-prov-col");
    if (!col) return;
    provCol.innerHTML = '<div style="padding:12px 16px;color:#94a3b8;font-size:12px;">搜索结果</div>';
    if (!matches.length) {
      col.innerHTML = '<div style="padding:20px;color:#94a3b8;font-size:13px;text-align:center;">未找到匹配"' + q + '"的城市</div>';
      return;
    }
    var html = "";
    matches.forEach(function (m) {
      var cnt = getCityJobCount(m.city);
      html += '<div onclick="confirmCity(\'' + m.city + '\')" style="padding:10px 16px;cursor:pointer;background:#fff;border-bottom:1px solid #f8fafc;font-size:13px;color:#334155;display:flex;justify-content:space-between;align-items:center;">' +
        '<span>' + m.city + ' <span style="font-size:11px;color:#94a3b8;">· ' + m.province + '</span></span>' +
        '<span style="font-size:11px;color:' + (cnt > 0 ? '#7b5cc7' : '#94a3b8') + ';">' +
        (cnt > 0 ? '📦 ' + cnt + ' 个本地岗位' : '🤖 AI 智能搜寻') + '</span></div>';
    });
    col.innerHTML = html;
  }

  window.confirmCity = function (city) {
    var mask = document.getElementById("city-picker-mask");
    if (mask) mask.style.display = "none";
    setCity(city);
  };

  window.setCity = function (city) {
    _selectedCity = city;
    try { localStorage.setItem("selected_city", city); } catch (e) { }
    renderCityChips();
    var activeSec = document.querySelector(".page-section:not([style*='display: none'])");
    if (activeSec && activeSec.id === "sec-position") {
      applyPositionFilter();
      smartSearchIfEmpty("position");
    } else if (activeSec && activeSec.id === "sec-intern") {
      applyInternFilter();
      smartSearchIfEmpty("intern");
    } else {
      loadHome().then(function () { smartSearchIfEmpty("home"); });
    }
  };

  async function smartSearchIfEmpty(where) {
    if (!_selectedCity || _selectedCity === "全国") return;
    var list = where === "intern" ? applyCityToJobs(_allInterns) : applyCityToJobs(_allJobs);
    if (list.length > 0) return;

    var boxId = where === "intern" ? "intern-list" : (where === "home" ? "home-job-list" : "position-list");
    var box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;padding:30px 20px;color:#7b5cc7;">' +
      '<div style="font-size:28px;">🤖</div>' +
      '<div style="font-weight:600;margin-top:8px;">「' + _selectedCity + '」暂无本地岗位</div>' +
      '<div style="font-size:12px;color:#94a3b8;margin-top:6px;">AI 正在联网搜索该城市最新岗位...</div></div>';

    try {
      var r = await fetch(API + "/api/jobs/ai-search?keyword=%E5%B2%97%E4%BD%8D&city=" + encodeURIComponent(_selectedCity));
      var newJobs = toList(await r.json());
      if (newJobs && newJobs.length) {
        _allJobs = _allJobs.concat(newJobs.filter(function (j) {
          return !_allJobs.some(function (e) { return e.id === j.id; });
        }));
        renderCityChips();
        if (where === "intern") {
          applyInternFilter();
        } else if (where === "home") {
          box.innerHTML = newJobs.slice(0, 6).map(jobCard).join("");
        } else {
          applyPositionFilter();
        }
      } else {
        box.innerHTML = '<div class="empty-state"><div class="e-icon">🔍</div>「' + _selectedCity + '」AI 联网也没找到岗位<br><span style="font-size:12px;color:#999;">试试搜索"全国"或其他热门城市</span></div>';
      }
    } catch (e) {
      box.innerHTML = '<div class="empty-state"><div class="e-icon">😵</div>AI 搜索失败，请稍后再试</div>';
    }
  }

  async function aiSearchAndRender(keyword) {
    var box = document.getElementById("position-list");
    var q = keyword;
    if (_selectedCity && _selectedCity !== "全国") q = _selectedCity + " " + keyword;
    box.innerHTML = '<div style="text-align:center;color:#7b5cc7;padding:20px;">🤖 AI 正在联网搜索「' + q + '」最新岗位…</div>';
    try {
      var url = API + "/api/jobs/ai-search?keyword=" + encodeURIComponent(keyword);
      if (_selectedCity && _selectedCity !== "全国") url += "&city=" + encodeURIComponent(_selectedCity);
      var r = await fetch(url);
      var data = toList(await r.json());
      if (data && data.length) {
        _allJobs = _allJobs.concat(data.filter(function (j) { return !_allJobs.some(function (e) { return e.id === j.id; }); }));
      }
      renderPositionList(data);
    } catch (e) {
      renderPositionList([]);
    }
  }

  async function loadIntern() {
    var box = document.getElementById("intern-list");
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">加载中…</div>';
    try {
      var r = await fetch(API + "/api/jobs?job_type=实习");
      var data = await r.json();
      _allInterns = toList(data);
      renderCityChips();
      renderInternCats();
      applyInternFilter();
    } catch (e) { box.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">加载失败</div>'; }
  }

  function renderInternCats() {
    var catBox = document.getElementById("intern-cats");
    if (!catBox) return;
    var cats = ["全部"];
    _allInterns.forEach(function (j) {
      if (j.category && cats.indexOf(j.category) === -1) cats.push(j.category);
    });
    catBox.innerHTML = cats.map(function (c) {
      var active = c === _internCat ? "background:#10b981;color:#fff;" : "background:#f0f3f7;color:#555;";
      return '<div onclick="selectInternCat(\'' + c + '\')" style="flex-shrink:0;padding:6px 14px;border-radius:16px;font-size:12px;cursor:pointer;' + active + 'transition:all .2s;">' + c + '</div>';
    }).join("");
  }

  function selectInternCat(cat) {
    _internCat = cat;
    renderInternCats();
    applyInternFilter();
  }

  function renderInternList(list) {
    var box = document.getElementById("intern-list");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="empty-state"><div class="e-icon">🔍</div>没有匹配的实习岗位<br><span style="font-size:12px;color:#999;">试试换个关键词或类别</span></div>';
      return;
    }
    box.innerHTML = list.map(jobCard).join("");
  }

  function applyInternFilter() {
    var list = applyCityToJobs(_allInterns);
    if (_internCat && _internCat !== "全部") {
      list = list.filter(function (j) { return j.category === _internCat; });
    }
    var is = document.getElementById("internSearch");
    if (is) {
      var q = is.value.trim().toLowerCase();
      if (q) {
        list = list.filter(function (j) {
          return (j.title || "").toLowerCase().indexOf(q) > -1
              || (j.company || "").toLowerCase().indexOf(q) > -1
              || (j.category || "").toLowerCase().indexOf(q) > -1
              || (j.city || "").toLowerCase().indexOf(q) > -1
              || JSON.stringify(j.skills || []).toLowerCase().indexOf(q) > -1;
        });
      }
    }
    renderInternList(list);
  }

  function closeInternMatchPanel() {
    var panel = document.getElementById("intern-match-panel");
    if (panel) panel.style.display = "none";
  }

  async function matchInternJob(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    await loadResumes();
    if (!_allResumes.length) { alert("请先上传简历"); switchTab("resume"); return; }
    var job = _allInterns.find(function (j) { return j.id === jobId; });
    if (!job) job = _allJobs.find(function (j) { return j.id === jobId; });
    if (!job) return;
    var panel = document.getElementById("intern-match-panel");
    var body = document.getElementById("intern-match-body");
    panel.style.display = "flex";
    body.scrollTop = 0;
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><div style="font-size:28px;">🎯</div><div style="margin-top:8px;">AI 正在对比简历与实习要求...</div><div style="margin-top:4px;font-size:12px;color:#aaa;">通常需要 10-20 秒</div></div>';
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
      body.innerHTML = '<div style="color:#c0392b;padding:20px;text-align:center;">❌ 匹配失败: ' + (e.message || e) + '</div>';
    }
  }

  async function loadResumes() {
    if (!getToken()) { _allResumes = []; return; }
    try {
      var r = await fetch(API + "/api/resumes", { headers: authHeaders() });
      var data = await r.json();
      _allResumes = toList(data);
    } catch (e) { _allResumes = []; }
    var box = document.getElementById("resume-list");
    if (!box) return;
    if (!_allResumes.length) {
      box.innerHTML = '<div class="empty-state"><div class="e-icon">📄</div>暂无简历</div>';
      return;
    }
    box.innerHTML = _allResumes.map(function (res) {
      var hasSource = !!res.source_file;
      var editBtn;
      if (hasSource) {
        editBtn = '<button class="btn-mini btn-primary-mini" onclick="openSourceFile(' + res.id + ')">📂 打开原文件</button>' +
                  '<button class="btn-mini" onclick="openEditor(' + res.id + ')">✏️ 网页编辑</button>';
      } else {
        editBtn = '<button class="btn-mini btn-primary-mini" onclick="openEditor(' + res.id + ')">✏️ 编辑</button>';
      }
      return '<div class="card" style="margin-bottom:10px;">' +
        '<div style="font-weight:600;color:#2a2140;margin-bottom:4px;">' + (res.title || "") + '</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:8px;">更新时间: ' + (res.updated_at || res.created_at || "") + (hasSource ? ' <span style="color:#27ae60;">· 已上传源文件</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          editBtn +
          '<button class="btn-mini" onclick="diagnoseResume(' + res.id + ')">🩺 AI 诊断</button>' +
          '<button class="btn-mini" onclick="deleteResume(' + res.id + ')" style="color:#c0392b;">🗑 删除</button>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function setUploadStatus(msg, type) {
    var el = document.getElementById("resume-upload-status");
    if (!msg) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.style.background = type === "error" ? "#fff0f0" : (type === "success" ? "#f0fff4" : "#efeafc");
    el.style.color = type === "error" ? "#c0392b" : (type === "success" ? "#1a7f37" : "#2a2140");
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
    if (items.length === 0) { box.innerHTML = '<div style="text-align:center;color:#aaa;padding:8px;font-size:12px;">暂无，点击上方 + 添加</div>'; return; }
    var html = items.map(function (item, idx) {
      if (type === "education") {
        return '<div data-entry-type="education" style="border:1px solid #eee;border-radius:6px;padding:10px;margin-bottom:8px;background:#fafbfc;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><b style="font-size:13px;color:#2a2140;">教育 #' + (idx + 1) + '</b><button class="btn-mini" style="color:#c0392b;font-size:11px;" onclick="removeEntry(\'education\',' + idx + ')">删除</button></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
            '<input data-f="school" placeholder="学校" value="' + (item.school || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="major" placeholder="专业" value="' + (item.major || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="degree" placeholder="学历(本科/硕士)" value="' + (item.degree || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="start_date" placeholder="开始 2022-09" value="' + (item.start_date || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="end_date" placeholder="结束 2026-06" value="' + (item.end_date || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '</div>' +
          '<textarea data-f="description" rows="2" placeholder="GPA、奖项、相关课程..." style="margin-top:6px;width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;box-sizing:border-box;resize:vertical;">' + (item.description || "") + '</textarea>' +
        '</div>';
      }
      if (type === "experience") {
        return '<div data-entry-type="experience" style="border:1px solid #eee;border-radius:6px;padding:10px;margin-bottom:8px;background:#fafbfc;">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><b style="font-size:13px;color:#2a2140;">经历 #' + (idx + 1) + '</b><button class="btn-mini" style="color:#c0392b;font-size:11px;" onclick="removeEntry(\'experience\',' + idx + ')">删除</button></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">' +
            '<input data-f="company" placeholder="公司/项目" value="' + (item.company || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="position" placeholder="职位/角色" value="' + (item.position || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="start_date" placeholder="开始" value="' + (item.start_date || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
            '<input data-f="end_date" placeholder="结束" value="' + (item.end_date || "") + '" style="padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '</div>' +
          '<textarea data-f="description" rows="2" placeholder="做了什么、用了什么技术、取得了什么成果..." style="margin-top:6px;width:100%;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;box-sizing:border-box;resize:vertical;">' + (item.description || "") + '</textarea>' +
        '</div>';
      }
      if (type === "skills") {
        return '<div data-entry-type="skills" style="border:1px solid #eee;border-radius:6px;padding:10px;margin-bottom:8px;background:#fafbfc;display:flex;align-items:center;gap:8px;">' +
          '<b style="font-size:13px;color:#2a2140;margin-right:4px;">技能 #' + (idx + 1) + '</b>' +
          '<input data-f="name" placeholder="技能名(如 Python)" value="' + (item.name || "") + '" style="flex:2;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '<input data-f="level" placeholder="熟练度(如 熟练/精通)" value="' + (item.level || "") + '" style="flex:1;padding:5px 8px;border:1px solid #ddd;border-radius:4px;font-size:12px;">' +
          '<button class="btn-mini" style="color:#c0392b;font-size:11px;" onclick="removeEntry(\'skills\',' + idx + ')">删除</button>' +
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
    if (!(await askConfirm("确定删除这份简历吗？"))) return;
    var token = getToken();
    if (!token) return;
    try {
      var r = await fetch(API + "/api/resumes/" + id, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) { var d = await r.json(); alert("删除失败: " + (d.detail || "")); return; }
      setUploadStatus("✅ 已删除", "success");
      loadResumes();
    } catch (e) { alert("删除出错: " + e.message); }
  }

  async function loadRecommend() {
    var box = document.getElementById("recommend-list");
    if (!box) return;
    var cityHint = (_selectedCity && _selectedCity !== "全国") ? "「" + _selectedCity + "」及全国" : "全国各地";
    box.innerHTML = '<div style="text-align:center;color:#7b5cc7;padding:20px;">🤖 AI 正在读取你的简历，从' + cityHint + '联网搜索并智能匹配最新岗位…</div>';
    try {
      if (!_allResumes.length) {
        try { await loadResumes(); } catch (e) {}
      }
      var url = API + "/api/jobs/ai-recommend";
      var sep = "?";
      if (_allResumes.length) {
        url += "?resume_id=" + _allResumes[0].id;
        sep = "&";
      }
      if (_selectedCity && _selectedCity !== "全国") {
        url += sep + "city=" + encodeURIComponent(_selectedCity);
      }
      var r = await fetch(url, { headers: authHeaders() });
      if (!r.ok) {
        box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">' + (r.status === 401 ? '请先登录' : '请先上传简历') + '</div>';
        return;
      }
      var data = await r.json();
      var list = toList(data);
      box.innerHTML = list.map(jobCard).join("") || '<div style="text-align:center;color:#aaa;padding:20px;">暂无推荐，请先上传简历</div>';
    } catch (e) {
      box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">加载失败，请先登录并上传简历</div>';
    }
  }

  async function loadCollected() {
    var box = document.getElementById("collected-list");
    if (!box) return;
    if (!getToken()) { box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">请先登录</div>'; return; }
    try {
      var r = await fetch(API + "/api/jobs/me/collected", { headers: authHeaders() });
      var data = await r.json();
      var list = toList(data);
      box.innerHTML = list.map(jobCard).join("") || '<div style="text-align:center;color:#aaa;padding:20px;">还没有收藏</div>';
    } catch (e) { box.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">加载失败</div>'; }
  }

  var _myApplies = [];

  async function loadApplies() {
    var box = document.getElementById("applies-list");
    if (!box) return;
    if (!getToken()) { box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">请先登录</div>'; return; }
    try {
      var r = await fetch(API + "/api/applies", { headers: authHeaders() });
      var data = await r.json();
      var list = toList(data);
      _myApplies = list;
      if (!list.length) {
        box.innerHTML = '<div style="text-align:center;color:#aaa;padding:20px;">暂无投递记录，去首页浏览岗位投递吧 📨</div>';
        return;
      }
      box.innerHTML = list.map(function (a) {
        var statusMap = { pending: "⏳ 待处理", reviewing: "👀 查看中", interview: "💬 面试中", offer: "🎉 已录用", rejected: "❌ 被拒" };
        var statusLabel = statusMap[a.status] || a.status || "⏳ 待处理";
        return '<div class="card" style="margin-bottom:12px;padding:14px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:700;color:#2a2140;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (a.job_title || "") + '</div>' +
              '<div style="font-size:12px;color:#7b5cc7;margin-top:3px;">🏢 ' + (a.company || "") + '</div>' +
            '</div>' +
            '<span style="background:#e8f3ff;color:#7b5cc7;font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600;white-space:nowrap;">' + statusLabel + '</span>' +
          '</div>' +
          '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
            '<button class="btn-mini btn-primary-mini" onclick="startAIInterview(' + a.job_id + ')" style="flex:1;min-width:120px;">🎯 模拟面试</button>' +
            '<button class="btn-mini" onclick="switchTab(\'position\')" style="flex:1;min-width:80px;">查看岗位</button>' +
          '</div>' +
        '</div>';
      }).join("");
    } catch (e) { box.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">加载失败</div>'; }
  }

  function renderAuthBox(box) {
    box.innerHTML = (
      '<div style="margin:20px 0;">' +
        '<div style="text-align:center;margin-bottom:20px;">' +
          '<div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#7b5cc7,#5a3fa0);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;">👤</div>' +
          '<div style="font-weight:600;font-size:16px;color:#2a2140;">欢迎使用</div>' +
          '<div style="font-size:12px;color:#999;">登录后解锁全部功能</div>' +
        '</div>' +
        '<div style="display:flex;background:#f5f7fa;border-radius:10px;padding:4px;margin-bottom:10px;">' +
          '<div id="tab-login" onclick="authSwitch(\'login\')" style="flex:1;text-align:center;padding:8px;border-radius:8px;background:#fff;color:#2a2140;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.08);">登录</div>' +
          '<div id="tab-register" onclick="authSwitch(\'register\')" style="flex:1;text-align:center;padding:8px;border-radius:8px;color:#999;font-size:13px;cursor:pointer;">注册</div>' +
        '</div>' +
        '<form id="auth-form" onsubmit="return authSubmit(event,\'login\');">' +
          '<input type="text" id="a-username" required placeholder="用户名" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
          '<input type="password" id="a-password" required placeholder="密码（至少6位）" minlength="6" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
          '<div id="register-fields" style="display:none;">' +
            '<input type="text" id="a-realname" placeholder="真实姓名（选填）" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
            '<input type="text" id="a-school" placeholder="学校（选填）" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
            '<input type="text" id="a-major" placeholder="专业（选填）" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
            '<select id="a-education" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;background:#fff;">' +
              '<option value="">学历（选填）</option><option>大专</option><option>本科</option><option>硕士</option><option>博士</option>' +
            '</select>' +
            '<input type="number" id="a-graduate-year" placeholder="毕业年份（如 2026，选填）" min="2020" max="2035" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:10px;font-size:14px;">' +
          '</div>' +
          '<button type="submit" style="width:100%;padding:12px;background:linear-gradient(90deg,#7b5cc7,#5a3fa0);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;margin-top:6px;">立即登录</button>' +
        '</form>' +
        '<div style="text-align:center;margin-top:10px;font-size:12px;">' +
          '<a href="/login?role=admin" style="color:#7b5cc7;text-decoration:none;font-weight:500;">🛡️ 管理员入口 →</a>' +
        '</div>' +
        '<div style="text-align:center;margin-top:8px;font-size:12px;color:#aaa;">' +
          '登录即表示同意 <a href="#" style="color:#7b5cc7;text-decoration:none;">服务协议</a>' +
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

    box.innerHTML = '<div style="text-align:center;color:#7b5cc7;padding:20px;">🤖 AI 正在分析你的简历能力画像…</div>';
    try {
      if (!_allResumes.length) { try { await loadResumes(); } catch (e) {} }
      var url = API + "/api/auth/me";
      var r1 = await fetch(url, { headers: authHeaders() });
      var data = r1.ok ? await r1.json() : {};
      var resumeId = _allResumes.length ? _allResumes[0].id : 0;

      var header = '<div class="card" style="margin-bottom:14px;">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
        '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#7b5cc7,#5a3fa0);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:bold;">' + (me.username || "U").charAt(0).toUpperCase() + '</div>' +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;font-size:17px;color:#2a2140;">' + (data.username || me.username || "用户") + '</div>' +
        '<div style="font-size:12px;color:#888;margin-top:2px;">角色: ' + (data.role || me.role || "") + '</div>' +
        '<div style="font-size:12px;color:#888;margin-top:1px;">AI 剩余次数: ' + (data.ai_quota ?? "—") + '</div>' +
        '</div></div></div>';

      var chartHtml = '<div class="card" style="padding:16px;">' +
        '<div style="font-weight:600;color:#2a2140;margin-bottom:10px;">🎯 我的能力画像</div>' +
        '<div style="position:relative;height:340px;"><canvas id="skill-radar"></canvas></div>' +
        '<div id="skill-summary" style="margin-top:10px;font-size:13px;color:#555;text-align:center;"></div>' +
        '<div id="skill-analysis" style="margin-top:16px;padding:0;"></div>' +
        '<div style="text-align:center;margin-top:10px;"><button class="btn-mini" onclick="refreshSkills()" id="refresh-skills-btn">🔄 重新分析</button></div>' +
        '</div>';

      box.innerHTML = header + chartHtml +
        '<div id="review-card" class="card" style="margin-top:14px;padding:16px;">' +
        '<div style="font-weight:600;color:#2a2140;margin-bottom:12px;">💬 点赞 / 点踩 / 点评</div>' +
        '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
        '<select id="rv_type" style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">' +
        '<option value="enterprise">🏢 点评企业</option>' +
        '<option value="job">💼 点评岗位</option>' +
        '</select>' +
        '<select id="rv_target" style="flex:2;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">' +
        '<option value="">加载中...</option></select>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:10px;">' +
        '<button id="rv_like" class="rv-rating" data-v="1" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;font-size:18px;">👍 点赞</button>' +
        '<button id="rv_dislike" class="rv-rating" data-v="-1" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#fff;border-radius:8px;cursor:pointer;font-size:18px;">👎 点踩</button>' +
        '<button id="rv_neutral" class="rv-rating" data-v="0" style="flex:1;padding:10px;border:2px solid #7b5cc7;background:#f0eafc;border-radius:8px;cursor:pointer;font-size:18px;">💬 仅点评</button>' +
        '</div>' +
        '<textarea id="rv_content" rows="2" placeholder="写下你的评价（选填，可只点赞）..." style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:none;box-sizing:border-box;"></textarea>' +
        '<div style="display:flex;gap:8px;margin-top:10px;">' +
        '<button class="btn-primary btn-sm" onclick="submitReview()" style="flex:1;">提交点评</button>' +
        '</div>' +
        '<div style="border-top:1px solid #f1f5f9;margin-top:16px;padding-top:12px;">' +
        '<div style="font-weight:600;color:#2a2140;margin-bottom:10px;font-size:14px;">📋 我的点评历史</div>' +
        '<div id="my-review-list" style="min-height:60px;color:#94a3b8;font-size:13px;text-align:center;padding:10px;">加载中...</div>' +
        '</div>' +
        '</div>' +
        '<div style="margin-top:14px;"><button class="btn-mini" onclick="logout()">退出登录</button></div>';

      loadMyReviews();

      if (resumeId) {
        try {
          var r2 = await fetch(API + "/api/resumes/" + resumeId + "/skills", { headers: authHeaders() });
          if (r2.ok) {
            var _raw = await r2.json();
            var sk = _raw.data || _raw;
            drawSkillRadar(sk);
          } else {
            document.getElementById("skill-summary").textContent = "AI 分析失败，请稍后重试";
          }
        } catch (e) {
          document.getElementById("skill-summary").textContent = "AI 分析异常";
        }
      } else {
        document.getElementById("skill-summary").textContent = "请先上传简历以生成能力画像";
      }
    } catch (e) {
      box.innerHTML = '<div class="card"><div style="font-weight:600;">' + (me.username || "用户") + '</div>' +
        '<div style="color:#888;font-size:12px;margin-top:4px;">登录状态正常，AI 能力画像需联网加载</div>' +
        '<div style="margin-top:12px;"><button class="btn-mini" onclick="logout()">退出登录</button></div></div>';
    }
  }

  var _rvRating = 0;
  var _rvTargets = { enterprises: [], jobs: [] };

  async function loadMyReviews() {
    try {
      var rt = document.getElementById("rv_type");
      var rs = document.getElementById("rv_target");
      if (!rt || !rs) return;

      var tg = await fetch(API + "/api/reviews/targets");
      var tgData = await tg.json();
      _rvTargets = tgData.data || tgData;

      refreshRvOptions();

      rt.onchange = refreshRvOptions;

      document.querySelectorAll(".rv-rating").forEach(function (btn) {
        btn.onclick = function () {
          _rvRating = parseInt(this.dataset.v);
          document.querySelectorAll(".rv-rating").forEach(function (b) {
            b.style.border = "2px solid #e2e8f0";
            b.style.background = "#fff";
            b.style.color = "#334155";
          });
          this.style.border = "2px solid #7b5cc7";
          this.style.background = "#f0eafc";
          this.style.color = "#7b5cc7";
        };
      });

      var ml = document.getElementById("my-review-list");
      var mr = await fetch(API + "/api/reviews/mine", { headers: authHeaders() });
      var mrData = await mr.json();
      var reviews = (mrData.data && mrData.data.items) || [];

      if (!reviews.length) {
        ml.innerHTML = '<div style="padding:16px;">暂无点评，快为喜欢的企业或岗位留下第一条评价吧 ✨</div>';
      } else {
        var html = "";
        reviews.forEach(function (r) {
          var icon = r.rating === 1 ? "👍" : r.rating === -1 ? "👎" : "💬";
          var color = r.rating === 1 ? "#10b981" : r.rating === -1 ? "#ef4444" : "#7b5cc7";
          var typeLabel = r.target_type === "enterprise" ? "🏢 企业" : "💼 岗位";
          var ratingLabel = r.rating === 1 ? "点赞" : r.rating === -1 ? "点踩" : "仅点评";
          var time = r.created_at ? r.created_at.replace("T", " ").slice(0, 16) : "";
          html += '<div style="border:1px solid #f1f5f9;border-radius:10px;padding:12px;margin-bottom:10px;background:#fafbff;">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<span style="font-size:20px;">' + icon + '</span>' +
            '<span style="font-weight:600;color:#2a2140;">' + (r.target_name || "目标#" + r.target_id) + '</span>' +
            '<span style="font-size:11px;padding:2px 8px;background:' + color + '1a;color:' + color + ';border-radius:10px;">' + typeLabel + ' · ' + ratingLabel + '</span>' +
            '<span style="margin-left:auto;font-size:11px;color:#94a3b8;">' + time + '</span>' +
            '</div>' +
            (r.content ? '<div style="color:#475569;font-size:13px;line-height:1.6;padding:8px;background:#fff;border-radius:6px;margin-bottom:8px;">' + escapeHtml(r.content) + '</div>' : '') +
            '<button class="btn-mini" onclick="deleteReview(' + r.id + ')" style="color:#ef4444;font-size:12px;">🗑 删除</button>' +
            '</div>';
        });
        ml.innerHTML = html;
      }
    } catch (e) {
      var ml2 = document.getElementById("my-review-list");
      if (ml2) ml2.innerHTML = '<div style="color:#ef4444;">加载失败，请稍后重试</div>';
    }
  }

  function refreshRvOptions() {
    var rt = document.getElementById("rv_type");
    var rs = document.getElementById("rv_target");
    if (!rt || !rs) return;
    var type = rt.value;
    var items = type === "enterprise" ? (_rvTargets.enterprises || []) : (_rvTargets.jobs || []);
    var label = type === "enterprise" ? "企业" : "岗位";
    if (!items.length) {
      rs.innerHTML = '<option value="">暂无' + label + '可选</option>';
      return;
    }
    var html = '<option value="">请选择' + label + '...</option>';
    items.forEach(function (it) {
      var val = it.id;
      var txt = type === "enterprise"
        ? it.name + (it.industry ? " · " + it.industry : "")
        : it.title + (it.company ? " · " + it.company : "") + (it.city ? " · " + it.city : "");
      html += '<option value="' + val + '">' + txt + '</option>';
    });
    rs.innerHTML = html;
  }

  window.submitReview = async function () {
    var rt = document.getElementById("rv_type");
    var rs = document.getElementById("rv_target");
    var content = document.getElementById("rv_content");
    if (!rt || !rs) return;
    var type = rt.value;
    var targetId = rs.value;
    var c = content.value.trim();
    if (!targetId) { alert("请先选择要点评的" + (type === "enterprise" ? "企业" : "岗位")); return; }
    if (_rvRating === 0 && !c) { alert("请至少选择点赞/点踩，或填写点评内容"); return; }

    try {
      var url = API + "/api/reviews?target_type=" + type + "&target_id=" + targetId + "&rating=" + _rvRating;
      if (c) url += "&content=" + encodeURIComponent(c);
      var r = await fetch(url, { method: "POST", headers: authHeaders() });
      if (r.ok) {
        content.value = "";
        alert("点评提交成功 ✅");
        loadMyReviews();
      } else {
        var err = await r.json().catch(function () { return { detail: "提交失败" }; });
        alert("提交失败：" + (err.detail || err.message || "未知错误"));
      }
    } catch (e) {
      alert("网络错误：" + e.message);
    }
  };

  window.deleteReview = async function (id) {
    if (!(await askConfirm("确定删除这条点评吗？"))) return;
    try {
      var r = await fetch(API + "/api/reviews/" + id, { method: "DELETE", headers: authHeaders() });
      if (r.ok) {
        alert("已删除");
        loadMyReviews();
      } else {
        alert("删除失败");
      }
    } catch (e) {
      alert("网络错误");
    }
  };

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
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
          backgroundColor: "rgba(123,92,199, 0.25)",
          borderColor: "rgba(123,92,199, 0.9)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(123,92,199, 0.9)",
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
            pointLabels: { font: { size: 13, weight: "bold", color: "#2a2140" } },
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
    var levelColor = level === "准高级" ? "#e67e22" : level === "中级" ? "#27ae60" : level === "初级" ? "#7b5cc7" : "#888";

    var parts = [];
    if (level || avg) {
      parts.push('<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
        (level ? '<span style="background:' + levelColor + ';color:#fff;padding:3px 12px;border-radius:12px;font-weight:700;font-size:13px;">' + level + '</span>' : '') +
        (avg ? '<span style="font-size:13px;color:#555;">综合均分 <b style="color:#7b5cc7;font-size:15px;">' + avg + '</b> / 100</span>' : '') +
        '</div>');
    }
    if (strengths && strengths.length) {
      parts.push('<div style="margin-bottom:12px;">' +
        '<div style="font-weight:600;color:#1e8449;margin-bottom:6px;font-size:13px;">✨ 你的优势</div>' +
        '<ul style="margin:0;padding-left:18px;color:#333;font-size:13px;line-height:1.9;">' +
        strengths.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        '</ul></div>');
    }
    if (improvements && improvements.length) {
      parts.push('<div style="margin-bottom:12px;">' +
        '<div style="font-weight:600;color:#d35400;margin-bottom:6px;font-size:13px;">⚠️ 待提升方向</div>' +
        '<ul style="margin:0;padding-left:18px;color:#333;font-size:13px;line-height:1.9;">' +
        improvements.map(function (s) { return "<li>" + s + "</li>"; }).join("") +
        '</ul></div>');
    }
    if (advice) {
      parts.push('<div style="margin-top:6px;background:#f0f6ff;border-left:3px solid #7b5cc7;padding:10px 14px;border-radius:0 8px 8px 0;">' +
        '<div style="font-weight:600;color:#7b5cc7;margin-bottom:4px;font-size:13px;">💡 AI 职业建议</div>' +
        '<div style="color:#333;font-size:13px;line-height:1.8;">' + advice + '</div></div>');
    }
    box.innerHTML = parts.join("");
  }

  async function refreshSkills() {
    if (!getToken()) return;
    if (!_allResumes.length) { try { await loadResumes(); } catch (e) {} }
    var btn = document.getElementById("refresh-skills-btn");
    if (btn) { btn.disabled = true; btn.textContent = "分析中..."; }
    var resumeId = _allResumes.length ? _allResumes[0].id : 0;
    if (!resumeId) { alert("请先上传简历"); if (btn) { btn.disabled = false; btn.textContent = "🔄 重新分析"; } return; }
    try {
      var r = await fetch(API + "/api/resumes/" + resumeId + "/skills", { headers: authHeaders() });
      if (r.ok) {
        var _raw = await r.json();
        var sk = _raw.data || _raw;
        if (_meChart) { try { _meChart.destroy(); } catch (e) {} _meChart = null; }
        drawSkillRadar(sk);
      } else {
        var err = await r.json().catch(function () { return { detail: "HTTP " + r.status }; });
        alert("AI 分析失败：" + (err.detail || "请稍后重试"));
      }
    } catch (e) {
      alert("请求失败：" + (e && e.message ? e.message : "网络连接异常，请检查网络后重试"));
    }
    finally { if (btn) { btn.disabled = false; btn.textContent = "🔄 重新分析"; } }
  }

  /* ========= 动作 ========= */
  async function toggleCollect(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    try {
      var r = await fetch(API + "/api/jobs/" + jobId + "/collect", { method: "POST", headers: authHeaders() });
      var d = await r.json();
      alert((d && d.message) || "操作成功");
    } catch (e) { alert("操作失败"); }
  }

  async function matchJob(jobId) {
    if (!getToken()) { alert("请先登录"); return; }
    await loadResumes();
    if (!_allResumes.length) { alert("请先上传简历"); switchTab("resume"); return; }
    var job = _allJobs.find(function (j) { return j.id === jobId; });
    if (!job) job = _allInterns.find(function (j) { return j.id === jobId; });
    if (!job) return;
    var isIntern = job.job_type === "实习";
    var panel = document.getElementById(isIntern ? "intern-match-panel" : "match-panel");
    var body = document.getElementById(isIntern ? "intern-match-body" : "match-body");
    panel.style.display = "flex";
    body.scrollTop = 0;
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><div style="font-size:28px;">🎯</div><div style="margin-top:8px;">AI 正在对比简历与岗位要求...</div><div style="margin-top:4px;font-size:12px;color:#aaa;">通常需要 10-20 秒</div></div>';
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
      body.innerHTML = '<div style="color:#c0392b;padding:20px;text-align:center;">❌ 匹配失败: ' + (e.message || e) + '</div>';
    }
  }

  function closeMatchPanel() {
    document.getElementById("match-panel").style.display = "none";
  }

  // ============ AI 定制求职信 ============
  var _coverLetterText = "";

  function _makeModalDraggable(card, handle) {
    var dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
    handle.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".modal-close")) return;
      dragging = true;
      var rect = card.getBoundingClientRect();
      card.style.position = "fixed";
      card.style.left = rect.left + "px";
      card.style.top = rect.top + "px";
      card.style.margin = "0";
      startX = e.clientX; startY = e.clientY; origX = rect.left; origY = rect.top;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      card.style.left = (origX + e.clientX - startX) + "px";
      card.style.top = (origY + e.clientY - startY) + "px";
    });
    handle.addEventListener("pointerup", function () { dragging = false; });
    handle.addEventListener("pointercancel", function () { dragging = false; });
  }

  window.runCoverLetter = async function () {
    if (!getToken()) { showToast("请先登录学生账号", "err"); return; }
    await loadResumes();
    if (!_allResumes.length) { showToast("还没有简历，请先上传", "err"); switchTab("resume"); return; }
    if (!_allJobs.length) { try { await loadHome(); } catch (e) {} }
    var jobs = _allJobs.slice(0, 60);
    if (!jobs.length) { showToast("岗位列表为空，请稍后再试", "err"); return; }
    var opts = jobs.map(function (j) {
      return '<option value="' + j.id + '">' + escapeHtml(j.title + " · " + (j.company || "未知企业")) + "</option>";
    }).join("");
    var mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.style.display = "flex";
    mask.innerHTML =
      '<div class="modal-card" style="width:min(92vw,440px);">' +
        '<div class="modal-header">' +
          '<div class="modal-title">💌 选择目标岗位</div>' +
          '<div class="modal-close">×</div>' +
        "</div>" +
        '<div class="modal-body">' +
          '<select id="cl-job-select" style="width:100%;padding:10px 12px;border:2px solid #1f1b2e;border-radius:10px;font-size:14px;background:#fff;color:#1f1b2e;">' + opts + "</select>" +
          '<div style="margin-top:10px;font-size:12px;color:#888;">将结合你最新的简历《' + escapeHtml(_allResumes[0].title || "未命名") + "》，AI 生成定制求职信（消耗 1 次 AI 配额）</div>" +
          '<div style="margin-top:16px;text-align:right;"><button class="btn-mini btn-primary-mini" id="cl-go">✨ 生成求职信</button></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(mask);
    function close() { mask.remove(); }
    mask.onclick = function (e) { if (e.target === mask) close(); };
    mask.querySelector(".modal-close").onclick = close;
    mask.querySelector("#cl-go").onclick = function () {
      var jobId = parseInt(mask.querySelector("#cl-job-select").value, 10);
      var job = jobs.find(function (j) { return j.id === jobId; });
      close();
      if (job) _openCoverLetterModal(_allResumes[0].id, job);
    };
  };

  function _openCoverLetterModal(resumeId, job) {
    _coverLetterText = "";
    var mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.style.display = "flex";
    mask.innerHTML =
      '<div class="modal-card" style="width:min(94vw,580px);max-height:82vh;display:flex;flex-direction:column;overflow:hidden;">' +
        '<div class="modal-header" id="cl-handle" style="cursor:move;user-select:none;">' +
          '<div class="modal-title">💌 AI 定制求职信</div>' +
          '<div class="modal-close">×</div>' +
        "</div>" +
        '<div class="modal-body" id="cl-body" style="overflow-y:auto;flex:1;"></div>' +
      "</div>";
    document.body.appendChild(mask);
    function close() { mask.remove(); }
    mask.onclick = function (e) { if (e.target === mask) close(); };
    mask.querySelector(".modal-close").onclick = close;
    _makeModalDraggable(mask.querySelector(".modal-card"), mask.querySelector("#cl-handle"));
    _genCoverLetter(resumeId, job, mask.querySelector("#cl-body"));
  }

  function _coverLetterLoadingHtml(job) {
    return '<div style="text-align:center;padding:40px 0;color:#888;">' +
      '<div style="font-size:28px;">💌</div>' +
      '<div style="margin-top:8px;">AI 正在结合你的真实经历撰写求职信...</div>' +
      '<div style="margin-top:4px;font-size:12px;color:#aaa;">目标岗位：' + escapeHtml((job.title || "") + " · " + (job.company || "")) + " · 通常需要 10-20 秒</div>" +
    "</div>";
  }

  async function _genCoverLetter(resumeId, job, body) {
    body.innerHTML = _coverLetterLoadingHtml(job);
    try {
      var r = await fetch(API + "/api/resumes/" + resumeId + "/cover-letter?job_id=" + job.id, {
        method: "POST", headers: { "Authorization": "Bearer " + getToken() }
      });
      var data;
      try { data = await r.json(); } catch (_) { data = {}; }
      if (!r.ok) {
        var msg = data.detail;
        if (typeof msg === "object" && msg !== null) msg = msg.msg || msg.message || JSON.stringify(msg);
        throw new Error(msg || ("HTTP " + r.status));
      }
      var d = data.data || data;
      var letter = (d.letter || "").trim();
      var highlights = Array.isArray(d.highlights) ? d.highlights : [];
      if (!letter) throw new Error("AI 未返回有效内容");
      _coverLetterText = letter;
      var tags = highlights.map(function (h) {
        return '<span style="display:inline-block;padding:3px 10px;margin:0 6px 6px 0;background:#f6d34d;border:2px solid #1f1b2e;border-radius:999px;font-size:12px;font-weight:600;color:#1f1b2e;box-shadow:2px 2px 0 #1f1b2e;">' + escapeHtml(h) + "</span>";
      }).join("");
      var paras = letter.split(/\n+/).filter(Boolean).map(function (p) {
        return '<p style="margin:0 0 12px;font-size:14px;line-height:1.9;color:#33294d;text-indent:2em;">' + escapeHtml(p) + "</p>";
      }).join("");
      body.innerHTML =
        (tags ? '<div style="margin-bottom:14px;">' + tags + "</div>" : "") +
        '<div style="background:#efeafc;border:2px solid #1f1b2e;border-radius:12px;padding:16px 18px;box-shadow:3px 3px 0 #1f1b2e;">' + paras + "</div>" +
        '<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">' +
          '<button class="btn-mini" id="cl-again">🔄 重新生成</button>' +
          '<button class="btn-mini btn-primary-mini" id="cl-copy">📋 复制全文</button>' +
        "</div>";
      body.querySelector("#cl-copy").onclick = function () { window.copyLetter(this); };
      body.querySelector("#cl-again").onclick = function () { _genCoverLetter(resumeId, job, body); };
      if (window.renderAIFeedbackWidget) {
        var fb = renderAIFeedbackWidget("cover_letter", job.id);
        if (fb) body.insertAdjacentHTML("beforeend", fb);
      }
    } catch (e) {
      body.innerHTML = '<div style="color:#c0392b;padding:24px;text-align:center;">❌ 生成失败：' + escapeHtml(String(e.message || e)) + "</div>";
    }
  }

  window.copyLetter = function (btn) {
    if (!_coverLetterText) { showToast("没有可复制的内容", "err"); return; }
    function done() {
      showToast("求职信已复制，可直接粘贴投递", "ok");
      if (btn) { btn.textContent = "✅ 已复制"; setTimeout(function () { btn.textContent = "📋 复制全文"; }, 2000); }
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = _coverLetterText;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { showToast("复制失败，请手动选择文本复制", "err"); }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(_coverLetterText).then(done).catch(fallback);
    } else { fallback(); }
  };

  // ============ AI 反馈（点赞/点踩/评论）通用函数 ============
  var _aiFeedbackFired = {}; // 防止同一 target 重复提交

  function renderAIFeedbackWidget(targetType, targetId) {
    if (!targetId) return "";
    var key = targetType + ":" + targetId;
    if (_aiFeedbackFired[key]) {
      return '<div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;color:#166534;font-size:13px;text-align:center;">✅ 感谢反馈！你的评价对我们持续改进 AI 能力很有帮助</div>';
    }
    var typeLabelMap = {
      resume_diagnose: "简历诊断", resume_polish: "简历润色",
      job_match: "岗位匹配", interview: "AI 面试",
      exam: "AI 笔试", mock_test: "模拟题"
    };
    var typeLabel = typeLabelMap[targetType] || "AI 功能";
    var wid = "ai-fb-" + targetType + "-" + targetId;
    return '<div style="margin-top:20px;padding:16px;background:linear-gradient(135deg,#efeafc,#f0eafc);border:1px solid #e7def7;border-radius:12px;">' +
      '<div style="font-weight:600;color:#2a2140;margin-bottom:12px;font-size:14px;">💬 对本次「' + typeLabel + '」结果打个分吧</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
        '<button type="button" class="ai-fb-like" data-v="like" id="' + wid + '-like" onclick="window._aiFbVote(this,\'like\')" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s;">👍 喜欢</button>' +
        '<button type="button" class="ai-fb-dislike" data-v="dislike" id="' + wid + '-dislike" onclick="window._aiFbVote(this,\'dislike\')" style="flex:1;padding:10px;border:2px solid #e2e8f0;background:#fff;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s;">👎 点踩</button>' +
      '</div>' +
      '<textarea id="' + wid + '-cmt" rows="2" placeholder="选填：说说你的感受或建议..." style="width:100%;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:none;box-sizing:border-box;font-family:inherit;"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:10px;">' +
        '<button type="button" id="' + wid + '-submit" onclick="window._submitAIFeedback(\'' + targetType + '\',' + targetId + ')" style="padding:8px 20px;background:linear-gradient(135deg,#7b5cc7,#5a3fa0);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;">提交反馈</button>' +
      '</div>' +
      '<input type="hidden" id="' + wid + '-vote" value="">' +
    '</div>';
  }

  window._aiFbVote = function (btn, vote) {
    var parent = btn.parentElement;
    var likeBtn = parent.querySelector(".ai-fb-like");
    var dislikeBtn = parent.querySelector(".ai-fb-dislike");
    var wrapper = parent.parentElement;
    var hidden = wrapper.querySelector('input[type="hidden"]');
    hidden.value = vote;
    if (vote === "like") {
      likeBtn.style.borderColor = "#22c55e"; likeBtn.style.background = "#f0fdf4"; likeBtn.style.color = "#16a34a";
      dislikeBtn.style.borderColor = "#e2e8f0"; dislikeBtn.style.background = "#fff"; dislikeBtn.style.color = "#333";
    } else {
      dislikeBtn.style.borderColor = "#ef4444"; dislikeBtn.style.background = "#fef2f2"; dislikeBtn.style.color = "#dc2626";
      likeBtn.style.borderColor = "#e2e8f0"; likeBtn.style.background = "#fff"; likeBtn.style.color = "#333";
    }
  };

  window._submitAIFeedback = function (targetType, targetId) {
    var key = targetType + ":" + targetId;
    if (_aiFeedbackFired[key]) { alert("已提交过反馈，感谢！"); return; }
    var wid = "ai-fb-" + targetType + "-" + targetId;
    var voteInput = document.getElementById(wid + "-vote");
    var cmtInput = document.getElementById(wid + "-cmt");
    var submitBtn = document.getElementById(wid + "-submit");
    var vote = voteInput ? voteInput.value : "";
    var comment = cmtInput ? cmtInput.value.trim() : "";
    if (!vote && !comment) { alert("请至少选择 👍 喜欢 / 👎 点踩，或写点什么"); return; }
    var payload = {
      target_type: targetType,
      target_id: targetId,
      feedback: vote || "like",
      comment: comment || null
    };
    submitBtn.disabled = true; submitBtn.textContent = "提交中...";
    fetch(API + "/api/feedback", {
      method: "POST",
      headers: { "Authorization": "Bearer " + getToken(), "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(function (r) {
      if (!r.ok) return r.json().then(function (d) { throw new Error(extractMsg(d) || "HTTP " + r.status); });
      return r.json();
    })
    .then(function () {
      _aiFeedbackFired[key] = true;
      var widget = document.getElementById(wid + "-vote").closest("div[style*='linear-gradient']") || submitBtn.closest("div[style*='linear-gradient']");
      if (widget) {
        widget.outerHTML = '<div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;color:#166534;font-size:13px;text-align:center;">✅ 感谢反馈！你的评价对我们持续改进 AI 能力很有帮助</div>';
      } else {
        submitBtn.textContent = "✅ 已提交"; submitBtn.disabled = true;
      }
    })
    .catch(function (e) {
      alert("提交失败：" + e.message);
      submitBtn.disabled = false; submitBtn.textContent = "提交反馈";
    });
  };

  function renderMatchReport(d, job) {
    var score = Math.round(d.match_score || 0);
    var matched = d.matched_skills || [];
    var missing = d.missing_skills || [];
    var analysis = d.analysis || "";

    var scoreColor = score >= 80 ? "#27ae60" : score >= 60 ? "#f39c12" : score >= 40 ? "#e67e22" : "#c0392b";
    var scoreLabel = score >= 80 ? "高度匹配" : score >= 60 ? "基本匹配" : score >= 40 ? "部分匹配" : "不太匹配";

    var total = matched.length + missing.length || 1;
    var matchedPct = Math.round((matched.length / total) * 100);
    var missingPct = Math.round((missing.length / total) * 100);

    function chips(items, color) {
      if (!items.length) return '<span style="color:#aaa;font-size:12px;">无</span>';
      return items.map(function (s) {
        return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;margin:3px;font-size:12px;' + color + '">' + s + '</span>';
      }).join("");
    }

    var html = '';

    html += '<div style="display:flex;gap:16px;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #f0f0f0;">' +
      '<div style="flex:1;">' +
        '<div style="font-size:15px;font-weight:600;color:#33294d;margin-bottom:4px;">' + (job.title || "") + '</div>' +
        '<div style="font-size:12px;color:#888;">' + (job.company || "") + ' · ' + (job.city || "") + '</div>' +
        '<div style="font-size:12px;color:#888;margin-top:3px;">' + (job.experience || "") + ' · ' + (job.education || "") + '</div>' +
      '</div>' +
      '<div style="width:100px;height:100px;border-radius:50%;border:6px solid ' + scoreColor + ';display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;flex-shrink:0;">' +
        '<div style="font-size:26px;font-weight:700;color:' + scoreColor + ';">' + score + '</div>' +
        '<div style="font-size:10px;color:#888;margin-top:1px;">/ 100</div>' +
      '</div>' +
    '</div>';

    html += '<div style="text-align:center;font-size:14px;font-weight:600;color:' + scoreColor + ';margin-bottom:20px;padding:8px 0;background:' + scoreColor + '15;border-radius:6px;">🎯 匹配度评级：' + scoreLabel + '</div>';

    html += '<div style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;color:#33294d;">' +
        '<span style="font-weight:600;">🔧 技能覆盖对比</span>' +
        '<span style="color:#888;">' + matched.length + ' / ' + (matched.length + missing.length) + ' 命中</span>' +
      '</div>' +
      '<div style="height:14px;background:#ecf0f1;border-radius:7px;overflow:hidden;display:flex;">' +
        '<div style="height:100%;width:' + matchedPct + '%;background:#27ae60;transition:width .5s;"></div>' +
        '<div style="height:100%;width:' + missingPct + '%;background:#e74c3c;transition:width .5s;"></div>' +
      '</div>' +
      '<div style="display:flex;gap:16px;margin-top:12px;">' +
        '<div style="flex:1;">' +
          '<div style="font-size:12px;color:#27ae60;font-weight:600;margin-bottom:6px;">✅ 已匹配技能 (' + matched.length + ')</div>' +
          '<div>' + chips(matched, "background:#eafaf1;color:#1e8449;border:1px solid #abebc6;") + '</div>' +
        '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:12px;color:#e74c3c;font-weight:600;margin-bottom:6px;">❌ 缺失技能 (' + missing.length + ')</div>' +
          '<div>' + chips(missing, "background:#fdedec;color:#c0392b;border:1px solid #f5b7b1;") + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    if (analysis) {
      html += '<div style="margin-bottom:10px;">' +
        '<div style="font-weight:600;color:#33294d;margin-bottom:8px;font-size:14px;">📊 AI 深度分析</div>' +
        '<div style="padding:14px;background:#f8f9fa;border-radius:8px;font-size:13px;line-height:1.8;color:#333;white-space:pre-wrap;">' + analysis + '</div>' +
      '</div>';
    }

    var suggestSkills = missing.slice(0, 3);
    if (suggestSkills.length) {
      html += '<div style="margin-top:14px;padding:12px 14px;background:#fef9e7;border-radius:8px;border-left:4px solid #f39c12;">' +
        '<div style="font-size:12px;color:#b7950b;font-weight:600;margin-bottom:6px;">💡 建议补强</div>' +
        '<div style="font-size:13px;color:#7d6608;">优先学习 <b>' + suggestSkills.join('、') + '</b>' + (missing.length > 3 ? ' 等 ' + missing.length + ' 项技能' : '') + '，可大幅提升匹配度</div>' +
      '</div>';
    }

    html += renderAIFeedbackWidget("job_match", job.id || 0);

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
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><div style="font-size:28px;">🩺</div><div style="margin-top:8px;">AI 正在深度诊断简历，请稍候...</div><div style="margin-top:4px;font-size:12px;color:#aaa;">通常需要 15-30 秒</div></div>';
    report.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      var r = await fetch(API + "/api/resumes/" + id + "/diagnose", { method: "POST", headers: authHeaders() });
      var data = await r.json();
      if (!r.ok) throw new Error(data.detail || "诊断失败");
      body.innerHTML = renderDiagnoseReport(data, id);
    } catch (e) {
      body.innerHTML = '<div style="color:#c0392b;padding:20px;text-align:center;">❌ 诊断失败: ' + e.message + '</div>';
    }
  }

  function renderDiagnoseReport(d, resumeId) {
    var score = d.score || 0;
    var dims = d.dimension_scores || {};
    var strengths = d.strengths || [];
    var weaknesses = d.weaknesses || [];
    var suggestions = d.suggestions || [];
    var polished = d.polished_segments || {};

    var scoreColor = score >= 80 ? "#27ae60" : score >= 60 ? "#f39c12" : "#c0392b";
    var scoreLabel = score >= 80 ? "优秀" : score >= 60 ? "中等" : score >= 40 ? "需要大幅优化" : "急需重写";

    var dimKeys = Object.keys(dims);
    var dimHtml = dimKeys.map(function (k) {
      var v = dims[k];
      var barColor = v >= 70 ? "#27ae60" : v >= 40 ? "#f39c12" : "#e74c3c";
      return '<div style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>' + k + '</span><span style="font-weight:600;">' + v + '</span></div>' +
        '<div style="height:6px;background:#ecf0f1;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + v + '%;background:' + barColor + ';border-radius:3px;transition:width .5s;"></div></div>' +
      '</div>';
    }).join("");

    function listHtml(items, color) {
      if (!items.length) return "";
      return '<ul style="padding-left:20px;margin:0;">' +
        items.map(function (s) {
          return '<li style="margin-bottom:6px;font-size:13px;line-height:1.6;color:#333;">' + s + '</li>';
        }).join("") +
      '</ul>';
    }

    function suggestList(items) {
      if (!items.length) return "";
      return '<div style="counter-reset:s;list-style:none;padding:0;">' +
        items.map(function (s, i) {
          var t = String(s).replace(/^\d+[\.\、]\s*/, "");
          return '<div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;">' +
            '<div style="background:#3498db;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;font-weight:600;">' + (i + 1) + '</div>' +
            '<div style="font-size:13px;line-height:1.6;color:#333;">' + t + '</div>' +
          '</div>';
        }).join("") +
      '</div>';
    }

    var polishHtml = "";
    var pkeys = Object.keys(polished);
    if (pkeys.length) {
      polishHtml = pkeys.map(function (k) {
        return '<div style="border:1px solid #ecf0f1;border-radius:8px;margin-bottom:12px;overflow:hidden;">' +
          '<div style="background:#fdf2e9;padding:8px 12px;font-size:12px;color:#888;font-weight:600;">📝 原文</div>' +
          '<div style="padding:10px 12px;font-size:13px;color:#555;line-height:1.6;border-bottom:1px solid #ecf0f1;">' + k + '</div>' +
          '<div style="background:#eafaf1;padding:8px 12px;font-size:12px;color:#27ae60;font-weight:600;">✨ AI 润色后</div>' +
          '<div style="padding:10px 12px;font-size:13px;color:#1e8449;line-height:1.6;">' + polished[k] + '</div>' +
        '</div>';
      }).join("");
    }

    var html = '';

    html += '<div style="display:flex;gap:20px;align-items:center;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #f0f0f0;">' +
      '<div style="width:110px;height:110px;border-radius:50%;border:6px solid ' + scoreColor + ';display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;">' +
        '<div style="font-size:32px;font-weight:700;color:' + scoreColor + ';">' + score + '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px;">总分 100</div>' +
      '</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:16px;font-weight:600;color:#33294d;margin-bottom:4px;">简历评级：<span style="color:' + scoreColor + ';">' + scoreLabel + '</span></div>' +
        '<div style="font-size:12px;color:#888;">以下 6 个维度综合评分，每项 0-100 分</div>' +
        '<div style="margin-top:12px;">' + dimHtml + '</div>' +
      '</div>' +
    '</div>';

    if (strengths.length) {
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-weight:600;color:#27ae60;margin-bottom:10px;font-size:14px;">👍 优点 &nbsp;<span style="font-size:11px;color:#aaa;font-weight:400;">(' + strengths.length + ' 条)</span></div>' +
        listHtml(strengths) +
      '</div>';
    }

    if (weaknesses.length) {
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-weight:600;color:#e74c3c;margin-bottom:10px;font-size:14px;">⚠️ 待改进 &nbsp;<span style="font-size:11px;color:#aaa;font-weight:400;">(' + weaknesses.length + ' 条)</span></div>' +
        listHtml(weaknesses) +
      '</div>';
    }

    if (suggestions.length) {
      html += '<div style="margin-bottom:20px;">' +
        '<div style="font-weight:600;color:#2980b9;margin-bottom:10px;font-size:14px;">🎯 修改建议 &nbsp;<span style="font-size:11px;color:#aaa;font-weight:400;">(按优先级排序)</span></div>' +
        suggestList(suggestions) +
      '</div>';
    }

    if (polishHtml) {
      html += '<div style="margin-bottom:10px;">' +
        '<div style="font-weight:600;color:#8e44ad;margin-bottom:10px;font-size:14px;">✨ 关键片段润色对比</div>' +
        polishHtml +
      '</div>';
    }

    html += renderAIFeedbackWidget("resume_diagnose", resumeId || 0);

    return html;
  }

  function authSwitch(mode) {
    var loginTab = document.getElementById("tab-login");
    var regTab = document.getElementById("tab-register");
    var regFields = document.getElementById("register-fields");
    var form = document.getElementById("auth-form");
    var btn = form ? form.querySelector("button[type=submit]") : null;
    if (mode === "login") {
      loginTab.style.background = "#fff"; loginTab.style.color = "#2a2140"; loginTab.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
      regTab.style.background = "transparent"; regTab.style.color = "#999"; regTab.style.boxShadow = "none";
      regFields.style.display = "none";
      if (btn) btn.textContent = "立即登录";
      if (form) form.onsubmit = function (e) { return authSubmit(e, "login"); };
    } else {
      regTab.style.background = "#fff"; regTab.style.color = "#2a2140"; regTab.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
      loginTab.style.background = "transparent"; loginTab.style.color = "#999"; loginTab.style.boxShadow = "none";
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
    var url;

    if (mode === "register") {
      payload.real_name = (document.getElementById("a-realname").value || "").trim() || null;
      payload.school = (document.getElementById("a-school").value || "").trim() || null;
      payload.major = (document.getElementById("a-major").value || "").trim() || null;
      payload.education = document.getElementById("a-education").value || null;
      var gy = (document.getElementById("a-graduate-year").value || "").trim();
      payload.graduate_year = gy ? parseInt(gy, 10) : null;
      url = API + "/api/auth/register";
    } else {
      url = API + "/api/auth/login";
    }

    try {
      var r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var d = await r.json();
      if (!r.ok) { alert((d && d.detail) || (d && d.message) || "请求失败"); return false; }

      if (mode === "register") {
        alert("注册成功！请登录");
        authSwitch("login");
        document.getElementById("a-password").value = "";
        return false;
      }

      var token = d.access_token || (d.data && d.data.access_token) || "";
      var role = d.role || (d.data && d.data.role) || "student";
      var me = { username: username, role: role, user_id: d.user_id || (d.data && d.data.user_id) };
      setAuth(token, me);
      if (role === "admin") { alert("管理员登录成功，正在进入管理后台..."); location.href = "/admin"; return false; }
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
    body.innerHTML = '<div style="text-align:center;color:#7b5cc7;padding:30px;">⏳ 加载岗位列表…</div>';
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
      var tag = j.fromApply ? ' <span style="font-size:11px;color:#7b5cc7;background:#e8f3ff;padding:1px 6px;border-radius:8px;">已投递</span>' : '';
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
      '<div style="margin-bottom:14px;">' +
        '<div style="font-size:13px;color:#555;margin-bottom:6px;">🎯 面试岗位 <span style="color:#f44;">*</span></div>' +
        '<select id="iv-job" style="width:100%;padding:10px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;background:#fff;">' + jobOptions + '</select>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
        '<div style="font-size:13px;color:#555;margin-bottom:6px;">🎤 面试模式</div>' +
        '<div id="iv-mode" style="display:flex;gap:8px;">' + modeOptions.map(function (m) {
          return '<label style="flex:1;cursor:pointer;"><input type="radio" name="iv-mode" value="' + m.v + '"' + (m.v === "hr" ? " checked" : "") + ' style="margin-right:4px;"><span style="font-size:12px;">' + m.n + '</span></label>';
        }).join("") + '</div>' +
      '</div>' +
      '<div style="margin-bottom:18px;">' +
        '<div style="font-size:13px;color:#555;margin-bottom:6px;">⚡ 难度等级</div>' +
        '<div id="iv-diff" style="display:flex;gap:8px;">' + diffOptions.map(function (d) {
          return '<label style="flex:1;cursor:pointer;"><input type="radio" name="iv-diff" value="' + d.v + '"' + (d.v === "medium" ? " checked" : "") + ' style="margin-right:4px;"><span style="font-size:12px;">' + d.n + '</span></label>';
        }).join("") + '</div>' +
      '</div>' +
      '<div style="font-size:12px;color:#999;margin-bottom:12px;">💡 消耗 AI 次数：每轮回答 1 次</div>' +
      '<div style="display:flex;gap:10px;">' +
        '<button class="btn-mini" onclick="this.closest(\'.modal\').remove()" style="flex:1;padding:10px;">取消</button>' +
        '<button class="btn-mini btn-primary-mini" id="iv-start-btn" style="flex:2;padding:10px;font-weight:600;">🚀 开始面试</button>' +
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
    mask.innerHTML = '<div class="modal-mask" style="background:rgba(26,60,110,0.5);" onclick="return false;"></div>' +
      '<div class="modal-box" style="max-width:640px;max-height:90vh;display:flex;flex-direction:column;">' +
        '<div class="modal-header" style="flex-shrink:0;">' +
          '<div class="modal-title">🤖 AI 模拟面试 <span id="iv-mode-badge" style="font-size:11px;color:#fff;background:#7b5cc7;padding:2px 8px;border-radius:10px;margin-left:6px;"></span><span id="iv-diff-badge" style="font-size:11px;color:#fff;background:#f59e0b;padding:2px 8px;border-radius:10px;margin-left:4px;"></span></div>' +
          '<div style="display:flex;gap:6px;align-items:center;">' +
            '<button id="iv-finish-btn" class="btn-mini" style="padding:4px 10px;font-size:12px;">结束面试</button>' +
            '<button class="modal-close" id="iv-exit-btn">×</button>' +
          '</div>' +
        '</div>' +
        '<div id="iv-chat-job" style="padding:8px 16px;font-size:12px;color:#7b5cc7;background:#fafbff;border-bottom:1px solid #eef1f6;flex-shrink:0;"></div>' +
        '<div id="iv-chat-log" style="flex:1;overflow-y:auto;padding:16px;background:#f8f9fb;min-height:300px;max-height:480px;"></div>' +
        '<div style="padding:12px;border-top:1px solid #eef1f6;background:#fff;flex-shrink:0;">' +
          '<textarea id="iv-answer" rows="3" placeholder="在此输入你的回答…（Enter 发送 / Shift+Enter 换行）" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;resize:none;outline:none;"></textarea>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">' +
            '<div id="iv-tip" style="font-size:11px;color:#999;">💡 每轮消耗 1 次 AI 配额</div>' +
            '<button id="iv-send-btn" class="btn-mini btn-primary-mini" style="padding:8px 22px;font-weight:600;">发送回答</button>' +
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
    document.getElementById("iv-exit-btn").onclick = async function () {
      if (await askConfirm("确定退出？面试会丢失")) this.closest(".modal").remove();
    };
    answerEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); _ivSend(); }
    });
    setTimeout(function () { answerEl.focus(); }, 300);
  }

  function _diffBadge(d) {
    var map = { easy: ["🌱 初级", "#22c55e"], medium: ["⚡ 中级", "#f59e0b"], hard: ["🔥 高级", "#ef4444"] };
    var m = map[d] || ["⚡", "#888"];
    return '<span style="font-size:10px;color:#fff;background:' + m[1] + ';padding:1px 6px;border-radius:6px;margin-left:6px;">' + m[0] + '</span>';
  }

  function _renderIVLog() {
    var log = document.getElementById("iv-chat-log");
    if (!log) return;
    log.innerHTML = _ivState.chat.map(function (m) {
      if (m.role === "interviewer") {
        var diff = m.difficulty ? _diffBadge(m.difficulty) : "";
        var score = m.score != null ? '<div style="margin-top:8px;padding:8px 10px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:4px;font-size:12px;color:#78350f;"><b>👀 AI 点评：</b>' + (m.comment || "") + '<span style="color:#f59e0b;margin-left:8px;font-weight:700;">得分 ' + m.score + '/100</span></div>' : "";
        return '<div style="margin-bottom:12px;">' +
          '<div style="display:flex;gap:8px;align-items:flex-start;">' +
            '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ff7a45,#ffa57a);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🤖</div>' +
            '<div style="flex:1;background:#fff;border:1px solid #eef1f6;border-radius:10px;padding:10px 12px;">' +
              '<div style="font-weight:600;font-size:12px;color:#ff7a45;margin-bottom:4px;">面试官' + diff + '</div>' +
              '<div style="font-size:14px;color:#333;line-height:1.6;">' + m.content + '</div>' +
              score +
            '</div>' +
          '</div>' +
        '</div>';
      } else {
        return '<div style="margin-bottom:12px;display:flex;justify-content:flex-end;">' +
          '<div style="display:flex;gap:8px;align-items:flex-start;flex-direction:row-reverse;">' +
            '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7b5cc7,#5a3fa0);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🙂</div>' +
            '<div style="flex:1;background:linear-gradient(135deg,#7b5cc7,#5a3fa0);color:#fff;border-radius:10px;padding:10px 12px;max-width:80%;">' +
              '<div style="font-size:14px;line-height:1.6;white-space:pre-wrap;">' + m.content + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
    }).join("") + (_ivState.busy ? '<div style="text-align:center;color:#7b5cc7;font-size:12px;padding:10px;">⏳ AI 正在思考…</div>' : "");
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
    if (!(await askConfirm("确定结束面试并生成报告吗？"))) return;
    var btn = document.getElementById("iv-finish-btn");
    btn.disabled = true; btn.textContent = "⏳ 生成报告中…";
    try {
      var r = await fetch(API + "/api/interviews/" + _ivState.sessionId + "/finish", { method: "POST", headers: authHeaders() });
      if (!r.ok) { throw new Error(extractMsg(await r.json())); }
      var d = await r.json(); var data = d.data || d; var report = data.report || data;
      document.getElementById("iv-chat").remove();
      _openIVReport(report, _ivState.sessionId);
    } catch (e) { alert("生成报告失败：" + e.message); btn.disabled = false; btn.textContent = "结束面试"; }
  }

  function _openIVReport(report, sessionId) {
    var score = report.overall_score ?? report.score ?? 0;
    var scoreColor = score >= 85 ? "#22c55e" : score >= 70 ? "#7b5cc7" : score >= 55 ? "#f59e0b" : "#ef4444";
    var modal = document.createElement("div");
    modal.className = "modal"; modal.classList.add("show");
    modal.innerHTML = '<div class="modal-mask" onclick="this.parentElement.remove()"></div>' +
      '<div class="modal-box" style="max-width:560px;max-height:85vh;overflow-y:auto;">' +
        '<div class="modal-header"><div class="modal-title">📊 面试报告</div>' +
        '<div class="modal-close" onclick="this.closest(\'.modal\').remove()">×</div></div>' +
        '<div style="padding:24px;">' +
          '<div style="text-align:center;margin-bottom:20px;">' +
            '<div style="font-size:56px;font-weight:800;color:' + scoreColor + ';">' + score + '</div>' +
            '<div style="font-size:13px;color:#888;">综合评分</div>' +
          '</div>' +
          '<div style="margin-bottom:16px;">' +
            '<div style="font-weight:600;color:#2a2140;margin-bottom:6px;">📝 总体评价</div>' +
            '<div style="font-size:14px;color:#444;line-height:1.7;padding:12px;background:#f8f9fb;border-radius:8px;">' + (report.summary || report.overall || "-") + '</div>' +
          '</div>' +
          (report.strengths && report.strengths.length ? '<div style="margin-bottom:16px;"><div style="font-weight:600;color:#22c55e;margin-bottom:6px;">✨ 亮点优势</div>' + report.strengths.map(function (s) { return '<div style="font-size:13px;color:#444;padding:4px 0;">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          (report.improvements && report.improvements.length ? '<div style="margin-bottom:16px;"><div style="font-weight:600;color:#f59e0b;margin-bottom:6px;">⚠️ 待改进</div>' + report.improvements.map(function (s) { return '<div style="font-size:13px;color:#444;padding:4px 0;">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          (report.suggestions && report.suggestions.length ? '<div style="margin-bottom:16px;"><div style="font-weight:600;color:#7b5cc7;margin-bottom:6px;">💡 建议</div>' + report.suggestions.map(function (s) { return '<div style="font-size:13px;color:#444;padding:4px 0;">• ' + s + '</div>'; }).join("") + '</div>' : "") +
          renderAIFeedbackWidget("interview", sessionId || 0) +
          '<div style="text-align:center;margin-top:16px;"><button class="btn-mini btn-primary-mini" onclick="this.closest(\'.modal\').remove()" style="padding:10px 28px;">关闭</button></div>' +
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
        document.getElementById("_examExit").onclick = async function () {
          if (await askConfirm("退出后当前作答会自动保存，可稍后继续。确认退出？")) mask.remove();
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
    document.getElementById("_examFinishBtn").onclick = async function () {
      if (!(await askConfirm("确认提交试卷？提交后不可修改。"))) return;
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
    var levelColor = { excellent: "#10b981", good: "#7b5cc7", pass: "#f59e0b", weak: "#ef4444" }[r.level] || "#666";
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
          '<div class="modal-body" style="overflow-y:auto">' +
            '<div style="background:linear-gradient(135deg,#8b7bd8,#7b5cc7);color:#fff;border-radius:10px;padding:24px;margin-bottom:20px">' +
              '<div style="font-size:48px;font-weight:800">' + score + '</div>' +
              '<div style="font-size:18px">' + _esc(s.job_title || "") + ' · ' + _esc(s.company || "") + '</div>' +
              '<div style="margin-top:8px"><span style="display:inline-block;background:' + levelColor + ';color:#fff;padding:2px 12px;border-radius:10px;font-size:12px">' + levelLabel + '</span> 正确率 ' + accPct + '% · ' + correct + '/' + total + ' 题</div>' +
            '</div>' +
            '<div class="form-row" style="margin-bottom:12px">' +
              '<label>报告摘要</label>' +
              '<div class="report-summary">' + _esc(r.summary || "") + '</div>' +
            '</div>' +
            qHtml +
            sugHtml +
            renderAIFeedbackWidget(kind || "exam", s.id || 0) +
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
          inner = '<div style="text-align:center;padding:40px 0;color:#999">暂无已完成的' + typeLabel + '记录</div>';
        } else {
          inner = '<div style="display:flex;flex-direction:column;gap:12px;max-height:520px;overflow-y:auto">' + valid.map(function (s) {
            var r = typeof s.report === "string" ? (function () { try { return JSON.parse(s.report); } catch (e) { return {}; } })() : (s.report || {});
            var score = s.score || 0;
            var levelLabel = { excellent: "优秀", good: "良好", pass: "及格", weak: "需加强" }[r.level] || "";
            var levelColor = { excellent: "#10b981", good: "#7b5cc7", pass: "#f59e0b", weak: "#ef4444" }[r.level] || "#666";
            var dateStr = "";
            try { dateStr = new Date(s.finished_at || s.created_at).toLocaleString("zh-CN"); } catch (e) { dateStr = ""; }
            var summary = (r.summary || "").length > 120 ? (r.summary || "").slice(0, 120) + "…" : (r.summary || "");
            return '<div style="border:1px solid #eef0f5;border-radius:10px;padding:14px;background:#fafbfc">' +
              '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
                '<div>' +
                  '<div style="font-weight:600;font-size:15px;color:#1a1a2e">' + _esc(s.job_title || "") + '</div>' +
                  '<div style="color:#888;font-size:12px;margin-top:2px">' + _esc(s.company || "") + ' · ' + dateStr + '</div>' +
                '</div>' +
                '<div style="text-align:right">' +
                  '<div style="font-size:28px;font-weight:800;color:#1a1a2e;line-height:1">' + score + '</div>' +
                  '<span style="background:' + levelColor + ';color:#fff;border:none;font-size:11px;padding:2px 8px;border-radius:10px">' + levelLabel + '</span>' +
                '</div>' +
              '</div>' +
              '<div style="color:#555;font-size:13px;margin-bottom:10px">' + _esc(summary) + '</div>' +
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


  async function rejudgeAndRefresh(kind, id) {
    if (!(await askConfirm("确定要让 AI 重新评定这次" + (kind === "exam" ? "笔试" : "面试") + "吗？"))) return;
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

  /* ========== Banner 轮播 ========== */
  (function initBanner() {
    var banner = document.getElementById("banner");
    if (!banner) return;
    var slides = banner.querySelectorAll(".banner-slide");
    var dots = (document.getElementById("bannerDots") || banner.querySelectorAll(".banner-dots span"));
    var idx = 0;
    var total = slides.length;
    var timer = null;

    function show(i) {
      slides[idx].classList.remove("active");
      if (dots[idx]) dots[idx].classList.remove("active");
      idx = (i + total) % total;
      slides[idx].classList.add("active");
      if (dots[idx]) dots[idx].classList.add("active");
    }

    function autoNext() { show(idx + 1); }

    function startAuto() { stopAuto(); timer = setInterval(autoNext, 4000); }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    window.bannerSlide = function (dir) { show(idx + dir); startAuto(); };
    window.bannerGo = function (i) { show(i); startAuto(); };

    banner.addEventListener("mouseenter", stopAuto);
    banner.addEventListener("mouseleave", startAuto);

    var touchStartX = 0;
    banner.addEventListener("touchstart", function (e) { touchStartX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    banner.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { show(idx + (dx < 0 ? 1 : -1)); }
      startAuto();
    }, { passive: true });

    startAuto();
  })();

})();


