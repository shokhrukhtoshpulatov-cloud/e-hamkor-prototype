/* Ish stoli — ролевой рабочий стол.
   Порядок блоков = порядок внимания: что делать сейчас → тренды → контекст. */
(function (EH) {
  "use strict";

  /* Спарклайны KPI: детерминированные ряды, производные от месячной динамики,
     чтобы при перезагрузке картинка не «прыгала». */
  function series(seed, base) {
    var out = [], v = base;
    for (var i = 0; i < 12; i++) {
      v = Math.max(1, v + ((seed * (i + 3) * 37) % 9) - 4);
      out.push(v);
    }
    return out;
  }

  function kpi(o) {
    return '<div class="stat reveal ' + (o.mod || "") + '">'
      + '<div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t(o.label)) + "</span>"
      + (o.icon ? EH.icon(o.icon, "ic-sm") : "") + "</div>"
      + '<div class="stat-row">'
      +   '<span class="stat-val" data-count="' + o.value + '">0</span>'
      +   '<span class="stat-spark">' + EH.sparkline(o.spark, o.color) + "</span>"
      + "</div>"
      + '<div class="stat-foot">' + EH.trendChip(o.delta, o.up, o.goodWhenUp) + "</div>"
      + "</div>";
  }

  function queueCard(tasks) {
    var body;
    if (!tasks.length) {
      body = '<div class="empty">' + EH.icon("checkc")
        + '<div class="empty-t">' + EH.esc(EH.t("db.empty.queue")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("db.empty.queue.d")) + "</div></div>";
    } else {
      body = tasks.slice(0, 6).map(function (t) {
        var d = t.doc;
        return '<a class="qrow p-' + t.prio + '" href="document-detail.html?id=' + encodeURIComponent(d.id) + '">'
          + '<span class="qrow-ic">' + EH.icon(EH.docTypeIcon(d.type)) + "</span>"
          + '<span class="qrow-b"><span class="qrow-t">' + EH.esc(EH.t(d.title)) + "</span>"
          + '<span class="qrow-m"><span class="num">' + EH.esc(d.id) + "</span>"
          + '<span class="dot-sep"></span>' + EH.esc(EH.t(t.key)) + "</span></span>"
          + '<span class="qrow-r">' + EH.deadlineCell(d.deadline, d.days, d.status) + EH.statusPill(d.status) + "</span>"
          + "</a>";
      }).join("");
    }
    return '<section class="card reveal reveal-2">'
      + '<div class="card-head"><div><h2>' + EH.esc(EH.t("db.queue")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("db.queue.sub")) + "</div></div>"
      + '<div class="card-head-r"><a class="btn btn-subtle btn-sm" href="tasks.html">' + EH.esc(EH.t("nav.tasks")) + EH.icon("right", "ic-sm") + "</a></div></div>"
      + body + "</section>";
  }

  function pipelineCard(st) {
    var rows = [
      { k: "st.sent",       v: st.sent,       c: "var(--c1)" },
      { k: "st.accepted",   v: st.accepted,   c: "var(--c2)" },
      { k: "st.answered",   v: st.answered,   c: "var(--c4)" },
      { k: "st.delivering", v: st.delivering, c: "var(--c6)" },
      { k: "st.completed",  v: st.completed,  c: "var(--c3)" }
    ];
    var max = rows.reduce(function (a, r) { return Math.max(a, r.v); }, 1);
    return '<section class="card reveal reveal-3">'
      + '<div class="card-head"><div><h2>' + EH.esc(EH.t("db.pipeline")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("db.pipeline.sub")) + "</div></div></div>"
      + '<div class="pipe">' + rows.map(function (r) {
          return '<div class="pipe-row"><div class="pipe-top">'
            + '<span class="pipe-lbl"><span class="dot" style="background:' + r.c + '"></span>' + EH.esc(EH.t(r.k)) + "</span>"
            + '<span class="pipe-val">' + r.v + "</span></div>"
            + '<div class="bar-track"><div class="bar-fill" style="width:' + Math.round(r.v / max * 100) + "%;background:" + r.c + '"></div></div></div>';
        }).join("") + "</div></section>";
  }

  /* Динамика вынесена в общий блок (js/trend.js): тот же график стоит
     в мониторинге руководства, и оформлять его дважды нельзя. */
  /* externalPeriod: кнопку периода рисуем в шапке страницы, а не в карточке */
  /* fill — карточка стоит в строке с «По статусам», та выше, и без подгонки
     под графиком остаётся пустая полоса. */
  var trend = EH.trendPanel({ id: "trend", cls: "reveal reveal-4", externalPeriod: true, fill: true });

  function donutCard(st) {
    var internal = Math.max(0, st.total - (st.sent + st.accepted + st.answered + st.completed));
    /* Сумма сегментов равна заявленному итогу — иначе визуализация врёт. */
    var segs = [
      { v: st.sent,      color: "var(--c1)", key: "st.sent" },
      { v: st.accepted,  color: "var(--c2)", key: "st.accepted" },
      { v: st.answered,  color: "var(--c4)", key: "st.answered" },
      { v: st.completed, color: "var(--c3)", key: "st.completed" },
      { v: internal,     color: "var(--c6)", key: "db.internal" }
    ].filter(function (s) { return s.v > 0; });

    var top = segs.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 3);
    return '<section class="card reveal reveal-5">'
      + '<div class="card-head"><div><h2>' + EH.esc(EH.t("db.donut")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("db.donut.sub")) + "</div></div></div>"
      + '<div style="display:flex;justify-content:center;padding:14px 0 6px">'
      + EH.donut(segs, EH.t("c.total"), st.total) + "</div>"
      + '<div class="legend">' + top.map(function (s) {
          return '<div class="legend-i"><div class="legend-n"><span class="dot" style="background:' + s.color + '"></span>'
            + EH.esc(EH.t(s.key)) + "</div>"
            + '<div class="legend-v"><span class="legend-p">' + Math.round(s.v / (st.total || 1) * 100) + "%</span>"
            + '<span class="legend-a">' + s.v + "</span></div></div>";
        }).join("") + "</div>"
      + '<div class="card-body" style="padding-top:0"><div class="note">' + EH.icon("info")
      + "<span>" + EH.esc(EH.t("db.weekly")) + ' <b class="num">' + Math.max(1, Math.round(st.total / 4)) + "</b></span></div></div>"
      + "</section>";
  }

  function activityCard(docs) {
    var rows = docs.slice().sort(function (a, b) { return a.updated < b.updated ? 1 : -1; }).slice(0, 6);
    return '<section class="card reveal reveal-6">'
      + '<div class="card-head"><div><h2>' + EH.esc(EH.t("db.activity")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("db.activity.sub")) + "</div></div>"
      + '<div class="card-head-r"><a class="btn btn-subtle btn-sm" href="documents.html">' + EH.esc(EH.t("nav.docs")) + EH.icon("right", "ic-sm") + "</a></div></div>"
      /* Колонок меньше, чем в реестре: карточка занимает 2/3 ширины и полный набор
         в неё не помещается — обрезанная таблица хуже, чем короткая. */
      + '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      + "<th>" + EH.esc(EH.t("c.number")) + "</th><th>" + EH.esc(EH.t("c.org")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.status")) + "</th><th>" + EH.esc(EH.t("c.deadline")) + "</th>"
      + "</tr></thead><tbody>" + rows.map(function (d) {
          var href = "document-detail.html?id=" + encodeURIComponent(d.id);
          return '<tr tabindex="0" data-href="' + href + '">'
            + '<td><span class="cell-main">' + EH.icon(EH.docTypeIcon(d.type), "ic-sm")
            + '<a class="id" href="' + href + '">' + EH.esc(d.id) + "</a></span>"
            + '<span class="sub">' + EH.esc(EH.t(d.title)) + "</span></td>"
            + "<td>" + EH.orgCell(d.org, { jur: false }) + "</td>"
            + "<td>" + EH.statusPill(d.status) + "</td>"
            + '<td class="nowrap">' + EH.deadlineCell(d.deadline, d.days, d.status) + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
  }

  function mapCard(docs) {
    var seen = {}, marks = [];
    docs.forEach(function (d) {
      if (d.status === "completed" || d.status === "draft") { return; }
      var c = EH.companyById(d.org);
      if (!c || seen[c.cc]) { return; }
      seen[c.cc] = 1;
      var lvl = EH.deadlineLevel(d.days, d.status);
      marks.push({ cc: c.cc, level: lvl === "late" ? "danger" : (lvl === "crit" || lvl === "near") ? "warn" : "ok", label: c.name });
    });
    return '<section class="card reveal reveal-6">'
      + '<div class="card-head"><div><h2>' + EH.esc(EH.t("db.map")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("db.map.sub")) + "</div></div></div>"
      + '<div class="card-body">' + EH.worldMapDecor(marks, { zoom: true }) + "</div>"
      + '<div class="card-foot"><div class="legend-row">'
      +   '<span class="li"><span class="dot" style="background:var(--accent)"></span>' + EH.esc(EH.t("cl.legendOk")) + "</span>"
      +   '<span class="li"><span class="dot" style="background:var(--warn)"></span>' + EH.esc(EH.t("kpi.near")) + "</span>"
      +   '<span class="li"><span class="dot" style="background:var(--danger)"></span>' + EH.esc(EH.t("kpi.late")) + "</span>"
      + "</div></div></section>";
  }

  window.PAGE = {
    key: "dashboard",
    crumb: "nav.dash",

    render: function () {
      var role = EH.state.role;
      var st = EH.computeStats(role);
      var docs = EH.visibleDocs(role);
      var tasks = EH.tasksFor(role);
      var showMap = role === "rahbar" || role === "prokuror";

      var head = '<div class="page-head">'
        + '<div class="page-head-l"><h1>' + EH.esc(EH.t("db.title." + role)) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("db.sub." + role)) + "</div></div>"
        + '<div class="page-head-r">'
        + '<span class="page-date">' + EH.icon("calendar", "ic-sm")
        + EH.esc(EH.fmtDate(EH.TODAY.getFullYear() + "-" + ("0" + (EH.TODAY.getMonth() + 1)).slice(-2) + "-" + ("0" + EH.TODAY.getDate()).slice(-2))) + "</span>"
        /* У партнёра карточки динамики нет, поэтому и фильтр периода не нужен */
        + (role === "company" ? "" : trend.periodHTML())
        + (role === "company" ? "" : '<a class="btn btn-primary" href="document-create.html">' + EH.icon("plus", "ic-sm") + EH.esc(EH.t("act.create")) + "</a>")
        + "</div></div>";

      var kpis = '<div class="grid g-4">'
        + kpi({ label: "kpi.pending",  value: st.pending,  delta: "12%", up: false, goodWhenUp: false, spark: series(3, 7),  color: "var(--c1)", icon: "flash" })
        + kpi({ label: "kpi.progress", value: st.progress, delta: "8%",  up: true,  goodWhenUp: true,  spark: series(5, 12), color: "var(--c2)", icon: "refresh", mod: "is-info" })
        + kpi({ label: "kpi.near",     value: st.near,     delta: "5%",  up: true,  goodWhenUp: false, spark: series(7, 4),  color: "var(--c4)", icon: "timer",  mod: "is-warn" })
        + kpi({ label: "kpi.late",     value: st.late,     delta: "3%",  up: false, goodWhenUp: false, spark: series(11, 3), color: "var(--c5)", icon: "alert",  mod: "is-danger" })
        + "</div>";

      /* Партнёр не должен видеть общесистемную динамику — это чужие цифры.
         Ему остаются очередь, собственный pipeline, свои документы и их статусы. */
      if (role === "company") {
        this._trend = false;
        return head + kpis
          + '<div class="grid g-21 mt-14">' + queueCard(tasks) + pipelineCard(st) + "</div>"
          + '<div class="grid g-21 mt-14">' + activityCard(docs) + donutCard(st) + "</div>";
      }

      this._trend = true;
      return head + kpis
        + '<div class="grid g-21 mt-14">' + queueCard(tasks) + pipelineCard(st) + "</div>"
        + '<div class="grid g-21 mt-14">' + trend.html() + donutCard(st) + "</div>"
        + '<div class="grid ' + (showMap ? "g-21" : "") + ' mt-14">' + activityCard(docs) + (showMap ? mapCard(docs) : "") + "</div>";
    },

    after: function (page) {
      if (!this._trend) { return; }
      trend.mount(page);
    }
  };

})(window.EH);
