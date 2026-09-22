/* Мастер создания, шаг 1 из 4.
   Три вещи, ради которых он в прототипе: валидация организации, автоподстановка
   срока из реестра и подсказка сменить язык шаблона на английский. */
(function (EH) {
  "use strict";

  var STEPS = [
    { t: "cr.step1", d: "cr.step1.d" },
    { t: "cr.step2", d: "cr.step2.d" },
    { t: "cr.step3", d: "cr.step3.d" },
    { t: "cr.step4", d: "cr.step4.d" }
  ];

  function iso(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  window.PAGE = {
    key: "documents",
    crumb: "cr.title",
    parent: { l: "nav.docs", h: "documents.html" },

    render: function () {
      var steps = STEPS.map(function (s, i) {
        var cls = i === 0 ? "is-on" : "";
        return '<div class="wstep ' + cls + '">'
          + '<div class="st">' + EH.esc(i === 0 ? EH.t("cr.current") : EH.t("cr.uncompleted")) + "</div>"
          + '<div class="tt">' + (i + 1) + ". " + EH.esc(EH.t(s.t)) + "</div>"
          + '<div class="dd">' + EH.esc(EH.t(s.d)) + "</div></div>";
      }).join("");

      var orgs = EH.companies.filter(function (c) { return c.active; }).map(function (c) {
        /* Юрисдикция ушла из текста в data-sub — второй строкой пункта. */
        return '<option value="' + c.id + '" data-flag="' + EH.esc(c.cc) + '" data-sub="'
          + EH.esc(c.country) + " · SLA " + c.sla + " " + EH.esc(EH.t("c.days"))
          + '">' + EH.esc(c.name) + "</option>";
      }).join("");
      var types = EH.docTypes.filter(function (t) { return t.id !== "response"; }).map(function (t) {
        return '<option value="' + t.id + '" data-ic="' + t.icon + '">' + EH.esc(EH.t(t.key)) + "</option>";
      }).join("");

      return '<div class="page-head"><div class="page-head-l"><h1>' + EH.esc(EH.t("cr.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("cr.lead")) + "</div></div>"
        + '<div class="page-head-r"><span class="pill pill-success">' + EH.esc(EH.t("cr.draftSaved")) + "</span></div></div>"

        + '<div class="wizard">'
        + '<div class="stack">'
        +   '<section class="card reveal"><div class="wsteps">' + steps + "</div></section>"
        +   '<section class="card card-pad reveal reveal-2">'
        +     '<div class="row-tight" style="margin-bottom:8px">' + EH.icon("help") + "<b class=\"strong\">" + EH.esc(EH.t("cr.help")) + "</b></div>"
        +     '<div class="muted" style="font-size:12.5px;margin-bottom:12px">' + EH.esc(EH.t("cr.helpD")) + "</div>"
        +     '<a class="btn btn-subtle btn-sm" href="help.html">' + EH.icon("help", "ic-sm") + EH.esc(EH.t("cr.gethelp")) + "</a>"
        +   "</section>"
        + "</div>"

        + '<section class="card reveal reveal-2"><div class="wform">'
        +   '<div class="wform-ic">' + EH.icon("newdoc") + "</div>"
        +   "<h2>" + EH.esc(EH.t("cr.h")) + "</h2>"
        +   '<div class="lead">' + EH.esc(EH.t("cr.lead")) + "</div>"

        +   '<div class="field" style="margin-bottom:14px"><label for="crOrg">' + EH.esc(EH.t("cr.org")) + "</label>"
        +     '<select class="select" id="crOrg"><option value="">' + EH.esc(EH.t("cr.orgPh")) + "</option>" + orgs + "</select>"
        +     '<span class="hint" id="crSla" hidden>' + EH.icon("info") + "<span></span></span></div>"

        +   '<div class="wgrid" style="margin-bottom:14px">'
        +     '<div class="field"><label for="crType">' + EH.esc(EH.t("cr.type")) + "</label>"
        +       '<select class="select" id="crType">' + types + "</select></div>"
        +     '<div class="field"><label for="crDl">' + EH.esc(EH.t("cr.deadline")) + "</label>"
        +       EH.dateField(iso(EH.TODAY), { id: "crDl" }) + "</div>"
        +   "</div>"

        +   '<div class="field" style="margin-bottom:14px"><label for="crSubj">' + EH.esc(EH.t("cr.subject")) + "</label>"
        +     '<input class="input" id="crSubj" type="text" placeholder="' + EH.esc(EH.t("cr.subjectPh")) + '"></div>'

        +   '<div class="field" style="margin-bottom:14px"><label for="crLang">' + EH.esc(EH.t("cr.lang")) + "</label>"
        +     '<select class="select" id="crLang"><option value="uz">O‘zbekcha</option><option value="ru">Русский</option>'
        +     '<option value="en">English</option></select></div>'

        +   '<div class="field" style="margin-bottom:22px"><label for="crNote">' + EH.esc(EH.t("cr.notes")) + "</label>"
        +     '<textarea class="input" id="crNote" placeholder="' + EH.esc(EH.t("cr.notesPh")) + '"></textarea></div>'

        +   '<div class="spread"><a class="btn btn-subtle" href="documents.html">' + EH.esc(EH.t("act.cancel")) + "</a>"
        +     '<button class="btn btn-primary" id="crNext">' + EH.esc(EH.t("act.next")) + EH.icon("right", "ic-sm") + "</button></div>"
        + "</div></section></div>";
    },

    after: function (page) {
      var org = page.querySelector("#crOrg");
      /* Срок — собственный календарь: прошлое закрыто, потолок в разумном
         будущем, значение читается и подставляется через dl.set/dl.value */
      var dl = EH.mountDate(page.querySelector("#crDl"), {
        value: iso(EH.TODAY),
        min: iso(EH.TODAY),
        max: iso(new Date(EH.TODAY.getFullYear() + 2, EH.TODAY.getMonth(), EH.TODAY.getDate()))
      });
      var sla = page.querySelector("#crSla");
      var lang = page.querySelector("#crLang");

      /* язык шаблона: «по адресату» — как раньше, иначе жёстко из настроек */
      var langAuto = !EH.prefs.docLang || EH.prefs.docLang === "auto";
      lang.value = langAuto ? EH.state.lang : EH.prefs.docLang;

      org.addEventListener("change", function () {
        org.classList.remove("is-err");
        var c = EH.companyById(org.value);
        if (!c) { sla.hidden = true; return; }

        /* срок подставляется из реестра, но остаётся редактируемым;
           автоподстановку можно выключить в настройках */
        if (EH.prefs.slaAuto) {
          var d = new Date(EH.TODAY);
          d.setDate(d.getDate() + c.sla);
          dl.set(iso(d));
          EH.toast(EH.t("ts.slaSet"), "success");
        }
        sla.hidden = false;
        sla.querySelector("span").textContent = EH.t("cr.slaHint") + " — " + c.sla + " " + EH.t("c.days");

        /* адресат иностранный — шаблон на узбекском почти наверняка ошибка;
           при жёстко выбранном языке шаблона подмену не делаем */
        if (langAuto && lang.value !== "en") {
          lang.value = "en";
          EH.toast(EH.t("ts.langSwitch"), "warn");
        }
      });

      page.querySelector("#crNext").addEventListener("click", function () {
        if (!org.value) {
          org.classList.add("is-err");
          org.focus();
          EH.toast(EH.t("cr.errOrg"), "danger");
          return;
        }
        location.href = "document-editor.html";
      });
    }
  };

})(window.EH);
