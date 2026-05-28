import { obtenerResumenDashboard } from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

const elementos = {
  solicitudesNuevas: document.getElementById("dashboard-solicitudes-nuevas"),
  ventasHoy: document.getElementById("dashboard-ventas-hoy"),
  stockTotal: document.getElementById("dashboard-stock-total"),
  stockBajo: document.getElementById("dashboard-stock-bajo"),

  textoSolicitudes: document.getElementById("dashboard-texto-solicitudes"),
  textoVentasHoy: document.getElementById("dashboard-texto-ventas-hoy"),
  textoStockTotal: document.getElementById("dashboard-texto-stock-total"),
  textoStockBajo: document.getElementById("dashboard-texto-stock-bajo"),

  pendienteSolicitudes: document.getElementById("dashboard-pendiente-solicitudes"),
  pendienteStock: document.getElementById("dashboard-pendiente-stock"),
  pendienteImagenes: document.getElementById("dashboard-pendiente-imagenes"),
  pendienteProductos: document.getElementById("dashboard-pendiente-productos"),

  productosActivos: document.getElementById("dashboard-productos-activos"),
  totalVariantes: document.getElementById("dashboard-total-variantes"),
  variantesAgotadas: document.getElementById("dashboard-variantes-agotadas"),
  variantesSinImagen: document.getElementById("dashboard-variantes-sin-imagen"),
};

const FORMATO_COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const FORMATO_NUMERO = new Intl.NumberFormat("es-CO");

document.addEventListener("DOMContentLoaded", iniciarDashboard);

async function iniciarDashboard() {
  try {
    if (!protegerSoloAdmin()) {
      finalizarCargaAdmin();
      return;
    }

    aplicarPermisosVisuales();
    configurarBotonCerrarSesion("boton-cerrar-sesion");
    iniciarIndicadorSesion("infoSesionAdmin");

    await cargarDashboard();
  } catch (error) {
    console.error("Error al cargar el dashboard:", error);
    mostrarIndicadoresError();
  } finally {
    finalizarCargaAdmin();
  }
}

async function cargarDashboard() {
  establecerIndicadoresCargando();

  const resumen = await obtenerResumenDashboard();

  pintarIndicadoresPrincipales(resumen);
  pintarPendientes(resumen);
  pintarIndicadoresSecundarios(resumen);
}

function pintarIndicadoresPrincipales(resumen) {
  const solicitudes = resumen?.solicitudes || {};
  const ventas = resumen?.ventas || {};
  const inventario = resumen?.inventario || {};

  setTexto(elementos.solicitudesNuevas, formatearNumero(solicitudes.nuevas));
  setTexto(elementos.ventasHoy, formatearNumero(ventas.ventas_hoy));
  setTexto(elementos.stockTotal, formatearNumero(inventario.stock_total));
  setTexto(elementos.stockBajo, formatearNumero(inventario.variantes_stock_bajo));

  setTexto(
    elementos.textoSolicitudes,
    construirTextoSolicitudesNuevas(solicitudes.nuevas),
  );

  setTexto(
    elementos.textoVentasHoy,
    `Valor vendido hoy: ${formatearPesos(ventas.valor_ventas_hoy)}`,
  );

  setTexto(
    elementos.textoStockTotal,
    `${formatearNumero(inventario.variantes_con_stock)} variante${Number(inventario.variantes_con_stock) === 1 ? "" : "s"} con stock disponible.`,
  );

  setTexto(
    elementos.textoStockBajo,
    construirTextoStockBajo(inventario.variantes_stock_bajo),
  );
}

function pintarPendientes(resumen) {
  const productos = resumen?.productos || {};
  const inventario = resumen?.inventario || {};
  const solicitudes = resumen?.solicitudes || {};

  setTexto(
    elementos.pendienteSolicitudes,
    construirTextoSolicitudesAbiertas(solicitudes),
  );

  setTexto(
    elementos.pendienteStock,
    construirTextoPendienteStock(inventario),
  );

  setTexto(
    elementos.pendienteImagenes,
    construirTextoImagenesPendientes(inventario.variantes_sin_imagen_principal),
  );

  setTexto(
    elementos.pendienteProductos,
    `${formatearNumero(productos.activos)} activo${Number(productos.activos) === 1 ? "" : "s"} y ${formatearNumero(productos.inactivos)} inactivo${Number(productos.inactivos) === 1 ? "" : "s"}.`,
  );
}

function pintarIndicadoresSecundarios(resumen) {
  const productos = resumen?.productos || {};
  const variantes = resumen?.variantes || {};

  setTexto(elementos.productosActivos, formatearNumero(productos.activos));
  setTexto(elementos.totalVariantes, formatearNumero(variantes.total_operativas));
  setTexto(elementos.variantesAgotadas, formatearNumero(variantes.agotadas));
  setTexto(elementos.variantesSinImagen, formatearNumero(variantes.sin_imagen_principal));
}

function construirTextoSolicitudesNuevas(total) {
  const numero = Number(total || 0);

  if (numero === 0) {
    return "No hay solicitudes nuevas por ahora.";
  }

  return `${formatearNumero(numero)} solicitud${numero === 1 ? "" : "es"} nueva${numero === 1 ? "" : "s"} pendiente${numero === 1 ? "" : "s"}.`;
}

function construirTextoStockBajo(total) {
  const numero = Number(total || 0);

  if (numero === 0) {
    return "Inventario sin alertas críticas.";
  }

  return `${formatearNumero(numero)} variante${numero === 1 ? "" : "s"} requiere${numero === 1 ? "" : "n"} revisión.`;
}

function construirTextoSolicitudesAbiertas(solicitudes) {
  const abiertas = Number(solicitudes.abiertas || 0);

  if (abiertas === 0) {
    return "No hay solicitudes abiertas pendientes de gestión.";
  }

  return `${formatearNumero(abiertas)} abierta${abiertas === 1 ? "" : "s"}: ${formatearNumero(solicitudes.nuevas)} nueva${Number(solicitudes.nuevas) === 1 ? "" : "s"}, ${formatearNumero(solicitudes.contactadas)} contactada${Number(solicitudes.contactadas) === 1 ? "" : "s"} y ${formatearNumero(solicitudes.cotizadas)} cotizada${Number(solicitudes.cotizadas) === 1 ? "" : "s"}.`;
}

function construirTextoPendienteStock(inventario) {
  const bajo = Number(inventario.variantes_stock_bajo || 0);
  const agotadas = Number(inventario.variantes_agotadas || 0);

  if (bajo === 0 && agotadas === 0) {
    return "No hay variantes agotadas ni por debajo del mínimo.";
  }

  return `${formatearNumero(bajo)} con stock bajo y ${formatearNumero(agotadas)} agotada${agotadas === 1 ? "" : "s"}.`;
}

function construirTextoImagenesPendientes(total) {
  const numero = Number(total || 0);

  if (numero === 0) {
    return "Todas las variantes operativas tienen imagen principal.";
  }

  return `${formatearNumero(numero)} variante${numero === 1 ? "" : "s"} operativa${numero === 1 ? "" : "s"} sin imagen principal.`;
}

function establecerIndicadoresCargando() {
  Object.values(elementos).forEach((elemento) => {
    setTexto(elemento, "...");
  });
}

function mostrarIndicadoresError() {
  setTexto(elementos.solicitudesNuevas, "—");
  setTexto(elementos.ventasHoy, "—");
  setTexto(elementos.stockTotal, "—");
  setTexto(elementos.stockBajo, "—");
  setTexto(elementos.productosActivos, "—");
  setTexto(elementos.totalVariantes, "—");
  setTexto(elementos.variantesAgotadas, "—");
  setTexto(elementos.variantesSinImagen, "—");

  setTexto(
    elementos.textoSolicitudes,
    "No fue posible cargar los indicadores del dashboard.",
  );
  setTexto(elementos.textoVentasHoy, "Valor vendido hoy: —");
  setTexto(elementos.textoStockTotal, "No fue posible calcular el stock disponible.");
  setTexto(elementos.textoStockBajo, "No fue posible calcular las alertas de stock.");
  setTexto(elementos.pendienteSolicitudes, "No fue posible cargar solicitudes abiertas.");
  setTexto(elementos.pendienteStock, "No fue posible cargar pendientes de inventario.");
  setTexto(elementos.pendienteImagenes, "No fue posible cargar pendientes de imágenes.");
  setTexto(elementos.pendienteProductos, "No fue posible cargar el estado de productos.");
}

function formatearNumero(valor) {
  const numero = Number(valor || 0);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return FORMATO_NUMERO.format(numero);
}

function formatearPesos(valor) {
  const numero = Number(valor || 0);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return FORMATO_COP.format(numero);
}

function setTexto(elemento, valor) {
  if (!elemento) return;

  elemento.textContent = valor ?? "—";
}
