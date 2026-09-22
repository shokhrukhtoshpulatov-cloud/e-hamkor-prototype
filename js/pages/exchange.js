/* Внешний обмен. Сегмент-контроль фильтрует стадию; из метрик оставлены только
   те две, что не читаются из строк таблицы напрямую. */
(function (EH) {
  "use strict";

  var STAGES = ["all", "sent", "accepted", "answered", "completed"];
  var state = { s: "all" };

  function rows() {
    return EH.visibleDocs(EH.state.role).filter(function (d) {
      if (EH.statuses[d.status].step < 3) { return false; }
      return state.s === "all" || d.status === state.s;
    });
  }

  function table(list) {
    if (!list.length) {
      return '<div class="empty">' + EH.icon("exchange")
        + '<div class="empty-t">' + EH.esc(EH.t("dc.empty")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("dc.empty.d")) + "</div></div>";
    }
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      + "<th>" + EH.esc(EH.t("c.number")) + "</th><th>" + EH.esc(EH.t("c.org")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.jurisdiction")) + "</th><th>" + EH.esc(EH.t("c.sla")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.status")) + "</th><th>" + EH.esc(EH.t("c.deadline")) + "</th>"
      + "</tr></thead><tbody>" + list.map(function (d) {
          var c = EH.companyById(d.org);
          var href = "document-detail.html?id=" + encodeURIComponent(d.id);
          return '<tr tabindex="0" data-href="' + href + '">'
            + '<td><span class="cell-main">' + EH.icon(EH.docTypeIcon(d.type), "ic-sm")
            + '<a class="id" href="' + href + '">' + EH.esc(d.id) + "</a></span>"
            + '<span class="sub">' + EH.esc(EH.t(d.title)) + "</span></td>"
            + "<td>" + EH.orgCell(d.org, { jur: false }) + "</td>"
            + '<td class="nowrap muted">' + EH.esc(c ? c.country : "—") + "</td>"
            + '<td class="nowrap num">' + (c ? c.sla + " " + EH.esc(EH.t("c.days")) : "—") + "</td>"
            + "<td>" + EH.statusPill(d.status) + "</td>"
            + '<td class="nowrap">' + EH.deadlineCell(d.deadline, d.days, d.status) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
  }

  window.PAGE = {
    key: "exchange",
    crumb: "nav.exchange",

    render: function () {
      var all = EH.visibleDocs(EH.state.role).filter(function (d) { return EH.statuses[d.status].step >= 3; });
      var near = 0, late = 0;
      all.forEach(function (d) {
        var l = EH.deadlineLevel(d.days, d.status);
        if (l === "late") { late++; } else if (l === "crit" || l === "near") { near++; }
      });

      var seg = STAGES.map(function (s) {
        return '<button class="' + (s === state.s ? "is-on" : "") + '" data-s="' + s + '">'
          + EH.esc(s === "all" ? EH.t("ex.all") : EH.t("st." + s)) + "</button>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("ex.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("ex.sub")) + "</div></div></div>"
        + '<div class="grid g-2 reveal" style="max-width:640px">'
        +   '<div class="stat is-warn"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("kpi.near")) + "</span>"
        +     EH.icon("timer", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + near + '">0</span></div></div>'
        +   '<div class="stat is-danger"><div class="stat-top"><span class="eyebrow">' + EH.esc(EH.t("kpi.late")) + "</span>"
        +     EH.icon("alert", "ic-sm") + '</div><div class="stat-row"><span class="stat-val" data-count="' + late + '">0</span></div></div>'
        + "</div>"
        + '<section class="card reveal reveal-2 mt-14">'
        + '<div class="toolbar"><div class="seg" id="exSeg">' + seg + "</div></div>"
        + '<div id="exBody"></div></section>';
    },

    after: function (page) {
      function repaint() { page.querySelector("#exBody").innerHTML = table(rows()); }
      repaint();
      page.querySelectorAll("#exSeg [data-s]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.s = b.getAttribute("data-s");
          page.querySelectorAll("#exSeg [data-s]").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on");
          repaint();
        });
      });
    }
  };

})(window.EH);
