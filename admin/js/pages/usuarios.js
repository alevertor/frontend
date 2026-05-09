import {
  obtenerUsuariosAdmin,
  crearUsuarioAdmin,
  actualizarUsuarioAdmin,
  activarUsuarioAdmin,
  desactivarUsuarioAdmin,
  cambiarPasswordUsuarioAdmin,
} from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

let usuariosOriginales = [];
let usuarioEditando = null;
let modalUsuario = null;
let modalPasswordUsuario = null;

const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
const btnRecargarUsuarios = document.getElementById("btnRecargarUsuarios");

const formFiltrosUsuarios = document.getElementById("formFiltrosUsuarios");
const busquedaUsuario = document.getElementById("busquedaUsuario");
const filtroRolUsuario = document.getElementById("filtroRolUsuario");
const filtroEstadoUsuario = document.getElementById("filtroEstadoUsuario");

const cuerpoTablaUsuarios = document.getElementById("cuerpoTablaUsuarios");
const textoCantidadUsuarios = document.getElementById("textoCantidadUsuarios");
const contenedorAlertaUsuarios = document.getElementById("contenedorAlertaUsuarios");

const modalUsuarioElemento = document.getElementById("modalUsuario");

const formUsuario = document.getElementById("formUsuario");
const tituloModalUsuario = document.getElementById("tituloModalUsuario");
const usuarioId = document.getElementById("usuarioId");
const usuarioNombre = document.getElementById("usuarioNombre");
const usuarioCorreo = document.getElementById("usuarioCorreo");
const grupoPasswordUsuario = document.getElementById("grupoPasswordUsuario");
const usuarioPassword = document.getElementById("usuarioPassword");
const usuarioRol = document.getElementById("usuarioRol");
const usuarioActivo = document.getElementById("usuarioActivo");
const usuarioSuperusuario = document.getElementById("usuarioSuperusuario");
const btnGuardarUsuario = document.getElementById("btnGuardarUsuario");

const modalPasswordUsuarioElemento = document.getElementById("modalPasswordUsuario");

const formPasswordUsuario = document.getElementById("formPasswordUsuario");
const textoUsuarioPassword = document.getElementById("textoUsuarioPassword");
const passwordUsuarioId = document.getElementById("passwordUsuarioId");
const nuevaPasswordUsuario = document.getElementById("nuevaPasswordUsuario");
const btnGuardarPasswordUsuario = document.getElementById("btnGuardarPasswordUsuario");

const contenedorToast = document.getElementById("contenedorToast");

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  if (!protegerSoloAdmin()) {
    finalizarCargaAdmin();
    return;
  }

  try {
    aplicarPermisosVisuales();
    configurarBotonCerrarSesion();
    iniciarIndicadorSesion();

    inicializarModales();
    registrarEventos();

    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar la página de usuarios.", "danger");
  } finally {
    finalizarCargaAdmin();
  }
}

function inicializarModales() {
  if (modalUsuarioElemento && window.bootstrap) {
    modalUsuario = new bootstrap.Modal(modalUsuarioElemento);
  }

  if (modalPasswordUsuarioElemento && window.bootstrap) {
    modalPasswordUsuario = new bootstrap.Modal(modalPasswordUsuarioElemento);
  }
}

function registrarEventos() {
  btnNuevoUsuario?.addEventListener("click", abrirModalNuevoUsuario);
  btnRecargarUsuarios?.addEventListener("click", cargarUsuarios);

  formFiltrosUsuarios?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    renderizarUsuarios();
  });

  [busquedaUsuario, filtroRolUsuario, filtroEstadoUsuario].forEach((campo) => {
    campo?.addEventListener("input", renderizarUsuarios);
    campo?.addEventListener("change", renderizarUsuarios);
  });

  formUsuario?.addEventListener("submit", guardarUsuario);
  formPasswordUsuario?.addEventListener("submit", guardarPasswordUsuario);

  cuerpoTablaUsuarios?.addEventListener("click", manejarAccionesTabla);
}

async function cargarUsuarios() {
  try {
    limpiarAlerta();

    cuerpoTablaUsuarios.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4">
          Cargando usuarios...
        </td>
      </tr>
    `;

    textoCantidadUsuarios.textContent = "Cargando usuarios...";

    const respuesta = await obtenerUsuariosAdmin();

    usuariosOriginales = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta.items)
        ? respuesta.items
        : [];

    renderizarUsuarios();
  } catch (error) {
    cuerpoTablaUsuarios.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-danger">
          No fue posible cargar los usuarios.
        </td>
      </tr>
    `;

    textoCantidadUsuarios.textContent = "Error cargando usuarios.";
    mostrarAlerta(error.message || "No fue posible cargar los usuarios.");
  }
}

function renderizarUsuarios() {
  const usuarios = filtrarUsuarios();

  textoCantidadUsuarios.textContent = `${usuarios.length} usuario(s) encontrado(s).`;

  if (!usuarios.length) {
    cuerpoTablaUsuarios.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          No hay usuarios con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTablaUsuarios.innerHTML = usuarios
    .map((usuario) => {
      const activo = usuario.activo !== false;

      return `
        <tr>
          <td>
            <div class="fw-semibold">${textoSeguro(usuario.nombre)}</div>
          </td>

          <td>
            ${textoSeguro(usuario.correo)}
          </td>

          <td class="text-center">
            ${construirBadgeRol(usuario.rol)}
          </td>

          <td class="text-center">
            ${
              activo
                ? '<span class="badge text-bg-success">Activo</span>'
                : '<span class="badge text-bg-secondary">Inactivo</span>'
            }
          </td>

          <td class="text-center">
            ${
              usuario.es_superusuario
                ? '<span class="badge text-bg-primary">Sí</span>'
                : '<span class="text-muted">No</span>'
            }
          </td>

          <td class="text-center">
            <div class="acciones-tabla">
              <button
                type="button"
                class="btn btn-icono"
                title="Editar usuario"
                data-accion="editar"
                data-id="${usuario.id}"
              >
                <i class="bi bi-pencil"></i>
              </button>

              <button
                type="button"
                class="btn btn-icono"
                title="Cambiar contraseña"
                data-accion="password"
                data-id="${usuario.id}"
              >
                <i class="bi bi-key"></i>
              </button>

              <button
                type="button"
                class="btn btn-icono"
                title="${activo ? "Desactivar" : "Activar"} usuario"
                data-accion="${activo ? "desactivar" : "activar"}"
                data-id="${usuario.id}"
              >
                <i class="bi ${activo ? "bi-toggle-on" : "bi-toggle-off"}"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function filtrarUsuarios() {
  const busqueda = normalizarTexto(busquedaUsuario.value);
  const rol = filtroRolUsuario.value;
  const estado = filtroEstadoUsuario.value;

  return usuariosOriginales.filter((usuario) => {
    if (rol && usuario.rol !== rol) {
      return false;
    }

    if (estado === "activo" && usuario.activo === false) {
      return false;
    }

    if (estado === "inactivo" && usuario.activo !== false) {
      return false;
    }

    if (busqueda) {
      const texto = normalizarTexto([
        usuario.nombre,
        usuario.correo,
        usuario.rol,
      ].join(" "));

      if (!texto.includes(busqueda)) {
        return false;
      }
    }

    return true;
  });
}

function construirBadgeRol(rol) {
  if (rol === "admin") {
    return '<span class="badge text-bg-dark">Admin</span>';
  }

  if (rol === "vendedor") {
    return '<span class="badge text-bg-info">Vendedor</span>';
  }

  return `<span class="badge text-bg-secondary">${textoSeguro(rol)}</span>`;
}

function abrirModalNuevoUsuario() {
  usuarioEditando = null;

  tituloModalUsuario.textContent = "Nuevo usuario";
  usuarioId.value = "";
  usuarioNombre.value = "";
  usuarioCorreo.value = "";
  usuarioPassword.value = "";
  usuarioPassword.required = true;
  grupoPasswordUsuario.classList.remove("d-none");
  usuarioRol.value = "vendedor";
  usuarioActivo.checked = true;
  usuarioSuperusuario.checked = false;

  modalUsuario?.show();
}

function abrirModalEditarUsuario(usuario) {
  usuarioEditando = usuario;

  tituloModalUsuario.textContent = "Editar usuario";
  usuarioId.value = usuario.id;
  usuarioNombre.value = usuario.nombre || "";
  usuarioCorreo.value = usuario.correo || "";
  usuarioPassword.value = "";
  usuarioPassword.required = false;
  grupoPasswordUsuario.classList.add("d-none");
  usuarioRol.value = usuario.rol || "vendedor";
  usuarioActivo.checked = usuario.activo !== false;
  usuarioSuperusuario.checked = usuario.es_superusuario === true;

  modalUsuario?.show();
}

async function guardarUsuario(evento) {
  evento.preventDefault();

  try {
    btnGuardarUsuario.disabled = true;
    btnGuardarUsuario.textContent = "Guardando...";

    const id = Number(usuarioId.value);

    const payload = {
      nombre: usuarioNombre.value.trim(),
      correo: usuarioCorreo.value.trim().toLowerCase(),
      rol: usuarioRol.value,
      activo: usuarioActivo.checked,
      es_superusuario: usuarioSuperusuario.checked,
    };

    if (!payload.nombre) {
      throw new Error("El nombre es obligatorio.");
    }

    if (!payload.correo) {
      throw new Error("El correo es obligatorio.");
    }

    if (!id) {
      payload.password = usuarioPassword.value;

      if (!payload.password || payload.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }

      await crearUsuarioAdmin(payload);
      mostrarToast("Usuario creado correctamente.", "success");
    } else {
      await actualizarUsuarioAdmin(id, payload);
      mostrarToast("Usuario actualizado correctamente.", "success");
    }

    modalUsuario?.hide();
    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message || "No fue posible guardar el usuario.", "danger");
  } finally {
    btnGuardarUsuario.disabled = false;
    btnGuardarUsuario.textContent = "Guardar usuario";
  }
}

async function manejarAccionesTabla(evento) {
  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = Number(boton.dataset.id);

  if (!id) return;

  const usuario = usuariosOriginales.find((item) => Number(item.id) === id);

  if (!usuario) {
    mostrarToast("No se encontró el usuario seleccionado.", "danger");
    return;
  }

  if (accion === "editar") {
    abrirModalEditarUsuario(usuario);
    return;
  }

  if (accion === "password") {
    abrirModalPasswordUsuario(usuario);
    return;
  }

  if (accion === "activar") {
    await cambiarEstadoUsuario(id, true);
    return;
  }

  if (accion === "desactivar") {
    await cambiarEstadoUsuario(id, false);
  }
}

function abrirModalPasswordUsuario(usuario) {
  passwordUsuarioId.value = usuario.id;
  nuevaPasswordUsuario.value = "";
  textoUsuarioPassword.textContent = usuario.correo || "";

  modalPasswordUsuario?.show();
}

async function guardarPasswordUsuario(evento) {
  evento.preventDefault();

  const id = Number(passwordUsuarioId.value);
  const password = nuevaPasswordUsuario.value;

  if (!id) {
    mostrarToast("No se encontró el usuario.", "danger");
    return;
  }

  if (!password || password.length < 6) {
    mostrarToast("La contraseña debe tener al menos 6 caracteres.", "warning");
    return;
  }

  try {
    btnGuardarPasswordUsuario.disabled = true;
    btnGuardarPasswordUsuario.textContent = "Guardando...";

    await cambiarPasswordUsuarioAdmin(id, { password });

    modalPasswordUsuario?.hide();
    mostrarToast("Contraseña actualizada correctamente.", "success");

    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cambiar la contraseña.", "danger");
  } finally {
    btnGuardarPasswordUsuario.disabled = false;
    btnGuardarPasswordUsuario.textContent = "Cambiar contraseña";
  }
}

async function cambiarEstadoUsuario(id, activar) {
  try {
    if (activar) {
      await activarUsuarioAdmin(id);
      mostrarToast("Usuario activado correctamente.", "success");
    } else {
      await desactivarUsuarioAdmin(id);
      mostrarToast("Usuario desactivado correctamente.", "success");
    }

    await cargarUsuarios();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cambiar el estado.", "danger");
  }
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlertaUsuarios.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlertaUsuarios.innerHTML = "";
}

function mostrarToast(mensaje, tipo = "primary") {
  const toast = document.createElement("div");

  toast.className = `toast align-items-center text-bg-${tipo} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${escaparHtml(mensaje)}
      </div>
      <button
        type="button"
        class="btn-close btn-close-white me-2 m-auto"
        data-bs-dismiss="toast"
        aria-label="Cerrar"
      ></button>
    </div>
  `;

  contenedorToast.appendChild(toast);

  const instanciaToast = new bootstrap.Toast(toast, {
    delay: 3500,
  });

  instanciaToast.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function textoSeguro(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return escaparHtml(valor);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}