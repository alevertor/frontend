import {
  obtenerCategoriasPublicas,
  obtenerMarcasPublicas,
  obtenerInventarioVariantes,
  obtenerDetalleVariante,
  crearVenta,
} from "../api.js";

import {
  protegerPaginaAdmin,
  configurarBotonCerrarSesion,
  aplicarPermisosVisuales,
  usuarioEsAdmin,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const ES_ADMIN = usuarioEsAdmin();
const COLUMNAS_TABLA_INVENTARIO = ES_ADMIN ? 10 : 9;

const parametrosUrl = new URLSearchParams(window.location.search);
const varianteIdInicial = parametrosUrl.get("variante_id");

let paginaActual = 1;
let itemVentaActual = null;
let varianteIdPendienteEnfoque = varianteIdInicial ? Number(varianteIdInicial) : null;

let ultimaPaginacion = {
  pagina: 1,
  tamano: 20,
  total: 0,
  total_paginas: 0,
};

const formularioFiltros = document.getElementById("formulario-filtros");
const botonLimpiarFiltros = document.getElementById("boton-limpiar-filtros");
const botonAnadirProducto = document.getElementById("boton-anadir-producto");
const botonAnterior = document.getElementById("boton-anterior");
const botonSiguiente = document.getElementById("boton-siguiente");
const botonBuscarInventario = formularioFiltros?.querySelector('button[type="submit"]');
const contenedorTablaInventario = document.getElementById("contenedor-tabla-inventario");

const cuerpoTabla = document.getElementById("cuerpo-tabla-inventario");
const contenedorAlerta = document.getElementById("contenedor-alerta");

const resumenTotalVariantes = document.getElementById("resumen-total-variantes");
const resumenStockTotal = document.getElementById("resumen-stock-total");
const resumenCostoTotal = document.getElementById("resumen-costo-total");
const resumenVentaTotal = document.getElementById("resumen-venta-total");

const textoPaginacion = document.getElementById("texto-paginacion");
const textoTotalRegistros = document.getElementById("texto-total-registros");
const textoPaginaActual = document.getElementById("texto-pagina-actual");

const campoBusqueda = document.getElementById("busqueda");
const campoCategoria = document.getElementById("categoria_id");
const campoMarca = document.getElementById("marca_id");
const campoVariantePrincipal = document.getElementById("variante_principal");
const campoUbicacion = document.getElementById("ubicacion");
const campoOrdenarPor = document.getElementById("ordenar_por");
const campoDireccion = document.getElementById("direccion");
const campoTamano = document.getElementById("tamano");
const campoSoloDisponibles = document.getElementById("solo_disponibles");
const campoSoloActivas = document.getElementById("solo_activas");

const formularioVentaRapida = document.getElementById("formulario-venta-rapida");
const campoVentaProducto = document.getElementById("venta-producto");
const campoVentaVariante = document.getElementById("venta-variante");
const campoVentaCantidad = document.getElementById("venta-cantidad");
const campoVentaFecha = document.getElementById("venta-fecha");
const campoVentaCliente = document.getElementById("venta-cliente");
const campoVentaNit = document.getElementById("venta-nit");
const campoVentaFactura = document.getElementById("venta-factura");
const campoVentaVarianteId = document.getElementById("venta-variante-id");
const botonConfirmarVenta = document.getElementById("boton-confirmar-venta");

const textoVentaStockDisponible = document.getElementById("venta-stock-disponible");
const textoVentaPrecioUnitario = document.getElementById("venta-precio-unitario");
const textoVentaTotalEstimado = document.getElementById("venta-total-estimado");
const alertaVentaCantidad = document.getElementById("venta-alerta-cantidad");

const modalVentaRapidaElemento = document.getElementById("modal-venta-rapida");
const modalVentaRapida = modalVentaRapidaElemento
  ? new bootstrap.Modal(modalVentaRapidaElemento)
  : null;

const modalDetalleVarianteElemento = document.getElementById("modalDetalleVariante");
const contenedorDetalleVariante = document.getElementById("detalle-variante-contenido");
const modalDetalleVariante = modalDetalleVarianteElemento
  ? new bootstrap.Modal(modalDetalleVarianteElemento)
  : null;

function prepararPermisosInventario() {
  aplicarPermisosVisuales();

  if (!ES_ADMIN) {
    const opcionCosto = campoOrdenarPor?.querySelector('option[value="costo"]');

    if (opcionCosto) {
      opcionCosto.remove();
    }

    if (campoOrdenarPor?.value === "costo") {
      campoOrdenarPor.value = "nombre_producto";
    }
  }
}

function prepararEstilosEnfoqueInventario() {
  if (document.getElementById("estilos-enfoque-inventario")) {
    return;
  }

  const estilos = document.createElement("style");
  estilos.id = "estilos-enfoque-inventario";

  estilos.textContent = `
    .fila-inventario-destacada {
      outline: 2px solid var(--color-azul-marca);
      outline-offset: -2px;
      background-color: rgba(13, 110, 253, 0.08) !important;
      transition: background-color 0.3s ease, outline-color 0.3s ease;
    }

    .fila-inventario-destacada td {
      background-color: rgba(13, 110, 253, 0.08) !important;
    }
  `;

  document.head.appendChild(estilos);
}

function formatearMoneda(valor) {
  const numero = Number(valor || 0);

  return numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function escaparHtml(texto) {
  if (texto === null || texto === undefined) {
    return "";
  }

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(texto) {
  return escaparHtml(texto).replaceAll("\n", " ");
}

function decodificarHtmlBasico(texto) {
  return String(texto ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function limpiarSoloNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function textoSeguro(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return escaparHtml(valor);
}

function mostrarAlerta(mensaje, tipo = "danger") {
  contenedorAlerta.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${escaparHtml(mensaje)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarAlerta() {
  contenedorAlerta.innerHTML = "";
}

function mostrarAlertaVentaRapida(mensaje, tipo = "danger") {
  if (!alertaVentaCantidad) {
    mostrarAlerta(mensaje, tipo);
    return;
  }

  alertaVentaCantidad.className = `alert alert-${tipo} py-2 px-3 small`;
  alertaVentaCantidad.textContent = mensaje;
}

function limpiarAlertaVentaRapida() {
  if (!alertaVentaCantidad) return;

  alertaVentaCantidad.textContent = "";
  alertaVentaCantidad.className = "alert alert-warning py-2 px-3 small d-none";
}

function construirEstado(variante) {
  const badges = [];

  if (!variante.activa) {
    badges.push('<span class="badge text-bg-secondary">Inactiva</span>');
  } else {
    badges.push('<span class="badge text-bg-success">Activa</span>');
  }

  if (variante.es_predeterminada) {
    badges.push('<span class="badge text-bg-primary">Predeterminada</span>');
  }

  if (Number(variante.stock) === 0) {
    badges.push('<span class="badge text-bg-danger">Agotado</span>');
  } else if (
    variante.stock_minimo !== null &&
    variante.stock_minimo !== undefined &&
    Number(variante.stock) <= Number(variante.stock_minimo)
  ) {
    badges.push('<span class="badge text-bg-warning">Stock bajo</span>');
  }

  return `<div class="badges-estado">${badges.join("")}</div>`;
}

function construirTipoOferta(item) {
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

  if (!partes.length && item.detalle_admin) {
    return escaparHtml(item.detalle_admin);
  }

  return escaparHtml(partes.join(" · "));
}

function construirIncluyeOferta(item) {
  const textoIncluye = item.incluye || item.nombre_variante || "";

  if (!textoIncluye) {
    return "";
  }

  return `Incluye: ${escaparHtml(textoIncluye)}`;
}

function construirMetaInventario(item) {
  if (!item.referencia_oem) {
    return "";
  }

  return `OEM: ${escaparHtml(item.referencia_oem)}`;
}

function dividirTextoMultiple(valor) {
  if (!valor) {
    return [];
  }

  return String(valor)
    .split(/[\s,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dividirTextoLista(valor) {
  if (!valor) {
    return [];
  }

  return String(valor)
    .split(/\n|;|\|/)
    .flatMap((parte) => parte.split("•"))
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderizarListaTexto(valor) {
  const items = dividirTextoLista(valor);

  if (!items.length) {
    return "—";
  }

  if (items.length === 1) {
    return escaparHtml(items[0]);
  }

  return `
    <ul class="lista-detalle-variante">
      ${items.map((item) => `<li>${escaparHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function formatearFechaHora(valor) {
  if (!valor) {
    return "—";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  return fecha.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatearValorAuditoria(clave, valor, detalle = null) {
  if (clave === "activa") {
    return valor ? "Activa" : "Inactiva";
  }

  if (clave === "configuracion_id") {
    const nombreConfiguracion = detalle?.nombre_configuracion || "";

    if (nombreConfiguracion) {
      return escaparHtml(nombreConfiguracion);
    }

    return "Sin configuración";
  }

  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  const camposMoneda = new Set(["precio", "costo"]);

  if (camposMoneda.has(clave) && typeof valor === "number") {
    return formatearMoneda(valor);
  }

  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }

  return escaparHtml(String(valor));
}

function obtenerEtiquetaCampoAuditoria(clave) {
  const etiquetas = {
    nombre: "Nombre",
    configuracion_id: "Configuración",
    variante_principal: "Tipo",
    variante_secundaria: "Detalle adicional",
    marca_repuesto: "Marca repuesto",
    incluye: "Incluye",
    paquete: "Paquete",
    condicion: "Condición",
    codigo_interno: "Código interno",
    sku: "SKU",
    referencia_oem: "Referencia OEM",
    precio: "Precio",
    costo: "Costo",
    stock: "Stock",
    stock_minimo: "Stock mínimo",
    ubicacion: "Ubicación",
    activa: "Estado",
    es_predeterminada: "Predeterminada",
    publicar_merchant: "Publicar Merchant",
  };

  return etiquetas[clave] || clave;
}

function obtenerTituloAccionAuditoria(accion) {
  const accionNormalizada = String(accion || "").toLowerCase();

  const mapa = {
    crear: "Creación",
    actualizar: "Actualización",
    desactivar: "Desactivación",
    activar: "Activación",
    actualizar_inventario: "Actualización",
  };

  return mapa[accionNormalizada] || escaparHtml(String(accion || "Movimiento"));
}

function esRegistroCreacion(registro) {
  return String(registro?.accion || "").toLowerCase() === "crear";
}

function debeOcultarCampoAuditoria(clave, valorNuevo, registro) {
  const clavesTecnicas = new Set([
    "id",
    "producto_id",
    "slug",
    "titulo_seo",
    "resumen_seo",
    "descripcion_merchant",
    "creado_en",
    "actualizado_en",
    "creado_por_id",
    "actualizado_por_id",
  ]);

  if (clavesTecnicas.has(clave)) {
    return true;
  }

  if (!ES_ADMIN && clave === "costo") {
    return true;
  }

  if (esRegistroCreacion(registro)) {
    if (clave === "condicion" && String(valorNuevo || "").toLowerCase() === "nuevo") {
      return true;
    }

    if (clave === "es_predeterminada" && valorNuevo === false) {
      return true;
    }

    if (clave === "publicar_merchant" && valorNuevo === false) {
      return true;
    }

    if (clave === "configuracion_id" && (valorNuevo === null || valorNuevo === undefined || valorNuevo === "")) {
      return true;
    }
  }

  return false;
}

function construirLineaCambioAuditoria(clave, valorAnterior, valorNuevo, registro, detalle) {
  if (debeOcultarCampoAuditoria(clave, valorNuevo, registro)) {
    return "";
  }

  const etiqueta = escaparHtml(obtenerEtiquetaCampoAuditoria(clave));

  if (esRegistroCreacion(registro)) {
    return `
      <li>
        <strong>${etiqueta}:</strong> ${formatearValorAuditoria(clave, valorNuevo, detalle)}
      </li>
    `;
  }

  return `
    <li>
      <strong>${etiqueta}:</strong>
      ${formatearValorAuditoria(clave, valorAnterior, detalle)} → ${formatearValorAuditoria(clave, valorNuevo, detalle)}
    </li>
  `;
}

function construirListaCambiosAuditoria(registro, detalle) {
  const anteriores = registro.valores_anteriores || {};
  const nuevos = registro.valores_nuevos || {};
  const claves = Object.keys(nuevos);

  const items = claves
    .map((clave) =>
      construirLineaCambioAuditoria(
        clave,
        anteriores[clave],
        nuevos[clave],
        registro,
        detalle
      )
    )
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

function construirCabeceraAuditoria(detalle) {
  const bloqueCreadoPor = ES_ADMIN
    ? `<div><strong>Creado por:</strong> ${textoSeguro(detalle.creado_por_nombre)}</div>`
    : "";

  const bloqueActualizadoPor = ES_ADMIN
    ? `<div><strong>Última modificación por:</strong> ${textoSeguro(detalle.actualizado_por_nombre)}</div>`
    : "";

  return `
    <div class="row g-3 mb-3">
      <div class="col-md-6">
        ${bloqueCreadoPor}
        <div><strong>Fecha creación:</strong> ${textoSeguro(formatearFechaHora(detalle.creado_en))}</div>
      </div>

      <div class="col-md-6">
        ${bloqueActualizadoPor}
        <div><strong>Última modificación:</strong> ${textoSeguro(formatearFechaHora(detalle.actualizado_en))}</div>
      </div>
    </div>
  `;
}

function construirBloqueRegistroAuditoria(registro, detalle) {
  const fecha = formatearFechaHora(registro.creado_en);
  const tituloAccion = obtenerTituloAccionAuditoria(registro.accion);
  const mostrarAutor = ES_ADMIN;
  const usuario = registro.usuario_admin_nombre || "Sistema";

  const bloqueAutor = mostrarAutor
    ? `<div class="small mb-2"><strong>Por:</strong> ${escaparHtml(usuario)}</div>`
    : "";

  const observacion = registro.observacion
    ? `<div class="small text-muted mb-2">${escaparHtml(registro.observacion)}</div>`
    : "";

  return `
    <div class="border rounded p-3 mb-3">
      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
        <div>
          <strong>${tituloAccion}</strong>
        </div>
        <div class="small text-muted">${fecha}</div>
      </div>

      ${bloqueAutor}
      ${observacion}
      ${construirListaCambiosAuditoria(registro, detalle)}
    </div>
  `;
}

function construirAuditoriaVariante(detalle) {
  const auditoriaReciente = Array.isArray(detalle.auditoria_reciente)
    ? detalle.auditoria_reciente
    : [];

  const auditoriaHtml = auditoriaReciente.length
    ? auditoriaReciente
        .map((registro) => construirBloqueRegistroAuditoria(registro, detalle))
        .join("")
    : '<div class="text-muted">Todavía no hay movimientos de auditoría para esta variante.</div>';

  return `
    <div class="row g-3 mt-1">
      <div class="col-12">
        <div class="border rounded p-3">
          <h6 class="mb-3">Auditoría</h6>

          ${construirCabeceraAuditoria(detalle)}

          <div>
            <h6 class="mb-3">Movimientos recientes</h6>
            ${auditoriaHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function construirUbicacion(valor) {
  const ubicaciones = dividirTextoMultiple(valor);

  if (!ubicaciones.length) {
    return '<span class="text-muted">—</span>';
  }

  return `
    <div class="lista-ubicaciones-inventario">
      ${ubicaciones
        .map((ubicacion) => `<span>${escaparHtml(ubicacion)}</span>`)
        .join("")}
    </div>
  `;
}

function construirRutaImagen(item) {
  if (!item.imagen_principal_url) {
    return null;
  }

  if (String(item.imagen_principal_url).startsWith("http")) {
    return item.imagen_principal_url;
  }

  return `${URL_BASE_BACKEND}${item.imagen_principal_url}`;
}

function construirAltImagen(item) {
  return (
    item.imagen_principal_alt ||
    item.nombre_producto ||
    "Imagen del producto"
  );
}

function construirImagenInventario(item) {
  const rutaImagen = construirRutaImagen(item);

  if (!rutaImagen) {
    return '<div class="imagen-placeholder-inventario">IMG</div>';
  }

  return `
    <div class="imagen-inventario-contenedor">
      <img
        src="${escaparAtributo(rutaImagen)}"
        alt="${escaparAtributo(construirAltImagen(item))}"
        class="imagen-inventario"
        loading="lazy"
        onerror="this.classList.add('d-none'); this.nextElementSibling.classList.remove('d-none');"
      >
      <div class="imagen-placeholder-inventario d-none">IMG</div>
    </div>
  `;
}

function construirStock(item) {
  const stock = Number(item.stock || 0);
  let clase = "";

  if (stock === 0) {
    clase = "agotado";
  } else if (
    item.stock_minimo !== null &&
    item.stock_minimo !== undefined &&
    stock <= Number(item.stock_minimo)
  ) {
    clase = "bajo";
  }

  return `<span class="numero-stock ${clase}">${stock}</span>`;
}

function construirItemVentaSeguro(item) {
  return {
    id: item.id,
    producto_id: item.producto_id,
    nombre_producto: item.nombre_producto,
    nombre_variante: item.nombre_variante,
    variante_principal: item.variante_principal,
    variante_secundaria: item.variante_secundaria,
    nombre_configuracion: item.nombre_configuracion,
    incluye: item.incluye,
    stock: item.stock,
    precio: item.precio,
  };
}

function renderizarTabla(items) {
  if (!items.length) {
    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="${COLUMNAS_TABLA_INVENTARIO}" class="text-center py-4 text-muted">
          No se encontraron variantes con los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  cuerpoTabla.innerHTML = items
    .map((item) => {
      const tipoOferta = construirTipoOferta(item);
      const incluyeOferta = construirIncluyeOferta(item);
      const metaInventario = construirMetaInventario(item);
      const itemVenta = construirItemVentaSeguro(item);

      return `
        <tr data-variante-fila="${item.id}">
          <td class="text-center">
            ${construirImagenInventario(item)}
          </td>

          <td>
            <div class="bloque-descripcion">
              <div class="texto-descripcion-principal">
                ${escaparHtml(item.nombre_producto || "—")}
              </div>

              ${
                tipoOferta
                  ? `<div class="texto-descripcion-secundaria">Tipo: ${tipoOferta}</div>`
                  : ""
              }

              ${
                incluyeOferta
                  ? `<div class="texto-meta-descripcion">${incluyeOferta}</div>`
                  : ""
              }

              ${
                metaInventario
                  ? `<div class="texto-meta-descripcion">${metaInventario}</div>`
                  : ""
              }
            </div>
          </td>

          <td class="text-center">
            ${textoSeguro(item.marca_repuesto)}
          </td>

          <td class="text-center">
            ${textoSeguro(item.codigo_interno)}
          </td>

          <td class="text-center">
            ${construirStock(item)}
          </td>

          ${
            ES_ADMIN
              ? `
                <td class="text-center">
                  ${
                    item.costo !== null && item.costo !== undefined
                      ? formatearMoneda(item.costo)
                      : "—"
                  }
                </td>
              `
              : ""
          }

          <td class="text-center">
            ${formatearMoneda(item.precio)}
          </td>

          <td class="text-center">
            ${construirUbicacion(item.ubicacion)}
          </td>

          <td class="text-center">
            ${construirEstado(item)}
          </td>

          <td class="text-center">
            <div class="acciones-tabla acciones-inventario">
              <button
                type="button"
                class="btn btn-icono"
                title="Ver detalle"
                data-accion="ver"
                data-id="${item.id}"
              >
                <i class="bi bi-eye"></i>
              </button>

              ${
                ES_ADMIN
                  ? `
                    <button
                      type="button"
                      class="btn btn-icono"
                      title="Editar en producto"
                      data-accion="editar"
                      data-producto-id="${item.producto_id}"
                      data-variante-id="${item.id}"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                class="btn btn-icono"
                title="Venta rápida"
                data-accion="venta"
                data-item='${escaparAtributo(JSON.stringify(itemVenta))}'
              >
                <i class="bi bi-lightning-charge"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderizarResumen(resumen) {
  resumenTotalVariantes.textContent = resumen.total_variantes ?? 0;
  resumenStockTotal.textContent = resumen.stock_total ?? 0;

  if (resumenCostoTotal) {
    resumenCostoTotal.textContent = formatearMoneda(resumen.costo_total);
  }

  resumenVentaTotal.textContent = formatearMoneda(resumen.venta_total);
}

function renderizarPaginacion(paginacion) {
  ultimaPaginacion = paginacion;

  const totalPaginas = paginacion.total_paginas || 1;

  textoPaginaActual.textContent = `Página ${paginacion.pagina} de ${totalPaginas}`;

  textoPaginacion.textContent = `Mostrando ${Math.min(
    paginacion.tamano,
    Math.max(paginacion.total - (paginacion.pagina - 1) * paginacion.tamano, 0)
  )} resultados en esta página.`;

  textoTotalRegistros.textContent = `Total registros: ${paginacion.total}`;

  botonAnterior.disabled = paginacion.pagina <= 1;
  botonSiguiente.disabled =
    paginacion.total_paginas === 0 || paginacion.pagina >= paginacion.total_paginas;
}

function activarCargaTablaInventario(mensaje = "Actualizando inventario...") {
  const tieneFilasReales = cuerpoTabla?.querySelector("tr[data-variante-fila]");

  if (!tieneFilasReales) {
    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="${COLUMNAS_TABLA_INVENTARIO}" class="text-center py-4 text-muted">
          ${escaparHtml(mensaje)}
        </td>
      </tr>
    `;
  }

  const textoCarga = contenedorTablaInventario?.querySelector("[data-texto-carga-tabla]");

  if (textoCarga) {
    textoCarga.textContent = mensaje;
  }

  contenedorTablaInventario?.classList.add("tabla-admin-contenedor-cargando");
  contenedorTablaInventario?.querySelector(".tabla-admin-overlay")?.setAttribute("aria-hidden", "false");
  actualizarControlesCargaInventario(true);
}

function desactivarCargaTablaInventario() {
  contenedorTablaInventario?.classList.remove("tabla-admin-contenedor-cargando");
  contenedorTablaInventario?.querySelector(".tabla-admin-overlay")?.setAttribute("aria-hidden", "true");
  actualizarControlesCargaInventario(false);
  restaurarEstadoPaginacionInventario();
}

function actualizarControlesCargaInventario(cargando) {
  const controles = [
    botonLimpiarFiltros,
    botonAnterior,
    botonSiguiente,
    botonBuscarInventario,
  ];

  controles.forEach((control) => {
    if (control) {
      control.disabled = cargando;
    }
  });
}

function restaurarEstadoPaginacionInventario() {
  botonAnterior.disabled = paginaActual <= 1;
  botonSiguiente.disabled =
    ultimaPaginacion.total_paginas === 0 || paginaActual >= ultimaPaginacion.total_paginas;
}

function obtenerParametrosFiltros() {
  return {
    busqueda: campoBusqueda.value.trim(),
    categoria_id: campoCategoria.value || null,
    marca_id: campoMarca.value || null,
    variante_principal: campoVariantePrincipal.value || null,
    ubicacion: campoUbicacion.value.trim() || null,
    ordenar_por: campoOrdenarPor.value,
    direccion: campoDireccion.value,
    tamano: Number(campoTamano.value),
    pagina: paginaActual,
    solo_disponibles: campoSoloDisponibles.checked,
    activa: campoSoloActivas.checked ? true : null,
  };
}

async function cargarInventario(mensajeCarga = "Actualizando inventario...") {
  activarCargaTablaInventario(mensajeCarga);

  try {
    limpiarAlerta();

    const parametros = obtenerParametrosFiltros();
    const respuesta = await obtenerInventarioVariantes(parametros);

    renderizarTabla(respuesta.items);
    renderizarResumen(respuesta.resumen);
    renderizarPaginacion(respuesta.paginacion);

    aplicarEnfoqueVarianteDesdeUrl();
  } catch (error) {
    cuerpoTabla.innerHTML = `
      <tr>
        <td colspan="${COLUMNAS_TABLA_INVENTARIO}" class="text-center py-4 text-danger">
          No fue posible cargar el inventario.
        </td>
      </tr>
    `;

    mostrarAlerta(error.message || "Error cargando inventario.");
  } finally {
    desactivarCargaTablaInventario();
  }
}

async function aplicarEnfoqueVarianteDesdeUrl() {
  const varianteId = varianteIdPendienteEnfoque;

  if (!varianteId) {
    return;
  }

  varianteIdPendienteEnfoque = null;

  setTimeout(() => {
    const fila = document.querySelector(`[data-variante-fila="${varianteId}"]`);

    if (fila) {
      fila.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      fila.classList.add("fila-inventario-destacada");

      setTimeout(() => {
        fila.classList.remove("fila-inventario-destacada");
      }, 4500);
    }
  }, 250);

  await abrirDetalleVariante(varianteId);
}

function obtenerFechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function construirTextoOfertaPlano(item) {
  const tipoOferta = decodificarHtmlBasico(construirTipoOferta(item));
  const incluyeOferta = item.incluye || item.nombre_variante || "";

  return [
    tipoOferta,
    incluyeOferta,
  ]
    .filter(Boolean)
    .join(" · ");
}

function actualizarResumenVentaRapida() {
  if (!itemVentaActual) {
    textoVentaStockDisponible.textContent = "0";
    textoVentaPrecioUnitario.textContent = formatearMoneda(0);
    textoVentaTotalEstimado.textContent = formatearMoneda(0);
    alertaVentaCantidad?.classList.add("d-none");
    botonConfirmarVenta.disabled = false;
    return;
  }

  const stockDisponible = Number(itemVentaActual.stock || 0);
  const precioUnitario = Number(itemVentaActual.precio || 0);
  const cantidad = Number(campoVentaCantidad.value || 0);
  const total = cantidad > 0 ? cantidad * precioUnitario : 0;
  const cantidadInvalida = cantidad <= 0 || cantidad > stockDisponible || stockDisponible <= 0;

  textoVentaStockDisponible.textContent = stockDisponible;
  textoVentaPrecioUnitario.textContent = formatearMoneda(precioUnitario);
  textoVentaTotalEstimado.textContent = formatearMoneda(total);

  if (alertaVentaCantidad) {
    if (cantidad > stockDisponible && stockDisponible >= 0) {
      alertaVentaCantidad.textContent = "La cantidad supera el stock disponible.";
      alertaVentaCantidad.classList.remove("d-none");
    } else if (stockDisponible <= 0) {
      alertaVentaCantidad.textContent = "Esta variante no tiene stock disponible.";
      alertaVentaCantidad.classList.remove("d-none");
    } else {
      alertaVentaCantidad.classList.add("d-none");
    }
  }

  botonConfirmarVenta.disabled = cantidadInvalida;
}

function abrirModalVentaRapida(item) {
  itemVentaActual = item;
  limpiarAlertaVentaRapida();

  campoVentaProducto.value = item.nombre_producto || "";
  campoVentaVariante.value = construirTextoOfertaPlano(item);
  campoVentaCantidad.value = 1;
  campoVentaCantidad.max = Number(item.stock || 0);
  campoVentaFecha.value = obtenerFechaHoy();
  campoVentaCliente.value = "";
  campoVentaNit.value = "";
  campoVentaFactura.value = "";
  campoVentaVarianteId.value = item.id;

  campoVentaNit.classList.remove("is-invalid");
  campoVentaFactura.classList.remove("is-invalid");

  actualizarResumenVentaRapida();

  modalVentaRapida?.show();
}

function construirUrlProductoPublico(slugProducto) {
  if (!slugProducto) {
    return null;
  }

  return `../public/pages/producto.html?slug=${encodeURIComponent(slugProducto)}`;
}

function construirUrlProductoAdmin(productoId, varianteId = null) {
  const parametros = new URLSearchParams();

  parametros.set("id", productoId);

  if (varianteId) {
    parametros.set("variante_id", varianteId);
  }

  return `./producto-form.html?${parametros.toString()}`;
}

function renderizarDetalleVariante(detalle) {
  const rutaImagen = construirRutaImagen(detalle);
  const urlProductoPublico = construirUrlProductoPublico(detalle.slug_producto);
  const urlProductoAdmin = construirUrlProductoAdmin(detalle.producto_id, detalle.id);
  const tipoOferta = construirTipoOferta(detalle);
  const referencia = detalle.referencia_oem || detalle.referencia_original || "";

  contenedorDetalleVariante.innerHTML = `
    <div class="detalle-variante-admin">
      <div class="detalle-variante-imagen">
        ${
          rutaImagen
            ? `
              <img
                src="${escaparAtributo(rutaImagen)}"
                alt="${escaparAtributo(construirAltImagen(detalle))}"
                loading="lazy"
                onerror="this.classList.add('d-none'); this.nextElementSibling.classList.remove('d-none');"
              >
              <div class="imagen-placeholder-inventario d-none">IMG</div>
            `
            : '<div class="imagen-placeholder-inventario">IMG</div>'
        }
      </div>

      <div class="detalle-variante-info">
        <h3 class="h5 mb-2">${textoSeguro(detalle.nombre_producto)}</h3>

        ${
          tipoOferta
            ? `<div class="producto-dato-valor mb-1"><strong>Tipo:</strong> ${tipoOferta}</div>`
            : ""
        }

        ${
          referencia
            ? `<div class="producto-dato-valor mb-1"><strong>OEM / referencia:</strong> ${escaparHtml(referencia)}</div>`
            : ""
        }

        ${
          detalle.codigo_interno
            ? `<div class="producto-dato-valor mb-3"><strong>Código interno:</strong> ${escaparHtml(detalle.codigo_interno)}</div>`
            : ""
        }

        <div class="d-flex flex-wrap gap-2 mb-3">
          ${
            ES_ADMIN
              ? `
                <a href="${escaparAtributo(urlProductoAdmin)}" class="btn btn-outline-primary btn-sm">
                  Editar producto
                </a>
              `
              : ""
          }

          ${
            urlProductoPublico
              ? `
                <a
                  href="${escaparAtributo(urlProductoPublico)}"
                  target="_blank"
                  rel="noopener"
                  class="btn btn-outline-secondary btn-sm"
                >
                  Ver producto público
                </a>
              `
              : ""
          }
        </div>
      </div>
    </div>

    <div class="row g-3 mt-1">
      <div class="col-md-6">
        <div class="border rounded p-3 h-100">
          <h6 class="mb-3">Datos técnicos</h6>
          <div><strong>Motor:</strong> ${textoSeguro(detalle.motor || detalle.motores)}</div>
          <div><strong>Cilindraje:</strong> ${textoSeguro(detalle.cilindraje || detalle.cilindrajes)}</div>
          <div><strong>Combustible:</strong> ${textoSeguro(detalle.tipo_combustible)}</div>
          <div><strong>N. Cilindros:</strong> ${textoSeguro(detalle.numero_cilindros)}</div>
          <div><strong>N. Válvulas:</strong> ${textoSeguro(detalle.numero_valvulas)}</div>
          <div><strong>Vehículos compatibles:</strong> ${renderizarListaTexto(detalle.vehiculos_compatibles)}</div>
          <div><strong>Observaciones:</strong> ${renderizarListaTexto(detalle.observaciones_tecnicas)}</div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="border rounded p-3 h-100">
          <h6 class="mb-3">Condiciones e incluye</h6>
          <div><strong>Garantía:</strong> ${textoSeguro(detalle.garantia_tiempo)}</div>
          <div><strong>Incluye:</strong> ${renderizarListaTexto(detalle.incluye || detalle.nombre_variante)}</div>
          <div><strong>Paquete:</strong> ${renderizarListaTexto(detalle.paquete)}</div>
          <div><strong>Condición:</strong> ${textoSeguro(detalle.condicion)}</div>
        </div>
      </div>
    </div>

    ${construirAuditoriaVariante(detalle)}
  `;
}

async function abrirDetalleVariante(varianteId) {
  try {
    limpiarAlerta();

    contenedorDetalleVariante.innerHTML = `
      <p class="text-muted mb-0">Cargando información...</p>
    `;

    modalDetalleVariante?.show();

    const detalle = await obtenerDetalleVariante(varianteId);
    renderizarDetalleVariante(detalle);
  } catch (error) {
    contenedorDetalleVariante.innerHTML = `
      <div class="alert alert-danger mb-0">
        ${escaparHtml(error.message || "No fue posible cargar el detalle de la variante.")}
      </div>
    `;
  }
}

async function manejarEnvioVentaRapida(evento) {
  evento.preventDefault();

  try {
    limpiarAlerta();

    botonConfirmarVenta.disabled = true;
    botonConfirmarVenta.textContent = "Registrando...";

    const cantidad = Number(campoVentaCantidad.value);
    const varianteId = Number(campoVentaVarianteId.value);
    const precioUnitario = Number(itemVentaActual?.precio || 0);
    const clienteNombre = campoVentaCliente.value.trim() || "Mostrador";
    const fechaBase = campoVentaFecha.value;
    const clienteNit = limpiarSoloNumeros(campoVentaNit.value);
    const facturaNumero = limpiarSoloNumeros(campoVentaFactura.value);

    if (!itemVentaActual || !varianteId) {
      throw new Error("No se encontró la variante seleccionada para la venta.");
    }

    if (!fechaBase) {
      throw new Error("Debes seleccionar la fecha de la venta.");
    }

    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0.");
    }

    if (Number(itemVentaActual.stock) <= 0) {
      throw new Error("No puedes vender una variante sin stock disponible.");
    }

    if (cantidad > Number(itemVentaActual.stock)) {
      throw new Error("La cantidad no puede ser mayor al stock disponible.");
    }

    if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
      throw new Error("La variante no tiene un precio de venta válido.");
    }

    const payload = {
      fecha_venta: `${fechaBase}T00:00:00`,
      cliente_nombre: clienteNombre,
      cliente_nit: clienteNit || null,
      factura_numero: facturaNumero || null,
      items: [
        {
          variante_id: varianteId,
          cantidad,
          precio_unitario: precioUnitario,
        },
      ],
    };

    await crearVenta(payload);

    modalVentaRapida?.hide();
    formularioVentaRapida.reset();
    itemVentaActual = null;
    actualizarResumenVentaRapida();

    mostrarAlerta("Venta registrada correctamente.", "success");
    await cargarInventario("Cargando inventario...");
  } catch (error) {
    mostrarAlertaVentaRapida(error.message || "No fue posible registrar la venta.");
  } finally {
    botonConfirmarVenta.disabled = false;
    botonConfirmarVenta.textContent = "Registrar venta";
    actualizarResumenVentaRapida();
  }
}

function obtenerItemDesdeBoton(boton) {
  try {
    return JSON.parse(boton.dataset.item || "{}");
  } catch {
    return {};
  }
}

cuerpoTabla.addEventListener("click", async (evento) => {
  const boton = evento.target.closest("button[data-accion]");

  if (!boton) return;

  const accion = boton.dataset.accion;

  if (accion === "ver") {
    const varianteId = Number(boton.dataset.id);

    if (!varianteId) return;

    await abrirDetalleVariante(varianteId);
    return;
  }

  if (accion === "editar") {
    if (!ES_ADMIN) {
      mostrarAlerta("No tienes permisos para editar productos.", "warning");
      return;
    }

    const productoId = Number(boton.dataset.productoId);
    const varianteId = Number(boton.dataset.varianteId);

    if (!productoId) return;

    window.location.href = construirUrlProductoAdmin(productoId, varianteId);
    return;
  }

  if (accion === "venta") {
    const item = obtenerItemDesdeBoton(boton);
    abrirModalVentaRapida(item);
  }
});

async function cargarCategorias() {
  try {
    const categorias = await obtenerCategoriasPublicas();

    categorias.forEach((categoria) => {
      const opcion = document.createElement("option");
      opcion.value = categoria.id;
      opcion.textContent = categoria.nombre;
      campoCategoria.appendChild(opcion);
    });
  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

async function cargarMarcas() {
  try {
    const marcas = await obtenerMarcasPublicas();

    marcas.forEach((marca) => {
      const opcion = document.createElement("option");
      opcion.value = marca.id;
      opcion.textContent = marca.nombre;
      campoMarca.appendChild(opcion);
    });
  } catch (error) {
    console.error("Error cargando marcas:", error);
  }
}

function limpiarFiltros() {
  formularioFiltros.reset();
  campoTamano.value = "20";
  campoOrdenarPor.value = "nombre_producto";
  campoDireccion.value = "asc";
  campoSoloActivas.checked = true;
  paginaActual = 1;
  cargarInventario("Limpiando filtros...");
}

formularioFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  paginaActual = 1;
  cargarInventario("Aplicando filtros...");
});

formularioVentaRapida?.addEventListener("submit", manejarEnvioVentaRapida);

campoVentaCantidad?.addEventListener("input", actualizarResumenVentaRapida);
campoVentaCantidad?.addEventListener("change", actualizarResumenVentaRapida);

[campoVentaNit, campoVentaFactura].forEach((campo) => {
  campo?.addEventListener("input", () => {
    campo.value = limpiarSoloNumeros(campo.value);
  });
});

modalVentaRapidaElemento?.addEventListener("hidden.bs.modal", () => {
  itemVentaActual = null;
  formularioVentaRapida?.reset();
  limpiarAlertaVentaRapida();
  actualizarResumenVentaRapida();
});

botonLimpiarFiltros.addEventListener("click", limpiarFiltros);

botonAnadirProducto?.addEventListener("click", () => {
  if (!ES_ADMIN) return;
  window.location.href = "./producto-form.html";
});

botonAnterior.addEventListener("click", () => {
  if (paginaActual > 1) {
    paginaActual -= 1;
    cargarInventario("Cambiando de página...");
  }
});

botonSiguiente.addEventListener("click", () => {
  if (paginaActual < ultimaPaginacion.total_paginas) {
    paginaActual += 1;
    cargarInventario("Cambiando de página...");
  }
});

try {
  if (!protegerPaginaAdmin()) {
    finalizarCargaAdmin();
    throw new Error("Sesión no válida.");
  }

  configurarBotonCerrarSesion("boton-cerrar-sesion");
  iniciarIndicadorSesion("infoSesionAdmin");
  prepararPermisosInventario();
  prepararEstilosEnfoqueInventario();

  await Promise.all([
    cargarCategorias(),
    cargarMarcas(),
  ]);

  await cargarInventario("Cargando inventario...");
} catch (error) {
  console.error("Error iniciando inventario:", error);
  mostrarAlerta("No fue posible cargar el inventario.", "danger");
} finally {
  finalizarCargaAdmin();
}