// plano-viewer.js: Integra funcionalidades de plano-viewer-prueba.js para mostrar datos desde JSON en tablas.

// --- Datos Generales ---
function fillDatosGenerales(config) {
  let periodo = '';
  if (config?.inicioPeriodo && config?.finPeriodo) {
    function fechaLarga(fechaStr) {
      if (!fechaStr) return '';
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const d = new Date(fechaStr);
      if (isNaN(d)) return fechaStr;
      return `${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
    }
    periodo = `${fechaLarga(config.inicioPeriodo)} al ${fechaLarga(config.finPeriodo)}`;
  }
  if(document.getElementById('nivelEducativo')) document.getElementById('nivelEducativo').textContent = config?.nivelEducativo || '';
  if(document.getElementById('centroTrabajo')) document.getElementById('centroTrabajo').textContent = config?.centroTrabajo || '';
  if(document.getElementById('sectorEducativo')) document.getElementById('sectorEducativo').textContent = config?.sectorEducativo || '';
  if(document.getElementById('zonaEscolar')) document.getElementById('zonaEscolar').textContent = config?.zonaEscolar || '';
  if(document.getElementById('fase')) document.getElementById('fase').textContent = config?.fase || '';
  if(document.getElementById('grado')) document.getElementById('grado').textContent = config?.grado || '';
  if(document.getElementById('grupo')) document.getElementById('grupo').textContent = config?.grupo || '';
  if(document.getElementById('nombreDocente')) document.getElementById('nombreDocente').textContent = config?.docente || '';
  if(document.getElementById('nombreDirector')) document.getElementById('nombreDirector').textContent = config?.director || '';
  if(document.getElementById('inicioPeriodo')) document.getElementById('inicioPeriodo').textContent = config?.inicioPeriodo ? fechaLarga(config.inicioPeriodo) : '';
  if(document.getElementById('finPeriodo')) document.getElementById('finPeriodo').textContent = config?.finPeriodo ? fechaLarga(config.finPeriodo) : '';
}

// --- Evaluación ---
function fillEvaluacion(evaluacionArr) {
  const table = document.getElementById('evaluacionTable');
  if (!table || !Array.isArray(evaluacionArr)) return;
  // Limpia todas las filas excepto encabezado
  while (table.rows.length > 1) table.deleteRow(1);
  evaluacionArr.forEach(row => {
    const tr = document.createElement('tr');
    ['Criterio', 'Indicador', 'Instrumento', 'Ponderacion'].forEach(key => {
      const td = document.createElement('td');
      td.textContent = row[key] || '';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

// --- Event Listener para recibir datos ---
window.addEventListener('message', event => {
  console.log('[plano-viewer.js] Mensaje recibido:', event.data);
  if (event.data && event.data.type === 'loadData') {
    let error = false;
    try {
      if(event.data.config) {
        fillDatosGenerales(event.data.config);
      } else {
        console.warn('[plano-viewer.js] No se recibió "config" en el mensaje.');
        error = true;
      }
      if(event.data.evaluacion) {
        fillEvaluacion(event.data.evaluacion);
      } else {
        console.warn('[plano-viewer.js] No se recibió "evaluacion" en el mensaje.');
        error = true;
      }
      // Puedes agregar aquí más funciones para otras tablas si es necesario
    } catch (e) {
      error = true;
      console.error('[plano-viewer.js] Error al procesar los datos del mensaje:', e);
    }
    if (error) {
      let msg = document.getElementById('viewerErrorMsg');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'viewerErrorMsg';
        msg.style.color = 'red';
        msg.style.fontWeight = 'bold';
        msg.style.margin = '1em';
        msg.textContent = '⚠️ Error al cargar algunos datos. Revisa la consola para más detalles.';
        document.body.prepend(msg);
      }
    }
  }
});

// Exponer funciones globalmente si se requiere
window.fillDatosGenerales = fillDatosGenerales;
window.fillEvaluacion = fillEvaluacion;
