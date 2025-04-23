async function loadUserData() {
    const token = localStorage.getItem("sessionToken");
    const res = await fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
  
    if (!data.success) return (window.location.href = "/dashboard.html");
  
    document.getElementById("userWelcome").textContent = data.username;
    document.getElementById("membership").textContent = data.membership;
  
    const tools = data.membership === "premium"
      ? ["Generador de Reportes", "Análisis Avanzado", "Exportar PDF"]
      : ["Generador de Reportes"];
  
    const toolList = document.getElementById("toolList");
    toolList.innerHTML = "";
    tools.forEach((tool) => {
      const li = document.createElement("li");
      li.textContent = tool;
      toolList.appendChild(li);
    });
  
    document.getElementById("savedData").value = data.savedData || "";
  }
  
  function logout() {
    localStorage.removeItem("sessionToken");
    window.location.href = "/dashboard.html";
  }
  
  async function saveData() {
    const token = localStorage.getItem("sessionToken");
    const value = document.getElementById("savedData").value;
  
    await fetch("/api/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value }),
    });
  
    alert("Datos guardados");
  }
  
  loadUserData();
  