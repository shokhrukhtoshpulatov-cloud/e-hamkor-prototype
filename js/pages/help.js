/* Инструкция: процесс в шесть шагов и зоны ответственности ролей. */
(function (EH) {
  "use strict";

  window.PAGE = {
    key: "help",
    crumb: "nav.help",

    render: function () {
      var steps = [1, 2, 3, 4, 5, 6].map(function (i) {
        return '<div class="step-num"><span class="n">' + i + "</span>"
          + '<div><div class="t">' + EH.esc(EH.t("hp.s" + i)) + "</div>"
          + '<div class="d">' + EH.esc(EH.t("hp.s" + i + "d")) + "</div></div></div>";
      }).join("");

      var roles = EH.roles.map(function (r) {
        return "<tr>"
          + '<td><span class="cell-main">' + EH.avatar(r.initials, r.color, "ava-sm")
          + '<span class="strong">' + EH.esc(EH.t(r.key)) + "</span></span></td>"
          + "<td>" + EH.esc(EH.t(r.org)) + "</td>"
          + "<td>" + EH.esc(EH.t(r.roleKey)) + "</td>"
          + "<td>" + (r.forceLang ? '<span class="pill pill-gold">EN</span>' : '<span class="muted">UZ · RU · EN</span>') + "</td>"
          + "</tr>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("hp.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("hp.sub")) + "</div></div></div>"

        + '<div class="grid g-21">'
        + '<section class="card reveal">'
        +   '<div class="card-head"><h2>' + EH.esc(EH.t("hp.steps")) + "</h2></div>"
        +   '<div class="card-body"><div class="steps-num">' + steps + "</div></div>"
        + "</section>"
        + '<div class="stack">'
        +   '<section class="card reveal reveal-2">'
        +     '<div class="card-head"><h2>' + EH.esc(EH.t("hp.sla")) + "</h2></div>"
        +     '<div class="card-body"><p class="muted" style="font-size:13px;line-height:1.6">'
        +       EH.esc(EH.t("hp.slaD")) + "</p></div>"
        +   "</section>"
        +   '<section class="card reveal reveal-3">'
        +     '<div class="card-head"><div><h2>' + EH.esc(EH.t("hp.states")) + "</h2>"
        +       '<div class="muted" style="font-size:12.5px;margin-top:3px">' + EH.esc(EH.t("hp.nextActor")) + "</div></div></div>"
        +     '<div class="card-body stack" style="gap:8px">'
        +       Object.keys(EH.statuses).map(function (s) {
                  return '<div class="spread" style="gap:8px">' + EH.statusPill(s)
                    + '<span class="muted" style="font-size:12px">' + EH.esc(EH.actorFor(s)) + "</span></div>";
                }).join("")
        +     "</div>"
        +   "</section>"
        + "</div></div>"

        + '<section class="card reveal reveal-4 mt-14">'
        + '<div class="card-head"><h2>' + EH.esc(EH.t("hp.roles")) + "</h2></div>"
        + '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
        +   "<th>" + EH.esc(EH.t("c.role")) + "</th><th>" + EH.esc(EH.t("c.org")) + "</th>"
        +   "<th>" + EH.esc(EH.t("c.action")) + "</th><th>" + EH.esc(EH.t("menu.lang")) + "</th>"
        + "</tr></thead><tbody>" + roles + "</tbody></table></div></section>";
    }
  };

})(window.EH);
