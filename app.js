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
    if (window.innerWidth > 820) closeMenu();
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

// Demo por sector
const SECTOR_CONTENT = {
  inmobiliaria: {
    agent: 'Asistente inmobiliario',
    messages: [
      ['agent', 'Hola, ¿buscas comprar, arrendar o vender una propiedad?'],
      ['user', 'Quiero comprar un apartamento en Medellín.'],
      ['agent', 'Perfecto. ¿Qué presupuesto, zonas y número de habitaciones tienes en mente?'],
      ['user', 'Hasta $480 millones, dos habitaciones, idealmente en Laureles o Belén.'],
      ['agent', '¿Lo buscas para vivir o invertir y en qué plazo quieres comprar?'],
      ['user', 'Para vivir. Quiero decidir durante los próximos tres meses.'],
      ['agent', 'Ya tengo tu perfil. Puedo mostrarte opciones compatibles y ayudarte a coordinar una visita.']
    ],
    result: [['Intención', 'Compra'], ['Perfil', '2 habitaciones · hasta $480 millones'], ['Ubicación', 'Laureles o Belén'], ['Siguiente paso', 'Enviar opciones y agendar visita']],
    handoff: 'Si el presupuesto, la zona o el tipo de inmueble requieren asesoría, el agente transfiere la conversación con el contexto recopilado.'
  },
  estetica: {
    agent: 'Asistente de clínica estética',
    messages: [
      ['agent', 'Hola, ¿quieres conocer tratamientos, revisar disponibilidad o agendar una valoración?'],
      ['user', 'Quiero mejorar manchas y textura, pero no sé cuál tratamiento necesito.'],
      ['agent', 'Puedo ayudarte con el proceso sin sustituir la evaluación clínica. ¿Es tu primera consulta y tienes alguna fecha especial?'],
      ['user', 'Sí, es mi primera vez y tengo un evento dentro de dos meses.'],
      ['agent', 'Gracias. ¿Qué sede y horarios suelen funcionarte mejor?'],
      ['user', 'Medellín, preferiblemente los sábados en la mañana.'],
      ['agent', 'Perfecto. Consultaré una valoración facial en ese horario; el profesional definirá el tratamiento y las indicaciones durante la cita.']
    ],
    result: [['Interés', 'Valoración facial'], ['Contexto', 'Primera consulta · evento en 2 meses'], ['Preferencia', 'Sábado en la mañana'], ['Siguiente paso', 'Consultar agenda en Medellín']],
    handoff: 'El agente no realiza diagnósticos médicos. Las recomendaciones clínicas se reservan para el profesional responsable.'
  },
  educacion: {
    agent: 'Asistente de admisiones',
    messages: [
      ['agent', 'Hola, ¿buscas un programa, información de matrícula o hablar con admisiones?'],
      ['user', 'Quiero estudiar analítica de datos en modalidad virtual.'],
      ['agent', '¿Qué nivel de formación buscas y cuándo te gustaría comenzar?'],
      ['user', 'Un diplomado. Quisiera iniciar el próximo mes.'],
      ['agent', '¿Tienes experiencia previa y qué horarios puedes dedicar al estudio?'],
      ['user', 'Soy principiante y puedo estudiar en las noches.'],
      ['agent', 'Con ese perfil puedo mostrarte programas virtuales, horarios, costos y próximas cohortes. Admisiones confirmará requisitos y matrícula.']
    ],
    result: [['Programa', 'Diplomado en analítica de datos'], ['Perfil', 'Principiante · horario nocturno'], ['Inicio', 'Próximo mes'], ['Siguiente paso', 'Enviar programa y conectar con admisiones']],
    handoff: 'Cuando el prospecto necesita homologaciones, financiación o condiciones especiales, la conversación pasa al equipo de admisiones.'
  },
  productos: {
    agent: 'Asistente de ventas de productos',
    messages: [
      ['agent', 'Hola, ¿qué producto buscas o qué necesidad quieres resolver?'],
      ['user', 'Necesito audífonos inalámbricos para trabajar y entrenar.'],
      ['agent', '¿Qué características priorizas y cuál es tu presupuesto máximo?'],
      ['user', 'Cancelación de ruido, resistencia al sudor y hasta $450.000.'],
      ['agent', '¿Usas Android o iPhone y en qué ciudad recibirías el pedido?'],
      ['user', 'Android. Necesito entrega en Medellín esta semana.'],
      ['agent', 'En esta simulación encontré dos opciones: A por $389.000 con 30 horas de batería y B por $429.000 con mejor cancelación. Ambas encajan en tu presupuesto. ¿Cuál prefieres?'],
      ['user', 'La opción B.'],
      ['agent', 'Perfecto. Dejé seleccionada la opción B y puedo llevarte al pago o transferirte a ventas para confirmar disponibilidad y entrega.']
    ],
    result: [['Producto', 'Audífonos inalámbricos'], ['Selección', 'Opción B · $429.000'], ['Entrega', 'Medellín · esta semana'], ['Siguiente paso', 'Confirmar inventario y continuar al pago']],
    handoff: 'Antes de cerrar la compra se verifican inventario, garantía y tiempo de entrega. Si surge una excepción, ventas recibe el producto seleccionado y todo el contexto.'
  }
};

const sectorTabs = Array.from(document.querySelectorAll('[role="tab"][data-sector]'));
const sectorPanel = document.getElementById('sector-panel');
const sectorAgentName = document.getElementById('sector-agent-name');
const sectorMessages = document.getElementById('sector-messages');
const sectorResult = document.getElementById('sector-result');
const sectorHandoff = document.getElementById('sector-handoff');
const sectorDemoStatus = document.getElementById('sector-demo-status');

function createMessage(type, text) {
  const message = document.createElement('p');
  const speaker = document.createElement('span');
  speaker.className = 'sr-only';
  speaker.textContent = type === 'user' ? 'Cliente: ' : 'Asistente: ';
  message.className = `message message-${type}`;
  message.append(speaker, document.createTextNode(text));
  return message;
}

function createResultRow([label, value]) {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

function selectSector(key, { focus = false, announce = false } = {}) {
  const content = SECTOR_CONTENT[key];
  const activeTab = sectorTabs.find((tab) => tab.dataset.sector === key);
  if (!content || !activeTab || !sectorPanel || !sectorAgentName || !sectorMessages || !sectorResult || !sectorHandoff) return;

  sectorTabs.forEach((tab) => {
    const active = tab === activeTab;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  sectorPanel.setAttribute('aria-labelledby', activeTab.id);
  sectorAgentName.textContent = content.agent;
  sectorMessages.replaceChildren(...content.messages.map(([type, text]) => createMessage(type, text)));
  sectorResult.replaceChildren(...content.result.map(createResultRow));
  sectorHandoff.textContent = content.handoff;

  if (announce && sectorDemoStatus) {
    sectorDemoStatus.textContent = `Demo de ${activeTab.textContent.trim()} cargada.`;
  }

  if (focus) activeTab.focus();

  if (focus || announce) {
    activeTab.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }
}

sectorTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    selectSector(tab.dataset.sector, { announce: true });
    emitConversion('sector_demo', { sector: tab.dataset.sector });
  });

  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % sectorTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + sectorTabs.length) % sectorTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = sectorTabs.length - 1;

    selectSector(sectorTabs[nextIndex].dataset.sector, { focus: true, announce: true });
  });
});

selectSector('inmobiliaria');


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

// Evita que el acceso flotante cubra la demo conversacional o el formulario.
const whatsappFloat = document.querySelector('.whatsapp-float');
const contactSection = document.getElementById('contacto');
const demoSection = document.getElementById('demo');
const protectedFloatSections = [demoSection, contactSection].filter(Boolean);
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

// Diseño web · constructor en vivo (estructura → diseño → interacción → lanzamiento)
(() => {
  const root = document.querySelector('[data-web-build]');
  if (!root) return;

  const screen = root.querySelector('.sm-screen');
  const cursor = root.querySelector('.sm-cursor');
  const ripple = root.querySelector('.sm-ripple');
  const cta = root.querySelector('.sm-cta');
  const steps = Array.from(root.querySelectorAll('.build-steps li'));
  const deviceButtons = Array.from(root.querySelectorAll('[data-device-btn]'));
  const scoreValues = Array.from(root.querySelectorAll('.sm-ring b[data-count]'));
  const browser = root.querySelector('.browser');

  const PHASES = [
    { cls: null, duration: 2600 },
    { cls: 'is-design', duration: 3400 },
    { cls: 'is-interact', duration: 3800 },
    { cls: 'is-live', duration: 4400 }
  ];
  const DEVICES = ['desktop', 'tablet', 'mobile'];
  let phase = 0;
  let loop = 0;
  let userDevice = false;
  let timers = [];
  let scoreFrame = 0;

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  steps.forEach((step, index) => step.style.setProperty('--dur', `${PHASES[index].duration}ms`));

  function placeCursor(onButton) {
    const box = screen.getBoundingClientRect();
    let x = box.width * 0.82;
    let y = box.height * 0.9;
    if (onButton && cta) {
      const target = cta.getBoundingClientRect();
      x = target.left - box.left + target.width * 0.6;
      y = target.top - box.top + target.height * 0.55;
    }
    cursor.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    ripple.style.left = `${x.toFixed(1)}px`;
    ripple.style.top = `${y.toFixed(1)}px`;
  }

  function setScores(progress) {
    scoreValues.forEach((value) => {
      value.textContent = String(Math.round(Number(value.dataset.count) * progress));
    });
  }

  function animateScores() {
    cancelAnimationFrame(scoreFrame);
    if (prefersReducedMotion.matches) {
      setScores(1);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start - 200) / 1300));
      setScores(1 - Math.pow(1 - progress, 3));
      if (progress < 1) scoreFrame = requestAnimationFrame(tick);
    };
    scoreFrame = requestAnimationFrame(tick);
  }

  function setDevice(device, fromUser = false) {
    screen.dataset.device = device;
    deviceButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.deviceBtn === device)));
    if (fromUser) userDevice = true;
    // El botón cambia de lugar al reacomodarse la pantalla: recolocar el cursor.
    if (root.classList.contains('is-interact')) setTimeout(() => placeCursor(!root.classList.contains('is-live')), 850);
  }

  function showPhase(index) {
    clearTimers();
    phase = index;
    PHASES.forEach((item, itemIndex) => {
      if (item.cls) root.classList.toggle(item.cls, itemIndex <= index);
    });
    root.classList.remove('is-click');

    steps.forEach((step, stepIndex) => {
      step.classList.toggle('is-done', stepIndex < index);
      step.classList.remove('is-current');
    });
    void steps[index].offsetWidth; // reinicia la barra de progreso
    steps[index].classList.add('is-current');

    if (index === 0) {
      cancelAnimationFrame(scoreFrame);
      setScores(0);
      placeCursor(false);
    }
    if (index === 2) {
      later(() => placeCursor(true), 200);
      later(() => root.classList.add('is-click'), 1350);
      later(() => root.classList.remove('is-click'), 2100);
    }
    if (index === 3) animateScores();
  }

  // Estado final estático para quien prefiere menos movimiento.
  function showFinalState() {
    clearTimers();
    root.classList.remove('is-playing', 'is-interact');
    root.classList.add('is-design', 'is-live');
    steps.forEach((step) => {
      step.classList.remove('is-current');
      step.classList.add('is-done');
    });
    setScores(1);
  }

  deviceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setDevice(button.dataset.deviceBtn, true);
      emitConversion('web_device_preview', { device: button.dataset.deviceBtn });
    });
  });

  root.addEventListener('animationend', (event) => {
    if (!event.target.matches('.build-steps .bar i') || !root.classList.contains('is-playing')) return;
    let next = phase + 1;
    if (next >= PHASES.length) {
      next = 0;
      loop += 1;
      if (!userDevice) setDevice(DEVICES[loop % DEVICES.length]);
    }
    showPhase(next);
  });

  if (browser) {
    browser.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse') root.classList.add('is-hold');
    });
    browser.addEventListener('pointerleave', () => root.classList.remove('is-hold'));
  }

  const start = () => {
    if (prefersReducedMotion.matches) {
      showFinalState();
      return;
    }
    root.classList.add('is-playing');
    showPhase(0);
  };

  prefersReducedMotion.addEventListener?.('change', () => {
    if (prefersReducedMotion.matches) showFinalState();
    else start();
  });

  if ('IntersectionObserver' in window) {
    let started = false;
    root.classList.add('is-offscreen');
    showPhase(0);
    new IntersectionObserver(([entry]) => {
      root.classList.toggle('is-offscreen', !entry.isIntersecting);
      if (entry.isIntersecting && !started) {
        started = true;
        start();
      }
    }, { threshold: 0.35 }).observe(root);
  } else {
    start();
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

// Los CTA de diseño web precargan el mensaje del formulario si está vacío
document.querySelectorAll('[data-prefill-message]').forEach((link) => {
  link.addEventListener('click', () => {
    const message = document.getElementById('mensaje');
    if (message && !message.value.trim()) message.value = link.dataset.prefillMessage;
  });
});
