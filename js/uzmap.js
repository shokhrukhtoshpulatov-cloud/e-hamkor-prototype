/* ============================================================================
   uzmap.js — сотовая (гексагональная) карта регионов Узбекистана.

   Геометрия — EH.uzMap (генерируется tools/gen_uzmap.py): у каждого региона есть
   контур (для обводки и попадания мышью) и список центров сот. Соты той же формы,
   что у карты мира, — две карты на одной странице выглядят одной системой.

   Модуль ничего не знает о смысле чисел: страница передаёт значения по регионам,
   подпись показателя и функцию форматирования, модуль раскрашивает и сообщает
   о выборе. Разметка строится один раз, дальше меняются только цвета и классы —
   поэтому смена показателя плавно перетекает, а анимация появления не повторяется.

   Классы — квантильные, а не равные интервалы: на один регион приходится почти
   90% суммы, обменянной на крипто, и при линейной шкале остальные слились бы.
   ========================================================================= */
(function (EH) {
  "use strict";

  var CLASSES = 5;
  /* доля акцентного цвета в заливке по классам. Нижний порог не ниже четверти:
     в тёмной теме слабее смесь почти не отличается от фона и читается как «нет данных» */
  var MIX = [26, 42, 60, 80, 100];
  var FILL = .86;           /* доля ячейки под соту — остальное зазор, как у карты мира */

  /* Город Ташкент — одна сота на карте страны: по ней не попасть ни мышью, ни взглядом.
     Выносим его кружком с линией-выноской; кружок пульсирует — это узел маршрутизации. */
  var CALLOUT = { key: "toshkent_sh", dx: -64, dy: -58, r: 13 };

  function esc(s) { return EH.esc ? EH.esc(s) : String(s); }
  function n1(v) { return Math.round(v * 10) / 10; }

  function fillFor(cls) {
    return cls < 0 ? "var(--uz-na)"
      : "color-mix(in srgb, var(--c1) " + MIX[cls] + "%, var(--panel))";
  }

  /* Квантильные классы: одинаковые значения всегда попадают в один класс. */
  function classify(values) {
    var keys = Object.keys(values).filter(function (k) { return values[k] !== null && values[k] !== undefined; });
    keys.sort(function (a, b) { return values[a] - values[b]; });
    var cls = {}, bands = [];
    for (var c = 0; c < CLASSES; c++) { bands.push({ min: null, max: null, n: 0 }); }
    keys.forEach(function (k, i) {
      var first = i;
      while (first > 0 && values[keys[first - 1]] === values[k]) { first--; }
      var c = Math.min(CLASSES - 1, Math.floor(first * CLASSES / keys.length));
      cls[k] = c;
      var b = bands[c];
      b.min = b.min === null ? values[k] : Math.min(b.min, values[k]);
      b.max = b.max === null ? values[k] : Math.max(b.max, values[k]);
      b.n++;
    });
    Object.keys(values).forEach(function (k) { if (!(k in cls)) { cls[k] = -1; } });
    return { cls: cls, bands: bands };
  }

  function legend(bands, format, hasMissing) {
    var out = bands.filter(function (b) { return b.n; }).map(function (b) {
      var c = bands.indexOf(b);
      var txt = b.min === b.max ? format(b.min) : format(b.min) + " – " + format(b.max);
      return '<span class="uz-lg"><i style="background:' + fillFor(c) + '"></i>' + esc(txt) + "</span>";
    }).join("");
    if (hasMissing) {
      out += '<span class="uz-lg"><i class="is-na"></i>' + esc(EH.t("an.noData")) + "</span>";
    }
    return out;
  }

  /* путь одной соты вершиной вверх — хвост одинаков для всех, считаем один раз */
  function hexTail(hex) {
    var hw = hex.sx / 2 * FILL, r = hex.sy / 1.5 * FILL;
    return {
      r: r,
      tail: "l" + n1(hw) + " " + n1(r / 2) + "v" + n1(r) + "l" + n1(-hw) + " " + n1(r / 2)
          + "l" + n1(-hw) + " " + n1(-r / 2) + "v" + n1(-r) + "z"
    };
  }

  EH.uzmap = function (host, opts) {
    var geo = EH.uzMap;
    if (!host || !geo || !geo.hex) { return null; }
    var W = geo.vb[0], H = geo.vb[1];
    var hx = hexTail(geo.hex);
    var keys = Object.keys(geo.regions);
    var state = { opts: opts, classes: null, total: 0 };

    function name(k) { return EH.t("rg." + k); }
    function short(k) { return EH.t("rgs." + k); }

    /* ------------------------------------------------ разметка — один раз */
    /* порядок появления — с запада на восток, волной по стране */
    var order = keys.slice().sort(function (a, b) { return geo.regions[a].lx - geo.regions[b].lx; });

    var hexes = "", hits = "", labels = "";
    order.forEach(function (k, i) {
      var r = geo.regions[k], h = r.h, d = "";
      for (var j = 0; j < h.length; j += 2) { d += "M" + h[j] + " " + n1(h[j + 1] - hx.r) + hx.tail; }
      hexes += '<path class="uz-hex" data-hk="' + k + '" d="' + d + '" style="animation-delay:' + (i * 45) + 'ms"/>';
      hits += '<path class="uz-r" data-k="' + k + '" d="' + r.d + '" tabindex="0" role="button"/>';
      if (k === CALLOUT.key) { return; }
      /* значение подписываем только там, где хватает места внутри контура */
      var roomy = r.depth >= 26;
      labels += '<text class="uz-lbl" data-lk="' + k + '" x="' + r.lx + '" y="' + (roomy ? r.ly - 3 : r.ly + 4) + '">' + esc(short(k)) + "</text>";
      if (roomy) { labels += '<text class="uz-val" data-vk="' + k + '" x="' + r.lx + '" y="' + (r.ly + 13) + '"></text>'; }
    });

    var c = geo.regions[CALLOUT.key];
    var cx = c.lx + CALLOUT.dx, cy = c.ly + CALLOUT.dy;
    var callout = '<g class="uz-callout">'
      + '<line x1="' + c.lx + '" y1="' + c.ly + '" x2="' + cx + '" y2="' + cy + '"/>'
      + '<circle class="uz-ping" cx="' + cx + '" cy="' + cy + '" r="' + CALLOUT.r + '"/>'
      + '<circle class="uz-r uz-dot" data-k="' + CALLOUT.key + '" cx="' + cx + '" cy="' + cy + '" r="' + CALLOUT.r + '" tabindex="-1"/>'
      + '<text class="uz-lbl" x="' + (cx - CALLOUT.r - 6) + '" y="' + (cy - 1) + '">' + esc(short(CALLOUT.key)) + "</text>"
      + '<text class="uz-val" data-vk="' + CALLOUT.key + '" x="' + (cx - CALLOUT.r - 6) + '" y="' + (cy + 13) + '"></text>'
      + "</g>";

    host.classList.add("uzmap-host");
    host.innerHTML = '<svg class="uzmap is-enter" viewBox="0 0 ' + W + " " + H + '" role="group">'
      + '<g class="uz-cells">' + hexes + "</g>"
      + '<g class="uz-hits">' + hits + "</g>"
      + labels + callout + "</svg>"
      + '<div class="ch-tip ch-tip-card uz-tip" hidden></div>';

    var svg = host.querySelector("svg");
    var tip = host.querySelector(".uz-tip");
    /* анимация появления — только при первом показе */
    setTimeout(function () { svg.classList.remove("is-enter"); }, 1400);

    function each(sel, fn) { Array.prototype.forEach.call(svg.querySelectorAll(sel), fn); }

    /* ------------------------------------------------ покраска — на каждое изменение */
    function paint() {
      var o = state.opts, values = o.values;
      var C = classify(values);
      state.classes = C;
      state.total = 0;
      keys.forEach(function (k) { state.total += values[k] || 0; });

      var hl = null;
      if (o.highlight) { hl = {}; o.highlight.forEach(function (k) { hl[k] = 1; }); }
      function dim(k) { return !!(hl && !hl[k]); }
      function val(k) { var v = values[k]; return v === null || v === undefined ? EH.t("an.noData") : o.format(v); }

      each(".uz-hex", function (el) {
        var k = el.getAttribute("data-hk");
        el.style.fill = fillFor(C.cls[k]);
        el.classList.toggle("is-dim", dim(k));
        el.classList.toggle("is-sel", k === o.selected);
      });
      each(".uz-hits .uz-r", function (el) {
        var k = el.getAttribute("data-k");
        el.classList.toggle("is-sel", k === o.selected);
        el.setAttribute("aria-label", name(k) + ": " + val(k));
      });
      each("[data-lk]", function (el) { el.classList.toggle("is-dim", dim(el.getAttribute("data-lk"))); });
      each("[data-vk]", function (el) {
        var k = el.getAttribute("data-vk");
        el.textContent = val(k);
        el.classList.toggle("is-dim", dim(k));
      });

      var cg = svg.querySelector(".uz-callout");
      cg.classList.toggle("is-sel", CALLOUT.key === o.selected);
      cg.classList.toggle("is-dim", dim(CALLOUT.key));
      svg.querySelector(".uz-dot").style.fill = fillFor(C.cls[CALLOUT.key]);

      /* выбранный регион наверх, иначе соседи перекрывают его обводку */
      var sel = svg.querySelector(".uz-hits .uz-r.is-sel");
      if (sel) { sel.parentNode.appendChild(sel); }

      if (o.legendHost) {
        var missing = keys.some(function (k) { return values[k] === null || values[k] === undefined; });
        o.legendHost.innerHTML = legend(C.bands, o.formatLegend || o.format, missing);
      }
    }

    function showTip(k, evt) {
      var o = state.opts, v = o.values[k];
      var share = v !== null && v !== undefined && state.total ? v / state.total : null;
      tip.innerHTML = '<span class="ct-l">' + esc(o.label) + "</span>"
        + '<span class="ct-row uz-tip-n">' + esc(name(k)) + "</span>"
        + '<span class="ct-row"><i style="background:' + fillFor(state.classes.cls[k]) + '"></i>'
        + esc(v === null || v === undefined ? EH.t("an.noData") : o.format(v))
        + (share !== null ? ' <span class="uz-tip-s">' + esc(o.formatShare(share)) + "</span>" : "") + "</span>";
      var box = host.getBoundingClientRect();
      tip.style.left = (evt.clientX - box.left) + "px";
      tip.style.top = (evt.clientY - box.top - 8) + "px";
      tip.hidden = false;
    }

    function hoverKey(k) {
      each(".uz-hex", function (el) { el.classList.toggle("is-hover", el.getAttribute("data-hk") === k); });
    }

    svg.addEventListener("mousemove", function (e) {
      var t = e.target.closest ? e.target.closest("[data-k]") : null;
      if (!t) { tip.hidden = true; hoverKey(null); return; }
      var k = t.getAttribute("data-k");
      hoverKey(k);
      showTip(k, e);
    });
    svg.addEventListener("mouseleave", function () { tip.hidden = true; hoverKey(null); });
    svg.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-k]") : null;
      var k = t ? t.getAttribute("data-k") : null;
      /* повторный клик по выбранному — снимает выбор */
      state.opts.onSelect(k && k === state.opts.selected ? null : k);
    });
    svg.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") { return; }
      var t = e.target.closest ? e.target.closest("[data-k]") : null;
      if (!t) { return; }
      e.preventDefault();
      var k = t.getAttribute("data-k");
      state.opts.onSelect(k === state.opts.selected ? null : k);
    });

    paint();

    return {
      update: function (patch) {
        for (var p in patch) { if (patch.hasOwnProperty(p)) { state.opts[p] = patch[p]; } }
        paint();
      },
      classes: function () { return state.classes; },
      fill: fillFor
    };
  };

})(window.EH = window.EH || {});
