const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function emitConversion(name, detail = {}) {
  const payload = { event: 'jademind_conversion', action: name, ...detail };
  window.dispatchEvent(new CustomEvent('jademind:conversion', { detail: payload }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(payload);
  }
}

document.querySelectorAll('[data-track]').forEach((element) => {
  element.addEventListener('click', () => {
    emitConversion(element.dataset.track, {
      label: element.textContent.trim(),
      destination: element.getAttribute('href') || undefined
    });
  });
});

// Navegación y menú móvil
const siteHeader = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('nav-links');
const menuBackground = [
  document.querySelector('.skip-link'),
  document.querySelector('.brand'),
  document.querySelector('main'),
  document.querySelector('footer'),
  document.querySelector('.whatsapp-float')
].filter(Boolean);
let scrollFrame = null;

function updateHeader() {
  if (siteHeader) {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  scrollFrame = null;
}

window.addEventListener('scroll', () => {
  if (scrollFrame === null) {
    scrollFrame = window.requestAnimationFrame(updateHeader);
  }
}, { passive: true });

updateHeader();

function closeMenu({ restoreFocus = false } = {}) {
  if (!navToggle || !navLinks) return;
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.querySelector('.sr-only').textContent = 'Abrir menú';
  navLinks.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  menuBackground.forEach((element) => {
    element.inert = false;
  });
  if (restoreFocus) navToggle.focus();
}

function openMenu() {
  if (!navToggle || !navLinks) return;
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.querySelector('.sr-only').textContent = 'Cerrar menú';
  navLinks.classList.add('is-open');
  document.body.classList.add('menu-open');
  menuBackground.forEach((element) => {
    element.inert = true;
  });
  navLinks.querySelector('a')?.focus({ preventScroll: true });
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const willOpen = navToggle.getAttribute('aria-expanded') !== 'true';
    if (willOpen) openMenu();
    else closeMenu({ restoreFocus: true });
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  document.addEventListener('keydown', (event) => {
    if (!navLinks.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key === 'Tab') {
      const focusableItems = [navToggle, ...navLinks.querySelectorAll('a')];
      const firstItem = focusableItems[0];
      const lastItem = focusableItems.at(-1);

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1199) closeMenu();
  });
}

// Recorrido · tarjetas que se apilan al hacer scroll, cada una con su celular animado
const flowStack = document.querySelector('[data-flow]');

if (flowStack) {
  const cards = Array.from(flowStack.querySelectorAll('.flow-card'));
  const inners = cards.map((card) => card.querySelector('.flow-card-inner'));
  const phones = cards.map((card) => card.querySelector('.flow-phone'));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  let stickTops = [];
  let cardHeight = 1;
  let inView = false;
  let current = -1;
  let ticking = false;
  const styled = [];

  // Cada celular avanza por pasos (clases s1…sN) y se repite con un fundido.
  const players = phones.map((phone) => {
    const steps = phone.dataset.steps.split(',').map(Number);
    const cycle = Number(phone.dataset.cycle);
    const tap = phone.querySelector('.ph-tap');
    const counter = phone.querySelector('[data-count-to]');
    let timers = [];
    let countFrame = 0;
    let running = false;

    const placeTap = (target) => {
      if (!tap) return;
      const x = target ? target.offsetLeft + target.offsetWidth / 2 : 121;
      const y = target ? target.offsetTop + target.offsetHeight / 2 : 470;
      tap.style.setProperty('--tx', `${x}px`);
      tap.style.setProperty('--ty', `${y}px`);
    };

    const countUp = () => {
      const goal = Number(counter.dataset.countTo);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1500);
        counter.textContent = String(Math.round(goal * (1 - Math.pow(1 - t, 3))));
        if (t < 1) countFrame = requestAnimationFrame(tick);
      };
      countFrame = requestAnimationFrame(tick);
    };

    const setStep = (n) => {
      phone.classList.add(`s${n}`);
      if (tap && n === 1) placeTap(phone.querySelector('.ph-week .is-pick'));
      if (tap && n === 3) placeTap(phone.querySelector('.ph-slots .is-pick'));
      if (counter && n === Number(counter.dataset.countStep)) countUp();
    };

    const clear = () => {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(countFrame);
    };

    const reset = () => {
      phone.classList.add('no-tr');
      steps.forEach((_, k) => phone.classList.remove(`s${k + 1}`));
      if (counter) counter.textContent = '0';
      placeTap(null);
      void phone.offsetWidth;
      phone.classList.remove('no-tr');
    };

    const run = () => {
      steps.forEach((time, k) => timers.push(setTimeout(() => setStep(k + 1), time)));
      timers.push(setTimeout(() => {
        phone.classList.add('is-fading');
        timers.push(setTimeout(() => {
          reset();
          phone.classList.remove('is-fading');
          run();
        }, 480));
      }, cycle));
    };

    return {
      start() {
        if (running) return;
        running = true;
        clear();
        phone.classList.remove('is-fading');
        reset();
        run();
      },
      stop() {
        running = false;
        clear();
      },
      // Sin movimiento: se muestra directamente el estado final de la escena.
      finish() {
        running = false;
        clear();
        phone.classList.remove('is-fading');
        steps.forEach((_, k) => phone.classList.add(`s${k + 1}`));
        if (counter) counter.textContent = counter.dataset.countTo;
        if (tap) tap.style.opacity = '0';
      }
    };
  });

  const measure = () => {
    stickTops = cards.map((card) => parseFloat(getComputedStyle(card).top) || 0);
    cardHeight = cards[0].offsetHeight || 1;
    // Todos los celulares usan la misma escala: la que cabe en la tarjeta más justa.
    const scale = Math.min(1, ...phones.map((phone) => {
      const box = phone.parentElement;
      return Math.min((box.clientHeight - 36) / 540, (box.clientWidth - 28) / 260);
    }));
    phones.forEach((phone) => phone.style.setProperty('--ps', clamp(scale, 0.4, 1).toFixed(3)));
  };

  const setCurrent = (index) => {
    if (index === current) return;
    current = index;
    players.forEach((player, k) => {
      if (prefersReducedMotion.matches) player.finish();
      else if (k === index) player.start();
      else player.stop();
    });
  };

  const update = () => {
    ticking = false;
    const viewport = window.innerHeight;
    // Cuánto ha cubierto cada tarjeta a la anterior (0 = abajo, 1 = encima).
    const arrive = cards.map((card, k) => {
      const top = card.getBoundingClientRect().top;
      if (top < viewport * 0.82) card.classList.add('is-seen');
      if (k === 0) return 1;
      return clamp(1 - (top - stickTops[k]) / cardHeight, 0, 1);
    });

    let depth = 0;
    let active = 0;
    for (let k = cards.length - 1; k >= 0; k -= 1) {
      const scale = prefersReducedMotion.matches ? 1 : 1 - depth * 0.045;
      const dim = Math.min(0.72, depth * 0.3);
      const key = `${scale.toFixed(4)}|${dim.toFixed(3)}`;
      if (styled[k] !== key) {
        styled[k] = key;
        inners[k].style.setProperty('--sc', scale.toFixed(4));
        inners[k].style.setProperty('--dim', dim.toFixed(3));
      }
      if (!active && arrive[k] > 0.55) active = k;
      depth += arrive[k];
    }

    setCurrent(inView ? active : -1);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  flowStack.classList.add('is-enhanced');
  measure();
  update();

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', () => {
    measure();
    requestUpdate();
  });
  prefersReducedMotion.addEventListener?.('change', () => {
    current = -1;
    requestUpdate();
  });

  // Los celulares solo trabajan mientras el recorrido está en pantalla.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      requestUpdate();
    }, { rootMargin: '-15% 0px' }).observe(flowStack);
  } else {
    inView = true;
  }
}

// Video de presentación: arranca con sonido cuando el navegador lo permite,
// solo se reproduce mientras está visible y muestra su avance.
const demoVideo = document.querySelector('.video-frame video');
const videoFrame = document.querySelector('[data-video]');
if (demoVideo && videoFrame) {
  const soundButton = videoFrame.querySelector('.video-sound');
  const soundLabel = soundButton.querySelector('span');
  const progress = videoFrame.querySelector('.video-progress i');
  let wantsSound = true;
  let heardFromStart = false;
  let visible = false;
  let progressFrame = 0;

  const showSound = () => {
    const on = !demoVideo.muted;
    soundButton.setAttribute('aria-pressed', String(on));
    soundLabel.textContent = on ? 'Silenciar' : 'Activar sonido';
    if (on) heardFromStart = true;
  };

  // La primera vez que suena, el anuncio empieza desde el principio.
  const enableSound = () => {
    if (!heardFromStart && demoVideo.currentTime > 1.5) demoVideo.currentTime = 0;
    demoVideo.muted = false;
    showSound();
  };

  // Intenta con sonido; si el navegador lo bloquea, sigue en silencio.
  const start = () => {
    if (wantsSound && demoVideo.muted && !heardFromStart) demoVideo.currentTime = 0;
    demoVideo.muted = !wantsSound;
    demoVideo.play()
      .catch(() => {
        demoVideo.muted = true;
        return demoVideo.play().catch(() => {});
      })
      .finally(showSound);
  };

  // Los navegadores permiten el sonido tras la primera interacción con la página.
  const unlock = (event) => {
    if (soundButton.contains(event.target)) return;
    if (wantsSound && visible && demoVideo.muted) enableSound();
    if (!wantsSound || !demoVideo.muted) {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  soundButton.addEventListener('click', () => {
    if (demoVideo.muted) {
      wantsSound = true;
      enableSound();
    } else {
      wantsSound = false;
      demoVideo.muted = true;
      showSound();
    }
    demoVideo.play().catch(() => {});
    emitConversion('video_sound', { on: !demoVideo.muted });
  });

  const drawProgress = () => {
    const ratio = demoVideo.duration ? demoVideo.currentTime / demoVideo.duration : 0;
    progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
    progressFrame = demoVideo.paused ? 0 : requestAnimationFrame(drawProgress);
  };
  demoVideo.addEventListener('play', () => {
    cancelAnimationFrame(progressFrame);
    progressFrame = requestAnimationFrame(drawProgress);
  });
  demoVideo.addEventListener('seeked', drawProgress);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start();
      else if (!demoVideo.paused) demoVideo.pause();
    }, { threshold: 0.35 }).observe(videoFrame);
  } else {
    visible = true;
    start();
  }
}

// Evita que el acceso flotante cubra el formulario.
const whatsappFloat = document.querySelector('.whatsapp-float');
const contactSection = document.getElementById('contacto');
const protectedFloatSections = [contactSection].filter(Boolean);
if (whatsappFloat && protectedFloatSections.length) {
  let visibilityFrame = null;
  const updateWhatsAppVisibility = () => {
    const protectedSectionIsVisible = protectedFloatSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    whatsappFloat.classList.toggle('is-hidden', protectedSectionIsVisible);
    visibilityFrame = null;
  };
  const scheduleVisibilityUpdate = () => {
    if (visibilityFrame === null) {
      visibilityFrame = window.requestAnimationFrame(updateWhatsAppVisibility);
    }
  };

  window.addEventListener('scroll', scheduleVisibilityUpdate, { passive: true });
  window.addEventListener('resize', scheduleVisibilityUpdate);
  updateWhatsAppVisibility();
}

// Formulario: mantiene el POST tradicional como respaldo y mejora la experiencia con AJAX.
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

function setFormStatus(message, type = '') {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status${type ? ` is-${type}` : ''}`;
}

if (contactForm && formStatus && 'fetch' in window) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton.textContent;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    submitButton.disabled = true;
    submitButton.textContent = 'Enviando…';
    contactForm.setAttribute('aria-busy', 'true');
    setFormStatus('Enviando tu solicitud…');

    try {
      const ajaxAction = contactForm.action.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      const response = await fetch(ajaxAction, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      let responseData = null;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      const submissionConfirmed = responseData?.success === true || responseData?.success === 'true';
      if (!response.ok || !submissionConfirmed) {
        throw new Error('La plataforma de envío no confirmó la recepción.');
      }

      contactForm.reset();
      setFormStatus('Solicitud recibida. Te contactaremos por los datos que indicaste.', 'success');
      formStatus.focus({ preventScroll: true });
      emitConversion('form_success');
    } catch (error) {
      const timeoutMessage = error.name === 'AbortError'
        ? 'El envío tardó demasiado. Intenta nuevamente o escríbenos por WhatsApp.'
        : 'No pudimos confirmar el envío. Intenta de nuevo o escríbenos por WhatsApp.';
      setFormStatus(timeoutMessage, 'error');
      formStatus.focus({ preventScroll: true });
      emitConversion('form_error', { reason: error.name || 'unknown' });
    } finally {
      window.clearTimeout(timeout);
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
      contactForm.removeAttribute('aria-busy');
    }
  });
}

if (prefersReducedMotion.matches) {
  document.documentElement.classList.add('reduced-motion');
}

document.documentElement.dataset.appReady = 'true';

// Animaciones Reveal (Scroll)
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // Stop observing once revealed
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    revealObserver.observe(el);
  });
} else {
  // Fallback for older browsers
  document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    el.classList.add('is-visible');
  });
}

// Interacción en el Chat (Agent Preview)
const chatPreview = document.querySelector('.agent-preview');
if (chatPreview && 'IntersectionObserver' in window) {
  const chatMessages = chatPreview.querySelectorAll('.message');
  const leadCard = chatPreview.querySelector('.lead-card');
  
  const chatObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        let delay = 300;
        
        chatMessages.forEach((msg, index) => {
          setTimeout(() => {
            msg.classList.add('is-visible');
          }, delay);
          // Incremental delay for typing effect feel
          delay += (index === 0) ? 1000 : 800;
        });

        if (leadCard) {
          setTimeout(() => {
            leadCard.classList.add('is-visible');
          }, delay + 200);
        }
        
        chatObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  chatObserver.observe(chatPreview);
} else if (chatPreview) {
  // Fallback
  chatPreview.querySelectorAll('.message').forEach(m => m.classList.add('is-visible'));
  const card = chatPreview.querySelector('.lead-card');
  if (card) card.classList.add('is-visible');
}

// Isotipo ambiental: parallax 3D sutil con el ratón (lerp, solo con puntero fino y en pantalla)
(() => {
  const layer = document.querySelector('[data-brand-parallax]');
  const section = layer?.closest('section');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!layer || !section || !finePointer.matches || prefersReducedMotion.matches) return;

  const MAX_SHIFT_X = 14; // px
  const MAX_SHIFT_Y = 10; // px
  const MAX_TILT = 5;     // grados
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let inView = false;
  let frame = 0;
  let last = 0;

  const render = () => {
    layer.style.transform =
      `translate(-50%, -50%) perspective(900px) ` +
      `translate3d(${(current.x * MAX_SHIFT_X).toFixed(2)}px, ${(current.y * MAX_SHIFT_Y).toFixed(2)}px, 0) ` +
      `rotateX(${(-current.y * MAX_TILT).toFixed(2)}deg) rotateY(${(current.x * MAX_TILT).toFixed(2)}deg)`;
  };

  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    const ease = 1 - Math.exp(-dt * 4); // desaceleración independiente de los FPS
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    render();
    const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
    frame = settled ? 0 : requestAnimationFrame(tick);
  };

  const wake = () => {
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  window.addEventListener('pointermove', (event) => {
    if (!inView || event.pointerType !== 'mouse') return;
    const rect = section.getBoundingClientRect();
    // -1..1 respecto al centro de la sección, acotado
    target.x = Math.max(-1, Math.min(1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
    target.y = Math.max(-1, Math.min(1, (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
    wake();
  }, { passive: true });

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) {
      target.x = 0;
      target.y = 0;
      wake();
    }
  }).observe(section);
})();

// Diseño web · estudio en vivo: el visitante personaliza una página de ejemplo.
// Las transiciones son una coreografía propia (Web Animations API): el contenido
// viejo sale por completo antes de que entre el nuevo, así nunca se superponen.
(() => {
  const studio = document.querySelector('[data-studio]');
  if (!studio) return;

  const screen = studio.querySelector('[data-mk-screen]');
  const page = screen.querySelector('.mk-page');
  const hint = studio.querySelector('[data-studio-hint]');
  const status = studio.querySelector('[data-studio-status]');
  const publishButton = studio.querySelector('[data-studio-publish]');
  const quoteLink = studio.querySelector('[data-studio-quote]');
  const controls = Array.from(studio.querySelectorAll('[data-studio-set]'));
  const stage = studio.querySelector('.studio-stage');
  const urlText = studio.querySelector('.browser-url [data-mk="domain"]');

  screen.insertAdjacentHTML('beforeend', '<span class="mk-scan" aria-hidden="true"></span>');
  const scan = screen.querySelector('.mk-scan');

  // Ilustraciones vectoriales propias de cada negocio. Usan --mk-a / --mk-b,
  // así el color de marca elegido también las tiñe.
  const A = 'var(--mk-a)';
  const B = 'var(--mk-b)';
  const mix = (pct, other) => `color-mix(in srgb, var(--mk-a) ${pct}%, ${other})`;

  const ILLU = {
    restaurante: `
<svg class="mk-illu" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="rs-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2416"/><stop offset="1" stop-color="#1e120b"/></linearGradient>
    <radialGradient id="rs-candle" cx="0.12" cy="0.1" r="0.7"><stop offset="0" stop-color="#ffb867" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb867" stop-opacity="0"/></radialGradient>
    <radialGradient id="rs-rice" cx="0.42" cy="0.38" r="0.7"><stop offset="0" stop-color="#f6dfa8"/><stop offset="1" stop-color="#d9b46a"/></radialGradient>
    <radialGradient id="rs-wine" cx="0.35" cy="0.35" r="0.75"><stop offset="0" stop-color="#9b2235"/><stop offset="1" stop-color="#4a0b16"/></radialGradient>
    <filter id="rs-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="400" height="300" fill="url(#rs-wood)"/>
  <g opacity="0.22" stroke="#120a05" stroke-width="1.4">
    <path d="M0 38h400M0 92h400M0 151h400M0 207h400M0 262h400"/>
  </g>
  <g opacity="0.1" stroke="#c88a5a" stroke-width="0.8" fill="none">
    <path d="M0 60c80-6 160 8 260-2s110 6 140 2M0 120c90 6 170-8 250 0s120-4 150 4M0 182c70-4 180 10 260 0s100-6 140 0M0 236c110 6 190-6 260 2s100 4 140-2"/>
  </g>
  <rect width="400" height="300" fill="url(#rs-candle)"/>
  <rect x="20" y="96" width="78" height="170" rx="10" transform="rotate(-6 59 181)" style="fill:${A}" opacity="0.88"/>
  <rect x="20" y="96" width="78" height="170" rx="10" transform="rotate(-6 59 181)" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-dasharray="3 4"/>
  <g transform="rotate(-6 59 181)" fill="#d7dade">
    <rect x="44" y="120" width="7" height="88" rx="3.5"/>
    <rect x="39" y="104" width="2.4" height="24" rx="1.2"/><rect x="43.6" y="104" width="2.4" height="24" rx="1.2"/><rect x="48.2" y="104" width="2.4" height="24" rx="1.2"/><rect x="52.8" y="104" width="2.4" height="24" rx="1.2"/>
    <path d="M38 124h18v6a9 9 0 0 1-18 0z"/>
    <path d="M70 104c9 6 10 30 9 48h-8z"/><rect x="71" y="150" width="8" height="70" rx="4"/>
  </g>
  <ellipse cx="226" cy="168" rx="110" ry="104" fill="#000" opacity="0.45" filter="url(#rs-soft)"/>
  <circle cx="220" cy="156" r="108" fill="#f4efe7"/>
  <circle cx="220" cy="156" r="108" fill="none" stroke="#d8cfc2" stroke-width="2"/>
  <circle cx="220" cy="156" r="80" fill="#fbf8f2"/>
  <circle cx="220" cy="156" r="80" fill="none" stroke="#e7dfd3" stroke-width="1.5"/>
  <circle cx="220" cy="158" r="56" fill="url(#rs-rice)"/>
  <g fill="#c99d52" opacity="0.55">
    <circle cx="198" cy="142" r="2"/><circle cx="236" cy="136" r="2"/><circle cx="246" cy="168" r="2"/><circle cx="205" cy="178" r="2"/><circle cx="222" cy="190" r="2"/><circle cx="189" cy="162" r="2"/><circle cx="252" cy="150" r="1.6"/><circle cx="214" cy="128" r="1.6"/>
  </g>
  <g>
    <ellipse cx="206" cy="150" rx="15" ry="11" fill="#8b5a37"/><ellipse cx="206" cy="148" rx="11" ry="7" fill="#a9734a"/>
    <ellipse cx="238" cy="160" rx="14" ry="10" fill="#7d4f30"/><ellipse cx="238" cy="158" rx="10" ry="6" fill="#9e6a43"/>
    <ellipse cx="220" cy="176" rx="13" ry="9" fill="#8b5a37"/><ellipse cx="220" cy="174" rx="9" ry="5.5" fill="#b07b50"/>
    <ellipse cx="226" cy="138" rx="10" ry="7" fill="#7d4f30"/>
  </g>
  <g fill="#f8f4ea" opacity="0.95">
    <path d="M198 168l16-6 2 4-16 6z"/><path d="M232 142l14 3-1 4-14-3z"/><path d="M212 188l12-8 3 3-12 8z"/>
  </g>
  <g fill="#5b9a45">
    <ellipse cx="214" cy="160" rx="5" ry="2.4" transform="rotate(30 214 160)"/><ellipse cx="230" cy="150" rx="5" ry="2.4" transform="rotate(-40 230 150)"/><ellipse cx="226" cy="186" rx="4.5" ry="2.2" transform="rotate(10 226 186)"/><ellipse cx="196" cy="160" rx="4.5" ry="2.2" transform="rotate(-20 196 160)"/>
  </g>
  <path d="M168 120c18-14 52-22 92-6" fill="none" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
  <circle cx="345" cy="62" r="40" fill="#fff" opacity="0.08"/>
  <circle cx="345" cy="62" r="40" fill="none" stroke="#fff" stroke-opacity="0.4" stroke-width="2"/>
  <circle cx="345" cy="62" r="30" fill="url(#rs-wine)"/>
  <path d="M325 50a24 24 0 0 1 22-14" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
  <circle cx="352" cy="238" r="30" fill="#f4efe7"/><circle cx="352" cy="238" r="22" fill="#2f4a1f"/>
  <g fill="#6f8d3a"><circle cx="344" cy="232" r="5"/><circle cx="356" cy="230" r="5"/><circle cx="350" cy="244" r="5"/><circle cx="361" cy="242" r="5"/></g>
  <g fill="#3f5a1e"><circle cx="344" cy="232" r="1.6"/><circle cx="356" cy="230" r="1.6"/><circle cx="350" cy="244" r="1.6"/><circle cx="361" cy="242" r="1.6"/></g>
</svg>`,

    clinica: `
<svg class="mk-illu" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cl-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${mix(22, '#fff')}"/><stop offset="1" stop-color="#f4ece4"/></linearGradient>
    <linearGradient id="cl-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:${mix(70, '#fff')}"/><stop offset="0.55" style="stop-color:${mix(45, '#fff')}"/><stop offset="1" style="stop-color:${mix(80, '#fff')}"/></linearGradient>
    <linearGradient id="cl-liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${mix(85, '#fff')}"/><stop offset="1" style="stop-color:${B}"/></linearGradient>
    <filter id="cl-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="400" height="300" fill="url(#cl-bg)"/>
  <path d="M120 300V120a80 80 0 0 1 160 0v180z" style="fill:${mix(16, '#fff')}"/>
  <circle cx="330" cy="70" r="46" style="fill:${mix(30, '#fff')}" opacity="0.7"/>
  <rect x="0" y="236" width="400" height="64" fill="#efe5db"/>
  <g fill="none" stroke="#8aa792" stroke-width="2.4" stroke-linecap="round"><path d="M96 236c-6-50 4-104 40-150"/><path d="M118 236c10-40 34-74 70-96"/></g>
  <g fill="#a9c6b1">
    <ellipse cx="102" cy="190" rx="13" ry="9" transform="rotate(-30 102 190)"/><ellipse cx="89" cy="160" rx="13" ry="9" transform="rotate(20 89 160)"/><ellipse cx="112" cy="134" rx="12" ry="8" transform="rotate(-40 112 134)"/><ellipse cx="100" cy="108" rx="11" ry="7.5" transform="rotate(25 100 108)"/><ellipse cx="128" cy="96" rx="10" ry="7" transform="rotate(-50 128 96)"/>
  </g>
  <g fill="#c3dbc9">
    <ellipse cx="140" cy="186" rx="12" ry="8" transform="rotate(35 140 186)"/><ellipse cx="156" cy="160" rx="11" ry="7.5" transform="rotate(-25 156 160)"/><ellipse cx="176" cy="146" rx="10" ry="7" transform="rotate(30 176 146)"/>
  </g>
  <ellipse cx="214" cy="244" rx="88" ry="14" fill="#5b4a3f" opacity="0.25" filter="url(#cl-soft)"/>
  <rect x="150" y="214" width="128" height="30" rx="8" fill="#fbf7f2"/>
  <rect x="150" y="214" width="128" height="8" rx="4" fill="#fff"/>
  <rect x="183" y="78" width="30" height="34" rx="6" fill="#3a302b"/>
  <ellipse cx="198" cy="72" rx="16" ry="18" fill="#2a2320"/>
  <ellipse cx="192" cy="66" rx="4" ry="7" fill="#fff" opacity="0.18"/>
  <rect x="178" y="108" width="40" height="14" rx="4" fill="#cdbfb1"/>
  <rect x="166" y="120" width="64" height="96" rx="16" fill="url(#cl-glass)" opacity="0.92"/>
  <rect x="170" y="150" width="56" height="62" rx="12" fill="url(#cl-liquid)" opacity="0.85"/>
  <rect x="176" y="160" width="44" height="36" rx="5" fill="#fffaf5" opacity="0.94"/>
  <rect x="183" y="168" width="30" height="3.4" rx="1.7" fill="#5b4a3f" opacity="0.7"/>
  <rect x="186" y="176" width="24" height="2.4" rx="1.2" fill="#5b4a3f" opacity="0.4"/>
  <rect x="188" y="182" width="20" height="2.4" rx="1.2" fill="#5b4a3f" opacity="0.4"/>
  <rect x="174" y="126" width="6" height="80" rx="3" fill="#fff" opacity="0.55"/>
  <ellipse cx="262" cy="214" rx="30" ry="8" style="fill:${A}"/>
  <rect x="232" y="186" width="60" height="28" style="fill:${A}"/>
  <ellipse cx="262" cy="186" rx="30" ry="8" style="fill:${mix(70, '#fff')}"/>
  <rect x="236" y="196" width="52" height="10" rx="3" fill="#fff" opacity="0.35"/>
  <g style="fill:${A}">
    <path d="M300 128c0 0-10 12-10 19a10 10 0 0 0 20 0c0-7-10-19-10-19z" opacity="0.9"/>
    <path d="M316 96c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" opacity="0.6"/>
    <path d="M286 82c0 0-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8z" opacity="0.45"/>
  </g>
  <path d="M296 140a5 5 0 0 0 4 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
</svg>`,

    inmobiliaria: `
<svg class="mk-illu" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="re-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141a33"/><stop offset="0.55" stop-color="#5d3f6e"/><stop offset="1" stop-color="#f19b6a"/></linearGradient>
    <linearGradient id="re-win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a3"/><stop offset="1" stop-color="#ffb04d"/></linearGradient>
    <linearGradient id="re-pool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe0f0"/><stop offset="1" stop-color="#2b7fa8"/></linearGradient>
    <filter id="re-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  </defs>
  <rect width="400" height="300" fill="url(#re-sky)"/>
  <g fill="#fff"><circle cx="40" cy="30" r="1.2"/><circle cx="96" cy="18" r="1"/><circle cx="160" cy="40" r="1.3"/><circle cx="250" cy="22" r="1"/><circle cx="300" cy="46" r="1.2"/><circle cx="372" cy="28" r="1"/></g>
  <circle cx="318" cy="92" r="26" fill="#ffd9a8" opacity="0.9"/>
  <circle cx="318" cy="92" r="46" fill="#ffb877" opacity="0.25" filter="url(#re-glow)"/>
  <path d="M0 214c50-26 90-34 140-22s90 6 140-14 90-10 120 4v118H0z" fill="#2b2547"/>
  <path d="M0 232c70-14 120-18 190-8s130 0 210-12v88H0z" fill="#1d1b33"/>
  <ellipse cx="210" cy="190" rx="150" ry="48" fill="#ffb04d" opacity="0.28" filter="url(#re-glow)"/>
  <rect x="68" y="150" width="270" height="92" fill="#ece8e2"/>
  <rect x="68" y="150" width="270" height="6" fill="#d8d2ca"/>
  <rect x="128" y="98" width="230" height="56" fill="#2f3440"/>
  <rect x="122" y="94" width="242" height="8" fill="#1f232c"/>
  <g fill="#8e5a35"><rect x="300" y="102" width="5" height="52"/><rect x="309" y="102" width="5" height="52"/><rect x="318" y="102" width="5" height="52"/><rect x="327" y="102" width="5" height="52"/><rect x="336" y="102" width="5" height="52"/><rect x="345" y="102" width="5" height="52"/></g>
  <rect x="140" y="108" width="150" height="38" fill="url(#re-win)"/>
  <g stroke="#2f3440" stroke-width="3"><path d="M190 108v38M240 108v38"/></g>
  <rect x="84" y="168" width="96" height="62" fill="url(#re-win)"/>
  <rect x="196" y="168" width="34" height="74" fill="#5b3a24"/>
  <circle cx="224" cy="206" r="2" fill="#e8c27a"/>
  <rect x="246" y="168" width="76" height="62" fill="url(#re-win)" opacity="0.92"/>
  <g stroke="#ece8e2" stroke-width="3"><path d="M132 168v62M284 168v62"/></g>
  <path d="M128 154h230" stroke="#cfd6df" stroke-width="2" opacity="0.6"/>
  <g fill="#3a2f1f" opacity="0.55"><rect x="96" y="196" width="18" height="34" rx="2"/><rect x="150" y="204" width="22" height="26" rx="3"/><circle cx="268" cy="208" r="9"/></g>
  <rect x="40" y="242" width="320" height="14" fill="#202a24"/>
  <rect x="96" y="254" width="208" height="30" rx="4" fill="url(#re-pool)" opacity="0.9"/>
  <g stroke="#fff" stroke-opacity="0.55" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M118 264c8-4 14 4 22 0M170 272c8-4 14 4 22 0M232 263c8-4 14 4 22 0M262 276c6-3 10 3 16 0"/></g>
  <rect x="108" y="256" width="120" height="8" fill="#ffb04d" opacity="0.25"/>
  <g fill="#14261b"><circle cx="40" cy="186" r="30"/><circle cx="20" cy="206" r="24"/><circle cx="62" cy="208" r="22"/><rect x="36" y="210" width="8" height="40"/></g>
  <g fill="#1b3324"><circle cx="372" cy="198" r="22"/><circle cx="388" cy="214" r="18"/><rect x="368" y="214" width="6" height="34"/></g>
</svg>`,

    tienda: `
<svg class="mk-illu" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="st-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${mix(30, '#fff')}"/><stop offset="1" style="stop-color:${mix(12, '#fff')}"/></linearGradient>
    <linearGradient id="st-up" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2b30"/><stop offset="1" stop-color="#121214"/></linearGradient>
    <filter id="st-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect width="400" height="300" fill="url(#st-bg)"/>
  <circle cx="210" cy="132" r="104" style="fill:${A}" opacity="0.9"/>
  <circle cx="210" cy="132" r="104" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="2 8"/>
  <ellipse cx="206" cy="262" rx="130" ry="22" fill="#fff"/>
  <rect x="76" y="232" width="260" height="30" fill="#fff"/>
  <ellipse cx="206" cy="232" rx="130" ry="22" fill="#f6f6f4"/>
  <ellipse cx="206" cy="226" rx="104" ry="10" fill="#000" opacity="0.18" filter="url(#st-soft)"/>
  <g transform="rotate(-8 206 180)">
    <path d="M98 214c0-10 6-14 16-14h196c22 0 36 8 36 18v6c0 6-4 9-10 9H110c-8 0-12-6-12-12z" fill="#fff"/>
    <path d="M100 222h244" stroke="#d9d9d4" stroke-width="5"/>
    <path d="M112 232h226" style="stroke:${A}" stroke-width="4" stroke-linecap="round"/>
    <path d="M112 200c-8-22 4-58 30-70 14-6 30-2 40 10 14 18 40 26 66 28 30 2 56 10 74 26 8 7 8 14 4 18H120c-4 0-6-6-8-12z" fill="url(#st-up)"/>
    <path d="M128 168c26 14 74 20 116 22 34 2 58 8 74 18" fill="none" style="stroke:${A}" stroke-width="10" stroke-linecap="round"/>
    <path d="M112 200c-6-18 0-40 14-54" fill="none" style="stroke:${A}" stroke-width="7" stroke-linecap="round"/>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M168 150l14 10M176 144l14 10M184 140l14 10M192 138l12 10"/></g>
    <g fill="#e6e6e3"><circle cx="166" cy="154" r="2.4"/><circle cx="174" cy="148" r="2.4"/><circle cx="182" cy="143" r="2.4"/><circle cx="190" cy="140" r="2.4"/></g>
    <path d="M150 128c4-10 18-14 26-6" fill="none" stroke="#3a3a40" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g fill="#fff">
    <path d="M330 60l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/>
    <path d="M86 84l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" opacity="0.85"/>
    <path d="M352 158l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z" opacity="0.8"/>
  </g>
</svg>`
  };

  // Miniaturas para las fichas de inmuebles y productos
  const MINI = {
    casa: `<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice"><rect width="120" height="80" fill="#3d3456"/><rect y="50" width="120" height="30" fill="#1f2a22"/><rect x="18" y="30" width="84" height="32" fill="#ece8e2"/><rect x="38" y="16" width="70" height="18" fill="#2f3440"/><rect x="44" y="20" width="44" height="11" fill="#ffc96e"/><rect x="24" y="38" width="28" height="18" fill="#ffc96e"/><rect x="58" y="38" width="10" height="24" fill="#5b3a24"/><rect x="74" y="38" width="22" height="18" fill="#ffc96e"/></svg>`,
    apto: `<svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice"><rect width="120" height="80" fill="#24304d"/><circle cx="96" cy="18" r="9" fill="#ffd9a8" opacity="0.85"/><rect x="34" y="10" width="40" height="70" fill="#d9dde3"/><rect x="74" y="30" width="26" height="50" fill="#b9c0ca"/><g fill="#ffc96e"><rect x="40" y="16" width="8" height="6"/><rect x="54" y="16" width="8" height="6"/><rect x="40" y="28" width="8" height="6"/><rect x="62" y="28" width="8" height="6"/><rect x="54" y="40" width="8" height="6"/><rect x="40" y="52" width="8" height="6"/><rect x="62" y="52" width="8" height="6"/><rect x="80" y="38" width="6" height="5"/><rect x="88" y="50" width="6" height="5"/></g></svg>`,
    tenis: `<svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet"><g transform="rotate(-8 60 50)"><path d="M14 62c0-4 3-6 7-6h76c9 0 15 3 15 8v2c0 3-2 4-4 4H20c-4 0-6-3-6-6z" fill="#fff"/><path d="M20 58c-3-10 2-26 13-31 6-2 13 0 17 5 6 8 17 12 28 13 13 1 24 5 31 11 3 3 3 6 1 8H24c-2 0-3-3-4-6z" fill="#1d1d21"/><path d="M28 46c12 6 32 9 50 10 14 1 25 4 31 8" fill="none" style="stroke:${A}" stroke-width="5" stroke-linecap="round"/></g></svg>`,
    gorra: `<svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet"><path d="M24 58c0-22 16-36 36-36s36 14 36 36z" style="fill:${A}"/><path d="M60 22v36" stroke="#000" stroke-opacity="0.15" stroke-width="2"/><circle cx="60" cy="22" r="4" fill="#1d1d21"/><path d="M20 58h52c18 0 30 4 34 10H24c-4 0-6-4-4-10z" fill="#1d1d21"/></svg>`,
    bolso: `<svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid meet"><path d="M44 34c0-14 7-22 16-22s16 8 16 22" fill="none" stroke="#1d1d21" stroke-width="5" stroke-linecap="round"/><path d="M28 32h64l6 50H22z" fill="#efe6d8"/><path d="M28 32h64l2 14H26z" style="fill:${A}"/><circle cx="44" cy="40" r="3" fill="#1d1d21"/><circle cx="76" cy="40" r="3" fill="#1d1d21"/></svg>`
  };

  const LOGOS = {
    restaurante: '<path d="M6 2v8a2.5 2.5 0 0 0 5 0V2"/><path d="M8.5 2v20"/><path d="M18 22V2c-2.5 1.2-4 4.2-4 8.5h4"/>',
    clinica: '<path d="M11 3l1.8 4.7 4.7 1.8-4.7 1.8L11 16l-1.8-4.7L4.5 9.5l4.7-1.8z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    inmobiliaria: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
    tienda: '<path d="M5.5 7h13l1 14h-15z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9"/>'
  };
  const svgIcon = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const words = (text) => text.split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');

  const SECTORS = {
    restaurante: {
      label: 'Restaurante', noun: 'mi restaurante', domain: 'laterraza.co', brand: 'La Terraza',
      nav: ['Carta', 'Reservas', 'Eventos'], navEnd: '<span class="mk-navbtn sk">Reservar</span>',
      eyebrow: 'Cocina de autor · Medellín', title: 'Sabores que se reservan con un clic.',
      text: 'Reserva tu mesa en segundos y recibe la confirmación por WhatsApp.',
      cta: 'Reservar mesa', ghost: 'Ver la carta', proof: '<span class="mk-stars">★★★★★</span> 4,9 · 1.200 reseñas',
      floats: '<span class="mk-float mk-float-a"><b>Chef del mes</b><small>Risotto de temporada</small></span><span class="mk-float mk-float-b"><i></i>Mesa para 2 · 8:30 p. m.</span>',
      extra: `
        <div class="mk-extra mk-x-resto">
          <div class="mk-menu">
            <span class="mk-x-title sk">Menú de la casa</span>
            <span class="mk-dish"><b>Risotto de hongos</b><i></i><em>$48.000</em></span>
            <span class="mk-dish"><b>Salmón al grill</b><i></i><em>$62.000</em></span>
            <span class="mk-dish"><b>Tiramisú</b><i></i><em>$22.000</em></span>
          </div>
          <div class="mk-book">
            <span class="mk-x-title sk">Reserva tu mesa</span>
            <span class="mk-pills"><span>Hoy</span><span>2 personas</span><span class="on">8:30 p. m.</span></span>
            <span class="mk-book-btn">Confirmar reserva</span>
          </div>
        </div>`
    },
    clinica: {
      label: 'Clínica estética', noun: 'mi clínica estética', domain: 'auraestetica.co', brand: 'Aura',
      nav: ['Tratamientos', 'Especialistas', 'Resultados'], navEnd: '<span class="mk-navbtn sk">Agendar cita</span>',
      eyebrow: 'Medicina estética', title: 'Tu mejor versión empieza con una cita.',
      text: 'Valoración personalizada con especialistas certificados.',
      cta: 'Agendar valoración', ghost: 'Ver tratamientos', proof: '<span class="mk-stars">★★★★★</span> 4,8 · 860 pacientes',
      floats: '<span class="mk-float mk-float-a"><b>+52%</b><small>citas agendadas</small></span><span class="mk-float mk-float-b"><i></i>Cita confirmada · jue 10:30</span>',
      extra: `
        <div class="mk-extra mk-x-clinic">
          <span class="mk-treat"><i></i><b>Limpieza facial</b><small>45 min</small><em>Desde $180.000</em></span>
          <span class="mk-treat"><i></i><b>Hidratación profunda</b><small>60 min</small><em>Desde $220.000</em></span>
          <span class="mk-treat"><i></i><b>Valoración inicial</b><small>30 min</small><em>Sin costo</em></span>
        </div>`
    },
    inmobiliaria: {
      label: 'Inmobiliaria', noun: 'mi inmobiliaria', domain: 'nidoinmobiliaria.co', brand: 'NIDO',
      nav: ['Comprar', 'Arrendar', 'Vender'], navEnd: '<span class="mk-navbtn sk">Publicar inmueble</span>',
      eyebrow: '320 inmuebles disponibles', title: 'Encuentra el hogar que estabas buscando.',
      text: 'Filtra por zona, presupuesto y habitaciones, y agenda tu visita.',
      cta: 'Agendar visita', ghost: 'Ver inmuebles', proof: 'Asesor en línea · responde en segundos',
      floats: '<span class="mk-float mk-float-a mk-price"><b>$480M</b><small>Laureles · 3 hab</small></span><span class="mk-float mk-float-b"><i></i>Visita agendada · sáb 11:00</span>',
      extra: `
        <div class="mk-extra mk-x-estate">
          <div class="mk-search">
            <span><small>Zona</small><b>Laureles</b></span>
            <span><small>Tipo</small><b>Apartamento</b></span>
            <span><small>Hasta</small><b>$500M</b></span>
            <span class="mk-search-btn">${svgIcon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')}Buscar</span>
          </div>
          <div class="mk-listing">${MINI.casa}<span><b>$480.000.000</b><small>3 hab · 2 baños · 98 m²</small></span></div>
          <div class="mk-listing">${MINI.apto}<span><b>$2.400.000/mes</b><small>2 hab · 1 baño · 64 m²</small></span></div>
        </div>`
    },
    tienda: {
      label: 'Tienda online', noun: 'mi tienda online', domain: 'nomadastore.co', brand: 'NÓMADA',
      nav: ['Hombre', 'Mujer', 'Ofertas'],
      navEnd: `<span class="mk-cart">${svgIcon('<path d="M5.5 7h13l1 14h-15z"/><path d="M9 9V6.5a3 3 0 0 1 6 0V9"/>')}<i>2</i></span>`,
      eyebrow: 'Nueva colección', title: 'Lo que te gusta, en tu puerta mañana.',
      text: 'Envíos a todo el país y pagos seguros en un solo paso.',
      cta: 'Comprar ahora', ghost: 'Ver colección', proof: 'Envío gratis desde $150.000',
      floats: '<span class="mk-float mk-float-a mk-sticker"><b>-20%</b><small>hoy</small></span><span class="mk-float mk-float-b"><i></i>Nuevo pedido · #1048</span>',
      extra: `
        <div class="mk-extra mk-x-shop">
          <span class="mk-product"><span class="mk-thumb">${MINI.tenis}<i>-20%</i></span><b>Tenis Runner</b><em>$239.000 <s>$299.000</s></em></span>
          <span class="mk-product"><span class="mk-thumb">${MINI.gorra}</span><b>Gorra Classic</b><em>$59.000</em></span>
          <span class="mk-product"><span class="mk-thumb">${MINI.bolso}</span><b>Tote Canvas</b><em>$89.000</em></span>
        </div>`
    }
  };

  function renderPage(key) {
    const d = SECTORS[key];
    return `
      <div class="mk-nav">
        <span class="mk-logo"><i class="mk-logo-mark">${svgIcon(LOGOS[key])}</i><b class="sk">${d.brand}</b></span>
        <span class="mk-links">${d.nav.map((item) => `<span class="sk">${item}</span>`).join('')}</span>
        ${d.navEnd}
      </div>
      <div class="mk-hero">
        <div class="mk-copy">
          <span class="mk-eyebrow sk">${d.eyebrow}</span>
          <strong class="mk-title sk">${words(d.title)}</strong>
          <span class="mk-text sk">${d.text}</span>
          <span class="mk-actions"><span class="mk-cta sk">${d.cta}</span><span class="mk-ghost sk">${d.ghost}</span></span>
          <span class="mk-proof sk">${d.proof}</span>
        </div>
        <div class="mk-art">${ILLU[key]}${d.floats}</div>
      </div>
      ${d.extra}`;
  }

  const LABELS = {
    theme: { jade: 'Jade', oceano: 'Océano', coral: 'Coral', violeta: 'Violeta' },
    layout: { split: 'dividida', center: 'centrada', editorial: 'editorial' },
    device: { desktop: 'escritorio', tablet: 'tableta', mobile: 'celular' }
  };

  const DEMO = [
    { sector: 'clinica', theme: 'violeta' },
    { layout: 'center' },
    { sector: 'inmobiliaria', theme: 'oceano', layout: 'editorial' },
    { device: 'mobile' },
    { sector: 'tienda', theme: 'coral' },
    { device: 'desktop', layout: 'split' },
    { sector: 'restaurante', theme: 'jade' },
    { publish: true }
  ];
  const DEMO_STEP = 4500;

  // Curvas: salida rápida y entrada con desaceleración larga (sensación "premium").
  const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const EASE_IN = 'cubic-bezier(0.55, 0, 1, 0.45)';
  const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  const state = { sector: 'restaurante', theme: 'jade', layout: 'split', device: 'desktop' };
  let demoIndex = 0;
  let demoTimer = 0;
  let liveTimer = 0;
  let typeTimer = 0;
  let demo = !prefersReducedMotion.matches;
  let inView = false;
  let hold = false;
  let built = false;
  let run = 0; // identifica la transición en curso; una nueva invalida la anterior

  studio.style.setProperty('--demo-step', `${DEMO_STEP}ms`);

  const reduced = () => prefersReducedMotion.matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const done = (animations) => Promise.all(animations.map((a) => a.finished.catch(() => {})));

  // Solo cancela animaciones creadas por este script (no las CSS de la página).
  function stopOwnAnimations() {
    screen.getAnimations({ subtree: true }).forEach((animation) => {
      if (animation instanceof CSSAnimation || animation instanceof CSSTransition) return;
      animation.cancel();
    });
  }

  // ── Contenido ──
  function fillContent(sectorKey) {
    page.innerHTML = renderPage(sectorKey);
    studio.querySelectorAll('.mk-launch [data-mk="domain"]').forEach((node) => { node.textContent = SECTORS[sectorKey].domain; });
  }

  function typeDomain(domain) {
    clearTimeout(typeTimer);
    if (!urlText) return;
    if (reduced()) {
      urlText.textContent = domain;
      return;
    }
    let length = 0;
    urlText.textContent = '';
    const tick = () => {
      length += 1;
      urlText.textContent = domain.slice(0, length);
      if (length < domain.length) typeTimer = setTimeout(tick, 32);
    };
    tick();
  }

  function syncControls() {
    controls.forEach((button) => {
      button.setAttribute('aria-pressed', String(state[button.dataset.studioSet] === button.dataset.value));
    });
    if (quoteLink) {
      quoteLink.dataset.prefillMessage = `Hola, quiero cotizar una página web para ${SECTORS[state.sector].noun}, con estilo ${LABELS.theme[state.theme]} y composición ${LABELS.layout[state.layout]}.`;
    }
  }

  function commit(next, { content = true } = {}) {
    const sectorChanged = next.sector !== state.sector;
    Object.assign(state, next);
    screen.dataset.sector = state.sector;
    screen.dataset.theme = state.theme;
    screen.dataset.layout = state.layout;
    screen.dataset.device = state.device;
    if (content) fillContent(state.sector);
    if (sectorChanged) typeDomain(SECTORS[state.sector].domain);
    syncControls();
  }

  // ── Piezas de la coreografía ──
  const textItems = () => Array.from(screen.querySelectorAll(
    '.mk-logo b, .mk-links > span, .mk-navbtn, .mk-cart, .mk-eyebrow, .mk-title, .mk-text, .mk-actions > *, .mk-proof, .mk-extra > *'
  )).filter((el) => el.getClientRects().length);

  function exitText(items) {
    return items.map((el, i) => el.animate(
      [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-8px)', filter: 'blur(5px)' }],
      { duration: 220, delay: i * 16, easing: EASE_IN, fill: 'forwards' }
    ));
  }

  function enterText(items, base = 0) {
    const animations = [];
    let step = 0;
    items.forEach((el) => {
      if (el.classList.contains('mk-title')) {
        // El título entra palabra por palabra, como si se escribiera con una máscara.
        el.querySelectorAll('.w > span').forEach((word, w) => {
          animations.push(word.animate(
            [{ transform: 'translateY(105%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
            { duration: 650, delay: base + step * 40 + w * 45, easing: EASE_OUT, fill: 'backwards' }
          ));
        });
      } else {
        animations.push(el.animate(
          [{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
          { duration: 560, delay: base + step * 40, easing: EASE_OUT, fill: 'backwards' }
        ));
      }
      step += 1;
    });
    return animations;
  }

  function exitArt({ whole }) {
    const animations = [];
    const art = screen.querySelector('.mk-art');
    if (whole && art) {
      animations.push(art.animate(
        [{ opacity: getComputedStyle(art).opacity, transform: 'none' }, { opacity: 0, transform: 'scale(0.94)' }],
        { duration: 240, easing: EASE_IN, fill: 'forwards' }
      ));
      return animations;
    }
    screen.querySelectorAll('.mk-illu').forEach((illu) => {
      animations.push(illu.animate(
        [{ opacity: 1, scale: '1', filter: 'blur(0)' }, { opacity: 0, scale: '1.04', filter: 'blur(6px)' }],
        { duration: 260, easing: EASE_IN, fill: 'forwards' }
      ));
    });
    screen.querySelectorAll('.mk-float').forEach((node, i) => {
      animations.push(node.animate(
        [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: `${i ? -16 : 16}px 0` }],
        { duration: 220, easing: EASE_IN, fill: 'forwards' }
      ));
    });
    return animations;
  }

  function enterArt({ whole }, base = 0) {
    const animations = [];
    const art = screen.querySelector('.mk-art');
    if (whole && art && art.getClientRects().length) {
      // En la composición centrada la imagen es un halo tenue: se respeta su opacidad final.
      const target = getComputedStyle(art).opacity;
      animations.push(art.animate(
        [{ opacity: 0, transform: 'scale(0.94)', filter: 'blur(6px)' }, { opacity: target, transform: 'none', filter: 'blur(0)' }],
        { duration: 700, delay: base, easing: EASE_OUT, fill: 'backwards' }
      ));
    }
    // La ilustración entra con un leve zoom de cámara que se asienta.
    screen.querySelectorAll('.mk-illu').forEach((illu) => {
      if (whole) return;
      animations.push(illu.animate(
        [{ opacity: 0, scale: '1.14', filter: 'blur(8px)' }, { opacity: 1, scale: '1', filter: 'blur(0)' }],
        { duration: 1000, delay: base + 60, easing: EASE_OUT, fill: 'backwards' }
      ));
    });
    screen.querySelectorAll('.mk-float').forEach((node, i) => {
      if (!node.getClientRects().length) return;
      animations.push(node.animate(
        [{ opacity: 0, translate: `${i ? -18 : 18}px 0`, scale: '0.9' }, { opacity: 1, translate: '0 0', scale: '1' }],
        { duration: 600, delay: base + 280 + i * 120, easing: EASE_OUT, fill: 'backwards' }
      ));
    });
    return animations;
  }

  function sweep() {
    if (reduced()) return;
    scan.animate(
      [{ transform: 'translateY(-100%)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { transform: 'translateY(100%)', opacity: 0 }],
      { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
    );
  }

  function repaint() {
    if (reduced()) return;
    screen.classList.remove('is-repaint');
    void screen.offsetWidth;
    screen.classList.add('is-repaint');
  }

  // ── Transiciones ──
  async function rebuild(next, wholeArt) {
    const id = ++run;
    const items = textItems();
    const outs = [...exitText(items), ...exitArt({ whole: wholeArt })];
    sweep();
    await done(outs);
    if (id !== run) return;
    commit(next);
    const ins = [...enterText(textItems(), 40), ...enterArt({ whole: wholeArt }, 60)];
    outs.forEach((a) => a.cancel()); // la entrada ya fija la opacidad inicial: no hay parpadeo
    await done(ins);
  }

  // FLIP: el texto se desliza a su nueva posición sin escalarse (no se deforma).
  async function relayout(next) {
    const id = ++run;
    const copy = screen.querySelector('.mk-copy');
    const art = screen.querySelector('.mk-art');
    const first = copy.getBoundingClientRect();
    const artOut = art.animate(
      [{ opacity: getComputedStyle(art).opacity, transform: 'none' }, { opacity: 0, transform: 'scale(0.95)' }],
      { duration: 200, easing: EASE_IN, fill: 'forwards' }
    );
    await done([artOut]);
    if (id !== run) return;
    commit(next, { content: false });
    const last = copy.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const ins = [
      copy.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      ),
      ...enterArt({ whole: true }, 220)
    ];
    artOut.cancel();
    await done(ins);
  }

  async function resize(next) {
    const id = ++run;
    const out = page.animate(
      [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(0.97)', filter: 'blur(4px)' }],
      { duration: 200, easing: EASE_IN, fill: 'forwards' }
    );
    await done([out]);
    if (id !== run) return;
    commit(next);
    await wait(640); // el marco cambia de ancho con su transición CSS
    if (id !== run) return;
    const ins = [...enterText(textItems()), ...enterArt({ whole: true }, 40)];
    out.cancel();
    await done(ins);
  }

  function apply(changes, { announce = false } = {}) {
    const next = { ...state, ...changes };
    const changed = Object.keys(next).filter((key) => next[key] !== state[key]);
    if (!changed.length) return;
    screen.classList.remove('is-live');

    if (announce && status) {
      status.textContent = `Vista previa: ${SECTORS[next.sector].label}, estilo ${LABELS.theme[next.theme]}, composición ${LABELS.layout[next.layout]}, en ${LABELS.device[next.device]}.`;
    }

    // Una transición nueva interrumpe limpiamente la anterior.
    run += 1;
    stopOwnAnimations();

    if (reduced() || !inView) {
      commit(next);
      return;
    }

    const has = (key) => changed.includes(key);
    if (has('theme')) repaint();

    if (has('device')) resize(next);
    else if (has('sector')) rebuild(next, has('layout'));
    else if (has('layout')) relayout(next);
    else commit(next); // solo color: la transición CSS de color se encarga
  }

  function publish() {
    clearTimeout(liveTimer);
    screen.classList.remove('is-live');
    void screen.offsetWidth;
    screen.classList.add('is-live');
    liveTimer = setTimeout(() => screen.classList.remove('is-live'), 3600);
  }

  // ── Modo demostración ──
  function restartTimerBar() {
    studio.classList.remove('is-demo');
    void studio.offsetWidth;
    if (demo) studio.classList.add('is-demo');
  }

  function scheduleDemo() {
    clearTimeout(demoTimer);
    if (!demo || !inView || hold || !built) return;
    restartTimerBar();
    demoTimer = setTimeout(() => {
      const step = DEMO[demoIndex % DEMO.length];
      demoIndex += 1;
      if (step.publish) publish();
      else apply(step);
      scheduleDemo();
    }, DEMO_STEP);
  }

  function stopDemo() {
    if (!demo) return;
    demo = false;
    clearTimeout(demoTimer);
    studio.classList.remove('is-demo');
    if (hint) hint.textContent = 'Modo personalizado. Así quedaría tu página.';
  }

  controls.forEach((button) => {
    button.addEventListener('click', () => {
      stopDemo();
      apply({ [button.dataset.studioSet]: button.dataset.value }, { announce: true });
      emitConversion('web_studio', { [button.dataset.studioSet]: button.dataset.value });
    });
  });

  if (publishButton) {
    publishButton.addEventListener('click', () => {
      stopDemo();
      publish();
      if (status) status.textContent = `Página de ejemplo publicada en ${SECTORS[state.sector].domain}.`;
      emitConversion('web_studio_publish', { ...state });
    });
  }

  if (stage) {
    stage.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      hold = true;
      studio.classList.add('is-hold');
      clearTimeout(demoTimer);
    });
    stage.addEventListener('pointerleave', () => {
      hold = false;
      studio.classList.remove('is-hold');
      scheduleDemo();
    });
  }

  // Entrada inicial: esqueleto → la página se construye en cascada.
  function build() {
    if (built) return;
    built = true;
    if (reduced()) {
      screen.classList.remove('is-skeleton');
      return;
    }
    setTimeout(() => {
      screen.classList.remove('is-skeleton');
      enterText(textItems());
      enterArt({ whole: true }, 80);
      sweep();
      scheduleDemo();
    }, 1000);
  }

  commit({ ...state });

  if (reduced()) {
    demo = false;
    if (hint) hint.textContent = 'Elige una opción para diseñar tu página.';
  }

  if ('IntersectionObserver' in window) {
    studio.classList.add('is-offscreen');
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      studio.classList.toggle('is-offscreen', !inView);
      if (inView) {
        build();
        scheduleDemo();
      } else {
        clearTimeout(demoTimer);
      }
    }, { threshold: 0.3 }).observe(studio);
  } else {
    inView = true;
    build();
  }
})();

// Foco de luz que sigue al ratón en las tarjetas de planes
document.querySelectorAll('[data-spotlight]').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }, { passive: true });
});

// Los CTA precargan el mensaje del formulario. Solo se reemplaza si está vacío
// o si contiene un texto precargado antes (nunca lo que escribió la persona).
let lastPrefillMessage = '';
document.querySelectorAll('[data-prefill-message]').forEach((link) => {
  link.addEventListener('click', () => {
    const message = document.getElementById('mensaje');
    if (!message) return;
    const current = message.value.trim();
    if (!current || current === lastPrefillMessage) {
      message.value = link.dataset.prefillMessage;
      lastPrefillMessage = link.dataset.prefillMessage;
    }
  });
});

function restartClass(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // fuerza reflow para reiniciar las animaciones CSS
  element.classList.add(className);
}

// Recorrido del panel: capturas reales del CRM que avanzan solas.
// Cambian cada 3 s mientras el panel está en pantalla; elegir una pestaña
// reinicia la cuenta. Respeta prefers-reduced-motion (ahí solo cambian con las pestañas).
const panelTour = document.querySelector('[data-panel-tour]');
if (panelTour) {
  const PANEL_DURATION = 3000;
  const tabs = [...panelTour.querySelectorAll('[data-panel-tab]')];
  const shots = [...panelTour.querySelectorAll('[data-panel-shot]')];
  const urlLabel = panelTour.querySelector('[data-panel-url]');
  const stage = panelTour.querySelector('.panel-stage');
  let current = 0;
  let timer = null;
  let onScreen = false;

  panelTour.style.setProperty('--panel-duration', `${PANEL_DURATION}ms`);

  const showPanel = (index) => {
    const changed = ((index + tabs.length) % tabs.length) !== current;
    current = (index + tabs.length) % tabs.length;
    if (changed && stage) restartClass(stage, 'is-switching');
    const key = tabs[current].dataset.panelTab;
    tabs.forEach((tab, i) => {
      const active = i === current;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
      // reinicia la barra de progreso de la pestaña activa
      if (active) restartClass(tab, 'is-active');
    });
    shots.forEach((shot) => shot.classList.toggle('is-active', shot.dataset.panelShot === key));
    if (urlLabel) urlLabel.textContent = tabs[current].dataset.url;
  };

  const stop = () => {
    window.clearTimeout(timer);
    timer = null;
  };

  const schedule = () => {
    stop();
    const autoplay = onScreen && !prefersReducedMotion.matches;
    panelTour.classList.toggle('is-autoplay', autoplay);
    panelTour.classList.toggle('is-paused', !autoplay);
    if (!autoplay) return;
    timer = window.setTimeout(() => {
      showPanel(current + 1);
      schedule();
    }, PANEL_DURATION);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      showPanel(index);
      schedule();
      emitConversion('panel_tab', { label: tab.dataset.panelTab });
    });
  });

  prefersReducedMotion.addEventListener?.('change', schedule);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) showPanel(current);
      schedule();
    }, { threshold: 0.35 }).observe(panelTour);
  }
}

// Cinta de capacidades: duplica la lista para un desplazamiento continuo.
// La copia es decorativa (oculta a lectores de pantalla y buscadores no la indexan como texto propio).
document.querySelectorAll('.web-marquee-track').forEach((track) => {
  const list = track.querySelector('ul');
  if (!list || track.children.length > 1) return;
  const copy = list.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.append(copy);
});

// Del caos al orden: animación en vivo (60 fps) que se repite en bucle
(() => {
  const section = document.querySelector('[data-scrolly]');
  if (!section) return;
  const stage = section.querySelector('.scrolly-stage');
  const canvas = section.querySelector('.scrolly-canvas');
  const ctx = canvas.getContext('2d');
  const steps = Array.from(section.querySelectorAll('.scrolly-steps li'));
  const phases = Array.from(section.querySelectorAll('.scrolly-phases li'));
  const BG = '#0d0f13';
  const COL = { a: '#10d18a', soft: '#a6edcb', text: '#e8f2ee', muted: '#92aba1' };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const outBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // Guion (segundos → progreso de la escena) y bucle
  const SEG = [[0, 2.8, 0, 0.27, easeOut], [2.8, 6.4, 0.27, 0.74, ease], [6.4, 8.6, 0.74, 1, easeOut]];
  const END = 8.6, HOLD = 12.2, CYCLE = 12.8, FADE_IN = 0.45;
  const STEP_AT = [0, 2.6, 6.3];
  const uAt = (t) => { for (const [a, b, u0, u1, e] of SEG) if (t <= b) return lerp(u0, u1, e(clamp((t - a) / (b - a)))); return 1; };

  // Composición horizontal (computador) y vertical (celular), con su zona útil
  const SETS = { desktop: { w: 1600, h: 800, safe: [0.08, 0.06, 0.93, 0.95] }, mobile: { w: 720, h: 1000, safe: [0.04, 0.05, 0.96, 0.96] } };
  // Tarjetas que flotan alrededor del logo: centro relativo al logo (en anchos de logo)
  const ORBIT = { desktop: [[-0.95, -0.3], [0.98, -0.02], [-0.8, 0.52]], mobile: [[-0.22, -0.6], [0.24, 0.5], [-0.2, 0.76]] };
  const sidePad = (w) => Math.max(18, w * 0.045);
  const fitArea = (name, bw, bh) => { const f = SETS[name], [x0, y0, x1, y1] = f.safe; const s = Math.min((bw - sidePad(bw) * 2) / (f.w * (x1 - x0)), bh / (f.h * (y1 - y0))); return f.w * (x1 - x0) * s * f.h * (y1 - y0) * s; };
  const wantSet = () => { const w = stage.clientWidth, h = Math.max(1, stage.clientHeight); return fitArea('mobile', w, h) > fitArea('desktop', w, h) * 1.05 ? 'mobile' : 'desktop'; };

  const MSGS = ['¿Tienen cita hoy?', '¿Cuánto vale?', 'Hola, ¿me ayudan?', '¿Hacen envíos?', '¿Siguen abiertos?', 'Quiero comprar', '¿Me pueden llamar?', '¿Hay disponibilidad?', '¿Precio del plan?', 'Necesito información', '¿Aceptan tarjeta?', '¿Dónde quedan?'];
  const NAMES = ['Laura', 'Andrés', 'Valentina', 'Camila', 'Sebastián', 'Mariana', 'Juan Pablo', 'Sofía', 'Daniel', 'Isabella', 'Mateo', 'Paula'];
  const AV = ['#e07a5f', '#3d5a80', '#81b29a', '#6d597a', '#c08552', '#355070', '#b56576', '#588157'];
  const N = 260, SS = 2;
  const BRAIN = [-0.263,0.393,0.111,0.407,-0.140,-0.426,-0.049,0.045,0.103,0.263,0.278,-0.080,-0.027,0.335,-0.138,-0.019,-0.409,0.237,0.333,-0.136,-0.379,-0.045,-0.045,-0.375,-0.387,0.115,0.272,-0.397,-0.148,-0.179,-0.191,-0.327,0.374,0.119,-0.327,-0.064,0.191,0.247,0.241,0.364,0.138,0.313,-0.177,0.366,-0.294,-0.214,0.449,0.204,-0.206,0.309,0.259,-0.276,-0.084,-0.163,-0.148,-0.282,0.177,0.189,-0.060,-0.222,-0.401,-0.109,-0.035,0.237,0.360,0.261,-0.268,0.175,0.084,-0.405,0.241,0.307,0.062,0.335,-0.444,0.235,-0.366,0.251,0.175,-0.255,-0.058,-0.305,0.247,0.235,0.086,-0.333,0.138,-0.037,-0.232,-0.152,0.181,-0.189,0.060,0.095,0.263,0.029,-0.212,-0.282,-0.074,0.399,-0.255,-0.066,-0.364,-0.161,-0.321,0.173,0.424,-0.062,-0.212,-0.099,0.082,0.294,-0.340,0.148,-0.132,0.350,0.284,-0.204,0.027,0.354,-0.088,0.136,0.226,0.331,-0.239,-0.113,-0.111,0.204,0.340,-0.088,-0.381,0.212,0.304,-0.311,-0.163,-0.385,-0.191,-0.053,0.284,-0.136,-0.150,-0.333,-0.097,-0.010,0.337,-0.179,0.204,-0.403,0.097,-0.294,-0.319,-0.239,0.181,0.333,0.230,0.414,-0.327,-0.016,0.274,-0.025,-0.113,0.093,0.126,0.214,0.230,-0.354,0.342,0.317,-0.214,0.426,-0.239,-0.179,0.115,0.130,-0.109,-0.288,0.362,0.348,0.366,-0.232,0.169,-0.014,0.074,0.023,0.148,-0.360,-0.302,-0.119,0.208,-0.321,0.455,-0.054,-0.391,0.004,-0.076,0.193,-0.249,-0.018,-0.389,0.288,-0.070,-0.422,0.237,-0.230,0.082,0.414,-0.307,-0.294,0.387,0.300,-0.193,0.161,0.101,0.165,-0.084,-0.370,0.230,-0.018,0.315,0.274,0.093,-0.183,0.202,0.311,-0.185,-0.411,0.208,0.165,-0.043,-0.198,0.233,-0.261,-0.130,0.296,-0.218,0.016,0.107,-0.216,-0.064,0.333,0.424,0.132,-0.354,-0.074,-0.134,0.142,-0.385,0.337,0.066,-0.257,0.031,-0.342,0.391,-0.035,-0.311,0.352,-0.039,-0.037,-0.117,-0.253,-0.232,-0.379,-0.304,0.125,-0.121,0.430,0.152,-0.140,0.146,-0.173,0.130,-0.115,-0.296,0.268,-0.259,-0.335,0.144,0.148,0.352,0.086,-0.249,0.305,0.115,-0.442,-0.444,-0.089,-0.146,0.072,0.053,-0.185,0.191,-0.377,0.185,0.286,0.167,-0.327,0.243,-0.323,-0.241,0.150,-0.183,-0.364,0.274,-0.327,-0.438,0.107,-0.436,0.265,-0.119,-0.208,0.196,-0.134,-0.432,-0.049,-0.047,0.181,-0.270,0.123,0.228,0.206,0.175,0.411,0.031,0.154,-0.179,-0.282,0.298,0.375,0.084,-0.099,0.309,0.142,0.132,-0.414,-0.393,-0.177,-0.202,-0.212,0.097,0.097,-0.342,0.193,-0.117,-0.177,-0.062,0.224,0.035,-0.066,-0.233,0.263,0.181,-0.086,-0.158,-0.123,0.047,0.185,0.253,0.189,0.216,-0.181,-0.191,-0.004,-0.243,-0.280,-0.272,0.253,-0.165,0.119,0.329,-0.218,-0.113,-0.047,-0.163,0.393,-0.222,-0.411,-0.161,0.331,0.259,0.397,0.228,-0.123,0.206,0.002,-0.060,0.119,0.319,0.179,-0.043,0.012,-0.352,0.099,-0.086,0.047,-0.245,0.224,-0.107,-0.346,0.035,0.313,0.074,0.058,0.292,0.253,-0.195,-0.177,-0.261,-0.206,0.405,-0.138,-0.288,-0.247,-0.309,0.041,-0.196,-0.126,-0.428,0.202,-0.436,0.148,0.051,-0.387,-0.411,0.097,0.035,-0.117,0.440,-0.125,0.091,0.196,0.082,-0.053,0.249,0.144,0.354,0.000,-0.372,-0.101,0.311,-0.115,-0.037,0.095,-0.331,0.247,-0.399,0.163,-0.325,-0.097,0.362,-0.134,0.037,-0.156,-0.311,-0.175,0.282,0.208,0.058,-0.319,0.469,0.150,-0.307,-0.339,-0.344,0.311,0.321,0.208,0.125,-0.307,0.399,-0.187,0.288,0.321,-0.253,-0.241,-0.111,0.167,0.389,0.220,-0.193,0.337,0.183,-0.350,0.163,-0.434,-0.426,-0.019,0.261,-0.161,0.447,0.241,0.146,0.350,0.315,-0.278,-0.282,0.027,-0.099,-0.128,0.191,0.031,0.358,0.195,-0.191,0.228,0.397,-0.091,-0.278,-0.023,-0.093,0.270,0.311,0.033,0.253,-0.200,0.080,0.379,-0.117,0.012,-0.366,0.027]; // nodos de la red y escala de los dibujos prerrenderizados
  const TILES = [['Conversaciones', '386', 'Respondidas con contexto'], ['Citas', '41', 'En la agenda del equipo'], ['Pedidos', '54', 'Registrados automáticamente']];

  let logo, logoAR = 1, glow, sphere = [], neigh = [], targets = [];
  const scenes = {};
  let scene = null, dpr = 1, t = 0, now = 0, last = 0, raf = 0, visible = false, ready = false, done = false;

  function makeGlow() {
    const g = document.createElement('canvas'); g.width = g.height = 64; const c = g.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(240,255,248,1)'); gr.addColorStop(0.18, 'rgba(16,209,138,0.95)'); gr.addColorStop(0.5, 'rgba(16,209,138,0.22)'); gr.addColorStop(1, 'rgba(16,209,138,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return g;
  }

  function cardSprite(card) {
    const { w, h } = card, pad = h * 0.6;
    const cv = document.createElement('canvas'); cv.width = Math.ceil((w + pad * 2) * SS); cv.height = Math.ceil((h + pad * 2) * SS);
    const X = cv.getContext('2d'); X.scale(SS, SS); X.translate(pad + w / 2, pad + h / 2);
    X.shadowColor = 'rgba(0,0,0,0.45)'; X.shadowBlur = h * 0.5 * SS; X.shadowOffsetY = h * 0.15 * SS;
    X.fillStyle = '#18222a'; X.beginPath(); X.roundRect(-w / 2, -h / 2, w, h, h * 0.28); X.fill(); X.shadowColor = 'transparent';
    X.strokeStyle = 'rgba(255,255,255,0.08)'; X.lineWidth = 1.2; X.stroke();
    const ar = h * 0.27;
    X.fillStyle = card.av; X.beginPath(); X.arc(-w / 2 + h * 0.48, 0, ar, 0, 7); X.fill();
    X.fillStyle = '#fff'; X.font = `700 ${ar * 0.95}px Poppins`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(card.name[0], -w / 2 + h * 0.48, ar * 0.05);
    X.textAlign = 'left'; X.fillStyle = COL.text; X.font = `600 ${h * 0.2}px Inter`; X.fillText(card.name, -w / 2 + h * 0.9, -h * 0.14);
    X.fillStyle = COL.muted; X.font = `400 ${h * 0.18}px Inter`; X.fillText(card.msg, -w / 2 + h * 0.9, h * 0.16);
    X.fillStyle = '#25d366'; X.beginPath(); X.arc(w / 2 - h * 0.32, 0, h * 0.15, 0, 7); X.fill();
    X.fillStyle = '#04140d'; X.font = `800 ${h * 0.17}px Inter`; X.textAlign = 'center'; X.fillText(String(card.n), w / 2 - h * 0.32, h * 0.01);
    card.sprite = cv; card.sw = w + pad * 2; card.sh = h + pad * 2;
  }

  function buildScene(name) {
    const { w: W, h: H } = SETS[name], portrait = H > W;
    const M = Math.min(W, H), cx = W / 2, cy = H * (portrait ? 0.47 : 0.5);
    const r = rng(21), NC = portrait ? 30 : 42;
    const cw = portrait ? W * 0.42 : W * 0.15, ch = cw * 0.36, cards = [];
    for (let i = 0; i < NC; i++) {
      let x, y, tries = 0;
      do { x = cw * 0.55 + r() * (W - cw * 1.1); y = ch * 0.7 + r() * (H - ch * 1.4); tries++; } while (tries < 40 && cards.some((c) => Math.abs(c.x - x) < cw * 0.8 && Math.abs(c.y - y) < ch * 1.1));
      const card = { x, y, w: cw * (0.85 + r() * 0.25), h: ch, rot: (r() - 0.5) * 0.16, ph: r() * 6.28, msg: MSGS[i % MSGS.length], name: NAMES[(i * 5) % NAMES.length], av: AV[i % AV.length], n: 1 + Math.floor(r() * 6), d: r() * 0.12 };
      cardSprite(card); cards.push(card);
    }
    // isotipo con su brillo, dibujado una sola vez
    const LW = M * (portrait ? 0.78 : 0.62), lpad = M * 0.12;
    const lc = document.createElement('canvas'); lc.width = Math.ceil((LW + lpad * 2) * SS); lc.height = Math.ceil((LW * logoAR + lpad * 2) * SS);
    const L = lc.getContext('2d'); L.scale(SS, SS); L.shadowColor = 'rgba(16,209,138,0.38)'; L.shadowBlur = M * 0.05 * SS;
    L.drawImage(logo, lpad, lpad, LW, LW * logoAR);
    return { name, W, H, portrait, M, cx, cy, cards, LW, lpad, logoSprite: lc };
  }

  async function init() {
    await Promise.all(['700 20px Poppins', '600 20px Inter', '400 20px Inter', '800 20px Inter'].map((f) => document.fonts.load(f).catch(() => {})));
    logo = new Image(); logo.src = 'assets/logo-brain.webp';
    await (logo.decode ? logo.decode() : new Promise((res, rej) => { logo.onload = res; logo.onerror = rej; }));
    logoAR = logo.height / logo.width;
    glow = makeGlow();
    for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - y * y), th = i * 2.399963; sphere.push([Math.cos(th) * rr, y, Math.sin(th) * rr]); }
    for (let i = 0; i < N; i++) { const d = sphere.map((q, j) => [j, (q[0] - sphere[i][0]) ** 2 + (q[1] - sphere[i][1]) ** 2 + (q[2] - sphere[i][2]) ** 2]).sort((a, b) => a[1] - b[1]); neigh.push(d.slice(1, 4).map((x) => x[0])); }
    // Forma del cerebro precalculada a partir del isotipo (no se leen píxeles del logo:
    // el navegador lo bloquea al abrir la página como archivo local).
    for (let i = 0; i < N; i++) targets.push([BRAIN[i * 2], BRAIN[i * 2 + 1]]);
  }

  function drawScene(u) {
    const S = scene, { M, cx, cy, W, H, portrait } = S;
    const R = M * (portrait ? 0.34 : 0.32), ry = u * 5.2, rx = 0.36;
    const morph = ease(p(u, 0.52, 0.76));
    const cY = Math.cos(ry), sY = Math.sin(ry), cA = Math.cos(rx), sA = Math.sin(rx);
    const nodes = new Array(N);
    for (let i = 0; i < N; i++) {
      const [x, y, z] = sphere[i];
      const x1 = x * cY + z * sY, z1 = -x * sY + z * cY, y1 = y * cA - z1 * sA, z2 = y * sA + z1 * cA, f = 1 / (1 + z2 * 0.38);
      const tx = cx + targets[i][0] * S.LW, ty = cy + targets[i][1] * S.LW;
      nodes[i] = { x: lerp(cx + x1 * R * f, tx, morph), y: lerp(cy + y1 * R * f, ty, morph), z: lerp(z2, 0, morph), f: lerp(f, 1, morph) };
    }
    // mensajes que viajan hacia la red
    S.cards.forEach((c, i) => {
      const k = ease(p(u, 0.2 + c.d, 0.42 + c.d));
      const appear = outBack(p(u, c.d * 0.5 - 0.06, c.d * 0.5 + 0.04));
      if (k >= 1 || appear <= 0) return;
      const node = nodes[(i * 6) % N];
      const fx = Math.sin(u * 9 + c.ph) * M * 0.012 * (1 - k), fy = Math.cos(u * 7 + c.ph) * M * 0.01 * (1 - k);
      const sc = lerp(appear, 0.05, k);
      ctx.save(); ctx.globalAlpha = clamp(appear) * (1 - p(k, 0.6, 1));
      ctx.translate(lerp(c.x + fx, node.x, k), lerp(c.y + fy, node.y, k)); ctx.rotate(c.rot * (1 - k)); ctx.scale(sc, sc);
      ctx.drawImage(c.sprite, -c.sw / 2, -c.sh / 2, c.sw, c.sh);
      ctx.restore();
    });
    // red neuronal: líneas agrupadas por intensidad (pocos trazos por fotograma)
    const netIn = ease(p(u, 0.32, 0.5)), netOut = 1 - p(u, 0.78, 0.88);
    const lineA = 0.3 * netIn * (1 - morph * 0.7) * netOut, nodeA = netIn * netOut;
    if (nodeA > 0) {
      ctx.lineWidth = Math.max(1, M / 900);
      const buckets = [[], [], [], [], []];
      for (let i = 0; i < N; i++) for (const j of neigh[i]) {
        if (j < i) continue; const a = nodes[i], b = nodes[j];
        const q = clamp(0.3 + (1 - (a.z + b.z) / 2) * 0.4, 0.3, 0.7);
        buckets[Math.round((q - 0.3) / 0.4 * 4)].push(a.x, a.y, b.x, b.y);
      }
      buckets.forEach((seg, k) => {
        if (!seg.length) return;
        ctx.strokeStyle = `rgba(16,209,138,${(lineA * (0.3 + k * 0.1)).toFixed(3)})`;
        ctx.beginPath(); for (let n = 0; n < seg.length; n += 4) { ctx.moveTo(seg[n], seg[n + 1]); ctx.lineTo(seg[n + 2], seg[n + 3]); } ctx.stroke();
      });
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) { const q = nodes[i]; const s = M * (0.006 + 0.006 * q.f) * lerp(1, 0.6, morph); ctx.globalAlpha = nodeA * clamp(0.35 + (1 - q.z) * 0.5); ctx.drawImage(glow, q.x - s, q.y - s, s * 2, s * 2); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // isotipo
    const li = ease(p(u, 0.74, 0.84));
    if (li > 0) {
      const k = lerp(0.92, 1, ease(p(u, 0.74, 0.9))), lw = S.LW * k, ly = cy + Math.sin(now * 1.1) * M * 0.008 * li;
      ctx.globalAlpha = li;
      ctx.drawImage(S.logoSprite, cx - (S.LW / 2 + S.lpad) * k, ly - (S.LW * logoAR / 2 + S.lpad) * k, (S.LW + S.lpad * 2) * k, (S.LW * logoAR + S.lpad * 2) * k);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(16,209,138,${0.35 * li})`; ctx.lineWidth = Math.max(1.5, M / 600); ctx.setLineDash([3, 12]);
      ctx.beginPath(); ctx.ellipse(cx, ly, lw * 0.78, lw * 0.78 * 0.34, -0.2, 0, Math.PI * 2 * li); ctx.stroke(); ctx.setLineDash([]);
    }
    // tres tarjetas del panel
    TILES.forEach(([lab, val, sub], i) => {
      const k = outBack(p(u, 0.83 + i * 0.035, 0.93 + i * 0.035)); if (k <= 0) return;
      const [ox, oy] = ORBIT[S.name][i], tw = portrait ? W * 0.54 : W * 0.215, th = portrait ? H * 0.108 : H * 0.125;
      const fx = Math.cos(now * 0.8 + i * 1.7) * M * 0.006, fy = Math.sin(now * 1.05 + i * 2.1) * M * 0.014;
      const tcx = cx + ox * S.LW + fx, tcy = cy + oy * S.LW + fy, tx = tcx - tw / 2, ty = tcy - th / 2;
      // hilo que une cada tarjeta con el logo
      ctx.save(); ctx.globalAlpha = clamp(k) * 0.5; ctx.strokeStyle = 'rgba(16,209,138,0.55)'; ctx.lineWidth = Math.max(1.2, M / 700); ctx.setLineDash([2, 7]);
      ctx.beginPath(); ctx.moveTo(tcx, tcy); ctx.lineTo(lerp(tcx, cx, 0.62), lerp(tcy, cy, 0.62)); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(tx + tw / 2, ty + th / 2); ctx.scale(lerp(0.85, 1, k), lerp(0.85, 1, k)); ctx.translate(-(tx + tw / 2), -(ty + th / 2) + (1 - clamp(k)) * th * 0.6);
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = th * 0.5; ctx.shadowOffsetY = th * 0.12;
      ctx.fillStyle = 'rgba(18,26,31,0.92)'; ctx.strokeStyle = 'rgba(16,209,138,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, th * 0.22); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.stroke();
      const ic = th * 0.36; ctx.fillStyle = 'rgba(16,209,138,0.16)'; ctx.beginPath(); ctx.roundRect(tx + th * 0.18, ty + th / 2 - ic / 2, ic, ic, ic * 0.3); ctx.fill();
      ctx.strokeStyle = COL.a; ctx.lineWidth = Math.max(2, ic * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(tx + th * 0.18 + ic * 0.26, ty + th / 2); ctx.lineTo(tx + th * 0.18 + ic * 0.44, ty + th / 2 + ic * 0.18); ctx.lineTo(tx + th * 0.18 + ic * 0.76, ty + th / 2 - ic * 0.18); ctx.stroke();
      const tx2 = tx + th * 0.18 + ic + th * 0.18;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = COL.muted; ctx.font = `500 ${th * 0.17}px Inter`; ctx.fillText(lab, tx2, ty + th * 0.3);
      ctx.fillStyle = COL.text; ctx.font = `700 ${th * 0.3}px Poppins`; ctx.fillText(val, tx2, ty + th * 0.6);
      const vw = ctx.measureText(val).width; let fs = th * 0.15; ctx.font = `500 ${fs}px Inter`; const room = tx + tw - th * 0.18 - (tx2 + vw + th * 0.12);
      while (ctx.measureText(sub).width > room && fs > th * 0.1) { fs -= 0.5; ctx.font = `500 ${fs}px Inter`; }
      if (ctx.measureText(sub).width <= room) { ctx.fillStyle = COL.soft; ctx.fillText(sub, tx2 + vw + th * 0.12, ty + th * 0.62); }
      ctx.restore();
    });
  }

  function size() {
    // en pantallas pequeñas una resolución interna algo menor mantiene la fluidez sin perder nitidez visible
    dpr = Math.min(window.devicePixelRatio || 1, canvas.clientWidth < 700 ? 1.5 : 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const name = wantSet();
    scene = scenes[name] || (scenes[name] = buildScene(name));
  }

  function ui(time) {
    const u = uAt(time);
    section.style.setProperty('--p', u.toFixed(4));
    const stepIdx = STEP_AT.reduce((acc, at, i) => (time >= at ? i : acc), 0);
    steps.forEach((li, i) => li.classList.toggle('is-active', i === stepIdx));
    phases.forEach((li, i) => {
      const [a, b] = SEG[i], f = clamp((time - a) / (b - a));
      li.style.setProperty('--f', f.toFixed(3));
      li.classList.toggle('is-active', f > 0 && f < 1);
      li.classList.toggle('is-done', f >= 1);
    });
    if (time >= END && !done) { done = true; section.classList.add('is-done'); }
    return u;
  }

  function render(time) {
    const u = ui(time);
    const cw = canvas.width, ch = canvas.height, f = SETS[scene.name], [x0, y0, x1, y1] = f.safe;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch);
    const pad = sidePad(canvas.clientWidth) * dpr;
    const s = Math.min((cw - pad * 2) / (f.w * (x1 - x0)), ch / (f.h * (y1 - y0)));
    ctx.setTransform(s, 0, 0, s, cw / 2 - ((x0 + x1) / 2) * f.w * s, ch / 2 - ((y0 + y1) / 2) * f.h * s);
    now = time;
    drawScene(u);
    // fundido suave al cerrar y abrir cada vuelta del bucle
    const fade = time > HOLD ? p(time, HOLD, CYCLE) : 1 - p(time, 0, FADE_IN);
    if (fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = fade; ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
  }

  function tick(now) {
    raf = 0;
    if (!visible) return;
    t += Math.min(0.05, (now - last) / 1000); last = now;
    if (t >= CYCLE) t -= CYCLE;
    render(t);
    raf = requestAnimationFrame(tick);
  }

  function play() { if (!ready || raf || !visible || prefersReducedMotion.matches) return; last = performance.now(); raf = requestAnimationFrame(tick); }

  let preparing = false;
  async function prepare() {
    if (ready || preparing) return;
    preparing = true;
    try { await init(); size(); ready = true; } catch (err) { preparing = false; console.warn('Animación del caos al orden:', err); return; }
    if (prefersReducedMotion.matches) { t = END; render(t); return; }
    render(t); play();
  }

  new IntersectionObserver(([entry]) => { if (entry.isIntersecting) prepare(); }, { rootMargin: '100% 0px' }).observe(section);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0.2 }).observe(stage);

  window.addEventListener('resize', () => { if (!ready) return; size(); render(t); });
  prefersReducedMotion.addEventListener?.('change', () => { if (!ready) return; if (prefersReducedMotion.matches) { t = END; render(t); } else play(); });
})();
