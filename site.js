// Seatmate site: small progressive enhancements. The page is fully usable without this file.
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');

  // sticky nav: add a blurred background after the first scroll, and a mobile menu
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    var toggle = nav.querySelector('.nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.querySelectorAll('.nav-links a').forEach(function (a) {
        a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
      });
    }
  }

  // reveal on scroll
  var items = document.querySelectorAll('.reveal, .fade');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // screenshot galleries: previous / next buttons
  document.querySelectorAll('[data-gallery]').forEach(function (btnWrap) {
    var target = document.getElementById(btnWrap.getAttribute('data-gallery'));
    if (!target) return;
    btnWrap.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        var step = target.querySelector('.shot') ? target.querySelector('.shot').getBoundingClientRect().width + 32 : 320;
        target.scrollBy({ left: (b.getAttribute('data-dir') === 'next' ? 1 : -1) * step * 1.6, behavior: 'smooth' });
      });
    });
  });
  // cursor: an accent dot that follows the pointer and a hairline ring that trails it (mouse users only; the native pointer stays)
  if (window.matchMedia('(pointer: fine) and (hover: hover)').matches) {
    var dot = document.createElement('div'); dot.className = 'cursor-dot'; dot.setAttribute('aria-hidden', 'true');
    var ring = document.createElement('div'); ring.className = 'cursor-ring'; ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    root.classList.add('has-cursor');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var mx = 0, my = 0, rx = 0, ry = 0, started = false;
    var HOVER = 'a, button, summary, input, textarea, .shot, .cell'; // almishqun.com: a, button, [data-tilt], .scene-card, input, textarea, summary
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!started) { started = true; rx = mx; ry = my; root.classList.add('cursor-on'); }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      root.classList.toggle('cursor-hover', !!(e.target && e.target.closest && e.target.closest(HOVER)));
    }, { passive: true });
    document.addEventListener('mouseleave', function () { root.classList.remove('cursor-on'); });
    document.addEventListener('mouseenter', function () { if (started) root.classList.add('cursor-on'); });
    (function loop() {
      rx += (mx - rx) * (reduce ? 1 : 0.14);
      ry += (my - ry) * (reduce ? 1 : 0.14);
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // devices tilt toward the pointer, with a soft glare that follows it (almishqun.com: rotationX = -6 * y, rotationY = 7 * x)
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.phone:not(.static), [data-tilt]:not([data-scene])').forEach(function (phone) {
      var screen = phone.querySelector('.screen') || phone;
      var glare = document.createElement('div');
      glare.className = 'scene-glare';
      glare.setAttribute('aria-hidden', 'true');
      screen.appendChild(glare);
      phone.addEventListener('pointermove', function (e) {
        var r = phone.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        phone.style.setProperty('--rx', (py * -7).toFixed(2) + 'deg');
        phone.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg');
        glare.style.transform = 'translate(' + (px * r.width * 0.8).toFixed(1) + 'px,' + (py * r.height * 0.8).toFixed(1) + 'px)';
        glare.style.opacity = '1';
      });
      phone.addEventListener('pointerleave', function () {
        phone.style.setProperty('--rx', '0deg');
        phone.style.setProperty('--ry', '0deg');
        glare.style.opacity = '0';
      });
    });
  }

  // pinned horizontal slideshow (almishqun.com "showcase"): from 48rem up the section pins and the scroll position slides the phones sideways;
  // each panel rotates in from a slight 3D angle as it arrives. Below 48rem, or with reduced motion, the gallery stays a native swipe row.
  var pins = [];
  function buildPin(gallery) {
    var outer = document.createElement('div'); outer.className = 'pin-outer';
    var stage = document.createElement('div'); stage.className = 'pin-stage';
    var bar = document.createElement('div'); bar.className = 'pin-progress'; bar.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('span'); bar.appendChild(fill);
    var shots = Array.prototype.slice.call(gallery.querySelectorAll('.shot'));
    var head = gallery.previousElementSibling;
    var state = { on: false, distance: 0 };
    function gnav() { return head && head.querySelector ? head.querySelector('.gnav') : null; }
    state.enable = function () {
      if (state.on) return;
      gallery.parentNode.insertBefore(outer, gallery);
      outer.appendChild(stage); stage.appendChild(gallery); stage.appendChild(bar);
      gallery.classList.add('is-pinned');
      shots.forEach(function (s) { s.classList.add('in'); });
      var g = gnav(); if (g) g.style.display = 'none';
      state.on = true; state.measure();
    };
    state.disable = function () {
      if (!state.on) return;
      outer.parentNode.insertBefore(gallery, outer);
      outer.remove();
      gallery.classList.remove('is-pinned'); gallery.style.transform = '';
      shots.forEach(function (s) { s.style.transform = ''; s.style.opacity = ''; });
      var g = gnav(); if (g) g.style.display = '';
      state.on = false;
    };
    state.measure = function () {
      gallery.style.transform = 'none';
      state.distance = Math.max(0, gallery.scrollWidth - window.innerWidth);
      outer.style.height = (window.innerHeight + state.distance) + 'px';
      state.update();
    };
    state.update = function () {
      if (!state.on) return;
      var top = outer.getBoundingClientRect().top;
      var progress = state.distance > 0 ? clamp(-top / state.distance, 0, 1) : 0;
      gallery.style.transform = 'translate3d(' + (-progress * state.distance).toFixed(1) + 'px,0,0)';
      fill.style.transform = 'scaleX(' + progress.toFixed(4) + ')';
      var vw = window.innerWidth;
      shots.forEach(function (s) {
        var t = clamp((vw - s.getBoundingClientRect().left) / (vw * 0.45), 0, 1);
        s.style.transform = 'perspective(75rem) rotateY(' + (14 * (1 - t)).toFixed(2) + 'deg) scale(' + (0.94 + 0.06 * t).toFixed(3) + ')';
        s.style.opacity = (0.45 + 0.55 * t).toFixed(3);
      });
    };
    return state;
  }
  var pinMq = window.matchMedia('(min-width: 48rem)');
  function syncPins() {
    var want = pinMq.matches && !reduceMotion;
    pins.forEach(function (p) { if (want) { if (p.on) { p.measure(); } else { p.enable(); } } else { p.disable(); } });
  }
  if (!reduceMotion) {
    document.querySelectorAll('.story .gallery').forEach(function (g) { pins.push(buildPin(g)); });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; pins.forEach(function (p) { p.update(); }); });
    }, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(syncPins, 120); });
    window.addEventListener('load', syncPins);
    syncPins();
  }
  // scroll progress hairline at the very top
  var progress = document.querySelector('.scroll-progress span');
  if (progress) {
    var onProgress = function () {
      var max = document.body.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0).toFixed(4) + ')';
    };
    onProgress();
    window.addEventListener('scroll', onProgress, { passive: true });
    window.addEventListener('resize', onProgress);
  }

  // primary buttons lean toward the pointer, then settle back (almishqun.com: clamp +-6px x, +-5px y)
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.hero .cta-row .btn, .dl-card .btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = clamp((e.clientX - (r.left + r.width / 2)) * 0.22, -6, 6);
        var y = clamp((e.clientY - (r.top + r.height / 2)) * 0.3, -5, 5);
        btn.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      });
      btn.addEventListener('pointerleave', function () { btn.style.translate = '0px 0px'; });
    });
  }

  // scene cards: the cursor splits the layers (the phone counter-moves harder than the backdrop) while the whole card tilts and a glare follows
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.scene-card[data-scene]').forEach(function (card) {
      var glare = document.createElement('div');
      glare.className = 'scene-glare';
      glare.setAttribute('aria-hidden', 'true');
      card.appendChild(glare);
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--rx', (py * -7).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
        card.style.setProperty('--bgx', (px * -10).toFixed(1) + 'px');
        card.style.setProperty('--bgy', (py * -8).toFixed(1) + 'px');
        card.style.setProperty('--fgx', (px * 26).toFixed(1) + 'px');
        card.style.setProperty('--fgy', (py * 20).toFixed(1) + 'px');
        glare.style.transform = 'translate(' + (px * r.width * 0.9).toFixed(1) + 'px,' + (py * r.height * 0.9).toFixed(1) + 'px)';
        glare.style.opacity = '1';
      });
      card.addEventListener('pointerleave', function () {
        ['--rx', '--ry'].forEach(function (k) { card.style.setProperty(k, '0deg'); });
        ['--bgx', '--bgy', '--fgx', '--fgy'].forEach(function (k) { card.style.setProperty(k, '0px'); });
        glare.style.opacity = '0';
      });
    });
  }

  // depth interlude: the photo plane and the foreground card scrub at different speeds as the section crosses the viewport
  var stage = document.querySelector('.depth-stage');
  if (stage && !reduceMotion) {
    var dbg = stage.querySelector('.depth-plane-bg');
    var dfg = stage.querySelector('.depth-plane-fg');
    var depth = function () {
      var r = stage.getBoundingClientRect();
      var p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height), 0, 1);
      if (dbg) dbg.style.transform = 'translate3d(0,' + (-5 + 10 * p).toFixed(2) + '%,0)';
      if (dfg) dfg.style.transform = 'translate3d(0,' + (16 - 32 * p).toFixed(2) + '%,0)';
    };
    depth();
    window.addEventListener('scroll', depth, { passive: true });
  }
})();
