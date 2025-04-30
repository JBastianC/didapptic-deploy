document.addEventListener('DOMContentLoaded', async function () {
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
  const saveBtn = document.getElementById('saveNodeData');
  const canvasTitle = document.getElementById('canvasTitle');
  const uploadPlan = document.getElementById('uploadPlan');

  // IA panel elements
  const iaPanel = document.getElementById('ia-panel');
  const iaCounterEl = document.getElementById('iaCount');
  const iaStatusEl = document.getElementById('iaStatus');
  const iaProgress = document.getElementById('iaProgress');
  const iaSteps = Array.from(document.querySelectorAll('#ia-steps li'));
  const sendToIA = document.getElementById('sendToIA');
  const vizPlanBtn = document.getElementById('visualizarPlanPanel');

  let meta = { fases: [], campos: [] };
  let mode = 'move';
  let idCnt = 0;
  let currentNode = null;
  let latestIAPlan = '';
  const globalVars = {
    proyecto: '',
    metodologia: '',
    entrada: '',
    pdas: [],
    campos: [],
    contenidos: [],
    fases: []
  };

  // Cargar problemas desde el Plano de la Realidad
  let problemsFromSituation = [];
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

  // IA request counter reset logic - ahora basado en cuenta de usuario
  const today = new Date().toISOString().slice(0,10);
  const userRequestKey = `iaRequestCount_${userData.email}`;
  const userRequestDateKey = `iaRequestDate_${userData.email}`;
  
  if (localStorage.getItem(userRequestDateKey) !== today) {
    localStorage.setItem(userRequestDateKey, today);
    localStorage.setItem(userRequestKey, '0');
  }
  
  function updateCounterUI() {
    const maxRequests = userData.membership === 'premium' ? 10 : 4;
    const count = parseInt(localStorage.getItem(userRequestKey) || '0',10);
    iaCounterEl.textContent = `${count}/${maxRequests}`;
    sendToIA.disabled = count >= maxRequests;
  }
  updateCounterUI();

  // Tooltip element
  const tooltip = document.createElement('div');
  tooltip.id = 'tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute', background: 'rgba(0,0,0,0.75)',
    color: '#fff', padding: '4px 8px', borderRadius: '4px',
    fontSize: '12px', pointerEvents: 'none',
    display: 'none', zIndex: '3000'
  });
  document.body.appendChild(tooltip);

  const typeEmojis = {
    'Entrada': '📝','Campos Formativos': '🎓','Fase': '🔄',
    'Contenido': '📚','PDA': '✔️','Metodología': '🛠️',
    'Nodo IA': '🤖','Nota': '💡'
  };
  const campoColors = {
    'Lenguajes': 'orange','De lo humano': 'red',
    'Etica Naturaleza': 'green','Saberes y Pensamiento Científico': 'blue'
  };

  // 1) Load metadata
  fetch('/api/meta')
    .then(r => r.json())
    .then(j => meta = j);

  // 2) Initialize jsPlumb
  const instance = jsPlumb.getInstance({
    Connector: ["Bezier", { curviness: 50 }],
    Anchors: ["AutoDefault"],
    PaintStyle: { stroke: "#0077cc", strokeWidth: 2 },
    Endpoint: ["Dot", { radius: 3 }],
    ConnectionOverlays: [["Arrow", { width: 10, length: 10, location: 1 }]]
  });

  // 3) Allowed connections
  const allowedConnections = {
    'Entrada': ['Nodo IA'],
    'Fase': ['Campos Formativos', 'PDA'],
    'Campos Formativos': ['Contenido'],
    'Contenido': ['Fase'],
    'PDA': ['Nodo IA'],
    'Metodología': ['Nodo IA'],
    'Nodo IA': []
  };

  // 4) Change mode
  function setMode(m) {
    mode = m;
    document.body.className = `mode-${m}`;
    [btnMove, btnConn, btnDel].forEach(b =>
      b.classList.toggle('active',
        b.id === 'btn' + m.charAt(0).toUpperCase() + m.slice(1)
      )
    );
    canvasTitle.contentEditable = m === 'move';
    canvasTitle.style.cursor    = m === 'move' ? 'text' : 'default';
  }
  btnMove.onclick = () => setMode('move');
  btnConn.onclick = () => setMode('connect');
  btnDel.onclick  = () => setMode('delete');
  setMode('move');

  // 5) Connection control
  instance.bind('beforeStartConnect', info => {
    if (mode !== 'connect') return false;
    const cnt = instance.getConnections({ source: info.source }).length;
    const h   = info.source.querySelector('.conn-handle');
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
  });
  instance.bind('connectionDetached', info => {
    const tgtEl = info.connection.target;
    tgtEl.classList.remove('completed');
    delete tgtEl.dataset.color;
    updateNodeIAStatus();
  });

  // 7) Drag & drop from palette
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
    const r    = canvas.getBoundingClientRect();
    const grid = 20;
    const x    = Math.round((e.clientX - r.left) / grid) * grid;
    const y    = Math.round((e.clientY - r.top)  / grid) * grid;
    createNode(type, x, y);
  });

  // 8) Create node
  function createNode(type, x, y) {
    const el = document.createElement('div');
    el.className    = 'node';
    el.id           = `n${idCnt++}`;
    el.dataset.type = type;
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';
    el.innerHTML    =
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
        el.style.top  = T+'px';
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
      }
    });

    let hoverTimer;
    el.addEventListener('mouseenter', () => {
      if (!el.dataset.color) return;
      hoverTimer = setTimeout(() => {
        const info = [];
        if (el.dataset.text)      info.push(`${el.dataset.type}: ${el.dataset.text}`);
        if (el.dataset.fase)      info.push(`Fase: ${el.dataset.fase}`);
        if (el.dataset.campo)     info.push(`Campo: ${el.dataset.campo}`);
        if (el.dataset.contenido) info.push(`Contenido: ${el.dataset.contenido}`);
        if (el.dataset.pdas)      info.push(`PDA: ${el.dataset.pdas}`);
        if (el.dataset.value)     info.push(`Metodología: ${el.dataset.value}`);
        tooltip.innerHTML = info.join('<br>');
        const rect = el.getBoundingClientRect();
        tooltip.style.top     = (rect.bottom + window.scrollY + 5) + 'px';
        tooltip.style.left    = (rect.left   + window.scrollX)     + 'px';
        tooltip.style.display = 'block';
      }, 1000);
    });
    el.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimer);
      tooltip.style.display = 'none';
    });
  }

  // 9) Properties panel
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
      'Nodo IA': 'Aquí puedes enviar los datos a la IA.',
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
      // Cargar problemas desde el Plano de la Realidad
      problemsFromSituation = await loadProblemsFromReality();
      
      sel1 = document.createElement('select');
      sel1.append(new Option('Selecciona un problema', ''));
      problemsFromSituation.forEach(problem => {
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

    // Nodo IA: setup panel
    if (type==='Nodo IA') {
      iaPanel.classList.remove('hidden');
      iaStatusEl.textContent = '—';
      iaProgress.value = 0;
      iaSteps.forEach(li => li.classList.remove('completed'));
      updateCounterUI();
    } else {
      iaPanel.classList.add('hidden');
    }

    saveBtn.onclick = () => {
      if (ta)                     node.dataset.text   = ta.value;
      if (sel1 && type==='Entrada') node.dataset.text   = sel1.value;
      if (sel1 && type==='Fase')  node.dataset.fase   = sel1.value;
      if (sel1 && sel2 && type==='Campos Formativos') {
        node.dataset.fase      = sel1.value;
        const opt = sel2.selectedOptions[0];
        node.dataset.campo     = opt.value;
        node.dataset.campoFile = opt.dataset.file;
      }
      if (sel3 && type==='Contenido') node.dataset.contenido = sel3.value;
      if (sel3 && type==='PDA')       node.dataset.pdas      = sel3.value;
      if (sel1 && type==='Metodología') node.dataset.value    = sel1.value;
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
    };

    propsPan.classList.remove('hidden');
  }

  document.addEventListener('click', e => {
    if (!propsPan.contains(e.target) && !currentNode?.contains(e.target)) {
      propsPan.classList.add('hidden');
    }
  });

  // Helpers
  function parseTxt(text) {
    const lines = text.trim().split('\n').filter(l=>l.trim());
    const hdr   = lines[0].split('|').map(h=>h.trim()).slice(1);
    const out   = {}, rows = lines.slice(1);
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
    if (!nodeIA) return;
    const conns = instance.getConnections({ target: nodeIA });
    const types = new Set(conns.map(c => c.source.dataset.type));
    const ready = ['Entrada','PDA','Metodología'].every(r => types.has(r));
    if (ready) {
      markNetwork(nodeIA,
        getComputedStyle(document.documentElement).getPropertyValue('--success').trim()
      );
    } else {
      nodeIA.classList.remove('completed');
      nodeIA.style.setProperty('--aura-color',
        getComputedStyle(document.documentElement).getPropertyValue('--purple').trim()
      );
    }
  }

  // 10) Deletion gesture
  let deleting = false, startX, startY, deleteCanvas, dcCtx;
  container.addEventListener('mousedown', e => {
    if (mode==='delete') {
      deleting = true;
      startX = e.clientX; startY = e.clientY;
      deleteCanvas = document.createElement('canvas');
      deleteCanvas.width  = container.scrollWidth;
      deleteCanvas.height = container.scrollHeight;
      Object.assign(deleteCanvas.style, {
        position: 'absolute', top: '0', left: '0',
        width: container.scrollWidth + 'px',
        height: container.scrollHeight + 'px',
        pointerEvents: 'none', zIndex: '5000'
      });
      container.appendChild(deleteCanvas);
      dcCtx = deleteCanvas.getContext('2d');
      dcCtx.strokeStyle = 'red'; dcCtx.lineWidth = 2;
    }
  });
  container.addEventListener('mousemove', e => {
    if (!deleting) return;
    dcCtx.clearRect(0, 0, deleteCanvas.width, deleteCanvas.height);
    dcCtx.beginPath();
    const r = container.getBoundingClientRect();
    const x1 = startX - r.left + container.scrollLeft;
    const y1 = startY - r.top + container.scrollTop;
    const x2 = e.clientX - r.left + container.scrollLeft;
    const y2 = e.clientY - r.top + container.scrollTop;
    dcCtx.moveTo(x1, y1); dcCtx.lineTo(x2, y2); dcCtx.stroke();
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const sx = startX + (e.clientX - startX) * (i/steps);
      const sy = startY + (e.clientY - startY) * (i/steps);
      const el = document.elementFromPoint(sx, sy);
      if (el && el.tagName==='path' && el.closest('.jtk-connector')) {
        instance.getAllConnections().forEach(conn => {
          if (conn.getConnector().canvas.contains(el)) {
            instance.deleteConnection(conn);
            updateNodeIAStatus();
          }
        });
      }
    }
  });
  document.addEventListener('mouseup', () => {
    if (deleting) {
      deleting = false;
      deleteCanvas.remove();
    }
  });

  // 11) Generate regular plan (sin IA)
  document.getElementById('generarPlan').onclick = async () => {
    const nodes = [...canvas.querySelectorAll('.node')].map(el => ({
      id: el.id,
      type: el.dataset.type,
      data: el.dataset.text || el.dataset.value || el.dataset.pdas || ''
    }));
    const resp = await fetch('/api/generatePlan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nodes)
    }).then(r => r.json());
    window.open(`/api/downloadPlan?id=${resp.id}`, '_blank');
  };

  // 12) Edit canvas title
  canvasTitle.addEventListener('dblclick', () => {
    if (mode==='move') {
      canvasTitle.contentEditable = true;
      canvasTitle.focus();
    }
  });
  canvasTitle.addEventListener('blur', () => {
    canvasTitle.contentEditable = false;
  });
  canvasTitle.addEventListener('keydown', e => {
    if (e.key==='Enter') {
      e.preventDefault();
      canvasTitle.blur();
    }
  });

  // 13) Send to IA (con colección de todos los PDAs, entradas, metodologías…)
  // === HISTORIAL DE CONVERSACIÓN PARA CONTEXTO ACUMULATIVO ===
  let conversationHistory = [];

  sendToIA.onclick = async () => {
  // Fetch user config for Datos Generales fields BEFORE try block, so it's always defined
  let userConfig = {};
  try {
    const res = await fetch('/api/config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await res.json();
    if (data.success && data.config) {
      userConfig = {
        nivelEducativo: data.config.nivelEducativo || '',
        centroTrabajo: data.config.centroTrabajo || '',
        sectorEducativo: data.config.sectorEducativo || '',
        zonaEscolar: data.config.zonaEscolar || '',
        fase: data.config.fase || '',
        grado: data.config.grado || '',
        grupo: data.config.grupo || '',
        docente: data.config.nombreDocente || '',
        director: data.config.nombreDirector || '',
        inicioPeriodo: data.config.inicioPeriodo || '',
        finPeriodo: data.config.finPeriodo || ''
      };
    }
  } catch (e) {
    userConfig = {};
  }
    const maxRequests = userData.membership === 'premium' ? 10 : 4;
    const currentCount = parseInt(localStorage.getItem(userRequestKey) || '0', 10);
    
    if (currentCount >= maxRequests) {
      alert(`Has alcanzado el límite de ${maxRequests} solicitudes diarias. ${userData.membership === 'basic' ? 'Actualiza a Premium para aumentar el límite.' : ''}`);
      return;
    }

    iaStatusEl.textContent = 'Enviando…';
    if (iaSteps && iaSteps[0]) iaSteps[0].classList.add('completed');
    iaProgress.value = 1;

    // Recolectar datos globales (recorriendo TODOS los nodos del canvas, no solo conexiones)
    const nodeList = canvas.querySelectorAll('.node');
    globalVars.entrada = Array.from(nodeList)
      .filter(n => n.dataset.type === 'Entrada' && n.dataset.text)
      .map(n => n.dataset.text).join('; ');
    globalVars.pdas = Array.from(nodeList)
      .filter(n => n.dataset.type === 'PDA' && n.dataset.pdas)
      .map(n => n.dataset.pdas);
    globalVars.campos = Array.from(nodeList)
      .filter(n => n.dataset.type === 'Campos Formativos' && n.dataset.campo)
      .map(n => n.dataset.campo);
    globalVars.contenidos = Array.from(nodeList)
      .filter(n => n.dataset.type === 'Contenido' && n.dataset.contenido)
      .map(n => n.dataset.contenido);
    globalVars.metodologia = Array.from(nodeList)
      .filter(n => n.dataset.type === 'Metodología' && n.dataset.value)
      .map(n => n.dataset.value).join('; ');
    globalVars.proyecto = canvasTitle.textContent;
    globalVars.fases = Array.from(nodeList)
      .filter(n => n.dataset.type === 'Fase' && n.dataset.fase)
      .map(n => n.dataset.fase);

    // Inicializar almacenamiento de resultados IA
    window.iaResults = {
      evaluacion: null,
      secuencia: null,
      organizacion: null,
      actividades: null,
      reflexiones: null
    };

    let todoOk = true;

    try {
      // 1. Construir historial acumulativo y contexto reforzado
      const contexto = `Proyecto: ${globalVars.proyecto}\nMetodología: ${globalVars.metodologia}\nFases: ${globalVars.fases.join(', ')}\nPDAs: ${globalVars.pdas.join(', ')}\nCampos Formativos: ${globalVars.campos.join(', ')}\nContenidos: ${globalVars.contenidos.join(', ')}\nEntrada (problema): ${globalVars.entrada}`;
      // Contexto enriquecido para la IA
      const contextoResumen = `ERES UNA PLATAFORMA EXPERTA EN SOLUCIONES PEDAGÓGICAS Y DIDÁCTICAS.\nDebes analizar, proponer y reflexionar como un especialista en educación y didáctica.\nTienes la tarea de crear un plan didáctico completo, coherente y personalizado, usando TODA la siguiente información y contexto:\n${contexto}\n\nREQUISITOS: \n- Usa todos los datos proporcionados para generar soluciones didácticas precisas.\n- Todas las tablas, actividades y reflexiones deben estar alineadas con el contexto y problemática.\n- No generes respuestas genéricas.\n- Las reflexiones deben ser profundas, personalizadas y basadas en el plan generado.\n- Mantén la coherencia y continuidad temática en cada paso.\n- Actúa como una plataforma que ayuda a docentes a planear, analizar y mejorar su práctica.\n`;
      // Primer mensaje del historial: contexto + solicitud de primera tabla
      if (conversationHistory.length === 0) {
        conversationHistory.push({ role: "user", content: `${contextoResumen}\n\nPRIMERA TAREA: Genera la tabla EVALUACIÓN en JSON con la estructura [{\"Problema\":\"[entrada]\",\"Proceso de pensamiento\":\"\",\"Evidencia de aprendizaje\":\"\",\"Nivel de logro\":\"\"}], máximo 5 filas. SOLO JSON, sin texto extra.` });
      }
      const totalSteps = 5;
      let currentStep = 1;
      iaProgress.value = Math.round((currentStep/totalSteps)*100);
      iaStatusEl.textContent = 'Generando tabla Evaluación...';
      // Enviar historial truncado (máximo 13000 tokens aprox)
      function estimateTokens(str) { return Math.ceil(str.length / 3.5); }
      function truncateHistory(history, maxTokens) {
        let total = 0;
        const out = [];
        for (let i = history.length - 1; i >= 0; i--) {
          total += estimateTokens(history[i].content);
          if (total > maxTokens) break;
          out.unshift(history[i]);
        }
        return out;
      }
      let truncatedHistory = truncateHistory(conversationHistory, 13000);
      // Construcción de historial para aprovechar 'Step Back' (contexto ampliado)
      // Refuerza el contexto general al inicio, pero cada solicitud es autocontenida y específica
      function buildPromptForStep(stepInstruction) {
        return (
          contextoResumen +
          '\n\nINSTRUCCIÓN ESPECÍFICA PARA ESTA TABLA:\n' +
          stepInstruction +
          '\n\nCONVERSACIÓN RELEVANTE PREVIA:\n' +
          truncatedHistory.map(m => (m.role === 'user' ? 'Usuario: ' : 'Asistente: ') + m.content).join('\n')
        );
      }
      // Solicitud de tabla Evaluación
      const evalPrompt = buildPromptForStep(
        'Genera la tabla EVALUACIÓN en JSON con la estructura [{"Problema":"[entrada]","Proceso de pensamiento":"","Evidencia de aprendizaje":"","Nivel de logro":""}], máximo 5 filas. El campo "Nivel de logro" debe permanecer vacío en todas las filas. SOLO JSON, sin texto extra.'
      );
      let resp = await fetch('/api/ia/generatePlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: evalPrompt, max_tokens: 4000 })
      });
      let txt = await resp.text();
      // Guardar respuesta en historial
      conversationHistory.push({ role: "assistant", content: txt });
      // Parsear tabla evaluación
      window.iaResults.evaluacion = JSON.parse(txt.replace(/```json|```/g, '').trim());
      // Forzar campo 'Nivel de logro' vacío en todas las filas
      if (Array.isArray(window.iaResults.evaluacion)) {
        window.iaResults.evaluacion.forEach(row => {
          if ('Nivel de logro' in row) row['Nivel de logro'] = '';
        });
      }
      iaProgress.value = 35;

      // 3. SECUENCIA DIDÁCTICA
      currentStep++;
      iaProgress.value = Math.round((currentStep/totalSteps)*100);
      iaStatusEl.textContent = 'Generando tabla Secuencia Didáctica...';
      const secuenciaPrompt = buildPromptForStep(
        'Genera la tabla SECUENCIA DIDÁCTICA en JSON. Estructura: [{"Fase":"","Etapa":"","Actividades":"","Evaluación formativa":""}]. Máximo 5 filas. SOLO JSON, sin texto extra.'
      );
      resp = await fetch('/api/ia/generatePlan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: secuenciaPrompt, max_tokens: 4000 })
      });
      txt = await resp.text();
      window.iaResults.secuencia = JSON.parse(txt.replace(/```json|```/g, '').trim());

      // 4. ORGANIZACIÓN
      currentStep++;
      iaProgress.value = Math.round((currentStep/totalSteps)*100);
      iaStatusEl.textContent = 'Generando tabla Organización...';
      const organizacionPrompt = buildPromptForStep(
        'Genera la tabla ORGANIZACIÓN en JSON. Estructura: [{"Fase":"","Tiempo":"","Espacio":"","Recursos/Materiales":""}]. Máximo 5 filas. SOLO JSON, sin texto extra.'
      );
      resp = await fetch('/api/ia/generatePlan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: organizacionPrompt, max_tokens: 4000 })
      });
      txt = await resp.text();
      window.iaResults.organizacion = JSON.parse(txt.replace(/```json|```/g, '').trim());

      // 5. REGISTRO DE ACTIVIDADES
      currentStep++;
      iaProgress.value = Math.round((currentStep/totalSteps)*100);
      iaStatusEl.textContent = 'Generando lista de Actividades...';
      const actividadesPrompt = buildPromptForStep(
        'Genera una lista JSON de ACTIVIDADES didácticas relevantes, concretas y alineadas al plan. SOLO completa el campo "Actividad" (no llenes "Fecha" ni "Observaciones"). Estructura: [{"Actividad": ""}]. Máximo 5 actividades. SOLO JSON, sin texto extra ni explicación.'
      );
      resp = await fetch('/api/ia/generatePlan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: actividadesPrompt, max_tokens: 4000 })
      });
      txt = await resp.text();
      window.iaResults.actividades = JSON.parse(txt.replace(/```json|```/g, '').trim());

      // 6. REFLEXIONES
      currentStep++;
      iaProgress.value = Math.round((currentStep/totalSteps)*100);
      iaStatusEl.textContent = 'Generando reflexiones...';
      window.iaResults.reflexiones = 'Agregar Reflexiones';
      iaProgress.value = Math.round((currentStep/totalSteps)*100);

      // Si llegamos aquí, todo fue exitoso: marcar los pasos de la UI
      if (iaSteps && iaSteps.length) {
        for (let i = 0; i < iaSteps.length; i++) {
          if (iaSteps[i]) iaSteps[i].classList.add('completed');
        }
      }
      // Habilitar botón Visualizar Plan SOLO al finalizar
      if (vizPlanBtn) vizPlanBtn.disabled = false;

      // Guardar datos para Visualizar Plan
      // Merge userConfig fields into globalVars for viewer
      const mergedConfig = { ...userConfig, ...globalVars };
      window.iaGeneratedData = {
        config: mergedConfig,
        tables: {
          evaluacion: window.iaResults.evaluacion,
          secuencia: window.iaResults.secuencia,
          organizacion: window.iaResults.organizacion,
          actividades: window.iaResults.actividades,
          reflexiones: window.iaResults.reflexiones
        },
        fecha: new Date().toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };
      iaStatusEl.textContent = 'Completado';

      // Actualizar contador
      localStorage.setItem(userRequestKey, (currentCount + 1).toString());
      updateCounterUI();
    } catch (e) {
      todoOk = false;
      console.error('Error en el proceso IA:', e);
      iaStatusEl.textContent = 'Error';
      alert('Error en el proceso IA: ' + e.message);
    }
  };

  function parseIAResponse(response) {
    try {
      // Eliminar posibles marcadores de código y convertir a JSON
      const jsonStr = response.replace(/```json|```/g, '').trim();
      const data = JSON.parse(jsonStr);
      
      // Estructura mínima requerida
      return {
        evaluacion: data.EVALUACIÓN || [],
        secuencia: data["SECUENCIA DIDÁCTICA"] || [],
        organizacion: data.ORGANIZACIÓN || [],
        actividades: data["REGISTRO DE ACTIVIDADES"] || [],
        reflexiones: data.REFLEXIONES || "No se generaron reflexiones"
      };
    } catch (e) {
      console.error('Error al parsear respuesta IA:', e);
      return {
        evaluacion: [],
        secuencia: [],
        organizacion: [],
        actividades: [],
        reflexiones: "Error al procesar la respuesta de IA"
      };
    }
  }

  // 14) Visualizar Plan
  vizPlanBtn.onclick = () => {
    if (!window.iaGeneratedData) {
      alert('Primero debes generar un plan con IA');
      return;
    }
    
    const viewerUrl = `plano-viewer-prueba.html?proyecto=${encodeURIComponent(window.iaGeneratedData.config.proyecto)}&metodologia=${encodeURIComponent(window.iaGeneratedData.config.metodologia)}`;
    const nuevaVentana = window.open(viewerUrl, '_blank');
    
    // Usar postMessage solo después de que la ventana esté cargada
    async function getUserConfig() {
      try {
        const res = await fetch('/api/config', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await res.json();
        if (!data.success || !data.config) return {};
        // Adaptar nombres para el visor
        return {
          nivelEducativo: data.config.nivelEducativo || '',
          centroTrabajo: data.config.centroTrabajo || '',
          sectorEducativo: data.config.sectorEducativo || '',
          zonaEscolar: data.config.zonaEscolar || '',
          fase: data.config.fase || '',
          grado: data.config.grado || '',
          grupo: data.config.grupo || '',
          docente: data.config.nombreDocente || '',
          director: data.config.nombreDirector || '',
          inicioPeriodo: data.config.inicioPeriodo || '',
          finPeriodo: data.config.finPeriodo || ''
        };
      } catch (e) {
        return {};
      }
    }

    // Reimplementación del setInterval para postMessage con config extendido
    const checkLoad = setInterval(async () => {
      if (nuevaVentana.closed) {
        clearInterval(checkLoad);
        return;
      }
      try {
        const config = await getUserConfig();
        // EXTRAER SIEMPRE los valores actuales del canvas para campos, contenidos y fases
        const nodeList = canvas.querySelectorAll('.node');
        const camposCanvas = Array.from(nodeList)
          .filter(n => n.dataset.type === 'Campos Formativos' && n.dataset.campo)
          .map(n => n.dataset.campo).filter(Boolean);
        const contenidosCanvas = Array.from(nodeList)
          .filter(n => n.dataset.type === 'Contenido' && n.dataset.contenido)
          .map(n => n.dataset.contenido).filter(Boolean);
        const fasesCanvas = Array.from(nodeList)
          .filter(n => n.dataset.type === 'Fase' && n.dataset.fase)
          .map(n => n.dataset.fase).filter(Boolean);
        const mergedConfig = {
          ...config,
          proyecto: globalVars.proyecto || (window.iaGeneratedData?.config?.proyecto ?? ''),
          metodologia: globalVars.metodologia || (window.iaGeneratedData?.config?.metodologia ?? ''),
          entrada: globalVars.entrada || (window.iaGeneratedData?.config?.entrada ?? ''),
          pdas: Array.isArray(globalVars.pdas) ? globalVars.pdas : (window.iaGeneratedData?.config?.pdas ?? []),
          campos: camposCanvas.length ? camposCanvas : (Array.isArray(globalVars.campos) ? globalVars.campos : (window.iaGeneratedData?.config?.campos ?? [])),
          contenidos: contenidosCanvas.length ? contenidosCanvas : (Array.isArray(globalVars.contenidos) ? globalVars.contenidos : (window.iaGeneratedData?.config?.contenidos ?? [])),
          fases: fasesCanvas.length ? fasesCanvas : (Array.isArray(globalVars.fases) ? globalVars.fases : (window.iaGeneratedData?.config?.fases ?? []))
        };
        nuevaVentana.postMessage({
          type: 'loadData',
          config: mergedConfig,
          ...window.iaGeneratedData
        }, '*');
        clearInterval(checkLoad);
      } catch (e) {
        // La ventana aún no está lista
      }
    }, 100);
  };
  // 15) Carga configuración o plan
  uploadPlan.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (file.name.endsWith('.json')) {
        const cfg = JSON.parse(text);
        instance.deleteEveryConnection();
        canvas.innerHTML = '<h1 id="canvasTitle" contenteditable="false">Plan Didáctico</h1>';
        idCnt = 0;
        cfg.nodes.forEach(n => {
          createNode(n.type, n.x, n.y);
          const el = document.getElementById(`n${idCnt-1}`);
          el.id = n.id;
          Object.assign(el.dataset, n.data);
        });
        setTimeout(() => {
          cfg.connections.forEach(c => {
            const s = document.getElementById(c.sourceId);
            const t = document.getElementById(c.targetId);
            if (s && t) instance.connect({ source: s, target: t });
          });
        }, 50);
      }
    };
    reader.readAsText(file);
  });

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