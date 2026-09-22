/* Настройки. Раньше это был профиль с двумя тумблерами, но настроек в СЭД
   заведомо больше, чем помещается в одну карточку: интерфейс, уведомления,
   безопасность, ЭЦП, значения по умолчанию для документов и замещение на
   время отсутствия. Поэтому слева — оглавление, справа — один активный
   раздел; активный раздел живёт в хеше, на него можно дать ссылку.

   Всё, что можно применить без бэкенда, применяется по-настоящему и сразу:
   переключатель меняет EH.prefs и localStorage, кнопки «Сохранить» нет.
   Разделы, которых в прототипе физически нет (рассылка, 2ФА, E-IMZO),
   помечены явно — это честнее заглушки, которая делает вид, что работает. */
(function (EH) {
  "use strict";

  /* ------------------------------------------------------------ оглавление */
  var SECTIONS = [
    { id: "profile",  ic: "profile",    k: "st.s.profile" },
    { id: "iface",    ic: "settings",   k: "st.s.iface" },
    { id: "notif",    ic: "bell",       k: "st.s.notif" },
    { id: "security", ic: "shield",     k: "st.s.security" },
    { id: "sign",     ic: "stamp",      k: "st.s.sign", not: ["company"] },
    { id: "docs",     ic: "docs",       k: "st.s.docs" },
    { id: "delegate", ic: "usercheck",  k: "st.s.delegate" },
    { id: "demo",     ic: "flash",      k: "st.s.demo" }
  ];

  /* Разделы, доступные роли: у партнёра нет ни ЭЦП, ни внутренних коллег. */
  function sections() {
    return SECTIONS.filter(function (s) {
      return !s.not || s.not.indexOf(EH.state.role) < 0;
    });
  }

  /* Куда можно попасть сразу после входа — список синхронен навигации роли. */
  function startPages() {
    var isCompany = EH.state.role === "company";
    var list = [
      { h: "dashboard.html",  k: "nav.dash" },
      { h: "documents.html",  k: isCompany ? "nav.docsIn" : "nav.docs" },
      { h: "tasks.html",      k: "nav.tasks" },
      { h: "calendar.html",   k: "nav.calendar" },
      { h: "exchange.html",   k: "nav.exchange",   not: ["company"] },
      { h: "monitoring.html", k: "nav.monitoring", only: ["rahbar", "prokuror", "admin"] },
      { h: "files.html",      k: "nav.files" }
    ];
    return list.filter(function (p) {
      if (p.not && p.not.indexOf(EH.state.role) >= 0) { return false; }
      return !p.only || p.only.indexOf(EH.state.role) >= 0;
    });
  }

  /* Коллеги той же организации — кандидаты на замещение. */
  function colleagues() {
    var r = EH.state.roleObj;
    return EH.users.filter(function (u) {
      return u.org === r.org && u.name !== r.name && u.status === "active";
    });
  }

  function me() {
    var r = EH.state.roleObj;
    return EH.users.filter(function (x) { return x.name === r.name; })[0] || EH.users[0];
  }

  /* ---------------------------------------------------------- строки формы */
  /* Один и тот же каркас на все настройки: слева смысл и пояснение,
     справа ровно один орган управления. */
  function opt(titleKey, descKey, control, attrs) {
    /* Поле или список на узком экране занимают всю ширину и уходят под
       подпись; тумблер и пилюля остаются справа — им ширина не нужна. */
    var wide = /class="(select|input)"|<textarea/.test(control) ? " opt-wide" : "";
    return '<div class="opt' + wide + (attrs && attrs.cls ? " " + attrs.cls : "") + '"'
      + (attrs && attrs.dep ? ' data-dep="' + attrs.dep + '"' : "") + ">"
      + '<div class="opt-b"><div class="opt-t">' + EH.esc(EH.t(titleKey)) + "</div>"
      + (descKey ? '<div class="opt-d">' + EH.esc(EH.t(descKey)) + "</div>" : "")
      + "</div>"
      + '<div class="opt-c">' + control + "</div></div>";
  }

  function sw(pref, labelKey) {
    return '<button class="switch" role="switch" data-pref="' + pref + '" data-type="switch"'
      + ' aria-label="' + EH.esc(EH.t(labelKey)) + '" aria-checked="'
      + (EH.prefs[pref] ? "true" : "false") + '"></button>';
  }

  function seg(pref, items) {
    return '<div class="seg" data-pref="' + pref + '" data-type="seg">'
      + items.map(function (i) {
          return '<button data-v="' + EH.esc(i.v) + '" class="' + (String(EH.prefs[pref]) === String(i.v) ? "is-on" : "") + '">'
            + EH.esc(i.t || EH.t(i.k)) + "</button>";
        }).join("") + "</div>";
  }

  function select(pref, items, attrs) {
    var cur = String(EH.prefs[pref]);
    return '<select class="select" data-pref="' + pref + '" data-type="select"'
      + ' aria-label="' + EH.esc(EH.t((attrs && attrs.label) || pref)) + '"'
      + (attrs && attrs.disabled ? " disabled" : "") + ">"
      + items.map(function (i) {
          return '<option value="' + EH.esc(i.v) + '"' + (cur === String(i.v) ? " selected" : "") + ">"
            + EH.esc(i.t || EH.t(i.k)) + "</option>";
        }).join("") + "</select>";
  }

  function input(pref, type, attrs) {
    attrs = attrs || {};
    return '<input class="input" data-pref="' + pref + '" data-type="input" type="' + type + '"'
      + ' value="' + EH.esc(EH.prefs[pref] || attrs.def || "") + '"'
      + (attrs.ph ? ' placeholder="' + EH.esc(EH.t(attrs.ph)) + '"' : "")
      + (attrs.label ? ' aria-label="' + EH.esc(EH.t(attrs.label)) + '"' : "") + ">";
  }

  function card(titleKey, body, headRight) {
    return '<section class="card">'
      + '<div class="card-head"><h2>' + EH.esc(EH.t(titleKey)) + "</h2>"
      + (headRight ? '<div class="card-head-r">' + headRight + "</div>" : "") + "</div>"
      + '<div class="card-body">' + body + "</div></section>";
  }

  function note(key, kind) {
    return '<div class="note note-' + (kind || "accent") + '" style="margin-top:14px">'
      + EH.icon("info") + "<span>" + EH.esc(EH.t(key)) + "</span></div>";
  }

  /* ------------------------------------------------------------- разделы -- */
  function secProfile() {
    var r = EH.state.roleObj, u = me();
    var kv = [
      ["c.login",  '<span class="num">' + EH.esc(u.login) + "</span>"],
      ["c.role",   EH.esc(EH.t(r.key))],
      ["c.org",    EH.esc(EH.t(r.org))],
      ["c.lastSeen", '<span class="num">' + EH.esc(EH.fmtDateTime(u.last)) + "</span>"]
    ];

    return card("pr.data",
        '<div class="row" style="gap:16px;margin-bottom:20px">'
      +   EH.avatar(r.initials, r.color, "ava-xl")
      +   '<div style="min-width:0"><div class="strong" style="font-size:17px">' + EH.esc(r.name) + "</div>"
      +     '<div class="muted" style="font-size:13px;margin-bottom:8px">' + EH.esc(EH.t(r.roleKey)) + "</div>"
      +     '<button class="btn btn-subtle btn-sm js-stub">' + EH.icon("upload", "ic-sm")
      +       EH.esc(EH.t("st.pr.photo")) + "</button></div></div>"
      + '<div class="doc-meta">' + kv.map(function (x) {
          return '<div><div class="k">' + EH.esc(EH.t(x[0])) + '</div><div class="v">' + x[1] + "</div></div>";
        }).join("") + "</div>"
      + '<div class="note" style="margin-top:16px">' + EH.icon("lock")
      +   "<span>" + EH.esc(EH.t("st.pr.readonly")) + "</span></div>")

      + card("st.pr.contacts",
          opt("pr.email", null, input("email", "email", { def: u.login + "@e-hamkor.uz", label: "pr.email" }))
        + opt("pr.phone", null, input("phone", "tel", { def: "+998 (79) 223-14-0" + (EH.roles.indexOf(r) + 1), label: "pr.phone" }))
        + opt("st.pr.ext", null, input("ext", "text", { def: "2-14", label: "st.pr.ext" }))
        + note("st.pr.contactsD"));
  }

  function secIface() {
    var r = EH.state.roleObj;
    var langSelect = '<select class="select" id="prLang" aria-label="' + EH.esc(EH.t("menu.lang")) + '"'
      + (r.forceLang ? " disabled" : "") + ">"
      + EH.langs.map(function (l) {
          return '<option value="' + l + '"' + (l === EH.state.lang ? " selected" : "") + ">" + l.toUpperCase() + "</option>";
        }).join("") + "</select>";

    var themeSeg = '<div class="seg" id="prTheme">'
      + '<button data-v="light" class="' + (EH.state.theme === "light" ? "is-on" : "") + '">' + EH.esc(EH.t("menu.light")) + "</button>"
      + '<button data-v="dark" class="' + (EH.state.theme === "dark" ? "is-on" : "") + '">' + EH.esc(EH.t("menu.dark")) + "</button></div>";

    var sideSeg = '<div class="seg" id="prSide">'
      + '<button data-v="wide" class="' + (EH.state.side !== "rail" ? "is-on" : "") + '">' + EH.esc(EH.t("st.if.wide")) + "</button>"
      + '<button data-v="rail" class="' + (EH.state.side === "rail" ? "is-on" : "") + '">' + EH.esc(EH.t("st.if.rail")) + "</button></div>";

    return card("pr.prefs",
        opt("menu.lang", r.forceLang ? "menu.langLocked" : "st.if.langD", langSelect)
      + opt("menu.theme", "st.if.themeD", themeSeg)
      + opt("st.if.density", "st.if.densityD", seg("density", [
          { v: "normal", k: "st.if.normal" }, { v: "compact", k: "st.if.compact" }
        ]))
      + opt("st.if.side", "st.if.sideD", sideSeg)
      + opt("st.if.date", "st.if.dateD", seg("dateFmt", [
          { v: "dmy", t: "16.09.2026" }, { v: "iso", t: "2026-09-16" }
        ]))
      + opt("st.if.start", "st.if.startD", select("start", startPages().map(function (p) {
          return { v: p.h, k: p.k };
        }), { label: "st.if.start" }))
      + opt("st.if.motion", "st.if.motionD",
          '<button class="switch" role="switch" data-pref="motion" data-type="switch-inv"'
          + ' aria-label="' + EH.esc(EH.t("st.if.motion")) + '" aria-checked="'
          + (EH.prefs.motion === "off" ? "true" : "false") + '"></button>'));
  }

  function secNotif() {
    var days = ["1", "3", "5", "7"].map(function (d) {
      return { v: d, t: d + " " + EH.t("st.nt.dayUnit") };
    });

    return card("st.nt.channels",
        opt("st.nt.inapp", null, '<span class="pill pill-success">' + EH.esc(EH.t("st.nt.always")) + "</span>")
      + opt("st.nt.email", null, sw("chEmail", "st.nt.email"))
      + opt("st.nt.sms",   null, sw("chSms", "st.nt.sms"))
      + opt("st.nt.tg",    null, sw("chTg", "st.nt.tg"))
      + note("st.nt.note", "warn"))

      + card("st.nt.events",
          opt("st.nt.evQueue",    null, sw("evQueue", "st.nt.evQueue"))
        + opt("st.nt.evStatus",   null, sw("evStatus", "st.nt.evStatus"))
        + opt("st.nt.evAnswer",   null, sw("evAnswer", "st.nt.evAnswer"))
        + opt("st.nt.evDeadline", null, sw("evDeadline", "st.nt.evDeadline"))
        + opt("st.nt.evLate",     null, sw("evLate", "st.nt.evLate"))
        + (EH.state.role === "admin"
            ? opt("st.nt.evRegistry", null, sw("evRegistry", "st.nt.evRegistry")) : ""))

      + card("st.nt.remind",
          opt("st.nt.remind", "st.nt.remindD", select("remind", days, { label: "st.nt.remind" }))
        + opt("st.nt.quiet", "st.nt.quietD", sw("quiet", "st.nt.quiet"))
        + opt("st.nt.from", null,
              input("quietFrom", "time", { label: "st.nt.from" })
            + '<span class="muted" style="font-size:12.5px">' + EH.esc(EH.t("st.nt.to")).toLowerCase() + "</span>"
            + input("quietTo", "time", { label: "st.nt.to" }),
            { dep: "quiet" })
        + opt("st.nt.digest", "st.nt.digestD", seg("digest", [
            { v: "off", k: "st.nt.off" }, { v: "daily", k: "st.nt.daily" }, { v: "weekly", k: "st.nt.weekly" }
          ])));
  }

  function secSecurity() {
    var sess = EH.sessions.map(function (s) {
      return '<div class="sess" data-sess="' + s.id + '">'
        + '<div class="sess-ic">' + EH.icon(s.device.indexOf("iPhone") >= 0 ? "phone" : "grid") + "</div>"
        + '<div class="sess-b"><div class="sess-t">' + EH.esc(s.device) + "</div>"
        +   '<div class="sess-m"><span class="num">' + EH.esc(s.ip) + "</span><span>" + EH.esc(s.city) + "</span>"
        +   '<span class="num">' + EH.esc(EH.fmtDateTime(s.ts)) + "</span></div></div>"
        + (s.current
            ? '<span class="pill pill-success">' + EH.esc(EH.t("st.sc.current")) + "</span>"
            : '<button class="btn btn-subtle btn-sm js-end" data-sess="' + s.id + '">'
              + EH.icon("close", "ic-sm") + EH.esc(EH.t("st.sc.end")) + "</button>")
        + "</div>";
    }).join("");

    var logins = EH.logins.map(function (l) {
      return "<tr><td class=\"num nowrap\">" + EH.esc(EH.fmtDateTime(l.ts)) + "</td>"
        + '<td class="num">' + EH.esc(l.ip) + "</td>"
        + '<td class="t-r">' + (l.ok
            ? '<span class="pill pill-success">' + EH.esc(EH.t("st.sc.ok")) + "</span>"
            : '<span class="pill pill-danger">' + EH.esc(EH.t("st.sc.fail")) + "</span>") + "</td></tr>";
    }).join("");

    var idle = [{ v: "15", t: "15 " + EH.t("st.sc.min") }, { v: "30", t: "30 " + EH.t("st.sc.min") },
                { v: "60", t: "60 " + EH.t("st.sc.min") }, { v: "never", k: "st.sc.never" }];

    return card("pr.security",
        opt("pr.2fa", "st.sc.2faD",
            '<span class="pill pill-outline">' + EH.esc(EH.t("st.nt.off")) + "</span>"
          + '<button class="btn btn-subtle btn-sm js-stub">' + EH.icon("key", "ic-sm") + EH.esc(EH.t("act.open")) + "</button>")
      + opt("pr.pwd", null,
            '<span class="muted" style="font-size:12.5px">' + EH.esc(EH.t("st.sc.pwdD")) + ": "
          + '<span class="num">' + EH.esc(EH.fmtDate(EH.cert.pwdChanged)) + "</span></span>"
          + '<button class="btn btn-subtle btn-sm js-stub">' + EH.icon("lock", "ic-sm") + EH.esc(EH.t("act.open")) + "</button>")
      + opt("st.sc.idle", "st.sc.idleD", select("idle", idle, { label: "st.sc.idle" })))

      + card("st.sc.sessions", sess,
          '<button class="btn btn-subtle btn-sm" id="prEndAll">' + EH.icon("logout", "ic-sm")
          + EH.esc(EH.t("st.sc.endAll")) + "</button>")

      + '<section class="card"><div class="card-head"><h2>' + EH.esc(EH.t("st.sc.logins")) + "</h2></div>"
      + '<div class="tbl-wrap"><table class="tbl"><tbody>' + logins + "</tbody></table></div></section>";
  }

  function secSign() {
    var r = EH.state.roleObj;
    var left = EH.daysLeft(EH.cert.until);
    var kv = [
      ["st.sg.owner",  EH.esc(r.name)],
      ["st.sg.serial", '<span class="num">' + EH.esc(EH.cert.serial) + "</span>"],
      ["st.sg.issuer", EH.esc(EH.cert.issuer)],
      ["st.sg.valid",  '<span class="num">' + EH.esc(EH.fmtDate(EH.cert.until)) + "</span> "
                       + '<span class="pill pill-success">' + EH.fmtNum(left) + " " + EH.esc(EH.t("st.sg.left")) + "</span>"]
    ];

    return card("st.sg.cert",
        '<div class="doc-meta">' + kv.map(function (x) {
          return '<div><div class="k">' + EH.esc(EH.t(x[0])) + '</div><div class="v">' + x[1] + "</div></div>";
        }).join("") + "</div>"
      + '<hr class="rule" style="margin:16px 0">'
      + opt("st.sg.plugin", null,
            '<span class="pill pill-success">' + EH.esc(EH.t("st.sg.connected")) + "</span>"
          + '<button class="btn btn-subtle btn-sm js-stub">' + EH.icon("refresh", "ic-sm") + EH.esc(EH.t("st.sg.check")) + "</button>")
      + opt("st.sg.default", "st.sg.defaultD", sw("signDefault", "st.sg.default"))
      + '<div class="row" style="margin-top:16px">'
      +   '<button class="btn btn-subtle btn-sm js-stub">' + EH.icon("sign", "ic-sm") + EH.esc(EH.t("st.sg.renew")) + "</button>"
      + "</div>"
      + note("st.sg.note"));
  }

  function secDocs() {
    var langs = [{ v: "auto", k: "st.dc.auto" }].concat(EH.langs.map(function (l) {
      return { v: l, t: l.toUpperCase() };
    }));

    return card("st.s.docs",
        opt("st.dc.lang", "st.dc.langD", select("docLang", langs, { label: "st.dc.lang" }))
      + opt("st.dc.sla", "st.dc.slaD", sw("slaAuto", "st.dc.sla"))
      + opt("st.dc.newTab", "st.dc.newTabD", sw("newTab", "st.dc.newTab"))
      + opt("st.dc.period", "st.dc.periodD", select("period", [
          { v: "all", k: "period.all" }, { v: "days7", k: "period.days7" },
          { v: "days30", k: "period.days30" }, { v: "thisMonth", k: "period.thisMonth" }
        ], { label: "st.dc.period" }))
      + '<div class="opt opt-col"><div class="opt-b"><div class="opt-t">' + EH.esc(EH.t("st.dc.sig")) + "</div>"
      +   '<div class="opt-d">' + EH.esc(EH.t("st.dc.sigD")) + "</div></div>"
      +   '<div class="opt-c"><textarea class="input" rows="3" data-pref="sigBlock" data-type="input"'
      +     ' aria-label="' + EH.esc(EH.t("st.dc.sig")) + '">' + EH.esc(EH.prefs.sigBlock) + "</textarea></div></div>");
  }

  function secDelegate() {
    var list = colleagues();
    var who = list.length
      ? '<select class="select" data-pref="delegateTo" data-type="select" aria-label="' + EH.esc(EH.t("st.dl.who")) + '">'
        + '<option value="">' + EH.esc(EH.t("st.dl.pick")) + "</option>"
        + list.map(function (u) {
            return '<option value="' + EH.esc(u.login) + '" data-sub="' + EH.esc(EH.t(u.roleKey)) + '"'
              + (EH.prefs.delegateTo === u.login ? " selected" : "") + ">" + EH.esc(u.name) + "</option>";
          }).join("") + "</select>"
      : '<span class="muted" style="font-size:12.5px">' + EH.esc(EH.t("st.dl.none")) + "</span>";

    return card("st.s.delegate",
        opt("st.dl.on", "st.dl.onD", sw("delegate", "st.dl.on"))
      + opt("st.dl.who", null, who, { dep: "delegate" })
      + opt("st.dl.from", null, input("delegateFrom", "date", { label: "st.dl.from" }), { dep: "delegate" })
      + opt("st.dl.to", null, input("delegateEnd", "date", { label: "st.dl.to" }), { dep: "delegate" })
      + note("st.dl.note"));
  }

  function secDemo() {
    var r = EH.state.roleObj;
    return card("st.dm.role",
        '<div class="spread"><div class="row" style="gap:12px">' + EH.avatar(r.initials, r.color)
      +   '<div><div class="strong">' + EH.esc(r.name) + "</div>"
      +   '<div class="muted" style="font-size:12.5px">' + EH.esc(EH.t(r.key)) + "</div></div></div>"
      +   '<a class="btn btn-subtle btn-sm" href="index.html">' + EH.icon("users", "ic-sm")
      +     EH.esc(EH.t("st.dm.switch")) + "</a></div>"
      + '<div class="opt-d" style="margin-top:10px">' + EH.esc(EH.t("st.dm.roleD")) + "</div>")

      + card("pr.demo",
          '<div class="note note-warn">' + EH.icon("alert") + "<span>" + EH.esc(EH.t("pr.demoD")) + "</span></div>"
        + '<button class="btn btn-danger" id="prReset" style="width:100%;margin-top:12px">'
        +   EH.icon("refresh", "ic-sm") + EH.esc(EH.t("pr.reset")) + "</button>"
        + '<hr class="rule" style="margin:16px 0">'
        + opt("st.dm.resetPrefs", "st.dm.resetPrefsD",
            '<button class="btn btn-subtle btn-sm" id="prResetPrefs">' + EH.icon("return", "ic-sm")
            + EH.esc(EH.t("act.reset")) + "</button>")
        + opt("st.dm.build", null, '<span class="num muted">' + EH.esc(EH.BUILD) + "</span>"));
  }

  var BODY = {
    profile: secProfile, iface: secIface, notif: secNotif, security: secSecurity,
    sign: secSign, docs: secDocs, delegate: secDelegate, demo: secDemo
  };

  window.PAGE = {
    key: "profile",
    crumb: "nav.settings",

    render: function () {
      var list = sections();
      var cur = (location.hash || "").replace("#", "");
      if (!list.some(function (s) { return s.id === cur; })) { cur = list[0].id; }

      var nav = list.map(function (s) {
        return '<button data-sec="' + s.id + '" class="' + (s.id === cur ? "is-on" : "") + '">'
          + EH.icon(s.ic) + "<span>" + EH.esc(EH.t(s.k)) + "</span></button>";
      }).join("");

      var body = list.map(function (s) {
        return '<div class="set-sec stack" data-sec="' + s.id + '"' + (s.id === cur ? "" : " hidden") + ">"
          + BODY[s.id]() + "</div>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("st.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("st.sub")) + "</div></div>"
        + '<div class="page-head-r"><span class="eyebrow">' + EH.esc(EH.t("st.autoSaved")) + "</span></div></div>"
        + '<div class="set">'
        + '<aside class="card set-nav reveal">' + nav + "</aside>"
        + '<div class="set-body reveal reveal-2">' + body + "</div></div>";
    },

    after: function (page) {
      /* ---- переключение разделов: хеш держит состояние, ссылка работает --- */
      function show(id) {
        page.querySelectorAll(".set-nav [data-sec]").forEach(function (b) {
          b.classList.toggle("is-on", b.getAttribute("data-sec") === id);
        });
        page.querySelectorAll(".set-sec").forEach(function (s) {
          s.hidden = s.getAttribute("data-sec") !== id;
        });
      }
      page.querySelectorAll(".set-nav [data-sec]").forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-sec");
          history.replaceState(null, "", "#" + id);
          show(id);
        });
      });
      window.addEventListener("hashchange", function () {
        var id = (location.hash || "").replace("#", "");
        if (page.querySelector('.set-sec[data-sec="' + id + '"]')) { show(id); }
      });

      /* ---- зависимые строки гаснут вместе с родительским тумблером ------- */
      function syncDeps() {
        page.querySelectorAll("[data-dep]").forEach(function (el) {
          el.classList.toggle("is-off", !EH.prefs[el.getAttribute("data-dep")]);
        });
      }
      syncDeps();

      /* ---- общая проводка: тумблер, сегмент, список, поле ---------------- */
      page.querySelectorAll('[data-type="switch"], [data-type="switch-inv"]').forEach(function (b) {
        b.addEventListener("click", function () {
          var on = b.getAttribute("aria-checked") !== "true";
          b.setAttribute("aria-checked", on ? "true" : "false");
          var inv = b.getAttribute("data-type") === "switch-inv";
          EH.setPref(b.getAttribute("data-pref"), inv ? (on ? "off" : "on") : on);
          syncDeps();
        });
      });
      page.querySelectorAll('.seg[data-type="seg"]').forEach(function (g) {
        g.querySelectorAll("button").forEach(function (b) {
          b.addEventListener("click", function () {
            g.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-on"); });
            b.classList.add("is-on");
            EH.setPref(g.getAttribute("data-pref"), b.getAttribute("data-v"));
          });
        });
      });
      page.querySelectorAll('[data-type="select"]').forEach(function (s) {
        s.addEventListener("change", function () { EH.setPref(s.getAttribute("data-pref"), s.value); });
      });
      page.querySelectorAll('[data-type="input"]').forEach(function (i) {
        /* поля пишутся по потере фокуса: сохранять каждую букву незачем */
        i.addEventListener("change", function () {
          EH.setPref(i.getAttribute("data-pref"), i.value);
          EH.toast(EH.t("ts.saved"), "success");
        });
      });

      /* ---- язык, тема и сайдбар живут в оболочке, а не в настройках ------ */
      var lang = page.querySelector("#prLang");
      if (lang && !lang.disabled) {
        lang.addEventListener("change", function () { EH.setLang(lang.value); });
      }
      var theme = page.querySelector("#prTheme");
      if (theme) {
        theme.querySelectorAll("button").forEach(function (b) {
          b.addEventListener("click", function () {
            theme.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-on"); });
            b.classList.add("is-on");
            EH.setTheme(b.getAttribute("data-v"));
          });
        });
      }
      var side = page.querySelector("#prSide");
      if (side) {
        side.querySelectorAll("button").forEach(function (b) {
          b.addEventListener("click", function () {
            side.querySelectorAll("button").forEach(function (x) { x.classList.remove("is-on"); });
            b.classList.add("is-on");
            if (EH.setSide) { EH.setSide(b.getAttribute("data-v")); }
          });
        });
      }

      /* ---- сеансы -------------------------------------------------------- */
      page.querySelectorAll(".js-end").forEach(function (b) {
        b.addEventListener("click", function () {
          var row = page.querySelector('.sess[data-sess="' + b.getAttribute("data-sess") + '"]');
          if (row) { row.classList.add("is-gone"); }
          EH.toast(EH.t("st.sc.ended"), "success");
        });
      });
      var endAll = page.querySelector("#prEndAll");
      if (endAll) {
        endAll.addEventListener("click", function () {
          page.querySelectorAll(".sess").forEach(function (s) {
            if (!s.querySelector(".pill-success")) { s.classList.add("is-gone"); }
          });
          EH.toast(EH.t("st.sc.endedAll"), "success");
        });
      }

      /* ---- демо ---------------------------------------------------------- */
      page.querySelector("#prReset").addEventListener("click", function () {
        EH.resetDemo();
        try { sessionStorage.setItem("eh_flash", "ts.resetOk"); } catch (e) {}
        location.reload();
      });
      page.querySelector("#prResetPrefs").addEventListener("click", function () {
        EH.resetPrefs();
        try { sessionStorage.setItem("eh_flash", "st.prefsReset"); } catch (e) {}
        location.reload();
      });

      page.querySelectorAll(".js-stub").forEach(function (b) {
        b.addEventListener("click", function () { EH.toast(EH.t("ts.soon")); });
      });
    }
  };

})(window.EH);
