document.addEventListener('DOMContentLoaded', async function() {
  // [Añadido] Opciones de campos por fase
  const campoOptions = {
    F3: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"],
    F4: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"],
    F5: ["Lenguajes", "Saberes y pensamiento", "Ética, Naturaleza", "De lo humano"]
  };

  // [Añadido] Función para sanitizar nombres de archivo
  function sanitizeFilename(name) {
    return name
      .replace(/,/g, '')
      .replace(/\s+/g, '_')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // [Modificada] Función para cargar contenidos
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

  // [Añadido] Función para cargar PDAs basados en contenido seleccionado
  async function loadPdasForContenido(contenido) {
    try {
      const fase = document.getElementById('fase-pda').value;
      const campo = document.getElementById('campo-pda').value;
      
      if (!fase || !campo) return null;
      
      const contenidosData = await loadContenidos(fase, campo);
      if (!contenidosData || !contenidosData[contenido]) return null;
      
      const pdasList = document.getElementById('pdasList');
      pdasList.innerHTML = '';
      
      // Agrupar PDAs por grado
      const gradosPdas = {};
      Object.entries(contenidosData[contenido]).forEach(([grado, pdas]) => {
        gradosPdas[grado] = pdas;
      });
      
      // Ordenar grados alfabéticamente
      const sortedGrados = Object.keys(gradosPdas).sort();
      
      sortedGrados.forEach(grado => {
        const gradoHeader = document.createElement('h4');
        gradoHeader.textContent = grado;
        pdasList.appendChild(gradoHeader);
        
        gradosPdas[grado].forEach((pda, index) => {
          const pdaItem = document.createElement('div');
          pdaItem.className = 'pda-item';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `pda-${grado}-${index}`;
          checkbox.value = `${grado}: ${pda}`;
          
          const label = document.createElement('label');
          label.htmlFor = checkbox.id;
          label.textContent = pda;
          
          pdaItem.appendChild(checkbox);
          pdaItem.appendChild(label);
          pdasList.appendChild(pdaItem);
        });
      });
      
      return true;
    } catch (err) {
      console.error('Error al cargar PDAs:', err);
      return null;
    }
  }

  // [Añadido] Función para manejar la selección de contenidos
  function setupContenidosCheckboxes() {
    const contenidosList = document.getElementById('contenidosList');
    contenidosList.addEventListener('change', async function(e) {
      if (e.target.type === 'checkbox') {
        const contenido = e.target.value;
        const isChecked = e.target.checked;
        
        // Desmarcar otros contenidos (selección única)
        if (isChecked) {
          document.querySelectorAll('#contenidosList input[type="checkbox"]').forEach(cb => {
            if (cb !== e.target) cb.checked = false;
          });
          
          // Cargar PDAs para este contenido
          await loadPdasForContenido(contenido);
        } else {
          document.getElementById('pdasList').innerHTML = '';
        }
      }
    });
  }

  // [Añadido] Función para manejar la selección de PDAs
  function setupPdasCheckboxes() {
    const pdasList = document.getElementById('pdasList');
    pdasList.addEventListener('change', function(e) {
      if (e.target.type === 'checkbox') {
        const selectedPdasList = document.getElementById('selectedPdasList');
        
        if (e.target.checked) {
          // Agregar a la lista de seleccionados
          const selectedItem = document.createElement('div');
          selectedItem.className = 'pda-item';
          selectedItem.textContent = e.target.value;
          selectedPdasList.appendChild(selectedItem);
        } else {
          // Remover de la lista de seleccionados
          const items = selectedPdasList.querySelectorAll('.pda-item');
          items.forEach(item => {
            if (item.textContent === e.target.value) {
              item.remove();
            }
          });
        }
      }
    });
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

  // --------------- Funciones para interactuar con el backend ---------------
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

  // --------------- Variables de estado ---------------
  let problemsFromSituation = await loadProblemsFromReality();
  let rowsState = {};
  let rowCounter = 0;

  // [Añadido] Variables para el selector de PDA
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

  // --------------- UI Elements ---------------
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
      // 1. Obtener datos generales desde configuracion.html/localStorage
      let datosGenerales = {};
      try {
        const configStr = localStorage.getItem('userConfig');
        if (configStr) {
          datosGenerales = JSON.parse(configStr);
        } else if (window.userData) {
          datosGenerales = {
            nivelEducativo: window.userData.nivelEducativo || '',
            centroTrabajo: window.userData.centroTrabajo || '',
            zonaEscolar: window.userData.zonaEscolar || '',
            sectorEducativo: window.userData.sectorEducativo || '',
            fase: window.userData.fase || '',
            grado: window.userData.grado || '',
            grupo: window.userData.grupo || '',
            nombreDocente: window.userData.nombreDocente || '',
            nombreDirector: window.userData.nombreDirector || ''
          };
        }
      } catch (e) { datosGenerales = {}; }

      // 2. Obtener planoProblematizacion desde localStorage o backend
      let planoProblematizacion = {};
      try {
        const realidadStr = localStorage.getItem('planoRealidad');
        if (realidadStr) {
          planoProblematizacion = JSON.parse(realidadStr);
        }
      } catch (e) { planoProblematizacion = {}; }

      // 3. Filtrar solo renglones primarios completados (verdes)
      // Consideramos "completado" si la fila tiene todos los campos clave llenos
      const tablaContextualizacion = Object.values(rowsState)
        .filter(row => {
          // Puedes ajustar la lógica de completitud aquí si hay una bandera específica
          return (
            row &&
            row.problemas &&
            row.campos &&
            row.contenidos &&
            row.pda &&
            row.eje
          );
        })
        .map(row => ({
          problema: row.problemas,
          camposFormativos: row.campos,
          contenidos: row.contenidos,
          pdas: row.pda,
          ejesArticuladores: row.eje
        }));

      // 4. Armar el JSON final
      const jsonContextual = {
        datosGenerales,
        planoProblematizacion,
        planoContextualizacion: tablaContextualizacion
      };

      // 5. Abrir la nueva pestaña y enviar el JSON via postMessage
      const viewer = window.open('plano-contextual-viewer.html', '_blank');
      if (viewer) {
        // Esperar a que cargue la nueva pestaña
        const sendData = () => {
          viewer.postMessage({ type: 'loadContextualData', data: jsonContextual }, '*');
        };
        // Intentar varias veces por compatibilidad cross-origin
        let tries = 0;
        const interval = setInterval(() => {
          if (viewer.closed) { clearInterval(interval); return; }
          try {
            sendData();
            clearInterval(interval);
          } catch (e) {
            tries++;
            if (tries > 10) clearInterval(interval);
          }
        }, 300);
      }
    } catch (err) {
      console.error('No se pudo generar ni enviar el JSON al visor contextual', err);
    }
  });
}

  // [Añadido] Configurar eventos para el selector de contenidos/PDA
  setupContenidosCheckboxes();
  setupPdasCheckboxes();

  // [Modificado] Selector de PDA - Evento cambio de fase
  document.getElementById('fase-pda').addEventListener('change', function() {
    const fase = this.value;
    const campoSelect = document.getElementById('campo-pda');
    
    campoSelect.innerHTML = '<option value="">--Selecciona Campo--</option>';
    if (fase && campoOptions[fase]) {
      campoSelect.disabled = false;
      campoOptions[fase].forEach(campo => {
        const opt = document.createElement('option');
        opt.value = campo;
        opt.textContent = campo;
        campoSelect.appendChild(opt);
      });
    } else {
      campoSelect.disabled = true;
    }
    
    // Limpiar contenidos y PDAs cuando cambia la fase
    document.getElementById('contenidosList').innerHTML = '';
    document.getElementById('pdasList').innerHTML = '';
    document.getElementById('selectedPdasList').innerHTML = '';
  });

  // [Modificado] Selector de PDA - Evento cambio de campo
  document.getElementById('campo-pda').addEventListener('change', async function() {
    const fase = document.getElementById('fase-pda').value;
    const campo = this.value;
    
    if (!fase || !campo) return;

    const contenidosData = await loadContenidos(fase, campo);
    const contenidosList = document.getElementById('contenidosList');
    contenidosList.innerHTML = '';

    if (contenidosData) {
      Object.keys(contenidosData).forEach(contenido => {
        const div = document.createElement('div');
        div.className = 'contenido-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cont-select-${sanitizeFilename(contenido)}`;
        checkbox.value = contenido;

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = contenido;

        div.appendChild(checkbox);
        div.appendChild(label);
        contenidosList.appendChild(div);
      });
    }
    
    // Limpiar PDAs cuando cambia el campo
    document.getElementById('pdasList').innerHTML = '';
    document.getElementById('selectedPdasList').innerHTML = '';
  });

  // [Modificado] Selector de PDA - Botón guardar
  document.getElementById('pda-selector-save').addEventListener('click', function() {
    const selectedContenido = document.querySelector('#contenidosList input[type="checkbox"]:checked');
    const selectedPdas = Array.from(document.querySelectorAll('#selectedPdasList .pda-item')).map(item => item.textContent);
    
    if (currentPdaButton && selectedContenido && selectedPdas.length > 0) {
      // Actualizar botón de contenidos
      const contenidosBtn = document.querySelector(`tr[data-row-id="${currentPdaRowId}"] .field-group:nth-child(4) button`);
      if (contenidosBtn) {
        contenidosBtn.textContent = selectedContenido.value;
        if (rowsState[currentPdaRowId]) {
          rowsState[currentPdaRowId].contenidos = selectedContenido.value;
        }
      }
      
      // Actualizar botón de PDA
      const pdaBtn = document.querySelector(`tr[data-row-id="${currentPdaRowId}"] .field-group:nth-child(5) button`);
      if (pdaBtn) {
        pdaBtn.textContent = selectedPdas.join(', ');
        if (rowsState[currentPdaRowId]) {
          rowsState[currentPdaRowId].pda = selectedPdas.join(', ');
        }
      }
      
      // Actualizar estado de completitud
      const rowElement = document.querySelector(`tr[data-row-id="${currentPdaRowId}"]`);
      if (rowElement && typeof rowElement.checkCompletion === 'function') {
        rowElement.checkCompletion();
      }
    }
    
    document.getElementById('pda-selector-overlay').classList.remove('active');
  });

  // [Añadido] Selector de PDA - Botón cancelar
  document.getElementById('pda-selector-cancel').addEventListener('click', function() {
    document.getElementById('pda-selector-overlay').classList.remove('active');
  });

  // --------------- Funciones de UI ---------------
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

  // --------------- Funciones para manejar filas ---------------
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

  function populateSelect(selectElement, optionsArray) {
    if (!selectElement) return;
    selectElement.innerHTML = "";
    optionsArray.forEach(function(opt) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt === "" ? "Seleccione..." : opt;
      selectElement.appendChild(option);
    });
  }

  // [Modificada] Función para añadir filas primarias
  async function addPrimaryRow(data = null) {
    let rowId;
    if (data === null) {
      rowCounter++;
      rowId = 'row_' + rowCounter;
      data = { 
        rowId: rowId, 
        problemas: "", 
        fase: "", 
        campos: "", 
        contenidos: "", 
        pda: "", 
        eje: "", 
        nivel: "", 
        objeto: "", 
        evidencia: "" 
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

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.classList.add('primary-row-header');
    headerDiv.style.display = "flex";
    headerDiv.style.alignItems = "center";
    headerDiv.style.justifyContent = "space-between";

    const toggleIcon = document.createElement('span');
    toggleIcon.classList.add('toggle-icon');
    toggleIcon.textContent = "▼";
    toggleIcon.style.marginRight = "10px";

    const labelSpan = document.createElement('span');
    labelSpan.classList.add('row-label');
    labelSpan.textContent = data.problemas || "Seleccionar información";

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

    headerDiv.appendChild(toggleIcon);
    headerDiv.appendChild(labelSpan);
    headerDiv.appendChild(deleteBtn);

    // Collapsible content
    const collapsibleDiv = document.createElement('div');
    collapsibleDiv.classList.add('collapsible-content');

    const fieldsGrid = document.createElement('div');
    fieldsGrid.classList.add('fields-grid');
    fieldsGrid.style.display = "grid";
    fieldsGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
    fieldsGrid.style.gap = "0.5rem";

    // Declare controls
    let problemasSelect, faseSelect, camposSelect, contenidosBtn, pdaBtn, ejeSelect, nivelSelect, objetoBtn, evidenciaBtn;

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
      populateSelect(faseSelect, ["", "Fase 3", "Fase 4", "Fase 5"]);
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

    // Field 3: Campos Formativos
    const col3 = createFieldGroup("Campos Formativos", "select");
    camposSelect = col3.querySelector('select');
    if (camposSelect) {
      populateSelect(camposSelect, ["", "Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario"]);
      if (data.campos) camposSelect.value = data.campos;
      camposSelect.addEventListener('change', async function() {
        rowsState[rowId].campos = camposSelect.value;
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    // [Modificado] Field 4: Contenidos (ahora es un botón)
    const col4 = createFieldGroup("Contenidos", "button");
    contenidosBtn = col4.querySelector('button');
    contenidosBtn.textContent = data.contenidos ? data.contenidos : "Seleccionar Contenidos";
    contenidosBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openContenidosSelector(rowId, contenidosBtn);
    });

    // [Modificado] Field 5: PDA (ahora muestra lo seleccionado)
    const col5 = createFieldGroup("PDA", "button");
    pdaBtn = col5.querySelector('button');
    pdaBtn.textContent = data.pda ? data.pda : "PDAs seleccionados";
    pdaBtn.classList.add("pda-display");

    // Field 6: Eje Articulador
    const col6 = createFieldGroup("Eje Articulador", "select");
    ejeSelect = col6.querySelector('select');
    if (ejeSelect) {
      populateSelect(ejeSelect, ["", "Eje 1", "Eje 2", "Eje 3", "Eje 4"]);
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

    // Field 7: Nivel de Logro
    const col7 = createFieldGroup("Nivel de Logro", "select");
    nivelSelect = col7.querySelector('select');
    if (nivelSelect) {
      populateSelect(nivelSelect, ["", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4"]);
      if (data.nivel) nivelSelect.value = data.nivel;
      nivelSelect.addEventListener('change', async function() {
        rowsState[rowId].nivel = nivelSelect.value;
        const saveResult = await saveContextData(rowsState[rowId]);
        if (!saveResult.success) {
          console.error('Error al guardar cambios:', saveResult.message);
        }
        checkCompletion();
      });
    }

    // Field 8: Objeto de Enseñanza (popup)
    const col8 = createFieldGroup("Objeto de Enseñanza", "button");
    objetoBtn = col8.querySelector('button');
    objetoBtn.textContent = data.objeto ? "Editar (Objeto)" : "Editar Objeto";
    objetoBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openPopup("objeto", rowId, objetoBtn);
    });

    // Field 9: Evidencia de Aprendizaje (popup)
    const col9 = createFieldGroup("Evidencia de Aprendizaje", "button");
    evidenciaBtn = col9.querySelector('button');
    evidenciaBtn.textContent = data.evidencia ? "Editar (Evidencia)" : "Editar Evidencia";
    evidenciaBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openPopup("evidencia", rowId, evidenciaBtn);
    });

    fieldsGrid.append(col1, col2, col3, col4, col5, col6, col7, col8, col9);
    collapsibleDiv.appendChild(fieldsGrid);

    // Toggle collapsible
    headerDiv.addEventListener("click", function() {
      collapsibleDiv.classList.toggle("active");
      toggleIcon.classList.toggle("rotated");
      if (!collapsibleDiv.classList.contains("active")) {
        const allSelects = collapsibleDiv.querySelectorAll("select");
        let anyFilled = false;
        allSelects.forEach(function(sel) {
          if (sel.value.trim() !== "") anyFilled = true;
        });
        const objetoVal = (rowsState[rowId].objeto || "").trim();
        const evidenciaVal = (rowsState[rowId].evidencia || "").trim();
        if (!anyFilled && !objetoVal && !evidenciaVal) {
          const infoContent = document.getElementById("info-box-content");
          if (infoContent) infoContent.textContent = "";
        }
      }
    });

    td.appendChild(headerDiv);
    td.appendChild(collapsibleDiv);
    tr.appendChild(td);
    tbody.appendChild(tr);

    function checkCompletion() {
      let complete = true;
      const selects = [problemasSelect, faseSelect, camposSelect, ejeSelect, nivelSelect];
      selects.forEach(function(sel) {
        if (!sel || !sel.value) complete = false;
      });
      if (!rowsState[rowId].contenidos || !rowsState[rowId].pda || !rowsState[rowId].objeto || !rowsState[rowId].evidencia) {
        complete = false;
      }
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

  // --------------- Popup Functions ---------------
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
    popupTitle.textContent = field === "objeto" ? "Objeto de Enseñanza" : "Evidencia de Aprendizaje";
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
            ? (currentPopupField === "objeto" ? "Editar (Objeto)" : "Editar (Evidencia)")
            : (currentPopupField === "objeto" ? "Editar Objeto" : "Editar Evidencia");
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