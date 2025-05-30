document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
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

    // Elementos del DOM
    const btnDescription = document.getElementById('btn-description');
    const toolsContainer = document.getElementById('tools-container');
    const popupOverlay = document.getElementById('popup-overlay');
    const btnClosePopup = document.getElementById('btn-close-popup');
    const topicForm = document.getElementById('topic-form');
    const tabsContainer = document.getElementById('tabs');
    const btnAddTab = document.getElementById('btn-add-tab');
    const tabContent = document.getElementById('tab-content');

    let currentCard = null;

    // Obtener datos del usuario
    const isPremium = userData && userData.membership === 'premium';
    const isAdmin = userData && userData.membership === 'admin';

    // Opciones de temas
    const topicOptions = [
        { value: "escasez_agua", label: "Escasez de agua" },
        { value: "contaminacion_aire", label: "Contaminación del aire" },
        { value: "basura_residuos", label: "Manejo de basura y residuos" },
        { value: "seguridad_alimentaria", label: "Seguridad alimentaria" },
        { value: "energia_renovable", label: "Autosuficiencia energética" },
        { value: "movilidad_transporte", label: "Movilidad y transporte" },
        { value: "violencia_comunitaria", label: "Violencia comunitaria" },
        { value: "salud_mental", label: "Salud mental" },
        { value: "educacion_calidad", label: "Educación de calidad" },
        { value: "empleo_jovenes", label: "Empleo juvenil" },
        { value: "espacios_publicos", label: "Espacios públicos deteriorados" },
        { value: "contaminacion_visual", label: "Contaminación visual" },
        { value: "conservacion_areas_verdes", label: "Conservación de áreas verdes" },
        { value: "consumo_responsable", label: "Consumo responsable" },
        { value: "tecnologia_comunidad", label: "Brecha tecnológica" },
        { value: "otros", label: "Otro (especificar)" }
    ];

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

    // Cargar tarjetas desde el servidor
    const loadCards = async () => {
        try {
            const res = await fetch('/api/plans', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!res.ok) {
                throw new Error('Error al cargar los planes');
            }
            
            const data = await res.json();
            
            if (data.success) {
                toolsContainer.innerHTML = ''; // Limpiar contenedor
                
                // Verificar si hay datos y son un array
                if (data.plans && Array.isArray(data.plans)) {
                    data.plans.forEach(plan => {
                        createCardElement(plan);
                    });
                }
            } else {
                console.error('Error en la respuesta del servidor:', data.message);
            }
        } catch (error) {
            console.error('Error al cargar planes:', error);
            // Mostrar mensaje de error al usuario si es necesario
        }
    };

    // Crear elemento de tarjeta en el DOM
    const createCardElement = (cardData) => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.id = cardData.id;
        
        const topicLabel = topicOptions.find(opt => opt.value === cardData.name)?.label || cardData.name;
        const displayName = cardData.otherTopic ? `${topicLabel}: ${cardData.otherTopic}` : topicLabel;
        
        card.innerHTML = `
            <h3>${displayName}</h3>
            <p>${cardData.description}</p>
            <button class="btn-edit">✏️</button>
            <button class="btn-delete">❌</button>
        `;
        
        card.querySelector('.btn-edit').addEventListener('click', () => {
            currentCard = card;
            openPopup(cardData);
        });

        card.querySelector('.btn-delete').addEventListener('click', async () => {
            if (confirm('¿Estás seguro de eliminar esta tarjeta?')) {
                try {
                    const res = await fetch(`/api/plans/${card.dataset.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    const data = await res.json();
                    
                    if (data.success) {
                        card.remove();
                    } else {
                        alert(data.message || 'Error al eliminar el plan');
                    }
                } catch (error) {
                    console.error('Error al eliminar plan:', error);
                    alert('Error al eliminar el plan');
                }
            }
        });

        toolsContainer.appendChild(card);
    };

    // Función para activar pestaña
    const activateTab = (tab, content) => {
        document.querySelectorAll('.tab, .tab-content-item').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        content.classList.add('active');
    };

    // Crear nueva pestaña con datos
    const createTabWithData = (situationData, index) => {
        const tabId = Date.now() + index;
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabId;
        tab.innerHTML = `
            Situación ${index + 1}
            <button class="btn-close-tab">×</button>
        `;

        const tabContentItem = document.createElement('div');
        tabContentItem.className = 'tab-content-item';
        tabContentItem.dataset.tabId = tabId;
        tabContentItem.innerHTML = `
            <div class="form-group">
                <label>Descripción de la Situación</label>
                <textarea>${situationData?.description || ''}</textarea>
            </div>
            <div class="problems-list">
                <div class="problem-buttons">
                    <button type="button" class="btn-add-problem">➕ Agregar Problema</button>
                    <button type="button" class="btn-generate-problems">♻️ Generar Problemas</button>
                </div>
                <ul>
                    ${(situationData?.problems || []).map(problem => `
                        <li>
                            <span>${problem}</span>
                            <div>
                                <button class="btn-edit-problem">✏️</button>
                                <button class="btn-delete-problem">🗑️</button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        // Event listeners para la pestaña
        tab.addEventListener('click', () => activateTab(tab, tabContentItem));
        
        // Botón cerrar pestaña
        tab.querySelector('.btn-close-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de eliminar esta situación?')) {
                tab.remove();
                tabContentItem.remove();
            }
        });

        // Configurar problemas
        tabContentItem.querySelectorAll('.btn-edit-problem').forEach(btn => {
            btn.addEventListener('click', () => {
                const problemItem = btn.closest('li');
                const span = problemItem.querySelector('span');
                const newText = prompt('Editar problema:', span.textContent);
                if (newText) span.textContent = newText;
            });
        });

        tabContentItem.querySelectorAll('.btn-delete-problem').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de eliminar este problema?')) {
                    btn.closest('li').remove();
                }
            });
        });

        // Botón agregar nuevo problema
        tabContentItem.querySelector('.btn-generate-problems').addEventListener('click', async () => {
            if (!isPremium) {
                alert('Debes ser Premium para usar esta funcionalidad');
                return;
            }
        
            const btn = tabContentItem.querySelector('.btn-generate-problems');
            const originalText = btn.textContent;
        
            try {
                // Obtener valores
                const topicName = document.getElementById('topic-name').value;
                const topicDescription = document.getElementById('topic-description').value;
                const situationDescription = tabContentItem.querySelector('textarea').value;
        
                // Validar campos
                if (!topicName || !situationDescription) {
                    throw new Error('Completa el nombre del tema y la descripción de la situación');
                }
        
                // Filtrar textos
                const filteredTopic = filtrarYLematizar(topicDescription || '');
                const filteredSituation = filtrarYLematizar(situationDescription);
        
                // Prompt optimizado
                const prompt = `Como experto en análisis, genera 3 problemas específicos y detallados con base en:
        Tema: ${topicName}
        Contexto: ${filteredTopic.substring(0, 200)}
        Situación: ${filteredSituation.substring(0, 200)}
        
        Formato:
        P1: <problema 1>
        P2: <problema 2>
        P3: <problema 3>
        
        Cada problema debe tener entre 10 y 25 palabras. Solo texto plano, sin comillas ni corchetes ni formato JSON.`;
        
                // Mostrar UI de carga
                btn.textContent = 'Generando...';
                btn.disabled = true;
        
                // Enviar solicitud a la IA
                const response = await fetch('/api/ia/generatePlan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: prompt,
                        max_tokens: 500
                    })
                });
        
                if (!response.ok) {
                    throw new Error(`Error en la API: ${response.statusText}`);
                }
        
                const data = await response.json();
                if (typeof descontarCredito === 'function') descontarCredito();
                let responseText = data.response || data.result || data.choices?.[0]?.text || JSON.stringify(data);
        
                // Limpiar y extraer problemas
                let problems = [];
                const regex = /P\d:\s*(.+)/gi;
                let match;
                while ((match = regex.exec(responseText)) !== null) {
                    problems.push(match[1].trim());
                }
        
                // Fallback si no encuentra P1: P2: etc., usa saltos de línea
                if (problems.length < 3) {
                    problems = responseText
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => line.replace(/^P\d:\s*/, '').trim())
                        .slice(0, 3);
                }
        
                // Asegurar array válido
                if (!Array.isArray(problems)) problems = [String(problems)];
        
                // Mostrar los problemas en la UI
                const ul = tabContentItem.querySelector('ul');
                
                // Limpiar solo los problemas existentes (no todo el contenido)
                const existingProblems = ul.querySelectorAll('li');
                existingProblems.forEach(problem => problem.remove());
                
                // Agregar nuevos problemas
                problems.forEach(p => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${p}</span>
                        <div>
                            <button class="btn-edit-problem">✏️</button>
                            <button class="btn-delete-problem">🗑️</button>
                        </div>
                    `;
                    ul.appendChild(li);
                    
                    // Agregar eventos para editar y eliminar
                    li.querySelector('.btn-edit-problem').addEventListener('click', () => {
                        const newText = prompt('Editar problema:', p);
                        if (newText) li.querySelector('span').textContent = newText;
                    });
                    
                    li.querySelector('.btn-delete-problem').addEventListener('click', () => {
                        if (confirm('¿Eliminar este problema?')) {
                            li.remove();
                        }
                    });
                });
        
            } catch (error) {
                console.error('Error completo:', error);
                alert(`Error: ${error.message || 'Ocurrió un error al generar problemas'}`);
            } finally {
                // Restaurar botón
                if (btn) {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }
            }
        });
        
        // Asegurar que el botón "Agregar Problema" mantiene su funcionalidad
        tabContentItem.querySelector('.btn-add-problem').addEventListener('click', () => {
            const problemText = prompt('Describe un nuevo problema:');
            if (problemText) {
                const ul = tabContentItem.querySelector('ul');
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${problemText}</span>
                    <div>
                        <button class="btn-edit-problem">✏️</button>
                        <button class="btn-delete-problem">🗑️</button>
                    </div>
                `;
                ul.appendChild(li);
                
                // Agregar eventos para editar y eliminar
                li.querySelector('.btn-edit-problem').addEventListener('click', () => {
                    const newText = prompt('Editar problema:', problemText);
                    if (newText) li.querySelector('span').textContent = newText;
                });
                
                li.querySelector('.btn-delete-problem').addEventListener('click', () => {
                    if (confirm('¿Eliminar este problema?')) {
                        li.remove();
                    }
                });
            }
        });

        tabsContainer.appendChild(tab);
        tabContent.appendChild(tabContentItem);
        if (index === 0) activateTab(tab, tabContentItem);
    };

    // Función de filtrado y lematización (proporcionada)
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
            // Verbos
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
            // Sustantivos comunes
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
            .replace(/[.,;:()¿?!¡"]/g, "") // eliminar puntuación
            .split(/\s+/)
            .filter(palabra => !stopwords.has(palabra)) // elimina palabras vacías
            .map(palabra => lemas[palabra] || palabra) // aplica lematización simple
            .join(" ");
    }

    // Limpiar popup
    const resetPopup = () => {
        topicForm.reset();
        tabsContainer.innerHTML = '';
        tabContent.innerHTML = '';
    };

    // Abrir popup con datos
    const openPopup = (cardData = null) => {
        resetPopup();
        popupOverlay.style.display = 'flex';

        // Manejar el select y el campo "otros"
        const topicSelect = document.getElementById('topic-name');
        const otherTopicInput = document.getElementById('other-topic');
        
        topicSelect.addEventListener('change', (e) => {
            if (e.target.value === 'otros') {
                otherTopicInput.classList.remove('hidden');
            } else {
                otherTopicInput.classList.add('hidden');
            }
        });

        if (cardData) {
            // Si es edición, establecer el valor correcto
            if (cardData.name) {
                const selectedOption = topicOptions.find(opt => opt.value === cardData.name);
                if (selectedOption) {
                    topicSelect.value = cardData.name;
                    if (cardData.name === 'otros' && cardData.otherTopic) {
                        otherTopicInput.value = cardData.otherTopic;
                        otherTopicInput.classList.remove('hidden');
                    }
                }
            }
            document.getElementById('topic-description').value = cardData.description;
            cardData.situations?.forEach((situation, index) => {
                createTabWithData(situation, index);
            });
        }
    };

    // Guardar en el servidor
    const savePlan = async () => {
        const topicSelect = document.getElementById('topic-name');
        const otherTopicInput = document.getElementById('other-topic');
        
        const formData = {
            id: currentCard?.dataset.id || Date.now().toString(),
            name: topicSelect.value,
            description: document.getElementById('topic-description').value,
            situations: []
        };

        if (topicSelect.value === 'otros') {
            formData.otherTopic = otherTopicInput.value;
        }

        // Recopilar datos de las pestañas
        document.querySelectorAll('.tab-content-item').forEach(tabContent => {
            formData.situations.push({
                description: tabContent.querySelector('textarea').value,
                problems: [...tabContent.querySelectorAll('li span')].map(span => span.textContent)
            });
        });

        try {
            const res = await fetch('/api/plans/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    planData: formData
                })
            });
            const data = await res.json();
            
            if (data.success) {
                if (currentCard) {
                    // Actualizar tarjeta existente
                    const topicLabel = topicOptions.find(opt => opt.value === formData.name)?.label || formData.name;
                    const displayName = formData.otherTopic ? `${topicLabel}: ${formData.otherTopic}` : topicLabel;
                    
                    currentCard.querySelector('h3').textContent = displayName;
                    currentCard.querySelector('p').textContent = formData.description;
                    currentCard.dataset.id = formData.id;
                } else {
                    // Crear nueva tarjeta
                    createCardElement(data.plan || formData);
                }
                
                popupOverlay.style.display = 'none';
                loadCards(); // Recargar tarjetas para asegurar sincronización
            } else {
                alert('Error al guardar el plan');
            }
        } catch (error) {
            console.error('Error al guardar plan:', error);
            alert('Error al guardar el plan');
        }
    };

    // Manejar submit del formulario
    topicForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePlan();
    });

    // Botón premium
    const btnPremium = document.querySelector('.btn-premium');
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

    // Event listeners
    btnAddTab.addEventListener('click', () => createTabWithData({}, tabsContainer.children.length));
    btnClosePopup.addEventListener('click', () => popupOverlay.style.display = 'none');
    btnDescription.addEventListener('click', () => {
        currentCard = null;
        openPopup();
    });

    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        });
    }

    // Verificar estado premium periódicamente
    async function checkPremiumStatus() {
        try {
            const res = await fetch('/api/users/check-premium', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await res.json();
            
            if (data.isPremium) {
                localStorage.setItem('userData', JSON.stringify(data.user));
                window.location.reload();
            }
        } catch (error) {
            console.error("Error al verificar el estado:", error);
        }
    }

    // Solo verificar si no es premium
    if (userData.membership !== 'premium') {
        setInterval(checkPremiumStatus, 10000);
    }

    // Inicializar - Cargar tarjetas inmediatamente
    loadCards();
});