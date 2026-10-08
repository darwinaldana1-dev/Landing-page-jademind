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
    if (window.innerWidth > 1024) closeMenu();
  });
}

// Circuito Jade · consola en vivo
const CIRCUIT_CONTENT = {
  captar: {
    kicker: 'Etapa 01 · Captar',
    title: 'Cada canal entra al mismo recorrido.',
    text: 'La conversación puede comenzar desde una landing, un anuncio o un acceso directo a WhatsApp sin perder el origen del prospecto.',
    items: ['Identificación del canal de entrada', 'Mensaje inicial adaptado al contexto', 'Continuidad entre web y WhatsApp'],
    log: 'lead.created  origen=meta_ads  canal=whatsapp'
  },
  conversar: {
    kicker: 'Etapa 02 · Conversar',
    title: 'La primera respuesta llega con contexto.',
    text: 'El agente utiliza la información aprobada del negocio para orientar la conversación y reconocer qué necesita la persona.',
    items: ['Respuestas basadas en conocimiento autorizado', 'Tono y reglas definidos para la marca', 'Preguntas progresivas, no un formulario rígido'],
    log: 'agent.reply  latencia=2.8s  fuente=catalogo_servicios'
  },
  calificar: {
    kicker: 'Etapa 03 · Calificar',
    title: 'Cada respuesta prepara la siguiente decisión.',
    text: 'El flujo recopila solo los datos necesarios para identificar intención, prioridad y encaje con la oferta.',
    items: ['Criterios de calificación acordados', 'Campos estructurados para seguimiento', 'Detección de excepciones y datos faltantes'],
    log: 'lead.scored  puntaje=87  prioridad=alta'
  },
  convertir: {
    kicker: 'Etapa 04 · Avanzar',
    title: 'La oportunidad pasa a la acción adecuada.',
    text: 'Cuando se cumplen las condiciones, el prospecto puede agendar, recibir una instrucción concreta o hablar con una persona.',
    items: ['Agenda conectada con disponibilidad real', 'Transferencia humana con contexto', 'Siguiente paso explícito para el prospecto'],
    log: 'meeting.booked  jue 10:30  asignado=andres'
  },
  registrar: {
    kicker: 'Etapa 05 · Registrar',
    title: 'El resultado no queda perdido en el chat.',
    text: 'La información útil puede enviarse al CRM, una hoja operativa o la herramienta definida para que el equipo continúe el proceso.',
    items: ['Resumen de la conversación', 'Estado y datos relevantes del prospecto', 'Base para seguimiento y mejora del flujo'],
    log: 'crm.sync  estado=ok  campos=12  resumen=listo'
  }
};

const circuitShell = document.querySelector('[data-circuit]');
const circuitStage = document.getElementById('circuit-detail');
const circuitCopy = document.getElementById('circuit-copy');
const circuitKicker = document.getElementById('circuit-kicker');
const circuitTitle = document.getElementById('circuit-detail-title');
const circuitText = document.getElementById('circuit-detail-text');
const circuitList = document.getElementById('circuit-detail-list');
const circuitLog = document.getElementById('circuit-log');
const circuitCounter = document.getElementById('circuit-counter');
const circuitToggle = document.querySelector('.console-toggle');
const circuitStepsRail = document.querySelector('.circuit-steps');
const circuitButtons = Array.from(document.querySelectorAll('.circuit-step'));
const circuitOrder = circuitButtons.map((button) => button.dataset.step);
const circuitScenes = new Map(
  Array.from(document.querySelectorAll('.scene[data-scene]')).map((scene) => [scene.dataset.scene, scene])
);
let circuitCurrent = circuitOrder[0];
let circuitLogTimer = 0;
let circuitCountFrame = 0;

function restartClass(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // fuerza reflow para reiniciar las animaciones CSS
  element.classList.add(className);
}

function typeCircuitLog(text) {
  if (!circuitLog) return;
  clearTimeout(circuitLogTimer);
  if (prefersReducedMotion.matches) {
    circuitLog.textContent = text;
    return;
  }
  let length = 0;
  const tick = () => {
    length += 2;
    circuitLog.textContent = text.slice(0, length);
    if (length < text.length) circuitLogTimer = setTimeout(tick, 26);
  };
  circuitLog.textContent = '';
  circuitLogTimer = setTimeout(tick, 250);
}

function countUp(element) {
  cancelAnimationFrame(circuitCountFrame);
  const target = Number(element.dataset.count) || 0;
  if (prefersReducedMotion.matches) {
    element.textContent = String(target);
    return;
  }
  const start = performance.now();
  const delay = 400;
  const duration = 2000;
  const step = (now) => {
    const progress = Math.min(1, Math.max(0, (now - start - delay) / duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(target * eased));
    if (progress < 1) circuitCountFrame = requestAnimationFrame(step);
  };
  element.textContent = '0';
  circuitCountFrame = requestAnimationFrame(step);
}

function selectCircuitStep(key, { fromUser = false } = {}) {
  const content = CIRCUIT_CONTENT[key];
  if (!content || !circuitStage) return;
  circuitCurrent = key;
  circuitStage.dataset.active = key;

  if (circuitCopy) {
    // Solo se anuncia a lectores de pantalla cuando la persona elige la etapa.
    circuitCopy.setAttribute('aria-live', fromUser ? 'polite' : 'off');
    circuitKicker.textContent = content.kicker;
    circuitTitle.textContent = content.title;
    circuitText.textContent = content.text;
    circuitList.replaceChildren(...content.items.map((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      return listItem;
    }));
    restartClass(circuitCopy, 'is-swapping');
  }

  circuitScenes.forEach((scene, sceneKey) => {
    if (sceneKey === key) restartClass(scene, 'is-active');
    else scene.classList.remove('is-active');
  });

  const counter = circuitScenes.get(key)?.querySelector('[data-count]');
  if (counter) countUp(counter);

  const index = circuitOrder.indexOf(key);
  if (circuitCounter) circuitCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(circuitOrder.length).padStart(2, '0')}`;
  typeCircuitLog(content.log);

  circuitButtons.forEach((button) => {
    const active = button.dataset.step === key;
    button.setAttribute('aria-pressed', String(active));
    if (active) restartClass(button, 'is-active');
    else button.classList.remove('is-active');

    // En móvil las etapas son un carril horizontal: mantener visible la activa.
    if (active && circuitStepsRail && circuitStepsRail.scrollWidth > circuitStepsRail.clientWidth) {
      circuitStepsRail.scrollTo({
        left: button.offsetLeft - 8,
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
      });
    }
  });
}

circuitButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectCircuitStep(button.dataset.step, { fromUser: true });
    emitConversion('circuit_step', { step: button.dataset.step });
  });
});

if (circuitShell) {
  const setAutoplay = () => {
    circuitShell.classList.toggle('is-autoplay', !prefersReducedMotion.matches);
  };
  setAutoplay();
  prefersReducedMotion.addEventListener?.('change', setAutoplay);

  // Avanza cuando termina la barra de progreso de la etapa activa.
  circuitShell.addEventListener('animationend', (event) => {
    if (!event.target.matches('.step-progress i')) return;
    if (!circuitShell.classList.contains('is-autoplay')) return;
    const next = circuitOrder[(circuitOrder.indexOf(circuitCurrent) + 1) % circuitOrder.length];
    selectCircuitStep(next);
  });

  // Pausa mientras el ratón o el foco están sobre la sección.
  circuitShell.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') circuitShell.classList.add('is-hold');
  });
  circuitShell.addEventListener('pointerleave', () => circuitShell.classList.remove('is-hold'));
  circuitShell.addEventListener('focusin', () => circuitShell.classList.add('is-hold'));
  circuitShell.addEventListener('focusout', (event) => {
    if (!circuitShell.contains(event.relatedTarget)) circuitShell.classList.remove('is-hold');
  });

  if (circuitToggle) {
    circuitToggle.addEventListener('click', () => {
      const paused = circuitShell.classList.toggle('is-user-paused');
      circuitToggle.setAttribute('aria-pressed', String(paused));
      circuitToggle.setAttribute('aria-label', paused ? 'Reanudar recorrido automático' : 'Pausar recorrido automático');
    });
  }

  // Todo queda congelado fuera de pantalla y arranca al entrar en ella.
  if ('IntersectionObserver' in window) {
    let firstView = true;
    circuitShell.classList.add('is-offscreen');
    new IntersectionObserver((entries) => {
      const visible = entries[entries.length - 1].isIntersecting;
      circuitShell.classList.toggle('is-offscreen', !visible);
      if (visible && firstView) {
        firstView = false;
        selectCircuitStep(circuitCurrent);
      }
    }, { threshold: 0.3 }).observe(circuitShell);
  }
}

selectCircuitStep(circuitCurrent);

// El video solo consume recursos de reproducción mientras está visible.
const demoVideo = document.querySelector('.video-frame video');
if (demoVideo && 'IntersectionObserver' in window) {
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        if (demoVideo.paused) {
          demoVideo.play().catch(err => console.warn('Autoplay prevented:', err));
        }
      } else {
        if (!demoVideo.paused) {
          demoVideo.pause();
        }
      }
    });
  }, { threshold: 0.15 });

  videoObserver.observe(demoVideo);
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

// Recorrido del panel: capturas reales del CRM que avanzan solas.
// Solo corre en pantalla, se pausa con el mouse o el foco encima y respeta
// prefers-reduced-motion (ahí solo cambian con las pestañas).
const panelTour = document.querySelector('[data-panel-tour]');
if (panelTour) {
  const PANEL_DURATION = 5000;
  const tabs = [...panelTour.querySelectorAll('[data-panel-tab]')];
  const shots = [...panelTour.querySelectorAll('[data-panel-shot]')];
  const urlLabel = panelTour.querySelector('[data-panel-url]');
  let current = 0;
  let timer = null;
  let onScreen = false;
  let hovering = false;

  panelTour.style.setProperty('--panel-duration', `${PANEL_DURATION}ms`);

  const showPanel = (index) => {
    current = (index + tabs.length) % tabs.length;
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
    const autoplay = onScreen && !hovering && !prefersReducedMotion.matches;
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

  panelTour.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  panelTour.addEventListener('mouseleave', () => { hovering = false; showPanel(current); schedule(); });
  panelTour.addEventListener('focusin', () => { hovering = true; schedule(); });
  panelTour.addEventListener('focusout', () => { hovering = false; schedule(); });
  prefersReducedMotion.addEventListener?.('change', schedule);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) showPanel(current);
      schedule();
    }, { threshold: 0.35 }).observe(panelTour);
  }
}

// Planes y precios: alterna entre activo digital y membresía mensual
(() => {
  const root = document.querySelector('[data-pricing]');
  if (!root) return;

  const MODES = {
    activo: {
      label: 'Activo digital',
      includes: 'Incluye agente, capacitación de interfaz, servidor y capacitación de Meta Ads.',
      unit: 'COP'
    },
    membresia: {
      label: 'Membresía mensual',
      includes: 'Incluye soporte, actualizaciones, capacitaciones e implementación de productos.',
      unit: 'COP / mes'
    }
  };

  const PLANS = {
    informativo: {
      name: 'Informativo',
      activo: { price: 499900, features: ['Preguntas frecuentes e información clave', 'Comparte catálogo básico', 'Captura datos del cliente', 'Entrega a un asesor'] },
      membresia: { price: 129900, features: ['Responde preguntas frecuentes', 'Comparte información clave del negocio', 'Captura datos del cliente', 'Entrega a un asesor cuando sea necesario'] }
    },
    citas: {
      name: 'Citas y reservas',
      activo: { price: 599900, features: ['Agenda citas y reservas', 'Envía confirmaciones automáticas', 'Gestiona cambios y recordatorios', 'Entrega a un asesor'] },
      membresia: { price: 139900, features: ['Agenda citas y reservas', 'Envía confirmaciones y recordatorios', 'Gestiona cancelaciones y reprogramaciones', 'Entrega a un asesor cuando se requiere'] }
    },
    pedidos: {
      name: 'Pedidos y ventas',
      activo: { price: 719900, features: ['Comparte catálogo y productos', 'Valida datos del cliente', 'Genera pedidos', 'Consulta estado del pedido'] },
      membresia: { price: 159900, features: ['Comparte catálogo y productos', 'Valida datos del cliente', 'Toma pedidos y acompaña la compra', 'Consulta estado del pedido'] }
    },
    hibrido: {
      name: 'Híbrido',
      activo: { price: 999900, features: ['Integra información, citas y pedidos', 'Reúne varios flujos en un mismo agente', 'Captura y clasifica leads', 'Atención más completa para el negocio'] },
      membresia: { price: 169900, features: ['Combina información, citas y ventas', 'Atiende varios flujos en un mismo agente', 'Captura y clasifica leads', 'Entrega a tu equipo cuando haga falta'] }
    }
  };

  const formatCOP = (value) => Math.round(value).toLocaleString('es-CO');
  const buttons = Array.from(root.querySelectorAll('[data-pricing-mode]'));
  const includes = root.querySelector('.pricing-includes');
  const includesText = root.querySelector('[data-pricing-includes]');
  const status = root.querySelector('[data-pricing-status]');
  const cards = Array.from(root.querySelectorAll('.price-card[data-plan]'));
  let mode = root.dataset.mode || 'activo';

  const restartClass = (element, className) => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  };

  let swapTimer = 0;

  function renderCards(next) {
    const other = next === 'activo' ? 'membresia' : 'activo';
    cards.forEach((card) => {
      const plan = PLANS[card.dataset.plan];
      if (!plan) return;
      const price = card.querySelector('[data-price]');
      const unit = card.querySelector('[data-unit]');
      const alt = card.querySelector('[data-alt]');
      const list = card.querySelector('[data-features]');
      const cta = card.querySelector('[data-plan-cta]');

      price.textContent = formatCOP(plan[next].price);
      if (unit) unit.textContent = MODES[next].unit;
      if (alt) {
        alt.textContent = other === 'membresia'
          ? `Membresía: $${formatCOP(plan.membresia.price)} COP / mes`
          : `Activo digital: $${formatCOP(plan.activo.price)} COP`;
      }
      if (list) {
        list.replaceChildren(...plan[next].features.map((feature) => {
          const item = document.createElement('li');
          item.textContent = feature;
          return item;
        }));
      }
      if (cta) cta.dataset.prefillMessage = `Hola, me interesa el plan ${plan.name} (${MODES[next].label}).`;
    });
  }

  function setMode(next, { announce = false, animate = false } = {}) {
    if (!MODES[next]) return;
    mode = next;
    root.dataset.mode = next;

    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pricingMode === next)));
    if (includesText) includesText.textContent = MODES[next].includes;
    if (includes && animate) restartClass(includes, 'is-swapping');
    if (announce && status) status.textContent = `Mostrando precios de ${MODES[next].label}, IVA incluido.`;

    clearTimeout(swapTimer);
    if (!animate || prefersReducedMotion.matches) {
      root.classList.remove('is-swap-out', 'is-swap-in');
      renderCards(next);
      return;
    }
    // Fase 1: el contenido actual sale. Fase 2: se cambia y entra el nuevo.
    root.classList.remove('is-swap-in');
    root.classList.add('is-swap-out');
    swapTimer = setTimeout(() => {
      renderCards(mode);
      root.classList.remove('is-swap-out');
      void root.offsetWidth;
      root.classList.add('is-swap-in');
      swapTimer = setTimeout(() => root.classList.remove('is-swap-in'), 900);
    }, 280);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.pricingMode === mode) return;
      setMode(button.dataset.pricingMode, { announce: true, animate: true });
      emitConversion('pricing_mode', { mode: button.dataset.pricingMode });
    });
  });

  setMode(mode);
})();
