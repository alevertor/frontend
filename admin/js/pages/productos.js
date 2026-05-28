import {
  activarProducto,
  desactivarProducto,
  obtenerCategoriasPublicas,
  obtenerMarcasPublicas,
  obtenerProductos,
} from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

const COLUMNAS_TABLA_PRODUCTOS = 7;

const estado = {
  pagina: 1,
  tamano: 20,
  totalPaginas: 0,
  filtros: {
    busqueda: "",
    categoria_id: "",
    marca_id: "",
    activo: "",
  },
  accionPendiente: null,
};

const elementos = {
  formFiltros: document.getElementById("formFiltrosProductos"),
  tabla: document.getElementById("tablaProductos"),
  textoResumen: document.getElementById("textoResumenProductos"),
  textoPaginacion: document.getElementById("textoPaginacionProductos"),
  btnRecargar: document.getElementById("btnRecargarProductos"),
  btnLimpiarFiltros: document.getElementById("btnLimpiarFiltrosProductos"),
  btnPaginaAnterior: document.getElementById("btnPaginaAnterior"),
  btnPaginaSiguiente: document.getElementById("btnPaginaSiguiente"),

  selectCategoria: document.getElementById("categoria_id"),
  selectMarca: document.getElementById("marca_id"),

  modalConfirmacionEstado: document.getElementById("modalConfirmacionEstado"),
  textoModalConfirmacionEstado: document.getElementById("textoModalConfirmacionEstado"),
  btnConfirmarCambioEstado: document.getElementById("btnConfirmarCambioEstado"),
  contenedorToast: document.getElementById("contenedorToast"),
  contenedorTabla: document.getElementById("contenedorTablaProductos"),
};

let modalEstado = null;

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

    if (elementos.modalConfirmacionEstado && window.bootstrap) {
      modalEstado = new bootstrap.Modal(elementos.modalConfirmacionEstado);
    }

    registrarEventos();

    try {
      await cargarCatalogos();
    } catch (error) {
      console.warn("No se pudieron cargar catálogos:", error.message);
    }

    await cargarProductos("Cargando productos...");
  } catch (error) {
    console.error(error);
    mostrarMensajeError(error.message);
  } finally {
    finalizarCargaAdmin();
  }
}

function registrarEventos() {
  elementos.formFiltros?.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    estado.pagina = 1;
    leerFiltros();
    await cargarProductos("Aplicando filtros...");
  });

  elementos.btnRecargar?.addEventListener("click", async () => {
    await cargarProductos("Actualizando productos...");
  });

  elementos.btnLimpiarFiltros?.addEventListener("click", async () => {
    await limpiarFiltrosProductos();
  });

  elementos.btnPaginaAnterior?.addEventListener("click", async () => {
    if (estado.pagina <= 1) return;

    estado.pagina -= 1;
    await cargarProductos("Cambiando de página...");
  });

  elementos.btnPaginaSiguiente?.addEventListener("click", async () => {
    if (estado.pagina >= estado.totalPaginas) return;

    estado.pagina += 1;
    await cargarProductos("Cambiando de página...");
  });

  elementos.tabla?.addEventListener("click", manejarAccionTabla);

  elementos.btnConfirmarCambioEstado?.addEventListener("click", confirmarCambioEstado);
}

async function cargarCatalogos() {
  const [categorias, marcas] = await Promise.all([
    obtenerCategoriasPublicas(),
    obtenerMarcasPublicas(),
  ]);

  llenarSelectCatalogo(elementos.selectCategoria, categorias);
  llenarSelectCatalogo(elementos.selectMarca, marcas);
}

function llenarSelectCatalogo(select, items) {
  if (!select) return;

  select.innerHTML = '<option value="">Todas</option>';

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nombre;
    select.appendChild(option);
  });
}

function leerFiltros() {
  const datos = new FormData(elementos.formFiltros);

  estado.filtros = {
    busqueda: datos.get("busqueda")?.trim() || "",
    categoria_id: datos.get("categoria_id") || "",
    marca_id: datos.get("marca_id") || "",
    activo: datos.get("activo") || "",
  };
}

async function limpiarFiltrosProductos() {
  elementos.formFiltros?.reset();

  estado.pagina = 1;
  estado.filtros = {
    busqueda: "",
    categoria_id: "",
    marca_id: "",
    activo: "",
  };

  await cargarProductos("Limpiando filtros...");
}

async function cargarProductos(mensajeCarga = "Actualizando productos...") {
  activarCargaTabla(mensajeCarga);

  try {
    const parametros = {
      ...estado.filtros,
      pagina: estado.pagina,
      tamano: estado.tamano,
      ordenar_por: "nombre",
      direccion: "asc",
    };

    const respuesta = await obtenerProductos(parametros);

    estado.totalPaginas = respuesta.paginacion.total_paginas;

    renderizarProductos(respuesta.items);
    renderizarResumen(respuesta.paginacion);
    actualizarBotonesPaginacion(respuesta.paginacion);
  } catch (error) {
    elementos.tabla.innerHTML = construirFilaError(error.message);
    mostrarMensajeError(error.message);
  } finally {
    desactivarCargaTabla();
  }
}

function renderizarProductos(productos) {
  if (!productos.length) {
    elementos.tabla.innerHTML = `
      <tr>
        <td colspan="${COLUMNAS_TABLA_PRODUCTOS}" class="text-center py-4 text-muted">
          No hay productos con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  elementos.tabla.innerHTML = productos.map(construirFilaProducto).join("");
}

function construirFilaProducto(producto) {
  const estadoClase = producto.activo ? "success" : "secondary";
  const estadoTexto = producto.activo ? "Activo" : "Inactivo";
  const textoAccionEstado = producto.activo ? "Desactivar" : "Activar";
  const claseAccionEstado = producto.activo ? "outline-danger" : "outline-success";
  const accionEstado = producto.activo ? "desactivar" : "activar";

  return `
    <tr data-producto-id="${producto.id}">
      <td class="celda-producto">
        <div class="producto-tabla-nombre">
          ${escaparHtml(producto.nombre || "—")}
        </div>
      </td>

      <td class="text-center">
        ${escaparHtml(producto.categoria_nombre || "—")}
      </td>

      <td>
        ${construirListaMarcas(producto)}
      </td>

      <td>
        ${construirListaReferencias(producto.referencia_original)}
      </td>

      <td class="text-center">
        <div class="badges-estado">
          <span class="badge text-bg-light border">
            ${escaparHtml(producto.estado_publicacion || "borrador")}
          </span>
          ${
            producto.destacado
              ? '<span class="badge text-bg-primary">Destacado</span>'
              : ""
          }
        </div>
      </td>

      <td class="text-center">
        <span class="badge text-bg-${estadoClase}">
          ${estadoTexto}
        </span>
      </td>

      <td class="text-center">
        <div class="acciones-productos">
          <a
            class="btn btn-outline-primary btn-sm"
            href="./producto-form.html?id=${producto.id}"
          >
            Abrir
          </a>

          <button
            class="btn btn-${claseAccionEstado} btn-sm"
            type="button"
            data-accion="${accionEstado}"
            data-id="${producto.id}"
            data-nombre="${escaparAtributo(producto.nombre)}"
          >
            ${textoAccionEstado}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function construirListaMarcas(producto) {
  const marcas = obtenerMarcasProducto(producto);

  if (!marcas.length) {
    return '<span class="text-muted">—</span>';
  }

  return `
    <div class="lista-marcas-producto">
      ${marcas
        .map((marca) => `<span class="item-marca-producto">${escaparHtml(marca)}</span>`)
        .join("")}
    </div>
  `;
}

function obtenerMarcasProducto(producto) {
  if (Array.isArray(producto.marca_nombres) && producto.marca_nombres.length) {
    return producto.marca_nombres.filter(Boolean);
  }

  if (producto.marca_nombre) {
    return [producto.marca_nombre];
  }

  return [];
}

function construirListaReferencias(referenciaOriginal) {
  const referencias = dividirReferencias(referenciaOriginal);

  if (!referencias.length) {
    return '<span class="text-muted">—</span>';
  }

  return `
    <div class="lista-referencias-producto">
      ${referencias
        .map((referencia) => `
          <span
            class="item-referencia-producto"
            title="${escaparAtributo(referencia)}"
          >
            ${escaparHtml(referencia)}
          </span>
        `)
        .join("")}
    </div>
  `;
}

function dividirReferencias(referenciaOriginal) {
  if (!referenciaOriginal) {
    return [];
  }

  return String(referenciaOriginal)
    .split(/[\s,;|/]+/)
    .map((referencia) => referencia.trim())
    .filter(Boolean);
}

function renderizarResumen(paginacion) {
  elementos.textoResumen.textContent = `${paginacion.total} producto(s) encontrados.`;

  if (paginacion.total === 0) {
    elementos.textoPaginacion.textContent = "Sin resultados.";
    return;
  }

  elementos.textoPaginacion.textContent = `Página ${paginacion.pagina} de ${paginacion.total_paginas}`;
}

function actualizarBotonesPaginacion(paginacion) {
  elementos.btnPaginaAnterior.disabled = paginacion.pagina <= 1;
  elementos.btnPaginaSiguiente.disabled =
    paginacion.total_paginas === 0 || paginacion.pagina >= paginacion.total_paginas;
}

function manejarAccionTabla(evento) {
  const boton = evento.target.closest("button[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const productoId = Number(boton.dataset.id);
  const nombreProducto = boton.dataset.nombre || "este producto";

  if (!productoId) return;

  estado.accionPendiente = {
    accion,
    productoId,
    nombreProducto,
  };

  const textoAccion = accion === "desactivar" ? "desactivar" : "activar";

  elementos.textoModalConfirmacionEstado.textContent =
    `¿Seguro que deseas ${textoAccion} el producto "${nombreProducto}"?`;

  elementos.btnConfirmarCambioEstado.className =
    accion === "desactivar" ? "btn btn-danger" : "btn btn-success";

  elementos.btnConfirmarCambioEstado.textContent =
    accion === "desactivar" ? "Desactivar" : "Activar";

  if (modalEstado) {
    modalEstado.show();
  } else {
    const confirmar = confirm(elementos.textoModalConfirmacionEstado.textContent);

    if (confirmar) {
      confirmarCambioEstado();
    }
  }
}

async function confirmarCambioEstado() {
  if (!estado.accionPendiente) return;

  const { accion, productoId } = estado.accionPendiente;

  try {
    elementos.btnConfirmarCambioEstado.disabled = true;
    elementos.btnConfirmarCambioEstado.textContent =
      accion === "desactivar" ? "Desactivando..." : "Activando...";

    if (accion === "desactivar") {
      await desactivarProducto(productoId);
      mostrarMensajeExito("Producto desactivado correctamente.");
    } else {
      await activarProducto(productoId);
      mostrarMensajeExito("Producto activado correctamente.");
    }

    cerrarModalConfirmacionEstado();
    estado.accionPendiente = null;
    await cargarProductos("Actualizando estado...");
  } catch (error) {
    estado.accionPendiente = null;
    mostrarErrorDespuesDeCerrarModal(error.message);
  } finally {
    elementos.btnConfirmarCambioEstado.disabled = false;
    elementos.btnConfirmarCambioEstado.textContent =
      accion === "desactivar" ? "Desactivar" : "Activar";
  }
}

function cerrarModalConfirmacionEstado() {
  if (modalEstado) {
    modalEstado.hide();
  }
}

function modalConfirmacionEstaVisible() {
  return elementos.modalConfirmacionEstado?.classList.contains("show");
}

function mostrarErrorDespuesDeCerrarModal(mensaje) {
  if (!modalEstado || !modalConfirmacionEstaVisible()) {
    mostrarMensajeError(mensaje);
    return;
  }

  elementos.modalConfirmacionEstado.addEventListener(
    "hidden.bs.modal",
    () => mostrarMensajeError(mensaje),
    { once: true }
  );

  cerrarModalConfirmacionEstado();
}

function activarCargaTabla(mensaje = "Actualizando productos...") {
  const tieneFilasReales = elementos.tabla?.querySelector("tr[data-producto-id]");

  if (!tieneFilasReales) {
    elementos.tabla.innerHTML = construirFilaCargando(mensaje);
  }

  const textoCarga = elementos.contenedorTabla?.querySelector("[data-texto-carga-tabla]");

  if (textoCarga) {
    textoCarga.textContent = mensaje;
  }

  elementos.contenedorTabla?.classList.add("tabla-admin-contenedor-cargando");
  elementos.contenedorTabla?.querySelector(".tabla-admin-overlay")?.setAttribute("aria-hidden", "false");
  actualizarControlesCarga(true);
}

function desactivarCargaTabla() {
  elementos.contenedorTabla?.classList.remove("tabla-admin-contenedor-cargando");
  elementos.contenedorTabla?.querySelector(".tabla-admin-overlay")?.setAttribute("aria-hidden", "true");
  actualizarControlesCarga(false);
  restaurarEstadoPaginacion();
}

function restaurarEstadoPaginacion() {
  elementos.btnPaginaAnterior.disabled = estado.pagina <= 1;
  elementos.btnPaginaSiguiente.disabled =
    estado.totalPaginas === 0 || estado.pagina >= estado.totalPaginas;
}

function actualizarControlesCarga(cargando) {
  const controles = [
    elementos.btnRecargar,
    elementos.btnLimpiarFiltros,
    elementos.btnPaginaAnterior,
    elementos.btnPaginaSiguiente,
    elementos.formFiltros?.querySelector('button[type="submit"]'),
  ];

  controles.forEach((control) => {
    if (control) {
      control.disabled = cargando;
    }
  });
}

function construirFilaCargando(mensaje = "Cargando productos...") {
  return `
    <tr>
      <td colspan="${COLUMNAS_TABLA_PRODUCTOS}" class="text-center py-4 text-muted">
        ${escaparHtml(mensaje)}
      </td>
    </tr>
  `;
}

function construirFilaError(mensaje) {
  return `
    <tr>
      <td colspan="${COLUMNAS_TABLA_PRODUCTOS}" class="text-center py-4 text-danger">
        ${escaparHtml(mensaje)}
      </td>
    </tr>
  `;
}

function mostrarMensajeError(mensaje) {
  console.error(mensaje);

  if (elementos.contenedorToast && window.bootstrap) {
    mostrarToast(mensaje, "danger");
    return;
  }

  alert(mensaje);
}

function mostrarMensajeExito(mensaje) {
  if (elementos.contenedorToast && window.bootstrap) {
    mostrarToast(mensaje, "success");
    return;
  }

  alert(mensaje);
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

  elementos.contenedorToast.appendChild(toast);

  const instanciaToast = new bootstrap.Toast(toast, {
    delay: 3500,
  });

  instanciaToast.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(valor) {
  return escaparHtml(valor).replaceAll("\n", " ");
}