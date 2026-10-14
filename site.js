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
})();
