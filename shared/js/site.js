/* ==========================================================================
   site.js — the small amount of behaviour every template shares.
   No dependencies. Safe to load with `defer`.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Header goes solid once you scroll past the hero lip --------------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* --- Mobile drawer ------------------------------------------------------ */
  var toggle = document.querySelector('[data-nav-toggle]');
  var drawer = document.querySelector('[data-nav-drawer]');
  if (toggle && drawer) {
    var setOpen = function (open) {
      drawer.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    setOpen(false);
    toggle.addEventListener('click', function () {
      setOpen(drawer.hidden);
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.hidden) { setOpen(false); toggle.focus(); }
    });
  }

  /* --- Scroll reveal ------------------------------------------------------ */
  var revealables = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el, i) {
      // Stagger siblings inside the same grid so rows cascade in.
      var group = el.parentElement;
      var idx = group ? Array.prototype.indexOf.call(group.children, el) : i;
      el.style.setProperty('--reveal-delay', Math.min(idx, 5) * 70 + 'ms');
      io.observe(el);
    });
  }

  /* --- Sticky mobile call bar: appears once the hero CTA is off screen ---- */
  var callbar = document.querySelector('[data-callbar]');
  var heroCta = document.querySelector('[data-hero-cta]');
  if (callbar) {
    document.body.classList.add('has-callbar');
    if (heroCta && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        callbar.classList.toggle('is-shown', !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(heroCta);
    } else {
      callbar.classList.add('is-shown');
    }
  }

  /* --- Quote form --------------------------------------------------------
     Static hosting has no backend, so the form posts nowhere by default.
     Point `action` at Formspree / Netlify / the client's CRM and delete the
     preventDefault branch — everything else keeps working.               */
  var form = document.querySelector('[data-quote-form]');
  if (form) {
    form.addEventListener('submit', function (e) {
      if (form.getAttribute('action')) return; // real endpoint wired up
      e.preventDefault();
      if (!form.reportValidity()) return;
      var status = form.querySelector('[data-form-status]');
      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      window.setTimeout(function () {
        if (status) {
          status.hidden = false;
          status.textContent = 'Thanks — your request is in. We’ll call you back shortly.';
        }
        form.reset();
        if (btn) { btn.disabled = false; btn.textContent = 'Request my free quote'; }
      }, 650);
    });
  }

  /* --- Footer year -------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
