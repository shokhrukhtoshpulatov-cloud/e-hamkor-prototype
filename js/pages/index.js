/* Вход. Авторизации в прототипе нет — выбирается демо-роль.
   Страница рисуется без оболочки, поэтому собирает себя сама. */
(function (EH) {
  "use strict";

  function facts() {
    return [
      { v: EH.companies.length, k: "lg.f1" },
      { v: "30–45",             k: "lg.f2" },
      { v: EH.regions.length,   k: "lg.f3" }
    ].map(function (f) {
      return '<div class="login-fact"><div class="v">' + EH.esc(f.v) + '</div><div class="k">' + EH.esc(EH.t(f.k)) + "</div></div>";
    }).join("");
  }

  function roleCards() {
    return EH.roles.map(function (r) {
      return '<button class="role-card" data-role="' + r.id + '">'
        + EH.avatar(r.initials, r.color, "ava-lg")
        + '<span class="role-b"><span class="role-n">' + EH.esc(EH.t(r.key)) + "</span>"
        + '<span class="role-o">' + EH.esc(EH.t(r.roleKey)) + "</span></span>"
        + EH.icon("right") + "</button>";
    }).join("");
  }

  function markers() {
    var seen = {}, out = [];
    EH.docs.forEach(function (d) {
      var c = EH.companyById(d.org);
      if (!c || seen[c.cc]) { return; }
      seen[c.cc] = 1;
      out.push({ cc: c.cc, level: "ok", label: c.name });
    });
    return out;
  }

  function render() {
    var lang = EH.state.lang;
    document.title = EH.t("lg.h") + " · " + EH.t("app.name");

    document.body.innerHTML = '<div class="login">'
      + '<aside class="login-aside">'
      +   EH.worldMapDecor(markers(), { flow: true, ambient: true, fit: "cover", focus: [30, 30] })
      +   '<div class="brand" aria-label="E-HAMKOR">' + EH.brandLogo("lg") + "</div>"
      +   '<div class="login-claim reveal reveal-2"><h2>' + EH.esc(EH.t("lg.claim")) + "</h2>"
      +     "<p>" + EH.esc(EH.t("lg.claimD")) + "</p></div>"
      +   '<div class="login-facts reveal reveal-4">' + facts() + "</div>"
      + "</aside>"
      + '<main class="login-main"><div class="login-box reveal">'
      +   '<div class="brand" aria-label="E-HAMKOR">' + EH.brandLogo("lg") + "</div>"
      +   "<h1>" + EH.esc(EH.t("lg.h")) + "</h1>"
      +   '<div class="lead">' + EH.esc(EH.t("lg.lead")) + "</div>"
      +   '<div class="role-list">' + roleCards() + "</div>"
      +   '<div class="note">' + EH.icon("info") + "<span>" + EH.esc(EH.t("lg.note")) + "</span></div>"
      +   '<div class="login-foot">'
      +     '<div class="login-lang">' + EH.langs.map(function (l) {
              return '<button data-lang="' + l + '" class="' + (l === lang ? "is-on" : "") + '">' + l.toUpperCase() + "</button>";
            }).join("") + "</div>"
      +     '<button class="btn btn-subtle btn-sm" id="themeBtn">' + EH.icon(EH.state.theme === "dark" ? "sun" : "moon")
      +       "<span>" + EH.esc(EH.t(EH.state.theme === "dark" ? "menu.light" : "menu.dark")) + "</span></button>"
      +   "</div>"
      + "</div></main></div>";

    EH.mountWorldMaps(document);

    document.querySelectorAll("[data-role]").forEach(function (b) {
      b.addEventListener("click", function () {
        /* новая роль — сбрасываем язык, чтобы forceLang партнёра применился чисто */
        try { localStorage.removeItem("eh_lang"); } catch (e) {}
        EH.setRole(b.getAttribute("data-role"));
        /* «Раздел после входа» из настроек; по умолчанию рабочий стол */
        location.href = (EH.prefs && EH.prefs.start) || "dashboard.html";
      });
    });
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.addEventListener("click", function () { EH.setLang(b.getAttribute("data-lang")); });
    });
    document.getElementById("themeBtn").addEventListener("click", function () {
      EH.setTheme(EH.state.theme === "dark" ? "light" : "dark");
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else { render(); }

})(window.EH);
