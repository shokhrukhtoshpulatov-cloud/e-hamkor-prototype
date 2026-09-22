/* Реестр иностранных организаций: официальный канал и срок ответа.
   Именно отсюда мастер создания берёт SLA. */
(function (EH) {
  "use strict";

  var TYPES = ["all", "crypto", "tech", "bank", "fintech"];
  /* q приходит из глобального поиска: выбранная там организация
     открывается уже отфильтрованной, а не потерянной в списке. */
  var state = { t: "all", q: EH.qs("q", "") };

  function list() {
    var q = state.q.toLowerCase().trim();
    return EH.companies.filter(function (c) {
      if (state.t !== "all" && c.type !== state.t) { return false; }
      if (!q) { return true; }
      return (c.name + " " + c.country + " " + c.contact).toLowerCase().indexOf(q) >= 0;
    });
  }

  function table() {
    var rows = list();
    if (!rows.length) {
      return '<div class="empty">' + EH.icon("search") + '<div class="empty-t">' + EH.esc(EH.t("dc.empty")) + "</div></div>";
    }
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      + "<th>" + EH.esc(EH.t("c.org")) + "</th><th>" + EH.esc(EH.t("c.jurisdiction")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.type")) + "</th><th>" + EH.esc(EH.t("c.contact")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.sla")) + "</th><th>" + EH.esc(EH.t("c.status")) + "</th>"
      + "</tr></thead><tbody>" + rows.map(function (c) {
          return "<tr>"
            + '<td><span class="cell-main">' + EH.companyLogo(c.id)
            + '<span class="strong">' + EH.esc(c.name) + "</span></span></td>"
            + '<td class="nowrap"><span class="org-cell">' + EH.flag(c.cc) + "<span>" + EH.esc(c.country) + "</span></span></td>"
            + '<td class="nowrap">' + EH.esc(EH.t("co." + c.type)) + "</td>"
            + '<td class="num muted">' + EH.esc(c.contact) + "</td>"
            + '<td class="nowrap num">' + c.sla + " " + EH.esc(EH.t("c.days")) + "</td>"
            + "<td>" + (c.active
                ? '<span class="pill pill-success">' + EH.esc(EH.t("c.active")) + "</span>"
                : '<span class="pill pill-outline">' + EH.esc(EH.t("c.blocked")) + "</span>") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
  }

  window.PAGE = {
    key: "companies",
    roles: ["admin"],
    crumb: "nav.companies",

    render: function () {
      var seg = TYPES.map(function (t) {
        return '<button class="' + (t === state.t ? "is-on" : "") + '" data-t="' + t + '">'
          + EH.esc(t === "all" ? EH.t("act.all") : EH.t("co." + t)) + "</button>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("co.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("co.sub")) + "</div></div>"
        + '<div class="page-head-r"><button class="btn btn-primary js-stub">'
        + EH.icon("plus", "ic-sm") + EH.esc(EH.t("co.add")) + "</button></div></div>"
        + '<section class="card reveal"><div class="toolbar">'
        + '<div class="seg" id="coSeg">' + seg + "</div>"
        + '<div class="search">' + EH.icon("search")
        +   '<input class="input" id="coQ" type="search" placeholder="' + EH.esc(EH.t("co.search")) + '" aria-label="' + EH.esc(EH.t("co.search")) + '"></div>'
        + "</div><div id=\"coBody\"></div></section>";
    },

    after: function (page) {
      function repaint() { page.querySelector("#coBody").innerHTML = table(); }
      repaint();
      page.querySelectorAll("#coSeg [data-t]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.t = b.getAttribute("data-t");
          page.querySelectorAll("#coSeg [data-t]").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on");
          repaint();
        });
      });
      var q = page.querySelector("#coQ");
      q.value = state.q;
      q.addEventListener("input", function () { state.q = q.value; repaint(); });
      page.querySelectorAll(".js-stub").forEach(function (b) {
        b.addEventListener("click", function () { EH.toast(EH.t("ts.soon")); });
      });
    }
  };

})(window.EH);
