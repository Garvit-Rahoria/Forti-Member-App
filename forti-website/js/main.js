/* ============================================================
   FORTI – main.js  |  Navbar, Animations, Interactions
   ============================================================ */

// ── Sticky Navbar ────────────────────────────────────────────
(function () {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
})();

// ── Mobile Navigation ────────────────────────────────────────
(function () {
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const closeBtn  = document.querySelector('.mobile-nav-close');
  if (!hamburger || !mobileNav) return;

  function openMenu()  { mobileNav.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeMenu() { mobileNav.classList.remove('open'); document.body.style.overflow = ''; }

  hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close when clicking backdrop
  mobileNav.addEventListener('click', e => {
    if (e.target === mobileNav) closeMenu();
  });

  // Mobile sub-menu toggles
  const subToggles = document.querySelectorAll('.mobile-sub-toggle');
  subToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const sub = btn.nextElementSibling;
      if (!sub) return;
      const isOpen = sub.style.display === 'block';
      sub.style.display = isOpen ? 'none' : 'block';
      const icon = btn.querySelector('.mobile-toggle-icon');
      if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    });
  });
})();

// ── Active Nav Highlight ─────────────────────────────────────
(function () {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === current || (current === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
})();

// ── Scroll Reveal Animations ─────────────────────────────────
(function () {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => obs.observe(el));
})();

// ── Counter Animation ────────────────────────────────────────
(function () {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  if (!counters.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const raw   = el.dataset.count;       // e.g. "15000", "200000", "500"
      const suffix = el.dataset.suffix || '';
      const display = el.dataset.display || '';  // e.g. "15K", "2L"
      if (display) { el.textContent = display; obs.unobserve(el); return; }

      const target = parseInt(raw, 10);
      const duration = 1800;
      const step = Math.ceil(target / (duration / 16));
      let current = 0;

      function tick() {
        current = Math.min(current + step, target);
        el.textContent = current.toLocaleString('en-IN') + suffix;
        if (current < target) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(c => obs.observe(c));
})();

// ── Accordion ────────────────────────────────────────────────
(function () {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const isOpen = body.classList.contains('open');

      // close all in same group
      const parent = header.closest('.accordion-group');
      if (parent) {
        parent.querySelectorAll('.accordion-body').forEach(b => b.classList.remove('open'));
        parent.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
      }

      if (!isOpen) {
        body.classList.add('open');
        header.classList.add('active');
      }
    });
  });
})();

// ── Gallery Lightbox ─────────────────────────────────────────
(function () {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lightboxImg   = lightbox.querySelector('img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');

  document.querySelectorAll('.gallery-item[data-src]').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.src;
      if (lightboxImg) lightboxImg.src = src;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
})();

// ── Gallery Filter ───────────────────────────────────────────
(function () {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item[data-category]');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      galleryItems.forEach(item => {
        if (filter === 'all' || item.dataset.category === filter) {
          item.style.display = '';
          setTimeout(() => { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 10);
        } else {
          item.style.opacity = '0'; item.style.transform = 'scale(0.9)';
          setTimeout(() => { item.style.display = 'none'; }, 300);
        }
      });
    });
  });
})();

// ── Subscribe Form ───────────────────────────────────────────
(function () {
  document.querySelectorAll('.footer-subscribe-form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) return;
      const btn = form.querySelector('.btn-subscribe');
      if (btn) { btn.textContent = '✓ Subscribed!'; btn.style.background = '#059669'; }
      input.value = '';
      setTimeout(() => { if (btn) { btn.textContent = 'Subscribe'; btn.style.background = ''; } }, 3000);
    });
  });
})();

// ── Contact Form ─────────────────────────────────────────────
(function () {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const original = btn.textContent;
    btn.textContent = '✓ Message Sent!';
    btn.style.background = '#059669';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original; btn.style.background = ''; btn.disabled = false;
      form.reset();
    }, 3500);
  });
})();

// ── Smooth scroll for in-page anchor links ───────────────────
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
