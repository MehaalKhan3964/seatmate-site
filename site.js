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
  var items = document.querySelectorAll('.reveal');
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
    var HOVER = 'a, button, summary, input, textarea, select, label, [role="button"], .shot, .cell';
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!started) { started = true; rx = mx; ry = my; root.classList.add('cursor-on'); }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      root.classList.toggle('cursor-hover', !!(e.target && e.target.closest && e.target.closest(HOVER)));
    }, { passive: true });
    document.addEventListener('mouseleave', function () { root.classList.remove('cursor-on'); });
    document.addEventListener('mouseenter', function () { if (started) root.classList.add('cursor-on'); });
    (function loop() {
      rx += (mx - rx) * (reduce ? 1 : 0.18);
      ry += (my - ry) * (reduce ? 1 : 0.18);
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
})();
