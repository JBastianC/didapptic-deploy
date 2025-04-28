// plano-contextual-viewer.js: Recibe el JSON enviado desde plano-contextual.html y llena las tablas.

// --- Datos Generales ---
function fillDatosGenerales(datosGenerales) {
  const body = document.getElementById('datosGeneralesBody');
  if (!body) return;
  body.innerHTML = '';
  const campos = [
    { label: 'Nivel Educativo', key: 'nivelEducativo' },
    { label: 'Centro de Trabajo', key: 'centroTrabajo' },
    { label: 'Zona Escolar', key: 'zonaEscolar' },
    { label: 'Sector Educativo', key: 'sectorEducativo' },
    { label: 'Fase', key: 'fase' },
    { label: 'Grado', key: 'grado' },
    { label: 'Grupo', key: 'grupo' },
    { label: 'Nombre del Docente', key: 'nombreDocente' },
    { label: 'Nombre del Director', key: 'nombreDirector' }
  ];
  campos.forEach(c => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = c.label;
    const td2 = document.createElement('td');
    td2.textContent = datosGenerales[c.key] || '';
    tr.appendChild(td1);
    tr.appendChild(td2);
    body.appendChild(tr);
  });
  // Firmas
  if(document.getElementById('firmaDocenteNombre')) document.getElementById('firmaDocenteNombre').textContent = datosGenerales.nombreDocente || '';
  if(document.getElementById('firmaDirectorNombre')) document.getElementById('firmaDirectorNombre').textContent = datosGenerales.nombreDirector || '';
}

// --- Plano de la Problematización ---
function fillProblematizacion(planoProblematizacion) {
  const body = document.getElementById('problematizacionBody');
  if (!body) return;
  body.innerHTML = '';
  if (!planoProblematizacion || typeof planoProblematizacion !== 'object') return;
  // Descripción del tema
  if (planoProblematizacion.descripcionTema) {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.colSpan = 2;
    td1.innerHTML = `<b>Descripción del tema:</b> ${planoProblematizacion.descripcionTema}`;
    tr.appendChild(td1);
    body.appendChild(tr);
  }
  if (Array.isArray(planoProblematizacion.descripcionTemaLista)) {
    planoProblematizacion.descripcionTemaLista.forEach((desc, i) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.innerHTML = `<b>Detalle tema ${i+1}:</b> ${desc}`;
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }
  if (planoProblematizacion.descripcionSituaciones) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.innerHTML = `<b>Situaciones:</b> ${planoProblematizacion.descripcionSituaciones}`;
    tr.appendChild(td);
    body.appendChild(tr);
  }
  if (Array.isArray(planoProblematizacion.descripcionSituacionesLista)) {
    planoProblematizacion.descripcionSituacionesLista.forEach((sit, i) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.innerHTML = `<b>Detalle situación ${i+1}:</b> ${sit}`;
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }
  if (planoProblematizacion.problemas) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.innerHTML = `<b>Problemas:</b> ${planoProblematizacion.problemas}`;
    tr.appendChild(td);
    body.appendChild(tr);
  }
  if (Array.isArray(planoProblematizacion.problemasLista)) {
    planoProblematizacion.problemasLista.forEach((prob, i) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 2;
      td.innerHTML = `<b>Detalle problema ${i+1}:</b> ${prob}`;
      tr.appendChild(td);
      body.appendChild(tr);
    });
  }
}

// --- Plano de la Contextualización ---
function fillContextualizacion(tablaContextualizacion) {
  const body = document.getElementById('contextualizacionBody');
  if (!body) return;
  body.innerHTML = '';
  if (!Array.isArray(tablaContextualizacion)) return;
  tablaContextualizacion.forEach(row => {
    const tr = document.createElement('tr');
    const tdProblema = document.createElement('td');
    tdProblema.textContent = row.problema || '';
    const tdCampos = document.createElement('td');
    tdCampos.textContent = row.camposFormativos || '';
    const tdContenidos = document.createElement('td');
    tdContenidos.textContent = row.contenidos || '';
    const tdPdas = document.createElement('td');
    tdPdas.textContent = row.pdas || '';
    const tdEjes = document.createElement('td');
    tdEjes.textContent = row.ejesArticuladores || '';
    tr.appendChild(tdProblema);
    tr.appendChild(tdCampos);
    tr.appendChild(tdContenidos);
    tr.appendChild(tdPdas);
    tr.appendChild(tdEjes);
    body.appendChild(tr);
  });
}

// --- Event Listener para recibir datos ---
window.addEventListener('message', event => {
  // Acepta mensajes solo de tipo loadContextualData
  if (event.data && event.data.type === 'loadContextualData') {
    const { datosGenerales, planoProblematizacion, planoContextualizacion } = event.data.data || {};
    fillDatosGenerales(datosGenerales);
    fillProblematizacion(planoProblematizacion);
    fillContextualizacion(planoContextualizacion);
  }
});

// Exponer funciones globalmente si se requiere
window.fillDatosGenerales = fillDatosGenerales;
window.fillEvaluacion = fillEvaluacion;
