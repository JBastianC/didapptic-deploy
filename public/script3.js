document.addEventListener('DOMContentLoaded', async function() {
  // Opciones de campos por fase
  const campoOptions = {
    F3: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"],
    F4: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"],
    F5: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"]
  };

  // Opciones para Eje Articulador
  const ejeOptions = [
    "Inclusión", 
    "Pensamiento crítico", 
    "Interculturalidad crítica", 
    "Igualdad de género", 
    "Vida saludable", 
    "Apropiación de las culturas a través de la lectura y la escritura", 
    "Artes y experiencias estéticas"
  ];

  // Opciones para Nivel de Logro
  const nivelOptions = [
    "", "", "", "", "", "Visualizar"
  ].filter(opt => opt !== ""); // Eliminar opciones vacías

  // Función para sanitizar nombres de archivo
  function sanitizeFilename(name) {
    return name
      .replace(/,/g, '')
      .replace(/\s+/g, '_')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // Agregar al inicio del script3.js
  function setupPdaSelectionHandlers() {
    const pdasList = document.getElementById('pdasList');
    const selectedPdasList = document.getElementById('selectedPdasList');
    
    // Manejar selección de PDAs
    pdasList.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox') {
            const pdaText = e.target.nextElementSibling.textContent;
            const pdaId = e.target.id;
            
            if (e.target.checked) {
                // Crear elemento para lista de seleccionados
                const selectedItem = document.createElement('div');
                selectedItem.className = 'pda-item';
                selectedItem.dataset.pdaId = pdaId;
                selectedItem.textContent = pdaText;
                
                // Botón para eliminar
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '❌';
                deleteBtn.className = 'delete-pda-btn';
                deleteBtn.onclick = function() {
                    selectedItem.remove();
                    document.getElementById(pdaId).checked = false;
                };
                
                selectedItem.appendChild(deleteBtn);
                selectedPdasList.appendChild(selectedItem);
            } else {
                // Eliminar de la lista de seleccionados
                const itemToRemove = selectedPdasList.querySelector(`[data-pda-id="${pdaId}"]`);
                if (itemToRemove) itemToRemove.remove();
            }
        }
    });
    
    // Botón para limpiar todos
    const clearAllBtn = document.createElement('button');
    clearAllBtn.textContent = 'Limpiar todos';
    clearAllBtn.className = 'btn-cancel';
    clearAllBtn.style.margin = '10px 0';
    clearAllBtn.onclick = function() {
        selectedPdasList.innerHTML = '';
        pdasList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    };
    
    selectedPdasList.parentNode.appendChild(clearAllBtn);
}

  // Llamar esta función al final del DOMContentLoaded
  document.addEventListener('DOMContentLoaded', async function() {
      // ... código existente ...
      setupPdaSelectionHandlers();
  });

  // Función para cargar contenidos
  async function loadContenidos(fase, campo) {
    try {
      const sanitizedCampo = sanitizeFilename(campo);
      const file = `PDA_txt/${sanitizedCampo}_${fase}.txt`;
      
      const response = await fetch(file);
      if (!response.ok) throw new Error(`Archivo no encontrado: ${file}`);

      const text = await response.text();
      const lines = text.trim().split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("Formato de archivo incorrecto");

      const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
      const grados = headers.slice(1);
      
      const contenidosData = {};
      let currentContenido = '';

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split('|').map(p => p.trim());
        
        if (parts[1]) {
          currentContenido = parts[1];
          contenidosData[currentContenido] = {};
        }

        grados.forEach((grado, index) => {
          const pdaIndex = index + 2;
          if (parts[pdaIndex] && parts[pdaIndex].trim() !== '') {
            if (!contenidosData[currentContenido][grado]) {
              contenidosData[currentContenido][grado] = [];
            }
            contenidosData[currentContenido][grado].push(parts[pdaIndex].trim());
          }
        });
      }

      return contenidosData;
    } catch (err) {
      console.error('Error al cargar contenidos:', err);
      return null;
    }
  }

  // Función para abrir el selector de contenidos/PDA
  function openContenidosSelector(rowId, button) {
    currentPdaButton = button;
    currentPdaRowId = rowId;
    const popup = document.getElementById('pda-selector-overlay');
    popup.classList.add('active');
    
    // Resetear las listas
    document.getElementById('contenidosList').innerHTML = '';
    document.getElementById('pdasList').innerHTML = '';
    document.getElementById('selectedPdasList').innerHTML = '';
    
    // Eliminar cualquier selector de campos formativo previo
    const existingCampoSelector = document.querySelector('.campo-selector-container');
    if (existingCampoSelector) {
        existingCampoSelector.remove();
    }
    
    // Cargar datos del renglón principal
    const rowData = rowsState[rowId];
    if (rowData && rowData.fase) {
        // Crear selector de campos formativos para el popup
        createCampoSelector(rowData);
        
        // Cargar selecciones guardadas si existen
        if (rowData.campos && rowData.campos.length > 0) {
            loadSavedSelections(rowData);
        }
    }
}

function loadSavedSelections(rowData) {
    // 1. Marcar los campos formativos guardados
    const camposCheckboxes = document.querySelectorAll('#popupCamposList input[type="checkbox"]');
    camposCheckboxes.forEach(checkbox => {
        if (rowData.campos.includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });

    // 2. Cargar contenidos y marcar los seleccionados
    if (rowData.contenidos && rowData.contenidos.length > 0) {
        // Esperar a que se carguen los contenidos
        setTimeout(async () => {
            const contenidosCheckboxes = document.querySelectorAll('#contenidosList input[type="checkbox"]');
            
            contenidosCheckboxes.forEach(checkbox => {
                const [campo, contenido] = checkbox.value.split('|');
                if (rowData.contenidos.includes(contenido)) {
                    checkbox.checked = true;
                    // Cargar los PDAs para este contenido
                    loadPdasForContenido(contenido, campo, rowData.pda);
                }
            });
        }, 100);
    }
}

// Modificar loadPdasForContenido para aceptar PDAs pre-seleccionados
async function loadPdasForContenido(contenido, campo, preselectedPdas = []) {
    const fase = document.querySelector(`tr[data-row-id="${currentPdaRowId}"] .field-group:nth-child(2) select`).value;
    const faseSimple = fase.replace('Fase ', 'F');
    const pdasList = document.getElementById('pdasList');
    
    try {
        const contenidosData = await loadContenidos(faseSimple, campo);
        if (!contenidosData || !contenidosData[contenido]) return;
        
        // Agregar título del contenido
        const contenidoHeader = document.createElement('h4');
        contenidoHeader.textContent = `${campo} > ${contenido}`;
        contenidoHeader.style.color = '#64748b';
        contenidoHeader.dataset.contenidoId = `${campo}-${contenido}`;
        pdasList.appendChild(contenidoHeader);
        
        // Agregar PDAs por grado
        const gradosPdas = contenidosData[contenido];
        const sortedGrados = Object.keys(gradosPdas).sort();
        
        sortedGrados.forEach(grado => {
            gradosPdas[grado].forEach((pda, index) => {
                const pdaItem = document.createElement('div');
                pdaItem.className = 'pda-item';
                pdaItem.dataset.contenidoId = `${campo}-${contenido}`;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `pda-${sanitizeFilename(campo)}-${sanitizeFilename(contenido)}-${grado}-${index}`;
                checkbox.value = `${grado}: ${pda}`;
                
                // Marcar como seleccionado si está en los PDAs guardados
                if (preselectedPdas && preselectedPdas.includes(`${grado}: ${pda}`)) {
                    checkbox.checked = true;
                    updateSelectedPdas(checkbox);
                }
                
                checkbox.addEventListener('change', function() {
                    updateSelectedPdas(this);
                });
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = pda;
                
                pdaItem.appendChild(checkbox);
                pdaItem.appendChild(label);
                pdasList.appendChild(pdaItem);
            });
        });
    } catch (error) {
        console.error(`Error cargando PDAs para ${contenido}:`, error);
    }
}

// Modificar los event listeners para resetear PDAs cuando cambian los campos o contenidos
function createCampoSelector(rowData) {
    const camposContainer = document.createElement('div');
    camposContainer.className = 'campo-selector-container';
    camposContainer.innerHTML = `
        <h3>Campos Formativos</h3>
        <div class="campos-list" id="popupCamposList"></div>
    `;
    
    document.getElementById('contenidosContainer').prepend(camposContainer);
    
    const camposList = document.getElementById('popupCamposList');
    const availableCampos = ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"];
    
    availableCampos.forEach(campo => {
        const campoItem = document.createElement('div');
        campoItem.className = 'campo-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `campo-${sanitizeFilename(campo)}`;
        checkbox.value = campo;
        checkbox.checked = rowData.campos && rowData.campos.includes(campo);
        
        checkbox.addEventListener('change', async () => {
            // Resetear PDAs seleccionados cuando cambian los campos
            document.getElementById('selectedPdasList').innerHTML = '';
            await updateContenidosList(rowData.fase);
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = campo;
        
        campoItem.appendChild(checkbox);
        campoItem.appendChild(label);
        camposList.appendChild(campoItem);
    });
    
    // Cargar contenidos iniciales
    updateContenidosList(rowData.fase);
}

// Modificar la función que maneja los cambios en contenidos
async function updateContenidosList(fase) {
    const faseSimple = fase.replace('Fase ', 'F');
    const contenidosList = document.getElementById('contenidosList');
    contenidosList.innerHTML = '';
    
    const selectedCampos = Array.from(
        document.querySelectorAll('#popupCamposList input[type="checkbox"]:checked')
    ).map(cb => cb.value);
    
    for (const campo of selectedCampos) {
        try {
            const contenidosData = await loadContenidos(faseSimple, campo);
            if (!contenidosData) continue;
            
            // Agregar título del campo formativo
            const campoHeader = document.createElement('h4');
            campoHeader.textContent = campo;
            campoHeader.style.color = '#eb4625';
            campoHeader.style.marginTop = '10px';
            contenidosList.appendChild(campoHeader);
            
            // Agregar contenidos
            Object.keys(contenidosData).forEach(contenido => {
                const contenidoItem = document.createElement('div');
                contenidoItem.className = 'contenido-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `cont-${sanitizeFilename(campo)}-${sanitizeFilename(contenido)}`;
                checkbox.value = `${campo}|${contenido}`;
                
                checkbox.addEventListener('change', async () => {
                    if (checkbox.checked) {
                        // Resetear PDAs seleccionados cuando se cambian contenidos
                        document.getElementById('selectedPdasList').innerHTML = '';
                        await loadPdasForContenido(contenido, campo);
                    } else {
                        removePdasForContenido(contenido, campo);
                    }
                });
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = contenido;
                
                contenidoItem.appendChild(checkbox);
                contenidoItem.appendChild(label);
                contenidosList.appendChild(contenidoItem);
            });
        } catch (error) {
            console.error(`Error cargando contenidos para ${campo}:`, error);
        }
    }
}

async function loadPdasForContenido(contenido, campo) {
  const fase = document.querySelector(`tr[data-row-id="${currentPdaRowId}"] .field-group:nth-child(2) select`).value;
  const faseSimple = fase.replace('Fase ', 'F');
  const pdasList = document.getElementById('pdasList');
  
  try {
      const contenidosData = await loadContenidos(faseSimple, campo);
      if (!contenidosData || !contenidosData[contenido]) return;
      
      // Agregar título del contenido
      const contenidoHeader = document.createElement('h4');
      contenidoHeader.textContent = `${campo} > ${contenido}`;
      contenidoHeader.style.color = '#64748b';
      contenidoHeader.dataset.contenidoId = `${campo}-${contenido}`;
      pdasList.appendChild(contenidoHeader);
      
      // Agregar PDAs por grado
      const gradosPdas = contenidosData[contenido];
      const sortedGrados = Object.keys(gradosPdas).sort();
      
      sortedGrados.forEach(grado => {
          gradosPdas[grado].forEach((pda, index) => {
              const pdaItem = document.createElement('div');
              pdaItem.className = 'pda-item';
              pdaItem.dataset.contenidoId = `${campo}-${contenido}`;
              
              const checkbox = document.createElement('input');
              checkbox.type = 'checkbox';
              checkbox.id = `pda-${sanitizeFilename(campo)}-${sanitizeFilename(contenido)}-${grado}-${index}`;
              checkbox.value = `${grado}: ${pda}`;
              
              checkbox.addEventListener('change', function() {
                  updateSelectedPdas(this);
              });
              
              const label = document.createElement('label');
              label.htmlFor = checkbox.id;
              label.textContent = pda;
              
              pdaItem.appendChild(checkbox);
              pdaItem.appendChild(label);
              pdasList.appendChild(pdaItem);
          });
      });
  } catch (error) {
      console.error(`Error cargando PDAs para ${contenido}:`, error);
  }
}

function removePdasForContenido(contenido, campo) {
  const pdasList = document.getElementById('pdasList');
  const contenidoId = `${campo}-${contenido}`;
  
  // Eliminar header y PDAs del contenido
  const elementsToRemove = pdasList.querySelectorAll(`[data-contenido-id="${contenidoId}"]`);
  elementsToRemove.forEach(el => el.remove());
  
  // Eliminar PDAs seleccionados de este contenido
  const selectedPdasList = document.getElementById('selectedPdasList');
  const selectedToRemove = selectedPdasList.querySelectorAll(`[data-contenido-id="${contenidoId}"]`);
  selectedToRemove.forEach(el => el.remove());
}

function updateSelectedPdas(checkbox) {
  const selectedPdasList = document.getElementById('selectedPdasList');
  const pdaItem = checkbox.closest('.pda-item');
  const contenidoId = pdaItem.dataset.contenidoId;
  const pdaText = pdaItem.querySelector('label').textContent;
  
  if (checkbox.checked) {
      const selectedItem = document.createElement('div');
      selectedItem.className = 'pda-item';
      selectedItem.textContent = pdaText;
      selectedItem.dataset.contenidoId = contenidoId;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '❌';
      deleteBtn.className = 'delete-pda-btn';
      deleteBtn.onclick = function() {
          selectedItem.remove();
          checkbox.checked = false;
      };
      
      selectedItem.appendChild(deleteBtn);
      selectedPdasList.appendChild(selectedItem);
  } else {
      const items = selectedPdasList.querySelectorAll('.pda-item');
      items.forEach(item => {
          if (item.textContent.replace('❌', '').trim() === pdaText) {
              item.remove();
          }
      });
  }
}

  // Verificar autenticación y cargar datos del usuario
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (!userData) {
    window.location.href = 'login.html';
    return;
  }

  // Mostrar información del usuario en la barra superior
  document.getElementById('userEmail').textContent = userData.email;
  const membershipBadge = document.getElementById('userMembership');
  membershipBadge.textContent = userData.membership === 'premium' ? 'Premium' : 'Básico';
  membershipBadge.classList.add(userData.membership === 'premium' ? 'premium' : 'basic');

  // Configurar el botón premium y mensaje de estado
  const btnPremium = document.querySelector('.btn-premium');
  const premiumStatusContainer = document.createElement('div');
  premiumStatusContainer.className = 'premium-status-container';
  premiumStatusContainer.innerHTML = `
    <div id="premiumStatusMessage" class="status-message hidden"></div>
  `;
  const contentHeader = document.querySelector('.content-header');
  if (contentHeader) {
    contentHeader.parentNode.insertBefore(premiumStatusContainer, contentHeader.nextSibling);
  } else {
    document.body.insertBefore(premiumStatusContainer, document.body.firstChild);
  }

  // Botón premium
  const popup = document.getElementById('premiumPopup');
  const closePopup = document.querySelector('.close-popup');
  const statusMessage = document.getElementById('premiumStatusMessage');

  if (btnPremium) {
      btnPremium.addEventListener('click', () => {
          if (userData.membership !== 'premium') {
              popup.classList.remove('hidden');
          } else {
              statusMessage.textContent = "✅ ¡Ya eres usuario Premium!";
              statusMessage.classList.remove('hidden', 'error');
              statusMessage.classList.add('success');
              setTimeout(() => statusMessage.classList.add('hidden'), 3000);
          }
      });
  }

  if (closePopup) {
      closePopup.addEventListener('click', () => {
          popup.classList.add('hidden');
      });
  }

  // Obtener datos del usuario
  const isPremium = userData && userData.membership === 'premium';
  const isAdmin = userData && userData.membership === 'admin';

  // Datos del menú con enlaces
  const menuItems = [
      {
          icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
          text: 'Inicio',
          href: 'dashboard.html'
      }
  ];
  
  // Solo agregar herramientas de IA si es premium
  if (isPremium) {
      menuItems.push({
          icon: '<path d="M13 10V3L4 14h7v7l9-11h-7z"/>',
          text: 'Herramientas de IA',
          href: 'herramientasAI.html'
      });
  }
  
  menuItems.push(
      {
          icon: '<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
          text: 'Plano de la Realidad',
          href: 'plano-realidad.html'
      },
      {
          icon: '<path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
          text: 'Plano Contextual',
          href: 'plano-contextual.html'
      },
      {
          icon: '<path d="M4 3a2 2 0 0 1 2-2h8l6 6v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3zm9 1v4h4M7 10h6M7 14h6M7 18h4M16 13l-2 2 1 3 3-1 2-2-4-4-2 2z"/>',
          text: 'Plano Didáctico',
          href: 'plano-didactico.html'
      }
  );

  // Generar menú
  const menuContainer = document.getElementById('main-menu');
  menuItems.forEach(item => {
    const menuItem = document.createElement('a');
    menuItem.className = 'menu-item';
    menuItem.href = item.href;
    menuItem.innerHTML = `
      <svg viewBox="0 0 24 24">
        ${item.icon}
      </svg>
      <span>${item.text}</span>
    `;
    menuContainer.appendChild(menuItem);
  });

  // Configurar botón de logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      window.location.href = 'login.html';
    });
  }

  // Funciones para interactuar con el backend
  async function loadContextData() {
    try {
      const res = await fetch('/api/context', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      return data.success ? data.contextData : [];
    } catch (error) {
      console.error('Error al cargar datos contextuales:', error);
      return [];
    }
  }

  async function saveContextData(contextData) {
    try {
      const res = await fetch('/api/context/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contextData })
      });
      return await res.json();
    } catch (error) {
      console.error('Error al guardar datos contextuales:', error);
      return { success: false, message: 'Error de conexión' };
    }
  }

  // Cargar problemas desde el Plano de la Realidad (backend)
  async function loadProblemsFromReality() {
    try {
      const res = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      
      if (data.success) {
        const problems = [];
        data.plans.forEach(plan => {
          plan.situations?.forEach(situation => {
            problems.push(...(situation.problems || []));
          });
        });
        return problems.length > 0 ? problems : ["No hay problemas registrados"];
      }
      return ["No hay problemas registrados"];
    } catch (error) {
      console.error("Error al cargar problemas:", error);
      return ["Error al cargar problemas"];
    }
  }

  // Variables de estado
  let problemsFromSituation = await loadProblemsFromReality();
  let rowsState = {};
  let rowCounter = 0;

  // Variables para el selector de PDA
  let currentPdaButton = null;
  let currentPdaRowId = null;

  // Cargar datos guardados al iniciar
  const savedData = await loadContextData();
  if (savedData.length > 0) {
    rowsState = savedData.reduce((acc, row) => {
      acc[row.rowId] = row;
      const num = parseInt(row.rowId.split('_')[1], 10);
      if (num > rowCounter) rowCounter = num;
      return acc;
    }, {});
  }

  // UI Elements
  const infoBox = createInfoBox();
  document.body.appendChild(infoBox);
  positionInfoBox();
  window.addEventListener('resize', positionInfoBox);

  const tbody = document.querySelector('#info-table tbody');
  tbody.innerHTML = "";
  Object.values(rowsState).forEach(rowData => addPrimaryRow(rowData));

  const addRowBtn = document.getElementById('add-row-btn');
  addRowBtn.addEventListener('click', function() {
    addPrimaryRow();
  });

  // Evento para el botón hoja: abrir visor contextual
  const openViewerBtn = document.getElementById('open-viewer-btn');
  if (openViewerBtn) {
    openViewerBtn.addEventListener('click', async function () {
      try {
        // Recopilar datos de configuración
        let datosGenerales = {};
        let configuracion = {};
        try {
          const res = await fetch('/api/config', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const data = await res.json();
          if (data.success && data.config) {
            datosGenerales = {
              nivelEducativo: data.config.nivelEducativo || '',
              centroTrabajo: data.config.centroTrabajo || '',
              sectorEducativo: data.config.sectorEducativo || '',
              zonaEscolar: data.config.zonaEscolar || '',
              fase: data.config.fase || '',
              grado: data.config.grado || '',
              grupo: data.config.grupo || '',
              nombreDocente: data.config.nombreDocente || '',
              nombreDirector: data.config.nombreDirector || '',
              inicioPeriodo: data.config.inicioPeriodo || '',
              finPeriodo: data.config.finPeriodo || ''
            };
            configuracion = { ...datosGenerales };
          } else {
            throw new Error('No config from backend');
          }
        } catch (e) {
          const getVal = id => {
            const el = document.getElementById(id);
            return el ? el.value || el.textContent || '' : '';
          };
          datosGenerales = {
            nivelEducativo: getVal('nivelEducativo'),
            centroTrabajo: getVal('centroTrabajo'),
            sectorEducativo: getVal('sectorEducativo'),
            zonaEscolar: getVal('zonaEscolar'),
            fase: getVal('fase'),
            grado: getVal('grado'),
            grupo: getVal('grupo'),
            nombreDocente: getVal('nombreDocente'),
            nombreDirector: getVal('nombreDirector'),
            inicioPeriodo: getVal('inicioPeriodo'),
            finPeriodo: getVal('finPeriodo')
          };
          configuracion = { ...datosGenerales };
          if (!datosGenerales.nivelEducativo && localStorage.getItem('userConfig')) {
            try {
              const configObj = JSON.parse(localStorage.getItem('userConfig'));
              datosGenerales = { ...configObj };
              configuracion = { ...configObj };
            } catch {}
          }
        }

        window.open('plano-contextual-viewer.html', '_blank');
      } catch (err) {
        console.error('No se pudo generar ni enviar el JSON al visor contextual', err);
      }
    });
  }

  // Selector de PDA - Botón guardar
  document.getElementById('pda-selector-save').addEventListener('click', async function() {
    try {
        if (!currentPdaRowId) return;
        
        // Obtener campos seleccionados
        const selectedCampos = Array.from(
            document.querySelectorAll('#popupCamposList input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        
        // Obtener contenidos seleccionados
        const selectedContenidos = Array.from(
            document.querySelectorAll('#contenidosList input[type="checkbox"]:checked')
        ).map(cb => cb.value.split('|')[1]);
        
        // Obtener PDAs seleccionados
        const selectedPdas = Array.from(
            document.querySelectorAll('#selectedPdasList .pda-item')
        ).map(item => item.textContent.replace('❌', '').trim());
        
        // Actualizar estado
        rowsState[currentPdaRowId].campos = selectedCampos;
        rowsState[currentPdaRowId].contenidos = selectedContenidos;
        rowsState[currentPdaRowId].pda = selectedPdas;
        
        // Actualizar UI
        safeUpdateRowUI(currentPdaRowId);
        
        // Guardar cambios
        const saveResult = await saveContextData(rowsState[currentPdaRowId]);
        if (!saveResult.success) {
            console.error('Error al guardar cambios:', saveResult.message);
            alert('Error al guardar los cambios');
        }
        
        document.getElementById('pda-selector-overlay').classList.remove('active');
    } catch (error) {
        console.error('Error al guardar selecciones:', error);
        alert('Ocurrió un error al guardar las selecciones');
    }
});

  // Selector de PDA - Botón cancelar
  document.getElementById('pda-selector-cancel').addEventListener('click', function() {
    document.getElementById('pda-selector-overlay').classList.remove('active');
  });

  // Funciones de UI
  function positionInfoBox() {
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      const rect = topBar.getBoundingClientRect();
      infoBox.style.top = (rect.bottom + 600) + "px";
      infoBox.style.left = (rect.left + 800) + "px";
    }
  }

  function createInfoBox() {
    const box = document.createElement('div');
    box.id = "info-box";
    Object.assign(box.style, {
      position: "fixed",
      width: "300px",
      backgroundColor: "#fff",
      border: "1px solid #cbd5e1",
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      zIndex: "2000",
      cursor: "move",
      padding: "0"
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      backgroundColor: "#eb4625",
      color: "#fff",
      padding: "5px 10px",
      cursor: "move"
    });
    header.textContent = "Información Completa";

    const collapseBtn = document.createElement('span');
    collapseBtn.textContent = "−";
    collapseBtn.style.float = "right";
    collapseBtn.style.cursor = "pointer";
    header.appendChild(collapseBtn);

    const content = document.createElement('div');
    content.id = "info-box-content";
    Object.assign(content.style, {
      padding: "10px",
      maxHeight: "100px",
      overflowY: "auto"
    });
    content.textContent = "";

    box.appendChild(header);
    box.appendChild(content);

    // Drag functionality
    let isDragging = false, offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', function(e) {
      isDragging = true;
      offsetX = e.clientX - box.offsetLeft;
      offsetY = e.clientY - box.offsetTop;
    });
    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        box.style.left = (e.clientX - offsetX) + 'px';
        box.style.top = (e.clientY - offsetY) + 'px';
      }
    });
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });

    // Collapse/expand
    collapseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (content.style.display === "none") {
        content.style.display = "block";
        collapseBtn.textContent = "−";
      } else {
        content.style.display = "none";
        collapseBtn.textContent = "+";
      }
    });
    return box;
  }

  function updateInfoBox(field, concept) {
    const infoContent = document.getElementById('info-box-content');
    let text = "";
    if (field.tagName.toLowerCase() === "select") {
      text = field.options[field.selectedIndex].text;
    } else if (field.tagName.toLowerCase() === "input" || field.tagName.toLowerCase() === "textarea") {
      text = field.value;
    }
    infoContent.textContent = concept + ": " + text;
  }

  // Funciones para manejar filas
  function createFieldGroup(labelText, type) {
    const group = document.createElement('div');
    group.classList.add('field-group');
    const label = document.createElement('label');
    label.textContent = labelText;
    group.appendChild(label);
    if (type === "select") {
      const select = document.createElement('select');
      select.style.width = "150px";
      select.addEventListener('focus', function() {
        updateInfoBox(select, labelText);
      });
      select.addEventListener('change', function() {
        updateInfoBox(select, labelText);
      });
      group.appendChild(select);
    } else if (type === "button") {
      const button = document.createElement('button');
      button.style.width = "150px";
      group.appendChild(button);
    }
    return group;
  }

  function populateSelect(selectElement, optionsArray, includeDefault = true) {
    if (!selectElement) return;
    selectElement.innerHTML = "";
    
    if (includeDefault) {
        const defaultOption = document.createElement('option');
        defaultOption.value = "";
        defaultOption.textContent = "Seleccione...";
        selectElement.appendChild(defaultOption);
    }
    
    optionsArray.forEach(function(opt) {
        if (opt === "") return; // Skip empty options if we already added default
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        selectElement.appendChild(option);
    });
  }

  // Reemplazar la función addPrimaryRow con esta versión modificada
  async function addPrimaryRow(data = null) {
    let rowId;
    if (data === null) {
      rowCounter++;
      rowId = 'row_' + rowCounter;
      data = { 
        rowId: rowId, 
        problemas: "", 
        fase: "", 
        campos: [], 
        contenidos: "", 
        pda: "", 
        eje: ""
      };
      rowsState[rowId] = data;
      const saveResult = await saveContextData(data);
      if (!saveResult.success) {
        console.error('Error al guardar nueva fila:', saveResult.message);
        return;
      }
    } else {
      rowId = data.rowId;
    }

    const tr = document.createElement('tr');
    tr.classList.add('primary-row');
    tr.setAttribute('data-row-id', rowId);
    const td = document.createElement('td');

    // Header con botón de generación
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('primary-row-header');
    headerDiv.style.display = "flex";
    headerDiv.style.alignItems = "center";
    headerDiv.style.justifyContent = "space-between";

    const leftHeader = document.createElement('div');
    leftHeader.style.display = "flex";
    leftHeader.style.alignItems = "center";

    const toggleIcon = document.createElement('span');
    toggleIcon.classList.add('toggle-icon');
    toggleIcon.textContent = "▼";
    toggleIcon.style.marginRight = "10px";

    const labelSpan = document.createElement('span');
    labelSpan.classList.add('row-label');
    labelSpan.textContent = data.problemas || "Seleccionar información";

    const generateBtn = document.createElement('button');
    generateBtn.classList.add('generate-location-btn');
    generateBtn.innerHTML = '♻️ Generar Ubicación';
    generateBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      if (typeof descontarCredito === 'function') descontarCredito();
      await generateLocation(rowId);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      try {
        const response = await fetch(`/api/context/delete/${rowId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const result = await response.json();
        if (result.success) {
          delete rowsState[rowId];
          tr.remove();
        } else {
          console.error('Error al eliminar fila:', result.message);
          alert('No se pudo eliminar la fila: ' + result.message);
        }
      } catch (error) {
        console.error('Error al eliminar fila:', error);
        alert('Error al comunicarse con el servidor');
      }
    });

    leftHeader.appendChild(toggleIcon);
    leftHeader.appendChild(labelSpan);
    headerDiv.appendChild(leftHeader);
    
    const rightHeader = document.createElement('div');
    rightHeader.style.display = "flex";
    rightHeader.style.alignItems = "center";
    rightHeader.style.gap = "0.5rem";
    rightHeader.appendChild(generateBtn);
    rightHeader.appendChild(deleteBtn);
    headerDiv.appendChild(rightHeader);

    // Collapsible content
    const collapsibleDiv = document.createElement('div');
    collapsibleDiv.classList.add('collapsible-content');

    const fieldsGrid = document.createElement('div');
    fieldsGrid.classList.add('fields-grid');

    // Declare controls
    let problemasSelect, faseSelect, camposSelect, contenidosBtn, pdaBtn, ejeSelect;

    // Field 1: Problemas
    const col1 = createFieldGroup("Problemas Redactados", "select");
    problemasSelect = col1.querySelector('select');
    if (problemasSelect) {
      populateSelect(problemasSelect, problemsFromSituation);
      if (data.problemas) problemasSelect.value = data.problemas;
      problemasSelect.addEventListener('change', async function() {
        rowsState[rowId].problemas = problemasSelect.value;
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    // Field 2: Fase
    const col2 = createFieldGroup("Fase", "select");
    faseSelect = col2.querySelector('select');
    if (faseSelect) {
      populateSelect(faseSelect, ["", "Fase 1","Fase 2","Fase 3", "Fase 4", "Fase 5"]);
      if (data.fase) faseSelect.value = data.fase;
      faseSelect.addEventListener('change', async function() {
        rowsState[rowId].fase = faseSelect.value;
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    // Field 3: Campos Formativos (ahora múltiple)
    const col3 = createFieldGroup("Campos Formativos", "select");
    camposSelect = col3.querySelector('select');
    camposSelect.multiple = true;
    camposSelect.size = 3;
    
    // Agregar contenedor para el hint de selección múltiple
    const camposContainer = document.createElement('div');
    camposContainer.className = 'select-multiple-container';
    camposContainer.appendChild(camposSelect);
    col3.appendChild(camposContainer);
    
    if (camposSelect) {
      populateSelect(camposSelect, ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"]);
      if (data.campos && data.campos.length > 0) {
        Array.from(camposSelect.options).forEach(option => {
          if (data.campos.includes(option.value)) {
            option.selected = true;
          }
        });
      }
      camposSelect.addEventListener('change', async function() {
        rowsState[rowId].campos = Array.from(camposSelect.selectedOptions).map(opt => opt.value);
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    // Field 4: Contenidos (botón que abre el selector)
    const col4 = createFieldGroup("Contenidos", "button");
    contenidosBtn = col4.querySelector('button');
    contenidosBtn.textContent = data.contenidos ? data.contenidos : "Seleccionar Contenidos";
    contenidosBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openContenidosSelector(rowId, contenidosBtn);
    });

    // Field 5: PDA (muestra los seleccionados)
    const col5 = createFieldGroup("PDA", "button");
    pdaBtn = col5.querySelector('button');
    pdaBtn.textContent = data.pda ? data.pda : "PDAs seleccionados";
    pdaBtn.classList.add("pda-display");

    // Field 6: Eje Articulador
    const col6 = createFieldGroup("Eje Articulador", "select");
    ejeSelect = col6.querySelector('select');
    if (ejeSelect) {
      populateSelect(ejeSelect, [""].concat(ejeOptions));
      if (data.eje) ejeSelect.value = data.eje;
      ejeSelect.addEventListener('change', async function() {
        rowsState[rowId].eje = ejeSelect.value;
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    fieldsGrid.append(col1, col2, col3, col4, col5, col6);
    collapsibleDiv.appendChild(fieldsGrid);

    // Toggle collapsible
    headerDiv.addEventListener("click", function() {
      collapsibleDiv.classList.toggle("active");
      toggleIcon.classList.toggle("rotated");
    });

    td.appendChild(headerDiv);
    td.appendChild(collapsibleDiv);
    tr.appendChild(td);
    tbody.appendChild(tr);

    function checkCompletion() {
      let complete = true;
      const selects = [problemasSelect, faseSelect, ejeSelect];
      selects.forEach(function(sel) {
        if (!sel || !sel.value) complete = false;
      });
      if (!rowsState[rowId].campos || rowsState[rowId].campos.length === 0) complete = false;
      if (!rowsState[rowId].contenidos || !rowsState[rowId].pda) complete = false;
      
      if (complete) {
        tr.classList.add("complete");
        labelSpan.textContent = problemasSelect ? problemasSelect.value : "Seleccionar información";
      } else {
        tr.classList.remove("complete");
        labelSpan.textContent = "Seleccionar información";
      }
    }
    tr.checkCompletion = checkCompletion;
    checkCompletion();
  }

  // Nueva función para generar ubicación automática
  async function generateLocation(rowId) {
    // Verificar membresía
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.membership !== 'premium') {
        alert('Debes ser Premium para usar esta funcionalidad');
        return;
    }

    const rowData = rowsState[rowId];
    if (!rowData || !rowData.problemas || !rowData.fase) {
        alert('Por favor selecciona un problema y una fase primero');
        return;
    }

    try {
        const fase = rowData.fase.replace('Fase ', 'F');
        const problema = rowData.problemas.toLowerCase();
        const allCampos = ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"];
        
        let matchedResults = [];
        
        for (const campo of allCampos) {
            try {
                const contenidosData = await loadContenidos(fase, campo);
                if (!contenidosData) continue;
                
                for (const [contenido, gradosPdas] of Object.entries(contenidosData)) {
                    for (const [grado, pdas] of Object.entries(gradosPdas)) {
                        pdas.forEach(pda => {
                            const pdaLower = pda.toLowerCase();
                            let score = 0;
                            
                            // Coincidencia exacta
                            if (pdaLower.includes(problema)) {
                                score += 10;
                            }
                            
                            // Coincidencia de palabras clave
                            problema.split(/\W+/).forEach(word => {
                                if (word.length > 3 && pdaLower.includes(word)) {
                                    score += 5;
                                }
                            });
                            
                            if (score > 0) {
                                matchedResults.push({
                                    campo,
                                    contenido,
                                    grado,
                                    pda,
                                    score
                                });
                            }
                        });
                    }
                }
            } catch (error) {
                console.error(`Error procesando campo ${campo}:`, error);
                continue;
            }
        }
        
        if (matchedResults.length === 0) {
            alert('No se encontraron PDAs coincidentes. Por favor selecciona manualmente.');
            return;
        }
        
        // Ordenar por puntaje y seleccionar los mejores
        matchedResults.sort((a, b) => b.score - a.score);
        const bestMatches = matchedResults.slice(0, 5);
        
        // Preparar datos para actualizar
        const matchedCampos = [...new Set(bestMatches.map(item => item.campo))];
        const matchedContenidos = [...new Set(bestMatches.map(item => item.contenido))];
        const matchedPdas = bestMatches.map(item => `${item.grado}: ${item.pda}`);
        
        // Actualizar el estado
        rowsState[rowId].campos = matchedCampos;
        rowsState[rowId].contenidos = matchedContenidos;
        rowsState[rowId].pda = matchedPdas;
        
        // Actualizar UI sin errores
        safeUpdateRowUI(rowId);
        
        // Guardar cambios
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
            console.error('Error al guardar cambios:', saveResult.message);
            throw new Error('Error al guardar');
        }
    } catch (error) {
        console.error('Error en generateLocation:', error);
        alert('Ocurrió un error al generar la ubicación automática');
    }
}

// Función segura para actualizar UI
function safeUpdateRowUI(rowId) {
    try {
        const rowData = rowsState[rowId];
        if (!rowData) return;
        
        const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
        if (!rowElement) return;
        
        // Actualizar campos formativos
        const camposSelect = rowElement.querySelector('.field-group:nth-child(3) select');
        if (camposSelect) {
            Array.from(camposSelect.options).forEach(option => {
                option.selected = Array.isArray(rowData.campos) 
                    ? rowData.campos.includes(option.value)
                    : false;
            });
        }
        
        // Actualizar contenidos
        const contenidosBtn = rowElement.querySelector('.field-group:nth-child(4) button');
        if (contenidosBtn) {
            contenidosBtn.textContent = Array.isArray(rowData.contenidos)
                ? `${rowData.contenidos.length} contenidos seleccionados`
                : '0 contenidos seleccionados';
        }
        
        // Actualizar PDAs
        const pdaBtn = rowElement.querySelector('.field-group:nth-child(5) button');
        if (pdaBtn) {
            pdaBtn.textContent = Array.isArray(rowData.pda)
                ? `${rowData.pda.length} PDAs seleccionados`
                : '0 PDAs seleccionados';
        }
        
        // Verificar completitud
        if (typeof rowElement.checkCompletion === 'function') {
            rowElement.checkCompletion();
        }
    } catch (error) {
        console.error('Error en safeUpdateRowUI:', error);
    }
}

function updateRowUI(rowId) {
    const rowData = rowsState[rowId];
    if (!rowData) return;
    
    const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!rowElement) return;
    
    // Actualizar campos formativos
    const camposSelect = rowElement.querySelector('.field-group:nth-child(3) select');
    if (camposSelect) {
        Array.from(camposSelect.options).forEach(option => {
            option.selected = rowData.campos.includes(option.value);
        });
    }
    
    // Actualizar contenidos
    const contenidosBtn = rowElement.querySelector('.field-group:nth-child(4) button');
    if (contenidosBtn) {
        contenidosBtn.textContent = Array.isArray(rowData.contenidos) 
            ? rowData.contenidos.join(', ')
            : rowData.contenidos;
    }
    
    // Actualizar PDAs
    const pdaBtn = rowElement.querySelector('.field-group:nth-child(5) button');
    if (pdaBtn) {
        pdaBtn.textContent = Array.isArray(rowData.pda) 
            ? `${rowData.pda.length} PDAs seleccionados`
            : '0 PDAs seleccionados';
    }
    
    // Verificar completitud
    if (typeof rowElement.checkCompletion === 'function') {
        rowElement.checkCompletion();
    }
  }

function updateRowUI(rowId, campos, contenidos, pdas) {
    const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!rowElement) return;
    
    // Actualizar campos formativos
    const camposSelect = rowElement.querySelector('.field-group:nth-child(3) select');
    if (camposSelect) {
        Array.from(camposSelect.options).forEach(option => {
            option.selected = campos.includes(option.value);
        });
    }
    
    // Actualizar contenidos
    const contenidosBtn = rowElement.querySelector('.field-group:nth-child(4) button');
    if (contenidosBtn) {
        contenidosBtn.textContent = `${contenidos.length} contenidos seleccionados`;
    }
    
    // Actualizar PDAs
    const pdaBtn = rowElement.querySelector('.field-group:nth-child(5) button');
    if (pdaBtn) {
        pdaBtn.textContent = `${pdas.length} PDAs seleccionados`;
    }
    
    // Verificar completitud
    if (typeof rowElement.checkCompletion === 'function') {
        rowElement.checkCompletion();
    }
  }

  function updateRowUI(rowId, campos, contenidos, pdaCount) {
    const rowElement = document.querySelector(`tr[data-row-id="${rowId}"]`);
    if (!rowElement) return;
    
    // Actualizar campos formativos
    const camposSelect = rowElement.querySelector('.field-group:nth-child(3) select');
    if (camposSelect) {
        Array.from(camposSelect.options).forEach(option => {
            option.selected = campos.includes(option.value);
        });
    }
    
    // Actualizar contenidos
    const contenidosBtn = rowElement.querySelector('.field-group:nth-child(4) button');
    if (contenidosBtn) {
        contenidosBtn.textContent = `${contenidos.split(',').length} contenidos seleccionados`;
    }
    
    // Actualizar PDAs
    const pdaBtn = rowElement.querySelector('.field-group:nth-child(5) button');
    if (pdaBtn) {
        pdaBtn.textContent = `${pdaCount} PDAs seleccionados`;
    }
    
    // Verificar completitud
    if (typeof rowElement.checkCompletion === 'function') {
        rowElement.checkCompletion();
    }
  }

  // Popup Functions (solo para evidencia ahora)
  const popupOverlay = document.getElementById("popup-overlay");
  const popupTitle = document.getElementById("popup-title");
  const popupText = document.getElementById("popup-text");
  const popupSave = document.getElementById("popup-save");
  const popupCancel = document.getElementById("popup-cancel");

  let currentPopupField = "";
  let currentRowId = "";
  let currentButton = null;

  function openPopup(field, rowId, button) {
    currentPopupField = field;
    currentRowId = rowId;
    currentButton = button;
    popupTitle.textContent = "Evidencia de Aprendizaje";
    const storedValue = rowsState[rowId] ? rowsState[rowId][field] : "";
    popupText.value = storedValue || "";
    popupOverlay.classList.add("active");
  }

  popupSave.addEventListener("click", async function() {
    const value = popupText.value;
    if (rowsState[currentRowId]) {
      rowsState[currentRowId][currentPopupField] = value;
      try {
        const saveResult = await saveContextData(rowsState[currentRowId]);
        if (saveResult.success) {
          currentButton.textContent = value.trim() !== ""
            ? "Editar (Evidencia)"
            : "Editar Evidencia";
          const rowElement = document.querySelector(`tr[data-row-id="${currentRowId}"]`);
          if (rowElement && typeof rowElement.checkCompletion === "function") {
            rowElement.checkCompletion();
          }
        } else {
          console.error('Error al guardar cambios:', saveResult.message);
          alert('No se pudieron guardar los cambios: ' + saveResult.message);
        }
      } catch (error) {
        console.error('Error al guardar cambios:', error);
        alert('Error al comunicarse con el servidor');
      }
    }
    popupOverlay.classList.remove("active");
  });

  popupCancel.addEventListener("click", function() {
    popupOverlay.classList.remove("active");
  });
});