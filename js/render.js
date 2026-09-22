/* ============================================================================
   render.js — хелперы разметки и форматирования.
   Всё, что встречается на двух и более экранах, живёт здесь, чтобы статус,
   дата и организация выглядели одинаково во всём интерфейсе.
   ========================================================================= */
(function (EH) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  EH.esc = esc;

  /* ------------------------------------------------------ форматирование - */
  EH.fmtDate = function (v) {
    if (!v) { return "—"; }
    var p = String(v).split(" ")[0].split("-");
    if (p.length !== 3) { return String(v); }
    /* формат выбирается в настройках: ведомственный 16.09.2026 или ISO */
    if (EH.prefs && EH.prefs.dateFmt === "iso") { return p.join("-"); }
    return p[2] + "." + p[1] + "." + p[0];
  };
  EH.fmtDateTime = function (v) {
    if (!v) { return "—"; }
    var s = String(v).split(" ");
    return EH.fmtDate(s[0]) + (s[1] ? " " + s[1] : "");
  };
  /* Относительное время ленты уведомлений: свежее читается быстрее даты. */
  EH.fmtAgo = function (v) {
    var d = EH.daysLeft(String(v).split(" ")[0]);
    if (d >= 0) { return EH.t("nt.today"); }
    if (d === -1) { return EH.t("nt.yest"); }
    if (d > -7) { return Math.abs(d) + " " + EH.t("nt.ago"); }
    return EH.fmtDate(v);
  };
  EH.fmtNum = function (n) {
    var sep = EH.state && EH.state.lang === "en" ? "," : " ";
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  };
  EH.fmtMonth = function (m0) {
    return EH.t("mo." + (m0 + 1));
  };

  /* ------------------------------------------------------------- флаги --- */
  EH.flag = function (cc) {
    if (!cc) { return ""; }
    var e = String(cc).toUpperCase().replace(/./g, function (c) {
      return String.fromCodePoint(127397 + c.charCodeAt(0));
    });
    return '<span class="flagchip" aria-hidden="true">' + e + "</span>";
  };

  /* ------------------------------------------------------ логотип системы - */
  /* Надпись в фирменном логотипе белая — она рассчитана на тёмный фон. Поэтому
     два варианта знака-с-надписью (под каждую тему) плюс отдельный знак для
     свёрнутого сайдбара; какой показать, решает CSS по data-theme — смена темы
     не требует перерисовки. */
  /* версия в адресе — чтобы после смены файлов логотипа браузер не показал старые */
  var LOGO_V = "4";
  EH.brandLogo = function (cls) {
    return '<span class="brand-lockup' + (cls ? " " + cls : "") + '">'
      + '<img class="is-light" src="assets/ehamkor-lockup-light.svg?v=' + LOGO_V + '" alt="">'
      + '<img class="is-dark" src="assets/ehamkor-lockup-dark.svg?v=' + LOGO_V + '" alt="">'
      + '<img class="is-mark" src="assets/ehamkor-mark.svg?v=' + LOGO_V + '" alt="">'
      + "</span>";
  };

  /* ------------------------------------------------- логотип компании --- */
  /* Квадратная плитка: знак с официального сайта, а если его нет — буквы.
     Плитка одного размера в обоих случаях, поэтому строки таблицы не прыгают. */
  EH.companyLogo = function (companyId, cls) {
    var c = EH.companyById(companyId);
    if (!c) { return ""; }
    var src = (EH.logos || {})[c.id];
    var k = "logo-sq" + (cls ? " " + cls : "");
    if (src) {
      return '<span class="' + k + '"><img src="' + src + '" alt="" loading="lazy"></span>';
    }
    var letters = c.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
    return '<span class="' + k + ' is-text">' + esc(letters) + "</span>";
  };

  /* -------------------------------------------------------- организация -- */
  EH.orgCell = function (companyId, opts) {
    opts = opts || {};
    var c = EH.companyById(companyId);
    if (!c) { return '<span class="muted">—</span>'; }
    return '<span class="org-cell">' + (opts.logo === false ? EH.flag(c.cc) : EH.companyLogo(c.id))
      + '<span class="n">' + esc(c.name) + "</span>"
      + (opts.jur === false ? "" : '<span class="j">' + esc(c.country) + "</span>")
      + "</span>";
  };

  /* -------------------------------------------------------------- статус - */
  EH.statusPill = function (status) {
    var s = EH.statuses[status];
    if (!s) { return ""; }
    return '<span class="pill ' + s.cls + '">' + esc(EH.t(s.key)) + "</span>";
  };

  EH.docTypeLabel = function (type) {
    for (var i = 0; i < EH.docTypes.length; i++) {
      if (EH.docTypes[i].id === type) { return EH.t(EH.docTypes[i].key); }
    }
    return type;
  };
  EH.docTypeIcon = function (type) {
    for (var i = 0; i < EH.docTypes.length; i++) {
      if (EH.docTypes[i].id === type) { return EH.docTypes[i].icon; }
    }
    return "docs";
  };

  /* --------------------------------------------------------------- срок -- */
  EH.deadlineCell = function (date, days, status) {
    var lvl = EH.deadlineLevel(days, status);
    var pill = "";
    if (lvl === "late") {
      pill = '<span class="pill pill-danger">' + Math.abs(days) + " " + esc(EH.t("c.overdue")) + "</span>";
    } else if (lvl === "crit") {
      pill = '<span class="pill pill-warn">' + (days === 0 ? esc(EH.t("c.dueToday")) : days + " " + esc(EH.t("c.daysLeft"))) + "</span>";
    } else if (lvl === "near") {
      pill = '<span class="pill pill-warn">' + days + " " + esc(EH.t("c.daysLeft")) + "</span>";
    } else if (lvl === "ok") {
      pill = '<span class="pill pill-outline">' + days + " " + esc(EH.t("c.daysLeft")) + "</span>";
    }
    return '<span class="row-tight"><span class="num">' + EH.fmtDate(date) + "</span>" + pill + "</span>";
  };

  /* ------------------------------------------------------ строка таблицы - */
  EH.docRow = function (d) {
    var href = "document-detail.html?id=" + encodeURIComponent(d.id);
    /* «открывать в новой вкладке» из настроек: реестр остаётся на экране */
    var tgt = EH.prefs && EH.prefs.newTab ? ' target="_blank" rel="noopener"' : "";
    return '<tr tabindex="0" data-href="' + href + '">'
      + '<td><span class="cell-main">' + EH.icon(EH.docTypeIcon(d.type), "ic-sm")
      + '<a class="id" href="' + href + '"' + tgt + ">" + esc(d.id) + "</a></span>"
      + '<span class="sub">' + esc(EH.t(d.title)) + "</span></td>"
      + "<td>" + EH.orgCell(d.org) + "</td>"
      + '<td class="nowrap">' + esc(EH.docTypeLabel(d.type)) + "</td>"
      + "<td>" + EH.statusPill(d.status) + "</td>"
      + '<td class="nowrap">' + EH.deadlineCell(d.deadline, d.days, d.status) + "</td>"
      + '<td class="nowrap num muted">' + EH.fmtDate(d.updated) + "</td>"
      + "</tr>";
  };

  /* ------------------------------------------------- фильтры по реестру -- */
  /* Не разделы навигации, а фильтры одного реестра — так задумано в ИА. */
  var GROUPS = {
    all:      function () { return true; },
    inbox:    function (d) { return d.status === "answered" || d.status === "delivering"; },
    outbox:   function (d) { return d.status === "sent" || d.status === "accepted" || d.status === "approved" || d.status === "review"; },
    draft:    function (d) { return d.status === "draft"; },
    returned: function (d) { return d.status === "returned"; },
    done:     function (d) { return d.status === "completed"; }
  };
  EH.docFilters = ["all", "inbox", "outbox", "draft", "returned", "done"];
  EH.filterDocs = function (filter, role) {
    var f = GROUPS[filter] || GROUPS.all;
    return EH.visibleDocs(role || (EH.state && EH.state.role) || "xodim").filter(f);
  };

  /* ----------------------------------------------------- тренд-чип KPI --- */
  /* Цвет определяется смыслом метрики, а не направлением стрелки:
     рост просрочки — это плохо, поэтому goodWhenUp=false даёт красный. */
  EH.trendChip = function (label, up, goodWhenUp) {
    var good = (!!up === !!goodWhenUp);
    /* Знак показывает направление, цвет — смысл. Только цветом полагаться нельзя. */
    return '<span class="chip ' + (good ? "chip-up" : "chip-down") + '">'
      + '<span class="dot"></span><span class="val">' + (up ? "+" : "\u2212") + esc(label) + "</span>"
      + '<span class="rest">' + esc(EH.t("tr.vsLast")) + "</span></span>";
  };

  /* ---------------------------------------------------- параметры URL ---- */
  EH.qs = function (name, def) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : (def === undefined ? "" : def);
  };

  /* ------------------------------------------------------------ прочее --- */
  EH.avatar = function (initials, color, cls) {
    return '<span class="ava ' + (cls || "") + '" style="background:' + esc(color) + '">' + esc(initials) + "</span>";
  };
  EH.initials = function (name) {
    return String(name).split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase();
  };
  EH.prioPill = function (prio) {
    var cls = prio === "high" ? "pill-danger" : prio === "mid" ? "pill-warn" : "pill-outline";
    return '<span class="pill ' + cls + '">' + esc(EH.t("tk.prio." + prio)) + "</span>";
  };

})(window.EH = window.EH || {});
