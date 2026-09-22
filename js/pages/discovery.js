/* Дашборд — сводка «Крипто-активлар орқали четга чиқиб кетган пул маблағлари».

   Все числа берутся из EH.crypto (tools/gen_crypto.py ← tools/data/crypto.xlsx),
   поэтому карта, рейтинг, таблица и KPI не могут разойтись между собой.
   Страница держит одно состояние — показатель, выбранный регион, подсвеченная
   биржа, сортировка — и любое действие просто перерисовывает зависимые блоки. */
(function (EH) {
  "use strict";

  var D = EH.crypto;
  var METRICS = ["crimes", "card", "damage", "cases", "amount"];
  var MONEY = { damage: 1, amount: 1 };
  var TONE = { crimes: "", card: "", damage: "is-danger", cases: "is-gold", amount: "is-info" };

  var state = { metric: "amount", selected: null, exchange: null, sort: { f: "amount", dir: -1 } };
  var map = null;
  var root = null;

  /* ------------------------------------------------------ форматирование */
  function dec() { return EH.state.lang === "en" ? "." : ","; }
  function fixed(v, n) { return v.toFixed(n).replace(".", dec()); }

  /* 981 399 590 381 → «981,4 mlrd»; без валюты — для подписей на карте и легенды */
  function money(v, withCur) {
    if (v === null || v === undefined) { return EH.t("an.noData"); }
    var steps = [[1e12, "an.u.trn"], [1e9, "an.u.bn"], [1e6, "an.u.mn"], [1e3, "an.u.k"]];
    var out = EH.fmtNum(v);
    for (var i = 0; i < steps.length; i++) {
      if (Math.abs(v) >= steps[i][0]) {
        var x = v / steps[i][0];
        out = fixed(x, x >= 1000 ? 0 : 1) + " " + EH.t(steps[i][1]);
        break;
      }
    }
    return withCur ? out + " " + EH.t("an.u.cur") : out;
  }
  function moneyParts(v) {
    var s = money(v, true);
    var i = s.indexOf(" ");
    return i < 0 ? { n: s, u: "" } : { n: s.slice(0, i), u: s.slice(i + 1) };
  }
  function pct(x) {
    if (x === null || x === undefined || isNaN(x)) { return "—"; }
    if (x > 0 && x < 0.001) { return "<" + fixed(0.1, 1) + "%"; }
    return fixed(x * 100, x >= 0.995 || x === 0 ? 0 : 1) + "%";
  }
  function fmt(f, v, cur) {
    if (v === null || v === undefined) { return EH.t("an.noData"); }
    return MONEY[f] ? money(v, cur) : EH.fmtNum(v);
  }
  function tpl(key, vars) {
    return EH.t(key).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ""; });
  }
  function esc(s) { return EH.esc(s); }

  /* ------------------------------------------------------------- данные */
  function row(k) {
    for (var i = 0; i < D.rows.length; i++) { if (D.rows[i].key === k) { return D.rows[i]; } }
    return null;
  }
  function values(f) {
    var o = {};
    D.rows.forEach(function (r) { o[r.key] = r[f]; });
    return o;
  }
  function ratio(a, b) { return a === null || b === null || !b ? null : a / b; }

  /* место региона по показателю среди регионов, где он известен */
  function rankOf(k, f) {
    var known = D.rows.filter(function (r) { return r[f] !== null; })
      .sort(function (a, b) { return b[f] - a[f]; });
    for (var i = 0; i < known.length; i++) { if (known[i].key === k) { return { r: i + 1, n: known.length }; } }
    return null;
  }

  function exByName(name) {
    for (var i = 0; i < D.exchanges.length; i++) { if (D.exchanges[i].name === name) { return D.exchanges[i]; } }
    return { name: name, type: "other" };
  }
  /* логотип из реестра организаций, если биржа там есть, иначе буквенная плитка */
  function exLogo(e, cls) {
    if (e.company && EH.companyLogo) { return EH.companyLogo(e.company, cls); }
    var letters = e.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
    return '<span class="logo-sq is-text' + (cls ? " " + cls : "") + '">' + esc(letters) + "</span>";
  }

  /* --------------------------------------------------------------- KPI */
  function kpis() {
    var T = D.totals;
    var dmgRows = D.rows.filter(function (r) { return r.damage !== null && r.card; });
    var dmgAvg = dmgRows.reduce(function (a, r) { return a + r.damage; }, 0)
      / (dmgRows.reduce(function (a, r) { return a + r.card; }, 0) || 1);

    var foot = {
      crimes: D.rows.length + " " + esc(EH.t("an.regionsN")),
      card:   "<b>" + pct(ratio(T.card, T.crimes)) + "</b> " + esc(EH.t("an.ofTotal")),
      damage: "<b>" + esc(money(dmgAvg)) + "</b> " + esc(EH.t("an.perCrime")),
      cases:  "<b>" + pct(ratio(T.cases, T.card)) + "</b> " + esc(EH.t("an.ofCard")),
      amount: "<b>" + esc(money(T.amount / (T.cases || 1))) + "</b> " + esc(EH.t("an.perCase"))
    };

    return '<div class="grid an-kpis">' + METRICS.map(function (f, i) {
      var v = MONEY[f] ? moneyParts(T[f]) : { n: EH.fmtNum(T[f]), u: "" };
      return '<div class="stat reveal reveal-' + (i + 1) + " " + TONE[f] + (f === state.metric ? " is-cur" : "") + '"'
        + ' data-metric="' + f + '" role="button" tabindex="0">'
        + '<div class="stat-top"><span class="eyebrow">' + esc(EH.t("an.m." + f)) + "</span></div>"
        + '<div class="stat-row"><span class="stat-val">' + esc(v.n) + (v.u ? "<small>" + esc(v.u) + "</small>" : "") + "</span></div>"
        + '<div class="stat-foot">' + foot[f] + "</div></div>";
    }).join("") + "</div>";
  }

  /* -------------------------------------------------------------- карта */
  function mapCard() {
    var seg = METRICS.map(function (f) {
      return '<button class="' + (f === state.metric ? "is-on" : "") + '" data-metric="' + f + '">'
        + esc(EH.t("an.ms." + f)) + "</button>";
    }).join("");
    return '<section class="card reveal reveal-2">'
      + '<div class="card-head an-map-head"><div><h2>' + esc(EH.t("an.map")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("an.mapSub")) + " · " + esc(EH.t("an.hint")) + "</div></div>"
      + '<div class="seg an-metric" id="anMetric">' + seg + "</div></div>"
      + '<div class="an-map-body" id="anMap"></div>'
      + '<div class="card-foot"><div class="uz-legend" id="anLegend"></div>'
      + '<span class="faint" style="font-size:11.5px">Natural Earth</span></div>'
      + "</section>";
  }

  /* ------------------------------------------------------- панель региона */
  function funnel(r) {
    var base = r.crimes || 1;
    var steps = [["crimes", r.crimes], ["card", r.card], ["cases", r.cases]];
    return '<div class="an-funnel">' + steps.map(function (s, i) {
      var w = s[1] === null ? 0 : Math.max(1, Math.round(s[1] / base * 100));
      var conv = i === 0 ? "" : pct(ratio(s[1], steps[i - 1][1]));
      return '<div class="an-fn"><span class="an-fn-l">' + esc(EH.t("an.ms." + s[0])) + "</span>"
        + '<span class="an-fn-b"><i style="width:' + w + "%;background:var(--c" + (i + 1) + ')"></i></span>'
        + '<span class="an-fn-v">' + (s[1] === null ? '<span class="an-na">—</span>' : EH.fmtNum(s[1])) + "</span>"
        + (i ? '<span class="an-fn-p">→ ' + conv + "</span>" : "")
        + "</div>";
    }).join("") + "</div>";
  }

  function detailCard() {
    var k = state.selected;
    var r = k ? row(k) : null;
    var T = D.totals;
    var src = r || { crimes: T.crimes, card: T.card, damage: T.damage, cases: T.cases, amount: T.amount };
    var rk = r ? rankOf(k, state.metric) : null;

    var head = '<div class="card-head"><div><h2>' + (r ? "" : EH.icon("flag", "ic-sm"))
      + esc(r ? EH.t("rg." + k) : EH.t("an.country")) + "</h2>"
      + '<div class="an-rank">' + (r
          ? (rk ? esc(tpl("an.rankOf", { r: rk.r, n: rk.n })) + " · " + esc(EH.t("an.ms." + state.metric)) : esc(EH.t("an.noData")))
          : D.rows.length + " " + esc(EH.t("an.regionsN"))) + "</div></div>"
      + (r ? '<div class="card-head-r"><button class="btn btn-subtle btn-sm" data-reset="1">'
          + EH.icon("return", "ic-sm") + esc(EH.t("an.reset")) + "</button></div>" : "")
      + "</div>";

    var kv = METRICS.map(function (f) {
      var v = src[f];
      var share = r && v !== null && T[f] ? v / T[f] : null;
      return '<div class="an-kv-row' + (f === state.metric ? " is-cur" : "") + '">'
        + '<span class="an-kv-k">' + esc(EH.t("an.m." + f)) + "</span>"
        + '<span class="an-kv-v">' + (v === null ? '<span class="an-na">' + esc(EH.t("an.noData")) + "</span>" : esc(fmt(f, v, true))) + "</span>"
        + (share !== null
            ? '<span class="an-kv-s"><span class="bar-track"><span class="bar-fill" style="width:' + Math.max(1, Math.round(share * 100)) + '%"></span></span>'
              + "<span>" + pct(share) + "</span></span>"
            : "")
        + "</div>";
    }).join("");

    var names = r ? r.exchanges : D.exchanges.slice(0, 8).map(function (e) { return e.name; });
    var chips = names.map(function (n) {
      var e = exByName(n);
      return '<span class="an-chip">' + exLogo(e, "sm") + esc(n) + "</span>";
    }).join("");

    return head
      + '<div class="an-kv">' + kv + "</div>"
      + '<div class="an-sec"><div class="an-sec-t">' + esc(EH.t("an.funnel")) + "</div>" + funnel(src) + "</div>"
      + '<div class="an-sec"><div class="an-sec-t">' + esc(EH.t("an.exUsed")) + "</div>"
      + '<div class="an-chips">' + (chips || '<span class="an-na">' + esc(EH.t("an.noData")) + "</span>") + "</div></div>";
  }

  /* ------------------------------------------------------------- рейтинг */
  function rankingBody() {
    var f = state.metric;
    var rows = D.rows.slice().sort(function (a, b) {
      if (a[f] === null) { return 1; }
      if (b[f] === null) { return -1; }
      return b[f] - a[f];
    });
    var max = Math.max.apply(null, rows.map(function (r) { return r[f] || 0; })) || 1;
    var cls = map ? map.classes().cls : {};
    var n = 0;
    return rows.map(function (r) {
      var known = r[f] !== null;
      if (known) { n++; }
      var w = known ? Math.max(1, Math.round(r[f] / max * 100)) : 0;
      var fill = map ? map.fill(cls[r.key] === undefined ? -1 : cls[r.key]) : "var(--c1)";
      return '<button class="an-rk' + (r.key === state.selected ? " is-sel" : "") + '" data-region="' + r.key + '">'
        + '<span class="an-rk-i">' + (known ? n : "—") + "</span>"
        + '<span class="an-rk-n">' + esc(EH.t("rgs." + r.key)) + "</span>"
        + '<span class="an-rk-b"><i style="width:' + w + "%;background:" + fill + '"></i></span>'
        + '<span class="an-rk-v">' + (known ? esc(fmt(f, r[f])) : '<span class="an-na">' + esc(EH.t("an.noData")) + "</span>") + "</span>"
        + "</button>";
    }).join("");
  }

  function rankingCard() {
    return '<section class="card reveal reveal-3">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("an.ranking")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px" id="anRankSub">' + esc(EH.t("an.m." + state.metric)) + "</div></div></div>"
      + '<div class="an-rank-list" id="anRank"></div></section>';
  }

  /* --------------------------------------------------------------- биржи */
  function exchangesBody() {
    var n = D.rows.length;
    return D.exchanges.map(function (e) {
      var c = e.regions.length;
      return '<button class="an-ex' + (e.name === state.exchange ? " is-on" : "") + '" data-ex="' + esc(e.name) + '">'
        + exLogo(e)
        + '<span class="an-ex-n">' + esc(e.name)
        + '<span class="pill pill-plain ' + (e.type === "exchange" ? "pill-info" : e.type === "other" ? "pill-outline" : "pill-violet") + '">'
        + esc(EH.t("an.type." + e.type)) + "</span></span>"
        + '<span class="an-ex-c">' + c + " <i>/ " + n + "</i></span>"
        + '<span class="an-ex-b"><i style="width:' + Math.round(c / n * 100) + '%"></i></span>'
        + "</button>";
    }).join("");
  }

  function exchangesCard() {
    return '<section class="card reveal reveal-4">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("an.exchanges")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("an.exSub")) + "</div></div>"
      + '<div class="card-head-r"><button class="btn btn-subtle btn-sm" data-exclear="1" id="anExClear"'
      + (state.exchange ? "" : " hidden") + ">" + EH.icon("close", "ic-sm") + esc(EH.t("an.exClear")) + "</button></div></div>"
      + '<div class="an-ex-list" id="anEx"></div></section>';
  }

  /* ------------------------------------------------------- распределение */
  function donutCard() {
    var T = D.totals.amount || 1;
    var sorted = D.rows.filter(function (r) { return r.amount; })
      .sort(function (a, b) { return b.amount - a.amount; });
    var top = sorted.slice(0, 4);
    var rest = sorted.slice(4).reduce(function (a, r) { return a + r.amount; }, 0);
    var colors = ["var(--c1)", "var(--c2)", "var(--c4)", "var(--c6)"];
    var segs = top.map(function (r, i) { return { v: r.amount, color: colors[i], label: EH.t("rgs." + r.key) }; });
    if (rest) { segs.push({ v: rest, color: "var(--surface-3)", label: EH.t("an.others") }); }

    var legend = segs.map(function (s) {
      return '<div class="an-dl"><i style="background:' + s.color + '"></i><span>' + esc(s.label) + "</span>"
        + "<b>" + pct(s.v / T) + "</b></div>";
    }).join("");

    return '<section class="card reveal reveal-5">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("an.distribution")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("an.m.amount")) + "</div></div></div>"
      + '<div class="an-donut">' + EH.donut(segs, EH.t("an.u.cur"), money(D.totals.amount), { size: 210, vsize: 22 })
      + '<div class="an-donut-l">' + legend + "</div></div></section>";
  }

  /* ------------------------------------------------------ качество данных */
  function notesCard() {
    var out = [];
    var byRegion = {};
    D.notes.forEach(function (n) {
      var region = n.region ? EH.t("rg." + n.region) : "";
      if (n.type === "missing") {
        (byRegion[n.region] = byRegion[n.region] || []).push("«" + EH.t("an.m." + n.field) + "»");
        return;
      }
      if (n.type === "concentration") {
        out.push({ cls: "is-info", ic: "pie", html: tpl("an.n.concentration", { region: "<b>" + esc(region) + "</b>", share: "<b>" + pct(n.share) + "</b>" }) });
      } else if (n.type === "outlier") {
        var r = row(n.region);
        out.push({ cls: "is-warn", ic: "alert", html: tpl("an.n.outlier", {
          region: "<b>" + esc(region) + "</b>", cases: EH.fmtNum(r.cases), amount: esc(money(r.amount, true)),
          per: esc(money(n.per, true)), median: esc(money(n.median, true)) }) });
      } else if (n.type === "equal") {
        out.push({ cls: "is-warn", ic: "info", html: tpl("an.n.equal", { region: "<b>" + esc(region) + "</b>", value: EH.fmtNum(n.value) }) });
      } else if (n.type === "total") {
        out.push({ cls: "is-warn", ic: "alert", html: tpl("an.n.total", {
          field: esc(EH.t("an.m." + n.field)), declared: esc(fmt(n.field, n.declared, true)), computed: esc(fmt(n.field, n.computed, true)) }) });
      } else if (n.type === "unknown") {
        out.push({ cls: "is-warn", ic: "info", html: tpl("an.n.unknown", { values: esc(n.values.join(", ")) }) });
      }
    });
    /* пропуски одного региона собираем в одну строку, а не по строке на ячейку */
    Object.keys(byRegion).forEach(function (k) {
      out.push({ cls: "", ic: "info", html: "<b>" + esc(EH.t("rg." + k)) + "</b> — "
        + esc(EH.t("an.n.missing")) + ": " + esc(byRegion[k].join(", ")) });
    });
    var allOk = Object.keys(D.check).every(function (f) { return D.check[f].ok; });
    if (allOk) { out.unshift({ cls: "is-ok", ic: "checkc", html: esc(EH.t("an.n.totalOk")) }); }

    return '<section class="card reveal reveal-6">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("an.quality")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("an.qualitySub")) + "</div></div></div>"
      + '<div class="an-notes">' + out.map(function (n) {
          return '<div class="an-note ' + n.cls + '"><span class="an-note-ic">' + EH.icon(n.ic) + "</span><div>" + n.html + "</div></div>";
        }).join("") + "</div></section>";
  }

  /* -------------------------------------------------------------- таблица */
  var COLS = [
    { f: "label",  k: "c.region", t: "text" },
    { f: "crimes", k: "an.ms.crimes" },
    { f: "card",   k: "an.ms.card" },
    { f: "damage", k: "an.ms.damage" },
    { f: "cases",  k: "an.ms.cases" },
    { f: "amount", k: "an.ms.amount" },
    { f: "share",  k: "an.cryptoShare" }
  ];

  function cell(r, f) {
    if (f === "label") { return EH.t("rg." + r.key); }
    if (f === "share") { return ratio(r.cases, r.card); }
    return r[f];
  }

  function tableBody() {
    var s = state.sort;
    var rows = D.rows.slice().sort(function (a, b) {
      var x = cell(a, s.f), y = cell(b, s.f);
      /* пустые значения всегда внизу, в какую бы сторону ни сортировали */
      if (x === null && y === null) { return 0; }
      if (x === null) { return 1; }
      if (y === null) { return -1; }
      if (typeof x === "string") { return x.localeCompare(y) * s.dir; }
      return (x - y) * s.dir;
    });
    return rows.map(function (r, i) {
      var sh = ratio(r.cases, r.card);
      var logos = r.exchanges.slice(0, 4).map(function (n) { return exLogo(exByName(n), "sm"); }).join("");
      var more = r.exchanges.length > 4 ? '<span class="more">+' + (r.exchanges.length - 4) + "</span>" : "";
      return '<tr data-region="' + r.key + '" tabindex="0"' + (r.key === state.selected ? ' class="is-sel"' : "") + ">"
        + '<td class="num muted" style="text-align:left">' + (i + 1) + "</td>"
        + '<td><span class="strong">' + esc(EH.t("rg." + r.key)) + "</span></td>"
        + ["crimes", "card", "damage", "cases", "amount"].map(function (f) {
            return '<td class="num nowrap">' + (r[f] === null ? '<span class="an-na">—</span>' : esc(fmt(f, r[f]))) + "</td>";
          }).join("")
        + '<td class="num nowrap"><span class="an-share"><span class="bar-track"><span class="bar-fill" style="width:'
        + (sh === null ? 0 : Math.max(1, Math.round(Math.min(1, sh) * 100))) + '%"></span></span>' + pct(sh) + "</span></td>"
        + '<td><span class="an-logos">' + logos + more + "</span></td>"
        + "</tr>";
    }).join("");
  }

  function tableCard() {
    var T = D.totals;
    var head = '<th style="width:36px">#</th>' + COLS.map(function (c) {
      var on = state.sort.f === c.f;
      return '<th class="is-sort' + (c.t === "text" ? "" : " t-r") + '" data-sort="' + c.f + '">'
        + esc(EH.t(c.k)) + '<span class="srt">' + (on ? (state.sort.dir < 0 ? "↓" : "↑") : "") + "</span></th>";
    }).join("") + "<th>" + esc(EH.t("an.exchanges")) + "</th>";

    return '<section class="card reveal mt-14">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("an.table")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("an.tableSub")) + "</div></div></div>"
      + '<div class="tbl-wrap"><table class="tbl an-tbl"><thead><tr id="anHead">' + head + "</tr></thead>"
      + '<tbody id="anBody"></tbody>'
      + "<tfoot><tr><td></td><td>" + esc(EH.t("an.total")) + "</td>"
      + ["crimes", "card", "damage", "cases", "amount"].map(function (f) {
          return '<td class="num nowrap">' + esc(fmt(f, T[f])) + "</td>";
        }).join("")
      + '<td class="num nowrap">' + pct(ratio(T.cases, T.card)) + "</td><td></td></tr></tfoot>"
      + "</table></div></section>";
  }

  /* ---------------------------------------------- карта мира (запросы) */
  /* Прежняя Discovery: активные запросы по юрисдикциям адресатов и импульсы
     маршрутов из Ташкента. Возвращена по пожеланию заказчика первым разделом. */
  function activeByCountry() {
    var byCo = {};
    EH.visibleDocs(EH.state.role).forEach(function (d) {
      if (d.status === "draft" || d.status === "completed") { return; }
      var c = EH.companyById(d.org);
      if (!c) { return; }
      var e = byCo[c.id] || (byCo[c.id] = { co: c, docs: [], level: "ok" });
      e.docs.push(d);
      var lvl = EH.deadlineLevel(d.days, d.status);
      if (lvl === "late") { e.level = "danger"; }
      else if ((lvl === "crit" || lvl === "near") && e.level !== "danger") { e.level = "warn"; }
    });
    return Object.keys(byCo).map(function (k) { return byCo[k]; });
  }

  /* одна страна — один маркер: берём самый тяжёлый уровень риска */
  function worldMarkers(items) {
    var by = {};
    items.forEach(function (e) {
      var m = by[e.co.cc];
      if (!m) {
        m = by[e.co.cc] = { cc: e.co.cc, label: e.co.country, level: e.level,
                            icon: EH.companyIcon[e.co.type], n: 0 };
      }
      m.n += e.docs.length;
      if (e.level === "danger" || (e.level === "warn" && m.level === "ok")) { m.level = e.level; }
    });
    return Object.keys(by).map(function (k) {
      var m = by[k];
      m.value = m.n + " " + EH.t("c.docs");
      return m;
    });
  }

  function worldSection() {
    var items = activeByCountry();
    var rows = items.map(function (e) {
      var risk = e.level === "danger" ? "kpi.late" : e.level === "warn" ? "kpi.near" : "cl.legendOk";
      var rcls = e.level === "danger" ? "pill-danger" : e.level === "warn" ? "pill-warn" : "pill-success";
      return '<div class="frow">' + EH.companyLogo(e.co.id, "lg")
        + '<span class="frow-b"><span class="frow-t">' + esc(e.co.name) + "</span>"
        + '<span class="frow-m">' + EH.flag(e.co.cc) + esc(e.co.country)
        + '<span class="dot-sep"></span>' + e.docs.length + " " + esc(EH.t("c.docs"))
        + '<span class="dot-sep"></span><span class="num">' + e.co.sla + " " + esc(EH.t("c.days")) + "</span></span></span>"
        + '<span class="pill ' + rcls + '">' + esc(EH.t(risk)) + "</span></div>";
    }).join("");

    return '<section class="card reveal">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("ds.geo")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("ds.sub")) + "</div></div>"
      + '<div class="card-head-r"><span class="pill pill-violet">' + esc(EH.t("ds.hub")) + "</span></div></div>"
      + '<div class="card-body" style="padding:10px"><div class="lmap">'
      +   EH.worldMapDecor(worldMarkers(items), { zoom: true, pins: true, flow: true, ambient: true, hubLabel: EH.t("ds.hub") })
      + "</div></div>"
      + '<div class="card-foot"><div class="legend-row">'
      +   '<span class="li"><span class="dot" style="background:var(--accent)"></span>' + esc(EH.t("cl.legendOk")) + "</span>"
      +   '<span class="li"><span class="dot" style="background:var(--warn)"></span>' + esc(EH.t("kpi.near")) + "</span>"
      +   '<span class="li"><span class="dot" style="background:var(--danger)"></span>' + esc(EH.t("kpi.late")) + "</span>"
      +   '<span class="li faint">' + esc(EH.t("ds.hint")) + "</span>"
      + "</div>"
      + '<span class="faint" style="font-size:11.5px">' + esc(EH.t("ds.attrib")) + "</span></div>"
      + "</section>"

      + '<section class="card reveal reveal-2 mt-14">'
      + '<div class="card-head"><div><h2>' + esc(EH.t("ds.jur")) + "</h2>"
      + '<div class="muted" style="font-size:12.5px;margin-top:3px">' + esc(EH.t("ds.flows")) + "</div></div></div>"
      + (rows ? '<div class="frow-grid">' + rows + "</div>"
              : '<div class="empty"><div class="empty-d">' + esc(EH.t("c.none")) + "</div></div>")
      + "</section>";
  }

  /* ------------------------------------------------------------ выгрузка */
  function exportCSV() {
    var rows = [[EH.t("c.region")].concat(METRICS.map(function (f) { return EH.t("an.m." + f); }),
               [EH.t("an.cryptoShare"), EH.t("an.exchanges")])];
    D.rows.forEach(function (r) {
      var sh = ratio(r.cases, r.card);
      rows.push([EH.t("rg." + r.key)].concat(METRICS.map(function (f) { return r[f] === null ? "" : r[f]; }),
                [sh === null ? "" : Math.round(sh * 1000) / 10, r.exchanges.join(", ")]));
    });
    rows.push([EH.t("an.total")].concat(METRICS.map(function (f) { return D.totals[f]; }),
              [Math.round(ratio(D.totals.cases, D.totals.card) * 1000) / 10, ""]));
    EH.downloadCSV("ehamkor_crypto", rows);
  }

  /* ------------------------------------------------------------ обновление */
  function refresh() {
    var hl = null;
    if (state.exchange) {
      var e = exByName(state.exchange);
      hl = e.regions || [];
    }
    map.update({
      values: values(state.metric),
      label: EH.t("an.m." + state.metric),
      format: function (v) { return fmt(state.metric, v); },
      selected: state.selected,
      highlight: hl
    });

    root.querySelectorAll("[data-metric]").forEach(function (el) {
      var on = el.getAttribute("data-metric") === state.metric;
      el.classList.toggle(el.classList.contains("stat") ? "is-cur" : "is-on", on);
    });
    root.querySelector("#anRankSub").textContent = EH.t("an.m." + state.metric);
    root.querySelector("#anRank").innerHTML = rankingBody();
    root.querySelector("#anDetail").innerHTML = detailCard();
    root.querySelector("#anEx").innerHTML = exchangesBody();
    root.querySelector("#anExClear").hidden = !state.exchange;
    root.querySelector("#anBody").innerHTML = tableBody();
    root.querySelectorAll("#anHead [data-sort]").forEach(function (th) {
      var on = th.getAttribute("data-sort") === state.sort.f;
      th.querySelector(".srt").textContent = on ? (state.sort.dir < 0 ? "↓" : "↑") : "";
    });
  }

  window.PAGE = {
    key: "discovery",
    crumb: "nav.discovery",

    render: function () {
      if (!D || !EH.uzMap) {
        return '<div class="empty">' + EH.icon("alert") + '<div class="empty-t">' + esc(EH.t("an.noData")) + "</div></div>";
      }
      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + esc(EH.t("nav.discovery")) + "</h1>"
        + '<div class="sub">' + esc(EH.t("an.pageSub")) + "</div></div></div>"

        /* раздел 1 — география запросов (прежняя Discovery, с анимацией маршрутов) */
        + worldSection()

        /* раздел 2 — сводка по выводу средств через крипто-активы */
        + '<div class="an-sec-head"><div><h2>' + esc(EH.t("an.secTitle")) + "</h2>"
        + '<div class="muted">' + esc(EH.t("an.sub")) + "</div></div>"
        + '<div class="row-tight">'
        + '<span class="pill pill-outline pill-plain">' + EH.icon("files", "ic-sm") + esc(EH.t("an.source")) + ": " + esc(D.source) + "</span>"
        + '<button class="btn btn-subtle btn-sm" id="anCsv">' + EH.icon("download", "ic-sm") + "CSV</button>"
        + "</div></div>"

        + kpis()
        + '<div class="grid g-21 mt-14">' + mapCard()
        +   '<section class="card an-detail reveal reveal-3" id="anDetail"></section></div>'
        + '<div class="grid g-2 mt-14">' + rankingCard() + exchangesCard() + "</div>"
        + '<div class="grid g-2 mt-14">' + donutCard() + notesCard() + "</div>"
        + tableCard();
    },

    after: function (page) {
      /* зум, перетаскивание и подписи-чипы карты мира */
      if (EH.mountWorldMaps) { EH.mountWorldMaps(page); }
      if (!D || !EH.uzMap) { return; }
      root = page;

      map = EH.uzmap(page.querySelector("#anMap"), {
        values: values(state.metric),
        label: EH.t("an.m." + state.metric),
        format: function (v) { return fmt(state.metric, v); },
        formatShare: function (s) { return pct(s) + " · " + EH.t("an.share"); },
        legendHost: page.querySelector("#anLegend"),
        selected: null,
        highlight: null,
        onSelect: function (k) { state.selected = k; refresh(); }
      });
      refresh();

      page.addEventListener("click", function (e) {
        var t;
        if ((t = e.target.closest("[data-metric]"))) {
          state.metric = t.getAttribute("data-metric");
          if (state.sort.f !== "label" && state.sort.f !== "share") { state.sort = { f: state.metric, dir: -1 }; }
          refresh();
        } else if ((t = e.target.closest("[data-region]"))) {
          var k = t.getAttribute("data-region");
          state.selected = state.selected === k ? null : k;
          refresh();
        } else if ((t = e.target.closest("[data-ex]"))) {
          var n = t.getAttribute("data-ex");
          state.exchange = state.exchange === n ? null : n;
          refresh();
        } else if (e.target.closest("[data-exclear]")) {
          state.exchange = null;
          refresh();
        } else if (e.target.closest("[data-reset]")) {
          state.selected = null;
          refresh();
        } else if ((t = e.target.closest("[data-sort]"))) {
          var f = t.getAttribute("data-sort");
          state.sort = state.sort.f === f ? { f: f, dir: -state.sort.dir } : { f: f, dir: f === "label" ? 1 : -1 };
          refresh();
        } else if (e.target.closest("#anCsv")) {
          exportCSV();
        }
      });

      /* клавиатура: KPI и строки таблицы выбираются Enter / пробелом */
      page.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") { return; }
        var t = e.target.closest("[data-metric].stat, tr[data-region]");
        if (!t) { return; }
        e.preventDefault();
        t.click();
      });
    }
  };

})(window.EH);
