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

  // IA request counter reset logic
  const today = new Date().toISOString().slice(0,10);
  if (localStorage.getItem('iaRequestDate') !== today) {
    localStorage.setItem('iaRequestDate', today);
    localStorage.setItem('iaRequestCount', '0');
  }
  
  function updateCounterUI() {
    const count = parseInt(localStorage.getItem('iaRequestCount') || '0',10);
    iaCounterEl.textContent = count;
    sendToIA.disabled = count >= 10;
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
  function openProperties(node) {
    currentNode = node;
    const type = node.dataset.type;
    document.getElementById('propTitle').innerText = type;
    const div = document.getElementById('propContent');
    div.innerHTML = '';

    const hints = {
      'Entrada': 'Texto libre de entrada para el plan.',
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
    if (type==='Nota' || type==='Entrada') {
      ta = document.createElement('textarea');
      ta.value = node.dataset.text || '';
      div.appendChild(ta);
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
    if (type==='PDA') {
      ['Fase: '+node.dataset.fase,'Campo: '+node.dataset.campo,'Contenido: '+node.dataset.contenido]
        .forEach(txt=> div.append(Object.assign(document.createElement('p'),{textContent:txt})));
      sel3 = document.createElement('select');
      sel3.append(new Option('Elige PDA',''));
      div.appendChild(sel3);
      if (node.dataset.campoFile && node.dataset.contenido) {
        fetch(`/api/fileContent?name=${node.dataset.campoFile}`)
          .then(r=> r.json())
          .then(j=>{
            const d = parseTxt(j.content)[node.dataset.contenido] || {};
            Object.values(d).flat().forEach(p=> sel3.append(new Option(p,p)));
            sel3.value = node.dataset.pdas || '';
          });
      }
    }
    if (type==='Metodología') {
      sel1 = document.createElement('select');
      ['Aprendizaje Basado en Projectos','Aprendizaje basado en indagación','Aprendizaje basado en problemas','Aprendizaje servicio']
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
  sendToIA.onclick = async () => {
    iaStatusEl.textContent = 'Enviando…';
    iaSteps[0].classList.add('completed');
    iaProgress.value = 1;

    // Recolectar datos de todos los nodos conectados al Nodo IA
    const conns = instance.getConnections({ target: currentNode });
    const entradas     = conns.filter(c => c.source.dataset.type==='Entrada').map(c=>c.source.dataset.text).join('; ');
    const pdasList     = conns.filter(c => c.source.dataset.type==='PDA').map(c=>c.source.dataset.pdas).join('; ');
    const metodologias = conns.filter(c => c.source.dataset.type==='Metodología').map(c=>c.source.dataset.value).join('; ');
    const campos       = conns.filter(c => c.source.dataset.type==='Campos Formativos').map(c=>c.source.dataset.campo).join('; ');
    const contenidos   = conns.filter(c => c.source.dataset.type==='Contenido').map(c=>c.source.dataset.contenido).join('; ');

    const prompt = `
Como experto en diseño pedagógico, desarrolla un plan didáctico interdisciplinar completo que aborde la problemática: "${entradas}", 
considerando los siguientes elementos:

1. Campos Formativos: ${campos}
2. Contenidos: ${contenidos}
3. Procesos de Aprendizaje (PDA): ${pdasList}
4. Metodologías: ${metodologias}

El plan debe incluir:
- Una solución pedagógica efectiva
- Conexiones interdisciplinares claras
- Actividades alineadas con los PDA
- Evaluaciones formativas
- Recursos y materiales necesarios

Organiza la respuesta en formato Markdown con las siguientes secciones:
1. Datos Generales (rellenar con información de configuración)
2. Ubicación Curricular (problema, PDA, contenidos, campos formativos)
3. Evaluación (procesos de pensamiento, evidencias, niveles de logro)
4. Secuencia Didáctica (proyecto, metodología, fases, actividades)
5. Organización (tiempos, espacios, recursos)
6. Registro de Actividades
7. Reflexiones finales

Sé preciso y estructurado en la respuesta, asegurando que cada sección tenga la información relevante para implementar el plan en el aula.
`;

    try {
      const resp = await fetch('/api/ia/generatePlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      iaStatusEl.textContent = 'Recibiendo…';
      iaSteps[1].classList.add('completed');
      iaProgress.value = 2;

      const json = await resp.json();
      latestIAPlan = json.response || '';
      iaStatusEl.textContent = 'Parseando…';
      iaSteps[2].classList.add('completed');
      iaProgress.value = 3;

      iaStatusEl.textContent = 'Finalizado';
      iaSteps[3].classList.add('completed');
      iaProgress.value = 4;

      let cnt = parseInt(localStorage.getItem('iaRequestCount') || '0', 10) + 1;
      localStorage.setItem('iaRequestCount', cnt);
      updateCounterUI();
    } catch (e) {
      iaStatusEl.textContent = 'Error';
      console.error(e);
    }
  };

  // 14) Visualizar plan en nueva pestaña con formato completo y editable
  vizPlanBtn.onclick = async () => {
    // Obtener configuración del usuario
    let config = {};
    try {
      const response = await fetch('/api/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          config = data.config;
        }
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }

    // Formatear fechas
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Crear nueva ventana con el formato completo y editable
    const nuevaVentana = window.open('', '_blank');
    nuevaVentana.document.open();
    nuevaVentana.document.write(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planificación Didáctica</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    .bold-column {
      font-weight: bold;
      background-color: #f2f2f2;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .border-b {
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .text-center {
      text-align: center;
    }
    .text-right {
      text-align: right;
    }
    .mt-6 {
      margin-top: 1.5rem;
    }
    .py-2 {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
    .py-4 {
      padding-top: 1rem;
      padding-bottom: 1rem;
    }
    .px-2 {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    .py-6 {
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
    }
    .shadow-lg {
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    .rounded-lg {
      border-radius: 0.5rem;
    }
    .bg-white {
      background-color: white;
    }
    footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.8rem;
      color: #666;
    }
    .logo-container {
      position: relative;
      display: inline-block;
    }
    .logo-upload-btn {
      position: absolute;
      bottom: 0;
      right: 0;
      background: #007bff;
      color: white;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
    }
    .logo-upload-btn:hover {
      background: #0056b3;
    }
    #logoInput {
      display: none;
    }
    .editable {
      min-height: 20px;
      padding: 5px;
      border: 1px dashed transparent;
    }
    .editable:hover {
      border-color: #ccc;
    }
    .editable:focus {
      outline: none;
      border-color: #007bff;
      background-color: #f8f9fa;
    }
    .toolbar {
      background: #f8f9fa;
      padding: 10px;
      margin-bottom: 15px;
      border-radius: 5px;
      display: flex;
      gap: 10px;
    }
    .toolbar button {
      padding: 5px 10px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    .toolbar button:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Barra de herramientas -->
    <div class="toolbar">
      <button onclick="window.print()">Imprimir</button>
      <button onclick="savePlan()">Guardar Plan</button>
    </div>

    <!-- Encabezado -->
    <div class="flex justify-between items-center py-4 border-b">
      <div class="logo-container">
        <img id="logoImage" src="assets/Ddapptic.svg" alt="Logo" class="h-12">
        <div class="logo-upload-btn" title="Cambiar logo" onclick="document.getElementById('logoInput').click()">+</div>
        <input type="file" id="logoInput" accept="image/*" onchange="handleLogoUpload(event)">
      </div>
      <div id="current-date-time" class="text-sm text-right">
        <p class="text-slate-400">Fecha</p>
        <p class="font-bold text-gray-700">${new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>

    <!-- Datos Generales -->
    <div class="bg-white mt-6 shadow-lg rounded-lg p-6">
      <h2 class="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Datos Generales</h2>
      <table class="w-full text-sm border border-gray-300">
        <tbody>
          <tr>
            <td class="py-2 bold-column">Nivel Educativo:</td>
            <td class="py-2 editable" contenteditable="true">${config.nivelEducativo || ''}</td>
            <td class="py-2 bold-column">Nombre del Centro de Trabajo:</td>
            <td class="py-2 editable" contenteditable="true">${config.centroTrabajo || ''}</td>
            <td class="py-2 bold-column">Zona Escolar:</td>
            <td class="py-2 editable" contenteditable="true">${config.zonaEscolar || ''}</td>
          </tr>
          <tr>
            <td class="py-2 bold-column">Sector Educativo:</td>
            <td class="py-2 editable" contenteditable="true">${config.sectorEducativo || ''}</td>
            <td class="py-2 bold-column">Fase:</td>
            <td class="py-2 editable" contenteditable="true">${config.fase || ''}</td>
            <td class="py-2 bold-column">Grado:</td>
            <td class="py-2 editable" contenteditable="true">${config.grado || ''}</td>
          </tr>
          <tr>
            <td class="py-2 bold-column">Grupo:</td>
            <td class="py-2 editable" contenteditable="true">${config.grupo || ''}</td>
            <td class="py-2 bold-column">Nombre del Docente:</td>
            <td class="py-2 editable" contenteditable="true">${config.nombreDocente || ''}</td>
            <td class="py-2 bold-column">Nombre del Director:</td>
            <td class="py-2 editable" contenteditable="true">${config.nombreDirector || ''}</td>
          </tr>
          <tr>
            <td colspan="6" class="py-4 text-center bold-column">
              Periodo de realización
            </td>
          </tr>
          <tr>
            <td class="py-2 bold-column">Inicio:</td>
            <td class="py-2 editable" contenteditable="true">${formatDate(config.inicioPeriodo) || ''}</td>
            <td class="py-2 border border-gray-300"></td>
            <td class="py-2 font-bold border border-gray-300"></td>
            <td class="py-2 bold-column">Fin:</td>
            <td class="py-2 editable" contenteditable="true">${formatDate(config.finPeriodo) || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Respuesta de la IA -->
    <div class="bg-white mt-6 shadow-lg rounded-lg p-6">
      <div id="iaContent" contenteditable="true">
        ${marked.parse(latestIAPlan)}
      </div>
    </div>

    <!-- Footer -->
    <footer class="mt-10 text-center text-xs text-neutral-600">
      <p>DidAppTic | contacto@didapptic.com</p>
    </footer>
  </div>

  <script>
    // Función para manejar la carga del logo
    function handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('logoImage').src = e.target.result;
        // Guardar en localStorage para persistencia
        localStorage.setItem('customLogo', e.target.result);
      };
      reader.readAsDataURL(file);
    }

    // Cargar logo personalizado si existe
    const savedLogo = localStorage.getItem('customLogo');
    if (savedLogo) {
      document.getElementById('logoImage').src = savedLogo;
    }

    // Función para guardar el plan editado
    function savePlan() {
      const planContent = {
        datosGenerales: {},
        iaContent: document.getElementById('iaContent').innerHTML
      };

      // Recopilar datos editables
      document.querySelectorAll('.editable').forEach(el => {
        const key = el.previousElementSibling?.textContent.trim().replace(':', '') || 
                    el.parentElement.previousElementSibling?.textContent.trim().replace(':', '');
        if (key) {
          planContent.datosGenerales[key] = el.textContent;
        }
      });

      // Crear blob para descarga
      const blob = new Blob([JSON.stringify(planContent, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plan-didactico-editado.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Plan guardado correctamente');
    }

    // Hacer que las tablas generadas por marked sean editables
    document.addEventListener('DOMContentLoaded', function() {
      const tables = document.querySelectorAll('#iaContent table');
      tables.forEach(table => {
        table.setAttribute('contenteditable', 'true');
        table.style.borderCollapse = 'collapse';
        table.style.width = '100%';
        const cells = table.querySelectorAll('th, td');
        cells.forEach(cell => {
          cell.style.border = '1px solid #ddd';
          cell.style.padding = '8px';
          cell.style.textAlign = 'left';
        });
      });
    });
  </script>
</body>
</html>
    `);
    nuevaVentana.document.close();
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