(function () {
  const API = "/api";

  let selectedRole = "student";

  /* ========== 角色 Tab 切换 ========== */
  const tabs = document.querySelectorAll(".role-tab");
  const tipBar = document.getElementById("loginTipBar");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      selectedRole = tab.getAttribute("data-role");

      if (selectedRole === "admin") {
        tipBar.className = "login-tip-bar admin-tip";
        tipBar.innerHTML = "🛡️ 管理员账号登录后进入「平台管理后台」，可审核企业/岗位/简历、管理 AI Prompt 模板、查看反馈与审计日志。<br><b>默认账号：admin / admin123</b>";
      } else {
        tipBar.className = "login-tip-bar";
        tipBar.innerHTML = "🎓 学生账号登录后进入「个人中心」，AI 简历优化、岗位匹配、模拟面试等功能全部开放。";
      }
    });
  });

  /* ========== 自动处理 redirect 参数 ========== */
  const urlParams = new URLSearchParams(window.location.search);
  const forceRole = urlParams.get("role");
  if (forceRole === "admin") {
    const adminTab = document.querySelector('.role-tab[data-role="admin"]');
    if (adminTab) adminTab.click();
  }

  /* ========== 登录 ========== */
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      alert("请输入用户名和密码");
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "登录中...";

    try {
      const resp = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await resp.json();
      if (resp.ok && data.access_token) {
        const role = data.role || "student";

        if (selectedRole === "admin" && role !== "admin") {
          alert("该账号不是管理员，请切换到「学生用户」登录");
          btn.disabled = false;
          btn.textContent = "登 录";
          return;
        }
        if (selectedRole === "student" && role === "admin") {
          alert("检测到管理员账号，为您跳转到管理后台...");
        }

        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify({ username, role, user_id: data.user_id }));

        const redirect = urlParams.get("redirect");
        if (redirect && redirect.startsWith("/")) {
          location.href = redirect;
        } else if (role === "admin") {
          location.href = "/admin";
        } else {
          location.href = "/";
        }
      } else {
        alert(data.detail || "登录失败，请检查账号密码");
      }
    } catch (err) {
      alert("网络错误：" + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "登 录";
    }
  });

  /* ========== 注册弹窗 ========== */
  const modal = document.getElementById("registerModal");
  const openBtn = document.getElementById("openRegister");
  const closeBtn = document.getElementById("closeRegister");
  const mask = modal.querySelector(".modal-mask");

  function openRegister() { modal.classList.add("show"); }
  function closeRegister() { modal.classList.remove("show"); }

  openBtn.addEventListener("click", function (e) {
    e.preventDefault();
    openRegister();
  });
  closeBtn.addEventListener("click", closeRegister);
  mask.addEventListener("click", closeRegister);

  /* ========== 注册提交 ========== */
  const regForm = document.getElementById("registerForm");
  regForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("reg_username").value.trim();
    const password = document.getElementById("reg_password").value;
    const password2 = document.getElementById("reg_password2").value;
    const real_name = document.getElementById("reg_real_name").value.trim();
    const school = document.getElementById("reg_school").value.trim();
    const major = document.getElementById("reg_major").value.trim();
    const education = document.getElementById("reg_education").value;
    const gy = document.getElementById("reg_graduate_year").value;

    if (username.length < 3) { alert("用户名至少 3 位"); return; }
    if (password.length < 6) { alert("密码至少 6 位"); return; }
    if (password !== password2) { alert("两次密码不一致"); return; }

    const btn = regForm.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "注册中...";

    const payload = { username, password };
    if (real_name) payload.real_name = real_name;
    if (school) payload.school = school;
    if (major) payload.major = major;
    if (education) payload.education = education;
    if (gy) payload.graduate_year = parseInt(gy, 10);

    try {
      const resp = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (resp.ok) {
        alert("注册成功！请使用账号登录。");
        closeRegister();
        document.getElementById("username").value = username;
        regForm.reset();
      } else {
        alert(data.detail || "注册失败");
      }
    } catch (err) {
      alert("网络错误：" + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "立即注册";
    }
  });

  /* ========== 找回密码 ========== */
  document.getElementById("forgotPwd").addEventListener("click", function (e) {
    e.preventDefault();
    alert("请联系管理员重置密码（演示版本暂未开放找回流程）");
  });

  /* ========== 已登录用户：提示可选择继续使用或切换 ========== */
  const existingToken = localStorage.getItem("token");
  if (existingToken) {
    try {
      const existingUser = JSON.parse(localStorage.getItem("user") || "null");
      if (existingUser && existingUser.username) {
        const keep = confirm(
          `检测到已登录账号「${existingUser.username}」\n\n点击「确定」继续使用该账号\n点击「取消」切换为其他账号`
        );
        if (keep) {
          if (existingUser.role === "admin") {
            location.replace("/admin");
          } else {
            location.replace("/");
          }
          return;
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    } catch (_) {}
  }
})();
