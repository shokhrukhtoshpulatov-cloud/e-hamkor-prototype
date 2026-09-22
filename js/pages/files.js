/* Мои файлы: версии и контрольные суммы вложений. */
(function (EH) {
  "use strict";

  window.PAGE = {
    key: "files",
    crumb: "nav.files",

    render: function () {
      var rows = EH.files.map(function (f) {
        var ext = f.name.split(".").pop();
        return '<div class="frow"><span class="frow-ic">'
          + EH.icon(ext === "pdf" ? "pdf" : ext === "xlsx" ? "grid" : "docs") + "</span>"
          + '<span class="frow-b"><span class="frow-t">' + EH.esc(f.name) + "</span>"
          + '<span class="frow-m"><a class="id" href="document-detail.html?id=' + encodeURIComponent(f.doc) + '">' + EH.esc(f.doc) + "</a>"
          + '<span class="dot-sep"></span><span class="num">' + EH.esc(f.size) + "</span>"
          + '<span class="dot-sep"></span>' + EH.esc(EH.t("c.version")) + " " + f.ver
          + '<span class="dot-sep"></span><span class="num">' + EH.esc(f.sum) + "</span>"
          + '<span class="dot-sep"></span><span class="num">' + EH.esc(f.ts) + "</span></span></span>"
          + '<button class="btn btn-subtle btn-sm js-dl" data-file="' + EH.esc(f.name) + '">'
          + EH.icon("download", "ic-sm") + EH.esc(EH.t("act.download")) + "</button></div>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("fl.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("fl.sub")) + "</div></div></div>"
        + '<section class="card reveal">' + rows + "</section>";
    },

    after: function (page) {
      page.querySelectorAll(".js-dl").forEach(function (b) {
        b.addEventListener("click", function () {
          var name = b.getAttribute("data-file");
          var f = EH.files.filter(function (x) { return x.name === name; })[0];
          if (f) { EH.downloadAttachment(f); }
        });
      });
    }
  };

})(window.EH);
