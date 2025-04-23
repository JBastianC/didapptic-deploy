document.addEventListener('DOMContentLoaded', async () => {
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
    membershipBadge.className = userData.membership === 'premium' ? 'membership-badge premium' : 'membership-badge basic';

    // Configurar logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    });

    // Elementos del formulario
    const form = document.getElementById('config-form');
    const nivelEducativo = document.getElementById('nivelEducativo');
    const fase = document.getElementById('fase');
    const grado = document.getElementById('grado');
    const grupo = document.getElementById('grupo');
    const imagenColegio = document.getElementById('imagenColegio');
    const previewImage = document.getElementById('previewImage');
    const noImageText = document.getElementById('noImageText');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const imagePreview = document.getElementById('imagePreview');

    // Variables de estado
    let currentImage = null;

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

    // Cargar configuración del servidor
    async function loadConfig() {
        try {
            const response = await fetch('/api/config', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Error al cargar configuración');
            
            const data = await response.json();
            
            if (data.success && data.config) {
                // Rellenar campos del formulario
                Object.keys(data.config).forEach(key => {
                    const input = document.getElementById(key);
                    if (input) input.value = data.config[key];
                });

                // Manejar imagen
                if (data.config.imagenColegio) {
                    currentImage = data.config.imagenColegio;
                    previewImage.src = `data:image/jpeg;base64,${data.config.imagenColegio}`;
                    previewImage.style.display = 'block';
                    noImageText.style.display = 'none';
                    removeImageBtn.disabled = false;
                    imagePreview.classList.add('has-image');
                }

                // Actualizar opciones
                updateOptions();
                if (data.config.fase) fase.value = data.config.fase;
                if (data.config.grado) grado.value = data.config.grado;
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
            showNotification('Error al cargar configuración', 'error');
        }
    }

    // Actualizar opciones de fase y grado
    function updateOptions() {
        fase.innerHTML = '<option value="">Seleccione...</option>';
        grado.innerHTML = '<option value="">Seleccione...</option>';

        if (nivelEducativo.value === 'Primaria') {
            ['Fase 1', 'Fase 2'].forEach(f => {
                const option = document.createElement('option');
                option.value = f;
                option.textContent = f;
                fase.appendChild(option);
            });

            ['1ro', '2do', '3ro', '4to', '5to', '6to'].forEach(g => {
                const option = document.createElement('option');
                option.value = g;
                option.textContent = g;
                grado.appendChild(option);
            });
        } else if (nivelEducativo.value === 'Secundaria') {
            ['Fase 3'].forEach(f => {
                const option = document.createElement('option');
                option.value = f;
                option.textContent = f;
                fase.appendChild(option);
            });

            ['1ro', '2do', '3ro'].forEach(g => {
                const option = document.createElement('option');
                option.value = g;
                option.textContent = g;
                grado.appendChild(option);
            });
        }
    }

    // Manejar selección de imagen
    imagenColegio.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImage.src = event.target.result;
                previewImage.style.display = 'block';
                noImageText.style.display = 'none';
                removeImageBtn.disabled = false;
                imagePreview.classList.add('has-image');
                currentImage = event.target.result.split(',')[1]; // Guardar solo base64
            };
            reader.readAsDataURL(file);
        }
    });

    // Eliminar imagen
    removeImageBtn.addEventListener('click', function() {
        previewImage.src = '';
        previewImage.style.display = 'none';
        noImageText.style.display = 'block';
        removeImageBtn.disabled = true;
        imagePreview.classList.remove('has-image');
        currentImage = null;
        imagenColegio.value = '';
    });

    // Guardar configuración
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const config = {
            nivelEducativo: nivelEducativo.value,
            centroTrabajo: document.getElementById('centroTrabajo').value,
            zonaEscolar: document.getElementById('zonaEscolar').value,
            sectorEducativo: document.getElementById('sectorEducativo').value,
            fase: fase.value,
            grado: grado.value,
            grupo: grupo.value,
            nombreDocente: document.getElementById('nombreDocente').value,
            nombreDirector: document.getElementById('nombreDirector').value,
            inicioPeriodo: document.getElementById('inicioPeriodo').value,
            finPeriodo: document.getElementById('finPeriodo').value,
            imagenColegio: currentImage
        };

        try {
            const response = await fetch('/api/config/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ config })
            });

            const result = await response.json();
            
            if (result.success) {
                showNotification('Configuración guardada correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error al guardar configuración');
            }
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            showNotification(error.message, 'error');
        }
    });

    // Mostrar notificación
    function showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Inicializar
    nivelEducativo.addEventListener('change', updateOptions);
    updateOptions();
    loadConfig();
});