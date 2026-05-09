import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

document.addEventListener("DOMContentLoaded", () => {
  try {
    protegerSoloAdmin();
    aplicarPermisosVisuales();

    configurarBotonCerrarSesion("boton-cerrar-sesion");

    iniciarIndicadorSesion();
  } catch (error) {
    console.error("Error al cargar el dashboard:", error);
  } finally {
    finalizarCargaAdmin();
  }
});