// Force light theme on initial load
document.body.classList.add('light');

// --- Navbar Scroll Behavior ---
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// --- Typewriter Effect for Hero Title ---
const line1Full = "Inteligencia que";
const line2Full = "impulsa tu negocio.";
const line1El = document.getElementById('line1');
const line2El = document.getElementById('line2');
const cursor1 = document.getElementById('cursor1');
const cursor2 = document.getElementById('cursor2');

let index1 = 0;
let index2 = 0;
let isErasing = false;

function createCharSpan(char) {
  const span = document.createElement('span');
  span.className = 'char new';
  span.textContent = char;
  return span;
}

function typewriter() {
  if (!line1El || !line2El) return;

  if (!isErasing) {
    // --- TYPING PHASE ---
    if (index1 < line1Full.length) {
      if (cursor1) cursor1.style.display = 'inline-block';
      if (cursor2) cursor2.style.display = 'none';
      
      const span = createCharSpan(line1Full.charAt(index1));
      line1El.appendChild(span);
      
      index1++;
      setTimeout(typewriter, 70 + Math.random() * 35);
    } else if (index2 < line2Full.length) {
      if (cursor1) cursor1.style.display = 'none';
      if (cursor2) cursor2.style.display = 'inline-block';

      const span = createCharSpan(line2Full.charAt(index2));
      line2El.appendChild(span);
      
      index2++;
      setTimeout(typewriter, 70 + Math.random() * 35);
    } else {
      // Done typing, wait before starting to erase
      setTimeout(() => {
        isErasing = true;
        typewriter();
      }, 3000);
    }
  } else {
    // --- ERASING PHASE ---
    if (index2 > 0) {
      if (cursor1) cursor1.style.display = 'none';
      if (cursor2) cursor2.style.display = 'inline-block';
      
      if (line2El.lastChild) {
        line2El.removeChild(line2El.lastChild);
      }
      index2--;
      setTimeout(typewriter, 30);
    } else if (index1 > 0) {
      if (cursor1) cursor1.style.display = 'inline-block';
      if (cursor2) cursor2.style.display = 'none';
      
      if (line1El.lastChild) {
        line1El.removeChild(line1El.lastChild);
      }
      index1--;
      setTimeout(typewriter, 30);
    } else {
      // Done erasing, wait and restart typing
      isErasing = false;
      setTimeout(typewriter, 500);
    }
  }
}

// Start the typewriter loop
typewriter();

// --- Lightbox Modal (Zoom de imágenes publicitarias) ---
const mockups = document.querySelectorAll('.mockup-wrapper, .srv-card-img-wrapper');
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox ? lightbox.querySelector('.lightbox-img') : null;

if (mockups.length > 0 && lightbox && lightboxImg) {
  mockups.forEach(mockup => {
    mockup.addEventListener('click', () => {
      const img = mockup.querySelector('img');
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('open');
      }
    });
  });

  lightbox.addEventListener('click', () => {
    lightbox.classList.remove('open');
  });
}

// --- Contact Form Handling ---
const contactForm = document.getElementById('contact-form');
const contactFormContainer = document.getElementById('contact-form-container');

if (contactForm && contactFormContainer) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Simulate successful form submission
    contactFormContainer.innerHTML = `
      <div style="text-align: center; padding: 3rem 0;">
        <span style="font-size: 3rem;">🎉</span>
        <h3 style="margin: 1rem 0;">¡Mensaje Enviado!</h3>
        <p style="color: var(--text-soft);">
          Tu solicitud ha sido recibida. Uno de nuestros agentes se pondrá en contacto contigo en breve.
        </p>
        <button class="btn btn-secondary" style="margin-top: 1.5rem;" onclick="window.location.reload();">
          Enviar otro mensaje
        </button>
      </div>
    `;
  });
}

// --- Chat Simulator (WhatsApp Demo) ---
const OPTIONS = [
  { key: 'dudas', label: '🤖 ¿Cómo respondes dudas?', response: 'Me entreno con la información de tu negocio (catálogos, servicios, políticas) para responder cualquier pregunta al instante con precisión humana.' },
  { key: 'ventas', label: '📈 ¿Cómo cierras ventas?', response: 'Califico los leads haciendo preguntas clave, muestro las mejores opciones de tu catálogo y puedo enviar enlaces de pago de Stripe o pasarelas locales.' },
  { key: 'citas', label: '📅 ¿Cómo agendas citas?', response: 'Tengo integración directa con Cal.com. Muestro los horarios disponibles de tu equipo y reservo el espacio en segundos.' },
  { key: 'landing', label: '🌐 ¿Crean landing pages?', response: '¡Sí! Diseñamos y desarrollamos landing pages ultra rápidas y de alta conversión. Lo mejor es que las entregamos integradas con tu propio Agente de IA para automatizar tus ventas 24/7 desde el primer día.' },
  { key: 'precio', label: '💼 ¿Cuáles son las tarifas?', response: 'Nuestras tarifas se adaptan a las necesidades de tu empresa. Puedes consultarnos directamente por WhatsApp al 3215077328 o por correo a jademind@gmail.com para darte una cotización personalizada.' }
];

const chatBody = document.getElementById('chat-body');
const chatOptionsContainer = document.getElementById('chat-options');

function renderOptions() {
  if (!chatOptionsContainer) return;
  chatOptionsContainer.innerHTML = '';
  OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'chat-sim-opt';
    btn.textContent = opt.label;
    btn.addEventListener('click', () => handleOptionClick(opt));
    chatOptionsContainer.appendChild(btn);
  });
}

function handleOptionClick(opt) {
  if (!chatOptionsContainer || !chatBody) return;
  
  // Disable option buttons during typing
  const buttons = chatOptionsContainer.querySelectorAll('.chat-sim-opt');
  buttons.forEach(btn => btn.disabled = true);

  // Append user message
  appendMessage('user', opt.label);
  
  // Append typing indicator
  const typingIndicator = appendTypingIndicator();
  chatBody.scrollTop = chatBody.scrollHeight;

  setTimeout(() => {
    // Remove typing indicator
    if (typingIndicator) typingIndicator.remove();
    
    // Append agent response
    appendMessage('agent', opt.response);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Re-enable option buttons
    buttons.forEach(btn => btn.disabled = false);
  }, 1200);
}

function appendMessage(sender, text) {
  if (!chatBody) return null;
  const msg = document.createElement('div');
  msg.className = `chat-sim-msg ${sender}`;
  msg.textContent = text;
  chatBody.appendChild(msg);
  return msg;
}

function appendTypingIndicator() {
  if (!chatBody) return null;
  const msg = document.createElement('div');
  msg.className = 'chat-sim-msg agent';
  msg.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  chatBody.appendChild(msg);
  return msg;
}

// Initialize chat simulator options
renderOptions();




