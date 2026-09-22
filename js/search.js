/* ============================================================================
   search.js — глобальный поиск топбара (⌘K / Ctrl+K).

   Ищет по тем же данным, что показывают экраны (js/data.js), и ровно в тех
   границах, которые видит текущая роль: партнёр не должен найти чужой
   документ через строку поиска, а обычный сотрудник — реестр пользователей.
   Поэтому источники спрашивают у оболочки её же модель навигации: раздела
   нет в меню — группы нет и в выдаче.

   Источники: документы, организации, пользователи, файлы и сами разделы.
   Последнее превращает поиск заодно в способ перехода по системе: набрать
   «кален» быстрее, чем искать пункт глазами в меню.

   Публичное:
     EH.search.wire(input) — навесить панель на поле топбара
     EH.search.close()     — закрыть панель (зовёт shell.js, когда
                             открывается другой дропдаун топбара)
   ========================================================================= */
(function (EH) {
  "use strict";

  var TOTAL = 12;        /* сколько результатов показываем всего */
  var QUICK = 5;         /* сколько разделов предлагаем при пустом запросе */

  /* ----------------------------------------------------- совпадения ------ */
  /* Регистр не важен, «ё» приравнена к «е»: длина строки при этом не меняется,
     поэтому те же индексы годятся и для подсветки. */
  function low(s) {
    return String(s == null ? "" : s).toLowerCase().replace(/ё/g, "е");
  }
  function tokens(q) {
    return low(q).trim().split(/\s+/).filter(Boolean);
  }

  /* Вес вхождения: начало строки > начало слова > середина. Из-за этого
     «binance» поднимает организацию выше документа, где это слово внутри темы. */
  function hit(text, tok) {
    var i = text.indexOf(tok);
    if (i < 0) { return 0; }
    if (i === 0) { return 3; }
    return /[^a-zа-я0-9]/.test(text.charAt(i - 1)) ? 2 : 1;
  }

  /* Каждое слово запроса должно найтись хоть в одном поле — иначе «binance
     kraken» выдавал бы всё подряд по любому из двух слов. */
  function score(fields, toks) {
    var total = 0;
    for (var t = 0; t < toks.length; t++) {
      var best = 0;
      for (var f = 0; f < fields.length; f++) {
        var s = hit(fields[f][0], toks[t]) * fields[f][1];
        if (s > best) { best = s; }
      }
      if (!best) { return -1; }
      total += best;
    }
    return total;
  }

  /* Подсветка: собираем диапазоны всех вхождений, склеиваем пересечения
     и экранируем текст по кускам — вставлять <mark> в уже готовый HTML нельзя. */
  function mark(text, toks) {
    text = String(text == null ? "" : text);
    if (!toks.length) { return EH.esc(text); }
    var hay = low(text), r = [];
    toks.forEach(function (tok) {
      var i = hay.indexOf(tok);
      while (i >= 0) { r.push([i, i + tok.length]); i = hay.indexOf(tok, i + tok.length); }
    });
    if (!r.length) { return EH.esc(text); }
    r.sort(function (a, b) { return a[0] - b[0]; });
    var out = "", pos = 0;
    r.forEach(function (x) {
      var a = Math.max(x[0], pos), b = Math.max(x[1], pos);
      if (b <= a) { return; }
      out += EH.esc(text.slice(pos, a)) + '<mark class="gs-hl">' + EH.esc(text.slice(a, b)) + "</mark>";
      pos = b;
    });
    return out + EH.esc(text.slice(pos));
  }

  function sep() { return '<span class="dot-sep"></span>'; }

  /* ---------------------------------------------------------- источники -- */
  /* Права берём из меню роли: оно уже собрано в shell.js и остаётся
     единственным местом, где описано, кому какой раздел доступен. */
  function navKeys() {
    var keys = {};
    (EH.navModel ? EH.navModel() : []).forEach(function (g) {
      g.items.forEach(function (it) { keys[it.k] = true; });
    });
    return keys;
  }

  function docItems(toks) {
    var out = [];
    EH.visibleDocs(EH.state.role).forEach(function (d) {
      var c = EH.companyById(d.org);
      var title = EH.t(d.title);
      var st = EH.statuses[d.status];
      var s = score([
        [low(d.id), 3],
        [low(title), 2],
        [low(c ? c.name : ""), 2],
        [low(c ? c.country : ""), 1],
        [low(st ? EH.t(st.key) : ""), 1],
        [low(EH.docTypeLabel(d.type)), 1]
      ], toks);
      if (s < 0) { return; }
      out.push({
        s: s,
        icon: EH.docTypeIcon(d.type),
        main: mark(title, toks),
        sub: '<span class="num">' + mark(d.id, toks) + "</span>"
          + (c ? sep() + mark(c.name, toks) : ""),
        tail: EH.statusPill(d.status),
        href: "document-detail.html?id=" + encodeURIComponent(d.id)
      });
    });
    return out;
  }

  /* Организации — отдельной группой только там, где есть их реестр (админ).
     Остальным ролям название компании всё равно находит её документы. */
  function orgItems(toks, keys) {
    if (!keys.companies) { return []; }
    var out = [];
    EH.companies.forEach(function (c) {
      var s = score([
        [low(c.name), 3], [low(c.country), 1], [low(c.contact), 1],
        [low(EH.t("co." + c.type)), 1]
      ], toks);
      if (s < 0) { return; }
      out.push({
        s: s,
        icon: EH.companyIcon[c.type] || "companies",
        main: mark(c.name, toks),
        sub: EH.flag(c.cc) + mark(c.country, toks) + sep() + mark(c.contact, toks),
        tail: '<span class="pill pill-outline">' + EH.esc(EH.t("co." + c.type)) + "</span>",
        href: "companies.html?q=" + encodeURIComponent(c.name)
      });
    });
    return out;
  }

  function userItems(toks, keys) {
    if (!keys.users) { return []; }
    var out = [];
    EH.users.forEach(function (u) {
      var r = EH.roles.filter(function (x) { return x.key === u.roleKey; })[0] || EH.roles[0];
      var s = score([
        [low(u.name), 3], [low(u.login), 2],
        [low(EH.t(u.roleKey)), 1], [low(EH.t(u.org)), 1]
      ], toks);
      if (s < 0) { return; }
      out.push({
        s: s,
        ava: EH.avatar(EH.initials(u.name), r.color, "ava-sm"),
        main: mark(u.name, toks),
        sub: '<span class="num">' + mark(u.login, toks) + "</span>"
          + sep() + mark(EH.t(u.roleKey), toks) + sep() + mark(EH.t(u.org), toks),
        tail: u.status === "active"
          ? '<span class="pill pill-success">' + EH.esc(EH.t("c.active")) + "</span>"
          : '<span class="pill pill-danger">' + EH.esc(EH.t("c.blocked")) + "</span>",
        href: "users.html"
      });
    });
    return out;
  }

  /* Файл ведёт в свой документ, а не в общий список: карточка документа —
     единственное место, где у файла есть контекст (версии, статус, срок). */
  function fileItems(toks) {
    var seen = {};
    EH.visibleDocs(EH.state.role).forEach(function (d) { seen[d.id] = true; });
    var out = [];
    EH.files.forEach(function (f) {
      if (!seen[f.doc]) { return; }
      var ext = f.name.split(".").pop();
      var s = score([[low(f.name), 3], [low(f.doc), 2]], toks);
      if (s < 0) { return; }
      out.push({
        s: s,
        icon: ext === "pdf" ? "pdf" : ext === "xlsx" ? "grid" : "docs",
        main: mark(f.name, toks),
        sub: '<span class="num">' + mark(f.doc, toks) + "</span>"
          + sep() + '<span class="num">' + EH.esc(f.size) + "</span>"
          + sep() + EH.esc(EH.t("c.version")) + " " + f.ver,
        tail: "",
        href: "document-detail.html?id=" + encodeURIComponent(f.doc)
      });
    });
    return out;
  }

  function pageItems(toks) {
    var out = [];
    (EH.navModel ? EH.navModel() : []).forEach(function (g) {
      g.items.forEach(function (it) {
        var label = EH.t(it.l);
        var s = score([[low(label), 3], [low(EH.t(g.t)), 1]], toks);
        if (s < 0) { return; }
        out.push({
          s: s,
          icon: it.i,
          main: mark(label, toks),
          sub: EH.esc(EH.t(g.t)),
          tail: "",
          href: it.h
        });
      });
    });
    return out;
  }

  var GROUPS = [
    { label: "gs.g.docs",  limit: 6, items: docItems  },
    { label: "gs.g.orgs",  limit: 4, items: orgItems  },
    { label: "gs.g.users", limit: 3, items: userItems },
    { label: "gs.g.files", limit: 3, items: fileItems },
    { label: "gs.g.pages", limit: 4, items: pageItems }
  ];

  function collect(toks) {
    var keys = navKeys(), res = [], total = 0;
    GROUPS.forEach(function (g) {
      if (total >= TOTAL) { return; }
      var items = g.items(toks, keys).sort(function (a, b) { return b.s - a.s; })
        .slice(0, Math.min(g.limit, TOTAL - total));
      if (!items.length) { return; }
      total += items.length;
      res.push({ label: g.label, items: items });
    });
    return res;
  }

  /* ------------------------------------------------------------ разметка - */
  function row(it, i) {
    return '<a class="gs-item" role="option" id="gsOpt' + i + '" data-i="' + i + '"'
      + ' aria-selected="false" href="' + EH.esc(it.href) + '">'
      + (it.ava ? '<span class="gs-ic is-ava">' + it.ava + "</span>"
                : '<span class="gs-ic">' + EH.icon(it.icon, "ic-sm") + "</span>")
      + '<span class="gs-b"><span class="gs-t">' + it.main + "</span>"
      + (it.sub ? '<span class="gs-d">' + it.sub + "</span>" : "") + "</span>"
      + (it.tail ? '<span class="gs-tail">' + it.tail + "</span>" : "")
      + "</a>";
  }

  function sect(labelKey) {
    return '<div class="gs-sec">' + EH.esc(EH.t(labelKey)) + "</div>";
  }

  /* Подвал есть только ради выхода в реестр: без запроса выводить нечего,
     и пустая полоса под списком не нужна. */
  function foot(q) {
    if (!q) { return ""; }
    return '<div class="gs-foot">'
      + '<a class="gs-more" href="documents.html?q=' + encodeURIComponent(q) + '">'
      +   EH.esc(EH.t("gs.all")) + EH.icon("right", "ic-sm") + "</a>"
      + "</div>";
  }

  function panel(q) {
    var toks = tokens(q), i = 0, html;

    /* Пустая строка — не пустая панель: показываем, куда можно прыгнуть.
       Так подсказка про ⌘K оправдывает себя с первого нажатия. */
    if (!toks.length) {
      html = sect("gs.quick") + pageItems([]).slice(0, QUICK).map(function (it) {
        return row(it, i++);
      }).join("");
      return html + foot("");
    }

    var groups = collect(toks);
    if (!groups.length) {
      return '<div class="gs-empty">' + EH.icon("search")
        + '<div class="gs-empty-t">' + EH.esc(EH.t("gs.empty")) + "</div>"
        + '<div class="gs-empty-d">' + EH.esc(EH.t("gs.empty.d")) + "</div></div>" + foot("");
    }
    html = groups.map(function (g) {
      return sect(g.label) + g.items.map(function (it) { return row(it, i++); }).join("");
    }).join("");
    return html + foot(q);
  }

  /* ------------------------------------------------------------ поведение */
  function wire(input) {
    var wrap = input.parentNode;
    var pop = document.createElement("div");
    pop.className = "gs-pop";
    pop.id = "gsPop";
    pop.setAttribute("role", "listbox");
    pop.setAttribute("aria-label", EH.t("tb.search"));
    pop.hidden = true;
    wrap.appendChild(pop);

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-controls", "gsPop");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("autocomplete", "off");

    var items = [], cur = -1;

    function setCur(i) {
      if (items[cur]) {
        items[cur].classList.remove("is-on");
        items[cur].setAttribute("aria-selected", "false");
      }
      cur = i;
      if (items[cur]) {
        items[cur].classList.add("is-on");
        items[cur].setAttribute("aria-selected", "true");
        items[cur].scrollIntoView({ block: "nearest" });
        input.setAttribute("aria-activedescendant", items[cur].id);
      } else {
        input.removeAttribute("aria-activedescendant");
      }
    }

    function open() {
      /* Открытая панель и открытый колокольчик одновременно — это два
         наложенных слоя; топбар всегда показывает что-то одно. */
      if (EH.closeMenus) { EH.closeMenus(); }
      pop.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }

    function close() {
      pop.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      cur = -1;
    }

    function repaint() {
      pop.innerHTML = panel(input.value);
      items = Array.prototype.slice.call(pop.querySelectorAll(".gs-item"));
      cur = -1;
      items.forEach(function (el, i) {
        /* mousemove, а не mouseover: иначе подсветка перескакивала бы на
           элемент под курсором при прокрутке списка стрелками. */
        el.addEventListener("mousemove", function () { if (cur !== i) { setCur(i); } });
      });
      open();
    }

    function go(href) { if (href) { location.href = href; } }

    input.addEventListener("input", repaint);
    input.addEventListener("focus", repaint);
    input.addEventListener("click", function (e) { e.stopPropagation(); if (pop.hidden) { repaint(); } });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (pop.hidden) { repaint(); }
        if (!items.length) { return; }
        var d = e.key === "ArrowDown" ? 1 : -1;
        setCur((cur + d + items.length + (cur < 0 && d < 0 ? 1 : 0)) % items.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (items[cur]) { go(items[cur].getAttribute("href")); return; }
        /* Ничего не выбрано — уводим весь запрос в реестр документов:
           это единственный экран, где его можно продолжить сужать. */
        var more = pop.querySelector(".gs-more");
        if (more) { go(more.getAttribute("href")); }
        return;
      }
      if (e.key === "Escape") {
        /* Первый Esc закрывает панель, второй очищает строку — привычный
           порядок: сначала уходит подсказка, потом сам запрос. Свой Esc у
           type="search" тоже есть: он чистит поле сразу и событием input
           открывал панель заново — поэтому родной обработчик выключаем. */
        e.preventDefault();
        if (!pop.hidden) { e.stopPropagation(); close(); }
        else if (input.value) { e.stopPropagation(); input.value = ""; }
        return;
      }
      if (e.key === "Tab") { close(); }
    });

    pop.addEventListener("click", function (e) { e.stopPropagation(); });
    pop.addEventListener("mousedown", function (e) {
      /* Клик по пункту не должен сначала снимать фокус с поля: иначе
         blur закрывал бы панель раньше, чем сработает переход. */
      if (e.target.closest("a")) { return; }
      e.preventDefault();
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest(".gsearch")) { close(); }
    });

    EH.search.close = close;
    EH.search.open = function () {
      input.focus();
      input.select();
      repaint();
    };
  }

  /* close/open подменяются в wire(): до сборки топбара звать нечего,
     но и падать на EH.search.close() из оболочки не должно. */
  EH.search = { wire: wire, close: function () {}, open: function () {} };

})(window.EH = window.EH || {});
