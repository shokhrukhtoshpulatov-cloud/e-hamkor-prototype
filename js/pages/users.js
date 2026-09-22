/* Пользователи: роли, организации и состояние доступа. */
(function (EH) {
  "use strict";

  window.PAGE = {
    key: "users",
    roles: ["admin"],
    crumb: "nav.users",

    render: function () {
      var rows = EH.users.map(function (u) {
        var r = EH.roles.filter(function (x) { return x.key === u.roleKey; })[0] || EH.roles[0];
        return "<tr>"
          + '<td><span class="cell-main">' + EH.avatar(EH.initials(u.name), r.color, "ava-sm")
          + '<span class="strong">' + EH.esc(u.name) + "</span></span></td>"
          + '<td class="nowrap num muted">' + EH.esc(u.login) + "</td>"
          + '<td class="nowrap">' + EH.esc(EH.t(u.roleKey)) + "</td>"
          + "<td>" + EH.esc(EH.t(u.org)) + "</td>"
          + '<td class="nowrap num muted">' + EH.esc(u.last) + "</td>"
          + "<td>" + (u.status === "active"
              ? '<span class="pill pill-success">' + EH.esc(EH.t("c.active")) + "</span>"
              : '<span class="pill pill-danger">' + EH.esc(EH.t("c.blocked")) + "</span>") + "</td></tr>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("us.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("us.sub")) + "</div></div>"
        + '<div class="page-head-r"><button class="btn btn-primary js-stub">'
        + EH.icon("useradd", "ic-sm") + EH.esc(EH.t("us.add")) + "</button></div></div>"
        + '<section class="card reveal"><div class="tbl-wrap"><table class="tbl"><thead><tr>'
        + "<th>" + EH.esc(EH.t("c.user")) + "</th><th>" + EH.esc(EH.t("c.login")) + "</th>"
        + "<th>" + EH.esc(EH.t("c.role")) + "</th><th>" + EH.esc(EH.t("c.org")) + "</th>"
        + "<th>" + EH.esc(EH.t("c.lastSeen")) + "</th><th>" + EH.esc(EH.t("c.status")) + "</th>"
        + "</tr></thead><tbody>" + rows + "</tbody></table></div></section>";
    },

    after: function (page) {
      page.querySelectorAll(".js-stub").forEach(function (b) {
        b.addEventListener("click", function () { EH.toast(EH.t("ts.soon")); });
      });
    }
  };

})(window.EH);
