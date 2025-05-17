// Variables globales
let currentNoteId = 'note-1';
let notes = {
  'note-1': { id: 'note-1', title: 'Nota 1', content: '<h1>Nota 1</h1><p></p>', type: 'rich-text' },
  'note-2': { id: 'note-2', title: 'Nota 2', content: '', type: 'rich-text' },
  'note-3': { id: 'note-3', title: 'Nota 3', content: '', type: 'rich-text' }
};
let saveTimeout;
let jsPlumbInstance;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  setupEditor();
  setupFormatButtons();
  setupToolButtons();
  setupUndoRedoButtons();
  setupMainButtons();
  setupAutoSave();
  setupNoteTabs();
  setupMarkdownEditor();
});

// Configuración del editor
function setupEditor() {
  const editor = document.getElementById('editor');
  const textFormatMenu = document.getElementById('textFormatMenu');
  
  // Mostrar menú de formato al seleccionar texto
  editor.addEventListener('mouseup', (e) => {
    const selection = window.getSelection();
    if (selection.toString().trim() !== '') {
      showTextFormatMenu(e);
    } else {
      hideMenu(textFormatMenu);
    }
  });
  
  // Alinear texto a las líneas
  editor.addEventListener('input', alignTextToLines);
  
  // Actualizar título de la nota cuando se edita el H1
  editor.addEventListener('input', () => {
    const h1 = editor.querySelector('h1');
    if (h1) {
      updateNoteTitle(currentNoteId, h1.textContent);
    }
  });
}

// Configuración del editor Markdown
function setupMarkdownEditor() {
  const markdownText = document.getElementById('markdownText');
  const markdownPreview = document.getElementById('markdownPreview');
  
  markdownText.addEventListener('input', () => {
    markdownPreview.innerHTML = marked.parse(markdownText.value);
    hljs.highlightAll();
    
    // Guardar contenido
    notes[currentNoteId].content = markdownText.value;
    notes[currentNoteId].type = 'markdown';
    updateSaveStatus('saving');
  });
}

// Mostrar menú de formato
function showTextFormatMenu(e) {
  const textFormatMenu = document.getElementById('textFormatMenu');
  const selection = window.getSelection();
  
  if (selection.toString().trim() !== '') {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    textFormatMenu.style.display = 'flex';
    textFormatMenu.style.left = `${rect.left}px`;
    textFormatMenu.style.top = `${rect.top - 50}px`;
    
    // Asegurar que el menú no se salga de la ventana
    const menuRect = textFormatMenu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      textFormatMenu.style.left = `${window.innerWidth - menuRect.width - 10}px`;
    }
    if (menuRect.top < 0) {
      textFormatMenu.style.top = '10px';
    }
    
    updateButtonStates();
  }
}

// Configuración de botones de formato
function setupFormatButtons() {
  const formatButtons = document.querySelectorAll('[data-command]');
  
  formatButtons.forEach(button => {
    button.addEventListener('click', () => {
      const command = button.getAttribute('data-command');
      const value = button.getAttribute('data-value');
      
      document.execCommand(command, false, value || null);
      updateButtonStates();
    });
  });
}

// Configuración de botones de herramientas
function setupToolButtons() {
  // Botón de imagen
  document.getElementById('imageBtn').addEventListener('click', () => {
    document.getElementById('imageDialog').style.display = 'flex';
  });

  // Botón de mapa mental
  document.getElementById('mindmapBtn').addEventListener('click', () => {
    showMindmapDialog();
  });

  // Diálogo de imagen
  document.getElementById('insertImageBtn').addEventListener('click', insertImage);
  document.getElementById('cancelImageBtn').addEventListener('click', () => {
    document.getElementById('imageDialog').style.display = 'none';
  });

  // Modos de editor
  document.getElementById('richTextMode').addEventListener('click', () => {
    switchEditorMode('rich-text');
  });

  document.getElementById('markdownMode').addEventListener('click', () => {
    switchEditorMode('markdown');
  });
}

// Cambiar entre modos de editor
function switchEditorMode(mode) {
  const editor = document.getElementById('editor');
  const markdownEditor = document.getElementById('markdownEditor');
  
  if (mode === 'markdown') {
    editor.style.display = 'none';
    markdownEditor.style.display = 'flex';
    document.getElementById('richTextMode').classList.remove('active');
    document.getElementById('markdownMode').classList.add('active');
    
    // Convertir contenido a Markdown si es necesario
    if (notes[currentNoteId].type === 'rich-text') {
      document.getElementById('markdownText').value = htmlToMarkdown(editor.innerHTML);
    } else {
      document.getElementById('markdownText').value = notes[currentNoteId].content;
    }
    document.getElementById('markdownPreview').innerHTML = marked.parse(document.getElementById('markdownText').value);
  } else {
    editor.style.display = 'block';
    markdownEditor.style.display = 'none';
    document.getElementById('richTextMode').classList.add('active');
    document.getElementById('markdownMode').classList.remove('active');
    
    // Convertir Markdown a HTML si es necesario
    if (notes[currentNoteId].type === 'markdown') {
      editor.innerHTML = marked.parse(notes[currentNoteId].content);
    }
  }
  
  notes[currentNoteId].type = mode;
  updateSaveStatus('saving');
}

// Mostrar diálogo de mapa mental
function showMindmapDialog() {
  const dialog = document.getElementById('mindmapDialog');
  dialog.style.display = 'flex';
  
  // Inicializar jsPlumb si no está inicializado
  if (!jsPlumbInstance) {
    jsPlumbInstance = jsPlumb.getInstance({
      Container: "mindmapCanvas",
      Connector: ["Straight"],
      Anchors: ["Bottom", "Top"],
      Endpoint: ["Dot", { radius: 2 }],
      PaintStyle: { stroke: "#666", strokeWidth: 2 },
      HoverPaintStyle: { stroke: "#444", strokeWidth: 3 },
      ConnectionOverlays: [
        ["Arrow", { location: 1, width: 10, length: 10 }]
      ]
    });
  }
  
  // Limpiar canvas
  document.getElementById('mindmapCanvas').innerHTML = '';
  
  // Configurar eventos para el mapa mental
  setupMindmapTools();
}

// Configurar herramientas del mapa mental
function setupMindmapTools() {
  const canvas = document.getElementById('mindmapCanvas');
  const addCentralNodeBtn = document.getElementById('addCentralNodeBtn');
  const addNodeBtn = document.getElementById('addNodeBtn');
  const deleteElementBtn = document.getElementById('deleteElementBtn');
  const addConnectionBtn = document.getElementById('addConnectionBtn');
  const connectionStyleBtn = document.getElementById('connectionStyleBtn');
  
  let selectedElement = null;
  let connectionMode = false;
  let connectionSource = null;
  
  // Añadir nodo central
  addCentralNodeBtn.addEventListener('click', () => {
    const node = createMindmapNode('Central', true);
    canvas.appendChild(node);
    makeDraggable(node, true);
    centerNode(node);
  });
  
  // Añadir nodo normal
  addNodeBtn.addEventListener('click', () => {
    if (!selectedElement) return;
    
    const node = createMindmapNode('Nuevo nodo');
    canvas.appendChild(node);
    makeDraggable(node, true);
    
    // Posicionar cerca del nodo seleccionado
    const rect = selectedElement.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    node.style.left = `${rect.left - canvasRect.left + rect.width + 20}px`;
    node.style.top = `${rect.top - canvasRect.top}px`;
    
    // Conectar con el nodo seleccionado
    jsPlumbInstance.connect({
      source: selectedElement,
      target: node,
      anchors: ["Right", "Left"],
      endpoint: "Dot"
    });
  });
  
  // Eliminar elemento
  deleteElementBtn.addEventListener('click', () => {
    if (selectedElement) {
      jsPlumbInstance.remove(selectedElement);
      selectedElement.remove();
      selectedElement = null;
    }
  });
  
  // Modo conexión
  addConnectionBtn.addEventListener('click', () => {
    connectionMode = !connectionMode;
    addConnectionBtn.classList.toggle('active', connectionMode);
  });
  
  // Cambiar estilo de conexión
  document.querySelectorAll('.connection-style-menu button').forEach(button => {
    button.addEventListener('click', () => {
      const style = button.getAttribute('data-style');
      jsPlumbInstance.setConnector(style === 'curved' ? ["Bezier", { curviness: 50 }] : 
                              style === 'orthogonal' ? ["Flowchart", { stub: [10, 10], gap: 5 }] : 
                              ["Straight"]);
    });
  });
  
  // Seleccionar elementos
  canvas.addEventListener('click', (e) => {
    const target = e.target.closest('.mindmap-node');
    if (target) {
      if (connectionMode && connectionSource) {
        // Conectar nodos
        jsPlumbInstance.connect({
          source: connectionSource,
          target: target,
          anchors: ["Right", "Left"],
          endpoint: "Dot"
        });
        connectionMode = false;
        connectionSource = null;
        addConnectionBtn.classList.remove('active');
      } else if (connectionMode) {
        // Establecer origen de conexión
        connectionSource = target;
        target.classList.add('connection-source');
      } else {
        // Seleccionar nodo
        if (selectedElement) {
          selectedElement.classList.remove('selected');
        }
        selectedElement = target;
        target.classList.add('selected');
      }
    } else if (e.target === canvas) {
      // Deseleccionar al hacer clic en el canvas
      if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement = null;
      }
      if (connectionSource) {
        connectionSource.classList.remove('connection-source');
        connectionSource = null;
        connectionMode = false;
        addConnectionBtn.classList.remove('active');
      }
    }
  });
}

// Crear nodo de mapa mental
function createMindmapNode(text, isCentral = false) {
  const node = document.createElement('div');
  node.className = `mindmap-node ${isCentral ? 'central' : ''}`;
  node.innerHTML = `
    <div class="mindmap-node-content" contenteditable="true">${text}</div>
    <div class="node-icons"></div>
  `;
  
  // Estilo inicial
  node.style.width = '150px';
  node.style.height = '60px';
  node.style.left = '50px';
  node.style.top = '50px';
  
  return node;
}

// Centrar nodo en el canvas
function centerNode(node) {
  const canvas = document.getElementById('mindmapCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  
  node.style.left = `${(canvasRect.width - nodeRect.width) / 2}px`;
  node.style.top = `${(canvasRect.height - nodeRect.height) / 2}px`;
}

// Hacer elementos arrastrables
function makeDraggable(element, isMindmapNode = false) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    
    // Para nodos del mapa mental
    if (isMindmapNode) {
      element.classList.add('dragging');
      jsPlumbInstance.setDraggable(element, false);
    }
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    const newTop = element.offsetTop - pos2;
    const newLeft = element.offsetLeft - pos1;
    
    element.style.top = `${newTop}px`;
    element.style.left = `${newLeft}px`;
    
    // Actualizar conexiones en tiempo real para mapa mental
    if (isMindmapNode) {
      jsPlumbInstance.repaint(element);
    }
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    
    if (isMindmapNode) {
      element.classList.remove('dragging');
      jsPlumbInstance.setDraggable(element, true);
    } else {
      updateSaveStatus('saving');
    }
  }
}

// Configuración de pestañas de notas
function setupNoteTabs() {
  const noteTabs = document.querySelectorAll('.note-tab');
  
  noteTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        const noteId = tab.getAttribute('data-note-id');
        switchNote(noteId);
      }
    });
    
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      const noteId = tab.getAttribute('data-note-id');
      closeNote(noteId);
    });
  });
}

// Cambiar entre notas
function switchNote(noteId) {
  if (noteId === currentNoteId) return;
  
  // Guardar la nota actual antes de cambiar
  saveCurrentNote();
  
  // Actualizar pestañas
  document.querySelectorAll('.note-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-note-id') === noteId) {
      tab.classList.add('active');
    }
  });
  
  // Cargar la nueva nota
  currentNoteId = noteId;
  loadNoteContent();
}

// Cargar contenido de la nota
function loadNoteContent() {
  const note = notes[currentNoteId];
  const editor = document.getElementById('editor');
  const markdownEditor = document.getElementById('markdownEditor');
  
  if (note.type === 'markdown') {
    markdownEditor.style.display = 'flex';
    editor.style.display = 'none';
    document.getElementById('markdownText').value = note.content;
    document.getElementById('markdownPreview').innerHTML = marked.parse(note.content);
    document.getElementById('richTextMode').classList.remove('active');
    document.getElementById('markdownMode').classList.add('active');
  } else {
    editor.style.display = 'block';
    markdownEditor.style.display = 'none';
    editor.innerHTML = note.content || '<h1>Nueva Nota</h1><p></p>';
    document.getElementById('richTextMode').classList.add('active');
    document.getElementById('markdownMode').classList.remove('active');
  }
}

// Cerrar nota
function closeNote(noteId) {
  if (Object.keys(notes).length <= 1) return;
  
  // Guardar antes de cerrar
  saveCurrentNote();
  
  // Eliminar la nota
  delete notes[noteId];
  
  // Si la nota cerrada es la actual, cambiar a otra
  if (noteId === currentNoteId) {
    const remainingNotes = Object.keys(notes);
    currentNoteId = remainingNotes[0];
    loadNoteContent();
  }
  
  // Actualizar la interfaz
  updateNoteTabs();
}

// Actualizar pestañas de notas
function updateNoteTabs() {
  const tabsContainer = document.querySelector('.notes-tabs');
  tabsContainer.innerHTML = '';
  
  Object.values(notes).forEach(note => {
    const tab = document.createElement('div');
    tab.className = `note-tab ${note.id === currentNoteId ? 'active' : ''}`;
    tab.setAttribute('data-note-id', note.id);
    tab.innerHTML = `
      <span class="tab-title">${note.title}</span>
      <button class="tab-close"><i class="fas fa-times"></i></button>
    `;
    
    tab.addEventListener('click', (e) => {
      if (!e.target.classList.contains('tab-close')) {
        switchNote(note.id);
      }
    });
    
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeNote(note.id);
    });
    
    tabsContainer.appendChild(tab);
  });
}

// Cargar notas desde localStorage
function loadNotes() {
  const savedNotes = localStorage.getItem('notes');
  if (savedNotes) {
    notes = JSON.parse(savedNotes);
  }
  
  // Asegurarse de que tenemos al menos 3 notas
  for (let i = 1; i <= 3; i++) {
    const noteId = `note-${i}`;
    if (!notes[noteId]) {
      notes[noteId] = { 
        id: noteId, 
        title: `Nota ${i}`, 
        content: i === 1 ? '<h1>Nota 1</h1><p></p>' : '', 
        type: 'rich-text' 
      };
    }
  }
  
  updateNoteTabs();
  loadNoteContent();
}

// Guardar nota actual
function saveCurrentNote() {
  const editor = document.getElementById('editor');
  const markdownText = document.getElementById('markdownText');
  
  if (notes[currentNoteId].type === 'markdown') {
    notes[currentNoteId].content = markdownText.value;
  } else {
    notes[currentNoteId].content = editor.innerHTML;
    
    // Actualizar título si es necesario
    const h1 = editor.querySelector('h1');
    if (h1) {
      updateNoteTitle(currentNoteId, h1.textContent);
    }
  }
  
  saveToLocalStorage();
}

// Actualizar título de la nota
function updateNoteTitle(noteId, newTitle) {
  if (notes[noteId]) {
    notes[noteId].title = newTitle || 'Sin título';
    
    // Actualizar pestaña
    const tab = document.querySelector(`.note-tab[data-note-id="${noteId}"]`);
    if (tab) {
      tab.querySelector('.tab-title').textContent = notes[noteId].title;
    }
  }
}

// Guardar en localStorage
function saveToLocalStorage() {
  localStorage.setItem('notes', JSON.stringify(notes));
  updateSaveStatus('saved');
}

// Actualizar estado de guardado
function updateSaveStatus(status) {
  const saveStatus = document.getElementById('saveStatus');
  saveStatus.textContent = status === 'saving' ? 'Guardando...' : 'Guardado';
  saveStatus.className = status;
}

// Sistema de autoguardado
function setupAutoSave() {
  const editor = document.getElementById('editor');
  const markdownText = document.getElementById('markdownText');
  
  const saveHandler = () => {
    saveCurrentNote();
    updateSaveStatus('saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      updateSaveStatus('saved');
    }, 1000);
  };
  
  editor.addEventListener('input', saveHandler);
  markdownText.addEventListener('input', saveHandler);
}

// Configuración de botones principales
function setupMainButtons() {
  document.getElementById('newNoteBtn').addEventListener('click', createNewNote);
}

// Crear nueva nota
function createNewNote() {
  // Encontrar el próximo ID disponible
  let newId = 1;
  while (notes[`note-${newId}`]) {
    newId++;
  }
  
  const noteId = `note-${newId}`;
  notes[noteId] = {
    id: noteId,
    title: `Nota ${newId}`,
    content: '<h1>Nueva Nota</h1><p></p>',
    type: 'rich-text'
  };
  
  // Cambiar a la nueva nota
  switchNote(noteId);
  updateNoteTabs();
}

// Convertir HTML a Markdown (simplificado)
function htmlToMarkdown(html) {
  // Implementación básica - en una aplicación real usarías una librería
  return html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<[^>]+>/g, '');
}

// Alinear texto a las líneas
function alignTextToLines() {
  const editor = document.getElementById('editor');
  const lines = editor.querySelectorAll('p, h1, h2, h3, li');
  
  lines.forEach(line => {
    line.style.lineHeight = '25px';
    line.style.marginBottom = '0';
    line.style.paddingBottom = '0';
  });
}

// Actualizar estado de botones de formato
function updateButtonStates() {
  const formatButtons = document.querySelectorAll('[data-command]');
  
  formatButtons.forEach(button => {
    const command = button.getAttribute('data-command');
    if (document.queryCommandState(command)) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Insertar imagen
function insertImage() {
  const url = document.getElementById('imageUrl').value.trim();
  if (url) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'resizable-image draggable';
    imgContainer.innerHTML = `
      <img src="${url}" alt="Imagen insertada">
      <div class="resize-handle nw"></div>
      <div class="resize-handle ne"></div>
      <div class="resize-handle sw"></div>
      <div class="resize-handle se"></div>
    `;
    
    const editor = notes[currentNoteId].type === 'markdown' ? 
      document.getElementById('markdownPreview') : 
      document.getElementById('editor');
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(imgContainer);
    } else {
      editor.appendChild(imgContainer);
    }
    
    makeDraggable(imgContainer);
    setupResizable(imgContainer);
    document.getElementById('imageDialog').style.display = 'none';
    document.getElementById('imageUrl').value = '';
    updateSaveStatus('saving');
  }
}

// Configurar redimensionamiento de imágenes
function setupResizable(element) {
  const handles = element.querySelectorAll('.resize-handle');
  
  handles.forEach(handle => {
    handle.addEventListener('mousedown', initResize);
  });
  
  function initResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
    const startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
    
    function doResize(e) {
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      
      element.style.width = `${Math.max(50, newWidth)}px`;
      element.style.height = `${Math.max(50, newHeight)}px`;
    }
    
    function stopResize() {
      window.removeEventListener('mousemove', doResize, false);
      window.removeEventListener('mouseup', stopResize, false);
      updateSaveStatus('saving');
    }
    
    window.addEventListener('mousemove', doResize, false);
    window.addEventListener('mouseup', stopResize, false);
  }
}

// Configuración de botones Deshacer/Rehacer
function setupUndoRedoButtons() {
  document.getElementById('undoBtn').addEventListener('click', () => {
    document.execCommand('undo', false);
    updateSaveStatus('saving');
  });
  
  document.getElementById('redoBtn').addEventListener('click', () => {
    document.execCommand('redo', false);
    updateSaveStatus('saving');
  });
}