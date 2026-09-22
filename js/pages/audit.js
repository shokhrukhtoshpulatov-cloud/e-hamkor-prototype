/* Журнал аудита. Append-only: в прототипе это просто таблица, но подпись под ней
   фиксирует требование к боевой реализации. */
(function (EH) {
  "use strict";

  /* Журнал append-only, поэтому период здесь — единственный осмысленный
     отбор: записи не редактируются и не удаляются, их можно только сузить
     по времени. По умолчанию показан весь журнал. */
  /* стартовый период — из настроек пользователя */
  var period = EH.presetRange(EH.prefs.period);

  function rowsHtml() {
    var rows = EH.audit.filter(function (a) { return EH.inPeriod(period, a.ts); });
    if (!rows.length) {
      return '<tr><td colspan="5"><div class="empty">' + EH.icon("calendar")
        + '<div class="empty-t">' + EH.esc(EH.t("period.empty")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("period.empty.d")) + "</div></div></td></tr>";
    }
    return rows.map(function (a) {
      return "<tr>"
        + '<td class="nowrap num muted">' + EH.esc(a.ts) + "</td>"
        + '<td class="nowrap"><span class="cell-main">' + EH.avatar(EH.initials(a.name || a.user), "var(--text-soft)", "ava-sm")
        + "<span>" + EH.esc(a.user) + "</span></span></td>"
        + '<td class="nowrap">' + (a.doc === "—" ? '<span class="muted">—</span>'
            : '<a class="id" href="document-detail.html?id=' + encodeURIComponent(a.doc) + '">' + EH.esc(a.doc) + "</a>") + "</td>"
        + "<td>" + EH.esc(EH.t(a.act)) + "</td>"
        + '<td class="nowrap num muted">' + EH.esc(a.ip) + "</td></tr>";
    }).join("");
  }

  window.PAGE = {
    key: "audit",
    roles: ["prokuror", "admin"],
    crumb: "nav.audit",

    render: function () {
      var rows = rowsHtml();

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("au.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("au.sub")) + "</div></div>"
        + '<div class="page-head-r">'
        + EH.periodButton(period, { id: "auPeriod" })
        + '<button class="btn btn-subtle" id="auExport">'
        + EH.icon("download", "ic-sm") + EH.esc(EH.t("act.export")) + "</button></div></div>"
        + '<section class="card reveal">'
        + '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
        +   "<th>" + EH.esc(EH.t("c.time")) + "</th><th>" + EH.esc(EH.t("c.user")) + "</th>"
        +   "<th>" + EH.esc(EH.t("c.number")) + "</th><th>" + EH.esc(EH.t("c.action")) + "</th>"
        +   "<th>" + EH.esc(EH.t("c.ip")) + '</th></tr></thead><tbody id="auBody">' + rows + "</tbody></table></div>"
        + '<div class="card-foot"><div class="note">' + EH.icon("lock") + "<span>" + EH.esc(EH.t("au.immutable")) + "</span></div></div>"
        + "</section>";
    },

    after: function (page) {
      var body = page.querySelector("#auBody");
      EH.mountPeriod(page.querySelector("#auPeriod"), {
        value: period,
        onChange: function (v) { period = v; body.innerHTML = rowsHtml(); }
      });
      page.querySelector("#auExport").addEventListener("click", function () {
        var rows = [[EH.t("c.time"), EH.t("c.user"), EH.t("c.number"), EH.t("c.action"), EH.t("c.ip")]];
        EH.audit.forEach(function (a) {
          rows.push([a.ts, a.user, a.doc, EH.t(a.act), a.ip]);
        });
        EH.downloadCSV("ehamkor_audit", rows);
      });
    }
  };

})(window.EH);
