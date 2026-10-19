/* ==========================================================================
   EVERGROW — GLOBAL SCRIPTS
   Header: turns white once the page scrolls; mobile menu open/close.
   ========================================================================== */

(function () {
  const header = document.getElementById('header');
  if (!header) return;

  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav');
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- See-through over the hero, white once scrolled ---------- */
  function updateScrolled() {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }

  window.addEventListener('scroll', updateScrolled, { passive: true });
  updateScrolled();

  /* ---------- Mobile menu ---------- */
  function setMenu(open) {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));

  // Following a link closes the menu
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setMenu(false);
  });

  desktop.addEventListener('change', () => setMenu(false));
})();

/* ---------- Back to top: shows after the hero, ring tracks scroll depth ---------- */
(function () {
  const button = document.getElementById('to-top');
  if (!button) return;
  const hero = document.querySelector('.hero');
  const footerBar = document.querySelector('.footer__bottom');
  let nearFooter = false; // the footer has its own "Back to top" link
  let ticking = false;

  if (footerBar) {
    new IntersectionObserver(([entry]) => {
      nearFooter = entry.isIntersecting;
      update();
    }).observe(footerBar);
  }

  function update() {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    button.style.setProperty('--scroll', max > 0 ? Math.min(window.scrollY / max, 1).toFixed(3) : 0);
    button.classList.toggle('is-visible', !nearFooter && window.scrollY > (hero ? hero.offsetHeight * 0.6 : 400));
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0 }); // smooth via CSS scroll-behavior, instant for reduced motion
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
})();

/* ---------- Nav highlights the section you're in ----------
   A section counts as current once its top passes a line about a third of
   the way down the screen. The link gets aria-current="location". */
(function () {
  const links = [...document.querySelectorAll('.nav__link[href^="#"]')];
  const sections = links
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter((item) => item.section);
  if (!sections.length) return;
  let ticking = false;

  function update() {
    ticking = false;
    const line = window.innerHeight * 0.35;
    let current = sections[0];
    sections.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= line) current = item;
    });
    // At the very bottom, the last section wins even if it's short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1];
    links.forEach((link) => {
      if (link === current.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* ---------- Footer copyright year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
