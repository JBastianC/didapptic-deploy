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
  
  // Cambiar estilo de navbar según el scroll
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const welcomeHeight = document.querySelector('.welcome').offsetHeight;
  
    if (window.scrollY > welcomeHeight - 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
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
    "Bienvenido a DidAppTic 👩‍🏫",
    "Tu aliado en la planificación docente 📚",
    "Simplifica, innova, transforma 🚀",
    "Herramientas con IA para cada reto educativo 💡"
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
  