// Sistema de Créditos Didapptic (API/server version)
// Este archivo reemplaza el uso de localStorage por llamadas a server.js

async function getCreditosUsuario() {
  const res = await fetch('/api/creditos', { headers: authHeader() });
  if (!res.ok) throw new Error('No se pudo obtener créditos');
  const data = await res.json();
  if (data.reset && data.message) mostrarMensajeCreditoReset(data.message);
  return data.creditos;
}

async function setCreditosUsuario(nuevoValor) {
  const res = await fetch('/api/creditos', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ creditos: nuevoValor })
  });
  if (!res.ok) throw new Error('No se pudo actualizar créditos');
  const data = await res.json();
  return data.creditos;
}

async function descontarCreditoUsuario() {
  const res = await fetch('/api/creditos/descontar', {
    method: 'POST',
    headers: authHeader()
  });
  if (!res.ok) throw new Error('No se pudo descontar crédito');
  const data = await res.json();
  if (data.reset && data.message) mostrarMensajeCreditoReset(data.message);
  if (typeof mostrarCreditos === 'function') mostrarCreditos();
  return data.creditos;
}

function authHeader() {
  // Devuelve el header de autenticación JWT si existe
  const token = localStorage.getItem('token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// Ocultar sistema de créditos si no es premium
function ocultarSistemaCreditos() {
  if (!isPremiumUser()) {
    // Oculta contador flotante
    const scoreDiv = document.getElementById('creditos-score');
    if (scoreDiv) scoreDiv.style.display = 'none';
    // Oculta tablas/divs de créditos
    document.querySelectorAll('.creditos-table, .creditos-container, .creditos-section').forEach(e => e.style.display = 'none');
  }
}

// Comprobación de cuenta premium
function isPremiumUser() {
  try {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData && userData.membership === 'premium';
  } catch (e) { return false; }
}

// Mensaje visual para solo premium
function mostrarMensajeSoloPremium() {
  let toast = document.getElementById('toast-solo-premium');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-solo-premium';
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#c62828';
    toast.style.color = '#fff';
    toast.style.padding = '14px 28px';
    toast.style.borderRadius = '20px';
    toast.style.fontSize = '1.15rem';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
    toast.style.zIndex = '99999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = 'Debes ser premium para poder usar esta funcionalidad.';
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 4000);
}

// Mensaje visual de reseteo de créditos
function mostrarMensajeCreditoReset(msg) {
  // Toast simple reutilizable
  let toast = document.getElementById('toast-credito-reset');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-credito-reset';
    toast.style.position = 'fixed';
    toast.style.bottom = '32px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#43a047';
    toast.style.color = '#fff';
    toast.style.padding = '14px 28px';
    toast.style.borderRadius = '20px';
    toast.style.fontSize = '1.15rem';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.13)';
    toast.style.zIndex = '99999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 4000);
}

// Para uso global
window.getCreditosUsuario = getCreditosUsuario;
window.setCreditosUsuario = setCreditosUsuario;
window.descontarCreditoUsuario = descontarCreditoUsuario;
window.mostrarMensajeCreditoReset = mostrarMensajeCreditoReset;
window.isPremiumUser = isPremiumUser;
window.mostrarMensajeSoloPremium = mostrarMensajeSoloPremium;
window.ocultarSistemaCreditos = ocultarSistemaCreditos;

// Ocultar créditos en todas las páginas si no es premium
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ocultarSistemaCreditos);
} else {
  ocultarSistemaCreditos();
}
