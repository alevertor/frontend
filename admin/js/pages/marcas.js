import {
  obtenerMarcasAdmin,
  crearMarca,
  actualizarMarca,
  activarMarca,
  desactivarMarca,
} from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

let marcasOriginales = [];
let marcaEditando = null;
let modalMarca = null;

const btnNuevaMarca = document.getElementById("btnNuevaMarca");
const btnRecargarMarcas = document.getElementById("btnRecargarMarcas");

const formFiltrosMarcas = document.getElementById("formFiltrosMarcas");
const busquedaMarca = document.getElementById("busquedaMarca");

const cuerpoTablaMarcas = document.getElementById("cuerpoTablaMarcas");
const textoCantidadMarcas = document.getElementById("textoCantidadMarcas");
const contenedorAlertaMarcas = document.getElementById("contenedorAlertaMarcas");

const modalMarcaElemento = document.getElementById("modalMarca");

const formMarca = document.getElementById("formMarca");
const tituloModalMarca = document.getElementById("tituloModalMarca");
const marcaId = document.getElementById("marcaId");
const marcaNombre = document.getElementById("marcaNombre");
const marcaSlug = document.getElementById("marcaSlug");
const marcaActiva = document.getElementById("marcaActiva");
const btnGuardarMarca = document.getElementById("btnGuardarMarca");

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

    await cargarMarcas();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar la página de marcas vehículo.", "danger");
  } finally {
    finalizarCargaAdmin();
  }
}

function inicializarModales() {
  if (modalMarcaElemento && window.bootstrap) {
    modalMarca = new bootstrap.Modal(modalMarcaElemento);
  }
}

function registrarEventos() {
  btnNuevaMarca?.addEventListener("click", abrirModalNuevaMarca);
  btnRecargarMarcas?.addEventListener("click", cargarMarcas);

  formFiltrosMarcas?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    renderizarMarcas();
  });

  busquedaMarca?.addEventListener("input", renderizarMarcas);

  formMarca?.addEventListener("submit", guardarMarca);

  marcaNombre?.addEventListener("input", () => {
    if (!marcaEditando || !marcaSlug.value.trim()) {
      marcaSlug.value = generarSlug(marcaNombre.value);
    }
  });

  cuerpoTablaMarcas?.addEventListener("click", manejarAccionesTabla);
}

async function cargarMarcas() {
  try {
    limpiarAlerta();

    cuerpoTablaMarcas.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          Cargando marcas...
        </td>
      </tr>
    `;

    textoCantidadMarcas.textContent = "Cargando marcas...";

    const respuesta = await obtenerMarcasAdmin();

    marcasOriginales = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta.items)
        ? respuesta.items
        : [];

    renderizarMarcas();
  } catch (error) {
    cuerpoTablaMarcas.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-danger">
          No fue posible cargar las marcas.
        </td>
      </tr>
    `;

    textoCantidadMarcas.textContent = "Error cargando marcas.";
    mostrarAlerta(error.message || "No fue posible cargar las marcas.");
  }
}

function renderizarMarcas() {
  const marcas = filtrarMarcas();

  textoCantidadMarcas.textContent = `${marcas.length} marca(s) encontrada(s).`;

  if (!marcas.length) {
    cuerpoTablaMarcas.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          No hay marcas con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTablaMarcas.innerHTML = marcas
    .map((marca) => {
      const activa = marca.activa !== false;

      return `
        <tr>
          <td>
            <div class="fw-semibold">${textoSeguro(marca.nombre)}</div>
          </td>

          <td>
            <code>${textoSeguro(marca.slug)}</code>
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
                title="Editar marca vehículo"
                data-accion="editar"
                data-id="${marca.id}"
              >
                <i class="bi bi-pencil"></i>
              </button>

              <button
                type="button"
                class="btn btn-icono"
                title="${activa ? "Desactivar" : "Activar"} marca vehículo"
                data-accion="${activa ? "desactivar" : "activar"}"
                data-id="${marca.id}"
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

function filtrarMarcas() {
  const busqueda = normalizarTexto(busquedaMarca.value);

  if (!busqueda) {
    return marcasOriginales;
  }

  return marcasOriginales.filter((marca) => {
    const texto = normalizarTexto([
      marca.nombre,
      marca.slug,
    ].join(" "));

    return texto.includes(busqueda);
  });
}

function abrirModalNuevaMarca() {
  marcaEditando = null;

  tituloModalMarca.textContent = "Nueva marca vehículo";
  marcaId.value = "";
  marcaNombre.value = "";
  marcaSlug.value = "";
  marcaActiva.checked = true;

  modalMarca?.show();
}

function abrirModalEditarMarca(marca) {
  marcaEditando = marca;

  tituloModalMarca.textContent = "Editar marca vehículo";
  marcaId.value = marca.id;
  marcaNombre.value = marca.nombre || "";
  marcaSlug.value = marca.slug || "";
  marcaActiva.checked = marca.activa !== false;

  modalMarca?.show();
}

async function guardarMarca(evento) {
  evento.preventDefault();

  try {
    btnGuardarMarca.disabled = true;
    btnGuardarMarca.textContent = "Guardando...";

    const payload = {
      nombre: marcaNombre.value.trim(),
      slug: generarSlug(marcaSlug.value.trim() || marcaNombre.value.trim()),
      activa: marcaActiva.checked,
    };

    if (!payload.nombre) {
      throw new Error("El nombre de la marca vehículo es obligatorio.");
    }

    if (!payload.slug) {
      throw new Error("El slug de la marca vehículo es obligatorio.");
    }

    const id = Number(marcaId.value);

    if (id) {
      await actualizarMarca(id, payload);
      mostrarToast("Marca vehículo actualizada correctamente.", "success");
    } else {
      await crearMarca(payload);
      mostrarToast("Marca vehículo creada correctamente.", "success");
    }

    modalMarca?.hide();
    await cargarMarcas();
  } catch (error) {
    mostrarToast(error.message || "No fue posible guardar la marca vehículo.", "danger");
  } finally {
    btnGuardarMarca.disabled = false;
    btnGuardarMarca.textContent = "Guardar marca";
  }
}

async function manejarAccionesTabla(evento) {
  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = Number(boton.dataset.id);

  if (!id) return;

  const marca = marcasOriginales.find((item) => Number(item.id) === id);

  if (!marca) {
    mostrarToast("No se encontró la marca vehículo seleccionada.", "danger");
    return;
  }

  if (accion === "editar") {
    abrirModalEditarMarca(marca);
    return;
  }

  if (accion === "activar") {
    await cambiarEstadoMarca(id, true);
    return;
  }

  if (accion === "desactivar") {
    await cambiarEstadoMarca(id, false);
  }
}

async function cambiarEstadoMarca(id, activar) {
  try {
    if (activar) {
      await activarMarca(id);
      mostrarToast("Marca vehículo activada correctamente.", "success");
    } else {
      await desactivarMarca(id);
      mostrarToast("Marca vehículo desactivada correctamente.", "success");
    }

    await cargarMarcas();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cambiar el estado.", "danger");
  }
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlertaMarcas.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlertaMarcas.innerHTML = "";
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