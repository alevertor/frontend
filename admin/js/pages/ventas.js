import {
  obtenerVentas,
  obtenerDetalleVenta,
  actualizarVenta,
  anularVenta,
} from "../api.js";

import {
  protegerPaginaAdmin,
  configurarBotonCerrarSesion,
  aplicarPermisosVisuales,
  usuarioEsAdmin,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

const ES_ADMIN = usuarioEsAdmin();

let ventasOriginales = [];
let ventasConDetalle = [];
let ventaActualDetalle = null;

const btnRecargarVentas = document.getElementById("btnRecargarVentas");

const formFiltrosVentas = document.getElementById("formFiltrosVentas");
const campoBusquedaVenta = document.getElementById("busquedaVenta");
const campoEstadoVenta = document.getElementById("estadoVenta");
const campoFechaDesde = document.getElementById("fechaDesde");
const campoFechaHasta = document.getElementById("fechaHasta");

const cuerpoTablaVentas = document.getElementById("cuerpoTablaVentas");
const textoCantidadVentas = document.getElementById("textoCantidadVentas");
const contenedorAlertaVentas = document.getElementById("contenedorAlertaVentas");

const resumenVentasRegistradas = document.getElementById("resumenVentasRegistradas");
const resumenVentasAnuladas = document.getElementById("resumenVentasAnuladas");
const resumenTotalRegistrado = document.getElementById("resumenTotalRegistrado");
const resumenTotalAnulado = document.getElementById("resumenTotalAnulado");

const modalDetalleVentaElemento = document.getElementById("modalDetalleVenta");
const modalEditarVentaElemento = document.getElementById("modalEditarVenta");
const modalAnularVentaElemento = document.getElementById("modalAnularVenta");

const modalDetalleVenta = new bootstrap.Modal(modalDetalleVentaElemento);
const modalEditarVenta = new bootstrap.Modal(modalEditarVentaElemento);
const modalAnularVenta = new bootstrap.Modal(modalAnularVentaElemento);

const detalleVentaSubtitulo = document.getElementById("detalleVentaSubtitulo");
const detalleVentaContenido = document.getElementById("detalleVentaContenido");

const formEditarVenta = document.getElementById("formEditarVenta");
const editarVentaId = document.getElementById("editarVentaId");
const editarFechaVenta = document.getElementById("editarFechaVenta");
const editarClienteNombre = document.getElementById("editarClienteNombre");
const editarClienteNit = document.getElementById("editarClienteNit");
const editarFacturaNumero = document.getElementById("editarFacturaNumero");
const editarObservaciones = document.getElementById("editarObservaciones");
const btnGuardarEdicionVenta = document.getElementById("btnGuardarEdicionVenta");

const formAnularVenta = document.getElementById("formAnularVenta");
const anularVentaId = document.getElementById("anularVentaId");
const motivoAnulacion = document.getElementById("motivoAnulacion");
const btnConfirmarAnularVenta = document.getElementById("btnConfirmarAnularVenta");

const contenedorToast = document.getElementById("contenedorToast");

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  if (!protegerPaginaAdmin()) {
    finalizarCargaAdmin();
    return;
  }

  try {
    aplicarPermisosVisuales();
    configurarBotonCerrarSesion("boton-cerrar-sesion");
    iniciarIndicadorSesion("infoSesionAdmin");

    registrarEventos();
    await cargarVentas();
  } catch (error) {
    console.error("Error iniciando ventas:", error);
    mostrarToast("No fue posible cargar las ventas.", "danger");
  } finally {
    finalizarCargaAdmin();
  }
}

function registrarEventos() {
  btnRecargarVentas?.addEventListener("click", cargarVentas);

  formFiltrosVentas?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    aplicarFiltrosYRenderizar();
  });

  [campoBusquedaVenta, campoEstadoVenta, campoFechaDesde, campoFechaHasta].forEach((campo) => {
    campo?.addEventListener("change", aplicarFiltrosYRenderizar);
  });

  campoBusquedaVenta?.addEventListener("input", aplicarFiltrosYRenderizar);

  cuerpoTablaVentas?.addEventListener("click", manejarAccionesTabla);

  if (ES_ADMIN) {
    formEditarVenta?.addEventListener("submit", manejarEditarVenta);
    formAnularVenta?.addEventListener("submit", manejarAnularVenta);

    [editarClienteNit, editarFacturaNumero].forEach((campo) => {
      campo?.addEventListener("input", () => {
        campo.value = limpiarSoloNumeros(campo.value);
      });
    });
  }
}

async function cargarVentas() {
  try {
    limpiarAlerta();

    cuerpoTablaVentas.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4">
          Cargando ventas...
        </td>
      </tr>
    `;

    textoCantidadVentas.textContent = "Cargando ventas...";

    ventasOriginales = await obtenerVentas();

    ventasConDetalle = await Promise.all(
      ventasOriginales.map(async (venta) => {
        try {
          const detalle = await obtenerDetalleVenta(venta.id);
          return normalizarVentaDetalle(detalle);
        } catch {
          return normalizarVentaDetalle({
            ...venta,
            items: [],
            auditoria_reciente: [],
          });
        }
      })
    );

    aplicarFiltrosYRenderizar();
  } catch (error) {
    cuerpoTablaVentas.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4 text-danger">
          No fue posible cargar las ventas.
        </td>
      </tr>
    `;

    textoCantidadVentas.textContent = "No fue posible cargar las ventas.";
    mostrarAlerta(error.message || "Error cargando ventas.");
  }
}

function normalizarVentaDetalle(venta) {
  const items = Array.isArray(venta.items) ? venta.items : [];
  const total = calcularTotalVenta(items);
  const cantidadItems = items.reduce((acumulado, item) => acumulado + Number(item.cantidad || 0), 0);
  const auditoria_reciente = Array.isArray(venta.auditoria_reciente) ? venta.auditoria_reciente : [];

  return {
    ...venta,
    items,
    total,
    cantidadItems,
    auditoria_reciente,
  };
}

function calcularTotalVenta(items) {
  return items.reduce((total, item) => {
    const cantidad = Number(item.cantidad || 0);
    const precio = Number(item.precio_unitario || 0);

    return total + cantidad * precio;
  }, 0);
}

function aplicarFiltrosYRenderizar() {
  const ventasFiltradas = filtrarVentas(ventasConDetalle);

  renderizarResumen(ventasConDetalle);
  renderizarTabla(ventasFiltradas);

  textoCantidadVentas.textContent = `${ventasFiltradas.length} venta(s) encontrada(s).`;
}

function filtrarVentas(ventas) {
  const busqueda = normalizarTexto(campoBusquedaVenta.value);
  const estado = campoEstadoVenta.value;
  const fechaDesde = campoFechaDesde.value;
  const fechaHasta = campoFechaHasta.value;

  return ventas.filter((venta) => {
    if (estado && venta.estado !== estado) {
      return false;
    }

    const fechaVenta = obtenerFechaInput(venta.fecha_venta);

    if (fechaDesde && fechaVenta < fechaDesde) {
      return false;
    }

    if (fechaHasta && fechaVenta > fechaHasta) {
      return false;
    }

    if (busqueda) {
      const textoVenta = normalizarTexto([
        venta.id,
        venta.cliente_nombre,
        venta.cliente_nit,
        venta.factura_numero,
        venta.estado,
        construirCodigoVentaPlano(venta),
        ...venta.items.map((item) => construirTextoBusquedaItem(item)),
      ].join(" "));

      if (!textoVenta.includes(busqueda)) {
        return false;
      }
    }

    return true;
  });
}

function construirTextoBusquedaItem(item) {
  return [
    item.variante_id,
    item.producto_nombre,
    item.nombre_variante,
    item.variante_principal,
    item.nombre_configuracion,
    item.codigo_interno,
    item.referencia_oem,
    item.marca_repuesto,
  ].filter(Boolean).join(" ");
}

function construirCodigoVentaPlano(venta) {
  return venta.items
    .map((item) => item.codigo_interno)
    .filter(Boolean)
    .join(" ");
}

function construirCodigoVenta(venta) {
  const codigos = venta.items
    .map((item) => item.codigo_interno)
    .filter(Boolean);

  if (!codigos.length) {
    return "—";
  }

  const codigosUnicos = [...new Set(codigos)];

  if (codigosUnicos.length === 1) {
    return escaparHtml(codigosUnicos[0]);
  }

  return `${escaparHtml(codigosUnicos[0])} +${codigosUnicos.length - 1}`;
}

function renderizarResumen(ventas) {
  const registradas = ventas.filter((venta) => venta.estado !== "anulada");
  const anuladas = ventas.filter((venta) => venta.estado === "anulada");

  const totalRegistrado = registradas.reduce((total, venta) => total + Number(venta.total || 0), 0);
  const totalAnulado = anuladas.reduce((total, venta) => total + Number(venta.total || 0), 0);

  resumenVentasRegistradas.textContent = registradas.length;
  resumenVentasAnuladas.textContent = anuladas.length;
  resumenTotalRegistrado.textContent = formatearMoneda(totalRegistrado);
  resumenTotalAnulado.textContent = formatearMoneda(totalAnulado);
}

function renderizarTabla(ventas) {
  if (!ventas.length) {
    cuerpoTablaVentas.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4 text-muted">
          No hay ventas con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTablaVentas.innerHTML = ventas
    .map((venta) => {
      const estaAnulada = venta.estado === "anulada";

      return `
        <tr class="${estaAnulada ? "fila-venta-anulada" : ""}">
          <td class="fw-semibold">#${venta.id}</td>

          <td>${formatearFechaCorta(venta.fecha_venta)}</td>

          <td>
            <div class="fw-semibold">${textoSeguro(venta.cliente_nombre)}</div>
            ${
              venta.observaciones
                ? `<div class="small text-muted">${escaparHtml(venta.observaciones)}</div>`
                : ""
            }
          </td>

          <td>${textoSeguro(venta.cliente_nit)}</td>

          <td>${textoSeguro(venta.factura_numero)}</td>

          <td class="text-center">${venta.cantidadItems || 0}</td>

          <td class="text-center">
            <span class="codigo-venta-tabla">${construirCodigoVenta(venta)}</span>
          </td>

          <td class="text-end">${formatearMoneda(venta.total)}</td>

          <td class="text-center">${construirBadgeEstadoVenta(venta)}</td>

          <td class="text-center">
            <div class="acciones-tabla acciones-ventas">
              <button
                type="button"
                class="btn btn-icono"
                title="Ver detalle"
                data-accion="ver"
                data-id="${venta.id}"
              >
                <i class="bi bi-eye"></i>
              </button>

              ${
                ES_ADMIN
                  ? `
                    <button
                      type="button"
                      class="btn btn-icono"
                      title="Editar venta"
                      data-accion="editar"
                      data-id="${venta.id}"
                      ${estaAnulada ? "disabled" : ""}
                    >
                      <i class="bi bi-pencil"></i>
                    </button>

                    <button
                      type="button"
                      class="btn btn-icono"
                      title="Anular venta"
                      data-accion="anular"
                      data-id="${venta.id}"
                      ${estaAnulada ? "disabled" : ""}
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                  `
                  : ""
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function construirBadgeEstadoVenta(venta) {
  if (venta.estado === "anulada") {
    return '<span class="badge text-bg-danger">Anulada</span>';
  }

  return '<span class="badge text-bg-success">Registrada</span>';
}

async function manejarAccionesTabla(evento) {
  const boton = evento.target.closest("[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;
  const ventaId = Number(boton.dataset.id);

  if (!ventaId) return;

  if (accion === "ver") {
    await abrirModalDetalle(ventaId);
    return;
  }

  if (!ES_ADMIN) {
    mostrarToast("No tienes permisos para esta acción.", "warning");
    return;
  }

  if (accion === "editar") {
    await abrirModalEditar(ventaId);
    return;
  }

  if (accion === "anular") {
    abrirModalAnular(ventaId);
  }
}

async function abrirModalDetalle(ventaId) {
  try {
    detalleVentaSubtitulo.textContent = `Venta #${ventaId}`;
    detalleVentaContenido.innerHTML = '<p class="text-muted mb-0">Cargando información...</p>';

    modalDetalleVenta.show();

    const detalle = normalizarVentaDetalle(await obtenerDetalleVenta(ventaId));
    ventaActualDetalle = detalle;

    detalleVentaContenido.innerHTML = construirDetalleVentaHtml(detalle);
  } catch (error) {
    detalleVentaContenido.innerHTML = `
      <div class="alert alert-danger mb-0">
        ${escaparHtml(error.message || "No fue posible cargar el detalle de la venta.")}
      </div>
    `;
  }
}

function construirDetalleVentaHtml(venta) {
  return `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        <div class="border rounded p-3 h-100">
          <h6 class="mb-3">Información de venta</h6>
          <div><strong>ID:</strong> #${venta.id}</div>
          <div><strong>Fecha:</strong> ${formatearFechaCompleta(venta.fecha_venta)}</div>
          <div><strong>Estado:</strong> ${venta.estado === "anulada" ? "Anulada" : "Registrada"}</div>
          <div><strong>Total:</strong> ${formatearMoneda(venta.total)}</div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="border rounded p-3 h-100">
          <h6 class="mb-3">Cliente</h6>
          <div><strong>Nombre:</strong> ${textoSeguro(venta.cliente_nombre)}</div>
          <div><strong>NIT / Documento:</strong> ${textoSeguro(venta.cliente_nit)}</div>
          <div><strong>Factura:</strong> ${textoSeguro(venta.factura_numero)}</div>
          <div><strong>Nota:</strong> ${textoSeguro(venta.observaciones)}</div>
        </div>
      </div>
    </div>

    ${
      venta.estado === "anulada"
        ? `
          <div class="alert alert-danger">
            <strong>Venta anulada.</strong><br>
            <strong>Fecha anulación:</strong> ${formatearFechaCompleta(venta.fecha_anulacion)}<br>
            <strong>Motivo:</strong> ${textoSeguro(venta.motivo_anulacion)}
          </div>
        `
        : ""
    }

    ${construirAuditoriaVenta(venta)}

    <section class="detalle-venta-items">
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
        <div>
          <h6 class="mb-1">Items vendidos</h6>
          <div class="text-muted small">${venta.items.length} item(s) en esta venta.</div>
        </div>

        <div class="detalle-venta-total">
          Total venta: ${formatearMoneda(venta.total)}
        </div>
      </div>

      ${
        venta.items.length
          ? venta.items.map((item) => construirTarjetaDetalleItemVenta(item)).join("")
          : `
            <div class="border rounded p-3 text-center text-muted">
              Esta venta no tiene items.
            </div>
          `
      }
    </section>
  `;
}

function construirTarjetaDetalleItemVenta(item) {
  const subtotal = Number(item.cantidad || 0) * Number(item.precio_unitario || 0);
  const tipoOferta = construirTipoOfertaItem(item);
  const urlInventario = `./inventario.html?variante_id=${encodeURIComponent(item.variante_id)}`;

  return `
    <article class="tarjeta-item-venta">
      <div class="tarjeta-item-venta-cuerpo">
        <div class="tarjeta-item-venta-info">
          <div class="item-venta-nombre">
            ${textoSeguro(item.producto_nombre || item.nombre_variante || `Variante #${item.variante_id}`)}
          </div>

          ${
            tipoOferta
              ? `<div class="item-venta-meta"><strong>Tipo:</strong> ${escaparHtml(tipoOferta)}</div>`
              : ""
          }

          ${
            item.codigo_interno
              ? `<div class="item-venta-meta"><strong>Código:</strong> ${escaparHtml(item.codigo_interno)}</div>`
              : ""
          }

          ${
            item.marca_repuesto
              ? `<div class="item-venta-meta"><strong>Marca:</strong> ${escaparHtml(item.marca_repuesto)}</div>`
              : ""
          }

          ${
            item.referencia_oem
              ? `<div class="item-venta-meta"><strong>OEM:</strong> ${escaparHtml(item.referencia_oem)}</div>`
              : ""
          }

          ${
            item.ubicacion
              ? `<div class="item-venta-meta"><strong>Ubicación:</strong> ${escaparHtml(item.ubicacion)}</div>`
              : ""
          }
        </div>

        <div class="tarjeta-item-venta-valores">
          <div class="item-venta-valor">
            <span>Cantidad</span>
            <strong>${item.cantidad}</strong>
          </div>

          ${
            ES_ADMIN
              ? `
                <div class="item-venta-valor">
                  <span>Costo unitario</span>
                  <strong>${
                    item.costo_unitario !== null && item.costo_unitario !== undefined
                      ? formatearMoneda(item.costo_unitario)
                      : "—"
                  }</strong>
                </div>
              `
              : ""
          }

          <div class="item-venta-valor">
            <span>Precio unitario</span>
            <strong>${formatearMoneda(item.precio_unitario)}</strong>
          </div>

          <div class="item-venta-valor item-venta-subtotal">
            <span>Subtotal</span>
            <strong>${formatearMoneda(subtotal)}</strong>
          </div>
        </div>
      </div>

      <div class="tarjeta-item-venta-footer">
        <a
          href="${urlInventario}"
          class="btn btn-outline-primary btn-sm"
          title="Ver esta variante en inventario"
        >
          Ver en inventario
        </a>
      </div>
    </article>
  `;
}

function construirTipoOfertaItem(item) {
  const partes = [];

  if (item.variante_principal) {
    partes.push(item.variante_principal);
  }

  if (item.nombre_configuracion) {
    partes.push(item.nombre_configuracion);
  }

  if (item.variante_secundaria) {
    partes.push(item.variante_secundaria);
  }

  return partes.join(" · ");
}

function construirAuditoriaVenta(venta) {
  const auditoria = Array.isArray(venta.auditoria_reciente) ? venta.auditoria_reciente : [];

  const bloqueCabecera = `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        ${
          ES_ADMIN
            ? `<div><strong>Creada por:</strong> ${textoSeguro(venta.creado_por_admin_nombre)}</div>`
            : ""
        }
        <div><strong>Fecha creación:</strong> ${formatearFechaCompleta(venta.creado_en)}</div>
      </div>

      <div class="col-md-6">
        ${
          ES_ADMIN && venta.anulado_por_admin_nombre
            ? `<div><strong>Anulada por:</strong> ${textoSeguro(venta.anulado_por_admin_nombre)}</div>`
            : ""
        }
        <div><strong>Última modificación:</strong> ${formatearFechaCompleta(venta.actualizado_en)}</div>
      </div>
    </div>
  `;

  const movimientos = auditoria.length
    ? auditoria.map((registro) => construirBloqueAuditoriaVenta(registro)).join("")
    : '<div class="text-muted">Todavía no hay movimientos de auditoría para esta venta.</div>';

  return `
    <section class="mb-4">
      <div class="border rounded p-3">
        <h6 class="mb-3">Auditoría</h6>
        ${bloqueCabecera}
        <div>
          <h6 class="mb-3">Movimientos recientes</h6>
          ${movimientos}
        </div>
      </div>
    </section>
  `;
}

function construirBloqueAuditoriaVenta(registro) {
  const titulo = obtenerTituloAccionAuditoriaVenta(registro.accion);
  const fecha = formatearFechaCompleta(registro.creado_en);
  const autor = registro.usuario_admin_nombre || "Sistema";
  const observacion = registro.observacion
    ? `<div class="small text-muted mb-2">${escaparHtml(registro.observacion)}</div>`
    : "";

  return `
    <div class="border rounded p-3 mb-3">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div><strong>${escaparHtml(titulo)}</strong></div>
        <div class="small text-muted">${fecha}</div>
      </div>

      ${
        ES_ADMIN
          ? `<div class="small mb-2"><strong>Por:</strong> ${escaparHtml(autor)}</div>`
          : ""
      }

      ${observacion}

      ${construirListaCambiosAuditoriaVenta(registro)}
    </div>
  `;
}

function obtenerTituloAccionAuditoriaVenta(accion) {
  const mapa = {
    crear: "Creación",
    actualizar: "Actualización",
    anular: "Anulación",
  };

  return mapa[String(accion || "").toLowerCase()] || String(accion || "Movimiento");
}

function obtenerEtiquetaCampoAuditoriaVenta(clave) {
  const mapa = {
    fecha_venta: "Fecha venta",
    cliente_nombre: "Cliente",
    cliente_nit: "NIT / Documento",
    factura_numero: "Factura",
    observaciones: "Nota",
    estado: "Estado",
    motivo_anulacion: "Motivo anulación",
    fecha_anulacion: "Fecha anulación",
  };

  return mapa[clave] || clave;
}

function formatearValorAuditoriaVenta(clave, valor) {
  if (clave === "estado") {
    if (valor === "registrada") return "Registrada";
    if (valor === "anulada") return "Anulada";
  }

  if (clave === "fecha_venta" || clave === "fecha_anulacion") {
    return formatearFechaCompleta(valor);
  }

  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return escaparHtml(String(valor));
}

function debeOcultarCampoAuditoriaVenta(clave, valorNuevo, registro) {
  if (!ES_ADMIN && clave === "motivo_anulacion" && !valorNuevo) {
    return true;
  }

  if (String(registro?.accion || "").toLowerCase() === "crear") {
    if (clave === "estado" && valorNuevo === "registrada") {
      return false;
    }
  }

  return false;
}

function construirListaCambiosAuditoriaVenta(registro) {
  const anteriores = registro.valores_anteriores || {};
  const nuevos = registro.valores_nuevos || {};
  const claves = Object.keys(nuevos);

  const esCreacion = String(registro.accion || "").toLowerCase() === "crear";

  const items = claves
    .map((clave) => {
      const valorAnterior = anteriores[clave];
      const valorNuevo = nuevos[clave];

      if (debeOcultarCampoAuditoriaVenta(clave, valorNuevo, registro)) {
        return "";
      }

      if (esCreacion) {
        return `
          <li>
            <strong>${escaparHtml(obtenerEtiquetaCampoAuditoriaVenta(clave))}:</strong>
            ${formatearValorAuditoriaVenta(clave, valorNuevo)}
          </li>
        `;
      }

      return `
        <li>
          <strong>${escaparHtml(obtenerEtiquetaCampoAuditoriaVenta(clave))}:</strong>
          ${formatearValorAuditoriaVenta(clave, valorAnterior)} → ${formatearValorAuditoriaVenta(clave, valorNuevo)}
        </li>
      `;
    })
    .filter(Boolean);

  if (!items.length) {
    return '<div class="text-muted small">Sin cambios detallados.</div>';
  }

  return `
    <ul class="lista-detalle-variante mb-0">
      ${items.join("")}
    </ul>
  `;
}

async function abrirModalEditar(ventaId) {
  if (!ES_ADMIN) {
    mostrarToast("No tienes permisos para editar ventas.", "warning");
    return;
  }

  try {
    const detalle = normalizarVentaDetalle(await obtenerDetalleVenta(ventaId));

    if (detalle.estado === "anulada") {
      mostrarToast("No puedes editar una venta anulada.", "warning");
      return;
    }

    editarVentaId.value = detalle.id;
    editarFechaVenta.value = obtenerFechaInput(detalle.fecha_venta);
    editarClienteNombre.value = detalle.cliente_nombre || "";
    editarClienteNit.value = detalle.cliente_nit || "";
    editarFacturaNumero.value = detalle.factura_numero || "";
    editarObservaciones.value = detalle.observaciones || "";

    modalEditarVenta.show();
  } catch (error) {
    mostrarToast(error.message || "No fue posible cargar la venta.", "danger");
  }
}

async function manejarEditarVenta(evento) {
  evento.preventDefault();

  if (!ES_ADMIN) {
    mostrarToast("No tienes permisos para editar ventas.", "warning");
    return;
  }

  const ventaId = Number(editarVentaId.value);

  if (!ventaId) {
    mostrarToast("No se encontró la venta a editar.", "danger");
    return;
  }

  try {
    btnGuardarEdicionVenta.disabled = true;
    btnGuardarEdicionVenta.textContent = "Guardando...";

    const payload = {
      fecha_venta: `${editarFechaVenta.value}T00:00:00`,
      cliente_nombre: editarClienteNombre.value.trim(),
      cliente_nit: limpiarSoloNumeros(editarClienteNit.value) || null,
      factura_numero: limpiarSoloNumeros(editarFacturaNumero.value) || null,
      observaciones: editarObservaciones.value.trim() || null,
    };

    await actualizarVenta(ventaId, payload);

    modalEditarVenta.hide();
    mostrarToast("Venta actualizada correctamente.", "success");

    await cargarVentas();
  } catch (error) {
    mostrarToast(error.message || "No fue posible actualizar la venta.", "danger");
  } finally {
    btnGuardarEdicionVenta.disabled = false;
    btnGuardarEdicionVenta.textContent = "Guardar cambios";
  }
}

function abrirModalAnular(ventaId) {
  if (!ES_ADMIN) {
    mostrarToast("No tienes permisos para anular ventas.", "warning");
    return;
  }

  const venta = ventasConDetalle.find((item) => Number(item.id) === Number(ventaId));

  if (!venta) {
    mostrarToast("No se encontró la venta a anular.", "danger");
    return;
  }

  if (venta.estado === "anulada") {
    mostrarToast("Esta venta ya está anulada.", "warning");
    return;
  }

  anularVentaId.value = venta.id;
  motivoAnulacion.value = "";

  modalAnularVenta.show();
}

async function manejarAnularVenta(evento) {
  evento.preventDefault();

  if (!ES_ADMIN) {
    mostrarToast("No tienes permisos para anular ventas.", "warning");
    return;
  }

  const ventaId = Number(anularVentaId.value);

  if (!ventaId) {
    mostrarToast("No se encontró la venta a anular.", "danger");
    return;
  }

  try {
    btnConfirmarAnularVenta.disabled = true;
    btnConfirmarAnularVenta.textContent = "Anulando...";

    const payload = {
      motivo_anulacion: motivoAnulacion.value.trim(),
    };

    await anularVenta(ventaId, payload);

    modalAnularVenta.hide();
    mostrarToast("Venta anulada correctamente. El stock fue devuelto.", "success");

    await cargarVentas();
  } catch (error) {
    mostrarToast(error.message || "No fue posible anular la venta.", "danger");
  } finally {
    btnConfirmarAnularVenta.disabled = false;
    btnConfirmarAnularVenta.textContent = "Anular venta";
  }
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlertaVentas.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlertaVentas.innerHTML = "";
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

function limpiarSoloNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obtenerFechaInput(fecha) {
  if (!fecha) return "";

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return "";
  }

  const anio = fechaObj.getFullYear();
  const mes = String(fechaObj.getMonth() + 1).padStart(2, "0");
  const dia = String(fechaObj.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearFechaCorta(fecha) {
  if (!fecha) return "—";

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return "—";
  }

  return fechaObj.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatearFechaCompleta(fecha) {
  if (!fecha) return "—";

  const fechaObj = new Date(fecha);

  if (Number.isNaN(fechaObj.getTime())) {
    return "—";
  }

  return fechaObj.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearMoneda(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
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