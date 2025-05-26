document.addEventListener('DOMContentLoaded', async function() {
  // Verificar autenticación y cargar datos del usuario
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (!userData) {
    window.location.href = 'login.html';
    return;
  }

  // Mostrar información del usuario
  document.getElementById('userEmail').textContent = userData.email;
  const membershipBadge = document.getElementById('userMembership');
  membershipBadge.textContent = userData.membership === 'premium' ? 'Premium' : 'Básico';
  membershipBadge.classList.add(userData.membership === 'premium' ? 'premium' : 'basic');

  // Configurar logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'login.html';
  });

  // ===== VARIABLES GLOBALES =====
  const palette = document.getElementById('palette');
  const canvas = document.getElementById('canvas');
  const container = document.getElementById('canvasContainer');
  const propsPan = document.getElementById('propertiesPanel');
  const btnMove = document.getElementById('btnMove');
  const btnConn = document.getElementById('btnConnect');
  const btnDel = document.getElementById('btnDelete');
  const btnLoadProblems = document.getElementById('btnLoadProblems');
  const saveBtn = document.getElementById('saveNodeData');
  const canvasTitle = document.getElementById('canvasTitle');
  const uploadPlan = document.getElementById('uploadPlan');
  const vizPlanBtn = document.getElementById('visualizarPlanPanel');
  const problemsDropdown = document.getElementById('problemsDropdown');
  const problemsList = document.getElementById('problemsList');

  let meta = { fases: [], campos: [] };
  let mode = 'move';
  let idCnt = 0;
  let currentNode = null;
  const globalVars = {
    proyecto: '',
    metodologia: '',
    entrada: '',
    pdas: [],
    campos: [],
    contenidos: [],
    fases: []
  };

  // Cargar metadata
  fetch('/api/meta')
    .then(r => r.json())
    .then(j => meta = j);

  // Inicializar jsPlumb
  const instance = jsPlumb.getInstance({
    Connector: ["Bezier", { curviness: 50 }],
    Anchors: ["AutoDefault"],
    PaintStyle: { stroke: "#0077cc", strokeWidth: 2 },
    Endpoint: ["Dot", { radius: 3 }],
    ConnectionOverlays: [["Arrow", { width: 10, length: 10, location: 1 }]]
  });

  // Cambiar modo
  function setMode(m) {
    mode = m;
    document.body.className = `mode-${m}`;
    [btnMove, btnConn, btnDel].forEach(b =>
      b.classList.toggle('active', b.id === 'btn' + m.charAt(0).toUpperCase() + m.slice(1))
    );
    canvasTitle.contentEditable = m === 'move';
    canvasTitle.style.cursor = m === 'move' ? 'text' : 'default';
  }
  btnMove.onclick = () => setMode('move');
  btnConn.onclick = () => setMode('connect');
  btnDel.onclick = () => setMode('delete');
  setMode('move');

  // Control de conexiones
  instance.bind('beforeStartConnect', info => {
    if (mode !== 'connect') return false;
    const cnt = instance.getConnections({ source: info.source }).length;
    const h = info.source.querySelector('.conn-handle');
    if (h) h.style.top = 50 + cnt * 15 + '%';
    return true;
  });

  instance.bind('beforeDrop', info => {
    const src = info.source.dataset.type;
    const tgt = info.target.dataset.type;
    if (info.source === info.target) return false;
    if (!allowedConnections[src]?.includes(tgt)) return false;
    const single = ['Campos Formativos','Contenido','PDA'];
    if (single.includes(tgt)) {
      instance.getConnections({ target: info.target })
        .forEach(conn => instance.deleteConnection(conn));
    }
    return true;
  });

  instance.bind('connection', info => {
    info.connection.getConnector().canvas.classList.add('transfer');
    ['fase','campo','contenido','pdas','value','text','campoFile'].forEach(k => {
      if (info.source.dataset[k] !== undefined) {
        info.target.dataset[k] = info.source.dataset[k];
      }
    });
    updateNodeIAStatus();
    saveCanvasState();
  });

  instance.bind('connectionDetached', info => {
    const tgtEl = info.connection.target;
    tgtEl.classList.remove('completed');
    delete tgtEl.dataset.color;
    updateNodeIAStatus();
    saveCanvasState();
  });

  // Drag & drop desde la paleta
  palette.querySelectorAll('.palette-item').forEach(it => {
    it.addEventListener('dragstart', e =>
      e.dataTransfer.setData('type', it.dataset.type)
    );
  });

  container.addEventListener('dragover', e => e.preventDefault());
  container.addEventListener('drop', e => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');
    if (type === 'Nodo IA' && canvas.querySelector('[data-type="Nodo IA"]')) {
      alert('Solo puede existir un Nodo IA');
      return;
    }
    const r = canvas.getBoundingClientRect();
    const grid = 20;
    const x = Math.round((e.clientX - r.left) / grid) * grid;
    const y = Math.round((e.clientY - r.top) / grid) * grid;
    createNode(type, x, y);
    saveCanvasState();
  });

  // Crear nodo
  function createNode(type, x, y) {
    const el = document.createElement('div');
    el.className = 'node';
    el.id = `n${idCnt++}`;
    el.dataset.type = type;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.innerHTML =
      `<span class="handle">☰</span>` +
      (type !== 'Nota' ? `<span class="conn-handle"></span>` : '') +
      `<span class="emoji" style="left:20px;">${typeEmojis[type]||''}</span>` +
      `<div class="label">${type}</div>`;
    canvas.appendChild(el);

    instance.draggable(el, {
      handle: '.handle',
      containment: true,
      grid: [20,20],
      stop() {
        const L = Math.round(parseInt(el.style.left)/20)*20;
        const T = Math.round(parseInt(el.style.top)/20)*20;
        el.style.left = L+'px';
        el.style.top = T+'px';
        saveCanvasState();
      }
    });

    if (type !== 'Nota') {
      instance.makeSource(el, {
        filter: '.conn-handle',
        anchor: 'ContinuousRight',
        maxConnections: -1
      });
      instance.makeTarget(el, { anchor: 'ContinuousLeft' });
    }

    el.addEventListener('dblclick', e => {
      if (mode !== 'delete') { e.stopPropagation(); openProperties(el); }
    });

    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (mode !== 'delete') openProperties(el);
    });

    el.addEventListener('click', e => {
      if (mode === 'delete') {
        instance.getConnections({ source: el })
          .concat(instance.getConnections({ target: el }))
          .forEach(c => instance.deleteConnection(c));
        el.remove();
        updateNodeIAStatus();
        saveCanvasState();
      }
    });

    let hoverTimer;
    el.addEventListener('mouseenter', () => {
      if (!el.dataset.color) return;
      hoverTimer = setTimeout(() => {
        const info = [];
        if (el.dataset.text) info.push(`${el.dataset.type}: ${el.dataset.text}`);
        if (el.dataset.fase) info.push(`Fase: ${el.dataset.fase}`);
        if (el.dataset.campo) info.push(`Campo: ${el.dataset.campo}`);
        if (el.dataset.contenido) info.push(`Contenido: ${el.dataset.contenido}`);
        if (el.dataset.pdas) info.push(`PDA: ${el.dataset.pdas}`);
        if (el.dataset.value) info.push(`Metodología: ${el.dataset.value}`);
        tooltip.innerHTML = info.join('<br>');
        const rect = el.getBoundingClientRect();
        tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        tooltip.style.left = (rect.left + window.scrollX) + 'px';
        tooltip.style.display = 'block';
      }, 1000);
    });

    el.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      tooltip.style.display = 'none';
    });

    return el;
  }

  // Panel de propiedades
  async function openProperties(node) {
    currentNode = node;
    const type = node.dataset.type;
    document.getElementById('propTitle').innerText = type;
    const div = document.getElementById('propContent');
    div.innerHTML = '';

    const hints = {
      'Entrada': 'Selecciona un problema redactado del Plano de la Realidad.',
      'Fase': 'Selecciona la fase didáctica.',
      'Campos Formativos': 'Elige el campo y hereda su color.',
      'Contenido': 'Selecciona un contenido.',
      'PDA': 'Escoge un único PDA; para más, crea otro nodo PDA.',
      'Metodología': 'Selecciona la metodología.',
      'Nodo IA': 'Aquí puedes visualizar el plan generado.',
      'Nota': 'Redacta aquí tu nota o explicación libre.'
    };
    
    const pInfo = document.createElement('p');
    pInfo.className = 'info';
    pInfo.textContent = hints[type] || '';
    div.appendChild(pInfo);

    let sel1, sel2, sel3, ta;
    if (type==='Nota') {
      ta = document.createElement('textarea');
      ta.value = node.dataset.text || '';
      div.appendChild(ta);
    }
    if (type==='Entrada') {
      const problems = await loadProblemsFromReality();
      sel1 = document.createElement('select');
      sel1.append(new Option('Selecciona un problema', ''));
      problems.forEach(problem => {
        sel1.append(new Option(problem, problem));
      });
      sel1.value = node.dataset.text || '';
      div.appendChild(sel1);
    }
    if (type==='Fase') {
      sel1 = document.createElement('select');
      sel1.append(new Option('Elige fase',''));
      meta.fases.forEach(f=> sel1.append(new Option(f,f)));
      sel1.value = node.dataset.fase || '';
      div.appendChild(sel1);
    }
    if (type==='Campos Formativos') {
      sel1 = document.createElement('select');
      sel1.append(new Option('Elige fase',''));
      meta.fases.forEach(f=> sel1.append(new Option(f,f)));
      sel1.value = node.dataset.fase || '';
      div.appendChild(sel1);

      sel2 = document.createElement('select');
      sel2.append(new Option('Elige campo',''));
      div.appendChild(sel2);

      sel1.onchange = () => {
        sel2.innerHTML = '<option>Elige campo</option>';
        meta.campos.filter(c=>c.fase===sel1.value)
          .forEach(c=>{
            const o = new Option(c.label,c.label);
            o.dataset.file = c.file;
            sel2.append(o);
          });
      };
      if (node.dataset.fase) {
        sel1.onchange();
        sel2.value = node.dataset.campo || '';
      }
    }
    if (type==='Contenido') {
      ['Fase: '+node.dataset.fase,'Campo: '+node.dataset.campo]
        .forEach(txt=> div.append(Object.assign(document.createElement('p'),{textContent:txt})));
      sel3 = document.createElement('select');
      sel3.append(new Option('Elige contenido',''));
      div.appendChild(sel3);
      if (node.dataset.campoFile) {
        fetch(`/api/fileContent?name=${node.dataset.campoFile}`)
          .then(r=> r.json())
          .then(j=>{
            const d = parseTxt(j.content);
            Object.keys(d).forEach(k=> sel3.append(new Option(k,k)));
            sel3.value = node.dataset.contenido || '';
          });
      }
    }
    if (type === 'PDA') {
      ['Fase: ' + node.dataset.fase, 'Campo: ' + node.dataset.campo, 'Contenido: ' + node.dataset.contenido]
        .forEach(txt => {
          const p = document.createElement('p');
          p.textContent = txt;
          div.appendChild(p);
        });
      
      sel3 = document.createElement('select');
      sel3.appendChild(new Option('Elige PDA', ''));
      div.appendChild(sel3);
      
      if (node.dataset.campoFile && node.dataset.contenido) {
        fetch(`/api/fileContent?name=${node.dataset.campoFile}`)
          .then(r => r.json())
          .then(j => {
            const d = parseTxt(j.content)[node.dataset.contenido] || {};
            Object.values(d).flat().forEach(p => {
              sel3.appendChild(new Option(p, p));
            });
            sel3.value = node.dataset.pdas || '';
          });
      }
    }
    if (type==='Metodología') {
      sel1 = document.createElement('select');
      ['Aprendizaje Basado en Proyectos','Aprendizaje basado en indagación','Aprendizaje basado en problemas','Aprendizaje servicio']
        .forEach(m=> sel1.append(new Option(m,m)));
      sel1.value = node.dataset.value || '';
      div.appendChild(sel1);
    }

    // Panel IA simplificado
    if (type==='Nodo IA') {
      vizPlanBtn.disabled = false;
    }

    saveBtn.onclick = () => {
      if (ta) node.dataset.text = ta.value;
      if (sel1 && type==='Entrada') node.dataset.text = sel1.value;
      if (sel1 && type==='Fase') node.dataset.fase = sel1.value;
      if (sel1 && sel2 && type==='Campos Formativos') {
        node.dataset.fase = sel1.value;
        const opt = sel2.selectedOptions[0];
        node.dataset.campo = opt.value;
        node.dataset.campoFile = opt.dataset.file;
      }
      if (sel3 && type==='Contenido') node.dataset.contenido = sel3.value;
      if (sel3 && type==='PDA') node.dataset.pdas = sel3.value;
      if (sel1 && type==='Metodología') node.dataset.value = sel1.value;
      if (type==='Nota') node.querySelector('.label').innerText = ta.value;

      let color;
      if (['Entrada','Fase','Metodología'].includes(type)) {
        color = getComputedStyle(document.documentElement)
                  .getPropertyValue('--success').trim();
      } else if (type==='Campos Formativos') {
        color = campoColors[node.dataset.campo];
      } else if (['Contenido','PDA'].includes(type)) {
        const inc = instance.getConnections({ target: node });
        if (inc.length) color = inc[0].source.dataset.color;
      }
      if (color) {
        node.dataset.color = color;
        markNetwork(node, color);
        propagateProps(node);
        propagateData(node);
      }
      propsPan.classList.add('hidden');
      updateNodeIAStatus();
      saveCanvasState();
    };

    propsPan.classList.remove('hidden');
  }

  // Cargar problemas desde el Plano de la Realidad
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

  // Cargar problemas completados
  async function loadCompletedProblems() {
    try {
      const res = await fetch('/api/context', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await res.json();
      if (data.success && data.contextData) {
        return data.contextData.filter(row => 
          row.problemas && row.fase && row.campos && row.campos.length > 0 && 
          row.contenidos && row.pda && row.eje
        );
      }
      return [];
    } catch (error) {
      console.error('Error al cargar problemas completados:', error);
      return [];
    }
  }

  // Botón Cargar Problemas
  btnLoadProblems.addEventListener('click', async function() {
    const completedProblems = await loadCompletedProblems();
    
    if (completedProblems.length === 0) {
      alert('No hay problemas completados disponibles');
      return;
    }
    
    problemsList.innerHTML = '';
    completedProblems.forEach(problem => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = problem.problemas;
      item.addEventListener('click', () => loadProblemToCanvas(problem));
      problemsList.appendChild(item);
    });
    
    problemsDropdown.classList.toggle('hidden');
  });

  // Cargar problema al canvas
  // Modifica la función loadProblemToCanvas para usar las conexiones específicas
  function loadProblemToCanvas(problemData) {
      problemsDropdown.classList.add('hidden');
      
      if (confirm('¿Deseas limpiar el canvas actual antes de cargar este problema?')) {
          instance.deleteEveryConnection();
          document.querySelectorAll('#canvas .node').forEach(node => node.remove());
          idCnt = 0;
      }
      
      // Posiciones de los nodos
      const nodePositions = {
          'Entrada': { x: 100, y: 100 },
          'Metodología': { x: 100, y: 250 },
          'Fase': { x: 300, y: 100 },
          'Campos Formativos': { x: 300, y: 250 },
          'Contenido': { x: 500, y: 250 },
          'PDA': { x: 700, y: 250 },
          'Nodo IA': { x: 700, y: 100 }
      };
      
      // Crear nodos
      const entradaNode = createNode('Entrada', nodePositions['Entrada'].x, nodePositions['Entrada'].y);
      entradaNode.dataset.text = problemData.problemas;
      
      const metodologiaNode = createNode('Metodología', nodePositions['Metodología'].x, nodePositions['Metodología'].y);
      metodologiaNode.dataset.value = problemData.eje;
      
      const faseNode = createNode('Fase', nodePositions['Fase'].x, nodePositions['Fase'].y);
      faseNode.dataset.fase = problemData.fase;
      
      const camposNode = createNode('Campos Formativos', nodePositions['Campos Formativos'].x, nodePositions['Campos Formativos'].y);
      camposNode.dataset.fase = problemData.fase;
      camposNode.dataset.campo = problemData.campos.join(', ');
      
      const contenidoNode = createNode('Contenido', nodePositions['Contenido'].x, nodePositions['Contenido'].y);
      contenidoNode.dataset.contenido = Array.isArray(problemData.contenidos) 
          ? problemData.contenidos.join(', ') 
          : problemData.contenidos;
      
      const pdaNode = createNode('PDA', nodePositions['PDA'].x, nodePositions['PDA'].y);
      pdaNode.dataset.pdas = Array.isArray(problemData.pda) 
          ? problemData.pda.join(', ') 
          : problemData.pda;
      
      const iaNode = createNode('Nodo IA', nodePositions['Nodo IA'].x, nodePositions['Nodo IA'].y);
      
      // Conectar nodos según el flujo especificado
      setTimeout(() => {
          // 1. Entrada → Nodo IA
          instance.connect({ source: entradaNode, target: iaNode });
          
          // 2. Metodología → Nodo IA
          instance.connect({ source: metodologiaNode, target: iaNode });
          
          // 3. Fase → Campos Formativos
          instance.connect({ source: faseNode, target: camposNode });
          
          // 4. Campos Formativos → Contenido
          instance.connect({ source: camposNode, target: contenidoNode });
          
          // 5. Contenido → PDA
          instance.connect({ source: contenidoNode, target: pdaNode });
          
          // 6. PDA → Nodo IA
          instance.connect({ source: pdaNode, target: iaNode });
          
          // Actualizar estado y guardar
          updateNodeIAStatus();
          saveCanvasState();
      }, 200);
  }

  // Actualiza las conexiones permitidas para reflejar el nuevo flujo
  const allowedConnections = {
      'Entrada': ['Nodo IA'],
      'Metodología': ['Nodo IA'],
      'Fase': ['Campos Formativos'],
      'Campos Formativos': ['Contenido'],
      'Contenido': ['PDA'],
      'PDA': ['Nodo IA'],
      'Nodo IA': [] // No permite conexiones salientes
  };

  // Persistencia del canvas
  function saveCanvasState() {
    const nodes = [];
    const connections = [];
    
    document.querySelectorAll('#canvas .node').forEach(node => {
      nodes.push({
        id: node.id,
        type: node.dataset.type,
        x: parseInt(node.style.left),
        y: parseInt(node.style.top),
        data: {...node.dataset}
      });
    });
    
    instance.getConnections().forEach(conn => {
      connections.push({
        sourceId: conn.sourceId,
        targetId: conn.targetId
      });
    });
    
    const state = {
      nodes,
      connections,
      title: document.getElementById('canvasTitle').textContent
    };
    
    localStorage.setItem('canvasState', JSON.stringify(state));
  }

  function loadCanvasState() {
    const savedState = localStorage.getItem('canvasState');
    if (!savedState) return;
    
    try {
      const state = JSON.parse(savedState);
      document.getElementById('canvasTitle').textContent = state.title || 'Plan Didáctico';
      
      // Limpiar canvas
      instance.deleteEveryConnection();
      document.querySelectorAll('#canvas .node').forEach(node => node.remove());
      
      // Restaurar nodos
      state.nodes.forEach(nodeData => {
        createNode(nodeData.type, nodeData.x, nodeData.y);
        const node = document.getElementById(nodeData.id);
        if (node) {
          Object.keys(nodeData.data).forEach(key => {
            node.dataset[key] = nodeData.data[key];
          });
          
          if (nodeData.type === 'Nota' && nodeData.data.text) {
            node.querySelector('.label').textContent = nodeData.data.text;
          }
        }
      });
      
      // Restaurar conexiones
      setTimeout(() => {
        state.connections.forEach(conn => {
          const source = document.getElementById(conn.sourceId);
          const target = document.getElementById(conn.targetId);
          if (source && target) {
            instance.connect({ source, target });
          }
        });
        updateNodeIAStatus();
      }, 300);
    } catch (error) {
      console.error('Error al cargar estado del canvas:', error);
    }
  }

  // Helpers
  const typeEmojis = {
    'Entrada': '📝','Campos Formativos': '🎓','Fase': '🔄',
    'Contenido': '📚','PDA': '✔️','Metodología': '🛠️',
    'Nodo IA': '🤖','Nota': '💡'
  };

  const campoColors = {
    'Lenguajes': 'orange','De lo humano': 'red',
    'Etica Naturaleza': 'green','Saberes y Pensamiento Científico': 'blue'
  };

  function parseTxt(text) {
    const lines = text.trim().split('\n').filter(l=>l.trim());
    const hdr = lines[0].split('|').map(h=>h.trim()).slice(1);
    const out = {}, rows = lines.slice(1);
    let key;
    rows.forEach(r=>{
      const p = r.split('|').map(x=>x.trim());
      if (p[1]) { key = p[1]; out[key] = {}; }
      hdr.forEach((g,i)=>{
        const v = p[i+2];
        if (v) (out[key][g]||(out[key][g]=[])).push(v);
      });
    });
    return out;
  }

  function propagateProps(node) {
    instance.getConnections({ source: node }).forEach(c => {
      const tgt = c.target;
      if (node.dataset.color) {
        tgt.dataset.color = node.dataset.color;
        markNetwork(tgt, node.dataset.color);
      }
      propagateProps(tgt);
    });
  }

  function propagateData(node) {
    instance.getConnections({ source: node }).forEach(c => {
      const tgt = c.target;
      ['fase','campo','contenido','pdas','value','text','campoFile'].forEach(k => {
        if (node.dataset[k] !== undefined) {
          tgt.dataset[k] = node.dataset[k];
        }
      });
      propagateData(tgt);
    });
  }

  function markNetwork(node, color) {
    node.classList.add('completed');
    node.style.setProperty('--aura-color', color);
  }

  function updateNodeIAStatus() {
    const nodeIA = document.querySelector('.node[data-type="Nodo IA"]');
    if (!nodeIA) {
        if (vizPlanBtn) vizPlanBtn.disabled = true;
        return;
    }
    
    const conns = instance.getConnections({ target: nodeIA });
    const types = new Set(conns.map(c => c.source.dataset.type));
    
    // Requerimos Entrada, Metodología y PDA conectados
    const requiredTypes = ['Entrada', 'Metodología', 'PDA'];
    const missingTypes = requiredTypes.filter(r => !types.has(r));
    
    if (missingTypes.length === 0) {
        markNetwork(nodeIA,
            getComputedStyle(document.documentElement).getPropertyValue('--success').trim()
        );
        if (vizPlanBtn) vizPlanBtn.disabled = false;
    } else {
        nodeIA.classList.remove('completed');
        nodeIA.style.setProperty('--aura-color',
            getComputedStyle(document.documentElement).getPropertyValue('--purple').trim()
        );
        if (vizPlanBtn) vizPlanBtn.disabled = true;
    }
  }

  // Visualizar Plan
  vizPlanBtn.onclick = () => {
    const nodeIA = document.querySelector('.node[data-type="Nodo IA"]');
    if (!nodeIA) {
      alert('Debes tener un Nodo IA en el canvas');
      return;
    }

    // === NUEVO: Generar registro jerarquizado para plano-viewer.html ===
    const nodes = [];
    const connections = [];
    document.querySelectorAll('#canvas .node').forEach(node => {
      nodes.push({
        id: node.id,
        type: node.dataset.type,
        data: {...node.dataset}
      });
    });
    instance.getConnections().forEach(conn => {
      connections.push({
        sourceId: conn.sourceId,
        targetId: conn.targetId
      });
    });
    const nodesById = Object.fromEntries(nodes.map(n => [n.id, n]));
    // Auxiliar para obtener nodos conectados de un tipo
    function getConnectedNodes(originId, type) {
      return connections.filter(c => c.sourceId === originId && nodesById[c.targetId]?.type === type)
        .map(c => nodesById[c.targetId]);
    }
    // Auxiliar para obtener valor preferido
    function getValue(node, prefer) {
      if (!node) return '';
      if (prefer && node.data?.[prefer]) return node.data[prefer];
      if (node.data?.text) return node.data.text;
      if (node.data && Object.keys(node.data).length === 1) {
        return node.data[Object.keys(node.data)[0]];
      }
      return '';
    }
    // Construir arreglo para tabla Ubicación Curricular
    const ubicacionRows = [];
    // Si no hay nodos Entrada, aún así mostrar combinaciones de los otros bloques
    const entradas = nodes.filter(n => n.type === 'Entrada');
    const camposFormativos = nodes.filter(n => n.type === 'Campos Formativos');
    const contenidos = nodes.filter(n => n.type === 'Contenido');
    const pdas = nodes.filter(n => n.type === 'PDA');

    // Si hay nodos Entrada, generar combinaciones conectadas
    if (entradas.length) {
      entradas.forEach(entrada => {
        const campos = getConnectedNodes(entrada.id, 'Campos Formativos');
        if (!campos.length) {
          ubicacionRows.push({
            Problema: getValue(entrada, 'text'),
            'Campo(s) Formativo(s)': camposFormativos.map(c=>getValue(c,'campo')).join('#'),
            'Contenido(s)': contenidos.map(c=>getValue(c,'contenido')).join('#'),
            'PDA(s)': pdas.map(p=>getValue(p,'pdas')).join('#')
          });
          return;
        }
        campos.forEach(campo => {
          const contenidosCon = getConnectedNodes(campo.id, 'Contenido');
          if (!contenidosCon.length) {
            ubicacionRows.push({
              Problema: getValue(entrada, 'text'),
              'Campo(s) Formativo(s)': getValue(campo, 'campo'),
              'Contenido(s)': contenidos.map(c=>getValue(c,'contenido')).join(', '),
              'PDA(s)': pdas.map(p=>getValue(p,'pdas')).join(', ')
            });
            return;
          }
          contenidosCon.forEach(contenido => {
            const pdasCon = getConnectedNodes(contenido.id, 'PDA');
            if (!pdasCon.length) {
              ubicacionRows.push({
                Problema: getValue(entrada, 'text'),
                'Campo(s) Formativo(s)': getValue(campo, 'campo'),
                'Contenido(s)': getValue(contenido, 'contenido'),
                'PDA(s)': pdas.map(p=>getValue(p,'pdas')).join(', ')
              });
              return;
            }
            pdasCon.forEach(pda => {
              ubicacionRows.push({
                Problema: getValue(entrada, 'text'),
                'Campo(s) Formativo(s)': getValue(campo, 'campo'),
                'Contenido(s)': getValue(contenido, 'contenido'),
                'PDA(s)': getValue(pda, 'pdas')
              });
            });
          });
        });
      });
    } else {
      // Si no hay Entrada, mostrar todas las combinaciones de los otros bloques
      ubicacionRows.push({
        Problema: '',
        'Campo(s) Formativo(s)': camposFormativos.map(c=>getValue(c,'campo')).join('#'),
        'Contenido(s)': contenidos.map(c=>getValue(c,'contenido')).join(', '),
        'PDA(s)': pdas.map(p=>getValue(p,'pdas')).join(', ')
      });
    }

    // Estructura para plano-viewer.html
    const planViewerData = {
      proyecto: document.getElementById('canvasTitle').textContent || '',
      metodologia: (Array.from(document.querySelectorAll('.node[data-type="Metodología"]')).map(n => n.dataset.value).join('; ')) || '',
      ubicacion: ubicacionRows
    };
    localStorage.setItem('planViewerData', JSON.stringify(planViewerData));
    // === FIN NUEVO ===

    // Abrir nueva pestaña con los datos
    const viewerUrl = `plano-viewer.html`;
    window.open(viewerUrl, '_blank');
  };


  // Cargar estado inicial
  loadCanvasState();

  // Configurar guardado automático
  setInterval(saveCanvasState, 10000);
  window.addEventListener('beforeunload', saveCanvasState);

  // Cerrar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#btnLoadProblems') && !e.target.closest('#problemsDropdown')) {
      problemsDropdown.classList.add('hidden');
    }
  });

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute', background: 'rgba(0,0,0,0.75)',
    color: '#fff', padding: '4px 8px', borderRadius: '4px',
    fontSize: '12px', pointerEvents: 'none',
    display: 'none', zIndex: '3000'
  });
  document.body.appendChild(tooltip);

  
  // Configurar menú
  const isPremium = userData && userData.membership === 'premium';
  const isAdmin = userData && userData.membership === 'admin';

  const menuItems = [
    {
      icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
      text: 'Inicio',
      href: 'dashboard.html'
    }
  ];
  
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

  const menuContainer = document.getElementById('main-menu');
  menuItems.forEach(item => {
    const menuItem = document.createElement('a');
    menuItem.className = 'menu-item';
    menuItem.href = item.href;
    menuItem.innerHTML = `
      <svg viewBox="0 0 24 24">${item.icon}</svg>
      <span>${item.text}</span>
    `;
    menuContainer.appendChild(menuItem);
  });

  // Configurar popup premium
  const popup = document.getElementById('premiumPopup');
  const closePopup = document.querySelector('.close-popup');
  const statusMessage = document.getElementById('premiumStatusMessage');
  const btnPremium = document.querySelector('.btn-premium');

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

});