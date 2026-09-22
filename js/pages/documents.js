/* Реестр документов. Статусные фильтры — не разделы навигации, а табы одного
   реестра: это сократило первый уровень меню и убрало дубли. */
(function (EH) {
  "use strict";

  /* Период отбирает по «Обновлён» — единственной дате движения документа
     в данных прототипа. По умолчанию «весь период»: реестр не должен
     на старте прятать записи, о которых не просили. */
  /* q приходит из глобального поиска (js/search.js): запрос, начатый в
     топбаре, продолжается здесь, а не набирается заново. */
  var state = { f: EH.qs("f", "all"), q: EH.qs("q", ""), org: "", period: EH.presetRange(EH.prefs.period) };

  /* Счётчики табов учитывают период: иначе таб обещает 6 документов,
     а отобранная таблица показывает 2. */
  function counts() {
    var c = {};
    EH.docFilters.forEach(function (f) {
      c[f] = EH.filterDocs(f).filter(function (d) {
        return EH.inPeriod(state.period, d.updated);
      }).length;
    });
    return c;
  }

  function apply() {
    var q = state.q.toLowerCase().trim();
    return EH.filterDocs(state.f).filter(function (d) {
      if (!EH.inPeriod(state.period, d.updated)) { return false; }
      if (state.org && d.org !== state.org) { return false; }
      if (!q) { return true; }
      var c = EH.companyById(d.org);
      return (d.id + " " + EH.t(d.title) + " " + (c ? c.name + " " + c.country : "")).toLowerCase().indexOf(q) >= 0;
    });
  }

  function table(rows) {
    if (!rows.length) {
      return '<div class="empty">' + EH.icon("search")
        + '<div class="empty-t">' + EH.esc(EH.t("dc.empty")) + "</div>"
        + '<div class="empty-d">' + EH.esc(EH.t("dc.empty.d")) + "</div></div>";
    }
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      + "<th>" + EH.esc(EH.t("c.number")) + "</th><th>" + EH.esc(EH.t("c.org")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.type")) + "</th><th>" + EH.esc(EH.t("c.status")) + "</th>"
      + "<th>" + EH.esc(EH.t("c.deadline")) + "</th><th>" + EH.esc(EH.t("c.updated")) + "</th>"
      + "</tr></thead><tbody>" + rows.map(EH.docRow).join("") + "</tbody></table></div>";
  }

  function foot(shown, total) {
    return '<div class="card-foot"><span class="muted" style="font-size:12.5px">'
      + EH.esc(EH.t("c.showing")) + " <b class=\"strong num\">" + shown + "</b> / " + total + " " + EH.esc(EH.t("c.docs"))
      + "</span></div>";
  }

  function repaint(page) {
    var rows = apply();
    page.querySelector("#docsBody").innerHTML = table(rows) + foot(rows.length, EH.visibleDocs(EH.state.role).length);
    var c = counts();
    page.querySelectorAll("#docTabs [data-f]").forEach(function (b) {
      b.querySelector(".cnt").textContent = c[b.getAttribute("data-f")];
    });
  }

  window.PAGE = {
    key: "documents",
    crumb: "nav.docs",

    render: function () {
      var c = counts();
      var tabs = EH.docFilters.map(function (f) {
        return '<button class="' + (f === state.f ? "is-on" : "") + '" data-f="' + f + '">'
          + EH.esc(EH.t("dc.f." + f)) + '<span class="cnt">' + c[f] + "</span></button>";
      }).join("");

      var orgs = EH.companies.filter(function (co) {
        return EH.visibleDocs(EH.state.role).some(function (d) { return d.org === co.id; });
      }).map(function (co) {
        /* data-flag/data-sub видит только наш дропдаун: в списке организация
           читается так же, как в таблице — флаг, название, юрисдикция. */
        return '<option value="' + co.id + '" data-flag="' + EH.esc(co.cc) + '" data-sub="'
          + EH.esc(co.country) + '">' + EH.esc(co.name) + "</option>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l">'
        + "<h1>" + EH.esc(EH.t("dc.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("dc.sub")) + "</div></div>"
        + '<div class="page-head-r">'
        + (EH.state.role === "company" ? "" : '<a class="btn btn-primary" href="document-create.html">' + EH.icon("plus", "ic-sm") + EH.esc(EH.t("act.create")) + "</a>")
        + "</div></div>"
        + '<section class="card reveal">'
        + '<div class="tabs" id="docTabs" style="padding:0 8px">' + tabs + "</div>"
        + '<div class="toolbar">'
        +   '<div class="search">' + EH.icon("search")
        +     '<input class="input" id="docQ" type="search" placeholder="' + EH.esc(EH.t("dc.search")) + '" aria-label="' + EH.esc(EH.t("dc.search")) + '"></div>'
        +   '<select class="select" id="docOrg" aria-label="' + EH.esc(EH.t("c.org")) + '">'
        +     '<option value="">' + EH.esc(EH.t("dc.orgAll")) + "</option>" + orgs + "</select>"
        +   EH.periodButton(state.period, { id: "docPeriod", cls: "btn-sm" })
        +   '<span class="toolbar-sp"></span>'
        +   '<button class="btn btn-subtle btn-sm" id="docReset">' + EH.icon("refresh", "ic-sm") + EH.esc(EH.t("act.reset")) + "</button>"
        + "</div>"
        + '<div id="docsBody"></div>'
        + "</section>";
    },

    after: function (page) {
      repaint(page);
      page.querySelectorAll("#docTabs [data-f]").forEach(function (b) {
        b.addEventListener("click", function () {
          state.f = b.getAttribute("data-f");
          page.querySelectorAll("#docTabs [data-f]").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on");
          history.replaceState(null, "", "?f=" + state.f);
          repaint(page);
        });
      });
      var q = page.querySelector("#docQ");
      q.value = state.q;
      q.addEventListener("input", function () { state.q = q.value; repaint(page); });
      var o = page.querySelector("#docOrg");
      o.addEventListener("change", function () { state.org = o.value; repaint(page); });
      var per = EH.mountPeriod(page.querySelector("#docPeriod"), {
        value: state.period,
        onChange: function (v) { state.period = v; repaint(page); }
      });
      page.querySelector("#docReset").addEventListener("click", function () {
        state.q = ""; state.org = ""; q.value = ""; o.value = "";
        state.period = EH.presetRange(EH.prefs.period);
        per.set(state.period);
        repaint(page);
      });
    }
  };

})(window.EH);
