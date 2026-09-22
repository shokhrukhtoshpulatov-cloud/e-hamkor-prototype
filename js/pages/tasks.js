/* Мои задачи — та же очередь, что и на дашборде, но целиком и с приоритетами. */
(function (EH) {
  "use strict";

  window.PAGE = {
    key: "tasks",
    crumb: "nav.tasks",

    render: function () {
      var tasks = EH.tasksFor(EH.state.role);
      var st = EH.computeStats(EH.state.role);

      var head = '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("tk.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("tk.sub")) + "</div></div>"
        + '<div class="page-head-r"><span class="page-date">' + EH.icon("flash", "ic-sm")
        + '<b class="strong num">' + st.pending + "</b> " + EH.esc(EH.t("c.docs")) + "</span></div></div>";

      if (!tasks.length) {
        return head + '<section class="card reveal"><div class="empty">' + EH.icon("checkc")
          + '<div class="empty-t">' + EH.esc(EH.t("tk.empty")) + "</div>"
          + '<div class="empty-d">' + EH.esc(EH.t("tk.emptyD")) + "</div></div></section>";
      }

      var rows = tasks.map(function (t) {
        var d = t.doc;
        return '<a class="qrow p-' + t.prio + '" href="document-detail.html?id=' + encodeURIComponent(d.id) + '">'
          + '<span class="qrow-ic">' + EH.icon(EH.docTypeIcon(d.type)) + "</span>"
          + '<span class="qrow-b"><span class="qrow-t">' + EH.esc(EH.t(d.title)) + "</span>"
          + '<span class="qrow-m"><span class="num">' + EH.esc(d.id) + "</span><span class=\"dot-sep\"></span>"
          + EH.orgCell(d.org, { jur: false }) + '<span class="dot-sep"></span>' + EH.esc(EH.t(t.key)) + "</span></span>"
          + '<span class="qrow-r">' + EH.prioPill(t.prio)
          + EH.deadlineCell(d.deadline, d.days, d.status) + EH.statusPill(d.status)
          + EH.icon("right", "ic-sm") + "</span></a>";
      }).join("");

      return head + '<section class="card reveal">' + rows + "</section>";
    }
  };

})(window.EH);
