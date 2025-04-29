// plano-contextual-viewer.js: Carga toda la información directamente desde el backend (server.js) sin usar JSON ni postMessage.

// --- API: Datos Generales/configuración ---
async function fetchDatosGenerales() {
  try {
    const res = await fetch('/api/config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (data.success && data.config) return data.config;
    return {};
  } catch (err) {
    console.error('Error al obtener datos generales:', err);
    return {};
  }
}

// --- API: Tarjetas de plano-realidad ---
// Nueva función para obtener los planes (tarjetas de problematización)
async function fetchPlans() {
  try {
    const res = await fetch('/api/plans', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (data.success) return data.plans || [];
    return [];
  } catch (err) {
    console.error('Error al obtener planes:', err);
    return [];
  }
}

// --- API: Filas de plano-contextual (Contextualización) ---
async function fetchContextualizacion() {
  try {
    const res = await fetch('/api/context', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.contextData)) return data.contextData;
    return [];
  } catch (err) {
    console.error('Error al obtener contexto:', err);
    return [];
  }
}

// --- Al cargar la página, poblar todas las tablas ---
document.addEventListener('DOMContentLoaded', async function() {
  // 1. Datos Generales
  const datosGenerales = await fetchDatosGenerales();
  fillDatosGenerales(datosGenerales);

  // 2. Plano de la Problematización
  const tarjetas = await fetchPlans();
  fillProblematizacion(tarjetas);

  // 3. Plano de la Contextualización
  const tablaContextualizacion = await fetchContextualizacion();
  fillContextualizacion(tablaContextualizacion);

  // 4. Firmas
  if(document.getElementById('firmaDocenteNombre')) document.getElementById('firmaDocenteNombre').textContent = datosGenerales.nombreDocente || '';
  if(document.getElementById('firmaDirectorNombre')) document.getElementById('firmaDirectorNombre').textContent = datosGenerales.nombreDirector || '';
});

// --- Datos Generales ---
function fillDatosGenerales(datosGenerales) {
  const body = document.getElementById('datosGeneralesBody');
  if (!body) return;
  body.innerHTML = '';
  // Helper para crear celdas editables
  function createEditableCell(value, key) {
    const td = document.createElement('td');
    td.contentEditable = 'true';
    td.textContent = value || '';
    td.classList.add('editable');
    td.addEventListener('blur', function() {
      datosGenerales[key] = td.textContent;
    });
    td.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        td.blur();
      }
    });
    return td;
  }
  // Fila 1
  let tr1 = document.createElement('tr');
  tr1.appendChild(document.createElement('td')).innerHTML = '<b>Nivel Educativo</b>';
  tr1.appendChild(createEditableCell(datosGenerales.nivelEducativo, 'nivelEducativo'));
  tr1.appendChild(document.createElement('td')).innerHTML = '<b>Grado</b>';
  tr1.appendChild(createEditableCell(datosGenerales.grado, 'grado'));
  body.appendChild(tr1);
  // Fila 2
  let tr2 = document.createElement('tr');
  tr2.appendChild(document.createElement('td')).innerHTML = '<b>Grupo</b>';
  tr2.appendChild(createEditableCell(datosGenerales.grupo, 'grupo'));
  tr2.appendChild(document.createElement('td')).innerHTML = '<b>Fase</b>';
  tr2.appendChild(createEditableCell(datosGenerales.fase, 'fase'));
  body.appendChild(tr2);
  // Fila 3
  let tr3 = document.createElement('tr');
  tr3.appendChild(document.createElement('td')).innerHTML = '<b>Centro de Trabajo</b>';
  tr3.appendChild(createEditableCell(datosGenerales.centroTrabajo, 'centroTrabajo'));
  tr3.appendChild(document.createElement('td')).innerHTML = '<b>Zona Escolar</b>';
  tr3.appendChild(createEditableCell(datosGenerales.zonaEscolar, 'zonaEscolar'));
  body.appendChild(tr3);
  // Fila 4
  let tr4 = document.createElement('tr');
  tr4.appendChild(document.createElement('td')).innerHTML = '<b>Sector Educativo</b>';
  tr4.appendChild(createEditableCell(datosGenerales.sectorEducativo, 'sectorEducativo'));
  tr4.appendChild(document.createElement('td')).innerHTML = '<b>Nombre del Director</b>';
  tr4.appendChild(createEditableCell(datosGenerales.nombreDirector, 'nombreDirector'));
  body.appendChild(tr4);
  // Fila 5
  let tr5 = document.createElement('tr');
  tr5.appendChild(document.createElement('td')).innerHTML = '<b>Nombre del Docente</b>';
  tr5.appendChild(createEditableCell(datosGenerales.nombreDocente, 'nombreDocente'));
  tr5.appendChild(document.createElement('td')).innerHTML = '<b>Periodo de realización</b>';
  tr5.appendChild(createEditableCell((datosGenerales.inicioPeriodo && datosGenerales.finPeriodo) ? `${datosGenerales.inicioPeriodo} a ${datosGenerales.finPeriodo}` : (datosGenerales.periodoRealizacion || ''), 'periodoRealizacion'));
  body.appendChild(tr5);
  // Firmas
  if(document.getElementById('firmaDocenteNombre')) document.getElementById('firmaDocenteNombre').textContent = datosGenerales.nombreDocente || '';
  if(document.getElementById('firmaDirectorNombre')) document.getElementById('firmaDirectorNombre').textContent = datosGenerales.nombreDirector || '';
}

// --- Plano de la Problematización ---
function fillProblematizacion(planoProblematizacion) {
  const body = document.getElementById('problematizacionBody');
  if (!body) return;
  body.innerHTML = '';
  if (!Array.isArray(planoProblematizacion) || planoProblematizacion.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="2" style="text-align:center;font-style:italic;">No hay tarjetas de problematización registradas.</td>`;
    body.appendChild(tr);
    return;
  }

  planoProblematizacion.forEach((plan, index) => {
    // Tabla principal de la tarjeta
    const mainTableTr = document.createElement('tr');
    mainTableTr.innerHTML = `
      <td colspan="2" style="padding:0; border:none;">
        <table class="plan-table" style="width:100%; margin-bottom:0;">
          <tr style="background:#e6eaf1;">
            <th colspan="2" class="plano-titulo">Plano: ${plan.name || ''}</th>
          </tr>
          <tr>
            <td style="width:220px;"><strong>Nombre del Tema</strong></td>
            <td contenteditable="true">${plan.name || ''}</td>
          </tr>
          <tr>
            <td><strong>Descripción del Tema</strong></td>
            <td contenteditable="true">${plan.description || ''}</td>
          </tr>
        </table>
      </td>
    `;
    body.appendChild(mainTableTr);

    // Para cada situación
    if (Array.isArray(plan.situations) && plan.situations.length > 0) {
      plan.situations.forEach((situation, sIndex) => {
        // Tabla de la situación
        const situacionTr = document.createElement('tr');
        situacionTr.innerHTML = `
          <td colspan="2" style="padding:0; border:none;">
            <table class="plan-table situacion-table" style="width:calc(100% - 48px); margin: 24px 0 0 48px;">
              <tr style="background:#f7fafd;">
                <th colspan="2">Situación ${sIndex + 1}</th>
              </tr>
              <tr>
                <td style="width:200px;"><strong>Descripción de la Situación</strong></td>
                <td contenteditable="true">${situation.description || ''}</td>
              </tr>
            </table>
          </td>
        `;
        body.appendChild(situacionTr);
        // Tabla de problemas
        const problemasTr = document.createElement('tr');
        problemasTr.innerHTML = `
          <td colspan="2" style="padding:0; border:none;">
            <table class="plan-table problemas-table" style="width:calc(100% - 72px); margin: 20px 0 28px 72px;">
              <tr style="background:#f7fafd;">
                <th>Problemas identificados</th>
              </tr>
              ${Array.isArray(situation.problems) && situation.problems.length > 0
                ? situation.problems.map(problem => `<tr><td contenteditable="true">${problem}</td></tr>`).join('')
                : `<tr><td style='font-style:italic;'>No hay problemas registrados para esta situación.</td></tr>`}
            </table>
          </td>
        `;
        body.appendChild(problemasTr);
      });
    } else {
      const emptySituacionTr = document.createElement('tr');
      emptySituacionTr.innerHTML = `<td colspan="2" style="text-align:center;font-style:italic;">No hay situaciones registradas para este plan.</td>`;
      body.appendChild(emptySituacionTr);
    }
  });
}

// --- Plano de la Contextualización ---
function fillContextualizacion(tablaContextualizacion) {
  const body = document.getElementById('contextualizacionBody');
  if (!body) return;
  body.innerHTML = '';
  if (!Array.isArray(tablaContextualizacion)) return;
  
  // Cabecera de la tabla
  const header = document.createElement('tr');
  const headers = ['Problemas', 'Campos Formativos', 'Contenidos', 'PDAs', 'Ejes Articuladores'];
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    header.appendChild(th);
  });
  body.appendChild(header);

  if (!tablaContextualizacion || tablaContextualizacion.length === 0) {
    return;
  }

  tablaContextualizacion.forEach((row, idx) => {
    // Helper para crear celdas editables
    function createEditableCell(value, key) {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.textContent = value || '';
      td.classList.add('editable');
      td.addEventListener('blur', function() {
        row[key] = td.textContent;
      });
      td.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          td.blur();
        }
      });
      return td;
    }
    let problemaMostrar = '';
    if (row.problemas) {
      problemaMostrar = row.problemas;
    } else if (typeof row.problema === 'string' && row.problema.trim() !== '') {
      problemaMostrar = row.problema;
    } else {
      problemaMostrar = 'Seleccionar información';
    }
    let tr = document.createElement('tr');
    tr.appendChild(createEditableCell(problemaMostrar, 'problemas'));
    tr.appendChild(createEditableCell(row.camposFormativos || row.campos || row.camposFormativo, 'camposFormativos'));
    tr.appendChild(createEditableCell(row.contenidos, 'contenidos'));
    tr.appendChild(createEditableCell(row.pdas || row.pda, 'pdas'));
    tr.appendChild(createEditableCell(row.ejesArticuladores || row.eje, 'ejesArticuladores'));
    body.appendChild(tr);
  });
}

// Variable para almacenar el último JSON recibido
let ultimoJSONRecibido = null;

// Evento para recibir datos del parent
window.addEventListener('message', (event) => {
  if (event.data?.type === 'loadContextualData') {
    const data = event.data.data;
    ultimoJSONRecibido = data;
    fillDatosGenerales(data.datosGenerales || {});
    fillProblematizacion(data.planoProblematizacion || {});
    fillContextualizacion(data.planoContextualizacion || []);
  }
});

// --- Guardar/Cargar Formato ---
const saveFormatBtn = document.getElementById('save-format-btn');
const loadFormatBtn = document.getElementById('load-format-btn');
const loadFormatInput = document.getElementById('load-format-input');

if (saveFormatBtn) {
  saveFormatBtn.addEventListener('click', function() {
    // Guarda el último JSON recibido (o los datos actuales)
    if (!ultimoJSONRecibido) {
      alert('No hay datos para guardar.');
      return;
    }
    const blob = new Blob([JSON.stringify(ultimoJSONRecibido, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plano_contextual.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });
}
if (loadFormatBtn && loadFormatInput) {
  loadFormatBtn.addEventListener('click', function() {
    loadFormatInput.click();
  });
  loadFormatInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = JSON.parse(evt.target.result);
        ultimoJSONRecibido = data;
        fillDatosGenerales(data.datosGenerales || {});
        fillProblematizacion(data.planoProblematizacion || {});
        fillContextualizacion(data.planoContextualizacion || []);
      } catch (err) {
        alert('Archivo inválido.');
      }
    };
    reader.readAsText(file);
  });
}
// --- Logotipo ---
const addLogoBtn = document.getElementById('add-logo-btn');
const logoInput = document.getElementById('logo-input');
const logoPlaceholder = document.getElementById('logo-placeholder');
if (addLogoBtn && logoInput && logoPlaceholder) {
  addLogoBtn.addEventListener('click', function() {
    logoInput.click();
  });
  logoInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      logoPlaceholder.innerHTML = '';
      const img = document.createElement('img');
      img.src = evt.target.result;
      img.alt = 'Logotipo';
      logoPlaceholder.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}
// --- Botón imprimir ---
if (!document.getElementById('print-btn')) {
  const printBtn = document.createElement('button');
  printBtn.id = 'print-btn';
  printBtn.type = 'button';
  printBtn.textContent = 'Imprimir';
  printBtn.style = 'position:fixed;top:16px;right:16px;z-index:1000;';
  printBtn.onclick = () => window.print();
  document.body.appendChild(printBtn);
}
// Oculta el botón imprimir en modo impresión
if (window.matchMedia) {
  window.matchMedia('print').addEventListener('change', function(e) {
    const btn = document.getElementById('print-btn');
    if (btn) btn.style.display = e.matches ? 'none' : 'block';
  });
}


// Exponer funciones globalmente si se requiere
window.fillDatosGenerales = fillDatosGenerales;
window.fillEvaluacion = fillEvaluacion;