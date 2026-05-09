import {
  obtenerSolicitudesAdmin,
  obtenerDetalleSolicitudAdmin,
  actualizarSolicitudAdmin,
  cambiarEstadoSolicitudAdmin,
} from "../api.js";

import {
  protegerPaginaAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

let solicitudesOriginales = [];
let solicitudActual = null;
let modalDetalleSolicitud = null;

const formFiltrosSolicitudes = document.getElementById("formFiltrosSolicitudes");
const busquedaSolicitud = document.getElementById("busquedaSolicitud");
const filtroEstadoSolicitud = document.getElementById("filtroEstadoSolicitud");
const btnRecargarSolicitudes = document.getElementById("btnRecargarSolicitudes");

const cuerpoTablaSolicitudes = document.getElementById("cuerpoTablaSolicitudes");
const textoCantidadSolicitudes = document.getElementById("textoCantidadSolicitudes");
const contenedorAlertaSolicitudes = document.getElementById("contenedorAlertaSolicitudes");

const contadorNuevas = document.getElementById("contadorNuevas");
const contadorContactadas = document.getElementById("contadorContactadas");
const contadorCotizadas = document.getElementById("contadorCotizadas");
const contadorCerradas = document.getElementById("contadorCerradas");

const modalDetalleSolicitudElemento = document.getElementById("modalDetalleSolicitud");
const solicitudIdActual = document.getElementById("solicitudIdActual");

const tituloModalSolicitud = document.getElementById("tituloModalSolicitud");
const subtituloModalSolicitud = document.getElementById("subtituloModalSolicitud");

const detalleNombre = document.getElementById("detalleNombre");
const detalleTelefono = document.getElementById("detalleTelefono");
const enlaceWhatsApp = document.getElementById("enlaceWhatsApp");
const detalleCorreo = document.getElementById("detalleCorreo");
const detallePreferencia = document.getElementById("detallePreferencia");
const detalleVehiculo = document.getElementById("detalleVehiculo");
const detalleCategorias = document.getElementById("detalleCategorias");
const detalleCantidad = document.getElementById("detalleCantidad");
const detalleMensaje = document.getElementById("detalleMensaje");

const estadoSolicitud = document.getElementById("estadoSolicitud");
const notaInternaSolicitud = document.getElementById("notaInternaSolicitud");
const btnGuardarGestionSolicitud = document.getElementById("btnGuardarGestionSolicitud");
const btnGuardarSoloNotaSolicitud = document.getElementById("btnGuardarSoloNotaSolicitud");

const detalleFechaCreacion = document.getElementById("detalleFechaCreacion");
const detalleFechaContactado = document.getElementById("detalleFechaContactado");
const detalleFechaCotizado = document.getElementById("detalleFechaCotizado");
const detalleFechaCierre = document.getElementById("detalleFechaCierre");

const contenedorToast = document.getElementById("contenedorToast");

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  if (!protegerPaginaAdmin()) {
    finalizarCargaAdmin();
    return;
  }

  try {
    aplicarPermisosVisuales();
    configurarBotonCerrarSesion();
    iniciarIndicadorSesion();

    inicializarModales();
    registrarEventos();

    await cargarSolicitudes();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar las solicitudes.", "danger");
  } finally {
    finalizarCargaAdmin();
  }
}

function inicializarModales() {
  if (modalDetalleSolicitudElemento && window.bootstrap) {
    modalDetalleSolicitud = new bootstrap.Modal(modalDetalleSolicitudElemento);
  }
}

function registrarEventos() {
  btnRecargarSolicitudes?.addEventListener("click", cargarSolicitudes);

  formFiltrosSolicitudes?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    await cargarSolicitudes();
  });

  busquedaSolicitud?.addEventListener("input", renderizarSolicitudes);
  filtroEstadoSolicitud?.addEventListener("change", cargarSolicitudes);

  cuerpoTablaSolicitudes?.addEventListener("click", manejarAccionesTabla);

  btnGuardarGestionSolicitud?.addEventListener("click", guardarGestionSolicitud);
  btnGuardarSoloNotaSolicitud?.addEventListener("click", guardarSoloNotaSolicitud);
}

async function cargarSolicitudes() {
  try {
    limpiarAlerta();

    cuerpoTablaSolicitudes.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          Cargando solicitudes...
        </td>
      </tr>
    `;

    textoCantidadSolicitudes.textContent = "Cargando solicitudes...";

    const parametros = {
      estado: filtroEstadoSolicitud.value,
      busqueda: busquedaSolicitud.value.trim(),
    };

    const respuesta = await obtenerSolicitudesAdmin(parametros);

    solicitudesOriginales = Array.isArray(respuesta) ? respuesta : [];

    actualizarContadores();
    renderizarSolicitudes();
  } catch (error) {
    cuerpoTablaSolicitudes.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          No fue posible cargar las solicitudes.
        </td>
      </tr>
    `;

    textoCantidadSolicitudes.textContent = "Error cargando solicitudes.";
    mostrarAlerta(error.message || "No fue posible cargar las solicitudes.");
  }
}

function renderizarSolicitudes() {
  const solicitudes = filtrarSolicitudesEnCliente();

  textoCantidadSolicitudes.textContent = `${solicitudes.length} solicitud(es) encontrada(s).`;

  if (!solicitudes.length) {
    cuerpoTablaSolicitudes.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          No hay solicitudes con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTablaSolicitudes.innerHTML = solicitudes
    .map((solicitud) => `
      <tr>
        <td>
          <div class="fw-semibold">${escaparHtml(solicitud.nombre)}</div>
          <div class="small text-muted">${escaparHtml(solicitud.telefono)}</div>
        </td>

        <td>
          ${escaparHtml(solicitud.vehiculo || "—")}
        </td>

        <td>
          ${escaparHtml(solicitud.categorias_texto || "—")}
        </td>

        <td class="text-center">
          ${Number(solicitud.cantidad || 1)}
        </td>

        <td class="text-center">
          ${construirBadgeEstado(solicitud.estado)}
        </td>

        <td class="text-center small">
          ${formatearFechaCorta(solicitud.creado_en)}
        </td>

        <td class="text-center">
          <div class="acciones-tabla">
            <button
              type="button"
              class="btn btn-icono"
              title="Ver detalle"
              data-accion="detalle"
              data-id="${solicitud.id}"
            >
              <i class="bi bi-eye"></i>
            </button>

            <a
              class="btn btn-icono"
              title="Abrir WhatsApp"
              href="${construirUrlWhatsApp(solicitud)}"
              target="_blank"
              rel="noopener"
            >
              <i class="bi bi-whatsapp"></i>
            </a>
          </div>
        </td>
      </tr>
    `)
    .join("");
}

function filtrarSolicitudesEnCliente() {
  const busqueda = normalizarTexto(busquedaSolicitud.value);

  if (!busqueda) {
    return solicitudesOriginales;
  }

  return solicitudesOriginales.filter((solicitud) => {
    const texto = normalizarTexto([
      solicitud.nombre,
      solicitud.telefono,
      solicitud.correo,
      solicitud.vehiculo,
      solicitud.categorias_texto,
      solicitud.mensaje,
      solicitud.estado,
    ].join(" "));

    return texto.includes(busqueda);
  });
}

function actualizarContadores() {
  const conteos = {
    nueva: 0,
    contactado: 0,
    cotizado: 0,
    cerrado: 0,
    descartado: 0,
  };

  solicitudesOriginales.forEach((solicitud) => {
    const estado = solicitud.estado || "nueva";

    if (conteos[estado] !== undefined) {
      conteos[estado] += 1;
    }
  });

  contadorNuevas.textContent = conteos.nueva;
  contadorContactadas.textContent = conteos.contactado;
  contadorCotizadas.textContent = conteos.cotizado;
  contadorCerradas.textContent = conteos.cerrado + conteos.descartado;
}

async function manejarAccionesTabla(evento) {
  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = Number(boton.dataset.id);

  if (!id) return;

  if (accion === "detalle") {
    await abrirDetalleSolicitud(id);
  }
}

async function abrirDetalleSolicitud(solicitudId) {
  try {
    const solicitud = await obtenerDetalleSolicitudAdmin(solicitudId);

    solicitudActual = solicitud;
    llenarDetalleSolicitud(solicitud);

    modalDetalleSolicitud?.show();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar el detalle.", "danger");
  }
}

function llenarDetalleSolicitud(solicitud) {
  solicitudIdActual.value = solicitud.id;

  tituloModalSolicitud.textContent = `Solicitud #${solicitud.id}`;
  subtituloModalSolicitud.textContent = `${formatearFechaCompleta(solicitud.creado_en)} · ${capitalizarEstado(solicitud.estado)}`;

  detalleNombre.textContent = solicitud.nombre || "—";
  detalleTelefono.textContent = solicitud.telefono || "—";
  detalleCorreo.textContent = solicitud.correo || "—";
  detallePreferencia.textContent = solicitud.preferencia_contacto === "correo"
    ? "Correo electrónico"
    : "WhatsApp";
  detalleVehiculo.textContent = solicitud.vehiculo || "—";
  detalleCategorias.textContent = solicitud.categorias_texto || "—";
  detalleCantidad.textContent = solicitud.cantidad || "—";
  detalleMensaje.textContent = solicitud.mensaje || "—";

  estadoSolicitud.value = solicitud.estado || "nueva";
  notaInternaSolicitud.value = solicitud.nota_interna || "";

  detalleFechaCreacion.textContent = formatearFechaCompleta(solicitud.creado_en);
  detalleFechaContactado.textContent = formatearFechaCompleta(solicitud.fecha_contactado);
  detalleFechaCotizado.textContent = formatearFechaCompleta(solicitud.fecha_cotizado);
  detalleFechaCierre.textContent = formatearFechaCompleta(solicitud.fecha_cierre);

  const urlWhatsApp = construirUrlWhatsApp(solicitud);

  if (urlWhatsApp) {
    enlaceWhatsApp.href = urlWhatsApp;
    enlaceWhatsApp.classList.remove("d-none");
  } else {
    enlaceWhatsApp.removeAttribute("href");
    enlaceWhatsApp.classList.add("d-none");
  }
}

async function guardarGestionSolicitud() {
  const solicitudId = Number(solicitudIdActual.value);

  if (!solicitudId) {
    mostrarToast("No se encontró la solicitud actual.", "danger");
    return;
  }

  try {
    btnGuardarGestionSolicitud.disabled = true;
    btnGuardarGestionSolicitud.textContent = "Guardando...";

    const payload = {
      estado: estadoSolicitud.value,
      nota_interna: notaInternaSolicitud.value.trim() || null,
    };

    const solicitud = await cambiarEstadoSolicitudAdmin(solicitudId, payload);

    solicitudActual = solicitud;
    llenarDetalleSolicitud(solicitud);

    mostrarToast("Gestión actualizada correctamente.", "success");

    await cargarSolicitudes();
  } catch (error) {
    mostrarToast(error.message || "No fue posible guardar la gestión.", "danger");
  } finally {
    btnGuardarGestionSolicitud.disabled = false;
    btnGuardarGestionSolicitud.textContent = "Guardar gestión";
  }
}

async function guardarSoloNotaSolicitud() {
  const solicitudId = Number(solicitudIdActual.value);

  if (!solicitudId) {
    mostrarToast("No se encontró la solicitud actual.", "danger");
    return;
  }

  try {
    btnGuardarSoloNotaSolicitud.disabled = true;
    btnGuardarSoloNotaSolicitud.textContent = "Guardando...";

    const payload = {
      nota_interna: notaInternaSolicitud.value.trim() || null,
    };

    const solicitud = await actualizarSolicitudAdmin(solicitudId, payload);

    solicitudActual = solicitud;
    llenarDetalleSolicitud(solicitud);

    mostrarToast("Nota interna guardada correctamente.", "success");

    await cargarSolicitudes();
  } catch (error) {
    mostrarToast(error.message || "No fue posible guardar la nota.", "danger");
  } finally {
    btnGuardarSoloNotaSolicitud.disabled = false;
    btnGuardarSoloNotaSolicitud.textContent = "Guardar solo nota";
  }
}

function construirBadgeEstado(estado) {
  const estadoNormalizado = estado || "nueva";

  const clases = {
    nueva: "text-bg-primary",
    contactado: "text-bg-info",
    cotizado: "text-bg-warning",
    cerrado: "text-bg-success",
    descartado: "text-bg-secondary",
  };

  return `
    <span class="badge ${clases[estadoNormalizado] || "text-bg-light"}">
      ${capitalizarEstado(estadoNormalizado)}
    </span>
  `;
}

function capitalizarEstado(estado) {
  const textos = {
    nueva: "Nueva",
    contactado: "Contactado",
    cotizado: "Cotizado",
    cerrado: "Cerrado",
    descartado: "Descartado",
  };

  return textos[estado] || "—";
}

function construirUrlWhatsApp(solicitud) {
  const telefono = String(solicitud.telefono || "").replace(/\D/g, "");

  if (!telefono) {
    return "";
  }

  const mensaje = [
    `Hola ${solicitud.nombre || ""}, te contactamos de Solo Culatas por tu solicitud de cotización.`,
    `Repuesto(s): ${solicitud.categorias_texto || "—"}.`,
    `Vehículo/motor: ${solicitud.vehiculo || "—"}.`,
  ].join(" ");

  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

function formatearFechaCorta(valor) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("es-CO", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(valor));
}

function formatearFechaCompleta(valor) {
  if (!valor) return "—";

  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor));
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlertaSolicitudes.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlertaSolicitudes.innerHTML = "";
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

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}