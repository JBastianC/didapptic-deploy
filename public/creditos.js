// Sistema de Créditos Didapptic

const CREDITOS_KEY = 'didapptic_creditos';
const CREDITOS_INICIALES = 100;

function getCreditos() {
  let creditos = parseInt(localStorage.getItem(CREDITOS_KEY));
  if (isNaN(creditos)) {
    creditos = CREDITOS_INICIALES;
    localStorage.setItem(CREDITOS_KEY, creditos);
  }
  return creditos;
}

function setCreditos(nuevoValor) {
  localStorage.setItem(CREDITOS_KEY, nuevoValor);
  mostrarCreditos();
}

function descontarCredito() {
  let creditos = getCreditos();
  if (creditos > 0) {
    setCreditos(creditos - 1);
  } else {
    alert('¡Te has quedado sin créditos!');
  }
}

function mostrarCreditos() {
  let scoreDiv = document.getElementById('creditos-score');
  if (!scoreDiv) {
    scoreDiv = document.createElement('div');
    scoreDiv.id = 'creditos-score';
    scoreDiv.style.position = 'fixed';
    scoreDiv.style.top = '16px';
    scoreDiv.style.left = '50%';
    scoreDiv.style.transform = 'translateX(-50%)';
    scoreDiv.style.background = 'rgba(255,255,255,0.95)';
    scoreDiv.style.padding = '8px 24px';
    scoreDiv.style.borderRadius = '18px';
    scoreDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    scoreDiv.style.fontSize = '1.3rem';
    scoreDiv.style.fontWeight = 'bold';
    scoreDiv.style.zIndex = '9999';
    document.body.appendChild(scoreDiv);
  }
  scoreDiv.textContent = `Créditos: ${getCreditos()}`;
}

document.addEventListener('DOMContentLoaded', mostrarCreditos);

// Para uso global desde otros scripts
document.descontarCredito = descontarCredito;
document.mostrarCreditos = mostrarCreditos;
