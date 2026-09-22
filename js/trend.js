/* ============================================================================
   trend.js — карточка «Открытые и закрытые».
   Рабочий стол и мониторинг руководства показывают одну и ту же помесячную
   динамику, поэтому блок у них общий: заголовок-метрика, период,
   переключатель «столбцы/область», график и легенда. Держать две копии
   разметки значило бы чинить их по отдельности и расходиться в оформлении.
   ========================================================================= */
(function (EH) {
  "use strict";

  /* Динамика хранится помесячно, поэтому период здесь режет по месяцам:
     в срез попадает каждый месяц, который период задевает хотя бы днём.
     Готовые периоды короче месяца отобраны из списка — «7 дней» на
     помесячном графике дали бы один столбец во всю карточку. */
  var PERIODS = ["all", "days30", "thisMonth", "lastMonth", "thisYear"];

  /* EH.monthly — двенадцать месяцев, последний из которых текущий:
     дата месяца выводится из EH.TODAY, а не из ключа "mo.N". */
  function monthAt(i) {
    return new Date(EH.TODAY.getFullYear(), EH.TODAY.getMonth() - (EH.monthly.length - 1 - i), 1);
  }

  function slice(period) {
    if (!period.from) { return EH.monthly.slice(); }
    return EH.monthly.filter(function (m, i) {
      var d = monthAt(i);
      var first = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-01";
      var last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return first <= period.to
        && (last.getFullYear() + "-" + ("0" + (last.getMonth() + 1)).slice(-2)
            + "-" + ("0" + last.getDate()).slice(-2)) >= period.from;
    });
  }

  /* opts: { id, cls, bars:{w,h}, area:{w,h,maxLabels} } — размеры вынесены
     наружу, потому что карточка стоит в колонках разной ширины: viewBox
     задаёт пропорции, и в узкой колонке широкий график вышел бы плоским. */
  EH.trendPanel = function (opts) {
    opts = opts || {};
    var id = opts.id || "trend";
    var period = EH.presetRange("all");
    var mode = "bars";

    /* Образцы в легенде и в подсказке повторяют заливку самих столбцов:
       в режиме столбцов «открыто» — акцент, «закрыто» — светлая штриховка,
       в режиме области ряды остаются линиями своих цветов. Иначе легенда
       обещает зелёный, а на графике штриховка. */
    var HATCH = "repeating-linear-gradient(45deg, var(--hatch) 0 1.6px, var(--bar-idle) 1.6px 5px)";
    function swatch(i) {
      if (mode !== "bars") { return i === 0 ? "var(--c1)" : "var(--c3)"; }
      return i === 0 ? "var(--accent-strong)" : HATCH;
    }

    function chartOpts(base, extra) {
      var o = {}, k;
      for (k in base) { if (base.hasOwnProperty(k)) { o[k] = base[k]; } }
      for (k in extra) { if (extra.hasOwnProperty(k)) { o[k] = extra[k]; } }
      return o;
    }

    /* Показатель в заголовке — последний месяц среза и его отличие
       от предыдущего. Считается вместе с графиком: иначе при смене периода
       над одним августовским столбцом остаётся годовая цифра. */
    function metric() {
      var created = slice(period).map(function (m) { return m.c; });
      var last = created[created.length - 1] || 0;
      var prev = created.length > 1 ? created[created.length - 2] : last;
      return { last: last, up: last >= prev,
               pct: prev ? Math.abs(Math.round((last - prev) / prev * 100)) : 0 };
    }

    /* Кнопка периода вынесена отдельно: на рабочем столе она стоит в шапке
       страницы рядом с «Новый запрос», а не в шапке карточки. Разметку рисует
       панель, чтобы состояние периода и подпись на кнопке жили в одном месте. */
    function periodHTML() {
      return EH.periodButton(period, { id: id + "Period", cls: "btn-sm" });
    }

    function html() {
      var m = metric();
      var last = m.last, up = m.up, pct = m.pct;

      return '<section class="card' + (opts.cls ? " " + opts.cls : "") + '" id="' + id + 'Card">'
        + '<div class="card-head no-rule"><div class="hero-metric">'
        +   '<span class="eyebrow">' + EH.esc(EH.t("db.trend")) + "</span>"
        +   '<span class="big-num" data-count="' + last + '">0</span>'
        +   '<div class="stat-foot">' + EH.trendChip(pct + "%", up, true) + "</div>"
        + "</div>"
        + '<div class="card-head-r">'
        +   (opts.externalPeriod ? "" : periodHTML())
        +   '<div class="btn-grp" id="' + id + 'Mode">'
        +     '<button class="btn btn-sm is-on" data-mode="bars" aria-label="bars">' + EH.icon("bars", "ic-sm") + "</button>"
        +     '<button class="btn btn-sm" data-mode="area" aria-label="area">' + EH.icon("line", "ic-sm") + "</button>"
        +   "</div>"
        + "</div></div>"
        + '<div class="card-body ch-host" id="' + id + 'Host" style="padding-top:4px"></div>'
        + '<div class="card-foot"><div class="legend-row">'
        +   '<span class="li"><span class="dot" style="background:var(--c1)"></span>' + EH.esc(EH.t("db.opened")) + "</span>"
        +   '<span class="li"><span class="dot" style="background:var(--c3)"></span>' + EH.esc(EH.t("db.closed")) + "</span>"
        + "</div></div></section>";
    }

    function mount(page) {
      var host = page.querySelector("#" + id + "Host");
      if (!host) { return; }

      /* Карточка в строке с более высоким соседом растягивается по его росту,
         и под невысоким графиком остаётся пустая половина. viewBox подгоняется
         под остаток места: ширина у него задана ради пропорций подписей,
         а высота считается из фактического размера карточки. */
      function fitH(w, base) {
        if (!opts.fill) { return base; }
        var card = host.closest(".card");
        if (!card) { return base; }
        var cs = window.getComputedStyle(host);
        var padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        var cw = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var used = 0;
        for (var i = 0; i < card.children.length; i++) {
          if (card.children[i] !== host) { used += card.children[i].offsetHeight; }
        }
        var avail = card.clientHeight - used - padV;
        if (!(cw > 0) || avail < 160) { return base; }
        /* Потолок — вдвое выше ширины: дальше столбцы вытягиваются в спички,
           и график начинает врать о масштабе. */
        return Math.round(Math.min(w * 2, w * avail / cw));
      }

      function paintLegend() {
        var dots = page.querySelectorAll("#" + id + "Card .card-foot .li .dot");
        for (var i = 0; i < dots.length; i++) {
          var hatch = mode === "bars" && i === 1;
          dots[i].classList.toggle("dot-hatch", hatch);
          dots[i].style.background = hatch ? "" : swatch(i);
        }
      }

      function draw() {
        var rows = slice(period);
        var labels = rows.map(function (m) { return EH.t(m.m).slice(0, 3); });
        var created = rows.map(function (m) { return m.c; });
        var closed = rows.map(function (m) { return m.d; });
        var o;
        if (mode === "area") {
          o = chartOpts({ h: 240 }, opts.area);
          o.h = fitH(o.w || 720, o.h);
          host.innerHTML = EH.area([{ pts: created, color: "var(--c1)", fill: true },
                                    { pts: closed,  color: "var(--c3)", fill: false }], labels, o);
        } else {
          o = chartOpts({ h: 250 }, opts.bars);
          o.h = fitH(o.w || 760, o.h);
          /* Оба ряда, а не один: легенда под графиком обещает «открыто»
             и «закрыто», и столбцы должны показывать то же самое.
             Графика прежняя: акцентная заливка и светлая штриховка. */
          host.innerHTML = EH.bars([
            { pts: created, tone: "accent", color: swatch(0) },
            { pts: closed,  tone: "idle",   color: swatch(1) }
          ], labels, o);
        }
        EH.mountChartTips(host);
        paintLegend();

        var m = metric();
        var num = page.querySelector("#" + id + "Card .big-num");
        var foot = page.querySelector("#" + id + "Card .hero-metric .stat-foot");
        /* data-count снимается: счётчик оболочки уже отработал на загрузке,
           и оставленный атрибут вернул бы старое значение при перерисовке. */
        if (num) { num.removeAttribute("data-count"); num.textContent = m.last; }
        if (foot) { foot.innerHTML = EH.trendChip(m.pct + "%", m.up, true); }
      }
      draw();

      EH.mountPeriod(page.querySelector("#" + id + "Period"), {
        value: period,
        presets: PERIODS,
        onChange: function (v) { period = v; draw(); }
      });

      page.querySelectorAll("#" + id + "Mode [data-mode]").forEach(function (b) {
        b.addEventListener("click", function () {
          page.querySelectorAll("#" + id + "Mode [data-mode]").forEach(function (x) { x.classList.remove("is-on"); });
          b.classList.add("is-on");
          mode = b.getAttribute("data-mode");
          draw();
        });
      });

      /* Подогнанная высота зависит от ширины колонки — после изменения окна
         её нужно пересчитать, иначе график остаётся в пропорциях прошлого
         размера. С задержкой: перерисовка на каждый пиксел протяжки не нужна. */
      if (opts.fill) {
        var t;
        window.addEventListener("resize", function () {
          clearTimeout(t);
          t = setTimeout(draw, 160);
        });
      }
    }

    return { html: html, mount: mount, periodHTML: periodHTML };
  };

})(window.EH = window.EH || {});
