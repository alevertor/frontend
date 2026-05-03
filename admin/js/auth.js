export function obtenerTokenAcceso() {
  return localStorage.getItem("token_acceso");
}

export function obtenerUsuarioActual() {
  try {
    return JSON.parse(localStorage.getItem("usuario_admin") || "{}");
  } catch {
    return {};
  }
}

export function obtenerRolUsuario() {
  const usuario = obtenerUsuarioActual();
  return localStorage.getItem("usuario_rol") || usuario.rol || "";
}

export function usuarioEsAdmin() {
  const usuario = obtenerUsuarioActual();
  const rol = obtenerRolUsuario();

  return rol === "admin" || usuario.es_superusuario === true;
}

export function usuarioEsVendedor() {
  return obtenerRolUsuario() === "vendedor";
}

export function limpiarSesion() {
  localStorage.removeItem("token_acceso");
  localStorage.removeItem("usuario_admin");
  localStorage.removeItem("usuario_rol");
  localStorage.removeItem("usuario_nombre");
  localStorage.removeItem("usuario_correo");
}

export function cerrarSesion() {
  limpiarSesion();
  window.location.href = "./login.html";
}

export function protegerPaginaAdmin() {
  const token = obtenerTokenAcceso();

  if (!token) {
    window.location.href = "./login.html";
    return false;
  }

  if (sesionEstaExpirada()) {
    cerrarSesion();
    return false;
  }

  return true;
}

export function protegerSoloAdmin() {
  if (!protegerPaginaAdmin()) {
    return false;
  }

  if (!usuarioEsAdmin()) {
    window.location.href = "./inventario.html";
    return false;
  }

  return true;
}

export function aplicarPermisosVisuales() {
  if (usuarioEsAdmin()) {
    finalizarCargaAdmin();
    return;
  }

  document.querySelectorAll("[data-solo-admin]").forEach((elemento) => {
    elemento.classList.add("d-none");
  });

  finalizarCargaAdmin();
}

export function finalizarCargaAdmin() {
  document.documentElement.classList.remove("admin-cargando");
}

export function configurarBotonCerrarSesion(idBoton = "btnCerrarSesion") {
  const boton = document.getElementById(idBoton);

  boton?.addEventListener("click", cerrarSesion);
}

export function obtenerPayloadToken() {
  const token = obtenerTokenAcceso();

  if (!token) {
    return null;
  }

  try {
    const partes = token.split(".");

    if (partes.length !== 3) {
      return null;
    }

    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((caracter) => {
          return `%${`00${caracter.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function obtenerSegundosRestantesSesion() {
  const payload = obtenerPayloadToken();

  if (!payload?.exp) {
    return null;
  }

  const ahoraSegundos = Math.floor(Date.now() / 1000);
  return Math.max(Number(payload.exp) - ahoraSegundos, 0);
}

export function sesionEstaExpirada() {
  const segundosRestantes = obtenerSegundosRestantesSesion();

  if (segundosRestantes === null) {
    return false;
  }

  return segundosRestantes <= 0;
}

export function formatearTiempoSesion(segundosTotales) {
  if (segundosTotales === null) {
    return "No disponible";
  }

  if (segundosTotales <= 0) {
    return "Expirada";
  }

  const horas = Math.floor(segundosTotales / 3600);
  const minutos = Math.floor((segundosTotales % 3600) / 60);

  if (horas > 0 && minutos > 0) {
    return `${horas} h ${minutos} min`;
  }

  if (horas > 0) {
    return `${horas} h`;
  }

  if (minutos > 0) {
    return `${minutos} min`;
  }

  return "Menos de 1 min";
}

export function actualizarInfoSesion(idContenedor = "infoSesionAdmin") {
  const contenedor = document.getElementById(idContenedor);

  if (!contenedor) {
    return;
  }

  const usuario = obtenerUsuarioActual();
  const nombre = usuario.nombre || localStorage.getItem("usuario_nombre") || "Usuario";
  const rol = obtenerRolUsuario() || "usuario";
  const segundosRestantes = obtenerSegundosRestantesSesion();

  if (segundosRestantes !== null && segundosRestantes <= 0) {
    cerrarSesion();
    return;
  }

  contenedor.innerHTML = `
    <div>Usuario: <strong>${escaparHtml(nombre)}</strong></div>
    <div>Rol: ${escaparHtml(rol)} · Expira en: ${escaparHtml(formatearTiempoSesion(segundosRestantes))}</div>
  `;
}

export function iniciarIndicadorSesion(idContenedor = "infoSesionAdmin") {
  actualizarInfoSesion(idContenedor);

  setInterval(() => {
    actualizarInfoSesion(idContenedor);
  }, 60000);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}