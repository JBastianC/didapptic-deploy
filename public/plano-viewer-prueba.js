// plano-viewer-prueba.js - Versión Final Corregida
document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const tablasIASection = document.getElementById('tablasIASection');
  const datosGeneralesBody = document.getElementById('datosGeneralesBody');
  const tablaUbicacion = document.getElementById('tablaUbicacion');
  const firmaDocenteNombre = document.getElementById('firmaDocenteNombre');
  const firmaDirectorNombre = document.getElementById('firmaDirectorNombre');
  const fechaActual = document.getElementById('fechaActual');
  const btnGuardarFormato = document.getElementById('btnGuardarFormato');
  const btnDescargarOriginal = document.getElementById('btnDescargarOriginal');
  const btnModoImpresion = document.getElementById('btnModoImpresion');
  const btnLogo = document.getElementById('btnLogo');
  const logoInput = document.getElementById('logoInput');
  const customLogo = document.getElementById('customLogo');
  const topMenu = document.getElementById('topMenu');

  // Variables de estado
  let currentJSONData = null;

  // Mostrar fecha actual
  function mostrarFechaActual() {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const hoy = new Date();
    fechaActual.textContent = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  }
  mostrarFechaActual();

  // Funciones para manipular tablas
  function addRow(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody') || table;
    const headerCells = table.rows[0].cells.length;
    const tr = document.createElement('tr');
    
    for (let i = 0; i < headerCells; i++) {
      const td = document.createElement('td');
      td.className = 'editable';
      td.contentEditable = true;
      tr.appendChild(td);
    }
    
    tbody.appendChild(tr);
  }

  function removeRow(btn) {
    const table = btn.closest('.table-actions')?.previousElementSibling;
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    if (rows.length > 2) {
      rows[rows.length - 1].remove();
    } else if (rows.length === 2) {
      rows[1].querySelectorAll('td').forEach(td => td.textContent = '');
    }
  }

  function arrayToTable(arr, title, headers, tableId) {
    const conceptosGris = [
      'Nivel Educativo','Nombre del Centro','Sector Educativo','Zona Escolar','Fase',
      'Grado','Grupo','Nombre del Docente','Nombre del Director','Periodo de realización',
      'Problema','PDA(s)','Contenido(s)','Campo(s)','Formativo(s)','Problema',
      'Proceso de pensamiento','Evidencia de aprendizaje','Nivel de logro','Fase',
      'Etapa','Actividades','Evaluación formativa','Fase','Tiempo','Espacio',
      'Recursos/Materiales','Actividad','Fecha','Observaciones'
    ];

    const isReflexiones = title.toLowerCase().includes('reflexiones');

    let html = `
      <h2>${title}</h2>
      <table class="plan-table" id="${tableId}">
        <thead>
          <tr>${
            headers.map(h => {
              const isConcepto = conceptosGris.some(c => h.toLowerCase().includes(c.toLowerCase()));
              return `<th class="${isConcepto ? 'concepto-gris' : ''}">${h}</th>`;
            }).join('')
          }</tr>
        </thead>
        <tbody>${
          arr.map(row => `
            <tr>${
              headers.map(h => {
                const isConcepto = conceptosGris.some(c => h.toLowerCase().includes(c.toLowerCase()));
                return `<td class="editable" contenteditable="true">${row[h] ?? ''}</td>`;
              }).join('')
            }</tr>
          `).join('')
        }</tbody>
      </table>
    `;

    if (!isReflexiones) {
      html += `
        <div class="table-actions">
          <button class="add-row-btn" onclick="addRow('${tableId}')">➕ Agregar fila</button>
          <button class="remove-row-btn" onclick="removeRow(this)">➖ Eliminar fila</button>
        </div>
      `;
    }

    return html;
  }

  // Procesamiento de datos
  function fillDatosGenerales(config) {
    function formatFecha(fechaStr) {
      if (!fechaStr) return '';
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const fecha = new Date(fechaStr);
      return isNaN(fecha.getTime()) ? fechaStr : `${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
    }

    let periodo = config?.periodo || '';
    if (!periodo && (config?.inicioPeriodo || config?.finPeriodo)) {
      const inicio = formatFecha(config.inicioPeriodo);
      const fin = formatFecha(config.finPeriodo);
      periodo = inicio && fin ? `${inicio} al ${fin}` : inicio ? `Desde ${inicio}` : fin ? `Hasta ${fin}` : '';
    }

    const conceptosGris = [
      'Nivel Educativo','Nombre del Centro','Sector Educativo','Zona Escolar','Fase',
      'Grado','Grupo','Nombre del Docente','Nombre del Director','Periodo de realización'
    ];

    const rows = [
      ['Nivel Educativo', config?.nivelEducativo || '', 'Nombre del Centro', config?.centroTrabajo || ''],
      ['Sector Educativo', config?.sectorEducativo || '', 'Zona Escolar', config?.zonaEscolar || ''],
      ['Fase', config?.fase || '', 'Grado', config?.grado || ''],
      ['Grupo', config?.grupo || '', 'Nombre del Docente', config?.docente || ''],
      ['Nombre del Director', config?.director || '', '', ''],
      ['Periodo de realización', periodo, '', '']
    ];

    datosGeneralesBody.innerHTML = rows.map(r => `
      <tr>${r.map((c, i) => {
        const isConcepto = conceptosGris.some(concepto => c.toLowerCase().includes(concepto.toLowerCase()));
        const isValor = (c === config?.fase) || (c === config?.zonaEscolar);
        return `<td class="${isConcepto && !isValor ? 'concepto-gris' : 'valor-normal'}" 
                contenteditable="true">${isConcepto && !isValor ? `<strong>${c}</strong>` : c}</td>`;
      }).join('')}</tr>
    `).join('');
  }

  function fillUbicacionCurricular(config) {
    const headers = ['Problema', 'PDA(s)', 'Contenido(s)', 'Campo(s) Formativo(s)'];
    const row = [
      config?.entrada || '',
      Array.isArray(config?.pdas) ? config.pdas.join(', ') : '',
      Array.isArray(config?.contenidos) ? config.contenidos.join(', ') : '',
      Array.isArray(config?.campos) ? config.campos.join(', ') : ''
    ];

    tablaUbicacion.innerHTML = `
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      <tr>${row.map(c => `<td class="editable" contenteditable="true">${c}</td>`).join('')}</tr>
      <div class="table-actions">
        <button class="add-row-btn" onclick="addRow('tablaUbicacion')">➕ Agregar fila</button>
        <button class="remove-row-btn" onclick="removeRow(this)">➖ Eliminar fila</button>
      </div>
    `;
  }

  function fillFirmas(config) {
    firmaDocenteNombre.textContent = config?.docente || '';
    firmaDirectorNombre.textContent = config?.director || '';
  }

  function renderIA(data) {
    if (!data || !data.tables) return;
    
    currentJSONData = data;
    tablasIASection.innerHTML = '';

    Object.entries(data.tables).forEach(([key, tableData]) => {
      try {
        const title = key.charAt(0).toUpperCase() + key.slice(1);
        const tableId = `tabla-${key}`;
        let parsedData = [];
        let headers = [];

        // Procesamiento especial para Reflexiones
        if (key.toLowerCase() === 'reflexiones') {
          headers = ['Reflexión'];
          let contenido = '';
          
          if (tableData.response) {
            try {
              const parsedResponse = typeof tableData.response === 'string' ? 
                                   JSON.parse(tableData.response) : 
                                   tableData.response;
              contenido = parsedResponse.response || parsedResponse.content || tableData.response;
            } catch (e) {
              contenido = tableData.response;
            }
          } else {
            contenido = tableData;
          }

          parsedData = [{
            'Reflexión': contenido || 'No hay reflexiones disponibles'
          }];
        } 
        // Procesamiento para Evaluación
        else if (key.toLowerCase() === 'evaluacion') {
          headers = ['Problema', 'Proceso de pensamiento', 'Evidencia de aprendizaje', 'Nivel de logro'];
          
          if (tableData.response) {
            try {
              parsedData = typeof tableData.response === 'string' ? 
                         JSON.parse(tableData.response) : 
                         tableData.response;
            } catch (e) {
              parsedData = [{'Problema': tableData.response}];
            }
          } else if (Array.isArray(tableData)) {
            parsedData = tableData;
          }

          if (parsedData.length === 0 && data.config?.entrada) {
            parsedData = [{
              'Problema': data.config.entrada,
              'Proceso de pensamiento': '',
              'Evidencia de aprendizaje': '',
              'Nivel de logro': ''
            }];
          }
        }
        // Procesamiento para otras tablas
        else {
          if (tableData.response) {
            try {
              parsedData = typeof tableData.response === 'string' ? 
                         JSON.parse(tableData.response) : 
                         tableData.response;
            } catch (e) {
              parsedData = [{'Contenido': tableData.response}];
            }
          } else if (Array.isArray(tableData)) {
            parsedData = tableData;
          } else if (typeof tableData === 'object') {
            parsedData = [tableData];
          }

          if (parsedData.length > 0) {
            headers = Object.keys(parsedData[0]);
          }
        }

        // Generar tabla si hay datos
        if (parsedData.length > 0) {
          tablasIASection.innerHTML += arrayToTable(parsedData, title, headers, tableId);
        }
      } catch (error) {
        console.error(`Error procesando tabla ${key}:`, error);
      }
    });
  }

  // Funciones para descarga
  function descargarJSONOriginal() {
    if (!currentJSONData) return alert('No hay datos para descargar');
    const blob = new Blob([JSON.stringify(currentJSONData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-docente-original-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function guardarFormato() {
    if (!currentJSONData) return alert('No hay datos para guardar');
    const blob = new Blob([JSON.stringify(currentJSONData, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plan-formato-actualizado.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 100);
  }

  // Configuración del modo impresión
  function configurarModoImpresion() {
    const style = document.createElement('style');
    style.id = 'print-styles';
    style.textContent = `
      @media print {
        body {
          width: 21cm;
          height: 29.7cm;
          margin: 0 auto;
          padding: 1cm;
          font-size: 12pt;
          background-color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .container {
          width: 100%;
          margin: 0;
          padding: 0;
          box-shadow: none;
          background-color: white !important;
        }
        h1, h2, h3 {
          font-size: 14pt !important;
          font-weight: bold !important;
        }
        .toolbar, .table-actions {
          display: none !important;
        }
        table {
          page-break-inside: avoid;
          background-color: white !important;
        }
        th, td {
          background-color: white !important;
        }
        .concepto-gris {
          background-color: #f2f2f2 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .plan-reflex {
          background-color: white !important;
          border: 1px solid #ddd !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
  configurarModoImpresion();

  // Event Listeners
  btnLogo.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        customLogo.src = evt.target.result;
        customLogo.style.display = 'block';
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });

  btnModoImpresion.addEventListener('click', () => {
    document.body.classList.toggle('print-mode');
    topMenu.style.display = document.body.classList.contains('print-mode') ? 'none' : '';
  });

  btnGuardarFormato.addEventListener('click', guardarFormato);
  btnDescargarOriginal.addEventListener('click', descargarJSONOriginal);

  // Cargar archivo JSON
  const loadInput = document.createElement('input');
  loadInput.type = 'file';
  loadInput.accept = 'application/json';
  loadInput.style.display = 'none';
  document.body.appendChild(loadInput);
  
  const btnLoad = document.createElement('button');
  btnLoad.textContent = 'Cargar Formato';
  btnLoad.onclick = () => loadInput.click();
  topMenu.insertBefore(btnLoad, btnGuardarFormato);
  
  loadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        fillDatosGenerales(json.config || {});
        fillUbicacionCurricular(json.config || {});
        fillFirmas(json.config || {});
        renderIA(json);
      } catch (err) {
        alert('Error: Archivo JSON inválido');
      }
    };
    reader.readAsText(file);
  });

  // Receptor de mensajes
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'loadData') {
      fillDatosGenerales(event.data.config || {});
      fillUbicacionCurricular(event.data.config || {});
      fillFirmas(event.data.config || {});
      renderIA(event.data);
    }
  });
});

// Funciones globales
window.addRow = function(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  const tbody = table.querySelector('tbody') || table;
  const headerCells = table.rows[0].cells.length;
  const tr = document.createElement('tr');
  
  for (let i = 0; i < headerCells; i++) {
    const td = document.createElement('td');
    if (i === 3 && table.id === 'evaluacionTable') {
      // Lista única de verbos de acción Marzano y Bloom
      const verbos = [
        'Analizar', 'Aplicar', 'Argumentar', 'Clasificar', 'Comparar', 'Componer', 'Concluir', 'Conectar', 'Construir', 'Contrastar', 'Crear', 'Criticar', 'Definir', 'Demostrar', 'Describir', 'Determinar', 'Dibujar', 'Discriminar', 'Diseñar', 'Discutir', 'Ejecutar', 'Evaluar', 'Explicar', 'Formular', 'Generar', 'Identificar', 'Inferir', 'Interpretar', 'Investigar', 'Juzgar', 'Justificar', 'Leer', 'Listar', 'Memorizar', 'Observar', 'Organizar', 'Planear', 'Predecir', 'Producir', 'Proponer', 'Recordar', 'Relacionar', 'Resolver', 'Seleccionar', 'Sintetizar', 'Utilizar', 'Valorar'
      ];
      const uniqueVerbs = [...new Set(verbos)].sort();
      const select = document.createElement('select');
      select.className = 'nivel-logro-select';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = '';
      select.appendChild(emptyOpt);
      uniqueVerbs.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        select.appendChild(opt);
      });
      td.appendChild(select);
    } else {
      td.className = 'editable';
      td.contentEditable = true;
    }
    tr.appendChild(td);
  }
  
  tbody.appendChild(tr);
};

window.removeRow = function(btn) {
  const table = btn.closest('.table-actions')?.previousElementSibling;
  if (!table) return;
  
  const rows = table.querySelectorAll('tr');
  if (rows.length > 2) {
    rows[rows.length - 1].remove();
  } else if (rows.length === 2) {
    rows[1].querySelectorAll('td').forEach(td => td.textContent = '');
  }
};