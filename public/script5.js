document.addEventListener('DOMContentLoaded', function() {
    // Extraer el token de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Verificar y actualizar la membresía
        verifyAndUpdateMembership(token);
    } else {
        // Redirigir si no hay token
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
});

function verifyAndUpdateMembership(token) {
    fetch('/api/users/verify-payment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al verificar el pago');
        }
        return response.json();
    })
    .then(data => {
        // Redirigir después de 3 segundos (tiempo para ver la animación)
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    })
    .catch(error => {
        console.error('Error:', error);
        // Redirigir incluso si hay error (pero mostrar mensaje)
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    });
}