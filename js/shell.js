/* ============================================================================
   shell.js — оболочка приложения.
   Собирает сайдбар и топбар под активную роль, держит состояние (роль, язык,
   тема), даёт EH.t(), тосты и живые переходы статусов демо-сценария.

   Страница подключает своё тело через window.PAGE = { key, crumb, render }.
   ========================================================================= */
(function (EH) {
  "use strict";

  var LS = { role: "eh_role", lang: "eh_lang", theme: "eh_theme", side: "eh_sidebar" };

  function get(k, def) {
    try { return localStorage.getItem(k) || def; } catch (e) { return def; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  /* Подсказка горячей клавиши должна совпадать с тем, что реально нажимают:
     на Windows ⌘ нет, а Ctrl+K работает наравне с ним. */
  function isMac() {
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
  }

  /* ------------------------------------------------------------ состояние */
  var role = get(LS.role, "xodim");
  if (!EH.roleById(role) || EH.roleById(role).id !== role) { role = "xodim"; }
  var roleObj = EH.roleById(role);
  /* forceLang сильнее выбора пользователя: партнёр всегда видит английский */
  var lang = roleObj.forceLang || get(LS.lang, "uz");
  if (EH.langs.indexOf(lang) < 0) { lang = "uz"; }

  /* Каждая страница — отдельный документ, поэтому состояние панели тоже нужно
     запоминать: иначе она разворачивалась бы обратно при каждом переходе. */
  EH.state = { role: role, roleObj: roleObj, lang: lang,
               theme: get(LS.theme, "dark"), side: get(LS.side, "wide") };

  EH.t = function (key) {
    var d = EH.i18n[EH.state.lang] || {};
    if (d[key] !== undefined) { return d[key]; }
    if (EH.i18n.uz[key] !== undefined) { return EH.i18n.uz[key]; }
    return key;
  };

  EH.setRole = function (id) {
    set(LS.role, id);
    var r = EH.roleById(id);
    if (r.forceLang) { set(LS.lang, r.forceLang); }
    location.reload();
  };
  EH.setLang = function (l) {
    if (EH.state.roleObj.forceLang) { return; }
    set(LS.lang, l);
    location.reload();
  };
  EH.setTheme = function (th) {
    set(LS.theme, th);
    document.documentElement.setAttribute("data-theme", th);
    EH.state.theme = th;
    var b = document.getElementById("themeBtn");
    if (b) { b.innerHTML = EH.icon(th === "dark" ? "sun" : "moon"); }
    var sw = document.getElementById("themeSwitch");
    if (sw) { sw.setAttribute("aria-checked", th === "dark" ? "true" : "false"); }
  };

  /* ---------------------------------------------------------------- тосты */
  EH.toast = function (msg, type, title) {
    var host = document.querySelector(".toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    var ic = type === "success" ? "checkc" : type === "danger" ? "alert" : type === "warn" ? "alert" : "info";
    var el = document.createElement("div");
    el.className = "toast" + (type ? " is-" + type : "");
    el.setAttribute("role", "status");
    el.innerHTML = EH.icon(ic) + "<div>" + (title ? "<b>" + EH.esc(title) + "</b>" : "") + EH.esc(msg) + "</div>";
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 220);
    }, 3200);
  };

  /* ------------------------------------------- живой переход статуса ----- */
  /* Меняет статус документа и перезагружает экран — на демонстрации это
     позволяет прогнать весь цикл переключением ролей. */
  window.EHact = function (id, to, msgKey) {
    if (!to) { return; }
    EH.setStatus(id, to);
    try { sessionStorage.setItem("eh_flash", msgKey || "ts.status"); } catch (e) {}
    location.reload();
  };

  /* -------------------------------------------------------------- навигация */
  function navModel() {
    var r = EH.state.role;
    var isCompany = r === "company";
    var g = [];

    if (isCompany) {
      g.push({ t: "nav.g1", items: [
        { k: "dashboard", i: "dash",  l: "nav.dash",   h: "dashboard.html" },
        { k: "documents", i: "docs",  l: "nav.docsIn", h: "documents.html", badge: "docs" }
      ]});
      g.push({ t: "nav.g2", items: [
        { k: "tasks",    i: "tasks",    l: "nav.tasks",    h: "tasks.html", badge: "tasks" },
        { k: "calendar", i: "calendar", l: "nav.calendar", h: "calendar.html" }
      ]});
      g.push({ t: "nav.g4", items: [
        { k: "files", i: "files", l: "nav.files", h: "files.html" },
        { k: "help",  i: "help",  l: "nav.help",  h: "help.html" }
      ]});
      return g;
    }

    g.push({ t: "nav.g1", items: [
      { k: "dashboard", i: "dash",      l: "nav.dash",      h: "dashboard.html" },
      { k: "discovery", i: "discovery", l: "nav.discovery", h: "discovery.html" },
      { k: "documents", i: "docs",      l: "nav.docs",      h: "documents.html", badge: "docs" }
    ]});
    g.push({ t: "nav.g2", items: [
      { k: "tasks",    i: "tasks",    l: "nav.tasks",    h: "tasks.html", badge: "tasks" },
      { k: "exchange", i: "exchange", l: "nav.exchange", h: "exchange.html" },
      { k: "calendar", i: "calendar", l: "nav.calendar", h: "calendar.html" }
    ]});

    var mgmt = [];
    if (r === "rahbar" || r === "prokuror" || r === "admin") {
      mgmt.push({ k: "monitoring", i: "monitoring", l: "nav.monitoring", h: "monitoring.html" });
    }
    if (r === "prokuror" || r === "admin") {
      mgmt.push({ k: "audit", i: "audit", l: "nav.audit", h: "audit.html" });
    }
    if (r === "admin") {
      mgmt.push({ k: "companies", i: "companies", l: "nav.companies", h: "companies.html" });
      mgmt.push({ k: "users",     i: "users",     l: "nav.users",     h: "users.html" });
    }
    if (mgmt.length) { g.push({ t: "nav.g3", items: mgmt }); }

    g.push({ t: "nav.g4", items: [
      { k: "files", i: "files", l: "nav.files", h: "files.html" },
      { k: "help",  i: "help",  l: "nav.help",  h: "help.html" }
    ]});
    return g;
  }
  /* Глобальный поиск (js/search.js) берёт отсюда и список разделов, и права:
     иначе набор доступного роли пришлось бы описывать второй раз. */
  EH.navModel = navModel;

  function badges() {
    var st = EH.computeStats(EH.state.role);
    var docs = EH.state.role === "company"
      ? st.sent
      : EH.filterDocs("inbox", EH.state.role).length;
    return { tasks: st.pending, docs: docs };
  }

  /* ------------------------------------------------------------- сайдбар - */
  function sidebar(active) {
    var b = badges();
    var r = EH.state.roleObj;
    var nav = navModel().map(function (g) {
      var items = g.items.map(function (it) {
        var n = it.badge ? b[it.badge] : 0;
        var bd = n ? '<span class="nav-badge' + (it.badge === "tasks" && n > 2 ? " is-danger" : "") + '">' + n + "</span>" : "";
        return '<a class="nav-item' + (it.k === active ? " is-on" : "") + '" href="' + it.h + '">'
          + EH.icon(it.i) + "<span>" + EH.esc(EH.t(it.l)) + "</span>" + bd + "</a>";
      }).join("");
      return '<div class="nav-group"><div class="nav-title">' + EH.esc(EH.t(g.t)) + "</div>" + items + "</div>";
    }).join("");

    var quota = EH.state.role === "company" ? "" :
      '<div class="plan-card">'
      + '<div class="plan-top">' + EH.icon("shield", "ic-sm") + '<span class="plan-name">' + EH.esc(EH.t("plan.name")) + "</span></div>"
      + '<div class="plan-sub">' + EH.esc(EH.t("plan.until")) + "</div>"
      + '<div class="plan-nums"><span class="l">428 <i>/ 1 200</i></span><span class="r">36%</span></div>'
      + '<div class="bar-track"><div class="bar-fill" style="width:36%"></div></div>'
      + '<div class="plan-sub" style="margin:8px 0 0">' + EH.esc(EH.t("plan.docs")) + "</div>"
      + "</div>";

    return '<aside class="side">'
      + '<div class="side-top">'
      +   '<a class="brand" href="dashboard.html">'
      +     EH.brandLogo()
      +   "</a>"
      +   '<button class="btn btn-ghost btn-icon btn-sm" id="sideRail" aria-label="' + EH.esc(EH.t("tb.collapse")) + '" title="' + EH.esc(EH.t("tb.collapse")) + '">' + EH.icon("sidebar") + "</button>"
      +   '<button class="btn btn-ghost btn-icon btn-sm side-toggle" id="sideClose" aria-label="' + EH.esc(EH.t("tb.close")) + '">' + EH.icon("close") + "</button>"
      + "</div>"
      + '<div class="side-org">'
      +   EH.avatar(r.initials, r.color)
      +   '<span class="side-org-b"><span class="side-org-n">' + EH.esc(EH.t(r.org)) + '</span>'
      +   '<span class="side-org-r">' + EH.esc(EH.t(r.key)) + "</span></span>"
      + "</div>"
      + '<nav class="side-nav">' + nav + "</nav>"
      + '<div class="side-bottom">' + quota
      +   '<div class="side-mini">'
      +     '<a class="nav-item" href="profile.html">' + EH.icon("settings") + "<span>" + EH.esc(EH.t("nav.settings")) + "</span></a>"
      +   "</div>"
      + "</div>"
      + "</aside>";
  }

  /* -------------------------------------------------- уведомления -------- */
  /* Лента приходит из data.js, здесь только разметка и состояние «прочитано».
     Счётчик на колокольчике и содержимое панели считаются из одного списка. */
  function bellDot(n) {
    if (!n) { return ""; }
    return '<span class="bell-dot" id="bellDot">' + (n > 9 ? "9+" : n) + "</span>";
  }

  function notifSub(n) {
    var c = EH.companyById(n.doc.org);
    var parts = [n.doc.id];
    if (c) { parts.push(c.name); }
    if (n.act) { parts.push(EH.t(n.act)); }
    else if (n.days !== undefined) {
      parts.push(n.days < 0
        ? Math.abs(n.days) + " " + EH.t("c.overdue")
        : n.days + " " + EH.t("c.daysLeft"));
    }
    return parts.join(" · ");
  }

  function notifPanel() {
    var list = EH.notifications(EH.state.role);
    var unread = EH.notifUnread(list);

    var head = '<div class="notif-head"><span class="notif-h">' + EH.esc(EH.t("tb.notif")) + "</span>"
      + (unread ? '<span class="notif-n">' + unread + "</span>" : "")
      + (unread ? '<button type="button" class="notif-mark" id="notifMark">'
                + EH.esc(EH.t("nt.markAll")) + "</button>" : "")
      + "</div>";

    if (!list.length) {
      return head + '<div class="notif-empty">' + EH.icon("checkc")
        + "<span>" + EH.esc(EH.t("nt.empty")) + "</span></div>";
    }

    var items = list.map(function (n) {
      var isNew = !EH.isNotifRead(n.id);
      return '<a class="notif-item' + (isNew ? " is-new" : "") + '" data-notif="' + EH.esc(n.id) + '"'
        + ' href="document-detail.html?id=' + encodeURIComponent(n.doc.id) + '">'
        + '<span class="notif-ic tone-' + n.tone + '">' + EH.icon(n.icon, "ic-sm") + "</span>"
        + '<span class="notif-b"><span class="notif-t">' + EH.esc(EH.t(n.key)) + "</span>"
        + '<span class="notif-d">' + EH.esc(notifSub(n)) + "</span></span>"
        + '<span class="notif-time">' + EH.esc(EH.fmtAgo(n.date)) + "</span>"
        + "</a>";
    }).join("");

    return head + '<div class="notif-list">' + items + "</div>"
      + '<a class="notif-all" href="tasks.html">' + EH.icon("tasks", "ic-sm")
      + "<span>" + EH.esc(EH.t("nt.all")) + "</span></a>";
  }

  /* Перерисовывает панель и счётчик после «прочитано» — без перезагрузки. */
  function notifRefresh() {
    var menu = document.getElementById("notifMenu");
    if (menu) {
      menu.innerHTML = notifPanel();
      wireNotif();
    }
    var dot = document.getElementById("bellDot");
    var n = EH.notifUnread(EH.notifications(EH.state.role));
    if (dot && !n) { dot.remove(); }
    else if (dot) { dot.textContent = n > 9 ? "9+" : n; }
  }

  function wireNotif() {
    var mark = document.getElementById("notifMark");
    if (mark) {
      mark.addEventListener("click", function (e) {
        e.preventDefault();
        EH.markNotif(EH.notifications(EH.state.role).map(function (n) { return n.id; }));
        notifRefresh();
        EH.toast(EH.t("nt.readAll"), "success");
      });
    }
    /* Переход в документ тоже гасит уведомление: иначе счётчик врёт после возврата. */
    document.querySelectorAll("#notifMenu [data-notif]").forEach(function (a) {
      a.addEventListener("click", function () { EH.markNotif(a.getAttribute("data-notif")); });
    });
  }

  /* -------------------------------------------------------------- топбар - */
  function topbar(crumb, crumbHref, crumbParent) {
    var r = EH.state.roleObj;
    var roleItems = EH.roles.map(function (x) {
      return '<button class="menu-item' + (x.id === EH.state.role ? " is-on" : "") + '" data-role="' + x.id + '">'
        + EH.avatar(x.initials, x.color, "ava-sm")
        + "<span>" + EH.esc(EH.t(x.key)) + '<span class="tail"></span></span>'
        + (x.id === EH.state.role ? EH.icon("check", "ic-sm") : "") + "</button>";
    }).join("");
    /* Язык вынесен в топбар рядом с темой: это настройка одного уровня с ней,
       и на показе её ищут глазами именно там, а не в меню профиля.
       Форма — как в МЧС: кнопка-глобус наравне с остальными действиями шапки,
       в списке название на своём языке слева, код и галочка справа. */
    var locked = !!r.forceLang;
    var langBtn = '<div class="menu-wrap">'
      + '<button class="btn btn-ghost btn-icon lang-btn' + (locked ? " is-locked" : "") + '" id="langBtn"'
      +   ' aria-haspopup="true" aria-expanded="false" aria-label="' + EH.esc(EH.t("tb.lang")) + '"'
      +   ' title="' + EH.esc(locked ? EH.t("menu.langLocked") : EH.t("tb.lang")) + '">'
      +   EH.icon("globe")
      + "</button>"
      + '<div class="menu menu-r menu-lang" id="langMenu" hidden>'
      +   EH.langs.map(function (l) {
            var on = l === EH.state.lang;
            return '<button type="button" class="menu-item' + (on ? " is-on" : "") + '" data-lang="' + l + '"'
              + (locked && !on ? ' aria-disabled="true"' : "") + ">"
              + '<span class="lang-name">' + EH.esc(EH.t("lang." + l)) + "</span>"
              + '<span class="lang-r"><span class="lang-code">' + l.toUpperCase() + "</span>"
              + (on ? EH.icon("check", "ic-sm") : "") + "</span></button>";
          }).join("")
      +   (locked ? '<div class="menu-note">' + EH.icon("lock", "ic-sm")
      +     "<span>" + EH.esc(EH.t("menu.langLocked")) + "</span></div>" : "")
      + "</div>"
      + "</div>";

    var parent = crumbParent
      ? '<a href="' + crumbParent.h + '">' + EH.esc(EH.t(crumbParent.l)) + "</a>" + EH.icon("right", "ic-sm")
      : "";

    return '<header class="topbar">'
      /* Бургер живёт только на узких экранах: там сайдбар выезжающий и другого
         входа в навигацию нет. На десктопе сайдбар всегда на месте. */
      + '<button class="btn btn-ghost btn-icon btn-sm side-toggle" id="sideOpen" aria-label="' + EH.esc(EH.t("tb.sidebar")) + '">' + EH.icon("menu") + "</button>"
      + '<button class="btn btn-ghost btn-icon btn-sm" id="sideExpand" aria-label="' + EH.esc(EH.t("tb.expand")) + '" title="' + EH.esc(EH.t("tb.expand")) + '">' + EH.icon("sidebar") + "</button>"
      + '<nav class="crumbs" aria-label="breadcrumb">'
      +   parent
      +   '<span class="cur">' + EH.esc(EH.t(crumb)) + "</span>"
      + "</nav>"
      + '<span class="topbar-sp"></span>'
      + '<div class="topbar-r">'
      +   '<div class="gsearch">' + EH.icon("search")
      +     '<input class="input" id="gsearch" type="search" placeholder="' + EH.esc(EH.t("tb.search")) + '" aria-label="' + EH.esc(EH.t("tb.search")) + '">'
      +     '<span class="kbd">' + (isMac() ? "⌘K" : "Ctrl K") + "</span>"
      +   "</div>"
      +   '<div class="menu-wrap bell-wrap">'
      +     '<button class="btn btn-ghost btn-icon" id="bellBtn" aria-haspopup="true" aria-expanded="false" aria-label="'
      +       EH.esc(EH.t("tb.notif")) + '">' + EH.icon("bell") + "</button>"
      +     bellDot(EH.notifUnread(EH.notifications(EH.state.role)))
      +     '<div class="menu menu-r menu-notif" id="notifMenu" hidden>' + notifPanel() + "</div>"
      +   "</div>"
      +   langBtn
      +   '<button class="btn btn-ghost btn-icon" id="themeBtn" aria-label="' + EH.esc(EH.t("tb.theme")) + '">'
      +     EH.icon(EH.state.theme === "dark" ? "sun" : "moon") + "</button>"
      +   '<div class="menu-wrap">'
      +     '<button class="userchip" id="userBtn" aria-haspopup="true" aria-expanded="false" aria-label="' + EH.esc(EH.t("tb.menu")) + '">'
      +       EH.avatar(r.initials, r.color) + '<span class="un">' + EH.esc(r.name) + "</span>" + EH.icon("down", "ic-sm")
      +     "</button>"
      +     '<div class="menu menu-r" id="userMenu" hidden>'
      +       '<div class="menu-sec">' + EH.esc(EH.t("menu.role")) + "</div>" + roleItems
      +       '<div class="menu-sep"></div>'
      +       '<a class="menu-item" href="profile.html">' + EH.icon("profile") + "<span>" + EH.esc(EH.t("nav.profile")) + "</span></a>"
      +       '<a class="menu-item is-danger" href="index.html">' + EH.icon("logout") + "<span>" + EH.esc(EH.t("nav.logout")) + "</span></a>"
      +     "</div>"
      +   "</div>"
      + "</div>"
      + "</header>";
  }

  /* --------------------------------------------------------------- сборка */
  function wire() {
    var app = document.getElementById("app");

    /* тема */
    var tb = document.getElementById("themeBtn");
    if (tb) { tb.addEventListener("click", function () { EH.setTheme(EH.state.theme === "dark" ? "light" : "dark"); }); }
    var ts = document.getElementById("themeSwitch");
    if (ts) { ts.addEventListener("click", function () { EH.setTheme(EH.state.theme === "dark" ? "light" : "dark"); }); }

    /* дропдауны топбара: открыт всегда один, любой клик снаружи закрывает */
    var DD = [];
    function closeMenus(except) {
      DD.forEach(function (d) {
        if (d.menu === except) { return; }
        d.menu.hidden = true;
        d.btn.setAttribute("aria-expanded", "false");
      });
      /* Панель поиска кнопки не имеет и в DD не попадает, но слой у неё тот же:
         открытым в топбаре всегда остаётся что-то одно. */
      if (EH.search) { EH.search.close(); }
    }
    function dropdown(btnId, menuId, onOpen) {
      var btn = document.getElementById(btnId), menu = document.getElementById(menuId);
      if (!btn || !menu) { return; }
      DD.push({ btn: btn, menu: menu });
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = menu.hidden;
        closeMenus(menu);
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        if (open && onOpen) { onOpen(); }
      });
      /* клик внутри панели не должен её закрывать — кроме перехода по ссылке */
      menu.addEventListener("click", function (e) {
        if (!e.target.closest("a")) { e.stopPropagation(); }
      });
    }

    dropdown("userBtn", "userMenu");
    dropdown("bellBtn", "notifMenu");
    document.addEventListener("click", function () { closeMenus(); });
    /* Поиск гасит меню тем же вызовом, что и меню друг друга (js/search.js). */
    EH.closeMenus = closeMenus;

    var um = document.getElementById("userMenu");
    if (um) {
      um.querySelectorAll("[data-role]").forEach(function (b) {
        b.addEventListener("click", function () { EH.setRole(b.getAttribute("data-role")); });
      });
    }
    wireNotif();

    /* язык — дропдаун в топбаре; у роли с forceLang выбор заблокирован */
    dropdown("langBtn", "langMenu");
    document.querySelectorAll("#langMenu [data-lang]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (EH.state.roleObj.forceLang) { closeMenus(); EH.toast(EH.t("menu.langLocked")); return; }
        EH.setLang(b.getAttribute("data-lang"));
      });
    });
    var gs = document.getElementById("gsearch");
    if (gs && EH.search) { EH.search.wire(gs); }
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        /* На узком экране поля в топбаре нет — там подсказка ⌘K не обещана,
           но горячая клавиша с внешней клавиатуры всё равно может прилететь. */
        if (gs && EH.search) { EH.search.open(); } else { EH.toast(EH.t("gs.narrow")); }
      }
    });

    /* Выезжающий сайдбар — только на узких экранах. Сворачивания на десктопе нет:
       оно прятало всю навигацию и вернуть её можно было лишь той же кнопкой. */
    var so = document.getElementById("sideOpen"), sc = document.getElementById("sideClose");
    function closeSide() {
      app.classList.remove("is-open");
      var s = app.querySelector(".scrim");
      if (s) { s.remove(); }
    }
    if (so) {
      so.addEventListener("click", function () {
        app.classList.add("is-open");
        var s = document.createElement("div");
        s.className = "scrim";
        s.addEventListener("click", closeSide);
        app.appendChild(s);
      });
    }
    if (sc) { sc.addEventListener("click", closeSide); }

    /* Свёрнутая панель — узкая полоса с иконками, а не исчезнувшая навигация.
       В свёрнутом виде подписи прячутся, поэтому вешаем их на title. */
    function setRail(on) {
      app.classList.toggle("is-rail", on);
      set(LS.side, on ? "rail" : "wide");
      EH.state.side = on ? "rail" : "wide";
      app.querySelectorAll(".side-nav .nav-item").forEach(function (a) {
        var lbl = a.querySelector("span:not(.nav-badge)");
        if (on && lbl) { a.setAttribute("title", lbl.textContent); }
        else { a.removeAttribute("title"); }
      });
    }
    setRail(app.classList.contains("is-rail"));
    /* тем же механизмом пользуется экран настроек */
    EH.setSide = function (mode) { setRail(mode === "rail"); };

    var rail = document.getElementById("sideRail");
    if (rail) { rail.addEventListener("click", function () { setRail(true); }); }
    var exp = document.getElementById("sideExpand");
    if (exp) { exp.addEventListener("click", function () { setRail(false); }); }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeSide(); closeMenus(); }
    });

    /* Собственные дропдауны вместо системных <select> (js/select.js).
       Разметке, вставленной позже, нужен явный EH.enhanceSelects(root). */
    if (EH.enhanceSelects) { EH.enhanceSelects(document); }

    /* клавиатурная доступность строк таблиц и любых data-href */
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") { return; }
      var t = e.target.closest ? e.target.closest("[data-href]") : null;
      if (t && t.getAttribute("tabindex") !== null) { location.href = t.getAttribute("data-href"); }
    });
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("tr[data-href]") : null;
      if (t && !e.target.closest("a,button")) { location.href = t.getAttribute("data-href"); }
    });
  }

  /* ---------------------------------------------------------------- boot - */
  EH.boot = function () {
    document.documentElement.setAttribute("data-theme", EH.state.theme);
    document.documentElement.setAttribute("lang", EH.state.lang);
    EH.applyPrefs();

    var P = window.PAGE || { key: "", crumb: "nav.dash", render: function () { return ""; } };
    document.title = EH.t(P.crumb) + " · " + EH.t("app.name");

    var app = document.createElement("div");
    app.className = "app" + (EH.state.side === "rail" ? " is-rail" : "");
    app.id = "app";
    app.innerHTML = sidebar(P.key)
      + '<main class="main">' + topbar(P.crumb, null, P.parent)
      + '<div class="page' + (P.wide ? " page-wide" : "") + '" id="page"></div></main>';
    document.body.appendChild(app);

    var page = document.getElementById("page");

    /* Ролевой доступ. В прототипе это UX-подсказка: она показывает,
       что раздел принадлежит другой роли. На сервере это должна быть проверка прав. */
    if (P.roles && P.roles.indexOf(EH.state.role) < 0) {
      page.innerHTML = '<section class="card reveal"><div class="empty">' + EH.icon("lock")
        + '<div class="empty-t">' + EH.esc(EH.t("acc.title")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("acc.sub")) + "</div>"
        + '<div class="row" style="justify-content:center;margin-top:8px">'
        + '<span class="eyebrow">' + EH.esc(EH.t("acc.roles")) + "</span>"
        + P.roles.map(function (r) {
            return '<span class="pill pill-outline">' + EH.esc(EH.t(EH.roleById(r).key)) + "</span>";
          }).join("")
        + '</div><a class="btn btn-subtle btn-sm" href="dashboard.html" style="margin-top:10px">'
        + EH.icon("dash", "ic-sm") + EH.esc(EH.t("nav.dash")) + "</a></div></section>";
      wire();
      return;
    }

    var html = P.render(page);
    if (typeof html === "string") { page.innerHTML = html; }
    if (P.after) { P.after(page); }

    wire();
    EH.autoCount(page);
    if (EH.mountWorldMaps) { EH.mountWorldMaps(page); }

    /* сообщение, отложенное перед перезагрузкой (живой переход статуса) */
    try {
      var f = sessionStorage.getItem("eh_flash");
      if (f) {
        sessionStorage.removeItem("eh_flash");
        EH.toast(EH.t(f), "success");
      }
    } catch (e) {}
  };

  /* Страницы без оболочки (вход, 404) не объявляют window.PAGE — их не трогаем. */
  function autoboot() { if (window.PAGE) { EH.boot(); } }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoboot);
  } else {
    autoboot();
  }

})(window.EH = window.EH || {});
