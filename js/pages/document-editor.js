/* Редактор, шаг 2 из 4. ONLYOFFICE замокан — важна одна вещь: отправка
   заблокирована, пока документ не подписан ЭЦП, и печать в макете серая. */
(function (EH) {
  "use strict";

  function paper(doc) {
    var c = EH.companyById(doc ? doc.org : "binance");
    return '<div class="paper" id="paper">'
      + '<div class="paper-head">'
      +   '<img src="assets/ehamkor-mark.svg" alt="">'
      +   '<div class="paper-org"><b>' + EH.esc(EH.t("org.gp")) + "</b>"
      +     EH.esc(EH.t("org.navoiy")) + "</div>"
      +   '<div class="paper-no">' + EH.esc(doc ? doc.id : "EH-2026-0428") + "<br>"
      +     EH.esc(EH.fmtDate(EH.TODAY.getFullYear() + "-09-16")) + "</div>"
      + "</div>"
      + "<p><b>" + EH.esc(EH.t("pp.to")) + ":</b> " + EH.esc(c ? c.name + ", " + c.country : "—") + "</p>"
      + "<p><b>" + EH.esc(EH.t("pp.subject")) + ":</b> " + EH.esc(doc ? EH.t(doc.title) : EH.t("doc.0428")) + "</p>"
      + "<p>" + EH.esc(EH.t("pp.body1")) + "</p>"
      + "<ol><li>" + EH.esc(EH.t("pp.li1")) + "</li><li>" + EH.esc(EH.t("pp.li2")) + "</li><li>" + EH.esc(EH.t("pp.li3")) + "</li></ol>"
      + "<p>" + EH.esc(EH.t("pp.body2")) + "</p>"
      + '<div class="paper-sign">'
      +   "<div><p>" + EH.esc(EH.t("pp.regards")) + "</p><p><b>Kamol Rahimov</b><br>"
      +     '<span style="color:#6b7480;font-size:12px">' + EH.esc(EH.t("role.rahbar")) + "</span></p></div>"
      +   '<div class="stamp" id="stamp">' + EH.icon("stamp")
      +     "<span>" + EH.esc(EH.t("pp.stamp")) + "</span>"
      +     '<span id="stampState">' + EH.esc(EH.t("ed.notSigned")) + "</span></div>"
      + "</div></div>";
  }

  window.PAGE = {
    key: "documents",
    crumb: "ed.title",
    parent: { l: "nav.docs", h: "documents.html" },

    render: function () {
      var doc = EH.docById(EH.qs("id"));
      this._doc = doc;

      return '<div class="page-head"><div class="page-head-l">'
        + '<div class="row-tight" style="margin-bottom:6px"><span class="num strong">'
        + EH.esc(doc ? doc.id : "EH-2026-0428") + "</span>"
        + '<span class="pill pill-outline">' + EH.esc(EH.t("st.draft")) + "</span></div>"
        + "<h1>" + EH.esc(EH.t("ed.title")) + "</h1>"
        + '<div class="sub">' + EH.esc(EH.t("ed.onlyoffice")) + "</div></div>"
        + '<div class="page-head-r"><span class="page-date">' + EH.icon("cloudup", "ic-sm") + EH.esc(EH.t("ed.saved")) + "</span></div></div>"

        + '<div class="editor-wrap">'
        + '<div class="stack">'
        +   '<section class="card"><div class="editor-tools">'
        +     ["edit", "list", "grid", "attach", "link", "print"].map(function (i, n) {
                return '<button class="btn btn-ghost btn-icon btn-sm js-stub" aria-label="' + i + '">' + EH.icon(i, "ic-sm") + "</button>"
                  + (n === 2 ? '<span class="sep"></span>' : "");
              }).join("")
        +     '<span class="toolbar-sp"></span>'
        +     '<span class="muted" style="font-size:12px">318 ' + EH.esc(EH.t("ed.words")) + "</span>"
        +   "</div></section>"
        +   '<div class="reveal">' + paper(doc) + "</div>"
        + "</div>"

        + '<div class="editor-side stack">'
        +   '<section class="card reveal reveal-2">'
        +     '<div class="card-head"><h3>' + EH.esc(EH.t("ed.sign")) + "</h3></div>"
        +     '<div class="card-body">'
        +       '<div class="note" id="signNote">' + EH.icon("lock") + "<span>" + EH.esc(EH.t("ed.signHint")) + "</span></div>"
        +       '<button class="btn btn-primary btn-lg" id="signBtn" style="width:100%;margin-top:12px">'
        +         EH.icon("sign", "ic-sm") + EH.esc(EH.t("act.sign")) + "</button>"
        +     "</div>"
        +   "</section>"
        +   '<section class="card reveal reveal-3">'
        +     '<div class="card-head"><h3>' + EH.esc(EH.t("ed.attachments")) + "</h3></div>"
        +     '<div class="card-body"><button class="btn btn-subtle js-stub" style="width:100%">'
        +       EH.icon("attach", "ic-sm") + EH.esc(EH.t("act.attach")) + "</button></div>"
        +   "</section>"
        +   '<section class="card card-pad reveal reveal-4">'
        +     '<a class="btn btn-primary btn-lg" id="sendBtn" href="document-detail.html' + (doc ? "?id=" + encodeURIComponent(doc.id) : "")
        +       '" aria-disabled="true" style="width:100%;pointer-events:none">'
        +       EH.icon("send", "ic-sm") + EH.esc(EH.t("act.sendBoss")) + "</a>"
        +     '<a class="btn btn-ghost" href="documents.html" style="width:100%;margin-top:8px">' + EH.esc(EH.t("act.cancel")) + "</a>"
        +   "</section>"
        + "</div></div>";
    },

    after: function (page) {
      var signBtn = page.querySelector("#signBtn");
      var sendBtn = page.querySelector("#sendBtn");
      var stamp = page.querySelector("#stamp");
      var stampState = page.querySelector("#stampState");
      var note = page.querySelector("#signNote");

      signBtn.addEventListener("click", function () {
        stamp.classList.add("is-signed");
        stampState.textContent = EH.t("pp.stampOk");

        sendBtn.style.pointerEvents = "";
        sendBtn.setAttribute("aria-disabled", "false");

        note.className = "note note-accent";
        note.innerHTML = EH.icon("checkc") + "<span>" + EH.esc(EH.t("ed.signedOk")) + "</span>";

        signBtn.setAttribute("data-done", "1");
        signBtn.setAttribute("aria-disabled", "true");
        signBtn.innerHTML = EH.icon("checkc", "ic-sm") + EH.esc(EH.t("act.signed"));

        EH.toast(EH.t("ts.signed"), "success");
      });

      page.querySelectorAll(".js-stub").forEach(function (b) {
        b.addEventListener("click", function () { EH.toast(EH.t("ts.soon")); });
      });
    }
  };

})(window.EH);
