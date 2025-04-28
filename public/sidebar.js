document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const logo = document.querySelector('.logo');
    const membershipBadge = document.getElementById('userMembership');
    
    // Crear botón de toggle
    const toggleButton = document.createElement('button');
    toggleButton.className = 'sidebar-toggle';
    toggleButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    sidebar.appendChild(toggleButton);
    
    // Manejar colapso/expansión
    toggleButton.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      
      // Cambiar icono del botón
      const isCollapsed = sidebar.classList.contains('collapsed');
      toggleButton.innerHTML = isCollapsed 
        ? '<i class="fas fa-chevron-right"></i>' 
        : '<i class="fas fa-chevron-left"></i>';
      
      // Guardar estado en localStorage
      localStorage.setItem('sidebarCollapsed', isCollapsed);
    });
    
    // Verificar estado inicial
    const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (wasCollapsed) {
      sidebar.classList.add('collapsed');
      toggleButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
  });