/* ============================================================================
   select.js — собственный дропдаун вместо системного <select>.

   Системный список рисует операционная система: он не знает ни про токены
   темы, ни про Onest, ни про скругления — в тёмной теме он выглядел чужим
   белым (или серым) прямоугольником. Здесь нативный <select> остаётся в
   разметке источником истины (value, selectedIndex, событие change,
   доступность через <label for>), а поверх него рисуется кнопка и список
   на наших токенах.

   Подключение: автоматически в shell.js для каждого <select class="select">.
   Для разметки, вставленной после загрузки: EH.enhanceSelects(root).
   После программной смены значения ничего вызывать не нужно — сеттеры
   value/selectedIndex перерисовывают кнопку сами.

   Необязательные data-атрибуты <option> (нативный список их игнорирует,
   наш — показывает):
     data-sub  — вторая строка пункта (юрисдикция, пояснение);
     data-flag — код страны, рисуется флаг-чипом;
     data-ic   — ключ иконки EH.icon().
   ========================================================================= */
(function (EH) {
  "use strict";

  var SEARCH_FROM = 8;   /* со скольких пунктов в списке появляется поиск */
  var POP_MAX_H = 324;   /* предел высоты списка, дальше — прокрутка */
  var uid = 0;
  var cur = null;        /* открытый дропдаун: он всегда ровно один */

  /* ------------------------------------------------------------ разметка - */
  function deco(o) {
    var flag = o.getAttribute("data-flag");
    if (flag) { return EH.flag(flag); }
    var ic = o.getAttribute("data-ic");
    return ic ? EH.icon(ic, "sel-ic") : "";
  }

  function optHtml(inst, o) {
    var i = inst.opts.indexOf(o);
    var on = i === inst.sel.selectedIndex;
    var sub = o.getAttribute("data-sub");
    return '<div class="sel-opt' + (on ? " is-on" : "") + (o.disabled ? " is-off" : "") + '"'
      + ' id="' + inst.id + "-o" + i + '" role="option" data-i="' + i + '"'
      + ' aria-selected="' + (on ? "true" : "false") + '"'
      + (o.disabled ? ' aria-disabled="true"' : "") + ">"
      + deco(o)
      + '<span class="sel-t"><span class="n">' + EH.esc(o.text) + "</span>"
      + (sub ? '<span class="s">' + EH.esc(sub) + "</span>" : "")
      + "</span>"
      + EH.icon("check", "sel-tick") + "</div>";
  }

  /* Список собирается из живого <select>, включая <optgroup>. */
  function listHtml(inst, q) {
    q = String(q || "").toLowerCase().trim();
    var shown = [];
    function one(o) {
      if (q && (o.text + " " + (o.getAttribute("data-sub") || "")).toLowerCase().indexOf(q) < 0) { return ""; }
      shown.push(inst.opts.indexOf(o));
      return optHtml(inst, o);
    }
    var html = "";
    var kids = inst.sel.children;
    for (var k = 0; k < kids.length; k++) {
      var el = kids[k];
      if (el.tagName === "OPTGROUP") {
        var body = "";
        for (var j = 0; j < el.children.length; j++) { body += one(el.children[j]); }
        if (body) { html += '<div class="sel-group">' + EH.esc(el.label) + "</div>" + body; }
      } else if (el.tagName === "OPTION") {
        html += one(el);
      }
    }
    inst.shown = shown;
    return html || '<div class="sel-empty">' + EH.esc(EH.t("sel.none")) + "</div>";
  }

  /* ---------------------------------------------------------- размещение - */
  /* Список живёт в <body> с position:fixed — иначе его режут карточки и
     тулбары с overflow:hidden и он оказывается под sticky-шапкой таблицы. */
  function place(inst) {
    var pop = inst.pop;
    var r = inst.btn.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight, gap = 6, edge = 10;

    pop.style.minWidth = r.width + "px";
    pop.style.maxWidth = Math.max(r.width, Math.min(460, vw - edge * 2)) + "px";

    var below = vh - r.bottom - gap - edge;
    var above = r.top - gap - edge;
    var up = below < 190 && above > below;
    pop.style.maxHeight = Math.max(140, Math.min(POP_MAX_H, up ? above : below)) + "px";

    var w = pop.offsetWidth, h = pop.offsetHeight;
    pop.style.left = Math.round(Math.min(Math.max(edge, r.left), Math.max(edge, vw - edge - w))) + "px";
    pop.style.top = Math.round(up ? Math.max(edge, r.top - gap - h) : r.bottom + gap) + "px";
    pop.classList.toggle("is-up", up);
  }

  /* ------------------------------------------------------- активный пункт - */
  function setActive(inst, i, scroll) {
    inst.active = i;
    var list = inst.pop.querySelectorAll(".sel-opt");
    for (var k = 0; k < list.length; k++) {
      var on = Number(list[k].getAttribute("data-i")) === i;
      list[k].classList.toggle("is-active", on);
      if (on && scroll !== false) {
        var el = list[k], box = inst.list;
        if (el.offsetTop < box.scrollTop) { box.scrollTop = el.offsetTop - 4; }
        else if (el.offsetTop + el.offsetHeight > box.scrollTop + box.clientHeight) {
          box.scrollTop = el.offsetTop + el.offsetHeight - box.clientHeight + 4;
        }
      }
    }
    inst.focusEl.setAttribute("aria-activedescendant", i >= 0 ? inst.id + "-o" + i : "");
  }

  function step(inst, dir) {
    var vis = inst.shown.filter(function (i) { return !inst.opts[i].disabled; });
    if (!vis.length) { return; }
    var at = vis.indexOf(inst.active);
    var next = at < 0 ? (dir > 0 ? 0 : vis.length - 1) : at + dir;
    if (next < 0) { next = vis.length - 1; }
    if (next >= vis.length) { next = 0; }
    setActive(inst, vis[next]);
  }

  /* ------------------------------------------------------------- выбор --- */
  function choose(inst, i) {
    var o = inst.opts[i];
    if (!o || o.disabled) { return; }
    if (inst.sel.selectedIndex !== i) {
      inst.sel.selectedIndex = i;
      inst.sel.dispatchEvent(new Event("input", { bubbles: true }));
      inst.sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    close(inst, true);
  }

  /* ------------------------------------------------------ открыть/закрыть - */
  /* Панель не удаляется сразу: сначала проигрывается обратное движение
     (.is-closing в components.css), иначе список пропадал рывком, тогда как
     открывался плавно. Если движение отключено, шаг занимает ~0 мс. */
  function drop(pop) {
    pop.classList.add("is-closing");
    var done = false;
    function kill() { if (!done) { done = true; pop.remove(); } }
    pop.addEventListener("animationend", kill);
    setTimeout(kill, 260);
  }

  function close(inst, focusBack) {
    if (!inst || !inst.open) { return; }
    inst.open = false;
    if (inst.pop) { drop(inst.pop); }
    inst.pop = null;
    inst.list = null;
    inst.wrap.classList.remove("is-open");
    inst.btn.setAttribute("aria-expanded", "false");
    inst.btn.removeAttribute("aria-controls");
    inst.btn.removeAttribute("aria-activedescendant");
    window.removeEventListener("resize", inst.onMove);
    window.removeEventListener("scroll", inst.onMove, true);
    if (cur === inst) { cur = null; }
    if (focusBack) { inst.btn.focus(); }
  }
  EH.closeSelect = function () { close(cur); };

  function open(inst) {
    if (inst.open || inst.sel.disabled) { return; }
    close(cur);
    cur = inst;
    inst.open = true;

    var searchable = inst.opts.length >= SEARCH_FROM;
    var name = inst.btn.getAttribute("aria-label") || EH.t("sel.list");

    var pop = document.createElement("div");
    pop.className = "sel-pop";
    pop.innerHTML =
      (searchable
        ? '<div class="sel-search">' + EH.icon("search")
          + '<input type="text" autocomplete="off" spellcheck="false" placeholder="'
          + EH.esc(EH.t("sel.search")) + '" aria-label="' + EH.esc(EH.t("sel.search")) + '"></div>'
        : "")
      + '<div class="sel-list" id="' + inst.id + '-l" role="listbox" tabindex="-1" aria-label="'
      + EH.esc(name) + '"></div>';
    document.body.appendChild(pop);

    inst.pop = pop;
    inst.list = pop.querySelector(".sel-list");
    inst.search = pop.querySelector(".sel-search input");
    inst.focusEl = inst.search || inst.btn;
    inst.list.innerHTML = listHtml(inst, "");

    inst.wrap.classList.add("is-open");
    inst.btn.setAttribute("aria-expanded", "true");
    inst.btn.setAttribute("aria-controls", inst.id + "-l");

    place(inst);
    setActive(inst, inst.sel.selectedIndex);
    /* выбранный пункт должен быть виден сразу, без прокрутки руками */
    var on = inst.list.querySelector(".sel-opt.is-on");
    if (on) { inst.list.scrollTop = Math.max(0, on.offsetTop - inst.list.clientHeight / 2 + on.offsetHeight); }
    /* preventScroll: фокус в поиске не должен доскроллить страницу — список
       уже поставлен по месту и уехал бы от кнопки. */
    if (inst.search) { inst.search.focus({ preventScroll: true }); }
    /* Повторное измерение на следующем кадре: к этому моменту высота списка
       окончательная (шрифт, полоса прокрутки), и «раскрытие вверх» точное. */
    requestAnimationFrame(function () { if (inst.open) { place(inst); } });

    inst.onMove = function () { if (inst.open) { place(inst); } };
    window.addEventListener("resize", inst.onMove);
    window.addEventListener("scroll", inst.onMove, true);

    /* клик по пункту не должен уводить фокус с кнопки, пока списка нет поиска */
    pop.addEventListener("mousedown", function (e) {
      if (e.target !== inst.search) { e.preventDefault(); }
    });
    pop.addEventListener("click", function (e) {
      var o = e.target.closest(".sel-opt");
      if (o) { choose(inst, Number(o.getAttribute("data-i"))); }
    });
    pop.addEventListener("mousemove", function (e) {
      var o = e.target.closest(".sel-opt");
      if (o && !o.classList.contains("is-off")) {
        setActive(inst, Number(o.getAttribute("data-i")), false);
      }
    });
    if (inst.search) {
      inst.search.addEventListener("input", function () {
        inst.list.innerHTML = listHtml(inst, inst.search.value);
        inst.list.scrollTop = 0;
        setActive(inst, inst.shown.length ? inst.shown[0] : -1);
        place(inst);
      });
      inst.search.addEventListener("keydown", function (e) { key(inst, e); });
    }
  }

  /* ---------------------------------------------------------- клавиатура - */
  function key(inst, e) {
    var k = e.key;
    if (!inst.open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " " || k === "Spacebar") {
        e.preventDefault();
        open(inst);
      } else if (k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        open(inst);
        if (inst.search) { inst.search.value = k; inst.search.dispatchEvent(new Event("input")); }
        else { typeahead(inst, k); }
      }
      return;
    }
    if (k === "ArrowDown") { e.preventDefault(); step(inst, 1); }
    else if (k === "ArrowUp") { e.preventDefault(); step(inst, -1); }
    else if (k === "Home") { e.preventDefault(); if (inst.shown.length) { setActive(inst, inst.shown[0]); } }
    else if (k === "End") { e.preventDefault(); if (inst.shown.length) { setActive(inst, inst.shown[inst.shown.length - 1]); } }
    else if (k === "Enter") { e.preventDefault(); choose(inst, inst.active); }
    else if (k === "Escape") { e.preventDefault(); close(inst, true); }
    else if (k === "Tab") { close(inst); }
    else if (!inst.search && k.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      typeahead(inst, k);
    }
  }

  /* Поиск по первым буквам — привычка, оставшаяся от нативного списка. */
  function typeahead(inst, ch) {
    clearTimeout(inst.taT);
    inst.ta = (inst.ta || "") + ch.toLowerCase();
    inst.taT = setTimeout(function () { inst.ta = ""; }, 800);
    for (var n = 0; n < inst.shown.length; n++) {
      var i = inst.shown[n];
      if (!inst.opts[i].disabled && inst.opts[i].text.toLowerCase().indexOf(inst.ta) === 0) {
        setActive(inst, i);
        return;
      }
    }
  }

  /* ------------------------------------------------------- инициализация - */
  function enhance(sel) {
    if (sel.getAttribute("data-sel") === "on") { return; }
    sel.setAttribute("data-sel", "on");

    var inst = { sel: sel, id: "sel" + (++uid), open: false, active: -1, shown: [] };
    inst.opts = Array.prototype.slice.call(sel.options);

    var wrap = document.createElement("div");
    wrap.className = "sel";
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add("sel-native");
    sel.setAttribute("tabindex", "-1");
    sel.setAttribute("aria-hidden", "true");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "select sel-btn";
    btn.setAttribute("role", "combobox");
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="sel-val" id="' + inst.id + '-v"></span>' + EH.icon("down", "sel-caret");
    wrap.insertBefore(btn, sel);

    /* Имя кнопки: подпись поля (плюс текущее значение) либо aria-label select'а. */
    var lab = sel.id ? document.querySelector('label[for="' + sel.id + '"]') : null;
    if (lab) {
      if (!lab.id) { lab.id = inst.id + "-lb"; }
      btn.setAttribute("aria-labelledby", lab.id + " " + inst.id + "-v");
    } else if (sel.getAttribute("aria-label")) {
      btn.setAttribute("aria-label", sel.getAttribute("aria-label"));
    }

    inst.wrap = wrap;
    inst.btn = btn;
    inst.focusEl = btn;
    inst.val = btn.querySelector(".sel-val");

    function paint() {
      inst.opts = Array.prototype.slice.call(sel.options);
      var o = sel.options[sel.selectedIndex];
      inst.val.innerHTML = (o ? deco(o) : "")
        + '<span class="n">' + EH.esc(o ? o.text : "") + "</span>";
      inst.val.classList.toggle("is-ph", !!o && o.value === "");
      wrap.classList.toggle("is-err", sel.classList.contains("is-err"));
      wrap.classList.toggle("is-disabled", sel.disabled);
      btn.disabled = sel.disabled;
      if (sel.disabled) { close(inst); }
      if (inst.open) { inst.list.innerHTML = listHtml(inst, inst.search ? inst.search.value : ""); }
    }
    paint();
    sel._ehPaint = paint;

    /* Страницы меняют значение напрямую (сброс фильтра, автовыбор языка) —
       перехватываем сеттеры, чтобы кнопка не отставала от select'а. */
    ["value", "selectedIndex"].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      if (!d || !d.set) { return; }
      Object.defineProperty(sel, prop, {
        configurable: true,
        enumerable: false,
        get: function () { return d.get.call(sel); },
        set: function (v) { d.set.call(sel, v); paint(); }
      });
    });
    /* class="is-err" и disabled страницы переключают атрибутами */
    new MutationObserver(paint).observe(sel, { attributes: true, attributeFilter: ["class", "disabled"] });
    sel.addEventListener("change", paint);
    /* select.focus() в коде страницы (валидация) уводим на видимую кнопку */
    sel.addEventListener("focus", function () { btn.focus(); });

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (inst.open) { close(inst, true); } else { open(inst); }
    });
    btn.addEventListener("keydown", function (e) { key(inst, e); });
    btn.addEventListener("blur", function () {
      /* закрываем, только если фокус ушёл наружу (в списке фокус на поиске) */
      setTimeout(function () {
        if (inst.open && !inst.pop.contains(document.activeElement) && document.activeElement !== btn) {
          close(inst);
        }
      }, 0);
    });
  }

  /* --------------------------------------------------------- публичное --- */
  EH.enhanceSelects = function (root) {
    var list = (root || document).querySelectorAll("select.select");
    for (var i = 0; i < list.length; i++) { enhance(list[i]); }
  };
  /* Если у select'а сменили набор <option> из кода — перерисовать кнопку. */
  EH.syncSelect = function (el) { if (el && el._ehPaint) { el._ehPaint(); } };

  document.addEventListener("click", function (e) {
    if (!cur) { return; }
    var t = e.target;
    if (t.closest && (t.closest(".sel-pop") || t.closest(".sel"))) { return; }
    close(cur);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cur) { close(cur, true); }
  }, true);

})(window.EH = window.EH || {});
