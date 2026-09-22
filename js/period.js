/* ============================================================================
   period.js — отбор по периоду: готовые периоды слева, календарь справа.

   Один элемент управления вместо пары полей «с» и «по»: в девяти случаях
   из десяти нужен готовый период («30 дней», «Прошлый месяц»), и ради него
   не стоит заставлять человека дважды открывать календарь. Произвольный
   диапазон задаётся двумя нажатиями по сетке: первое ставит начало,
   второе — конец.

   Даты — строки "YYYY-MM-DD", как во всех данных прототипа: сравнение
   диапазона становится сравнением строк, а часовые пояса не участвуют
   вовсе. «Сегодня» берётся из EH.TODAY — того же зафиксированного дня,
   от которого считаются сроки (js/data.js).

   Разметка:  EH.periodButton(value, { id: "docPeriod" })
   Поведение: EH.mountPeriod(btn, { value: v, onChange: fn })
   Отбор:     EH.inPeriod(value, doc.updated)

   Одна дата (срок исполнения в формах) — тот же календарь без колонки
   готовых периодов: EH.dateField(iso, { id }) + EH.mountDate(btn, opts).
   Нативный <input type="date"> рисует календарь силами браузера — своя
   вёрстка, свой язык и свои цвета мимо темы, поэтому он здесь не годится.
   ========================================================================= */
(function (EH) {
  "use strict";

  /* Порядок — как в панели: от суток к году. "all" стоит первым: реестр
     по умолчанию ничего не прячет, период на нём — сужение, а не заданность. */
  EH.PERIODS = ["all", "today", "yesterday", "days7", "days30",
                "thisMonth", "lastMonth", "thisYear"];

  var POP_W = 520;       /* ширина панели: 190 колонка периодов + календарь */
  var DAY_W = 352;       /* режим одной даты: только календарь */
  var cur = null;        /* открытая панель: она всегда ровно одна */
  var uid = 0;

  /* ------------------------------------------------------------- даты ---- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  /* Принимает и "2026-09-16", и "2026-09-16 09:42:11" — в журнале аудита
     дата приходит вместе со временем. */
  function parse(v) {
    var p = String(v).split(" ")[0].split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function shift(d, days) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  }
  function today() {
    return new Date(EH.TODAY.getFullYear(), EH.TODAY.getMonth(), EH.TODAY.getDate());
  }
  function sameDay(a, b) { return !!a && !!b && ymd(a) === ymd(b); }

  function range(from, to, preset) {
    var r = { from: ymd(from), to: ymd(to) };
    if (preset) { r.preset = preset; }
    return r;
  }

  /* Границы готового периода. Правая граница нигде не уходит в будущее:
     данных за него ещё нет, а «этот месяц» до конца месяца ввёл бы
     в заблуждение пустым хвостом. */
  EH.presetRange = function (preset) {
    var n = today();
    switch (preset) {
      case "today":     return range(n, n, preset);
      case "yesterday": return range(shift(n, -1), shift(n, -1), preset);
      case "days7":     return range(shift(n, -6), n, preset);
      case "days30":    return range(shift(n, -29), n, preset);
      case "thisMonth": return range(new Date(n.getFullYear(), n.getMonth(), 1), n, preset);
      case "lastMonth": return range(new Date(n.getFullYear(), n.getMonth() - 1, 1),
                                     new Date(n.getFullYear(), n.getMonth(), 0), preset);
      case "thisYear":  return range(new Date(n.getFullYear(), 0, 1), n, preset);
      default:          return { from: null, to: null, preset: "all" };
    }
  };

  /* Пустой период — «весь», он же состояние после сброса фильтров. */
  EH.inPeriod = function (r, value) {
    if (!r || !r.from || !value) { return true; }
    var v = String(value).split(" ")[0];
    return v >= r.from && v <= r.to;
  };

  /* --------------------------------------------------------- подписи ----- */
  /* Месяц в кнопке — сокращённый: полная дата («16 сентября 2026») в тулбар
     не помещается и вытесняет соседние фильтры на вторую строку. */
  function dayMon(iso) {
    var d = parse(iso);
    return d.getDate() + " " + EH.t("mo." + (d.getMonth() + 1)).slice(0, 3).toLowerCase();
  }

  EH.periodTitle = function (r) {
    if (!r || !r.from) { return EH.t("period.all"); }
    if (r.preset) { return EH.t("period." + r.preset); }
    var a = dayMon(r.from), b = dayMon(r.to);
    return a === b ? a : a + " — " + b;
  };

  /* Период целиком — подпись под календарём и пояснение к выборке.
     Формат тот же dd.mm.yyyy, что в таблицах: две записи одной даты
     в разном виде читаются как две разные даты. */
  EH.periodSubtitle = function (r) {
    if (!r || !r.from) { return EH.t("period.all"); }
    if (r.from === r.to) { return EH.fmtDate(r.from); }
    return EH.fmtDate(r.from) + " — " + EH.fmtDate(r.to);
  };

  /* ------------------------------------------------------------ кнопка --- */
  EH.periodButton = function (value, o) {
    o = o || {};
    return '<button type="button" class="btn per-btn' + (o.cls ? " " + o.cls : "") + '"'
      + (o.id ? ' id="' + o.id + '"' : "")
      + ' aria-haspopup="dialog" aria-expanded="false"'
      + ' title="' + EH.esc(EH.t("period.select")) + '">'
      + EH.icon("calendar", "ic-sm")
      + '<span class="per-lbl">' + EH.esc(EH.periodTitle(value)) + "</span>"
      + EH.icon("down", "per-caret") + "</button>";
  };

  /* ---------------------------------------------------------- размещение - */
  /* Панель живёт в <body> с position:fixed — иначе её режут карточки
     и тулбары с overflow:hidden, как и список select.js. */
  function place(inst) {
    var pop = inst.pop;
    var r = inst.btn.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight, gap = 6, edge = 10;

    pop.style.maxWidth = Math.min(inst.mode === "day" ? DAY_W : POP_W, vw - edge * 2) + "px";
    /* На невысоком экране (и на телефоне, где колонки складываются в столбец)
       панель выше вьюпорта — тогда она прокручивается внутри себя. */
    pop.style.maxHeight = (vh - edge * 2) + "px";

    var h = pop.offsetHeight, w = pop.offsetWidth;
    var up = vh - r.bottom - gap - edge < h && r.top - gap - edge > vh - r.bottom;

    /* По правому краю кнопки: фильтр стоит в правой половине тулбара,
       и панель шириной в пол-экрана иначе уезжает за вьюпорт. */
    var left = r.right - w;
    var top = up ? r.top - gap - h : r.bottom + gap;
    pop.style.left = Math.round(Math.min(Math.max(edge, left), Math.max(edge, vw - edge - w))) + "px";
    /* Ни сверху, ни снизу может не хватить места — тогда панель прижимается
       к краю вьюпорта, а не свешивается за него. */
    pop.style.top = Math.round(Math.min(Math.max(edge, top), Math.max(edge, vh - edge - h))) + "px";
    pop.classList.toggle("is-up", up);
  }

  /* -------------------------------------------------------- отрисовка ---- */
  function presetsHtml(inst) {
    return '<div class="per-presets">' + inst.presets.map(function (p) {
      return '<button type="button" class="per-preset'
        + (inst.value.preset === p ? " is-on" : "") + '" data-p="' + p + '">'
        + EH.esc(EH.t("period." + p)) + "</button>";
    }).join("") + "</div>";
  }

  /* Выделенный диапазон: пока конец не выбран, его показывает курсор мыши */
  function bounds(inst) {
    if (inst.mode === "day") {
      return inst.value ? [parse(inst.value), parse(inst.value)] : [null, null];
    }
    if (inst.draft) {
      var h = inst.hover || inst.draft;
      return h < inst.draft ? [h, inst.draft] : [inst.draft, h];
    }
    if (!inst.value.from) { return [null, null]; }
    return [parse(inst.value.from), parse(inst.value.to)];
  }

  function daysHtml(inst) {
    var c = inst.cursor;
    var first = new Date(c.getFullYear(), c.getMonth(), 1);
    var total = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
    /* Неделя начинается с понедельника — порядок календаря РУз.
       У JS воскресенье имеет номер 0, поэтому сдвиг. */
    var lead = (first.getDay() + 6) % 7;
    var cells = Math.ceil((lead + total) / 7) * 7;
    var b = bounds(inst), lo = b[0], hi = b[1];
    var now = today();
    var html = "";

    for (var i = 0; i < cells; i++) {
      if (i < lead || i >= lead + total) { html += '<div class="per-cell"></div>'; continue; }
      var d = new Date(c.getFullYear(), c.getMonth(), i - lead + 1);
      var off = d > inst.max || (inst.min && d < inst.min);
      var isLo = sameDay(d, lo), isHi = sameDay(d, hi);
      var band = "";
      if (lo && hi && !sameDay(lo, hi)) {
        band = isLo ? " is-start" : isHi ? " is-end" : (d > lo && d < hi) ? " is-in" : "";
      }
      html += '<div class="per-cell' + band + '">'
        + '<button type="button" class="per-day'
        + (isLo || isHi ? " is-on" : "")
        + (sameDay(d, now) && !isLo && !isHi ? " is-today" : "") + '"'
        + (off ? " disabled" : "") + ' data-d="' + ymd(d) + '">'
        + d.getDate() + "</button></div>";
    }

    var week = "";
    for (var w = 1; w <= 7; w++) { week += '<div class="per-wd">' + EH.esc(EH.t("cl.dow" + w)) + "</div>"; }
    return '<div class="per-grid per-week">' + week + "</div>"
      + '<div class="per-grid per-days">' + html + "</div>";
  }

  function monthsHtml(inst) {
    var y = inst.cursor.getFullYear(), html = "";
    for (var m = 0; m < 12; m++) {
      html += '<button type="button" class="per-unit'
        + (inst.cursor.getMonth() === m ? " is-on" : "") + '"'
        + (new Date(y, m, 1) > inst.max ? " disabled" : "") + ' data-mon="' + m + '">'
        + EH.esc(EH.t("mo." + (m + 1)).slice(0, 3)) + "</button>";
    }
    return '<div class="per-grid per-wide">' + html + "</div>";
  }

  function yearsHtml(inst) {
    var base = inst.cursor.getFullYear() - 11, html = "";
    for (var i = 0; i < 12; i++) {
      var y = base + i;
      html += '<button type="button" class="per-unit'
        + (inst.cursor.getFullYear() === y ? " is-on" : "") + '"'
        + (y > inst.max.getFullYear() ? " disabled" : "") + ' data-yr="' + y + '">'
        + y + "</button>";
    }
    return '<div class="per-grid per-wide">' + html + "</div>";
  }

  function paint(inst) {
    var c = inst.cursor;
    /* «Вперёд» упирается в максимум: показывать пустые будущие месяцы незачем */
    var nextOff = inst.view === "days"
      ? (c.getFullYear() > inst.max.getFullYear()
         || (c.getFullYear() === inst.max.getFullYear() && c.getMonth() >= inst.max.getMonth()))
      : c.getFullYear() >= inst.max.getFullYear();
    /* «Назад» — так же об нижнюю границу: у срока исполнения прошлое закрыто */
    var prevOff = !inst.min ? false : inst.view === "days"
      ? (c.getFullYear() < inst.min.getFullYear()
         || (c.getFullYear() === inst.min.getFullYear() && c.getMonth() <= inst.min.getMonth()))
      : c.getFullYear() <= inst.min.getFullYear();

    var b = bounds(inst);
    var foot = inst.mode === "day"
      ? (inst.value ? EH.fmtDate(inst.value) : EH.t("date.pick"))
      : inst.draft && b[0]
        ? EH.periodSubtitle({ from: ymd(b[0]), to: ymd(b[1]) })
        : EH.periodSubtitle(inst.value);

    inst.pop.innerHTML = (inst.mode === "day" ? "" : presetsHtml(inst))
      + '<div class="per-cal">'
      +   '<div class="per-head">'
      +     '<button type="button" class="per-nav" data-step="-1"' + (prevOff ? " disabled" : "")
      +       ' aria-label="' + EH.esc(EH.t("period.prev")) + '">' + EH.icon("left", "ic-sm") + "</button>"
      +     '<div class="per-switches">'
      +       '<button type="button" class="per-switch' + (inst.view === "months" ? " is-open" : "")
      +         '" data-view="months">' + EH.esc(EH.t("mo." + (c.getMonth() + 1))) + "</button>"
      +       '<button type="button" class="per-switch' + (inst.view === "years" ? " is-open" : "")
      +         '" data-view="years">' + c.getFullYear() + "</button>"
      +     "</div>"
      +     '<button type="button" class="per-nav" data-step="1"' + (nextOff ? " disabled" : "")
      +       ' aria-label="' + EH.esc(EH.t("period.next")) + '">' + EH.icon("right", "ic-sm") + "</button>"
      +   "</div>"
      +   (inst.view === "days" ? daysHtml(inst)
         : inst.view === "months" ? monthsHtml(inst) : yearsHtml(inst))
      +   '<div class="per-foot">' + EH.esc(foot) + "</div>"
      + "</div>";
  }

  function label(inst) {
    if (inst.mode === "day") {
      var v = inst.btn.querySelector(".date-val");
      if (v) {
        v.textContent = inst.value ? EH.fmtDate(inst.value) : EH.t("date.pick");
        v.classList.toggle("is-ph", !inst.value);
      }
      return;
    }
    var l = inst.btn.querySelector(".per-lbl");
    if (l) { l.textContent = EH.periodTitle(inst.value); }
  }

  /* ------------------------------------------------------ выбор периода -- */
  function commit(inst, value) {
    inst.value = value;
    inst.draft = null;
    inst.hover = null;
    label(inst);
    close(inst, true);
    if (inst.onChange) { inst.onChange(value); }
  }

  function pickDay(inst, iso) {
    var d = parse(iso);
    /* Одна дата — первый же клик и есть выбор: копить «начало» не во что */
    if (inst.mode === "day") { commit(inst, iso); return; }
    if (!inst.draft) {
      inst.draft = d;
      inst.hover = d;
      paint(inst);
      return;
    }
    commit(inst, inst.draft > d ? range(d, inst.draft) : range(inst.draft, d));
  }

  /* ------------------------------------------------- открыть / закрыть --- */
  /* Закрытие проигрывается обратным движением (.is-closing в components.css)
     и только потом панель удаляется — так же, как у .sel-pop. */
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
    inst.draft = null;
    inst.hover = null;
    inst.btn.setAttribute("aria-expanded", "false");
    inst.btn.classList.remove("is-open");
    window.removeEventListener("resize", inst.onMove);
    window.removeEventListener("scroll", inst.onMove, true);
    if (cur === inst) { cur = null; }
    if (focusBack) { inst.btn.focus(); }
  }
  EH.closePeriod = function () { close(cur); };

  function open(inst) {
    if (inst.open) { return; }
    close(cur);
    EH.closeSelect && EH.closeSelect();
    cur = inst;
    inst.open = true;
    /* Панель всегда открывается на месяце конца периода и всегда с сетки дней */
    inst.view = "days";
    inst.cursor = inst.mode === "day"
      ? (inst.value ? parse(inst.value) : (inst.min && inst.min > today() ? inst.min : today()))
      : (inst.value.to ? parse(inst.value.to) : today());

    var pop = document.createElement("div");
    pop.className = "per-pop";
    pop.id = inst.id + "-p";
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", EH.t("period.select"));
    document.body.appendChild(pop);
    inst.pop = pop;

    paint(inst);
    place(inst);
    inst.btn.setAttribute("aria-expanded", "true");
    inst.btn.classList.add("is-open");

    inst.onMove = function () { if (inst.open) { place(inst); } };
    window.addEventListener("resize", inst.onMove);
    window.addEventListener("scroll", inst.onMove, true);

    pop.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-p],[data-d],[data-step],[data-view],[data-mon],[data-yr]") : null;
      if (!el || el.disabled) { return; }
      if (el.hasAttribute("data-p")) {
        commit(inst, EH.presetRange(el.getAttribute("data-p")));
      } else if (el.hasAttribute("data-d")) {
        pickDay(inst, el.getAttribute("data-d"));
      } else if (el.hasAttribute("data-step")) {
        var s = Number(el.getAttribute("data-step"));
        var c = inst.cursor;
        inst.cursor = inst.view === "days" ? new Date(c.getFullYear(), c.getMonth() + s, 1)
          : inst.view === "months" ? new Date(c.getFullYear() + s, c.getMonth(), 1)
          : new Date(c.getFullYear() + s * 12, c.getMonth(), 1);
        paint(inst);
        place(inst);
      } else if (el.hasAttribute("data-view")) {
        var v = el.getAttribute("data-view");
        inst.view = inst.view === v ? "days" : v;
        paint(inst);
        place(inst);
      } else if (el.hasAttribute("data-mon")) {
        inst.cursor = new Date(inst.cursor.getFullYear(), Number(el.getAttribute("data-mon")), 1);
        inst.view = "days";
        paint(inst);
        place(inst);
      } else if (el.hasAttribute("data-yr")) {
        inst.cursor = new Date(Number(el.getAttribute("data-yr")), inst.cursor.getMonth(), 1);
        inst.view = "days";
        paint(inst);
        place(inst);
      }
    });

    /* Подсветка будущего диапазона идёт за курсором — иначе между первым
       и вторым нажатием не видно, что именно выбирается. */
    pop.addEventListener("mouseover", function (e) {
      if (!inst.draft) { return; }
      var d = e.target.closest ? e.target.closest("[data-d]") : null;
      if (!d || d.disabled) { return; }
      var v = parse(d.getAttribute("data-d"));
      if (sameDay(v, inst.hover)) { return; }
      inst.hover = v;
      paint(inst);
    });
  }

  /* ------------------------------------------------------ инициализация -- */
  function wire(inst) {
    inst.btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inst.open) { close(inst, true); } else { open(inst); }
    });
    inst.btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!inst.open) { open(inst); }
      }
    });
  }

  /* Возвращает { value, set(v) } — страница может сбросить период
     вместе с остальными фильтрами, не трогая разметку кнопки. */
  EH.mountPeriod = function (btn, o) {
    if (!btn) { return null; }
    o = o || {};
    var inst = {
      id: "per" + (++uid),
      btn: btn,
      open: false,
      view: "days",
      draft: null,
      hover: null,
      value: o.value || EH.presetRange("all"),
      max: o.max || today(),
      presets: o.presets || EH.PERIODS,
      onChange: o.onChange
    };
    inst.cursor = inst.value.to ? parse(inst.value.to) : today();
    label(inst);
    wire(inst);

    return {
      get value() { return inst.value; },
      set: function (v) {
        inst.value = v || EH.presetRange("all");
        label(inst);
        if (inst.open) { paint(inst); }
      }
    };
  };

  /* ---------------------------------------------------------- одна дата -- */
  /* Поле выглядит как .select: в форме оно стоит в одном ряду с выпадающими
     списками, и «кнопка-календарь» из тулбара там смотрелась бы чужой. */
  EH.dateField = function (value, o) {
    o = o || {};
    return '<button type="button" class="select date-btn' + (o.cls ? " " + o.cls : "") + '"'
      + (o.id ? ' id="' + o.id + '"' : "")
      + ' aria-haspopup="dialog" aria-expanded="false"'
      + ' title="' + EH.esc(EH.t("date.pick")) + '">'
      + '<span class="date-val' + (value ? "" : " is-ph") + '">'
      + EH.esc(value ? EH.fmtDate(value) : EH.t("date.pick")) + "</span>"
      + EH.icon("calendar", "date-ic") + "</button>";
  };

  /* opts: { value, min, max, onChange } — даты строками "YYYY-MM-DD".
     Возвращает { value, set(v) }: значение живёт в замыкании, а не в DOM,
     поэтому форма читает и подставляет срок одним и тем же способом. */
  EH.mountDate = function (btn, o) {
    if (!btn) { return null; }
    o = o || {};
    var inst = {
      id: "dat" + (++uid),
      mode: "day",
      btn: btn,
      open: false,
      view: "days",
      draft: null,
      hover: null,
      value: o.value || "",
      min: o.min ? parse(o.min) : null,
      /* у периода потолок — сегодня (данных вперёд нет), у даты в форме
         наоборот: срок исполнения всегда в будущем */
      max: o.max ? parse(o.max) : new Date(today().getFullYear() + 5, 11, 31),
      presets: [],
      onChange: o.onChange
    };
    inst.cursor = inst.value ? parse(inst.value) : today();
    label(inst);
    wire(inst);

    return {
      get value() { return inst.value; },
      set: function (v) {
        inst.value = v || "";
        inst.cursor = inst.value ? parse(inst.value) : today();
        label(inst);
        if (inst.open) { paint(inst); }
      }
    };
  };

  /* Закрытие по клику мимо — на фазе перехвата, а не всплытия: собственный
     обработчик панели перерисовывает её целиком, и к моменту всплытия
     нажатая кнопка уже вынута из документа. closest() на оторванном узле
     панели не находит, и выбор первой даты закрывал бы панель. */
  document.addEventListener("click", function (e) {
    if (!cur) { return; }
    var t = e.target;
    if (t.closest && (t.closest(".per-pop") || t.closest(".per-btn") || t.closest(".date-btn"))) { return; }
    close(cur);
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cur) { e.preventDefault(); close(cur, true); }
  }, true);

})(window.EH = window.EH || {});
