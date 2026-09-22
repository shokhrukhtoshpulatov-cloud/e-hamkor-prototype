/* Мониторинг руководства. Регионы сортируются «риск первым»: просроченные,
   затем «срок близко», затем по объёму — иначе заявленный принцип не выполняется. */
(function (EH) {
  "use strict";

  /* График динамики — тот же блок, что на рабочем столе (js/trend.js):
     период, переключатель «столбцы/область» и легенда идут вместе с ним.
     Размеры графика уже — карточка стоит в узкой колонке, и широкий
     viewBox растянул бы столбцы в плоскую полосу. */
  var trend = EH.trendPanel({
    id: "mnTrend",
    cls: "reveal reveal-3",
    /* Фильтр периода стоит в шапке страницы рядом с «Экспортом», а не в шапке
       карточки: он отбирает то же, что уходит в выгрузку, и в шапке карточки
       терялся рядом с переключателем вида. */
    externalPeriod: true,
    /* Карточка растянута соседним блоком регионов — график занимает остаток */
    fill: true,
    bars: { w: 480, h: 280, barW: 26 },
    area: { w: 480, h: 280, maxLabels: 5 }
  });

  function sorted() {
    return EH.regions.slice().sort(function (a, b) {
      return (b.late - a.late) || (b.near - a.near) || (b.total - a.total);
    });
  }

  function regionRows() {
    return sorted().map(function (r) {
      var low = r.rate < 90;
      return '<div class="reg-row">'
        + '<div class="reg-n">' + EH.icon("pin", "ic-sm") + EH.esc(EH.t(r.key)) + "</div>"
        + '<div class="reg-v">' + r.total + "</div>"
        + '<div class="reg-v">' + r.active + "</div>"
        + '<div class="reg-v">' + (r.near ? '<span class="t-warn">' + r.near + "</span>" : r.near) + "</div>"
        + '<div class="reg-v">' + (r.late ? '<span class="t-dan strong">' + r.late + "</span>" : r.late) + "</div>"
        + '<div class="reg-bar"><div class="bar-track"><div class="bar-fill' + (low ? " is-warn" : "")
        + '" style="width:' + r.rate + '%"></div></div><span class="pc">' + r.rate + "%</span></div>"
        + "</div>";
    }).join("");
  }

  window.PAGE = {
    key: "monitoring",
    roles: ["rahbar", "prokuror", "admin"],
    crumb: "nav.monitoring",

    render: function () {
      var tot = EH.regions.reduce(function (a, r) {
        a.total += r.total; a.active += r.active; a.near += r.near; a.late += r.late;
        return a;
      }, { total: 0, active: 0, near: 0, late: 0 });
      var avg = Math.round(EH.regions.reduce(function (a, r) { return a + r.rate; }, 0) / EH.regions.length);

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("mn.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("mn.sub")) + "</div></div>"
        + '<div class="page-head-r">' + trend.periodHTML()
        + '<button class="btn btn-subtle" id="mnExport">'
        + EH.icon("download", "ic-sm") + EH.esc(EH.t("act.export")) + "</button></div></div>"

        + '<div class="grid g-4 reveal">'
        +   '<div class="stat"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("mn.total")) + "</span>"
        +     EH.icon("docs", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + tot.total + '">0</span></div></div>'
        +   '<div class="stat is-info"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("mn.active")) + "</span>"
        +     EH.icon("refresh", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + tot.active + '">0</span></div></div>'
        +   '<div class="stat is-warn"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("kpi.near")) + "</span>"
        +     EH.icon("timer", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + tot.near + '">0</span></div></div>'
        +   '<div class="stat is-danger"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("kpi.late")) + "</span>"
        +     EH.icon("alert", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + tot.late + '">0</span></div></div>'
        + "</div>"

        + '<div class="grid g-21 mt-14">'
        + '<section class="card reveal reveal-2">'
        +   '<div class="card-head"><div><h2>' + EH.esc(EH.t("mn.regions")) + "</h2>"
        +     '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("mn.sortNote")) + "</div></div>"
        +     '<div class="card-head-r"><span class="pill pill-outline">' + EH.esc(EH.t("mn.discipline")) + " " + avg + "%</span></div></div>"
        +   '<div class="reg-scroll"><div class="reg-row head"><div>' + EH.esc(EH.t("c.region")) + "</div><div>" + EH.esc(EH.t("mn.total"))
        +     "</div><div>" + EH.esc(EH.t("mn.active")) + "</div><div>" + EH.esc(EH.t("kpi.near"))
        +     "</div><div>" + EH.esc(EH.t("kpi.late")) + "</div><div>" + EH.esc(EH.t("mn.discipline")) + "</div></div>"
        +   regionRows() + "</div>"
        +   '<div class="card-body"><div class="note">' + EH.icon("info") + "<span>" + EH.esc(EH.t("mn.threshold")) + "</span></div></div>"
        + "</section>"
        + trend.html() + "</div>";
    },

    after: function (page) {
      trend.mount(page);
      page.querySelector("#mnExport").addEventListener("click", function () {
        var rows = [[EH.t("c.region"), EH.t("mn.total"), EH.t("mn.active"),
                     EH.t("kpi.near"), EH.t("kpi.late"), EH.t("mn.discipline")]];
        sorted().forEach(function (r) {
          rows.push([EH.t(r.key), r.total, r.active, r.near, r.late, r.rate + "%"]);
        });
        EH.downloadCSV("ehamkor_monitoring", rows);
      });
    }
  };

})(window.EH);
