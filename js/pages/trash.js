/* Корзина. Низкочастотная и деструктивная зона — из основной навигации убрана,
   попасть сюда можно по прямой ссылке. */
(function (EH) {
  "use strict";

  window.PAGE = {
    key: "trash",
    crumb: "nav.trash",

    render: function () {
      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("tz.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("tz.sub")) + "</div></div></div>"
        + '<section class="card reveal"><div class="empty">' + EH.icon("trash")
        + '<div class="empty-t">' + EH.esc(EH.t("tz.empty")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("tz.emptyD")) + "</div>"
        + '<a class="btn btn-subtle btn-sm" href="documents.html" style="margin-top:6px">'
        + EH.icon("docs", "ic-sm") + EH.esc(EH.t("nav.docs")) + "</a></div></section>";
    }
  };

})(window.EH);
