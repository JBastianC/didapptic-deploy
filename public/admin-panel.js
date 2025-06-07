document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación y privilegios
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || userData.email !== 'admin@didapptic.com') {
        window.location.href = 'login.html';
        return;
    }

    // Mostrar información del admin
    document.getElementById('admin-email').textContent = userData.email;

    // Elementos del DOM
    const usersTableBody = document.getElementById('users-table-body');
    const refreshBtn = document.getElementById('refreshUsers');
    const searchInput = document.getElementById('user-search');
    const searchBtn = document.getElementById('search-btn');
    const logoutBtn = document.getElementById('admin-logout');
    const modal = document.getElementById('user-details-modal');
    const closeModal = document.querySelector('.close-modal');
    const userDetailsContent = document.getElementById('user-details-content');
    const totalUsersElement = document.getElementById('total-users');
    const premiumUsersElement = document.getElementById('premium-users');
    const basicUsersElement = document.getElementById('basic-users');

    // Control de inactividad
    let inactivityTimer;
    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        }, 15 * 60 * 1000); // 15 minutos
    };

    // Eventos para resetear el temporizador
    ['mousemove', 'keypress', 'click'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });
    resetInactivityTimer();

    // Cargar usuarios
    const loadUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                renderUsers(data.users);
                updateStats(data.users);
            } else {
                console.error('Error al cargar usuarios:', data.message);
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    };

    // Actualizar estadísticas
    const updateStats = (users) => {
        const totalUsers = users.length;
        const premiumUsers = users.filter(user => user.membership === 'premium').length;
        const basicUsers = totalUsers - premiumUsers;

        totalUsersElement.textContent = totalUsers;
        premiumUsersElement.textContent = premiumUsers;
        basicUsersElement.textContent = basicUsers;
    };

    // Renderizar usuarios en la tabla
    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <button class="action-btn btn-view" data-id="${user.id}">Ver</button>
                    <button class="action-btn btn-delete" data-id="${user.id}">Eliminar</button>
                    <button class="action-btn btn-reset" data-id="${user.id}">Resetear</button>
                    <select class="membership-select" data-id="${user.id}">
                        <option value="basic" ${user.membership === 'basic' ? 'selected' : ''}>Básico</option>
                        <option value="premium" ${user.membership === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn btn-email" data-email="${user.email}" data-name="${user.name} ${user.lastname}">Notificar</button>
                </td>
                <td>${user.email}</td>
                <td><span class="membership-badge ${user.membership}">${user.membership}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  ${user.membership === 'premium' ? `
                    <input type="number" min="0" class="creditos-input" value="${typeof user.creditos === 'number' ? user.creditos : 100}" data-id="${user.id}" style="width:60px;">
                    <button class="guardar-creditos-btn" data-id="${user.id}">Guardar</button>
                  ` : '-'}
                </td>
            `;
            
            usersTableBody.appendChild(row);
        });
        
        // Agregar event listeners
        addEventListeners();
        addCreditSaveListeners();
    };

    // Listeners para guardar créditos
    const addCreditSaveListeners = () => {
        document.querySelectorAll('.guardar-creditos-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.id;
                const input = document.querySelector(`.creditos-input[data-id='${userId}']`);
                const credits = parseInt(input.value, 10);
                if (isNaN(credits) || credits < 0) {
                    alert('El valor de créditos debe ser un número no negativo.');
                    return;
                }
                try {
                    const res = await fetch('/api/admin/update-credits', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ userId, credits })
                    });
                    const data = await res.json();
                    if (data.success) {
                        alert('Créditos actualizados correctamente');
                        loadUsers();
                    } else {
                        alert('Error al actualizar créditos: ' + data.message);
                    }
                } catch (error) {
                    alert('Error al actualizar créditos');
                }
            });
        });
    };


    // Agregar event listeners a los elementos
    const addEventListeners = () => {
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', () => showUserDetails(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
        
        document.querySelectorAll('.btn-reset').forEach(btn => {
            btn.addEventListener('click', () => resetUserData(btn.dataset.id));
        });
        
        document.querySelectorAll('.membership-select').forEach(select => {
            select.addEventListener('change', (e) => updateMembership(e.target.dataset.id, e.target.value));
        });

        // Botón para abrir el modal de enviar correo
        document.querySelectorAll('.btn-email').forEach(btn => {
            btn.addEventListener('click', () => {
                const email = btn.getAttribute('data-email');
                const name = btn.getAttribute('data-name');
                document.getElementById('email-to').value = email;
                document.getElementById('email-subject').value = '';
                document.getElementById('email-message').value = '';
                document.getElementById('send-email-modal').style.display = 'flex';
            });
        });
    };

    // Cerrar modal de correo
    document.querySelector('.close-email-modal').addEventListener('click', () => {
        document.getElementById('send-email-modal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('send-email-modal')) {
            document.getElementById('send-email-modal').style.display = 'none';
        }
    });

    // Enviar correo
    document.getElementById('send-email-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const to = document.getElementById('email-to').value;
        const subject = document.getElementById('email-subject').value;
        const message = document.getElementById('email-message').value;
        try {
            const res = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ to, subject, message })
            });
            const data = await res.json();
            if (data.success) {
                alert('Correo enviado correctamente');
                document.getElementById('send-email-modal').style.display = 'none';
            } else {
                alert('Error al enviar correo: ' + data.message);
            }
        } catch (error) {
            alert('Error al enviar correo');
        }
    });

    // Actualizar membresía de usuario
    const updateMembership = async (userId, membership) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/membership`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ membership })
            });
            
            const data = await res.json();
            
            if (data.success) {
                loadUsers(); // Recargar lista de usuarios
            } else {
                alert('Error al actualizar membresía: ' + data.message);
            }
        } catch (error) {
            console.error('Error al actualizar membresía:', error);
            alert('Error al actualizar membresía');
        }
    };

    // Buscar usuarios
    const searchUsers = async () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        try {
            const res = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                const filteredUsers = data.users.filter(user => 
                    user.name.toLowerCase().includes(searchTerm) || 
                    user.lastname.toLowerCase().includes(searchTerm) || 
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.id.includes(searchTerm)
                );
                
                renderUsers(filteredUsers);
                updateStats(filteredUsers);
            }
        } catch (error) {
            console.error('Error al buscar usuarios:', error);
        }
    };

    // Eliminar usuario
    const deleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                alert('Usuario eliminado exitosamente');
                loadUsers();
            } else {
                alert('Error al eliminar usuario: ' + data.message);
            }
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            alert('Error al eliminar usuario');
        }
    };

    // Resetear datos de usuario
    const resetUserData = async (userId) => {
        if (!confirm('¿Estás seguro de resetear los datos de este usuario? Se eliminarán todos sus planes.')) {
            return;
        }
        
        try {
            const res = await fetch(`/api/admin/users/${userId}/reset`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                alert('Datos del usuario reseteados exitosamente');
            } else {
                alert('Error al resetear datos: ' + data.message);
            }
        } catch (error) {
            console.error('Error al resetear datos de usuario:', error);
            alert('Error al resetear datos de usuario');
        }
    };

    // Mostrar detalles del usuario
    const showUserDetails = async (userId) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            
            if (data.success) {
                const user = data.user;
                userDetailsContent.innerHTML = `
                    <div class="user-detail">
                        <label>ID</label>
                        <p>${user.id}</p>
                    </div>
                    <div class="user-detail">
                        <label>Nombre Completo</label>
                        <p>${user.name} ${user.lastname}</p>
                    </div>
                    <div class="user-detail">
                        <label>Email</label>
                        <p>${user.email}</p>
                    </div>
                    <div class="user-detail">
                        <label>Membresía</label>
                        <p>${user.membership}</p>
                    </div>
                    <div class="user-detail">
                        <label>Fecha de Registro</label>
                        <p>${new Date(user.createdAt).toLocaleString()}</p>
                    </div>
                    ${user.subscriptionEnd ? `
                    <div class="user-detail">
                        <label>Membresía Premium hasta</label>
                        <p>${new Date(user.subscriptionEnd).toLocaleString()}</p>
                    </div>
                    ` : ''}
                    <div class="user-actions">
                        <h3>Cambiar Membresía</h3>
                        <select id="modal-membership-select">
                            <option value="basic" ${user.membership === 'basic' ? 'selected' : ''}>Básico</option>
                            <option value="premium" ${user.membership === 'premium' ? 'selected' : ''}>Premium</option>
                        </select>
                        <button id="save-membership-btn" class="btn-save">Guardar Cambios</button>
                    </div>
                `;
                
                // Event listener para el botón de guardar en el modal
                document.getElementById('save-membership-btn').addEventListener('click', () => {
                    const newMembership = document.getElementById('modal-membership-select').value;
                    updateMembership(userId, newMembership);
                    modal.style.display = 'none';
                });
                
                modal.style.display = 'flex';
            } else {
                alert('Error al cargar detalles: ' + data.message);
            }
        } catch (error) {
            console.error('Error al cargar detalles del usuario:', error);
            alert('Error al cargar detalles del usuario');
        }
    };

    // Event listeners
    refreshBtn.addEventListener('click', loadUsers);
    searchBtn.addEventListener('click', searchUsers);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') searchUsers();
    });
    
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    });

    // Inicializar
    loadUsers();
});