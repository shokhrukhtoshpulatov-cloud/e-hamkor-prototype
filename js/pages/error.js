/* 404. Локализована и не требует оболочки. */
(function (EH) {
  "use strict";

  function render() {
    document.title = EH.t("er.title") + " · " + EH.t("app.name");
    document.body.innerHTML = '<div class="err-wrap"><div class="err-box reveal">'
      + '<div class="err-code">404</div>'
      + "<h1>" + EH.esc(EH.t("er.title")) + "</h1>"
      + "<p>" + EH.esc(EH.t("er.sub")) + "</p>"
      + '<a class="btn btn-primary btn-lg" href="dashboard.html">' + EH.icon("dash", "ic-sm") + EH.esc(EH.t("er.home")) + "</a>"
      + "</div></div>";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else { render(); }

})(window.EH);
