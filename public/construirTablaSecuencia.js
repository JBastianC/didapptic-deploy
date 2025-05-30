// Función global para construir la tabla de secuencia didáctica
function construirTablaSecuencia(metodologia) {
  // Control de visibilidad de columna Estrategia
  if (typeof window.estrategiaImprimir === 'undefined') {
    window.estrategiaImprimir = true;
  }

  // Cargar estado guardado
  if (!window.secuenciaTableState) {
    try {
      window.secuenciaTableState = JSON.parse(localStorage.getItem('secuenciaTableState') || '{}');
    } catch (e) {
      window.secuenciaTableState = {};
    }
  }

  const container = document.getElementById('secuenciaTableContainer');
  let fases = [], etapaPorFase = {}, tieneEtapa = false;
  metodologia = (metodologia||'').trim();

  // Definir estructura según metodología
  if (metodologia === 'Aprendizaje servicio') {
    fases = [
      '1. Punto de partida',
      '2. Identificamos necesidades para definir el servicio',
      '3. Organicemos las actividades',
      '4. Creatividad en marcha',
      '5. Valoremos y compartamos nuestros logros'
    ];
  } else if (metodologia === 'Aprendizaje basado en problemas') {
    fases = [
      '1. Presentamos',
      '2. Recolectamos',
      '3. Definimos el problema/Formulemos el problema',
      '4. Organizamos la experiencia',
      '5. Vivimos la experiencia'
    ];
  } else if (metodologia === 'Aprendizaje basado en indagación') {
    fases = [
      '1. Saberes de nuestra comunidad',
      '2. Indagamos',
      '3. Comprendemos',
      '4. Socializamos y aplicamos',
      '5. Reflexionamos el camino andado'
    ];
  } else if (metodologia === 'Aprendizaje Basado en Proyectos') {
    fases = [
      '1. Planeación',
      '2. Acción',
      '3. Intervención'
    ];
    etapaPorFase = {
      '1. Planeación': ['1.1 Identificación','1.2. Recuperación','1.3. Planificación'],
      '2. Acción': ['2.1. Acercamiento','2.2. Comprensión y producción','2.3. Reconocimiento','2.4. Concreción'],
      '3. Intervención': ['3.1. Integración','3.2. Difusión','3.3. Consideraciones','3.4. Avances']
    };
    tieneEtapa = true;
  }

  // Estandarizar datos guardados (si existen)
  let secuenciaGuardada = [];
  try {
    const planViewerData = JSON.parse(localStorage.getItem('planViewerData'));
    if (planViewerData && Array.isArray(planViewerData.secuenciaDidactica)) {
      secuenciaGuardada = planViewerData.secuenciaDidactica.map(row => {
        // Normaliza claves para mayúsculas/minúsculas y espacios
        const normalizado = {};
        Object.keys(row).forEach(k => {
          let key = k.trim().toLowerCase();
          if (key.includes('fase')) key = 'fase';
          else if (key.includes('etapa')) key = 'etapa';
          else if (key.includes('descrip')) key = 'descripcion';
          else if (key.includes('evaluacion')) key = 'evaluacion';
          else if (key.includes('estrateg')) key = 'estrategia';
          normalizado[key] = row[k];
        });
        return normalizado;
      });
    }
  } catch(e) { secuenciaGuardada = []; }

  // Construir HTML de la tabla
  let html = '<table id="secuenciaTable" style="margin-top:0; width:100%; border-collapse:collapse;">';
  
  // Encabezados
  html += '<tr>';
  html += '<th style="border:1px solid #ddd; padding:8px; text-align:left; background-color:#f2f2f2;">Fase</th>';
  if (tieneEtapa) {
    html += '<th style="border:1px solid #ddd; padding:8px; text-align:left; background-color:#f2f2f2;">Etapa</th>';
  }
  
  if (window.estrategiaImprimir) {
    html += `<th style="border:1px solid #ddd; padding:8px; text-align:left; background-color:#f2f2f2;">
      Estrategia 
      <button id='toggleEstrategiaBtn' title='Mostrar/Ocultar Estrategia' 
        style='margin-left:4px; font-size:13px; padding:1px 6px; border-radius:4px; border:1px solid #ccc; background:#fafafa; cursor:pointer;'>
        ${window.estrategiaImprimir ? '🚫' : '👁️'}
      </button>
    </th>`;
  }
  
  html += `<th style="border:1px solid #ddd; padding:8px; text-align:left; background-color:#f2f2f2; ${!window.estrategiaImprimir ? 'width:60%;' : ''}">Actividades</th>`;
  html += '</tr>';

  // Leyendas y descripciones
  const leyendaFaseDescripciones = {
    'Punto de partida': 'Iniciar el proyecto a partir del interés de los alumnos o de una necesidad concreta de la comunidad.\nCompartir la propuesta con el grupo escolar e ir involucrando progresivamente a toda la comunidad.\nGenerar motivación mediante actividades de sensibilización e información que permitan la apropiación del proyecto.\nInvolucrar activamente a aliados, colaboradores y actores clave (familia, comunidad escolar) para enriquecer la experiencia y convertir a todos en protagonistas del aprendizaje y servicio.',
    'Identificamos necesidades para definir el servicio': 'Guiar actividades para explorar la realidad sobre la que se trabajará, recabando información e identificando recursos disponibles.\nEstablecer vínculos con familias e instituciones públicas para obtener apoyo.\nRealizar análisis y debates que permitan un diagnóstico participativo, donde la comunidad escolar pueda expresar sus necesidades.\nAjustar la demanda inicial si es necesario y proponer alternativas de acción.\nFomentar que alumnos, maestros y tutores participen activamente en la definición del proyecto.',
    'Organicemos las actividades': 'Articular los objetivos pedagógicos con los de servicio, definiendo acciones, recursos y responsables.\nUtilizar herramientas básicas de planificación, respondiendo a preguntas clave: ¿Qué se hará? ¿Por qué? ¿Para qué? ¿A quiénes beneficiará? ¿Cómo? ¿Cuándo? ¿Quiénes participarán? ¿Con qué recursos?\nDescribir claramente las acciones, tiempos, recursos materiales (espacios, textos, etc.) y responsables.\nAsegurar que las actividades estén alineadas con el currículo y favorezcan el logro de aprendizajes.',
    'Creatividad en marcha': 'Implementar lo planificado, monitoreando actividades, espacios y tiempos.\nDar seguimiento tanto a los contenidos curriculares como al servicio comunitario.\nFomentar la interacción entre alumnos, maestros y familia para formalizar acuerdos y fortalecer vínculos con la comunidad.',
    'Valoramos y compartimos nuestros logros': 'Evaluar los resultados finales, tanto en lo académico como en el servicio a la comunidad.\nAnalizar el protagonismo de los alumnos y la integración entre aprendizaje y acción.\nIncluir autoevaluaciones y reflexiones grupales sobre los logros alcanzados.\nPlantear la continuidad del proyecto o la posibilidad de iniciar uno nuevo, según su factibilidad.',
    'Saberes de nuestra comunidad': 'Introducir al tema mediante una aproximación contextualizada.\nRecuperar conocimientos previos sobre el tema para generar disonancia cognitiva a partir de ideas diversas y orientarlas hacia nuevos aprendizajes.\nIdentificar la problemática general de investigación, vinculada a aspectos sociales de la comunidad, y establecer preguntas específicas que guíen la indagación.',
    'Indagamos': 'Planificar la investigación: definir acciones para cada pregunta específica (¿qué?, ¿quién?, ¿cómo?, ¿cuándo?, ¿dónde?, ¿para qué?, ¿con qué?).\nEjecutar la indagación en el aula: responder a las preguntas específicas mediante recolección de datos, análisis (descripción, comparación, identificación de patrones, cambios, explicaciones, etc.) y generar una explicación inicial.',
    'Comprendemos': 'Organizar y analizar la información: interpretar datos, sintetizar ideas y clarificar conceptos.\nEstablecer conclusiones vinculadas a la problemática general, integrando los hallazgos de la indagación.',
    'Socializamos y aplicamos': 'Presentar los resultados de la indagación a la comunidad educativa.\nElaborar propuestas de acción para resolver o mitigar la problemática identificada, en la medida de lo posible.',
    'Reflexionamos el camino andado': 'Evaluar el proceso: reflexionar sobre los planes de trabajo, actuaciones individuales/grupales, procedimientos, instrumentos, logros, dificultades y fracasos.',
    'Presentamos': 'Observar individual y colectivamente el contenido del diálogo y los ejes articuladores del proyecto.\nIntroducir un escenario que permita reflexionar sobre una problemática, adaptado a la edad de los alumnos.\nUtilizar una imagen o lectura breve acompañada de preguntas detonantes para contextualizar la situación en la vida cotidiana de los estudiantes.',
    'Recolectamos': 'Recuperar conocimientos sociales y escolares previos sobre la temática detectada.\nAplicar técnicas didácticas para clarificar definiciones, necesidades de aprendizaje y factores relacionados con el problema.',
    'Definimos el problema/Formulemos el problema': 'Establecer con precisión el problema a trabajar, considerando las inquietudes y curiosidades de los alumnos.',
    'Organizamos la experiencia': 'Diseñar una ruta de trabajo que incluya: objetivos de aprendizaje, acuerdos, medios (observación, entrevistas, materiales bibliográficos, audiovisuales, etc.), recursos, tiempos y responsables.\nOrientar la solución hacia la construcción de conocimiento para comprender y resignificar la problemática.',
    'Vivimos la experiencia': 'Guiar a los alumnos en una investigación que les permita comprender el problema y, si es posible, intervenir para transformarlo.\nFomentar la discusión grupal integrando conocimientos relevantes, saberes comunitarios, habilidades y actitudes necesarias.',
    'Valoramos la experiencia': 'Evaluar avances o resultados finales, retomando: el problema inicial, hallazgos y aprendizajes, proceso de construcción de acuerdos, participación individual y colectiva.\nDefinir medios para divulgar resultados e identificar nuevos problemas si es necesario.'
  };

  const leyendaEtapaDescripciones = {
    'Identificación': 'Proponer planteamientos genuinos que refieran a una situación real (no forzada) para introducir el diálogo, considerando escenarios áulicos, escolares y comunitarios.\nPlantear cuestiones que permitan identificar la problemática general y aspectos específicos a investigar en el aula.\nDefinir el insumo inicial: diseñar un planteamiento (producto, material, objeto, texto, etc.) que sirva para que el alumno comprenda el propósito del proyecto.',
    'Recuperación': 'Vincular conocimientos previos sobre el contenido a desarrollar.\nGenerar discrepancia a partir de diferentes ideas para motivar el aprendizaje continuo.',
    'Planificación': 'Negociar los pasos a seguir: acciones del proyecto, producciones necesarias, tiempos y tipo de actividades.',
    'Acercamiento': 'Explorar el problema o situación acordada mediante planteamientos que permitan una primera aproximación (descripción, comparación, identificación de aspectos clave, explicación, etc.).',
    'Comprensión y producción': 'Analizar aspectos necesarios para elaborar las producciones del proyecto, realizando experimentaciones y revisiones según sea necesario.',
    'Reconocimiento': 'Identificar avances y dificultades en el proceso, ajustando estrategias para atenderlos.',
    'Concreción': 'Desarrollar una primera versión del producto planteado en las etapas iniciales.',
    'Integración': 'Presentar y explicar soluciones o recomendaciones, intercambiando producciones y recibiendo retroalimentación.\nModificar y revisar los planteamientos según los cambios sugeridos.',
    'Difusión': 'Mostrar el producto final en el aula, explicando cómo se resolvió la problemática del proyecto.',
    'Consideraciones': 'Recibir opiniones sobre el impacto del producto en los escenarios áulicos, escolares y comunitarios.',
    'Avances': 'Analizar la retroalimentación recibida y utilizarla para mejorar procesos en futuros proyectos.'
  };

  // Construir filas
  if (tieneEtapa) {
    fases.forEach(fase => {
      (etapaPorFase[fase]||['']).forEach(etapa => {
        const fila = secuenciaGuardada.find(f => (f.fase||'').trim()===fase && (f.etapa||'').trim()===etapa);
        const faseKey = (fase || '').replace(/^[0-9. ]+/, '').trim();
        const etapaKey = (etapa || '').replace(/^[0-9. ]+/, '').trim();
        const leyendaFase = leyendaFaseDescripciones[faseKey] || '';
        const leyendaEtapa = leyendaEtapaDescripciones[etapaKey] || '';
        const leyendaIconFase = leyendaFase ? `<span style="cursor:pointer;color:#007bff;margin-left:4px;" title="${leyendaFase.replace(/\n/g,'&#10;')}">&#9432;</span>` : '';
        const leyendaIconEtapa = leyendaEtapa ? `<span style="cursor:pointer;color:#007bff;margin-left:4px;" title="${leyendaEtapa.replace(/\n/g,'&#10;')}">&#9432;</span>` : '';
        const selectId = `estrategia_${Math.random().toString(36).substr(2,8)}`;
        
        html += `<tr>
          <td style="border:1px solid #ddd; padding:8px;">${fase} ${leyendaIconFase}</td>
          <td style="border:1px solid #ddd; padding:8px;">${etapa} ${leyendaIconEtapa}</td>`;
        
        if (window.estrategiaImprimir) {
          html += `<td style="border:1px solid #ddd; padding:8px;">
            <select id="${selectId}" onchange="actualizarMomento(this)" style="width:100%; max-width:100%; padding:4px; border:1px solid #ccc; border-radius:4px;">
              <option value="" selected>Selecciona una estrategia</option>
              <optgroup label="Lenguaje y Comunicación">
                <option>Taller de escritores</option>
                <option>Lectura</option>
                <option>Entrevista</option>
                <option>Diálogo y conversación</option>
                <option>Exposición de temas</option>
                <option>Discusión organizativa</option>
                <option>Diario de grupo y personal</option>
                <option>Correspondencia escolar</option>
                <option>Periódico mural</option>
              </optgroup>
              <optgroup label="Matemáticas">
                <option>Planteamiento y resolución de problemas en seriación y algoritmos</option>
                <option>Planteamiento y resolución de problemas apoyándose del rincón de la tiendita</option>
                <option>Planteamiento y resolución de problemas utilizando el cálculo mental</option>
                <option>Planteamiento y resolución de problemas en juegos matemáticos</option>
              </optgroup>
              <optgroup label="Ciencias Naturales">
                <option>Experimentos</option>
                <option>Consulta en materiales diversos</option>
                <option>Elaboración de maquetas y álbumes</option>
                <option>Mapas conceptuales</option>
                <option>Cápsulas científicas</option>
                <option>Diccionario científico</option>
              </optgroup>
              <optgroup label="Geografía e Historia">
                <option>Recorridos y visitas</option>
                <option>Línea del tiempo</option>
                <option>Cartas a personajes del pasado</option>
                <option>Noticiero histórico</option>
                <option>Escenificación y teatro guiñol</option>
                <option>Historieta</option>
                <option>Mapas históricos</option>
                <option>Lectura de mapas</option>
                <option>Maquetas, dioramas y modelos</option>
                <option>Registro climático</option>
                <option>Uso de gráficas</option>
                <option>Recorrido por la comunidad</option>
                <option>Uso de la fotografía</option>
                <option>Uso de mapas y croquis</option>
              </optgroup>
              <optgroup label="Formación Cívica y Ética">
                <option>Juicio crítico a los medios</option>
                <option>Juego de roles</option>
                <option>Artículos de opinión</option>
                <option>Debate</option>
                <option>Asamblea escolar</option>
                <option>Dilemas morales</option>
              </optgroup>
              <optgroup label="Educación Física">
                <option>Juego con reglas</option>
                <option>Juegos modificados</option>
                <option>Circuitos de acción motriz</option>
                <option>Actividades alternativas</option>
                <option>Juegos naturales</option>
              </optgroup>
              <optgroup label="Artes">
                <option>Elaboración de títeres y máscaras</option>
                <option>Presentación de bailes y danzas</option>
                <option>Muestras y exposiciones</option>
                <option>Apreciación y exploración musical</option>
                <option>Escenificaciones</option>
                <option>¿Cómo mirar el teatro?</option>
                <option>Lectura de imagen</option>
              </optgroup>
            </select>
          </td>`;
        }
        
        html += `<td style="border:1px solid #ddd; padding:8px; ${!window.estrategiaImprimir ? 'width:60%;' : ''}">
          <div class="momentos-clave" style="font-size:13px; margin-bottom:4px; color:#333;"></div>
          <div style="display:flex; gap:4px;">
            <textarea disabled class="auto-grow" style="flex:1; width:100%; min-height:60px; padding:6px; border:1px solid #ddd; border-radius:4px; resize:vertical;"></textarea>
            <button type="button" title="Reemplazar momentos" disabled style="padding:0 8px; font-size:16px; background:none; border:1px solid #ddd; border-radius:4px; cursor:pointer; align-self:flex-start;">♻️</button>
          </div>
        </td></tr>`;
      });
    });
  } else if (fases.length) {
    fases.forEach(fase => {
      const fila = secuenciaGuardada.find(f => (f.fase||'').trim()===fase);
      const faseKey = (fase || '').replace(/^[0-9. ]+/, '').trim();
      const leyendaDesc = leyendaFaseDescripciones[faseKey] || '';
      const leyendaIcon = leyendaDesc ? `<span style="cursor:pointer;color:#007bff;margin-left:4px;" title="${leyendaDesc.replace(/\n/g,'&#10;')}">&#9432;</span>` : '';
      const selectId = `estrategia_${Math.random().toString(36).substr(2,8)}`;
      
      html += `<tr><td style="border:1px solid #ddd; padding:8px;">${fase} ${leyendaIcon}</td>`;
      
      if (window.estrategiaImprimir) {
        html += `<td style="border:1px solid #ddd; padding:8px;">
          <select id="${selectId}" onchange="actualizarMomento(this)" style="width:100%; max-width:100%; padding:4px; border:1px solid #ccc; border-radius:4px;">
            <option value="" selected>Selecciona una estrategia</option>
            <optgroup label="Lenguaje y Comunicación">
              <option>Taller de escritores</option>
              <option>Lectura</option>
              <option>Entrevista</option>
              <option>Diálogo y conversación</option>
              <option>Exposición de temas</option>
              <option>Discusión organizativa</option>
              <option>Diario de grupo y personal</option>
              <option>Correspondencia escolar</option>
              <option>Periódico mural</option>
            </optgroup>
            <optgroup label="Matemáticas">
              <option>Planteamiento y resolución de problemas en seriación y algoritmos</option>
              <option>Planteamiento y resolución de problemas apoyándose del rincón de la tiendita</option>
              <option>Planteamiento y resolución de problemas utilizando el cálculo mental</option>
              <option>Planteamiento y resolución de problemas en juegos matemáticos</option>
            </optgroup>
            <optgroup label="Ciencias Naturales">
              <option>Experimentos</option>
              <option>Consulta en materiales diversos</option>
              <option>Elaboración de maquetas y álbumes</option>
              <option>Mapas conceptuales</option>
              <option>Cápsulas científicas</option>
              <option>Diccionario científico</option>
            </optgroup>
            <optgroup label="Geografía e Historia">
              <option>Recorridos y visitas</option>
              <option>Línea del tiempo</option>
              <option>Cartas a personajes del pasado</option>
              <option>Noticiero histórico</option>
              <option>Escenificación y teatro guiñol</option>
              <option>Historieta</option>
              <option>Mapas históricos</option>
              <option>Lectura de mapas</option>
              <option>Maquetas, dioramas y modelos</option>
              <option>Registro climático</option>
              <option>Uso de gráficas</option>
              <option>Recorrido por la comunidad</option>
              <option>Uso de la fotografía</option>
              <option>Uso de mapas y croquis</option>
            </optgroup>
            <optgroup label="Formación Cívica y Ética">
              <option>Juicio crítico a los medios</option>
              <option>Juego de roles</option>
              <option>Artículos de opinión</option>
              <option>Debate</option>
              <option>Asamblea escolar</option>
              <option>Dilemas morales</option>
            </optgroup>
            <optgroup label="Educación Física">
              <option>Juego con reglas</option>
              <option>Juegos modificados</option>
              <option>Circuitos de acción motriz</option>
              <option>Actividades alternativas</option>
              <option>Juegos naturales</option>
            </optgroup>
            <optgroup label="Artes">
              <option>Elaboración de títeres y máscaras</option>
              <option>Presentación de bailes y danzas</option>
              <option>Muestras y exposiciones</option>
              <option>Apreciación y exploración musical</option>
              <option>Escenificaciones</option>
              <option>¿Cómo mirar el teatro?</option>
              <option>Lectura de imagen</option>
            </optgroup>
          </select>
        </td>`;
      }
      
      html += `<td style="border:1px solid #ddd; padding:8px; ${!window.estrategiaImprimir ? 'width:60%;' : ''}">
        <div class="momentos-clave" style="font-size:13px; margin-bottom:4px; color:#333;"></div>
        <div style="display:flex; gap:4px;">
          <textarea disabled class="auto-grow" style="flex:1; width:100%; min-height:60px; padding:6px; border:1px solid #ddd; border-radius:4px; resize:vertical;"></textarea>
          <button type="button" title="Reemplazar momentos" disabled style="padding:0 8px; font-size:16px; background:none; border:1px solid #ddd; border-radius:4px; cursor:pointer; align-self:flex-start;">♻️</button>
        </div>
      </td></tr>`;
    });
  } else {
    const colspan = tieneEtapa ? (window.estrategiaImprimir ? 4 : 3) : (window.estrategiaImprimir ? 3 : 2);
    html += `<tr><td colspan="${colspan}" style="border:1px solid #ddd; padding:8px; text-align:center;">Seleccione una metodología para ver la secuencia</td></tr>`;
  }
  
  html += '</table>';
  container.innerHTML = html;

  // Configurar botón de toggle
  const toggleBtn = container.querySelector('#toggleEstrategiaBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.estrategiaImprimir = !window.estrategiaImprimir;
      construirTablaSecuencia(metodologia); // Reconstruir tabla completa
    });
  }

  // Inicializar textareas con autoajuste
  container.querySelectorAll('.auto-grow').forEach(textarea => {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });

  // --- SAVE CURRENT STATE before rebuilding table (if table exists) ---
  const prevTable = container.querySelector('#secuenciaTable');
  if (prevTable && secuenciaGuardada && secuenciaGuardada.length) {
    let rowIdx = 0;
    prevTable.querySelectorAll('tr').forEach((tr, idx) => {
      if (idx === 0) return; // skip header
      const row = secuenciaGuardada[rowIdx];
      const key = getRowKey(row, rowIdx);
      // Estrategia
      const select = tr.querySelector('select');
      if (select) {
        if (!window.secuenciaTableState[key]) window.secuenciaTableState[key] = {};
        window.secuenciaTableState[key].estrategia = select.value;
      }
      // Actividades
      const textarea = tr.querySelector('textarea');
      if (textarea) {
        if (!window.secuenciaTableState[key]) window.secuenciaTableState[key] = {};
        window.secuenciaTableState[key].actividades = textarea.value;
      }
      rowIdx++;
    });
    // --- Persist to localStorage ---
    try {
      localStorage.setItem('secuenciaTableState', JSON.stringify(window.secuenciaTableState));
    } catch (e) {}
  }

  // Restore Estrategia and Actividades values
  const table = container.querySelector('#secuenciaTable');
  if (table && secuenciaGuardada && secuenciaGuardada.length) {
    let rowIdx = 0;
    table.querySelectorAll('tr').forEach((tr, idx) => {
      if (idx === 0) return; // skip header
      const row = secuenciaGuardada[rowIdx];
      const key = getRowKey(row, rowIdx);
      // Estrategia
      if (!window.estrategiaOculta) {
        const select = tr.querySelector('select');
        if (select && window.secuenciaTableState[key] && typeof window.secuenciaTableState[key].estrategia !== 'undefined') {
          select.value = window.secuenciaTableState[key].estrategia;
          // Trigger the logic to enable/disable Actividades as if user selected
          actualizarMomento(select);
        }
        // Listen for changes
        if (select) {
          select.addEventListener('change', function() {
            if (!window.secuenciaTableState[key]) window.secuenciaTableState[key] = {};
            window.secuenciaTableState[key].estrategia = this.value;
            try { localStorage.setItem('secuenciaTableState', JSON.stringify(window.secuenciaTableState)); } catch (e) {}
            // Trigger the logic to enable/disable Actividades
            actualizarMomento(this);
          });
        }
      }
      // Actividades
      const textarea = tr.querySelector('textarea');
      // Always restore from state if present, never overwrite with default
      if (textarea && window.secuenciaTableState[key] && typeof window.secuenciaTableState[key].actividades !== 'undefined') {
        textarea.value = window.secuenciaTableState[key].actividades;
      }
      // Only update state on user input or ♻️
      if (textarea) {
        textarea.addEventListener('input', function() {
          if (!window.secuenciaTableState[key]) window.secuenciaTableState[key] = {};
          window.secuenciaTableState[key].actividades = this.value;
          try { localStorage.setItem('secuenciaTableState', JSON.stringify(window.secuenciaTableState)); } catch (e) {}
        });
      }
      rowIdx++;
    });
  }

  // --- IA: Integrar botón ♻️ en Momentos ---
  if (table) {
    table.querySelectorAll('tr').forEach(tr => {
      const momentoTd = tr.querySelector('td.momento');
      if (momentoTd) {
        const btn = momentoTd.querySelector('button');
        const textarea = momentoTd.querySelector('textarea');
        const estrategiaSelect = tr.querySelector('select');
        if (btn && textarea && estrategiaSelect) {
          btn.addEventListener('click', async function() {
            if (btn.disabled) return;
            btn.disabled = true;
            btn.textContent = '...';
            textarea.value = '';
            // Obtener datos de la fila actual
            const estrategia = estrategiaSelect.value;
            // Obtener datos de Ubicación Curricular
            let ubicacion = { problema: '', campos: '', contenidos: '', pda: '' };
            try {
              const ubicacionTable = document.getElementById('ubicacionTable');
              if (ubicacionTable) {
                const row = ubicacionTable.querySelector('tbody tr');
                if (row) {
                  const cells = row.querySelectorAll('td');
                  ubicacion.problema = cells[0]?.innerText.trim() || '';
                  ubicacion.campos = cells[1]?.innerText.trim() || '';
                  ubicacion.contenidos = cells[2]?.innerText.trim() || '';
                  ubicacion.pda = cells[3]?.innerText.trim() || '';
                }
              }
            } catch(e) {}
            // Filtrar y lematizar textos
            function filtrarYLematizar(texto) {
              const articulos = ["el", "la", "los", "las", "un", "una", "unos", "unas"];
              const preposiciones = [
                "a", "ante", "bajo", "cabe", "con", "contra", "de", "desde", "en", "entre", "hacia",
                "hasta", "para", "por", "según", "sin", "sobre", "tras"
              ];
              const pronombres = [
                "yo", "tú", "él", "ella", "nosotros", "nosotras", "vosotros", "ustedes", "ellos", "ellas",
                "me", "te", "se", "nos", "os", "lo", "la", "le", "les", "mi", "tu", "su", "nuestro", "vuestro"
              ];
              const auxiliaresYModales = [
                "ser", "soy", "eres", "es", "somos", "son", "fui", "fue", "eran",
                "estar", "estoy", "estás", "está", "estamos", "están", "estuvo",
                "haber", "he", "has", "ha", "hemos", "han", "había", "hubo",
                "tener", "tengo", "tiene", "tenía", "tuvo", "tenemos",
                "poder", "puedo", "puede", "pueden", "podía", "podemos",
                "deber", "debo", "debe", "deben", "debía",
                "soler", "suelo", "suele", "solían",
                "querer", "quiero", "quiere", "quieren", "quería",
                "necesitar", "necesito", "necesita", "necesitan"
              ];
              const lemas = {
                "cultivos": "cultivo",
                "ubicado": "ubicar",
                "ubicada": "ubicar",
                "tenemos": "tener",
                "necesitamos": "necesitar",
                "aprovechar": "aprovechamiento",
                "tiene": "tener",
                "faltan": "faltar",
                "falta": "faltar",
                "llueve": "llover",
                "lluvia": "precipitación",
                "precipitación": "precipitación",
                "agua": "agua",
                "comunidad": "comunidad",
                "sistema": "sistema",
                "tema": "tema",
                "problema": "problema",
                "manera": "modo",
                "forma": "modo",
                "eficiente": "eficiente",
                "eficiencia": "eficiente",
                "cultivos": "cultivo",
                "recursos": "recurso",
                "zonas": "zona",
                "lugares": "lugar",
                "región": "región",
                "anual": "anual"
              };
              const stopwords = new Set([
                ...articulos,
                ...preposiciones,
                ...pronombres,
                ...auxiliaresYModales
              ]);
              return texto
                .toLowerCase()
                .replace(/[.,;:()¿?!¡"]/g, "")
                .split(/\s+/)
                .filter(palabra => !stopwords.has(palabra))
                .map(palabra => lemas[palabra] || palabra)
                .join(" ");
            }
            // Construir prompt optimizado
            const prompt = `Eres experto en didáctica. Desarrolla los momentos para aplicar la estrategia seleccionada en la secuencia didáctica, indicando qué hacer y qué material recomendarías. Usa la información curricular y limita la respuesta a máximo 120 palabras. Formato: solo texto plano.\n\nEstrategia: ${filtrarYLematizar(estrategia)}\nProblema: ${filtrarYLematizar(ubicacion.problema).substring(0,120)}\nCampos: ${filtrarYLematizar(ubicacion.campos).substring(0,120)}\nContenidos: ${filtrarYLematizar(ubicacion.contenidos).substring(0,120)}\nPDA: ${filtrarYLematizar(ubicacion.pda).substring(0,120)}\n`;
            try {
              const res = await fetch('/api/ia/generatePlan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt, max_tokens: 400 })
              });
              if (!res.ok) throw new Error('Error IA: ' + res.statusText);
              const data = await res.json();
              if (typeof descontarCredito === 'function') descontarCredito();
              let txt = data.response || data.result || data.choices?.[0]?.text || JSON.stringify(data);
              textarea.value = txt.trim();
              textarea.style.height = 'auto';
              textarea.style.height = (textarea.scrollHeight) + 'px';
            } catch(e) {
              textarea.value = 'Error al generar momentos: ' + (e.message||e);
            }
            btn.textContent = '♻️';
            btn.disabled = false;
          });
        }
      }
    });
  }
}

// Helper to get unique key for each row
function getRowKey(row, idx) {
  // Use fase + etapa if present, otherwise fallback to idx
  let key = (row.fase||'') + '|' + (row.etapa||'');
  if (!row.fase && !row.etapa) key = 'row_' + idx;
  return key;
}

// Función para actualizar momentos clave
function actualizarMomento(selectElem) {
  const tr = selectElem.closest('tr');
  const momentoTd = tr.querySelector('td:last-child');
  
  if (momentoTd) {
    const momentosClaveDiv = momentoTd.querySelector('.momentos-clave');
    const textarea = momentoTd.querySelector('textarea');
    const btn = momentoTd.querySelector('button');
    const estrategia = selectElem.value;
    
    if (momentosClaveDiv) {
      momentosClaveDiv.textContent = momentosPorEstrategia[estrategia] || '';
    }
    
    if (textarea && btn) {
      const habilitar = estrategia && estrategia !== '';
      textarea.disabled = !habilitar;
      btn.disabled = !habilitar;
    }
  }
}

// Definición de momentos por estrategia
const momentosPorEstrategia = {
  'Taller de escritores': 'Planificación → Redacción → Revisión → Publicación.',
  'Lectura': 'Selección del texto → Lectura individual/grupal → Análisis → Reflexión.',
  'Entrevista': 'Preparación de preguntas → Realización → Registro → Análisis.',
  'Diálogo y conversación': 'Tema definido → Intercambio de ideas → Conclusiones.',
  'Exposición de temas': 'Investigación → Organización → Presentación → Retroalimentación.',
  'Discusión organizativa': 'Planteamiento del problema → Debate → Acuerdos.',
  'Diario de grupo y personal': 'Escritura regular → Reflexión → Compartir (opcional).',
  'Correspondencia escolar': 'Redacción → Intercambio → Respuesta → Socialización.',
  'Periódico mural': 'Elección de temas → Diseño → Elaboración → Exhibición.',
  'Planteamiento y resolución de problemas en seriación y algoritmos': 'Presentación del problema → Resolución paso a paso → Verificación.',
  'Planteamiento y resolución de problemas apoyándose del rincón de la tiendita': 'Simulación de compra-venta → Cálculos → Reflexión.',
  'Planteamiento y resolución de problemas utilizando el cálculo mental': 'Ejercicios rápidos → Estrategias → Competencias amistosas.',
  'Planteamiento y resolución de problemas en juegos matemáticos': 'Reglas del juego → Aplicación de operaciones → Ganador/Reflexión.',
  'Experimentos': 'Hipótesis → Materiales → Ejecución → Conclusiones.',
  'Consulta en materiales diversos': 'Pregunta clave → Búsqueda → Síntesis.',
  'Elaboración de maquetas y álbumes': 'Investigación → Diseño → Construcción → Explicación.',
  'Mapas conceptuales': 'Tema central → Relaciones → Diagrama.',
  'Cápsulas científicas': 'Investigación → Resumen → Presentación creativa.',
  'Diccionario científico': 'Selección de términos → Definición → Ejemplos.',
  'Recorridos y visitas': 'Planeación → Observación → Registro → Socialización.',
  'Línea del tiempo': 'Selección de eventos → Orden cronológico → Representación.',
  'Cartas a personajes del pasado': 'Investigación → Redacción → Compartir.',
  'Noticiero histórico': 'Guión → Roles → Grabación/representación.',
  'Escenificación y teatro guiñol': 'Argumento → Ensayo → Presentación.',
  'Historieta': 'Investigación → Guión gráfico → Dibujo.',
  'Mapas históricos': 'Contexto → Diseño → Análisis.',
  'Lectura de mapas': 'Identificación de elementos → Interpretación.',
  'Maquetas, dioramas y modelos': 'Investigación → Construcción → Exposición.',
  'Registro climático': 'Observación diaria → Gráficas → Conclusiones.',
  'Uso de gráficas': 'Recopilación de datos → Diseño → Análisis.',
  'Recorrido por la comunidad': 'Ruta → Observación → Reporte.',
  'Uso de la fotografía': 'Tema → Captura → Análisis.',
  'Uso de mapas y croquis': 'Dibujo → Orientación → Uso práctico.',
  'Juicio crítico a los medios': 'Análisis de mensaje → Discusión → Conclusiones.',
  'Juego de roles': 'Situación → Asignación de roles → Reflexión.',
  'Artículos de opinión': 'Tema polémico → Argumentación → Publicación.',
  'Debate': 'Tema → Posturas → Argumentos → Veredicto.',
  'Asamblea escolar': 'Problemática → Propuestas → Acuerdos.',
  'Dilemas morales': 'Caso → Discusión → Soluciones.',
  'Juego con reglas': 'Explicación → Ejecución → Evaluación.',
  'Juegos modificados': 'Adaptación de reglas → Práctica → Reflexión.',
  'Circuitos de acción motriz': 'Estaciones → Rotación → Mejora de habilidades.',
  'Actividades alternativas': 'Propuestas no tradicionales → Participación.',
  'Juegos naturales': 'Uso de entorno → Creatividad → Cooperación.',
  'Elaboración de títeres y máscaras': 'Diseño → Elaboración → Representación.',
  'Presentación de bailes y danzas': 'Selección musical → Coreografía → Presentación.',
  'Muestras y exposiciones': 'Creación → Curaduría → Exhibición.',
  'Apreciación y exploración musical': 'Audición → Análisis → Expresión.',
  'Escenificaciones': 'Guión → Ensayo → Puesta en escena.',
  '¿Cómo mirar el teatro?': 'Observación → Elementos técnicos → Crítica.',
  'Lectura de imagen': 'Análisis visual → Contexto → Interpretación.'
};