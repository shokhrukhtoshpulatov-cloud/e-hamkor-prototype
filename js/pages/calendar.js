/* Календарь исполнения. Дедлайны берутся из живых данных, навигация по месяцам
   рабочая, неделя начинается с понедельника. */
(function (EH) {
  "use strict";

  var cur = new Date(EH.TODAY.getFullYear(), EH.TODAY.getMonth(), 1);

  function key(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function byDay() {
    var map = {};
    EH.visibleDocs(EH.state.role).forEach(function (d) {
      if (d.status === "completed") { return; }
      (map[d.deadline] = map[d.deadline] || []).push(d);
    });
    return map;
  }

  function grid() {
    var map = byDay();
    var first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    var shift = (first.getDay() + 6) % 7;              /* понедельник — первый */
    var start = new Date(first);
    start.setDate(1 - shift);
    var today = key(EH.TODAY);

    var out = "";
    for (var i = 1; i <= 7; i++) {
      out += '<div class="cal-dow">' + EH.esc(EH.t("cl.dow" + i)) + "</div>";
    }
    for (var c = 0; c < 42; c++) {
      var d = new Date(start);
      d.setDate(start.getDate() + c);
      var k = key(d);
      var out0 = d.getMonth() !== cur.getMonth();
      var evs = (map[k] || []).map(function (doc) {
        var lvl = EH.deadlineLevel(doc.days, doc.status);
        var cls = lvl === "late" ? " is-danger" : (lvl === "crit" ? " is-warn" : "");
        return '<a class="cal-ev' + cls + '" href="document-detail.html?id=' + encodeURIComponent(doc.id) + '"'
          + ' title="' + EH.esc(doc.id + " · " + EH.t(doc.title)) + '">' + EH.esc(doc.id.slice(-4)) + " · "
          + EH.esc(EH.t(doc.title)) + "</a>";
      }).join("");
      out += '<div class="cal-day' + (out0 ? " is-out" : "") + (k === today ? " is-today" : "") + '">'
        + '<span class="cal-n">' + d.getDate() + "</span>" + evs + "</div>";
    }
    return out;
  }

  function title() {
    return EH.t("mo." + (cur.getMonth() + 1)) + " " + cur.getFullYear();
  }

  window.PAGE = {
    key: "calendar",
    crumb: "nav.calendar",

    render: function () {
      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("cl.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("cl.sub")) + "</div></div>"
        + '<div class="page-head-r">'
        + '<button class="btn btn-subtle btn-sm" id="calExport">' + EH.icon("download", "ic-sm") + EH.esc(EH.t("act.export")) + "</button>"
        + "</div></div>"
        + '<section class="card reveal">'
        + '<div class="card-head"><div class="row-tight">'
        +   '<button class="btn btn-ghost btn-icon btn-sm" id="calPrev" aria-label="' + EH.esc(EH.t("act.back")) + '">' + EH.icon("left", "ic-sm") + "</button>"
        +   '<h2 id="calTitle" style="min-width:170px;text-align:center">' + EH.esc(title()) + "</h2>"
        +   '<button class="btn btn-ghost btn-icon btn-sm" id="calNext" aria-label="' + EH.esc(EH.t("act.next")) + '">' + EH.icon("right", "ic-sm") + "</button>"
        +   '<button class="btn btn-subtle btn-sm" id="calToday">' + EH.esc(EH.t("act.today")) + "</button>"
        + "</div>"
        + '<div class="card-head-r"><div class="legend-row">'
        +   '<span class="li"><span class="dot" style="background:var(--danger)"></span>' + EH.esc(EH.t("cl.legendLate")) + "</span>"
        +   '<span class="li"><span class="dot" style="background:var(--warn)"></span>' + EH.esc(EH.t("cl.legendCrit")) + "</span>"
        +   '<span class="li"><span class="dot" style="background:var(--accent)"></span>' + EH.esc(EH.t("cl.legendOk")) + "</span>"
        + "</div></div></div>"
        + '<div class="card-body"><div class="cal" id="calGrid">' + grid() + "</div></div>"
        + "</section>";
    },

    after: function (page) {
      function repaint() {
        page.querySelector("#calTitle").textContent = title();
        page.querySelector("#calGrid").innerHTML = grid();
      }
      page.querySelector("#calPrev").addEventListener("click", function () { cur.setMonth(cur.getMonth() - 1); repaint(); });
      page.querySelector("#calNext").addEventListener("click", function () { cur.setMonth(cur.getMonth() + 1); repaint(); });
      page.querySelector("#calToday").addEventListener("click", function () {
        cur = new Date(EH.TODAY.getFullYear(), EH.TODAY.getMonth(), 1); repaint();
      });
      page.querySelector("#calExport").addEventListener("click", function () {
        var evs = EH.visibleDocs(EH.state.role)
          .filter(function (d) { return d.status !== "completed"; })
          .map(function (d) {
            var c = EH.companyById(d.org);
            return {
              uid: d.id,
              date: d.deadline,
              title: d.id + " · " + EH.t(d.title),
              desc: [EH.t("c.org") + ": " + (c ? c.name : "—"),
                     EH.t("c.status") + ": " + EH.t(EH.statuses[d.status].key)].join("\n")
            };
          });
        EH.downloadICS("ehamkor_deadlines", evs);
      });
    }
  };

})(window.EH);
