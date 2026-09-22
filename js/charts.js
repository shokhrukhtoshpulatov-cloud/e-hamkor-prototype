/* ============================================================================
   charts.js — собственный SVG-движок графиков.
   Все функции возвращают строку HTML. Цвет приходит строкой вида 'var(--c1)',
   поэтому график автоматически следует активной теме.
   ========================================================================= */
(function (EH) {
  "use strict";

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function n2(v) { return Math.round(v * 100) / 100; }

  /* «Красивый» потолок шкалы: 71 → 100, 4 800 → 5 000, 0.7 → 1.
     Без этого ось округлялась до фиксированного шага и столбцы становились плоскими. */
  function niceMax(v) {
    if (!(v > 0)) { return 1; }
    var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10));
    var n = v / e;
    var m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * e;
  }

  var uid = 0;
  function nextId(p) { uid += 1; return p + uid; }

  /* Монотонная кубическая интерполяция (Fritsch–Carlson).
     Обычный сплайн на таких данных даёт «перелёты» — линия уходит ниже нуля
     между точками. Монотонный вариант этого не делает. */
  function smoothPath(p) {
    var n = p.length;
    if (n < 2) { return ""; }
    if (n === 2) { return "M" + p[0][0] + " " + p[0][1] + "L" + p[1][0] + " " + p[1][1]; }

    var dx = [], dy = [], m = [], i;
    for (i = 0; i < n - 1; i++) {
      dx[i] = p[i + 1][0] - p[i][0];
      dy[i] = p[i + 1][1] - p[i][1];
      m[i] = dy[i] / dx[i];
    }
    var t = [m[0]];
    for (i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) { t[i] = 0; }
      else {
        var w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
        t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
      }
    }
    t[n - 1] = m[n - 2];

    var d = "M" + n2(p[0][0]) + " " + n2(p[0][1]);
    for (i = 0; i < n - 1; i++) {
      var h = (p[i + 1][0] - p[i][0]) / 3;
      d += " C" + n2(p[i][0] + h) + " " + n2(p[i][1] + h * t[i])
         + " " + n2(p[i + 1][0] - h) + " " + n2(p[i + 1][1] - h * t[i + 1])
         + " " + n2(p[i + 1][0]) + " " + n2(p[i + 1][1]);
    }
    return d;
  }

  /* штриховка для столбцов — как в референсе */
  function defs() {
    return '<defs>'
      + '<pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
      + '<line x1="0" y1="0" x2="0" y2="5" stroke="var(--hatch)" stroke-width="1.6"/></pattern>'
      + '<pattern id="hatch-on" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
      + '<line x1="0" y1="0" x2="0" y2="5" stroke="var(--hatch-on)" stroke-width="1.6"/></pattern>'
      + '</defs>';
  }

  /* ------------------------------------------------------------- донат --- */
  /* Собран из отдельных точек по окружности — сегменты читаются как доли,
     но при этом блок остаётся лёгким и не спорит с остальной страницей. */
  EH.donut = function (segs, centerLabel, centerValue, opts) {
    opts = opts || {};
    var size = opts.size || 230;
    var dots = opts.dots || 46;
    /* пустой набор — рисуем нейтральное кольцо, а не падаем на segs[0] */
    if (!segs || !segs.length) {
      segs = [{ v: 1, color: "var(--surface-3)", label: "" }];
    }
    var r = size / 2 - (opts.pad || 26);
    var cx = size / 2, cy = size / 2;
    var total = 0;
    segs.forEach(function (s) { total += s.v; });
    if (total <= 0) { total = 1; }

    var out = '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img">';
    var acc = 0, si = 0, bounds = [];
    segs.forEach(function (s) { acc += s.v; bounds.push(acc / total); });

    for (var i = 0; i < dots; i++) {
      var f = i / dots;
      while (si < bounds.length - 1 && f >= bounds[si]) { si++; }
      var ang = f * Math.PI * 2 - Math.PI / 2;
      var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      var rad = 4.2 - (i % 3 === 0 ? .5 : 0);
      out += '<circle class="dseg" cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + rad + '"'
           + ' fill="' + segs[si].color + '" style="animation-delay:' + (i * 11) + 'ms"/>';
    }
    if (centerValue !== undefined && centerValue !== null) {
      out += '<text class="dlabel" x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle"'
           + ' font-size="' + (opts.vsize || 26) + '">' + esc(centerValue) + '</text>';
    }
    if (centerLabel) {
      out += '<text class="dsub" x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle">' + esc(centerLabel) + '</text>';
    }
    return out + "</svg>";
  };

  /* -------------------------------------------------- линии / области ---- */
  /* series: [{pts:[…], color:'var(--c1)', fill:true}] либо просто [числа] */
  EH.area = function (series, labels, opts) {
    opts = opts || {};
    var W = opts.w || 720, H = opts.h || 220;
    var pl = 34, pr = 10, pt = 16, pb = 28;
    if (series.length && typeof series[0] === "number") {
      series = [{ pts: series, color: "var(--c1)", fill: true }];
    }
    var max = 0;
    series.forEach(function (s) { s.pts.forEach(function (v) { if (v > max) { max = v; } }); });
    max = niceMax((max || 1) * 1.12);
    var iw = W - pl - pr, ih = H - pt - pb;
    var n = series[0].pts.length;
    var X = function (i) { return pl + (n === 1 ? iw / 2 : (i / (n - 1)) * iw); };
    var Y = function (v) { return pt + ih - (v / max) * ih; };
    var base = pt + ih;

    var out = '<svg class="chart chart-area" viewBox="0 0 ' + W + ' ' + H + '" role="img">';

    /* Заливка — вертикальный градиент до прозрачного, а не плоская плашка. */
    var ids = series.map(function () { return nextId("ehg"); });
    out += "<defs>";
    series.forEach(function (s, si) {
      out += '<linearGradient id="' + ids[si] + '" x1="0" y1="0" x2="0" y2="1">'
           + '<stop offset="0%" stop-color="' + s.color + '" stop-opacity="' + (opts.fillTop || .38) + '"/>'
           + '<stop offset="55%" stop-color="' + s.color + '" stop-opacity="' + (opts.fillMid || .12) + '"/>'
           + '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0"/>'
           + "</linearGradient>";
    });
    out += "</defs>";

    /* сетка */
    for (var g = 0; g <= 4; g++) {
      var gy = pt + (ih / 4) * g;
      var gv = Math.round(max - (max / 4) * g);
      out += '<line class="grid-l" x1="' + pl + '" y1="' + n2(gy) + '" x2="' + (W - pr) + '" y2="' + n2(gy) + '"/>';
      out += '<text class="ax ax-y" x="' + (pl - 8) + '" y="' + n2(gy + 3.5) + '" text-anchor="end">' + gv + "</text>";
    }

    series.forEach(function (s, si) {
      var pts = s.pts.map(function (v, i) { return [X(i), Y(v)]; });
      var d = smoothPath(pts);
      if (s.fill) {
        out += '<path class="area" d="' + d + " L" + n2(X(n - 1)) + " " + n2(base)
             + " L" + n2(X(0)) + " " + n2(base) + ' Z" fill="url(#' + ids[si] + ')"/>';
      }
      /* pathLength="1" нормирует длину: анимация отрисовки одинаково работает
         для кривой любой формы, подбирать --len вручную не нужно. */
      out += '<path class="line" d="' + d + '" stroke="' + s.color + '" pathLength="1"'
           + ' style="--len:1;stroke-dasharray:1;animation-delay:' + (si * 160) + 'ms"/>';
      if (opts.dots !== false) {
        out += '<circle class="pt pt-ring" cx="' + n2(X(n - 1)) + '" cy="' + n2(Y(s.pts[n - 1]))
             + '" r="4.5" stroke="' + s.color + '"/>';
      }
    });

    /* Зоны наведения: вертикальная направляющая, точки на всех сериях и карточка. */
    if (opts.hover !== false && n > 1) {
      var slot = iw / (n - 1);
      for (var i = 0; i < n; i++) {
        var vals = series.map(function (s) {
          return { c: s.color, v: EH.fmtNum ? EH.fmtNum(s.pts[i]) : String(s.pts[i]) };
        });
        out += '<g class="hitg" data-tip="' + esc(labels && labels[i] ? labels[i] : i + 1) + '"'
             + ' data-vals="' + esc(JSON.stringify(vals)) + '"'
             + ' data-x="' + n2(X(i)) + '" data-y="' + n2(Math.min.apply(null, series.map(function (s) { return Y(s.pts[i]); }))) + '">'
             + '<rect class="bar-hit" x="' + n2(X(i) - slot / 2) + '" y="' + pt + '" width="' + n2(slot) + '" height="' + n2(ih) + '"/>'
             + '<line class="guide" x1="' + n2(X(i)) + '" y1="' + pt + '" x2="' + n2(X(i)) + '" y2="' + n2(base) + '"/>';
        series.forEach(function (s) {
          out += '<circle class="pt-hover" cx="' + n2(X(i)) + '" cy="' + n2(Y(s.pts[i])) + '" r="5" fill="' + s.color + '"/>';
        });
        out += "</g>";
      }
    }

    /* подписи оси X — прореживаем, чтобы не слипались */
    if (labels) {
      var step = Math.ceil(n / (opts.maxLabels || 12));
      labels.forEach(function (l, i) {
        if (i % step) { return; }
        out += '<text class="ax" x="' + n2(X(i)) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + "</text>";
      });
    }
    return out + "</svg>";
  };

  /* ----------------------------------------------------------- столбцы --- */
  /* values — либо ряд чисел (один ряд: неактивные столбцы штриховкой,
     выбранный заливкой акцентом, как в референсе), либо массив рядов
     [{ pts, color, tone }] — тогда ряды стоят парой в слоте месяца.
     tone берёт заливку из той же пары, что и одиночный ряд: "accent" —
     акцент, "idle" — светлая штриховка. Без tone ряд красится сплошным
     color. Выделения отдельного столбца у пары нет: акцент там уже занят
     под ряд и пометил бы месяц тем же приёмом, что и ряд. */
  EH.bars = function (values, labels, opts) {
    opts = opts || {};
    var W = opts.w || 760, H = opts.h || 250;
    var pl = 38, pr = 8, pt = 16, pb = 26;
    var iw = W - pl - pr, ih = H - pt - pb;
    var multi = !(values.length && typeof values[0] === "number");
    var series = multi ? values : [{ pts: values }];
    var n = series[0].pts.length;
    var max = 1;
    series.forEach(function (s) {
      s.pts.forEach(function (v) { if (v > max) { max = v; } });
    });
    max = niceMax(max * 1.12);
    var slot = iw / n;
    var k = series.length;
    /* Зазор внутри пары меньше зазора между месяцами — иначе пара
       распадается и читается как два независимых столбца. */
    var gap = multi ? 3 : 0;
    var bw = multi
      ? Math.max(3, Math.min(opts.barW || 34, (slot * .8 - gap * (k - 1)) / k))
      : Math.min(opts.barW || 34, slot * .62);
    var active = opts.active === undefined ? -1 : opts.active;
    var fmt = function (v) { return EH.fmtNum ? EH.fmtNum(v) : String(v); };

    var out = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img">' + defs();
    for (var g = 0; g <= 5; g++) {
      var gy = pt + (ih / 5) * g;
      var gv = Math.round(max - (max / 5) * g);
      out += '<line class="grid-l" x1="' + pl + '" y1="' + n2(gy) + '" x2="' + (W - pr) + '" y2="' + n2(gy) + '"/>';
      out += '<text class="ax ax-y" x="' + (pl - 8) + '" y="' + n2(gy + 3.5) + '" text-anchor="end">' + EH.kilo(gv) + '</text>';
    }

    var gw = k * bw + gap * (k - 1);
    var rx = Math.min(5, bw / 2);
    for (var i = 0; i < n; i++) {
      var x0 = pl + slot * i + (slot - gw) / 2;
      var d = 'animation-delay:' + (i * 42) + 'ms';
      var tops = series.map(function (s) { return pt + ih - Math.max(2, (s.pts[i] / max) * ih); });
      var head = '<g data-tip="' + esc(labels[i]) + '" data-x="' + n2(x0 + gw / 2)
        + '" data-y="' + n2(Math.min.apply(null, tops)) + '"';
      if (multi) {
        /* Карточка подсказки на весь слот: у пары спрашивают «сколько открыто
           и сколько закрыто в этом месяце», а не про отдельный столбец. */
        head += ' data-vals="' + esc(JSON.stringify(series.map(function (s) {
          return { c: s.color, v: fmt(s.pts[i]) };
        }))) + '"';
      } else {
        head += ' data-val="' + esc(fmt(series[0].pts[i])) + '"';
      }
      out += head + ">";

      series.forEach(function (s, si) {
        var v = s.pts[i];
        var h = Math.max(2, (v / max) * ih);
        var x = x0 + si * (bw + gap);
        var y = pt + ih - h;
        var box = ' x="' + n2(x) + '" y="' + n2(y) + '" width="' + n2(bw)
          + '" height="' + n2(h) + '" rx="' + rx + '"';
        if (multi && !s.tone) {
          /* Цвет ряда — инлайном: правило .chart .bar задаёт заливку классом
             и перебило бы атрибут fill. */
          out += '<rect class="bar"' + box + ' style="fill:' + esc(s.color) + ';' + d + '"/>';
        } else {
          var on = multi ? s.tone === "accent" : i === active;
          out += '<rect class="bar' + (on ? " bar-on" : "") + '"' + box + ' style="' + d + '"/>';
          out += '<rect class="bar ' + (on ? "bar-on-h" : "bar-h") + '"' + box + ' style="' + d + '"/>';
        }
      });

      out += '<rect class="bar-hit" x="' + n2(pl + slot * i) + '" y="' + pt + '" width="' + n2(slot) + '" height="' + n2(ih) + '"/>';
      out += "</g>";
      out += '<text class="ax" x="' + n2(x0 + gw / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(labels[i]) + "</text>";
    }
    out += '<line class="base-l" x1="' + pl + '" y1="' + n2(pt + ih) + '" x2="' + (W - pr) + '" y2="' + n2(pt + ih) + '"/>';
    return out + "</svg>";
  };

  EH.kilo = function (v) {
    if (v >= 1000) { return (v % 1000 === 0 ? v / 1000 : (v / 1000).toFixed(1)) + "K"; }
    return String(v);
  };

  /* -------------------------------------------------------- спарклайн ---- */
  EH.sparkline = function (pts, color) {
    var W = 96, H = 30, p = 3;
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var rng = (max - min) || 1;
    /* та же сглаженная кривая, что и у большого графика — стиль один */
    var d = smoothPath(pts.map(function (v, i) {
      return [p + (i / (pts.length - 1)) * (W - p * 2),
              p + (1 - (v - min) / rng) * (H - p * 2)];
    }));
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">'
      + '<path class="line" d="' + d + '" stroke="' + (color || "var(--c1)") + '" fill="none" pathLength="1"'
      + ' style="--len:1;stroke-dasharray:1"/></svg>';
  };

  /* ------------------------------------------------------ тепловая карта - */
  EH.heatmap = function (rows, cols, matrix) {
    var out = '<div class="heat" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))">';
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < cols.length; c++) {
        var v = Math.max(0, Math.min(1, (matrix[r] || [])[c] || 0));
        out += '<div class="heat-c" style="opacity:' + (0.12 + v * 0.88).toFixed(2) + '"'
             + ' title="' + esc(rows[r] + " · " + cols[c]) + '"></div>';
      }
    }
    return out + "</div>";
  };

  /* ------------------------------------------- точечная карта мира ------- */
  /* Суша — гексагональная сетка: узлы уже уложены сотами в worldmap-data.js
     (нечётные ряды сдвинуты на полшага), шаг сетки приходит в EH.mapStep.
     Поверх — маркеры юрисдикций и пунктирные дуги от Ташкента.
     opts: { zoom:true — колесо/перетаскивание/кнопки, pins:true — подписи-чипы,
             flow:true — импульсы «отправки запроса» по дугам, fit:"cover" — карта
             закрывает блок целиком, hub:false — не рисовать Ташкент }. */

  var HEX_FILL = .86;        /* доля ячейки под соту — остальное равномерный зазор */

  /* Соты правильные: полуширина = шаг/2, радиус по вертикали = шаг ряда / 1.5.
     Хвост пути одинаков для всех узлов — считаем один раз. */
  function hexGeom() {
    if (EH._wmHex) { return EH._wmHex; }
    var st = EH.mapStep || [5.2632, 4.5652];
    var hw = st[0] / 2 * HEX_FILL, r = st[1] / 1.5 * HEX_FILL;
    var tail = "l" + n2(hw) + " " + n2(r / 2) + "v" + n2(r)
             + "l" + n2(-hw) + " " + n2(r / 2)
             + "l" + n2(-hw) + " " + n2(-r / 2) + "v" + n2(-r) + "z";
    return (EH._wmHex = { r: r, tail: tail });
  }

  var WM_SEQ = 0;

  EH.worldMapDecor = function (markers, opts) {
    opts = opts || {};
    if (!EH.mapPts) { return ""; }
    var W = EH.mapVB[0], H = EH.mapVB[1];
    var hex = hexGeom();
    var withHub = opts.hub !== false;

    var pts = [];
    (markers || []).forEach(function (m) {
      var geo = EH.geo[m.cc];
      if (!geo) { return; }
      var q = EH.mapProject(geo[0], geo[1]);
      pts.push({ x: q[0], y: q[1], m: m, lvl: m.level === "danger" ? "danger" : m.level === "warn" ? "warn" : "ok" });
    });
    var hub = EH.mapProject(EH.geo.UZ[0], EH.geo.UZ[1]);

    /* декоративные адресаты по континентам: дают много летящих импульсов,
       рядом с реальной юрисдикцией не ставим, чтобы не спорили за внимание */
    var amb = [];
    if (opts.ambient && EH.geoAmbient) {
      EH.geoAmbient.forEach(function (g) {
        var q = EH.mapProject(g[0], g[1]);
        var busy = pts.some(function (m) {
          return Math.sqrt((m.x - q[0]) * (m.x - q[0]) + (m.y - q[1]) * (m.y - q[1])) < 20;
        });
        if (!busy) { amb.push({ x: q[0], y: q[1] }); }
      });
    }

    /* суша по слоям: база + ореол вокруг маркеров (ближний/дальний радиус) */
    var R1 = 13, R2 = 26, buck = {};
    function put(k, x, y) {
      (buck[k] || (buck[k] = [])).push("M" + n2(x) + " " + n2(y - hex.r) + hex.tail);
    }
    var p = EH.mapPts;
    for (var i = 0; i < p.length; i += 2) {
      var x = p[i], y = p[i + 1];
      var key = "base", best = 1e9, j, d;
      for (j = 0; j < pts.length; j++) {
        d = Math.sqrt((x - pts[j].x) * (x - pts[j].x) + (y - pts[j].y) * (y - pts[j].y));
        if (d < best) { best = d; key = d < R1 ? pts[j].lvl : d < R2 ? pts[j].lvl + "-s" : "base"; }
      }
      if (withHub) {
        d = Math.sqrt((x - hub[0]) * (x - hub[0]) + (y - hub[1]) * (y - hub[1]));
        if (d < R1) { key = "hub"; } else if (d < R2 && key === "base") { key = "hub-s"; }
      }
      put(key, x, y);
    }

    var id = "wm" + (++WM_SEQ);
    var out = '<svg class="wmap' + (opts.flow ? " is-flow" : "") + '" id="' + id + '"'
            + ' viewBox="0 0 ' + W + " " + H + '" role="img"'
            + ' preserveAspectRatio="xMidYMid ' + (opts.fit === "cover" ? "slice" : "meet") + '">';
    out += "<g class=\"wm-land\">";
    ["base", "ok-s", "warn-s", "danger-s", "hub-s", "ok", "warn", "danger", "hub"].forEach(function (k) {
      if (buck[k]) { out += '<path class="wm-hex wm-' + k + '" d="' + buck[k].join("") + '"/>'; }
    });
    out += "</g>";

    /* дуги Ташкент → юрисдикция */
    out += '<g class="wm-arcs">';
    pts.forEach(function (q, k) {
      var mx = (hub[0] + q.x) / 2;
      var my = Math.min(hub[1], q.y) - Math.abs(q.x - hub[0]) * .16 - 12;
      out += '<path class="arc" id="' + id + "a" + k + '" d="M' + n2(hub[0]) + " " + n2(hub[1])
           + " Q" + n2(mx) + " " + n2(my) + " " + n2(q.x) + " " + n2(q.y)
           + '" vector-effect="non-scaling-stroke"/>';
    });
    (opts.flow ? amb : []).forEach(function (q, k) {
      var mx = (hub[0] + q.x) / 2;
      var my = Math.min(hub[1], q.y) - Math.abs(q.x - hub[0]) * .16 - 12;
      out += '<path class="arc arc-amb" id="' + id + "b" + k + '" d="M' + n2(hub[0]) + " " + n2(hub[1])
           + " Q" + n2(mx) + " " + n2(my) + " " + n2(q.x) + " " + n2(q.y)
           + '" vector-effect="non-scaling-stroke"/>';
    });
    out += "</g>";

    /* «отправка запроса»: по каждой дуге от Ташкента бежит импульс.
       Отрицательный begin — чтобы к первому кадру импульсы уже были в пути. */
    if (opts.flow && (pts.length || amb.length)) {
      out += '<g class="wm-flow">';

      var pulse = function (path, cls, r, dur, beg) {
        var mp = '<mpath href="#' + path + '" xlink:href="#' + path + '"/>';
        return '<circle class="' + cls + '" r="' + r + '" opacity="0">'
             + '<animateMotion dur="' + dur + 's" begin="' + n2(beg) + 's" repeatCount="indefinite"'
             + ' calcMode="linear" keyPoints="0;1" keyTimes="0;1">' + mp + "</animateMotion>"
             + '<animate attributeName="opacity" dur="' + dur + 's" begin="' + n2(beg) + 's"'
             + ' repeatCount="indefinite" values="0;1;1;0" keyTimes="0;.1;.82;1"/>'
             + "</circle>";
      };

      var dur = 3.8, gap = pts.length ? dur / pts.length : 0;
      pts.forEach(function (q, k) {
        out += pulse(id + "a" + k, "flow" + (q.lvl === "ok" ? "" : " flow-" + q.lvl), 2.6, dur, -k * gap);
      });
      /* декоративные летят дольше и вразнобой — иначе получается «залп» */
      amb.forEach(function (q, k) {
        out += pulse(id + "b" + k, "flow flow-amb", 1.9, 5.2 + (k % 5) * .55, -(k * 1.31) % 5.2);
      });
      out += "</g>";

      /* точки-получатели */
      amb.forEach(function (q) {
        out += '<circle class="amb-dot wmk" data-mx="' + n2(q.x) + '" data-my="' + n2(q.y) + '"'
             + ' transform="translate(' + n2(q.x) + " " + n2(q.y) + ')" r="1.9"/>';
      });
    }

    /* маркеры: в группе с transform — при зуме их размер компенсируется */
    out += '<g class="wm-mks">';
    pts.forEach(function (q, k) {
      var cls = q.lvl === "danger" ? "mk-danger" : q.lvl === "warn" ? "mk-warn" : "mk";
      out += '<g class="wmk" data-mx="' + n2(q.x) + '" data-my="' + n2(q.y) + '"'
           + ' transform="translate(' + n2(q.x) + " " + n2(q.y) + ')">'
           + '<circle class="ping' + (q.lvl === "ok" ? "" : " ping-warn") + '" r="4" style="animation-delay:'
           + (k * 320) + 'ms"/>'
           + '<circle class="' + cls + '" r="4"><title>' + esc(q.m.label || q.m.cc) + "</title></circle></g>";
    });
    if (withHub) {
      out += '<g class="wmk" data-mx="' + n2(hub[0]) + '" data-my="' + n2(hub[1]) + '"'
           + ' transform="translate(' + n2(hub[0]) + " " + n2(hub[1]) + ')">'
           + '<circle class="hub" r="5.5"><title>' + esc(opts.hubLabel || "Toshkent") + "</title></circle></g>";
    }
    out += "</g></svg>";

    /* подписи-чипы поверх карты (HTML — чтобы текст не «плыл» при зуме) */
    var pins = "";
    if (opts.pins) {
      pts.forEach(function (q) {
        pins += '<span class="wpin is-' + q.lvl + '" data-pri="' + (q.lvl === "danger" ? 3 : q.lvl === "warn" ? 2 : 1) + '"'
             + ' data-x="' + n2(q.x) + '" data-y="' + n2(q.y) + '">'
             + (q.m.icon ? '<span class="wpin-ic">' + EH.icon(q.m.icon, "ic-sm") + "</span>" : "")
             + '<span class="wpin-b"><span class="wpin-t">' + esc(q.m.label || q.m.cc) + "</span>"
             + (q.m.value != null ? '<span class="wpin-v">' + esc(q.m.value) + "</span>" : "")
             + "</span></span>";
      });
      if (withHub) {
        pins += '<span class="wpin is-hub" data-pri="4" data-x="' + n2(hub[0]) + '" data-y="' + n2(hub[1]) + '">'
             + '<span class="wpin-b"><span class="wpin-t">' + esc(opts.hubLabel || "Toshkent") + "</span></span></span>";
      }
    }

    var ctl = "";
    if (opts.zoom) {
      var btn = function (key, tkey, icon) {
        return '<button type="button" class="wmap-b" data-wm="' + key + '"'
             + ' title="' + esc(EH.t(tkey)) + '" aria-label="' + esc(EH.t(tkey)) + '">'
             + EH.icon(icon, "ic-sm") + "</button>";
      };
      ctl = '<div class="wmap-ctl">'
          + btn("in", "map.in", "zoomin")
          + btn("out", "map.out", "zoomout")
          + btn("reset", "map.reset", "focus")
          + "</div>"
          + '<span class="wmap-zl" data-wm="lvl">1.0&times;</span>';
    }

    var foc = "";
    if (opts.fit === "cover") {
      var f = opts.focus ? EH.mapProject(opts.focus[0], opts.focus[1]) : hub;
      foc = ' data-cover="' + n2(f[0]) + " " + n2(f[1]) + '"';
    }

    return '<div class="wmap-wrap' + (opts.zoom ? " is-zoomable" : "") + '"' + foc
         + (opts.zoom ? ' data-zoom="1" tabindex="0"' : "")
         + (opts.cls ? ' data-cls="' + esc(opts.cls) + '"' : "")
         + ">" + out + '<div class="wmap-pins">' + pins + "</div>" + ctl + "</div>";
  };

  /* ---------------------------------------- зум/панорама для .wmap-wrap -- */
  EH.mountWorldMaps = function (scope) {
    var list = (scope || document).querySelectorAll('.wmap-wrap[data-zoom]:not([data-wm-on])');
    Array.prototype.forEach.call(list, function (wrap) { mountMap(wrap); });
    /* карты без зума тоже хотят подписи на своих местах и подгонку окна */
    var plain = (scope || document).querySelectorAll('.wmap-wrap:not([data-zoom]):not([data-wm-on])');
    Array.prototype.forEach.call(plain, function (wrap) {
      wrap.setAttribute("data-wm-on", "1");
      function sync() { fitCover(wrap); placePins(wrap); }
      sync();
      window.addEventListener("resize", sync);
      /* блок мог быть ещё нулевой ширины (скрытая вкладка, ленивый рендер) —
         ResizeObserver досчитает окно, как только появятся размеры */
      if (window.ResizeObserver) { new ResizeObserver(sync).observe(wrap); }
    });
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* fit:"cover" — окно viewBox берём по высоте карты и по пропорциям блока,
     центрируя на точке из data-cover: так карта заполняет панель целиком,
     а хаб не уезжает за край на узких колонках. */
  function fitCover(wrap) {
    var foc = wrap.getAttribute("data-cover");
    var svg = wrap.querySelector("svg.wmap");
    if (!foc || !svg) { return; }
    var box = wrap.getBoundingClientRect();
    if (!box.width || !box.height) { return; }
    var W = EH.mapVB[0], H = EH.mapVB[1];
    var f = foc.split(" ");
    var w = Math.min(W, H * (box.width / box.height));
    var x = clamp(parseFloat(f[0]) - w / 2, 0, W - w);
    svg.setAttribute("viewBox", n2(x) + " 0 " + n2(w) + " " + H);
  }

  function placePins(wrap) {
    var svg = wrap.querySelector("svg.wmap");
    var pins = wrap.querySelectorAll(".wpin");
    if (!svg || !pins.length) { return; }
    var m = svg.getScreenCTM();
    if (!m) { return; }
    var rb = wrap.getBoundingClientRect();
    var live = [];
    Array.prototype.forEach.call(pins, function (el) {
      var x = parseFloat(el.getAttribute("data-x")), y = parseFloat(el.getAttribute("data-y"));
      var px = m.a * x + m.c * y + m.e - rb.left;
      var py = m.b * x + m.d * y + m.f - rb.top;
      el.style.transform = "translate(" + n2(px) + "px," + n2(py) + "px) translate(-50%,-152%)";
      var vis = px > -60 && px < rb.width + 60 && py > -10 && py < rb.height + 30;
      el.style.visibility = vis ? "" : "hidden";
      if (vis) { live.push({ el: el, x: px, y: py, pri: +el.getAttribute("data-pri") || 0 }); }
    });

    /* подписи в Европе налезают друг на друга — оставляем важные,
       у скрытых остаётся точка с нативной подсказкой */
    live.sort(function (a, b) { return b.pri - a.pri || a.y - b.y; });
    var kept = [];
    live.forEach(function (o) {
      var w = o.el.offsetWidth || 90, h = o.el.offsetHeight || 26;
      var box = { l: o.x - w / 2 - 3, r: o.x + w / 2 + 3, t: o.y - h * 1.52 - 3, b: o.y - h * .52 + 3 };
      var hit = kept.some(function (k) {
        return !(box.r < k.l || box.l > k.r || box.b < k.t || box.t > k.b);
      });
      if (hit) { o.el.style.visibility = "hidden"; o.el.classList.add("is-off"); }
      else { kept.push(box); o.el.classList.remove("is-off"); }
    });
  }

  function mountMap(wrap) {
    wrap.setAttribute("data-wm-on", "1");
    var svg = wrap.querySelector("svg.wmap");
    if (!svg) { return; }
    var W = svg.viewBox.baseVal.width, H = svg.viewBox.baseVal.height;
    var MIN = 1, MAX = 10;
    var v = { s: 1, cx: W / 2, cy: H / 2 };
    var lvl = wrap.querySelector("[data-wm=lvl]");
    var mks = wrap.querySelectorAll(".wmk");

    function apply() {
      var w = W / v.s, h = H / v.s;
      v.cx = clamp(v.cx, w / 2, W - w / 2);
      v.cy = clamp(v.cy, h / 2, H - h / 2);
      svg.setAttribute("viewBox", n2(v.cx - w / 2) + " " + n2(v.cy - h / 2) + " " + n2(w) + " " + n2(h));
      var k = Math.max(1 / v.s, .34);
      Array.prototype.forEach.call(mks, function (el) {
        el.setAttribute("transform", "translate(" + el.getAttribute("data-mx") + " " + el.getAttribute("data-my")
          + ") scale(" + n2(k) + ")");
      });
      if (lvl) { lvl.textContent = (Math.round(v.s * 10) / 10).toFixed(1) + "×"; }
      wrap.classList.toggle("is-zoomed", v.s > 1.01);
      placePins(wrap);
    }

    /* экранная точка → координаты viewBox */
    function toVB(cx, cy) {
      var m = svg.getScreenCTM();
      if (!m) { return null; }
      var det = m.a * m.d - m.b * m.c;
      if (!det) { return null; }
      var x = cx - m.e, y = cy - m.f;
      return [(x * m.d - y * m.c) / det, (y * m.a - x * m.b) / det];
    }

    /* зум с сохранением точки под курсором */
    function zoomAt(clientX, clientY, factor) {
      var q = toVB(clientX, clientY);
      var s0 = v.s, s1 = clamp(s0 * factor, MIN, MAX);
      if (s1 === s0) { return; }
      if (q) {
        var kx = (q[0] - (v.cx - W / s0 / 2)) / (W / s0);
        var ky = (q[1] - (v.cy - H / s0 / 2)) / (H / s0);
        v.cx = q[0] - (kx - .5) * (W / s1);
        v.cy = q[1] - (ky - .5) * (H / s1);
      }
      v.s = s1;
      apply();
    }

    function zoomCenter(factor) {
      var r = wrap.getBoundingClientRect();
      zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
    }

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.deltaMode === 1 ? .03 : .0018)));
    }, { passive: false });

    svg.addEventListener("dblclick", function (e) { zoomAt(e.clientX, e.clientY, 1.8); });

    /* перетаскивание + щипок (два пальца) */
    var drag = null, act = {};
    svg.addEventListener("pointerdown", function (e) {
      act[e.pointerId] = { x: e.clientX, y: e.clientY };
      svg.setPointerCapture(e.pointerId);
      if (Object.keys(act).length === 1) {
        drag = { x: e.clientX, y: e.clientY, cx: v.cx, cy: v.cy };
        wrap.classList.add("is-drag");
      }
    });
    svg.addEventListener("pointermove", function (e) {
      if (!act[e.pointerId]) { return; }
      var ids = Object.keys(act);
      if (ids.length >= 2) {
        var a = act[ids[0]], b = act[ids[1]];
        var d0 = Math.hypot(a.x - b.x, a.y - b.y);
        act[e.pointerId] = { x: e.clientX, y: e.clientY };
        a = act[ids[0]]; b = act[ids[1]];
        var d1 = Math.hypot(a.x - b.x, a.y - b.y);
        if (d0 > 0 && d1 > 0) { zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d1 / d0); }
        drag = null;
        return;
      }
      act[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (!drag) { return; }
      var r = wrap.getBoundingClientRect();
      var w = W / v.s, h = H / v.s;
      v.cx = drag.cx - (e.clientX - drag.x) * (w / r.width);
      v.cy = drag.cy - (e.clientY - drag.y) * (h / r.height);
      apply();
    });
    function up(e) {
      delete act[e.pointerId];
      if (!Object.keys(act).length) { drag = null; wrap.classList.remove("is-drag"); }
    }
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", up);

    wrap.querySelectorAll("[data-wm]").forEach(function (b) {
      if (b.tagName !== "BUTTON") { return; }
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-wm");
        if (k === "in") { zoomCenter(1.6); }
        else if (k === "out") { zoomCenter(1 / 1.6); }
        else { v.s = 1; v.cx = W / 2; v.cy = H / 2; apply(); }
      });
    });

    wrap.addEventListener("keydown", function (e) {
      var st = 40 / v.s;
      if (e.key === "+" || e.key === "=") { zoomCenter(1.4); }
      else if (e.key === "-") { zoomCenter(1 / 1.4); }
      else if (e.key === "0") { v.s = 1; v.cx = W / 2; v.cy = H / 2; apply(); }
      else if (e.key === "ArrowLeft") { v.cx -= st; apply(); }
      else if (e.key === "ArrowRight") { v.cx += st; apply(); }
      else if (e.key === "ArrowUp") { v.cy -= st; apply(); }
      else if (e.key === "ArrowDown") { v.cy += st; apply(); }
      else { return; }
      e.preventDefault();
    });

    window.addEventListener("resize", function () { placePins(wrap); });
    apply();
  }

  /* --------------------------------------------------- анимация чисел ---- */
  EH.countUp = function (el, to, opts) {
    opts = opts || {};
    var dur = opts.dur || 850;
    var fmt = opts.fmt || function (v) { return EH.fmtNum ? EH.fmtNum(v) : String(v); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmt(to); return; }
    var t0 = null;
    function step(t) {
      if (t0 === null) { t0 = t; }
      var k = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  };
  EH.autoCount = function (scope) {
    (scope || document).querySelectorAll("[data-count]").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count"));
      var suf = el.getAttribute("data-suffix") || "";
      EH.countUp(el, to, { fmt: function (v) { return (EH.fmtNum ? EH.fmtNum(v) : v) + suf; } });
    });
  };

  /* ------------------------------------------------ тултипы для столбцов - */
  EH.mountChartTips = function (host) {
    if (!host) { return; }
    var tip = host.querySelector(".ch-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "ch-tip";
      tip.hidden = true;
      host.appendChild(tip);
    }
    var svg = host.querySelector("svg.chart");
    if (!svg) { return; }
    svg.querySelectorAll("g[data-tip]").forEach(function (g) {
      g.addEventListener("mouseenter", function () {
        var box = svg.getBoundingClientRect();
        var vb = svg.viewBox.baseVal;
        var sx = box.width / vb.width, sy = box.height / vb.height;
        var raw = g.getAttribute("data-vals");

        if (raw) {
          /* линейный график: подпись сверху, значения серий под ней */
          var vals = [];
          try { vals = JSON.parse(raw); } catch (e) { vals = []; }
          tip.className = "ch-tip ch-tip-card";
          tip.innerHTML = '<span class="ct-l">' + esc(g.getAttribute("data-tip")) + "</span>"
            + vals.map(function (v) {
                return '<span class="ct-row"><i style="background:' + esc(v.c) + '"></i>' + esc(v.v) + "</span>";
              }).join("");
        } else {
          tip.className = "ch-tip";
          tip.innerHTML = "<span>" + esc(g.getAttribute("data-tip")) + "</span><b>" + esc(g.getAttribute("data-val")) + "</b>";
        }

        tip.style.left = (parseFloat(g.getAttribute("data-x")) * sx) + "px";
        tip.style.top = (parseFloat(g.getAttribute("data-y")) * sy) + "px";
        tip.hidden = false;
        g.classList.add("is-on");
      });
      g.addEventListener("mouseleave", function () {
        tip.hidden = true;
        g.classList.remove("is-on");
      });
    });
  };

})(window.EH = window.EH || {});
