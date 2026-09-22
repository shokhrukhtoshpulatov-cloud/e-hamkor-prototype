/* Карточка документа. Здесь живёт демонстрация сквозного цикла: кнопки строго
   из EH.actionsFor(role, status), переход реально меняет статус. */
(function (EH) {
  "use strict";

  function stepper(doc) {
    var curStep = EH.statuses[doc.status].step;
    var steps = EH.flowSteps;
    /* «Возвращён» — не отдельная колонка степпера, а состояние этапа утверждения */
    if (doc.status === "returned") { curStep = 1; }
    return '<div class="flow">' + steps.map(function (s, i) {
      var st = EH.statuses[s];
      var cls = i < curStep ? "is-done" : i === curStep ? "is-now" : "";
      var inner = i < curStep ? EH.icon("check") : String(i + 1);
      return '<div class="flow-step ' + cls + '">'
        + '<span class="flow-dot">' + inner + "</span>"
        + '<span class="flow-lbl">' + EH.esc(EH.t(st.key)) + "</span></div>";
    }).join("") + "</div>";
  }

  function actions(doc) {
    var list = EH.actionsFor(EH.state.role, doc.status);
    var btns = list.map(function (a) {
      if (a.href) {
        return '<a class="btn ' + a.cls + '" href="' + a.href + "?id=" + encodeURIComponent(doc.id) + '">'
          + EH.icon(a.icon, "ic-sm") + EH.esc(EH.t(a.key)) + "</a>";
      }
      return '<button class="btn ' + a.cls + '" data-to="' + a.to + '" data-msg="' + a.key + '">'
        + EH.icon(a.icon, "ic-sm") + EH.esc(EH.t(a.key)) + "</button>";
    }).join("");
    var pdf = '<button class="btn btn-subtle" id="dvPdf">' + EH.icon("pdf", "ic-sm") + EH.esc(EH.t("act.pdf")) + "</button>";
    return '<div class="card-foot" style="justify-content:flex-start;gap:9px;flex-wrap:wrap">'
      + '<span class="eyebrow" style="width:100%;margin-bottom:2px">' + EH.esc(EH.t("dv.actions")) + "</span>"
      + btns + pdf
      + (list.length ? "" : '<span class="muted" style="font-size:12.5px;margin-left:4px">' + EH.esc(EH.t("dv.noActions")) + "</span>")
      + "</div>";
  }

  function timeline(doc) {
    return '<div class="vtimeline">' + EH.timelineFor(doc).map(function (e) {
      var cls = e.state === "done" ? "is-done" : e.state === "now" ? "is-now" : "is-wait";
      var ic = e.state === "wait" ? "clock" : "check";
      var meta = e.state === "wait"
        ? '<span class="pill pill-outline">' + EH.esc(EH.t("tl.wait")) + "</span>"
        : '<span class="num">' + EH.esc(EH.fmtDateTime(e.t)) + '</span><span class="dot-sep"></span>' + EH.esc(e.who);
      return '<div class="vt-item ' + cls + '"><span class="vt-dot">' + EH.icon(ic) + "</span>"
        + '<div class="vt-body"><div class="vt-title">' + EH.esc(EH.t(e.d)) + "</div>"
        + '<div class="vt-meta">' + meta + "</div></div></div>";
    }).join("") + "</div>";
  }

  function info(doc) {
    var c = EH.companyById(doc.org);
    var kv = [
      ["c.number", '<span class="num">' + EH.esc(doc.id) + "</span>"],
      ["c.type", EH.esc(EH.docTypeLabel(doc.type))],
      ["c.org", EH.orgCell(doc.org)],
      ["c.jurisdiction", EH.esc(c ? c.country : "—")],
      ["c.contact", '<span class="num">' + EH.esc(c ? c.contact : "—") + "</span>"],
      ["c.sla", c ? c.sla + " " + EH.esc(EH.t("c.days")) : "—"],
      ["c.deadline", EH.deadlineCell(doc.deadline, doc.days, doc.status)],
      ["c.author", EH.esc(EH.t(EH.roleById(doc.author).key))]
    ];
    return '<div class="card-body"><div class="doc-meta">' + kv.map(function (r) {
      return '<div><div class="k">' + EH.esc(EH.t(r[0])) + '</div><div class="v">' + r[1] + "</div></div>";
    }).join("") + "</div></div>";
  }

  function files(doc) {
    var list = EH.files.filter(function (f) { return f.doc === doc.id; });
    if (!list.length) {
      return '<div class="empty" style="padding:28px"><div class="empty-d">' + EH.esc(EH.t("c.none")) + "</div></div>";
    }
    return list.map(function (f) {
      return '<div class="frow"><span class="frow-ic">' + EH.icon("docs") + "</span>"
        + '<span class="frow-b"><span class="frow-t">' + EH.esc(f.name) + "</span>"
        + '<span class="frow-m"><span class="num">' + EH.esc(f.size) + "</span><span class=\"dot-sep\"></span>"
        + EH.esc(EH.t("c.version")) + " " + f.ver + '<span class="dot-sep"></span><span class="num">' + EH.esc(f.sum) + "</span></span></span>"
        + '<button class="btn btn-ghost btn-icon btn-sm js-dl" data-file="' + EH.esc(f.name) + '" aria-label="'
        + EH.esc(EH.t("act.download")) + '">' + EH.icon("download", "ic-sm") + "</button></div>";
    }).join("");
  }

  window.PAGE = {
    key: "documents",
    crumb: "dv.info",
    parent: { l: "nav.docs", h: "documents.html" },

    render: function () {
      var doc = EH.docById(EH.qs("id")) || EH.visibleDocs(EH.state.role)[0];
      if (!doc) {
        return '<div class="empty">' + EH.icon("docs") + '<div class="empty-t">' + EH.esc(EH.t("dc.empty")) + "</div></div>";
      }
      this._doc = doc;

      return '<div class="page-head"><div class="page-head-l">'
        + '<div class="row-tight" style="margin-bottom:6px"><span class="num strong">' + EH.esc(doc.id) + "</span>"
        + EH.statusPill(doc.status) + "</div>"
        + "<h1>" + EH.esc(EH.t(doc.title)) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.docTypeLabel(doc.type)) + " · " + EH.esc(EH.t("c.updated")).toLowerCase()
        + " " + EH.esc(EH.fmtDate(doc.updated)) + "</div></div>"
        + '<div class="page-head-r">' + EH.deadlineCell(doc.deadline, doc.days, doc.status) + "</div></div>"

        + '<section class="card card-pad reveal"><div class="eyebrow" style="margin-bottom:14px">'
        + EH.esc(EH.t("dv.flow")) + "</div>" + stepper(doc) + "</section>"

        + '<div class="grid g-21 mt-14">'
        +   '<section class="card reveal reveal-2">'
        +     '<div class="card-head"><h2>' + EH.esc(EH.t("dv.info")) + "</h2></div>"
        +     info(doc) + actions(doc)
        +     '<div class="card-head" style="border-top:1px solid var(--border)"><h2>' + EH.esc(EH.t("dv.files")) + "</h2></div>"
        +     files(doc)
        +   "</section>"
        +   '<section class="card reveal reveal-3">'
        +     '<div class="card-head"><h2>' + EH.esc(EH.t("dv.timeline")) + "</h2></div>"
        +     '<div class="card-body">' + timeline(doc) + "</div>"
        +   "</section>"
        + "</div>";
    },

    after: function (page) {
      var doc = this._doc;
      if (!doc) { return; }
      page.querySelectorAll("[data-to]").forEach(function (b) {
        b.addEventListener("click", function () {
          window.EHact(doc.id, b.getAttribute("data-to"), "ts.status");
        });
      });
      page.querySelector("#dvPdf").addEventListener("click", function () {
        EH.printDocument(doc);
      });
      page.querySelectorAll(".js-dl").forEach(function (b) {
        b.addEventListener("click", function () {
          var name = b.getAttribute("data-file");
          var f = EH.files.filter(function (x) { return x.name === name; })[0];
          if (f) { EH.downloadAttachment(f); }
        });
      });
      page.querySelectorAll(".js-stub").forEach(function (b) {
        b.addEventListener("click", function () { EH.toast(EH.t("ts.soon")); });
      });
    }
  };

})(window.EH);
