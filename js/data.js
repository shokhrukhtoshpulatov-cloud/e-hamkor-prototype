/* ============================================================================
   data.js — единственный источник данных прототипа.
   Здесь же живёт бизнес-логика, которую при переносе нужно унести на сервер:
   матрица «роль × статус → действия» и агрегатор показателей.
   ========================================================================= */
(function (EH) {
  "use strict";

  /* Версия сборки — читается из ?v= собственного тега <script>, поэтому
     всегда совпадает с тем, что подставил tools/mkpage.py. */
  EH.BUILD = (function () {
    var s = document.currentScript;
    var m = s && /[?&]v=([\w.-]+)/.exec(s.src || "");
    return m ? m[1] : "dev";
  })();

  /* Демо-«сегодня». В боевой системе — new Date().
     Зафиксировано, чтобы показ заказчику был воспроизводимым. */
  EH.TODAY = new Date(2026, 8, 16);

  /* ---------------------------------------------------------------- роли -- */
  EH.roles = [
    { id: "xodim",    key: "role.xodim",    name: "Doston Ibragimov", roleKey: "role.xodim.t",    org: "org.navoiy", initials: "DI", color: "var(--c1)" },
    { id: "rahbar",   key: "role.rahbar",   name: "Kamol Rahimov",    roleKey: "role.rahbar.t",   org: "org.navoiy", initials: "KR", color: "var(--c2)" },
    { id: "prokuror", key: "role.prokuror", name: "Dilshod Karimov",  roleKey: "role.prokuror.t", org: "org.gp",     initials: "DK", color: "var(--c3)" },
    { id: "company",  key: "role.company",  name: "Anna Meyer",       roleKey: "role.company.t",  org: "org.binance", initials: "AM", color: "var(--gold)", forceLang: "en" },
    { id: "admin",    key: "role.admin",    name: "System Operator",  roleKey: "role.admin.t",    org: "org.ehamkor", initials: "SO", color: "var(--text-soft)" }
  ];
  EH.roleById = function (id) {
    for (var i = 0; i < EH.roles.length; i++) { if (EH.roles[i].id === id) { return EH.roles[i]; } }
    return EH.roles[0];
  };

  /* --------------------------------------------------- внутренние органы -- */
  EH.orgLabels = {
    "org.navoiy":  "org.navoiy",
    "org.gp":      "org.gp",
    "org.binance": "org.binance",
    "org.ehamkor": "org.ehamkor"
  };

  /* --------------------------------------------- иностранные организации -- */
  /* sla — срок ответа по официальному каналу, дней. Подставляется в мастере. */
  EH.companies = [
    { id: "binance",   name: "Binance Holdings",      country: "Lietuva",          cc: "LT", type: "crypto",  contact: "le@binance.com",           active: true,  sla: 30 },
    { id: "bybit",     name: "Bybit (BitDAO)",        country: "BAA",              cc: "AE", type: "crypto",  contact: "compliance@bybit.com",     active: true,  sla: 30 },
    { id: "okx",       name: "OKX Exchange",          country: "Seyshel orollari", cc: "SC", type: "crypto",  contact: "legal@okx.com",            active: true,  sla: 45 },
    { id: "kraken",    name: "Payward (Kraken)",      country: "AQSH",             cc: "US", type: "crypto",  contact: "lawenforcement@kraken.com", active: true, sla: 30 },
    { id: "coinbase",  name: "Coinbase Inc.",         country: "AQSH",             cc: "US", type: "crypto",  contact: "legal@coinbase.com",       active: true,  sla: 30 },
    { id: "kucoin",    name: "KuCoin",                country: "Seyshel orollari", cc: "SC", type: "crypto",  contact: "legal@kucoin.com",         active: false, sla: 45 },
    { id: "htx",       name: "HTX (Huobi Global)",    country: "Seyshel orollari", cc: "SC", type: "crypto",  contact: "compliance@htx.com",       active: true,  sla: 45 },
    { id: "bitget",    name: "Bitget Ltd.",           country: "Singapur",         cc: "SG", type: "crypto",  contact: "legal@bitget.com",         active: true,  sla: 45 },
    { id: "google",    name: "Google LLC",            country: "AQSH",             cc: "US", type: "tech",    contact: "lers@google.com",          active: true,  sla: 45 },
    { id: "meta",      name: "Meta Platforms",        country: "Irlandiya",        cc: "IE", type: "tech",    contact: "records@meta.com",         active: true,  sla: 45 },
    { id: "telegram",  name: "Telegram FZ-LLC",       country: "BAA",              cc: "AE", type: "tech",    contact: "abuse@telegram.org",       active: true,  sla: 30 },
    { id: "apple",     name: "Apple Inc.",            country: "AQSH",             cc: "US", type: "tech",    contact: "lawenforcement@apple.com", active: true,  sla: 45 },
    { id: "microsoft", name: "Microsoft Corp.",       country: "AQSH",             cc: "US", type: "tech",    contact: "cyber@microsoft.com",      active: true,  sla: 45 },
    { id: "xcorp",     name: "X Corp.",               country: "AQSH",             cc: "US", type: "tech",    contact: "legal@x.com",              active: false, sla: 45 },
    { id: "tiktok",    name: "TikTok Pte. Ltd.",      country: "Singapur",         cc: "SG", type: "tech",    contact: "legal@tiktok.com",         active: true,  sla: 30 },
    { id: "wise",      name: "Wise Payments Ltd.",    country: "Buyuk Britaniya",  cc: "GB", type: "fintech", contact: "le@wise.com",              active: true,  sla: 30 },
    { id: "revolut",   name: "Revolut Ltd.",          country: "Buyuk Britaniya",  cc: "GB", type: "fintech", contact: "le@revolut.com",           active: true,  sla: 30 },
    { id: "paypal",    name: "PayPal Holdings",       country: "AQSH",             cc: "US", type: "fintech", contact: "legal@paypal.com",         active: true,  sla: 45 },
    { id: "db",        name: "Deutsche Bank AG",      country: "Germaniya",        cc: "DE", type: "bank",    contact: "aml@db.com",               active: true,  sla: 45 }
  ];
  EH.companyById = function (id) {
    for (var i = 0; i < EH.companies.length; i++) { if (EH.companies[i].id === id) { return EH.companies[i]; } }
    return null;
  };
  EH.companyIcon = { crypto: "crypto", tech: "tech", bank: "bank", fintech: "fintech" };

  /* координаты штаб-квартир — для карт (discovery + декоративная) */
  EH.geo = {
    LT: [54.69, 25.28], AE: [25.20, 55.27], SC: [-4.62, 55.45], US: [38.90, -77.04],
    IE: [53.35, -6.26], SG: [1.35, 103.82], GB: [51.51, -0.13], DE: [50.11, 8.68],
    UZ: [41.31, 69.24]
  };

  /* декоративные точки для анимации «запрос ушёл» — по всем континентам.
     К делу не относятся: только оживляют карту, данных за ними нет. */
  EH.geoAmbient = [
    [43.70, -79.38], [34.05, -118.24], [19.43, -99.13], [45.50, -73.57],
    [-23.55, -46.63], [-34.60, -58.38], [4.71, -74.07], [-12.05, -77.04],
    [48.85, 2.35], [40.42, -3.70], [41.90, 12.50], [52.23, 21.01], [59.33, 18.07],
    [30.04, 31.24], [6.52, 3.38], [-1.29, 36.82], [-26.20, 28.04], [33.57, -7.59],
    [41.01, 28.98], [55.75, 37.62], [43.24, 76.89], [28.61, 77.21], [39.90, 116.41],
    [35.69, 139.69], [37.57, 126.98], [13.75, 100.50], [-6.21, 106.85], [24.71, 46.68],
    [-33.87, 151.21], [-36.85, 174.76]
  ];

  /* ------------------------------------------------- типы документов (5) -- */
  EH.docTypes = [
    { id: "information", key: "dt.information", icon: "docs"     },
    { id: "banking",     key: "dt.banking",     icon: "bank"     },
    { id: "digital",     key: "dt.digital",     icon: "db"       },
    { id: "legal_aid",   key: "dt.legal_aid",   icon: "law"      },
    { id: "response",    key: "dt.response",    icon: "doccheck" }
  ];

  /* ------------------------------------------------------- статусы (9) --- */
  EH.statuses = {
    draft:      { cls: "pill-outline", key: "st.draft",      step: 0 },
    review:     { cls: "pill-warn",    key: "st.review",     step: 1 },
    returned:   { cls: "pill-danger",  key: "st.returned",   step: 1 },
    approved:   { cls: "pill-navy",    key: "st.approved",   step: 2 },
    sent:       { cls: "pill-info",    key: "st.sent",       step: 3 },
    accepted:   { cls: "pill-violet",  key: "st.accepted",   step: 4 },
    answered:   { cls: "pill-gold",    key: "st.answered",   step: 5 },
    delivering: { cls: "pill-info",    key: "st.delivering", step: 6 },
    completed:  { cls: "pill-success", key: "st.completed",  step: 7 }
  };
  /* порядок этапов для степпера в карточке документа */
  EH.flowSteps = ["draft", "review", "approved", "sent", "accepted", "answered", "delivering", "completed"];

  /* ---------------------------------------------------- документы (13) --- */
  EH.docs = [
    { id: "EH-2026-0428", type: "digital",     org: "binance",  status: "draft",      author: "xodim",    deadline: "2026-10-16", updated: "2026-09-16", title: "doc.0428" },
    { id: "EH-2026-0417", type: "digital",     org: "binance",  status: "review",     author: "xodim",    deadline: "2026-09-21", updated: "2026-09-15", title: "doc.0417" },
    { id: "EH-2026-0425", type: "banking",     org: "wise",     status: "review",     author: "xodim",    deadline: "2026-09-18", updated: "2026-09-14", title: "doc.0425" },
    { id: "EH-2026-0414", type: "information", org: "telegram", status: "returned",   author: "xodim",    deadline: "2026-09-17", updated: "2026-09-13", title: "doc.0414" },
    { id: "EH-2026-0419", type: "digital",     org: "google",   status: "approved",   author: "xodim",    deadline: "2026-10-02", updated: "2026-09-12", title: "doc.0419" },
    { id: "EH-2026-0405", type: "banking",     org: "revolut",  status: "sent",       author: "xodim",    deadline: "2026-09-14", updated: "2026-09-08", title: "doc.0405" },
    { id: "EH-2026-0423", type: "legal_aid",   org: "db",       status: "sent",       author: "prokuror", deadline: "2026-10-24", updated: "2026-09-11", title: "doc.0423" },
    { id: "EH-2026-0407", type: "digital",     org: "binance",  status: "sent",       author: "xodim",    deadline: "2026-09-23", updated: "2026-09-09", title: "doc.0407" },
    { id: "EH-2026-0409", type: "digital",     org: "meta",     status: "accepted",   author: "xodim",    deadline: "2026-09-19", updated: "2026-09-10", title: "doc.0409" },
    { id: "EH-2026-0411", type: "information", org: "tiktok",   status: "answered",   author: "xodim",    deadline: "2026-09-26", updated: "2026-09-15", title: "doc.0411" },
    { id: "EH-2026-0421", type: "banking",     org: "paypal",   status: "delivering", author: "xodim",    deadline: "2026-09-29", updated: "2026-09-15", title: "doc.0421" },
    { id: "EH-2026-0402", type: "digital",     org: "binance",  status: "completed",  author: "xodim",    deadline: "2026-09-05", updated: "2026-09-04", title: "doc.0402" },
    { id: "EH-2026-0399", type: "information", org: "kraken",   status: "completed",  author: "xodim",    deadline: "2026-08-28", updated: "2026-08-26", title: "doc.0399" }
  ];
  EH.docById = function (id) {
    var l = EH.docsLive();
    for (var i = 0; i < l.length; i++) { if (l[i].id === id) { return l[i]; } }
    return null;
  };

  /* ------------------------------------ живое состояние (localStorage) ---- */
  function readOverrides() {
    try { return JSON.parse(localStorage.getItem("eh_status") || "{}") || {}; }
    catch (e) { return {}; }
  }
  EH.statusOverrides = readOverrides;

  EH.docStatus = function (doc) {
    var o = readOverrides();
    return o[doc.id] || doc.status;
  };
  EH.setStatus = function (id, status) {
    var o = readOverrides();
    o[id] = status;
    try { localStorage.setItem("eh_status", JSON.stringify(o)); } catch (e) {}
  };
  EH.resetDemo = function () {
    try {
      localStorage.removeItem("eh_status");
      localStorage.removeItem("eh_notif");
    } catch (e) {}
  };
  /* копия EH.docs с актуальными статусами и пересчитанным остатком срока */
  EH.docsLive = function () {
    var o = readOverrides();
    return EH.docs.map(function (d) {
      var c = {};
      for (var k in d) { c[k] = d[k]; }
      c.status = o[d.id] || d.status;
      c.days = EH.daysLeft(d.deadline);
      return c;
    });
  };

  /* ----------------------------------------------------------- сроки ----- */
  EH.daysLeft = function (iso) {
    var p = String(iso).split("-");
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return Math.round((d - EH.TODAY) / 86400000);
  };
  /* Градация: <0 просрочено · 0..2 критично · <=5 срок близко · иначе норма */
  EH.deadlineLevel = function (days, status) {
    if (status === "completed") { return "done"; }
    if (days < 0)  { return "late"; }
    if (days <= 2) { return "crit"; }
    if (days <= 5) { return "near"; }
    return "ok";
  };

  /* ------------------------ матрица «роль × статус → действия» (ядро) ----- */
  /* to:null — действие не меняет статус (переход на другой экран).
     Прототип этим только прячет кнопки. На сервере это должна быть проверка прав. */
  var MATRIX = {
    xodim: {
      draft:      [{ key: "act.continue",  icon: "edit",    to: null, href: "document-editor.html", cls: "btn-primary" }],
      returned:   [{ key: "act.fix",       icon: "edit",    to: null, href: "document-editor.html", cls: "btn-primary" }],
      delivering: [{ key: "act.close",     icon: "checkc",  to: "completed", cls: "btn-primary" }]
    },
    rahbar: {
      review:     [{ key: "act.approve",   icon: "checkc",  to: "approved", cls: "btn-primary" },
                   { key: "act.return",    icon: "return",  to: "returned", cls: "btn-subtle" }]
    },
    prokuror: {
      approved:   [{ key: "act.route",     icon: "send",    to: "sent",     cls: "btn-primary" },
                   { key: "act.return",    icon: "return",  to: "returned", cls: "btn-subtle" }],
      answered:   [{ key: "act.deliver",   icon: "route",   to: "delivering", cls: "btn-primary" }]
    },
    company: {
      sent:       [{ key: "act.accept",    icon: "checkc",  to: "accepted", cls: "btn-primary" }],
      accepted:   [{ key: "act.upload",    icon: "upload",  to: "answered", cls: "btn-primary" }]
    },
    admin: {}
  };
  EH.actionsFor = function (role, status) {
    var r = MATRIX[role] || {};
    return (r[status] || []).slice();
  };

  /* ------------------------------------------ единый источник показателей - */
  var ACTIVE = { review: 1, approved: 1, sent: 1, accepted: 1, answered: 1, delivering: 1 };

  EH.computeStats = function (role) {
    var docs = EH.visibleDocs(role);
    var s = { pending: 0, progress: 0, near: 0, late: 0,
              sent: 0, accepted: 0, answered: 0, completed: 0,
              draft: 0, review: 0, returned: 0, approved: 0, delivering: 0,
              total: docs.length };
    docs.forEach(function (d) {
      s[d.status] = (s[d.status] || 0) + 1;
      if (ACTIVE[d.status]) { s.progress++; }
      if (EH.actionsFor(role, d.status).length) { s.pending++; }
      var lvl = EH.deadlineLevel(d.days, d.status);
      if (lvl === "late") { s.late++; }
      else if (lvl === "crit" || lvl === "near") { s.near++; }
    });
    return s;
  };

  /* Партнёр видит только адресованные ему документы и только после отправки.
     В боевой системе это фильтр queryset'а, а не шаблона. */
  EH.visibleDocs = function (role) {
    var all = EH.docsLive();
    if (role !== "company") { return all; }
    return all.filter(function (d) {
      return d.org === "binance" && EH.statuses[d.status].step >= 3;
    });
  };

  /* ----------------------------------------- очередь задач роли ---------- */
  /* Считается из тех же документов, что и KPI, — числа не могут разойтись. */
  EH.tasksFor = function (role) {
    return EH.visibleDocs(role).filter(function (d) {
      return EH.actionsFor(role, d.status).length > 0;
    }).map(function (d) {
      var a = EH.actionsFor(role, d.status)[0];
      var lvl = EH.deadlineLevel(d.days, d.status);
      return {
        doc: d,
        key: a.key,
        kind: d.status,
        deadline: d.deadline,
        prio: lvl === "late" ? "high" : (lvl === "crit" || lvl === "near") ? "mid" : "low"
      };
    }).sort(function (a, b) { return a.doc.days - b.doc.days; });
  };

  /* ------------------------------------------- лента уведомлений --------- */
  /* Уведомления строятся из тех же документов, что задачи и KPI, — колокольчик
     не может разойтись с реестром. Прочитанное лежит в localStorage; на сервере
     это будет таблица доставок «событие × получатель». */
  var NOTIF_EVENT = {
    review:     { key: "nt.review",     icon: "doccheck",  tone: "info"    },
    returned:   { key: "nt.returned",   icon: "return",    tone: "danger"  },
    approved:   { key: "nt.approved",   icon: "checkc",    tone: "info"    },
    sent:       { key: "nt.sent",       icon: "send",      tone: "info"    },
    accepted:   { key: "nt.accepted",   icon: "usercheck", tone: "info"    },
    answered:   { key: "nt.answered",   icon: "inbox",     tone: "success" },
    delivering: { key: "nt.delivering", icon: "route",     tone: "info"    },
    completed:  { key: "nt.completed",  icon: "checkc",    tone: "success" }
  };
  var NOTIF_MAX = 12;

  /* rank: 0 — просрочено, 1 — требует действия или горит срок, 2 — событие. */
  EH.notifications = function (role) {
    role = role || (EH.state && EH.state.role) || "xodim";
    var out = [];
    EH.visibleDocs(role).forEach(function (d) {
      var lvl = EH.deadlineLevel(d.days, d.status);
      if (lvl === "late") {
        out.push({ id: d.id + ":late", doc: d, key: "nt.late", icon: "alert",
                   tone: "danger", rank: 0, date: d.updated, days: d.days });
      } else if (lvl === "crit") {
        out.push({ id: d.id + ":due", doc: d, key: "nt.near", icon: "timer",
                   tone: "warn", rank: 1, date: d.updated, days: d.days });
      }
      var acts = EH.actionsFor(role, d.status);
      if (acts.length) {
        out.push({ id: d.id + ":act:" + d.status, doc: d, key: "nt.action", icon: "tasks",
                   tone: "warn", rank: 1, date: d.updated, act: acts[0].key });
      }
      var e = NOTIF_EVENT[d.status];
      if (e) {
        out.push({ id: d.id + ":" + d.status, doc: d, key: e.key, icon: e.icon,
                   tone: e.tone, rank: 2, date: d.updated });
      }
    });
    out.sort(function (a, b) {
      if (a.rank !== b.rank) { return a.rank - b.rank; }
      if (a.date !== b.date) { return a.date < b.date ? 1 : -1; }
      return a.doc.id < b.doc.id ? 1 : -1;
    });
    return out.slice(0, NOTIF_MAX);
  };

  function readNotif() {
    try { return JSON.parse(localStorage.getItem("eh_notif") || "{}") || {}; }
    catch (e) { return {}; }
  }
  EH.notifRead = readNotif;
  EH.isNotifRead = function (id) { return !!readNotif()[id]; };
  EH.markNotif = function (ids) {
    var o = readNotif();
    [].concat(ids).forEach(function (id) { o[id] = 1; });
    try { localStorage.setItem("eh_notif", JSON.stringify(o)); } catch (e) {}
  };
  EH.notifUnread = function (list) {
    var o = readNotif(), n = 0;
    list.forEach(function (x) { if (!o[x.id]) { n++; } });
    return n;
  };

  /* --------------------------------------------- события жизненного цикла - */
  /* Явные события для документов демо-сценария; для остальных строятся из статуса. */
  var TL = {
    "EH-2026-0417": [
      { t: "2026-09-12 09:14", who: "Doston Ibragimov", d: "tl.created",  state: "done" },
      { t: "2026-09-12 11:40", who: "Doston Ibragimov", d: "tl.signed",   state: "done" },
      { t: "2026-09-15 08:05", who: "Doston Ibragimov", d: "tl.toReview", state: "done" }
    ],
    "EH-2026-0409": [
      { t: "2026-09-02 10:22", who: "Doston Ibragimov", d: "tl.created",  state: "done" },
      { t: "2026-09-02 15:10", who: "Kamol Rahimov",    d: "tl.approved", state: "done" },
      { t: "2026-09-04 09:30", who: "Dilshod Karimov",  d: "tl.routed",   state: "done" },
      { t: "2026-09-10 13:02", who: "Meta Platforms",   d: "tl.accepted", state: "done" }
    ],
    "EH-2026-0402": [
      { t: "2026-08-14 11:00", who: "Doston Ibragimov", d: "tl.created",   state: "done" },
      { t: "2026-08-14 16:20", who: "Kamol Rahimov",    d: "tl.approved",  state: "done" },
      { t: "2026-08-17 09:12", who: "Dilshod Karimov",  d: "tl.routed",    state: "done" },
      { t: "2026-08-20 12:45", who: "Binance Holdings", d: "tl.accepted",  state: "done" },
      { t: "2026-09-01 10:08", who: "Binance Holdings", d: "tl.answered",  state: "done" },
      { t: "2026-09-03 08:40", who: "Dilshod Karimov",  d: "tl.delivered", state: "done" },
      { t: "2026-09-04 17:15", who: "Doston Ibragimov", d: "tl.completed", state: "done" }
    ]
  };
  var STATE_EVENT = {
    draft: "tl.created", review: "tl.toReview", returned: "tl.returned",
    approved: "tl.approved", sent: "tl.routed", accepted: "tl.accepted",
    answered: "tl.answered", delivering: "tl.delivered", completed: "tl.completed"
  };
  EH.timelineFor = function (doc) {
    var base = (TL[doc.id] || []).slice();
    var have = {};
    base.forEach(function (e) { have[e.d] = 1; });
    var order = EH.flowSteps.slice();
    var cur = EH.statuses[doc.status].step;
    order.forEach(function (st) {
      if (EH.statuses[st].step <= cur && !have[STATE_EVENT[st]]) {
        base.push({ t: doc.updated + " 12:00", who: EH.actorFor(st), d: STATE_EVENT[st], state: "done" });
      }
    });
    if (doc.status === "returned" && !have["tl.returned"]) {
      base.push({ t: doc.updated + " 12:00", who: "Kamol Rahimov", d: "tl.returned", state: "done" });
    }
    base.sort(function (a, b) { return a.t < b.t ? -1 : 1; });
    if (base.length) { base[base.length - 1].state = "now"; }
    if (doc.status !== "completed") {
      base.push({ t: "", who: "", d: "tl.waiting", state: "wait" });
    }
    return base;
  };
  EH.actorFor = function (status) {
    return ({ draft: "Doston Ibragimov", review: "Doston Ibragimov", returned: "Kamol Rahimov",
              approved: "Kamol Rahimov", sent: "Dilshod Karimov", accepted: "—",
              answered: "—", delivering: "Dilshod Karimov", completed: "Doston Ibragimov" })[status] || "—";
  };

  /* ------------------------------------------------ журнал аудита (10) --- */
  EH.audit = [
    { ts: "2026-09-16 09:42:11", user: "Doston Ibragimov", doc: "EH-2026-0428", act: "au.create",   ip: "91.204.239.14" },
    { ts: "2026-09-15 17:20:03", user: "Doston Ibragimov", doc: "EH-2026-0417", act: "au.submit",   ip: "91.204.239.14" },
    { ts: "2026-09-15 16:58:47", user: "Doston Ibragimov", doc: "EH-2026-0417", act: "au.sign",     ip: "91.204.239.14" },
    { ts: "2026-09-15 11:03:29", user: "Dilshod Karimov",  doc: "EH-2026-0411", act: "au.receive",  ip: "195.158.31.7"  },
    { ts: "2026-09-14 14:11:52", user: "Kamol Rahimov",    doc: "EH-2026-0425", act: "au.view",     ip: "91.204.239.22" },
    { ts: "2026-09-13 10:37:18", user: "Kamol Rahimov",    doc: "EH-2026-0414", act: "au.return",   ip: "91.204.239.22" },
    { ts: "2026-09-12 09:25:40", user: "Dilshod Karimov",  doc: "EH-2026-0419", act: "au.approve",  ip: "195.158.31.7"  },
    { ts: "2026-09-11 15:49:02", user: "Anna Meyer",       doc: "EH-2026-0409", act: "au.accept",   ip: "88.119.174.60" },
    { ts: "2026-09-10 08:14:36", user: "System Operator",  doc: "—",            act: "au.company",  ip: "10.0.14.2"     },
    { ts: "2026-09-08 12:02:55", user: "Dilshod Karimov",  doc: "EH-2026-0405", act: "au.route",    ip: "195.158.31.7"  }
  ];

  /* ---------------------------------------------------- регионы (8) ------ */
  EH.regions = [
    { key: "rg.toshkent_sh", total: 148, active: 41, near: 6, late: 3, done: 104, rate: 93 },
    { key: "rg.toshkent_v",  total: 86,  active: 22, near: 4, late: 5, done: 59,  rate: 88 },
    { key: "rg.samarqand",   total: 74,  active: 19, near: 3, late: 1, done: 54,  rate: 95 },
    { key: "rg.navoiy",      total: 52,  active: 17, near: 5, late: 4, done: 31,  rate: 84 },
    { key: "rg.buxoro",      total: 47,  active: 12, near: 2, late: 0, done: 35,  rate: 97 },
    { key: "rg.fargona",     total: 69,  active: 18, near: 3, late: 2, done: 49,  rate: 91 },
    { key: "rg.andijon",     total: 58,  active: 14, near: 1, late: 1, done: 43,  rate: 94 },
    { key: "rg.qashqadaryo", total: 41,  active: 11, near: 2, late: 3, done: 27,  rate: 86 }
  ];

  /* ------------------------------------------- динамика по месяцам ------- */
  /* m — ключ месяца, c — создано, d — закрыто */
  EH.monthly = [
    { m: "mo.10", c: 38, d: 30 }, { m: "mo.11", c: 44, d: 36 }, { m: "mo.12", c: 41, d: 39 },
    { m: "mo.1",  c: 47, d: 40 }, { m: "mo.2",  c: 52, d: 44 }, { m: "mo.3",  c: 49, d: 47 },
    { m: "mo.4",  c: 58, d: 50 }, { m: "mo.5",  c: 61, d: 55 }, { m: "mo.6",  c: 55, d: 57 },
    { m: "mo.7",  c: 64, d: 58 }, { m: "mo.8",  c: 71, d: 62 }, { m: "mo.9",  c: 66, d: 69 }
  ];

  /* ------------------------------------------------ пользователи (6) ----- */
  EH.users = [
    { name: "Doston Ibragimov", login: "hududiy",  roleKey: "role.xodim",    org: "org.navoiy",  status: "active",  last: "2026-09-16 09:42" },
    { name: "Kamol Rahimov",    login: "rahbar",   roleKey: "role.rahbar",   org: "org.navoiy",  status: "active",  last: "2026-09-15 17:11" },
    { name: "Dilshod Karimov",  login: "prokuror", roleKey: "role.prokuror", org: "org.gp",      status: "active",  last: "2026-09-16 08:30" },
    { name: "Anna Meyer",       login: "binance",  roleKey: "role.company",  org: "org.binance", status: "active",  last: "2026-09-11 15:49" },
    { name: "Nodira Yusupova",  login: "hududiy2", roleKey: "role.xodim",    org: "org.navoiy",  status: "blocked", last: "2026-07-02 10:04" },
    { name: "System Operator",  login: "admin",    roleKey: "role.admin",    org: "org.ehamkor", status: "active",  last: "2026-09-16 07:55" }
  ];

  /* ----------------------------------------------------- файлы ----------- */
  EH.files = [
    { name: "EH-2026-0417_request_en.docx", doc: "EH-2026-0417", size: "248 KB", ver: 3, ts: "2026-09-15 08:05", sum: "9f2ac4…e18b" },
    { name: "EH-2026-0411_response.pdf",    doc: "EH-2026-0411", size: "1.4 MB", ver: 1, ts: "2026-09-15 11:03", sum: "3bd719…04ca" },
    { name: "EH-2026-0409_annex_1.xlsx",    doc: "EH-2026-0409", size: "86 KB",  ver: 2, ts: "2026-09-10 13:02", sum: "77e0b1…9d33" },
    { name: "EH-2026-0402_response.pdf",    doc: "EH-2026-0402", size: "2.1 MB", ver: 1, ts: "2026-09-01 10:08", sum: "c51a8f…7b20" },
    { name: "EH-2026-0405_request_en.docx", doc: "EH-2026-0405", size: "231 KB", ver: 2, ts: "2026-09-08 12:02", sum: "a04f6d…1e57" },
    { name: "EH-2026-0414_request_uz.docx", doc: "EH-2026-0414", size: "204 KB", ver: 4, ts: "2026-09-13 10:37", sum: "6e2b90…ff41" }
  ];

  /* ------------------------------------------------- настройки интерфейса */
  /* Пользовательские настройки лежат одним JSON: экран настроек растёт, и
     заводить отдельный ключ localStorage под каждый тумблер смысла нет.
     Значения по умолчанию описаны здесь же — при переносе на сервер этот
     объект становится таблицей user_preferences. */
  EH.prefDefaults = {
    density:    "normal",          /* normal | compact                        */
    motion:     "on",              /* on | off — сокращённые анимации         */
    dateFmt:    "dmy",             /* dmy | iso                               */
    start:      "dashboard.html",  /* раздел, открываемый после входа         */
    email:      "", phone: "", ext: "",

    chEmail: true, chSms: false, chTg: false,
    evQueue: true, evStatus: true, evAnswer: true,
    evDeadline: true, evLate: true, evRegistry: false,
    remind:     "3",               /* дней до срока                           */
    quiet:      false, quietFrom: "20:00", quietTo: "08:00",
    digest:     "daily",           /* off | daily | weekly                    */

    idle:       "30",              /* минут до автовыхода, never — не выходить */

    signDefault: true,

    docLang:    "auto",            /* auto | uz | ru | en                     */
    slaAuto:    true,
    newTab:     false,
    period:     "all",             /* пресет из js/period.js                  */
    sigBlock:   "",

    delegate:   false, delegateTo: "", delegateFrom: "", delegateEnd: ""
  };

  function readPrefs() {
    var raw = "", saved = {}, out = {}, k;
    try { raw = localStorage.getItem("eh_prefs") || ""; } catch (e) { raw = ""; }
    if (raw) { try { saved = JSON.parse(raw) || {}; } catch (e) { saved = {}; } }
    for (k in EH.prefDefaults) {
      out[k] = saved[k] === undefined ? EH.prefDefaults[k] : saved[k];
    }
    return out;
  }
  EH.prefs = readPrefs();

  /* Атрибуты на <html> — точка приложения настроек, которые меняют вид всего
     интерфейса; CSS разбирается с ними сам, перерисовывать страницу не нужно. */
  EH.applyPrefs = function () {
    var d = document.documentElement;
    d.setAttribute("data-density", EH.prefs.density);
    d.setAttribute("data-motion", EH.prefs.motion);
  };
  EH.setPref = function (k, v) {
    EH.prefs[k] = v;
    try { localStorage.setItem("eh_prefs", JSON.stringify(EH.prefs)); } catch (e) {}
    EH.applyPrefs();
  };
  EH.resetPrefs = function () {
    try { localStorage.removeItem("eh_prefs"); } catch (e) {}
    EH.prefs = readPrefs();
    EH.applyPrefs();
  };

  /* ------------------------------------------- сеансы, входы, сертификат -- */
  /* Демо-данные экрана настроек. В боевой системе сеансы приходят из бэкенда,
     сертификат — из E-IMZO, поэтому структура повторяет ожидаемые поля. */
  EH.sessions = [
    { id: "s1", device: "Chrome 128 · Windows 11", ip: "84.54.96.14",  city: "Navoiy",   ts: "2026-09-16 09:42", current: true },
    { id: "s2", device: "Safari · iPhone 14",      ip: "84.54.102.77", city: "Navoiy",   ts: "2026-09-15 18:20", current: false },
    { id: "s3", device: "Chrome 127 · Windows 10", ip: "213.230.75.9", city: "Toshkent", ts: "2026-09-11 11:05", current: false }
  ];
  EH.logins = [
    { ts: "2026-09-16 09:42", ip: "84.54.96.14",  ok: true },
    { ts: "2026-09-15 18:20", ip: "84.54.102.77", ok: true },
    { ts: "2026-09-14 08:03", ip: "84.54.96.14",  ok: true },
    { ts: "2026-09-12 21:14", ip: "185.139.44.2", ok: false }
  ];
  EH.cert = { serial: "5E0C 7A41 93BD 2F18", issuer: "O'zbekiston Respublikasi DXX RA", until: "2027-03-14", pwdChanged: "2026-06-02" };

})(window.EH = window.EH || {});
