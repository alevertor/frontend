import {
  obtenerCategoriasAdmin,
  crearCategoria,
  actualizarCategoria,
  activarCategoria,
  desactivarCategoria,
} from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

let categoriasOriginales = [];
let categoriaEditando = null;
let modalCategoria = null;

const btnNuevaCategoria = document.getElementById("btnNuevaCategoria");
const btnRecargarCategorias = document.getElementById("btnRecargarCategorias");

const formFiltrosCategorias = document.getElementById("formFiltrosCategorias");
const busquedaCategoria = document.getElementById("busquedaCategoria");

const cuerpoTablaCategorias = document.getElementById("cuerpoTablaCategorias");
const textoCantidadCategorias = document.getElementById("textoCantidadCategorias");
const contenedorAlertaCategorias = document.getElementById("contenedorAlertaCategorias");

const modalCategoriaElemento = document.getElementById("modalCategoria");

const formCategoria = document.getElementById("formCategoria");
const tituloModalCategoria = document.getElementById("tituloModalCategoria");
const categoriaId = document.getElementById("categoriaId");
const categoriaNombre = document.getElementById("categoriaNombre");
const categoriaSlug = document.getElementById("categoriaSlug");
const categoriaActiva = document.getElementById("categoriaActiva");
const btnGuardarCategoria = document.getElementById("btnGuardarCategoria");

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

    await cargarCategorias();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar la página de categorías.", "danger");
  } finally {
    finalizarCargaAdmin();
  }
}

function inicializarModales() {
  if (modalCategoriaElemento && window.bootstrap) {
    modalCategoria = new bootstrap.Modal(modalCategoriaElemento);
  }
}

function registrarEventos() {
  btnNuevaCategoria?.addEventListener("click", abrirModalNuevaCategoria);
  btnRecargarCategorias?.addEventListener("click", cargarCategorias);

  formFiltrosCategorias?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    renderizarCategorias();
  });

  busquedaCategoria?.addEventListener("input", renderizarCategorias);

  formCategoria?.addEventListener("submit", guardarCategoria);

  categoriaNombre?.addEventListener("input", () => {
    if (!categoriaEditando || !categoriaSlug.value.trim()) {
      categoriaSlug.value = generarSlug(categoriaNombre.value);
    }
  });

  cuerpoTablaCategorias?.addEventListener("click", manejarAccionesTabla);
}

async function cargarCategorias() {
  try {
    limpiarAlerta();

    cuerpoTablaCategorias.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          Cargando categorías...
        </td>
      </tr>
    `;

    textoCantidadCategorias.textContent = "Cargando categorías...";

    const respuesta = await obtenerCategoriasAdmin();

    categoriasOriginales = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta.items)
        ? respuesta.items
        : [];

    renderizarCategorias();
  } catch (error) {
    cuerpoTablaCategorias.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-danger">
          No fue posible cargar las categorías.
        </td>
      </tr>
    `;

    textoCantidadCategorias.textContent = "Error cargando categorías.";
    mostrarAlerta(error.message || "No fue posible cargar las categorías.");
  }
}

function renderizarCategorias() {
  const categorias = filtrarCategorias();

  textoCantidadCategorias.textContent = `${categorias.length} categoría(s) encontrada(s).`;

  if (!categorias.length) {
    cuerpoTablaCategorias.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          No hay categorías con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTablaCategorias.innerHTML = categorias
    .map((categoria) => {
      const activa = categoria.activa !== false;

      return `
        <tr>
          <td>
            <div class="fw-semibold">${textoSeguro(categoria.nombre)}</div>
          </td>

          <td>
            <code>${textoSeguro(categoria.slug)}</code>
          </td>

          <td class="text-center">
            ${
              activa
                ? '<span class="badge text-bg-success">Activa</span>'
                : '<span class="badge text-bg-secondary">Inactiva</span>'
            }
          </td>

          <td class="text-center">
            <div class="acciones-tabla">
              <button
                type="button"
                class="btn btn-icono"
                title="Editar categoría"
                data-accion="editar"
                data-id="${categoria.id}"
              >
                <i class="bi bi-pencil"></i>
              </button>

              <button
                type="button"
                class="btn btn-icono"
                title="${activa ? "Desactivar" : "Activar"} categoría"
                data-accion="${activa ? "desactivar" : "activar"}"
                data-id="${categoria.id}"
              >
                <i class="bi ${activa ? "bi-toggle-on" : "bi-toggle-off"}"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function filtrarCategorias() {
  const busqueda = normalizarTexto(busquedaCategoria.value);

  if (!busqueda) {
    return categoriasOriginales;
  }

  return categoriasOriginales.filter((categoria) => {
    const texto = normalizarTexto([
      categoria.nombre,
      categoria.slug,
    ].join(" "));

    return texto.includes(busqueda);
  });
}

function abrirModalNuevaCategoria() {
  categoriaEditando = null;

  tituloModalCategoria.textContent = "Nueva categoría";
  categoriaId.value = "";
  categoriaNombre.value = "";
  categoriaSlug.value = "";
  categoriaActiva.checked = true;

  modalCategoria?.show();
}

function abrirModalEditarCategoria(categoria) {
  categoriaEditando = categoria;

  tituloModalCategoria.textContent = "Editar categoría";
  categoriaId.value = categoria.id;
  categoriaNombre.value = categoria.nombre || "";
  categoriaSlug.value = categoria.slug || "";
  categoriaActiva.checked = categoria.activa !== false;

  modalCategoria?.show();
}

async function guardarCategoria(evento) {
  evento.preventDefault();

  try {
    btnGuardarCategoria.disabled = true;
    btnGuardarCategoria.textContent = "Guardando...";

    const payload = {
      nombre: categoriaNombre.value.trim(),
      slug: generarSlug(categoriaSlug.value.trim() || categoriaNombre.value.trim()),
      activa: categoriaActiva.checked,
    };

    if (!payload.nombre) {
      throw new Error("El nombre de la categoría es obligatorio.");
    }

    if (!payload.slug) {
      throw new Error("El slug de la categoría es obligatorio.");
    }

    const id = Number(categoriaId.value);

    if (id) {
      await actualizarCategoria(id, payload);
      mostrarToast("Categoría actualizada correctamente.", "success");
    } else {
      await crearCategoria(payload);
      mostrarToast("Categoría creada correctamente.", "success");
    }

    modalCategoria?.hide();
    await cargarCategorias();
  } catch (error) {
    mostrarToast(error.message || "No fue posible guardar la categoría.", "danger");
  } finally {
    btnGuardarCategoria.disabled = false;
    btnGuardarCategoria.textContent = "Guardar categoría";
  }
}

async function manejarAccionesTabla(evento) {
  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = Number(boton.dataset.id);

  if (!id) return;

  const categoria = categoriasOriginales.find((item) => Number(item.id) === id);

  if (!categoria) {
    mostrarToast("No se encontró la categoría seleccionada.", "danger");
    return;
  }

  if (accion === "editar") {
    abrirModalEditarCategoria(categoria);
    return;
  }

  if (accion === "activar") {
    await cambiarEstadoCategoria(id, true);
    return;
  }

  if (accion === "desactivar") {
    await cambiarEstadoCategoria(id, false);
  }
}

async function cambiarEstadoCategoria(id, activar) {
  try {
    if (activar) {
      await activarCategoria(id);
      mostrarToast("Categoría activada correctamente.", "success");
    } else {
      await desactivarCategoria(id);
      mostrarToast("Categoría desactivada correctamente.", "success");
    }

    await cargarCategorias();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cambiar el estado.", "danger");
  }
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlertaCategorias.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlertaCategorias.innerHTML = "";
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

function generarSlug(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
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