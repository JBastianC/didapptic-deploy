// Script para inicializar la tabla de Secuencia Didáctica de forma dinámica
// Llama a construirTablaSecuencia cuando la metodología cambie o al cargar la página

document.addEventListener('DOMContentLoaded', function() {
  var metodologia = document.getElementById('metodologia')?.textContent || '';
  if (typeof construirTablaSecuencia === 'function') {
    construirTablaSecuencia(metodologia);
  }
  var metodologiaCell = document.getElementById('metodologia');
  if (metodologiaCell) {
    metodologiaCell.addEventListener('blur', function() {
      if (typeof construirTablaSecuencia === 'function') {
        construirTablaSecuencia(this.textContent);
      }
    });
  }
});
