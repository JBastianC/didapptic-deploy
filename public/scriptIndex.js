// Fondo dinámico en sección welcome
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
  
    const color1 = 'rgb(235, 70, 37)';
    const color2 = 'rgb(108, 92, 231)';
  
    const welcomeSection = document.querySelector('.welcome');
    if (welcomeSection) {
        document.querySelector('.welcome').style.background = `radial-gradient(at ${x}% ${y}%, #ff6a00, #ffcc00)`;
    }
  });

  if (document.querySelector('.particles-welcome')) {
    particlesJS('particles-js', {
      particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#5e72e4' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: false },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#5e72e4', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { 
          onhover: { enable: true, mode: 'grab' }, 
          onclick: { enable: true, mode: 'push' }, 
          resize: true 
        },
        modes: { 
          grab: { distance: 140, line_linked: { opacity: 1 } }, 
          push: { particles_nb: 4 } 
        }
      },
      retina_detect: true
    });
  }
  
  // Cambiar estilo de navbar según el scroll
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const navButtons = document.querySelectorAll('.nav-buttons a');
    
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
      // Asegurar que los botones mantengan su estilo interactivo
      navButtons.forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      });
    } else {
      navbar.classList.remove('scrolled');
    }
  });
  
  // Aplicar estilos de navbar al cargar la página
  document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    }
  });
  
  // Animaciones para preguntas frecuentes (acordeón)
  document.querySelectorAll('.faq-header').forEach(header => {
    header.addEventListener('click', () => {
      const answer = header.nextElementSibling;
      const isVisible = answer.style.display === 'block';
      document.querySelectorAll('.faq-answer').forEach(ans => ans.style.display = 'none');
      answer.style.display = isVisible ? 'none' : 'block';
    });
  });
  
  // Efecto de escritura tipo máquina en la sección de bienvenida
  const messages = [
    "Bienvenido a DidAppTic",
    "Tu aliado en la planificación docente",
    "Simplifica, innova, transforma",
    "Herramientas con IA para cada reto educativo"
  ];
  
  let index = 0;
  let charIndex = 0;
  const typingElement = document.querySelector('.typing');
  
  function typeMessage() {
    if (!typingElement) return;
    if (charIndex < messages[index].length) {
      typingElement.innerHTML += messages[index].charAt(charIndex);
      charIndex++;
      setTimeout(typeMessage, 70);
    } else {
      setTimeout(() => {
        typingElement.innerHTML = "";
        charIndex = 0;
        index = (index + 1) % messages.length;
        typeMessage();
      }, 2000);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    typeMessage();
  });
  