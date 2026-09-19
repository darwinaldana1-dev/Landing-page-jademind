/*!
 * NeuralField
 * Red neuronal interactiva + ondas de datos en Canvas 2D nativo.
 * Sin dependencias. Un solo requestAnimationFrame, sin allocations por frame.
 *
 * Uso:
 *   <canvas data-neural-field aria-hidden="true"></canvas>
 *   <script src="neural-field.js"></script>
 *
 * o manualmente:
 *   const field = new NeuralField(canvasEl, { linkDistance: 160 });
 *   field.destroy();
 */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;
  var BUCKETS = 8; // niveles de opacidad para agrupar las líneas en pocos trazos

  var DEFAULTS = {
    core: [0, 255, 136],      // #00ff88
    deep: [16, 185, 129],     // #10b981
    density: 1 / 12000,       // nodos por px² (a calidad 1)
    minNodes: 32,
    maxNodes: 150,
    linkDistance: 145,        // px: umbral de conexión entre nodos
    speed: 16,                // px/s: deriva base
    radius: [1.1, 2.7],       // radio del núcleo del nodo
    cursorRadius: 180,        // px: zona de repulsión del cursor
    repel: 380,               // fuerza de repulsión
    waveLength: 640,          // px: longitud de la onda que recorre los nodos
    waveSpeed: 130,           // px/s: velocidad de la onda
    waveAngle: -0.35,         // rad: dirección de la onda
    maxDpr: 2,                // tope de devicePixelRatio para cuidar el rendimiento
    adaptive: true            // reduce nodos si los frames van lentos
  };

  // Ondas de datos (líneas sinusoidales compuestas) en la parte baja.
  var WAVES = [
    { y: 0.70, a: 0.22, k1: 0.0061, s1: 0.9, a1: 22, k2: 0.0113, s2: 0.6, a2: 10 },
    { y: 0.78, a: 0.34, k1: 0.0048, s1: 0.7, a1: 30, k2: 0.0097, s2: 1.1, a2: 12 },
    { y: 0.87, a: 0.18, k1: 0.0073, s1: 1.2, a1: 18, k2: 0.0139, s2: 0.8, a2: 8 }
  ];

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function makeSprite(size, stops) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (var i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function NeuralField(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({}, DEFAULTS, options || {});
    var o = this.o;
    var cap = o.maxNodes;

    // Estructura de arrays tipados: cero objetos por nodo, menos GC.
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.kx = new Float32Array(cap);   // impulso del cursor
    this.ky = new Float32Array(cap);
    this.r = new Float32Array(cap);
    this.rx = new Float32Array(cap);   // posición de render (con ondulación)
    this.ry = new Float32Array(cap);
    this.wv = new Float32Array(cap);   // intensidad de la onda 0..1
    this.prox = new Float32Array(cap); // cercanía al cursor 0..1
    this.n = 0;

    var segCap = cap * 24 * 4;
    this.segs = [];
    this.segN = new Int32Array(BUCKETS);
    this.linkStyle = [];
    for (var b = 0; b < BUCKETS; b++) {
      this.segs.push(new Float32Array(segCap));
      var t = b / (BUCKETS - 1);
      this.linkStyle.push(rgba(
        [Math.round(lerp(o.deep[0], o.core[0], t)),
         Math.round(lerp(o.deep[1], o.core[1], t)),
         Math.round(lerp(o.deep[2], o.core[2], t))],
        (0.07 + t * 0.78).toFixed(3)
      ));
    }
    this.segCap = segCap;

    this.nodeSprite = makeSprite(128, [
      [0, 'rgba(214,255,234,1)'],
      [0.16, rgba(o.core, 1)],
      [0.3, rgba(o.core, 0.34)],
      [0.6, rgba(o.deep, 0.07)],
      [1, rgba(o.deep, 0)]
    ]);
    this.glowSprite = makeSprite(256, [
      [0, rgba(o.core, 0.26)],
      [0.45, rgba(o.deep, 0.09)],
      [1, rgba(o.deep, 0)]
    ]);

    this.w = 0; this.h = 0; this.dpr = 1;
    this.t = 0; this.raf = 0; this.last = 0;
    this.quality = 1; this.ema = 16.7; this.slow = 0; this.frames = 0;
    this.ptr = { x: 0, y: 0, tx: 0, ty: 0, act: 0, on: false, seen: false };
    this.waveGrad = null;
    this.tabVisible = !document.hidden;
    this.inView = true;
    this.reduced = false;
    this.destroyed = false;

    this.ca = Math.cos(o.waveAngle); this.sa = Math.sin(o.waveAngle);
    this.ca2 = Math.cos(o.waveAngle + 1.2); this.sa2 = Math.sin(o.waveAngle + 1.2);
    this.k1 = TAU / o.waveLength;
    this.k2 = TAU / (o.waveLength * 0.63);

    this._bind();
    this._resize(true);
    this._applyMotionPref();
  }

  var P = NeuralField.prototype;

  /* ---------- Ciclo de vida ---------- */

  P._bind = function () {
    var self = this;

    this._onFrame = function (now) {
      self.raf = requestAnimationFrame(self._onFrame);
      var dt = (now - self.last) / 1000;
      self.last = now;
      if (dt <= 0) return;
      if (dt > 0.1) dt = 0.1; // evita saltos tras pausas de la pestaña
      self.t += dt;
      if (self.o.adaptive) self._adapt(dt * 1000);
      self._update(dt);
      self._draw();
    };

    var resizeQueued = false;
    this._onResize = function () {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(function () { resizeQueued = false; self._resize(false); });
    };

    function setPointer(cx, cy) {
      var r = self.canvas.getBoundingClientRect();
      var p = self.ptr;
      p.tx = cx - r.left; p.ty = cy - r.top;
      if (!p.seen) { p.x = p.tx; p.y = p.ty; p.seen = true; }
      p.on = true;
    }
    function clearPointer() { self.ptr.on = false; }

    // Se escucha en window: el canvas no necesita recibir eventos (pointer-events: none).
    this._onPointerMove = function (e) {
      if (e.pointerType === 'touch') return; // el táctil se gestiona con touch*
      setPointer(e.clientX, e.clientY);
    };
    this._onTouch = function (e) {
      var t = e.touches && e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    };
    this._onTouchEnd = clearPointer;
    this._onLeave = clearPointer;

    this._onVisibility = function () { self.tabVisible = !document.hidden; self._sync(); };

    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('touchstart', this._onTouch, { passive: true });
    window.addEventListener('touchmove', this._onTouch, { passive: true });
    window.addEventListener('touchend', this._onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
    window.addEventListener('blur', this._onLeave);
    document.documentElement.addEventListener('mouseleave', this._onLeave);
    document.addEventListener('visibilitychange', this._onVisibility);

    if ('IntersectionObserver' in window) {
      this._io = new IntersectionObserver(function (entries) {
        self.inView = entries[entries.length - 1].isIntersecting;
        self._sync();
      });
      this._io.observe(this.canvas);
    }

    if (window.matchMedia) {
      this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._onMotion = function () { self._applyMotionPref(); };
      if (this._mq.addEventListener) this._mq.addEventListener('change', this._onMotion);
      else if (this._mq.addListener) this._mq.addListener(this._onMotion);
    }
  };

  P._applyMotionPref = function () {
    this.reduced = !!(this._mq && this._mq.matches);
    if (this.reduced) {
      this._stop();
      this.t = 3;
      this.ptr.act = 0;
      this._update(0);
      this._draw(); // un único fotograma estático
    } else {
      this._sync();
    }
  };

  P._sync = function () {
    if (this.destroyed) return;
    if (!this.reduced && this.tabVisible && this.inView) this._start();
    else this._stop();
  };

  P._start = function () {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this._onFrame);
  };

  P._stop = function () {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  };

  P.destroy = function () {
    this.destroyed = true;
    this._stop();
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('touchstart', this._onTouch);
    window.removeEventListener('touchmove', this._onTouch);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchEnd);
    window.removeEventListener('blur', this._onLeave);
    document.documentElement.removeEventListener('mouseleave', this._onLeave);
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this._io) this._io.disconnect();
    if (this._mq) {
      if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMotion);
      else if (this._mq.removeListener) this._mq.removeListener(this._onMotion);
    }
  };

  /* ---------- Tamaño y población ---------- */

  P._resize = function (force) {
    var rect = this.canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width || window.innerWidth));
    var h = Math.max(1, Math.round(rect.height || window.innerHeight));
    var dpr = Math.min(window.devicePixelRatio || 1, this.o.maxDpr);
    if (!force && w === this.w && h === this.h && dpr === this.dpr) return;

    var ow = this.w, oh = this.h;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reescala los nodos existentes para no re-sembrar ni crear huecos.
    if (ow && oh) {
      var sx = w / ow, sy = h / oh;
      for (var i = 0; i < this.n; i++) { this.x[i] *= sx; this.y[i] *= sy; }
    }

    var g = this.ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, rgba(this.o.deep, 0));
    g.addColorStop(0.5, rgba(this.o.core, 1));
    g.addColorStop(1, rgba(this.o.deep, 0));
    this.waveGrad = g;

    this._syncCount();
    if (this.reduced || !this.raf) { this._update(0); this._draw(); }
  };

  P._syncCount = function () {
    var o = this.o;
    var target = Math.round(this.w * this.h * o.density * this.quality);
    target = Math.max(o.minNodes, Math.min(o.maxNodes, target));
    while (this.n < target) this._spawn(this.n++);
    if (this.n > target) this.n = target;
  };

  P._spawn = function (i) {
    var o = this.o;
    var a = Math.random() * TAU;
    var s = o.speed * (0.4 + Math.random() * 0.9);
    this.x[i] = Math.random() * this.w;
    this.y[i] = Math.random() * this.h;
    this.vx[i] = Math.cos(a) * s;
    this.vy[i] = Math.sin(a) * s;
    this.kx[i] = this.ky[i] = 0;
    var rr = Math.random();
    this.r[i] = o.radius[0] + (o.radius[1] - o.radius[0]) * rr * rr; // mayoría pequeños
  };

  // Si los frames se alargan de forma sostenida, baja la cantidad de nodos.
  P._adapt = function (ms) {
    this.frames++;
    if (this.frames < 40) return; // calentamiento
    this.ema += (ms - this.ema) * 0.05;
    if (this.ema > 24) this.slow++; else if (this.slow > 0) this.slow--;
    if (this.slow > 90 && this.quality > 0.55) {
      this.quality = Math.max(0.55, this.quality * 0.85);
      this.slow = 0;
      this._syncCount();
    }
  };

  /* ---------- Simulación ---------- */

  P._update = function (dt) {
    var n = this.n, w = this.w, h = this.h, t = this.t, o = this.o;
    var x = this.x, y = this.y, vx = this.vx, vy = this.vy, kx = this.kx, ky = this.ky;
    var rx = this.rx, ry = this.ry, wv = this.wv, prox = this.prox;
    var p = this.ptr;

    // Suavizado del cursor y de su "actividad" (fade in/out).
    if (dt > 0) {
      var m = 1 - Math.exp(-dt * 18);
      p.x += (p.tx - p.x) * m;
      p.y += (p.ty - p.y) * m;
      p.act += ((p.on ? 1 : 0) - p.act) * (1 - Math.exp(-dt * 6));
    }
    var act = p.act, R = o.cursorRadius, R2 = R * R, RS = R * 1.35;
    var damp = Math.exp(-dt * 2.2);
    var margin = 20;
    var ca = this.ca, sa = this.sa, ca2 = this.ca2, sa2 = this.sa2;
    var k1 = this.k1, k2 = this.k2, wt = o.waveSpeed * t;

    for (var i = 0; i < n; i++) {
      var px = x[i], py = y[i];

      // Cursor: repulsión suave dentro de R, sinapsis (prox) hasta 1.35R.
      var pr = 0;
      if (act > 0.01) {
        var dx = px - p.x, dy = py - p.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < RS * RS) {
          var d = Math.sqrt(d2) || 0.001;
          pr = (1 - d / RS) * act;
          if (d2 < R2 && dt > 0) {
            var f = 1 - d / R;
            f = f * f * o.repel * act * dt;
            kx[i] += (dx / d) * f;
            ky[i] += (dy / d) * f;
          }
        }
      }
      prox[i] = pr;

      kx[i] *= damp; ky[i] *= damp;
      px += (vx[i] + kx[i]) * dt;
      py += (vy[i] + ky[i]) * dt;
      if (px < -margin) px = w + margin; else if (px > w + margin) px = -margin;
      if (py < -margin) py = h + margin; else if (py > h + margin) py = -margin;
      x[i] = px; y[i] = py;

      // Onda que recorre la red: interferencia de dos senoidales.
      var p1 = k1 * (px * ca + py * sa - wt);
      var p2 = k2 * (px * ca2 + py * sa2 + wt * 0.6);
      var s1 = Math.sin(p1);
      var v = 0.5 + 0.28 * s1 + 0.22 * Math.sin(p2);
      wv[i] = v * v;
      rx[i] = px;
      ry[i] = py + s1 * 3;
    }
  };

  /* ---------- Render ---------- */

  P._draw = function () {
    var ctx = this.ctx, w = this.w, h = this.h, n = this.n;
    ctx.clearRect(0, 0, w, h);

    this._drawWaves();

    // 1) Conexiones: se acumulan en buckets de opacidad y se trazan en 8 draw calls.
    var o = this.o;
    var L = o.linkDistance * (w < 640 ? 0.85 : 1), L2 = L * L;
    var rx = this.rx, ry = this.ry, wv = this.wv, prox = this.prox;
    var segs = this.segs, segN = this.segN, cap = this.segCap;
    segN.fill(0);

    for (var i = 0; i < n; i++) {
      var xi = rx[i], yi = ry[i];
      for (var j = i + 1; j < n; j++) {
        var dx = xi - rx[j];
        if (dx > L || dx < -L) continue;
        var dy = yi - ry[j];
        var d2 = dx * dx + dy * dy;
        if (d2 >= L2) continue;
        var s = 1 - Math.sqrt(d2) / L;
        var avg = (wv[i] + wv[j]) * 0.5;
        var a = s * (0.16 + 0.62 * avg + 0.9 * (prox[i] + prox[j]) * 0.5);
        if (a < 0.03) continue;
        var b = (a * BUCKETS) | 0;
        if (b >= BUCKETS) b = BUCKETS - 1;
        var k = segN[b];
        if (k + 4 > cap) continue;
        var arr = segs[b];
        arr[k] = xi; arr[k + 1] = yi; arr[k + 2] = rx[j]; arr[k + 3] = ry[j];
        segN[b] = k + 4;
      }
    }

    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (var bb = 0; bb < BUCKETS; bb++) {
      var cnt = segN[bb];
      if (!cnt) continue;
      var sarr = segs[bb];
      ctx.strokeStyle = this.linkStyle[bb];
      ctx.beginPath();
      for (var q = 0; q < cnt; q += 4) {
        ctx.moveTo(sarr[q], sarr[q + 1]);
        ctx.lineTo(sarr[q + 2], sarr[q + 3]);
      }
      ctx.stroke();
    }

    // 2) Sinapsis: líneas desde el cursor a los nodos cercanos.
    var p = this.ptr;
    if (p.act > 0.02) {
      ctx.lineWidth = 1.2;
      var core = o.core;
      for (var c = 0; c < n; c++) {
        var pr = prox[c];
        if (pr < 0.04) continue;
        ctx.strokeStyle = rgba(core, (pr * 0.95).toFixed(3));
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(rx[c], ry[c]);
        ctx.stroke();
      }
    }

    // 3) Nodos: un drawImage por nodo con un sprite pre-renderizado (evita shadowBlur).
    var sprite = this.nodeSprite, rr = this.r;
    for (var m = 0; m < n; m++) {
      var wm = wv[m], pm = prox[m];
      var alpha = 0.42 + 0.58 * wm + 0.5 * pm;
      ctx.globalAlpha = alpha > 1 ? 1 : alpha;
      var size = rr[m] * (1 + 0.7 * wm + 0.9 * pm) * 6;
      ctx.drawImage(sprite, rx[m] - size, ry[m] - size, size * 2, size * 2);
    }

    // 4) Resplandor del cursor.
    if (p.act > 0.02) {
      var gr = o.cursorRadius * 1.25;
      ctx.globalAlpha = p.act;
      ctx.drawImage(this.glowSprite, p.x - gr, p.y - gr, gr * 2, gr * 2);
    }
    ctx.globalAlpha = 1;
  };

  P._drawWaves = function () {
    var ctx = this.ctx, w = this.w, h = this.h, t = this.t, p = this.ptr;
    var step = w < 640 ? 14 : 9;
    var ripple = p.act > 0.02;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = this.waveGrad;
    for (var l = 0; l < WAVES.length; l++) {
      var W = WAVES[l], base = h * W.y;
      ctx.globalAlpha = W.a;
      ctx.beginPath();
      for (var x = 0; x <= w + step; x += step) {
        var y = base + Math.sin(x * W.k1 + t * W.s1) * W.a1 + Math.sin(x * W.k2 - t * W.s2) * W.a2;
        if (ripple) {
          var dx = (x - p.x) / 150, dy = (base - p.y) / 260;
          y -= p.act * 30 * Math.exp(-(dx * dx + dy * dy));
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- Auto-inicialización ---------- */

  root.NeuralField = NeuralField;

  function auto() {
    var list = document.querySelectorAll('canvas[data-neural-field]');
    for (var i = 0; i < list.length; i++) {
      if (list[i].neuralField) continue;
      // data-neural-field puede llevar opciones en JSON: data-neural-field='{"linkDistance":160}'
      var opts = {};
      var raw = list[i].getAttribute('data-neural-field');
      if (raw) { try { opts = JSON.parse(raw); } catch (e) { opts = {}; } }
      list[i].neuralField = new NeuralField(list[i], opts);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})(window);
