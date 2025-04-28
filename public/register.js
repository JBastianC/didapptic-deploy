document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Obtener valores del formulario
  const name = document.getElementById("name").value;
  const lastname = document.getElementById("lastname").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const membership = document.getElementById("membership").value;
  const telegramId = document.getElementById("telegramId").value;

  // Validar que las contraseñas coincidan
  if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
  }

  // Validar fortaleza de contraseña
  if (password.length < 8 || 
      !/[A-Z]/.test(password) || 
      !/[a-z]/.test(password) || 
      !/[0-9]/.test(password) || 
      !/[^A-Za-z0-9]/.test(password)) {
      alert("La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales");
      return;
  }

  try {
      const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json" 
          },
          body: JSON.stringify({ 
              name, 
              lastname, 
              email, 
              password, 
              membership,
              telegramId
          }),
      });

      const data = await response.json();
      
      if (response.ok) {
          // Guardar token temporalmente
          localStorage.setItem('tempToken', data.token);
          
          // Mostrar mensaje con instrucciones de Telegram
          alert(`Registro exitoso. Por favor envía el siguiente código a @DidappticBot en Telegram para verificar tu cuenta: ${data.verificationCode}`);
          
          // Redirigir a login después de 5 segundos
          setTimeout(() => {
              window.location.href = "login.html";
          }, 5000);
      } else {
          alert(data.message || "Error en el registro");
      }
  } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
  }
});