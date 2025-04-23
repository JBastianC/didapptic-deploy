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

    // Datos del menú con enlaces
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

    // Datos de filtros
    const filters = [
        "Inteligencia Artificial", "Planificador", "Generación de contenido", 
        "Comunicación", "Gamificación", "Corrección automática", 
        "Evaluaciones", "Accesibilidad"
    ];

    // Generar filtros
    const filtersContainer = document.getElementById('filters-container');
    filters.forEach(filter => {
        const filterTag = document.createElement('div');
        filterTag.className = 'filter-tag';
        filterTag.textContent = filter;
        filtersContainer.appendChild(filterTag);
    });

    // Datos herramientas
    const herramientas = [
        {
            nombre: 'Generador de Plan de clase',
            url: 'generadorPlanClase.html',
            emoji: '📝'
        },
        {
            nombre: 'Generador de Mapas Mentales',
            url: 'generadorMapaMental.html',
            emoji: '🧠'
        },
        {
            nombre: 'Generador de Gamificación',
            url: 'generadorCrucigrama.html',
            emoji: '🧩'
        },
        {
            nombre: 'Generador de Evaluación',
            url: 'generadorEvaluacion.html',
            emoji: '📊'
        },
        {
            nombre: 'Pizarra Virtual',
            url: 'pizarraVirtual.html',
            emoji: '🖥️'
        },
        {
            nombre: 'Biblioteca Babilonia',
            url: 'bibliotecaBabilonia.html',
            emoji: '🏛️'
        },
        {
            nombre: 'Internet Red Local',
            url: 'internetRedLocal.html',
            emoji: '🌐'
        },
        {
            nombre: 'Escáner de Tareas',
            url: 'escanerTareas.html',
            emoji: '🖨️'
        }
    ];

    // Generar herramientas
    const toolsContainer = document.getElementById('tools-container');
    herramientas.forEach(tool => {
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.innerHTML = `
            <span class="tool-emoji">${tool.emoji}</span>
            <p>${tool.nombre}</p>
        `;
        toolsContainer.appendChild(toolCard);

        toolCard.addEventListener('click', () => {
            if (tool.url) {
                window.location.href = tool.url;
            }
        });
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
});