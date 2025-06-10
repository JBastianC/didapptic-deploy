document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificación de autenticación
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Configuración inicial
    const membershipBadge = document.getElementById('userMembership');
    document.getElementById('userEmail').textContent = userData.email;
    membershipBadge.textContent = userData.membership === 'premium' ? 'Premium' : 'Básico';
    membershipBadge.classList.add(userData.membership === 'premium' ? 'premium' : 'basic');

    // 3. Menú de navegación
    const menuItems = [
        {
            icon: '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
            text: 'Inicio',
            href: 'dashboard.html'
        },
        {
            icon: '<path d="M13 10V3L4 14h7v7l9-11h-7z"/>',
            text: 'Herramientas de IA',
            href: 'herramientasAI.html'
        },
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
    ];

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

    // 4. Filtros de herramientas
    const filters = [
        "Inteligencia Artificial", "Planificador", "Generación de contenido", 
        "Comunicación", "Gamificación", "Corrección automática", 
        "Evaluaciones", "Accesibilidad"
    ];

    const filtersContainer = document.getElementById('filters-container');
    filters.forEach(filter => {
        const filterTag = document.createElement('div');
        filterTag.className = 'filter-tag';
        filterTag.textContent = filter;
        filtersContainer.appendChild(filterTag);
    });

    // 5. Herramientas disponibles
    const herramientas = [
        {
            nombre: 'Generador de Plan de clase',
            emoji: '📝',
            toolId: 'generadorPlanClase'
        },
        {
            nombre: 'Generador de Mapas Mentales',
            emoji: '🧠',
            toolId: 'generadorMapaMental'
        },
        {
            nombre: 'Generador de Gamificación',
            emoji: '🧩',
            toolId: 'generadorCrucigrama'
        },
        {
            nombre: 'Generador de Evaluación',
            emoji: '📊',
            toolId: 'generadorEvaluacion'
        },
        {
            nombre: 'Pizarra Virtual',
            emoji: '🖥️',
            toolId: 'pizarraVirtual'
        },
        {
            nombre: 'Biblioteca Babilonia',
            emoji: '🏛️',
            toolId: 'bibliotecaBabilonia'
        },
        {
            nombre: 'Internet Red Local',
            emoji: '🌐',
            toolId: 'internetRedLocal'
        },
        {
            nombre: 'Escáner de Tareas',
            emoji: '🖨️',
            toolId: 'escanerTareas'
        }
    ];

    // 6. Generar herramientas en el grid
    const toolsContainer = document.getElementById('tools-container');
    herramientas.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.dataset.tool = tool.toolId;
        toolCard.innerHTML = `
            <span class="tool-emoji">${tool.emoji}</span>
            <p>${tool.nombre}</p>
        `;
        toolsContainer.appendChild(toolCard);
    });

    // 7. Configuración del Generador de Plan de Clase
    const planClasePopup = document.getElementById('planClasePopup');
    const closePlanClase = document.getElementById('closePlanClase');
    const planClaseForm = document.getElementById('planClaseForm');
    const resultadoPlan = document.getElementById('resultadoPlan');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // Abrir popup al hacer clic en la herramienta
    document.addEventListener('click', (e) => {
        const toolCard = e.target.closest('[data-tool="generadorPlanClase"]');
        if (toolCard) {
            planClasePopup.classList.remove('hidden');
        }
    });

    // Cerrar popup
    closePlanClase.addEventListener('click', () => {
        planClasePopup.classList.add('hidden');
    });

    // Generar plan de clase
// ---
// Función para actualizar créditos en la UI usando el sistema API
async function actualizarCreditosUI() {
    if (window.getCreditosUsuario && window.actualizarCreditosScore) {
        try {
            const creditos = await getCreditosUsuario();
            window.actualizarCreditosScore(creditos);
        } catch (e) {
            const scoreDiv = document.getElementById('creditos-score');
            if (scoreDiv) scoreDiv.textContent = 'Créditos: ?';
        }
    }
}
// ---
    planClaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (userData.membership !== 'premium') {
            alert('Necesitas una suscripción Premium para usar esta herramienta');
            return;
        }

        const nivel = document.getElementById('nivel').value;
        const materia = document.getElementById('materia').value;
        const temaInput = document.getElementById('tema').value.trim();
        const duracion = document.getElementById('duracion').value;
        const objetivos = document.getElementById('objetivos').value;
        // Nuevo: grado
        let grado = '';
        if (!document.getElementById('grado')) {
            // Crear select dinámico si no existe
            const gradoGroup = document.createElement('div');
            gradoGroup.className = 'form-group';
            gradoGroup.innerHTML = `<label for="grado">Grado</label><select id="grado" required style="margin-left:8px;">${[...Array(6).keys()].map(i => `<option value='${i+1}ro'>${i+1}ro</option>`).join('')}</select>`;
            document.querySelector('#planClaseForm .form-row').appendChild(gradoGroup);
        }
        grado = document.getElementById('grado') ? document.getElementById('grado').value : '1ro';

        // Sugerencias de temas comunes por materia
        const temasSugeridos = {
            'Matemáticas': 'Números, Operaciones básicas, Geometría, Fracciones, Álgebra, Estadística',
            'Ciencias': 'El ciclo del agua, Estados de la materia, Energía, Ecosistemas, Sistema solar',
            'Lenguaje': 'Comprensión lectora, Gramática, Redacción, Literatura, Ortografía',
            'Sociales': 'Historia local, Geografía, Ciudadanía, Cultura, Derechos humanos',
            'Artes': 'Colores primarios, Dibujo, Música, Teatro, Expresión corporal',
            'Tecnología': 'Herramientas digitales, Robótica, Internet seguro, Programación básica',
        };
        // Si el campo tema está vacío, asignar uno sugerido
        let tema = temaInput;
        if (!tema) {
            tema = (temasSugeridos[materia]||'').split(',')[0] || 'Tema general';
        }

        // Lematización simple (simulada)
        function lematizar(texto) {
            return texto.toLowerCase().replace(/(es|as|os|is|s)\b/g, '');
        }
        const nivelLem = lematizar(nivel);
        const materiaLem = lematizar(materia);
        const temaLem = lematizar(tema);
        const objetivosLem = lematizar(objetivos);
        const gradoLem = lematizar(grado);


        resultadoPlan.textContent = "Generando plan de clase...";
        exportPdfBtn.disabled = true;

        try {
            // Prompt optimizado y extenso
            const prompt = `Plan de clase extenso, funcional y profesional.
Nivel: ${nivelLem}
Grado: ${gradoLem}
Materia: ${materiaLem}
Tema: ${temaLem}
Duración: ${duracion} minutos.
Objetivos: ${objetivosLem}.

Estructura requerida:
- Título claro y atractivo.
- Objetivos de aprendizaje (detallados y medibles).
- Introducción motivacional.
- Explicación conceptual profunda y ejemplos prácticos.
- Actividades diferenciadas y colaborativas (inicio, desarrollo, cierre).
- Recursos didácticos y materiales sugeridos.
- Estrategias de inclusión y atención a la diversidad.
- Evaluación formativa y sumativa (rúbricas, instrumentos, criterios).
- Recomendaciones didácticas y posibles adaptaciones.
- Conclusión y sugerencias para el docente.

Explica cada sección con claridad y profundidad, usando lenguaje profesional docente. No incluyas introducción general ni despedidas. Usa formato de lista o secciones claras. Sé muy detallado, extenso y evita redundancias. Responde solo el plan, sin texto adicional. Usa máximo de tokens posibles en la respuesta, pero optimiza el prompt para que la entrada sea compacta y semánticamente rica.`;

            const response = await fetch('/api/ia/generatePlan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    prompt: prompt,
                    max_tokens: 600,
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error('Error en la API');

            const data = await response.json();
            // Descontar crédito (nuevo sistema API)
            if (window.isPremiumUser && isPremiumUser() && window.descontarCreditoUsuario) {
                const creditosRestantes = await descontarCreditoUsuario();
                if (typeof actualizarCreditosUI === 'function') await actualizarCreditosUI();
                if (creditosRestantes <= 0) {
                    resultadoPlan.textContent = '❌ No tienes créditos suficientes para usar la IA.';
                    exportPdfBtn.disabled = true;
                    return;
                }
            }
            resultadoPlan.textContent = data.response || data.choices?.[0]?.text;
            exportPdfBtn.disabled = false;

        } catch (error) {
            console.error('Error:', error);
            resultadoPlan.textContent = `Error: ${error.message}`;
            exportPdfBtn.disabled = true;
        }
    });

    // Exportar a PDF
    exportPdfBtn.addEventListener('click', () => {
        if (!resultadoPlan.innerText.trim() || resultadoPlan.innerText.includes("Generando") || 
            resultadoPlan.innerText.includes("Error")) {
            alert('Genera primero un plan de clase válido');
            return;
        }

        const materia = document.getElementById('materia').value;
        const tema = document.getElementById('tema').value;

        const opt = {
            margin: 0.5,
            filename: `Plan_Clase_${materia}_${tema.substring(0, 15)}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        const content = `
        <div style="font-family: Arial, sans-serif; padding:20px; max-width:600px; margin:0 auto;">
            <h2 style="color:#1e293b; text-align:center; border-bottom:2px solid #3b82f6; padding-bottom:10px;">
                Plan de Clase - ${materia}
            </h2>
            <div style="margin-top:20px;">
                <p><strong>Tema:</strong> ${tema}</p>
                <p><strong>Duración:</strong> ${document.getElementById('duracion').value} minutos</p>
            </div>
            <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-top:15px; border-left:4px solid #3b82f6;">
                <pre style="white-space:pre-wrap; font-family:inherit; line-height:1.5; color:#334155;">
${resultadoPlan.innerText}
                </pre>
            </div>
            <div style="text-align:right; margin-top:20px; font-size:0.8em; color:#64748b;">
                Generado con DidAppTic - ${new Date().toLocaleDateString()}
            </div>
        </div>`;

        html2pdf().set(opt).from(content).save();
    });

    // 8. Sistema de membresía premium
    const btnPremium = document.querySelector('.btn-premium');
    const premiumPopup = document.getElementById('premiumPopup');
    const closePremiumPopup = document.querySelector('.close-popup');
    const statusMessage = document.getElementById('premiumStatusMessage');

    btnPremium.addEventListener('click', () => {
        if (userData.membership !== 'premium') {
            premiumPopup.classList.remove('hidden');
        } else {
            statusMessage.textContent = "✅ ¡Ya eres usuario Premium!";
            statusMessage.classList.remove('hidden', 'error');
            statusMessage.classList.add('success');
            setTimeout(() => statusMessage.classList.add('hidden'), 3000);
        }
    });

    closePremiumPopup.addEventListener('click', () => {
        premiumPopup.classList.add('hidden');
    });

    // 9. Verificación periódica de estado premium
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

    if (userData.membership !== 'premium') {
        setInterval(checkPremiumStatus, 10000);
    }

    // 10. Cerrar sesión
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    });
});