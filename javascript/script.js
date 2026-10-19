/* ==========================================================================
   EVERGROW — HOMEPAGE SCRIPTS
   ========================================================================== */

/* ---------- Hero slideshow: cross-fade with a slow zoom (styles.css) ---------- */
(function () {
  const slides = document.querySelectorAll('.hero__slide');
  if (slides.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SLIDE_DURATION = 5000; // ms each photo stays before the next fades in
  const FADE_DURATION = 1600; // keep in sync with the .hero__slide opacity transition
  let current = 0;

  setInterval(() => {
    // Skip the change while the tab is hidden, so photos don't pile up
    if (document.hidden) return;

    const outgoing = slides[current];
    current = (current + 1) % slides.length;
    const incoming = slides[current];

    outgoing.classList.remove('is-active');
    outgoing.classList.add('is-leaving');
    incoming.classList.add('is-active');

    setTimeout(() => outgoing.classList.remove('is-leaving'), FADE_DURATION);
  }, SLIDE_DURATION);
})();


/* Lets CSS hold back entrance animations only when JavaScript can play them */
document.documentElement.classList.add('js');

/* ---------- Looping carousel (Our Work, Testimonials) ----------
   The track holds the cards in a row. A step slides it one card to the
   left, then moves the first card to the end so the loop never runs out.
   Paused on hover, keyboard focus, while off screen or the tab is hidden,
   and never auto-plays for reduced motion. Arrows and swipe work always.
   Options:
     interval   ms between slides
     align      () => resting offset in px for the front card
     peekLeft   start one card back, so a card shows cut off at the left
     prev/next  arrow buttons (optional)
     onChange   (frontCard) => void, after every move and on start
     onPlay     (playing) => void, whenever autoplay starts or pauses */
function loopCarousel({ root, track, interval, align = () => 0, peekLeft = false, prev, next, onChange, onPlay }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let base = 0;
  let busy = false;
  let hovered = false;
  let focused = false;
  let onScreen = false;
  let timer = null;

  function stepSize() {
    return track.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
  }

  function place(x, animate) {
    track.classList.toggle('is-animating', animate && !reduceMotion);
    track.style.transform = `translateX(${x}px)`;
  }

  function front() {
    return track.children[peekLeft ? 1 : 0];
  }

  function measure() {
    base = align() - (peekLeft ? stepSize() : 0);
    place(base, false);
  }

  function afterSlide(callback) {
    if (reduceMotion) { callback(); return; }
    track.addEventListener('transitionend', function done(event) {
      if (event.target !== track) return;
      track.removeEventListener('transitionend', done);
      callback();
    });
  }

  function goNext() {
    if (busy) return;
    busy = true;
    onChange?.(track.children[peekLeft ? 2 : 1]);
    place(base - stepSize(), true);
    afterSlide(() => {
      track.appendChild(track.firstElementChild);
      place(base, false);
      busy = false;
    });
  }

  function goPrev() {
    if (busy) return;
    busy = true;
    track.insertBefore(track.lastElementChild, track.firstElementChild);
    place(base - stepSize(), false);
    void track.offsetWidth; // apply the jump before animating back
    onChange?.(front());
    place(base, true);
    afterSlide(() => { busy = false; });
  }

  function update() {
    clearInterval(timer);
    const playing = !reduceMotion && !hovered && !focused && onScreen && !document.hidden;
    timer = playing ? setInterval(goNext, interval) : null;
    onPlay?.(playing);
  }

  root.addEventListener('mouseenter', () => { hovered = true; update(); });
  root.addEventListener('mouseleave', () => { hovered = false; update(); });
  root.addEventListener('focusin', () => { focused = true; update(); });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) { focused = false; update(); }
  });
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); }, { threshold: 0.25 }).observe(root);

  // A manual move restarts the count
  next?.addEventListener('click', () => { goNext(); update(); });
  prev?.addEventListener('click', () => { goPrev(); update(); });

  let startX = null;
  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') startX = event.clientX;
  });
  root.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext(); else goPrev();
    update();
  });

  if (peekLeft) track.insertBefore(track.lastElementChild, track.firstElementChild);
  measure();
  onChange?.(front());
  window.addEventListener('resize', measure);
}

/* ---------- Our Work: edge to edge, a card cut off at each side ---------- */
(function () {
  const root = document.getElementById('work-carousel');
  if (!root) return;
  const container = root.closest('.container');

  loopCarousel({
    root,
    track: root.querySelector('.work__track'),
    interval: 3000,
    peekLeft: true,
    // Front card lines up with the container's left edge
    align: () => container.getBoundingClientRect().left + parseFloat(getComputedStyle(container).paddingLeft),
    prev: document.querySelector('[data-work="prev"]'),
    next: document.querySelector('[data-work="next"]'),
  });
})();

/* ---------- Testimonials: entrance, then cards sliding right to left ---------- */
(function () {
  const section = document.getElementById('testimonials');
  if (!section) return;

  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    section.classList.add('is-inview');
    observer.disconnect();
  }, { threshold: 0.3 }).observe(section);

  const root = document.getElementById('testimonials-carousel');
  const bar = section.querySelector('.testimonials__progress-bar');
  const current = section.querySelector('[data-t-current]');
  const INTERVAL = 4000;
  bar.style.setProperty('--t-interval', `${INTERVAL}ms`);

  loopCarousel({
    root: section.querySelector('.testimonials__reviews'),
    track: root.querySelector('.testimonials__track'),
    interval: INTERVAL,
    onChange(card) {
      root.querySelectorAll('.t-card').forEach((c) => c.classList.toggle('is-active', c === card));
      current.textContent = String(Number(card.dataset.index) + 1).padStart(2, '0');
    },
    // The bar refills from empty each time the 4s count (re)starts, and holds while paused
    onPlay(playing) {
      bar.classList.remove('is-running', 'is-paused');
      if (playing) {
        void bar.offsetWidth;
        bar.classList.add('is-running');
      }
    },
  });

  // Each slide restarts the bar too
  root.querySelector('.testimonials__track').addEventListener('transitionend', (event) => {
    if (event.target !== event.currentTarget || !bar.classList.contains('is-running')) return;
    bar.classList.remove('is-running');
    void bar.offsetWidth;
    bar.classList.add('is-running');
  });
})();

/* ---------- Office hours: highlight today and show "Open now" / "Closed" ----------
   Each row has data-days (0 = Sunday, "1-5" = Mon to Fri) and, if open,
   data-open / data-close in 24h hours. Uses the visitor's clock. */
(function () {
  const list = document.getElementById('hours-list');
  const status = document.getElementById('hours-status');
  if (!list || !status) return;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  const today = [...list.children].find((row) => {
    const [from, to = from] = row.dataset.days.split('-').map(Number);
    return day >= from && day <= to;
  });
  if (!today) return;

  today.classList.add('is-today');
  const open = today.dataset.open && hour >= Number(today.dataset.open) && hour < Number(today.dataset.close);
  status.textContent = open ? 'Open now' : 'Closed now';
  status.classList.toggle('is-open', open);
  status.hidden = false;
})();

/* ---------- Quote form: four steps ----------
   1 service (picking one moves on), 2 multiple choice for that service,
   3 optional photos, 4 typed details. Each step is checked before moving
   on. The groups for the services not chosen stay disabled, so they're
   neither required nor sent. Sent to Netlify Forms with fetch. */
(function () {
  const form = document.getElementById('quote-form');
  if (!form) return;

  const card = form.closest('.quote');
  const steps = [...form.querySelectorAll('.quote-step')];
  const markers = [...form.querySelectorAll('.quote__steps li')];
  const fill = form.querySelector('.quote__bar-fill');
  const back = form.querySelector('[data-quote="back"]');
  const next = form.querySelector('[data-quote="next"]');
  const submit = form.querySelector('.quote__submit');
  const live = document.getElementById('quote-live');
  const error = document.getElementById('quote-error');
  const MAX_PHOTOS = 6;
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  const PER_PAGE = 2; // questions shown at a time in step 2
  let current = 0;
  let photos = [];
  let pages = [[]]; // step 2's questions in pairs, for the chosen service
  let page = 0;

  /* ---------- Step 2 shows its questions two at a time ---------- */
  function buildPages() {
    const questions = [...steps[1].querySelectorAll('.quote-q')].filter((q) => !q.closest('fieldset[disabled]'));
    pages = [];
    for (let i = 0; i < questions.length; i += PER_PAGE) pages.push(questions.slice(i, i + PER_PAGE));
    page = 0;
  }

  function showPage(goingBack) {
    const visible = pages[page] || [];
    steps[1].querySelectorAll('.quote-q').forEach((q) => { q.hidden = !visible.includes(q); });
    const total = pages.flat().length;
    const first = page * PER_PAGE + 1;
    const last = first + visible.length - 1;
    document.getElementById('quote-count').textContent =
      first === last ? `Question ${first} of ${total}` : `Questions ${first}\u2013${last} of ${total}`;
    // Replay the slide-in for each new pair
    const step = steps[1];
    step.classList.toggle('is-back', Boolean(goingBack));
    step.style.animation = 'none';
    void step.offsetWidth;
    step.style.animation = '';
    updateProgress();
  }

  // Progress counts each pair of questions as its own stop
  function updateProgress() {
    const stops = steps.length - 1 + pages.length;
    const at = current === 0 ? 1 : current === 1 ? 2 + page : current + pages.length;
    fill.style.setProperty('--progress', at / stops);
  }

  /* ---------- Moving between steps ---------- */
  function show(index, { focus = true } = {}) {
    const goingBack = index < current;
    current = index;
    steps.forEach((step, i) => {
      step.hidden = i !== index;
      step.classList.toggle('is-back', i === index && goingBack);
    });
    markers.forEach((marker, i) => {
      marker.classList.toggle('is-current', i === index);
      marker.classList.toggle('is-done', i < index);
    });
    updateProgress();
    back.hidden = index === 0;
    next.hidden = index === steps.length - 1;
    submit.hidden = index !== steps.length - 1;
    error.textContent = '';
    if (index === steps.length - 1) renderSummary();
    if (index === 1) showPage(goingBack);

    const title = steps[index].querySelector('.quote-step__title');
    live.textContent = `Step ${index + 1} of ${steps.length}: ${title.textContent}`;
    if (focus) {
      title.focus({ preventScroll: true });
      // Keep the top of the form in view on phones
      const top = card.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 100, behavior: 'smooth' });
    }
  }

  /* ---------- Checking a step ---------- */
  function validate(step) {
    let firstBad = null;

    // Radio groups: highlight the whole question if nothing is picked
    step.querySelectorAll('.quote-q').forEach((question) => {
      if (question.hidden || question.closest('fieldset[disabled]')) return;
      const required = question.querySelector('input[type="radio"][required]');
      const missing = required && !question.querySelector('input:checked');
      question.classList.toggle('is-missing', Boolean(missing));
      if (missing && !firstBad) firstBad = required;
    });

    // Typed fields
    step.querySelectorAll('.field__input').forEach((input) => {
      const bad = !input.checkValidity();
      input.classList.toggle('is-invalid', bad);
      input.setAttribute('aria-invalid', String(bad));
      if (bad && !firstBad) firstBad = input;
    });

    if (firstBad) {
      error.textContent = firstBad.matches('.field__input')
        ? 'Please fill in the highlighted fields.'
        : 'Please answer the highlighted questions.';
      firstBad.focus({ preventScroll: true });
      firstBad.closest('.quote-q, .field')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return false;
    }
    return true;
  }

  // Answering a highlighted question clears its warning
  form.addEventListener('change', (event) => {
    event.target.closest('.quote-q')?.classList.remove('is-missing');
  });
  form.addEventListener('input', (event) => {
    if (event.target.matches('.field__input.is-invalid') && event.target.checkValidity()) {
      event.target.classList.remove('is-invalid');
      event.target.setAttribute('aria-invalid', 'false');
    }
  });

  /* ---------- Step 1: the service picks which questions show ---------- */
  form.querySelectorAll('input[name="service"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      form.querySelectorAll('.quote-group').forEach((group) => {
        const on = group.dataset.for === radio.dataset.service;
        group.disabled = !on;
        group.hidden = !on;
      });
      buildPages();
      // A short beat so the tick shows before moving on
      setTimeout(() => show(1), 350);
    });
  });

  next.addEventListener('click', () => {
    if (!validate(steps[current])) return;
    if (current === 1 && page < pages.length - 1) {
      page += 1;
      showPage(false);
      steps[1].querySelector('.quote-step__title').focus({ preventScroll: true });
      return;
    }
    if (current === 0) page = 0; // re-entering step 2 starts at its first pair
    show(current + 1);
  });

  back.addEventListener('click', () => {
    if (current === 1 && page > 0) {
      page -= 1;
      showPage(true);
      return;
    }
    // Coming back from photos lands on the last pair of questions
    if (current === 2) page = pages.length - 1;
    show(current - 1);
  });

  // Enter in a text field moves on instead of submitting early
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input.field__input') && current < steps.length - 1) {
      event.preventDefault();
      next.click();
    }
  });

  /* ---------- Step 3: photos ---------- */
  const picker = document.getElementById('photo-picker');
  const dropzone = document.getElementById('dropzone');
  const previews = document.getElementById('photo-previews');
  const photoError = document.getElementById('photo-error');
  const slots = [...form.querySelectorAll('[data-photo-slot]')];

  // Shrink each photo in the browser before attaching it: Netlify takes about
  // 8 MB per request, and phone photos are often 3-10 MB each. Photos the
  // browser can't read (e.g. HEIC outside Safari) are kept as they are.
  const MAX_EDGE = 1600; // px, longest side
  const MAX_TOTAL = 7.5 * 1024 * 1024;

  async function shrink(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      return file;
    }
  }

  async function addPhotos(files) {
    photoError.textContent = '';
    const skipped = [];
    for (const file of files) {
      if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) { skipped.push(`${file.name} isn't a photo`); continue; }
      if (file.size > MAX_SIZE) { skipped.push(`${file.name} is over 10 MB`); continue; }
      if (photos.length >= MAX_PHOTOS) { skipped.push(`only ${MAX_PHOTOS} photos fit`); continue; }
      const small = await shrink(file);
      const total = photos.reduce((sum, f) => sum + f.size, 0) + small.size;
      if (total > MAX_TOTAL) { skipped.push('the photos together are too large to send'); continue; }
      photos.push(small);
      renderPhotos();
    }
    if (skipped.length) photoError.textContent = `Some photos weren't added: ${[...new Set(skipped)].join(', ')}.`;
  }

  function renderPhotos() {
    previews.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
    previews.innerHTML = '';
    photos.forEach((file, i) => {
      const item = document.createElement('li');
      item.className = 'dropzone__preview';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = `Yard photo ${i + 1}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'dropzone__remove';
      remove.setAttribute('aria-label', `Remove photo ${i + 1}`);
      remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>';
      remove.addEventListener('click', () => {
        photos.splice(i, 1);
        photoError.textContent = '';
        renderPhotos();
        picker.focus();
      });
      item.append(img, remove);
      previews.append(item);
    });

    // Netlify reads one file per input, so each photo gets its own field
    slots.forEach((slot, i) => {
      const transfer = new DataTransfer();
      if (photos[i]) transfer.items.add(photos[i]);
      slot.files = transfer.files;
    });
  }

  picker.addEventListener('change', async () => {
    const files = [...picker.files];
    picker.value = '';
    await addPhotos(files);
  });

  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    if (type === 'dragleave' && dropzone.contains(event.relatedTarget)) return;
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (event) => addPhotos([...event.dataTransfer.files]));

  /* ---------- Step 4: chips summing up the answers so far ---------- */
  function renderSummary() {
    const summary = document.getElementById('quote-summary');
    const picks = [...form.querySelectorAll('input:checked:not(:disabled)')]
      .filter((input) => input.type === 'radio' || input.type === 'checkbox')
      .filter((input) => !input.closest('fieldset[disabled]'))
      .map((input) => input.closest('label').querySelector('.choice__label, .service-choice__name').textContent);
    if (photos.length) picks.push(`${photos.length} photo${photos.length > 1 ? 's' : ''}`);
    summary.innerHTML = '';
    picks.forEach((text) => {
      const chip = document.createElement('li');
      chip.textContent = text;
      summary.append(chip);
    });
  }

  /* ---------- Sending ---------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validate(steps[current])) return;

    submit.setAttribute('aria-busy', 'true');
    const label = submit.querySelector('.quote__submit-label');
    label.textContent = 'Sending\u2026';
    error.textContent = '';
    try {
      const response = await fetch(form.getAttribute('action'), { method: 'POST', body: new FormData(form) });
      if (!response.ok) throw new Error(response.status);
      const name = form.elements.name.value.trim().split(' ')[0];
      document.getElementById('quote-done-name').textContent = name ? `, ${name}` : '';

      // Fade the form out, then bring the thank-you in at the same height
      card.style.minHeight = `${card.offsetHeight}px`;
      card.classList.add('is-leaving');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      await new Promise((resolve) => setTimeout(resolve, reduce ? 0 : 400));
      steps.forEach((step) => { step.hidden = true; });
      card.classList.remove('is-leaving');
      card.classList.add('is-done');
      const done = document.getElementById('quote-done');
      done.hidden = false;
      done.focus({ preventScroll: true });

      // Then let the card glide down to fit the message (on desktop the grid
      // keeps it level with the info panel, so it barely moves)
      const from = card.offsetHeight;
      card.style.minHeight = '';
      const to = card.offsetHeight;
      if (!reduce && to < from) {
        card.style.height = `${from}px`;
        void card.offsetHeight;
        card.style.transition = 'height 0.6s cubic-bezier(0.65, 0, 0.35, 1)';
        card.style.height = `${to}px`;
        card.addEventListener('transitionend', function settle(event) {
          if (event.target !== card) return;
          card.removeEventListener('transitionend', settle);
          card.style.height = '';
          card.style.transition = '';
        });
      }
      if (card.getBoundingClientRect().top < 0) card.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    } catch {
      error.innerHTML = 'Sorry, your request didn&rsquo;t go through. Please try again, or call us at <a href="tel:+15550142290">(555) 014-2290</a>.';
    } finally {
      submit.removeAttribute('aria-busy');
      submit.querySelector('.quote__submit-label').textContent = 'Send My Quote Request';
    }
  });

  show(0, { focus: false });
})();
