/* ============================================================================
   download.js — настоящие выгрузки вместо заглушек.

   Бэкенда и файлового хранилища у прототипа нет, поэтому содержимое файлов
   собирается на клиенте из тех же данных, что показаны на экране:
     · реестры и журналы  → CSV (разделитель «;», BOM — чтобы Excel не ломал кириллицу)
     · сроки исполнения   → ICS (стандартный календарь)
     · официальное письмо → печатная форма и «Сохранить как PDF» средствами браузера
     · вложения           → текст письма / карточка файла с контрольной суммой

   В бою: файлы лежат в MinIO/S3 и отдаются по ссылке, PDF собирает сервер.
   ========================================================================= */
(function (EH) {
  "use strict";

  /* ------------------------------------------------------------ базовое -- */
  EH.download = function (name, content, mime) {
    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    /* URL живёт до следующего кадра — иначе Safari не успевает начать загрузку */
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    EH.toast(EH.t("ts.downloaded") + " — " + name, "success");
  };

  function stamp() {
    var d = EH.TODAY;
    return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
  }

  /* ---------------------------------------------------------------- CSV -- */
  function cell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  EH.toCSV = function (rows) {
    return "﻿" + rows.map(function (r) { return r.map(cell).join(";"); }).join("\r\n");
  };
  EH.downloadCSV = function (base, rows) {
    EH.download(base + "_" + stamp() + ".csv", EH.toCSV(rows), "text/csv");
  };

  /* ---------------------------------------------------------------- ICS -- */
  function icsDate(iso) {
    return String(iso).replace(/-/g, "");
  }
  function icsText(s) {
    return String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  }
  /* events: [{uid, date:'YYYY-MM-DD', title, desc}] — события на весь день */
  EH.downloadICS = function (base, events) {
    var out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//E-HAMKOR//prototype//RU", "CALSCALE:GREGORIAN"];
    events.forEach(function (e) {
      var end = new Date(e.date);
      end.setDate(end.getDate() + 1);
      out.push("BEGIN:VEVENT",
        "UID:" + e.uid + "@e-hamkor.uz",
        "DTSTAMP:" + icsDate(e.date) + "T090000Z",
        "DTSTART;VALUE=DATE:" + icsDate(e.date),
        "DTEND;VALUE=DATE:" + icsDate(end.toISOString().slice(0, 10)),
        "SUMMARY:" + icsText(e.title),
        "DESCRIPTION:" + icsText(e.desc || ""),
        "END:VEVENT");
    });
    out.push("END:VCALENDAR");
    EH.download(base + "_" + stamp() + ".ics", out.join("\r\n"), "text/calendar");
  };

  /* -------------------------------------------- официальное письмо (PDF) -- */
  /* Печать через скрытый iframe: браузер сам кладёт PDF с правильными шрифтами
     и всеми тремя языками. Генерировать PDF руками нельзя — базовые шрифты
     PDF не содержат кириллицы, а встраивать шрифт в прототип избыточно. */
  function letterHTML(doc) {
    var c = EH.companyById(doc.org);
    var esc = EH.esc;
    var li = ["pp.li1", "pp.li2", "pp.li3"].map(function (k) {
      return "<li>" + esc(EH.t(k)) + "</li>";
    }).join("");

    return '<!doctype html><html lang="' + EH.state.lang + '"><head><meta charset="utf-8">'
      + "<title>" + esc(doc.id) + "</title><style>"
      + '@page{size:A4;margin:22mm 18mm}'
      + 'body{font:13px/1.65 -apple-system,"Segoe UI",system-ui,sans-serif;color:#16181c;margin:0}'
      + '.hd{display:flex;gap:16px;align-items:flex-start;border-bottom:2px solid #16181c;padding-bottom:12px;margin-bottom:22px}'
      + '.hd b{display:block;font-size:14px}.hd .o{font-size:12px;color:#3b4250;flex:1}'
      + '.hd .n{text-align:right;font-size:11.5px;color:#6b7480;white-space:nowrap}'
      + 'p{margin:0 0 12px}ol{margin:0 0 12px;padding-left:22px}li{margin-bottom:6px}'
      + '.sg{margin-top:42px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}'
      + '.st{width:118px;height:118px;border-radius:50%;border:2px solid #2f8f4e;color:#2f8f4e;'
      + 'display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;'
      + 'font-size:9.5px;font-weight:700;text-transform:uppercase;transform:rotate(-7deg)}'
      + "</style></head><body>"
      + '<div class="hd"><div class="o"><b>' + esc(EH.t("org.gp")) + "</b>" + esc(EH.t("org.navoiy")) + "</div>"
      + '<div class="n">' + esc(doc.id) + "<br>" + esc(EH.fmtDate(doc.updated)) + "</div></div>"
      + "<p><b>" + esc(EH.t("pp.to")) + ":</b> " + esc(c ? c.name + ", " + c.country : "—") + "</p>"
      + "<p><b>" + esc(EH.t("pp.subject")) + ":</b> " + esc(EH.t(doc.title)) + "</p>"
      + "<p>" + esc(EH.t("pp.body1")) + "</p><ol>" + li + "</ol>"
      + "<p>" + esc(EH.t("pp.body2")) + "</p>"
      + '<div class="sg"><div><p>' + esc(EH.t("pp.regards")) + "</p>"
      + "<p><b>Kamol Rahimov</b><br>" + esc(EH.t("role.rahbar")) + "</p></div>"
      + '<div class="st">' + esc(EH.t("pp.stamp")) + "<br>" + esc(EH.t("pp.stampOk")) + "</div></div>"
      + "</body></html>";
  }

  EH.printDocument = function (doc) {
    if (!doc) { return; }
    var f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(f);

    var d = f.contentWindow.document;
    d.open();
    d.write(letterHTML(doc));
    d.close();

    EH.toast(EH.t("ts.printPdf"));
    setTimeout(function () {
      try { f.contentWindow.focus(); f.contentWindow.print(); }
      catch (e) { EH.toast(EH.t("ts.printFail"), "danger"); }
      setTimeout(function () { f.remove(); }, 2000);
    }, 350);
  };

  /* ------------------------------------------------------------ вложения - */
  /* Содержимое берётся из данных: для запроса — текст письма, для остальных
     карточка файла с версией и контрольной суммой. */
  function plainLetter(doc) {
    var c = EH.companyById(doc.org);
    var L = [];
    L.push(EH.t("org.gp"));
    L.push(EH.t("org.navoiy"));
    L.push("");
    L.push(doc.id + "   " + EH.fmtDate(doc.updated));
    L.push("");
    L.push(EH.t("pp.to") + ": " + (c ? c.name + ", " + c.country : "—"));
    L.push(EH.t("pp.subject") + ": " + EH.t(doc.title));
    L.push("");
    L.push(EH.t("pp.body1"));
    L.push("  1. " + EH.t("pp.li1"));
    L.push("  2. " + EH.t("pp.li2"));
    L.push("  3. " + EH.t("pp.li3"));
    L.push("");
    L.push(EH.t("pp.body2"));
    L.push("");
    L.push(EH.t("pp.regards"));
    L.push("Kamol Rahimov, " + EH.t("role.rahbar"));
    return L.join("\r\n");
  }

  function fileCard(f, doc) {
    var c = doc ? EH.companyById(doc.org) : null;
    var L = [];
    L.push("E-HAMKOR");
    L.push("");
    L.push(EH.t("c.file") + ": " + f.name);
    L.push(EH.t("c.number") + ": " + f.doc);
    if (doc) { L.push(EH.t("c.subject") + ": " + EH.t(doc.title)); }
    if (c) { L.push(EH.t("c.org") + ": " + c.name + ", " + c.country); }
    L.push(EH.t("c.version") + ": " + f.ver);
    L.push(EH.t("c.size") + ": " + f.size);
    L.push(EH.t("c.checksum") + ": " + f.sum);
    L.push(EH.t("c.updated") + ": " + f.ts);
    L.push("");
    L.push(EH.t("dl.note"));
    return L.join("\r\n");
  }

  EH.downloadAttachment = function (f) {
    var doc = EH.docById(f.doc);
    var base = f.name.replace(/\.[^.]+$/, "");
    /* Файла как такового нет, поэтому расширение честно меняем на то,
       что реально лежит внутри, а не выдаём текст за .docx или .pdf. */
    var body = /_request/.test(f.name) && doc
      ? plainLetter(doc) + "\r\n\r\n---\r\n" + fileCard(f, doc)
      : fileCard(f, doc);
    EH.download(base + ".txt", body, "text/plain");
  };

})(window.EH = window.EH || {});
