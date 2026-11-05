/* 全局轻提示：覆写原生 alert / confirm。
 * VS Code Simple Browser 不支持原生弹窗（会卡死页面），一律用页面内 toast 与自定义确认框。 */
(function () {
  var CSS =
    "#__toast-box{position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;}" +
    ".__toast{max-width:80vw;padding:10px 18px;background:#fff;border:2px solid #1f1b2e;border-radius:12px;" +
    "box-shadow:4px 4px 0 #1f1b2e;font-size:14px;color:#1f1b2e;line-height:1.5;opacity:0;transform:translateY(-8px);" +
    "transition:opacity .2s,transform .2s;word-break:break-all;pointer-events:auto;text-align:center;}" +
    ".__toast-show{opacity:1;transform:translateY(0);}" +
    ".__toast-ok{background:#e9f9ef;}" +
    ".__toast-err{background:#fdecec;}" +
    ".__confirm-mask{position:fixed;inset:0;background:rgba(31,27,46,.45);z-index:99998;display:flex;align-items:center;justify-content:center;}" +
    ".__confirm-card{width:min(92vw,380px);background:#fff;border:2px solid #1f1b2e;border-radius:14px;box-shadow:6px 6px 0 #1f1b2e;padding:22px 20px 18px;text-align:center;}" +
    ".__confirm-msg{font-size:14px;color:#1f1b2e;line-height:1.7;margin-bottom:18px;white-space:pre-wrap;}" +
    ".__confirm-btns{display:flex;gap:12px;justify-content:center;}" +
    ".__confirm-btns button{padding:8px 22px;border:2px solid #1f1b2e;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:3px 3px 0 #1f1b2e;transition:transform .08s,box-shadow .08s;}" +
    ".__confirm-btns button:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1f1b2e;}" +
    ".__confirm-cancel{background:#fff;color:#1f1b2e;}" +
    ".__confirm-ok{background:#f6d34d;color:#1f1b2e;}";

  function ensureStyle() {
    if (document.getElementById("__toast-style")) return;
    var s = document.createElement("style");
    s.id = "__toast-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function showToast(msg, type) {
    ensureStyle();
    var box = document.getElementById("__toast-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "__toast-box";
      document.body.appendChild(box);
    }
    var el = document.createElement("div");
    el.className = "__toast" + (type === "ok" ? " __toast-ok" : type === "err" ? " __toast-err" : "");
    el.textContent = String(msg == null ? "" : msg);
    box.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("__toast-show"); });
    setTimeout(function () {
      el.classList.remove("__toast-show");
      setTimeout(function () { el.remove(); }, 250);
    }, 3200);
  }

  function askConfirm(msg) {
    ensureStyle();
    return new Promise(function (resolve) {
      var mask = document.createElement("div");
      mask.className = "__confirm-mask";
      mask.innerHTML =
        '<div class="__confirm-card">' +
          '<div class="__confirm-msg"></div>' +
          '<div class="__confirm-btns">' +
            '<button class="__confirm-cancel">取消</button>' +
            '<button class="__confirm-ok">确定</button>' +
          "</div>" +
        "</div>";
      mask.querySelector(".__confirm-msg").textContent = String(msg == null ? "" : msg);
      document.body.appendChild(mask);
      function done(v) { mask.remove(); resolve(v); }
      mask.querySelector(".__confirm-cancel").onclick = function () { done(false); };
      mask.querySelector(".__confirm-ok").onclick = function () { done(true); };
      mask.onclick = function (e) { if (e.target === mask) done(false); };
    });
  }

  window.showToast = showToast;
  window.askConfirm = askConfirm;
  window.alert = function (msg) { showToast(msg, "info"); };
})();
