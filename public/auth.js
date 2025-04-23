document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la página de login/register
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMessage = document.getElementById('authMessage');
    
    // Si estamos en la página de login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Verificar si el usuario seleccionó premium pero no ha pagado
                    if (data.user.membership === 'basic' && 
                        data.user.originalMembership === 'premium') {
                        // Guardar token y redirigir
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        
                        // Mostrar popup de suscripción
                        setTimeout(() => {
                            window.location.href = 'dashboard.html?showPremiumPopup=true';
                        }, 100);
                    } else {
                        // Guardar token y redirigir normalmente
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('userData', JSON.stringify(data.user));
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    showAuthMessage(data.message, 'error');
                }
            } catch (error) {
                showAuthMessage('Error de conexión', 'error');
                console.error('Error:', error);
            }
        });
    }
    
    // Si estamos en la página de registro
    if (registerForm) {
        // Verificar disponibilidad de ID de Telegram en tiempo real
        const telegramIdInput = document.getElementById('telegramId');
        if (telegramIdInput) {
            telegramIdInput.addEventListener('blur', async () => {
                const telegramId = telegramIdInput.value;
                
                if (telegramId) {
                    try {
                        const response = await fetch('/api/auth/check-telegram-id', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ telegramId })
                        });
                        
                        const data = await response.json();
                        
                        if (!data.available) {
                            showAuthMessage('Este ID de Telegram ya está asociado a otra cuenta', 'error');
                        }
                    } catch (error) {
                        console.error('Error al verificar ID de Telegram:', error);
                    }
                }
            });
        }
    }
    
    // Si estamos en la página principal y hay botón de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            window.location.href = 'login.html';
        });
        
        // Mostrar información del usuario
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            document.getElementById('userEmail').textContent = userData.email;
            
            const membershipBadge = document.getElementById('userMembership');
            membershipBadge.textContent = userData.membership === 'premium' ? 'Premium' : 'Básico';
            membershipBadge.classList.add(userData.membership === 'premium' ? 'premium' : 'basic');
            
            // Mostrar popup de suscripción si es necesario
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('showPremiumPopup') && userData.membership === 'basic') {
                document.getElementById('premiumPopup').classList.remove('hidden');
            }
        }
    }
    
    // Proteger rutas - si no hay token, redirigir a login
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('register.html') && 
        !window.location.pathname.includes('plano-contextual.html') && 
        !localStorage.getItem('token')) {
        window.location.href = 'login.html';
    }
        
    function showAuthMessage(message, type) {
        if (!authMessage) return;
        
        authMessage.textContent = message;
        authMessage.classList.remove('hidden', 'success', 'error');
        authMessage.classList.add(type);
        
        setTimeout(() => {
            authMessage.classList.add('hidden');
        }, 5000);
    }
});