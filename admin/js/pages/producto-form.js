import {
  actualizarConfiguracionProducto,
  actualizarImagenVariante,
  actualizarProducto,
  actualizarVarianteProducto,
  crearConfiguracionProducto,
  crearProducto,
  crearVarianteProducto,
  desactivarVarianteProducto,
  eliminarImagenVariante,
  obtenerCategoriasPublicas,
  obtenerConfiguracionesProducto,
  obtenerDetalleProducto,
  obtenerImagenesVariante,
  obtenerMarcasPublicas,
  obtenerVariantesProducto,
  subirImagenVariante,
} from "../api.js";

import {
  protegerSoloAdmin,
  aplicarPermisosVisuales,
  configurarBotonCerrarSesion,
  iniciarIndicadorSesion,
  finalizarCargaAdmin,
} from "../auth.js";

const parametrosUrl = new URLSearchParams(window.location.search);
const productoIdInicial = parametrosUrl.get("id");
const varianteIdInicial = parametrosUrl.get("variante_id");
const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const MAXIMO_IMAGENES_VARIANTE = 7;

const estado = {
  productoId: productoIdInicial ? Number(productoIdInicial) : null,
  producto: null,
  configuraciones: [],
  variantes: [],
  variantePendienteCambioEstado: null,

  varianteIdDesdeUrl: varianteIdInicial ? Number(varianteIdInicial) : null,
  varianteIdPendienteEnfoque: varianteIdInicial ? Number(varianteIdInicial) : null,

  imagenesVariante: [],
  imagenesVarianteCargando: false,
  imagenPendienteEliminarId: null,
  operacionImagenVarianteActiva: false,
  reabrirModalVarianteEnImagenes: false,
  cierreManualModalVariante: false,
};

const elementos = {
  btnEditarProducto: document.getElementById("btnEditarProducto"),
  btnNuevaConfiguracion: document.getElementById("btnNuevaConfiguracion"),
  btnNuevaVariante: document.getElementById("btnNuevaVariante"),

  modalProducto: document.getElementById("modalProducto"),
  formProducto: document.getElementById("formProducto"),
  tituloModalProducto: document.getElementById("tituloModalProducto"),
  btnGuardarProducto: document.getElementById("btnGuardarProducto"),

  selectCategoria: document.getElementById("categoria_id"),
  selectMarca: document.getElementById("marca_ids"),

  listaConfiguraciones: document.getElementById("listaConfiguraciones"),
  alertaConfigProductoNuevo: document.getElementById("alertaConfigProductoNuevo"),

  listaVariantes: document.getElementById("listaVariantes"),
  alertaVariantesProductoNuevo: document.getElementById("alertaVariantesProductoNuevo"),

  modalConfiguracion: document.getElementById("modalConfiguracion"),
  formConfiguracion: document.getElementById("formConfiguracion"),
  tituloModalConfiguracion: document.getElementById("tituloModalConfiguracion"),

  modalVariante: document.getElementById("modalVariante"),
  formVariante: document.getElementById("formVariante"),
  tituloModalVariante: document.getElementById("tituloModalVariante"),
  selectConfiguracionVariante: document.getElementById("variante_configuracion_id"),
  selectTipoVariante: document.getElementById("variante_principal_select"),
  inputTipoVariante: document.getElementById("variante_principal"),
  inputTipoVarianteVisual: document.getElementById("variante_principal_visual"),
  grupoTipoVarianteCulatas: document.getElementById("grupo-variante-principal-culatas"),
  grupoTipoVarianteAuto: document.getElementById("grupo-variante-principal-auto"),

  inputTituloSeo: document.getElementById("variante_titulo_seo"),
  inputResumenSeo: document.getElementById("variante_resumen_seo"),
  inputDescripcionMerchant: document.getElementById("variante_descripcion_merchant"),
  inputPublicarMerchant: document.getElementById("variante_publicar_merchant"),

  contadorTituloSeo: document.getElementById("contadorTituloSeo"),
  contadorResumenSeo: document.getElementById("contadorResumenSeo"),
  contadorDescripcionMerchant: document.getElementById("contadorDescripcionMerchant"),
  alertaMerchantVariante: document.getElementById("alertaMerchantVariante"),

  alertaImagenesVarianteNueva: document.getElementById("alertaImagenesVarianteNueva"),
  contenedorImagenesVariante: document.getElementById("contenedorImagenesVariante"),
  contadorImagenesVariante: document.getElementById("contadorImagenesVariante"),
  inputImagenVarianteArchivo: document.getElementById("imagenVarianteArchivo"),
  inputImagenVarianteOrden: document.getElementById("imagenVarianteOrden"),
  inputImagenVariantePrincipal: document.getElementById("imagenVariantePrincipal"),
  btnSubirImagenVariante: document.getElementById("btnSubirImagenVariante"),
  listaImagenesVariante: document.getElementById("listaImagenesVariante"),

  modalConfirmarDesactivarVariante: document.getElementById("modalConfirmarDesactivarVariante"),
  textoConfirmarEstadoVariante: document.getElementById("textoConfirmarEstadoVariante"),
  btnConfirmarDesactivarVariante: document.getElementById("btnConfirmarDesactivarVariante"),

  btnCerrarModalVariante: document.getElementById("btnCerrarModalVariante"),
  btnCancelarModalVariante: document.getElementById("btnCancelarModalVariante"),

  contenedorToast: document.getElementById("contenedorToast"),
};

let modalProducto = null;
let modalConfiguracion = null;
let modalVariante = null;
let modalConfirmarDesactivarVariante = null;

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
    prepararEstilosEnfoqueVariante();

    await cargarCatalogos();

    if (estado.productoId) {
      await cargarProductoCompleto();
      habilitarSeccionesRelacionadas();
    } else {
      limpiarVistaProducto();
      bloquearSeccionesRelacionadas();
      abrirModalNuevoProducto();
    }
  } catch (error) {
    mostrarToast(error.message, "danger");
  } finally {
    finalizarCargaAdmin();
  }
}
function inicializarModales() {
  modalProducto = new bootstrap.Modal(elementos.modalProducto);
  modalConfiguracion = new bootstrap.Modal(elementos.modalConfiguracion);

  modalVariante = new bootstrap.Modal(elementos.modalVariante, {
    backdrop: "static",
    keyboard: false,
  });

  modalConfirmarDesactivarVariante = new bootstrap.Modal(
    elementos.modalConfirmarDesactivarVariante
  );

  elementos.modalVariante?.addEventListener("hide.bs.modal", (evento) => {
    const cierrePorOperacionImagen =
      estado.operacionImagenVarianteActiva || estado.reabrirModalVarianteEnImagenes;

    if (cierrePorOperacionImagen && !estado.cierreManualModalVariante) {
      evento.preventDefault();
      activarTabVariante("tab-variante-imagenes");
    }
  });

  elementos.modalVariante?.addEventListener("hidden.bs.modal", () => {
    estado.cierreManualModalVariante = false;
    estado.operacionImagenVarianteActiva = false;
    estado.reabrirModalVarianteEnImagenes = false;
  });

  elementos.modalVariante?.addEventListener("shown.bs.modal", () => {
    if (estado.reabrirModalVarianteEnImagenes) {
      activarTabVariante("tab-variante-imagenes");
    }
  });
}

function registrarEventos() {
  elementos.btnEditarProducto?.addEventListener("click", abrirModalEditarProducto);
  elementos.btnNuevaConfiguracion?.addEventListener("click", abrirModalNuevaConfiguracion);
  elementos.btnNuevaVariante?.addEventListener("click", abrirModalNuevaVariante);

  elementos.formProducto?.addEventListener("submit", guardarProducto);
  elementos.formConfiguracion?.addEventListener("submit", guardarConfiguracion);

  elementos.formVariante?.addEventListener("submit", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
  });

  document.getElementById("btnGuardarVariante")?.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();
    guardarVariante(evento);
  });

  elementos.listaConfiguraciones?.addEventListener("click", manejarAccionesConfiguracion);
  elementos.listaVariantes?.addEventListener("click", manejarAccionesVariante);

  elementos.btnConfirmarDesactivarVariante?.addEventListener(
    "click",
    confirmarCambioEstadoVariante
  );

  elementos.btnSubirImagenVariante?.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();

    estado.cierreManualModalVariante = false;
    estado.operacionImagenVarianteActiva = true;
    estado.reabrirModalVarianteEnImagenes = true;

    subirImagenVarianteDesdeFormulario(evento);
  });

  elementos.listaImagenesVariante?.addEventListener("click", (evento) => {
    const botonAccionImagen = evento.target.closest("[data-accion-imagen]");

    if (!botonAccionImagen) {
      return;
    }

    evento.preventDefault();
    evento.stopPropagation();

    estado.cierreManualModalVariante = false;
    estado.operacionImagenVarianteActiva = true;
    estado.reabrirModalVarianteEnImagenes = true;

    manejarAccionesImagenVariante(evento);
  });

  elementos.btnCerrarModalVariante?.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();

    estado.cierreManualModalVariante = true;
    estado.operacionImagenVarianteActiva = false;
    estado.reabrirModalVarianteEnImagenes = false;

    modalVariante.hide();
  });

  elementos.btnCancelarModalVariante?.addEventListener("click", (evento) => {
    evento.preventDefault();
    evento.stopPropagation();

    estado.cierreManualModalVariante = true;
    estado.operacionImagenVarianteActiva = false;
    estado.reabrirModalVarianteEnImagenes = false;

    modalVariante.hide();
  });

  elementos.formVariante?.addEventListener("click", (evento) => {
    const estaEnPanelImagenes = evento.target.closest("#panel-variante-imagenes");

    if (!estaEnPanelImagenes) {
      return;
    }

    const esBotonCerrar = evento.target.closest(
      "#btnCerrarModalVariante, #btnCancelarModalVariante"
    );

    if (esBotonCerrar) {
      return;
    }

    evento.stopPropagation();
  });

  if (elementos.btnSubirImagenVariante) {
    elementos.btnSubirImagenVariante.textContent = "Subir";
    elementos.btnSubirImagenVariante.type = "button";
  }

  const btnGuardarVariante = document.getElementById("btnGuardarVariante");

  if (btnGuardarVariante) {
    btnGuardarVariante.type = "button";
  }

  [
    "categoria_id",
    "marca_ids",
    "motor",
    "cilindraje",
    "tipo_combustible",
    "numero_cilindros",
    "numero_valvulas",
    "material",
    "vehiculos_compatibles",
    "garantia_tiempo",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      aplicarTipoDetectadoDesdeCategoria();
      autogenerarSlug();
      autogenerarCamposVariante();
      actualizarEstadoMerchant();
    });

    document.getElementById(id)?.addEventListener("change", () => {
      aplicarTipoDetectadoDesdeCategoria();
      actualizarControlTipoComercialVariante();
      autogenerarSlug();
      autogenerarCamposVariante();
      actualizarEstadoMerchant();
    });
  });

  document.getElementById("nombre")?.addEventListener("input", () => {
    autogenerarSlug();
    autogenerarCamposVariante();
    actualizarEstadoMerchant();
  });

  document.getElementById("referencia_original")?.addEventListener("input", () => {
    autogenerarCamposVariante();
    actualizarEstadoMerchant();
  });

  elementos.selectTipoVariante?.addEventListener("change", () => {
    sincronizarTipoComercialVariante();
    autogenerarCamposVariante();
    actualizarEstadoMerchant();
  });

  [
    "variante_configuracion_id",
    "variante_marca_repuesto",
    "variante_referencia_oem",
    "variante_incluye",
    "variante_paquete",
    "variante_condicion",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      autogenerarCamposVariante();
      actualizarEstadoMerchant();
    });

    document.getElementById(id)?.addEventListener("change", () => {
      autogenerarCamposVariante();
      actualizarEstadoMerchant();
    });
  });

  [
    "variante_titulo_seo",
    "variante_resumen_seo",
    "variante_descripcion_merchant",
  ].forEach((id) => {
    const campo = document.getElementById(id);

    campo?.addEventListener("input", () => {
      campo.dataset.autoGenerado = "false";
      actualizarContadoresSeoMerchant();
      actualizarEstadoMerchant();
    });
  });

  [
    "variante_nombre",
    "variante_precio",
    "variante_stock",
    "variante_stock_minimo",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", actualizarEstadoMerchant);
    document.getElementById(id)?.addEventListener("change", actualizarEstadoMerchant);
  });

  elementos.inputPublicarMerchant?.addEventListener("change", actualizarEstadoMerchant);
}

async function cargarCatalogos() {
  const [categorias, marcas] = await Promise.all([
    obtenerCategoriasPublicas(),
    obtenerMarcasPublicas(),
  ]);

  llenarSelect(elementos.selectCategoria, categorias, "Selecciona...");
  llenarSelect(elementos.selectMarca, marcas, "");

  aplicarTipoDetectadoDesdeCategoria();
  actualizarControlTipoComercialVariante();
}

function llenarSelect(select, items, textoInicial) {
  select.innerHTML = "";

  if (!select.multiple && textoInicial) {
    const opcionInicial = document.createElement("option");
    opcionInicial.value = "";
    opcionInicial.textContent = textoInicial;
    select.appendChild(opcionInicial);
  }

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.nombre;
    select.appendChild(option);
  });
}

async function cargarProductoCompleto() {
  const producto = await obtenerDetalleProducto(estado.productoId);

  estado.producto = producto;

  renderizarVistaProducto(producto);
  llenarFormularioProducto(producto);

  await cargarConfiguracionesYVariantes();
}

function renderizarVistaProducto(producto) {
  setTexto("vistaNombreProducto", producto.nombre || "—");
  setTexto("vistaCategoria", producto.categoria_nombre || "—");

  setTexto(
    "vistaMarca",
    producto.marca_nombres?.length
      ? producto.marca_nombres.join(" / ")
      : producto.marca_nombre || "—"
  );

  setTexto("vistaTipoRepuesto", capitalizar(producto.tipo_repuesto || "—"));
  setTexto("vistaReferenciaOriginal", producto.referencia_original || "—");

  setTexto("vistaMotor", producto.motor || "—");
  setTexto("vistaCilindraje", producto.cilindraje || "—");
  setTexto("vistaCombustible", capitalizar(producto.tipo_combustible || "—"));
  setTexto("vistaCilindros", producto.numero_cilindros || "—");
  setTexto("vistaValvulas", producto.numero_valvulas || "—");
  setTexto("vistaMaterial", producto.material || "—");
  setTexto("vistaAnosCompatibles", producto.anos_compatibles || "—");
  setTexto("vistaGarantiaTiempo", producto.garantia_tiempo || "—");

  setListaTexto("vistaVehiculosCompatibles", producto.vehiculos_compatibles || "—");
  setTextoConSaltos("vistaObservacionesTecnicas", producto.observaciones_tecnicas || "—");

  const estadoBadge = document.getElementById("vistaEstadoProducto");
  const publicacionBadge = document.getElementById("vistaPublicacionProducto");

  if (estadoBadge) {
    estadoBadge.textContent = producto.activo ? "Activo" : "Inactivo";
    estadoBadge.className = producto.activo
      ? "badge text-bg-success"
      : "badge text-bg-secondary";
  }

  if (publicacionBadge) {
    publicacionBadge.textContent = producto.estado_publicacion || "borrador";
    publicacionBadge.className = "badge text-bg-light border";
  }
}

function limpiarVistaProducto() {
  setTexto("vistaNombreProducto", "Nuevo producto");

  setTexto("vistaCategoria", "—");
  setTexto("vistaMarca", "—");
  setTexto("vistaTipoRepuesto", "—");
  setTexto("vistaReferenciaOriginal", "—");

  setTexto("vistaMotor", "—");
  setTexto("vistaCilindraje", "—");
  setTexto("vistaCombustible", "—");
  setTexto("vistaCilindros", "—");
  setTexto("vistaValvulas", "—");
  setTexto("vistaMaterial", "—");
  setTexto("vistaAnosCompatibles", "—");
  setTexto("vistaGarantiaTiempo", "—");
  setTexto("vistaVehiculosCompatibles", "—");
  setTexto("vistaObservacionesTecnicas", "—");

  const estadoBadge = document.getElementById("vistaEstadoProducto");
  const publicacionBadge = document.getElementById("vistaPublicacionProducto");

  if (estadoBadge) {
    estadoBadge.textContent = "Sin guardar";
    estadoBadge.className = "badge text-bg-warning";
  }

  if (publicacionBadge) {
    publicacionBadge.textContent = "borrador";
    publicacionBadge.className = "badge text-bg-light border";
  }
}

function llenarFormularioProducto(producto) {
  setValor("nombre", producto.nombre);
  setValor("slug", producto.slug);
  setValor("categoria_id", producto.categoria_id);

  setValoresMultiples(
    "marca_ids",
    producto.marca_ids?.length
      ? producto.marca_ids
      : producto.marca_id
        ? [producto.marca_id]
        : []
  );

  setValor("tipo_repuesto", producto.tipo_repuesto || detectarTipoRepuestoDesdeCategoria());
  aplicarTipoDetectadoDesdeCategoria(false);

  setValor("referencia_original", producto.referencia_original || "");

  setValor("motor", producto.motor || "");
  setValor("cilindraje", producto.cilindraje || "");
  setValor("tipo_combustible", producto.tipo_combustible || "");
  setValor("numero_cilindros", producto.numero_cilindros || "");
  setValor("numero_valvulas", producto.numero_valvulas || "");
  setValor("material", producto.material || "");
  setValor("anos_compatibles", producto.anos_compatibles || "");
  setValor("vehiculos_compatibles", producto.vehiculos_compatibles || "");
  setValor("observaciones_tecnicas", producto.observaciones_tecnicas || "");
  setValor("garantia_tiempo", producto.garantia_tiempo || "");

  setValor("estado_publicacion", producto.estado_publicacion || "borrador");

  setCheck("mostrar_precio", producto.mostrar_precio);
  setCheck("destacado", producto.destacado);
  setCheck("activo", producto.activo);
}

async function cargarConfiguracionesYVariantes() {
  if (!estado.productoId) return;

  const [configuraciones, variantes] = await Promise.all([
    obtenerConfiguracionesProducto(estado.productoId),
    obtenerVariantesProducto(estado.productoId),
  ]);

  estado.configuraciones = configuraciones;
  estado.variantes = variantes;

  renderizarConfiguraciones();
  renderizarOpcionesConfiguracionVariante();
  renderizarVariantes();

  aplicarEnfoqueVarianteDesdeUrl();
}

function bloquearSeccionesRelacionadas() {
  elementos.btnNuevaConfiguracion.disabled = true;
  elementos.btnNuevaVariante.disabled = true;

  elementos.alertaConfigProductoNuevo.classList.remove("d-none");
  elementos.listaConfiguraciones.classList.add("d-none");

  elementos.alertaVariantesProductoNuevo.classList.remove("d-none");
  elementos.listaVariantes.classList.add("d-none");
}

function habilitarSeccionesRelacionadas() {
  elementos.btnNuevaConfiguracion.disabled = false;
  elementos.btnNuevaVariante.disabled = false;

  elementos.alertaConfigProductoNuevo.classList.add("d-none");
  elementos.listaConfiguraciones.classList.remove("d-none");

  elementos.alertaVariantesProductoNuevo.classList.add("d-none");
  elementos.listaVariantes.classList.remove("d-none");
}

function abrirModalNuevoProducto() {
  elementos.formProducto.reset();

  setValor("slug", "");
  setValoresMultiples("marca_ids", []);
  setValor("garantia_tiempo", "");
  setValor("estado_publicacion", "borrador");

  aplicarTipoDetectadoDesdeCategoria();
  actualizarControlTipoComercialVariante();

  setCheck("mostrar_precio", true);
  setCheck("destacado", false);
  setCheck("activo", true);

  elementos.tituloModalProducto.textContent = "Nuevo producto";
  modalProducto.show();
}

function abrirModalEditarProducto() {
  if (!estado.productoId || !estado.producto) {
    abrirModalNuevoProducto();
    return;
  }

  llenarFormularioProducto(estado.producto);
  elementos.tituloModalProducto.textContent = "Editar producto";
  modalProducto.show();
}

async function guardarProducto(evento) {
  evento.preventDefault();

  try {
    alternarGuardandoProducto(true);

    const payload = obtenerPayloadProducto();
    let producto;

    if (estado.productoId) {
      producto = await actualizarProducto(estado.productoId, payload);
      mostrarToast("Producto actualizado correctamente.", "success");
    } else {
      producto = await crearProducto(payload);
      estado.productoId = producto.id;

      const nuevaUrl = `./producto-form.html?id=${producto.id}`;
      window.history.replaceState({}, "", nuevaUrl);

      mostrarToast("Producto creado correctamente. Ahora puedes crear configuraciones y variantes.", "success");
    }

    estado.producto = producto;

    renderizarVistaProducto(producto);
    llenarFormularioProducto(producto);
    habilitarSeccionesRelacionadas();

    modalProducto.hide();

    await cargarConfiguracionesYVariantes();
  } catch (error) {
    mostrarToast(error.message, "danger");
  } finally {
    alternarGuardandoProducto(false);
  }
}

function obtenerPayloadProducto() {
  const marcaIds = obtenerValoresMultiples("marca_ids");
  const slugActual = obtenerValor("slug");
  const slugFinal = estado.productoId
    ? slugActual || construirSlugProductoTecnico()
    : slugActual || construirSlugProductoTecnico() || convertirSlug(obtenerValor("nombre"));

  return {
    nombre: obtenerValor("nombre"),
    slug: slugFinal,
    categoria_id: Number(obtenerValor("categoria_id")),

    marca_ids: marcaIds,
    marca_id: marcaIds[0] || null,

    tipo_repuesto: obtenerValor("tipo_repuesto") || detectarTipoRepuestoDesdeCategoria(),
    referencia_original: obtenerValor("referencia_original") || null,

    motor: obtenerValor("motor") || null,
    cilindraje: obtenerValor("cilindraje") || null,
    tipo_combustible: obtenerValor("tipo_combustible") || null,
    numero_cilindros: obtenerValor("numero_cilindros") || null,
    numero_valvulas: obtenerValor("numero_valvulas") || null,
    material: obtenerValor("material") || null,
    anos_compatibles: obtenerValor("anos_compatibles") || null,
    vehiculos_compatibles: obtenerValor("vehiculos_compatibles") || null,
    observaciones_tecnicas: obtenerValor("observaciones_tecnicas") || null,

    garantia_tiempo: obtenerValor("garantia_tiempo") || null,
    garantia_url: null,
    instalacion_url: null,

    estado_publicacion: obtenerValor("estado_publicacion") || "borrador",
    mostrar_precio: obtenerCheck("mostrar_precio"),
    destacado: obtenerCheck("destacado"),
    activo: obtenerCheck("activo"),
  };
}
function abrirModalNuevaConfiguracion() {
  if (!estado.productoId) {
    mostrarToast("Guarda primero el producto.", "warning");
    return;
  }

  elementos.formConfiguracion.reset();

  setValor("configuracion_id", "");
  setValor("atributo_principal_nombre", "Detalle técnico");
  setValor("atributo_principal_valor", "");
  setValor("atributo_secundario_nombre", "");
  setValor("atributo_secundario_valor", "");
  setValor("atributo_extra_nombre", "");
  setValor("atributo_extra_valor", "");

  setCheck("configuracion_activa", true);
  setCheck("configuracion_predeterminada", false);

  elementos.tituloModalConfiguracion.textContent = "Nueva configuración";
  modalConfiguracion.show();
}

function abrirModalEditarConfiguracion(configuracionId) {
  const configuracion = estado.configuraciones.find((item) => item.id === configuracionId);

  if (!configuracion) return;

  elementos.formConfiguracion.reset();

  setValor("configuracion_id", configuracion.id);
  setValor("configuracion_nombre", configuracion.nombre);
  setValor("atributo_principal_nombre", configuracion.atributo_principal_nombre || "");
  setValor("atributo_principal_valor", configuracion.atributo_principal_valor || "");
  setValor("atributo_secundario_nombre", configuracion.atributo_secundario_nombre || "");
  setValor("atributo_secundario_valor", configuracion.atributo_secundario_valor || "");
  setValor("atributo_extra_nombre", configuracion.atributo_extra_nombre || "");
  setValor("atributo_extra_valor", configuracion.atributo_extra_valor || "");
  setValor("configuracion_observaciones", configuracion.observaciones || "");

  setCheck("configuracion_activa", configuracion.activa);
  setCheck("configuracion_predeterminada", configuracion.es_predeterminada);

  elementos.tituloModalConfiguracion.textContent = "Editar configuración";
  modalConfiguracion.show();
}

async function guardarConfiguracion(evento) {
  evento.preventDefault();

  if (!estado.productoId) {
    mostrarToast("Guarda primero el producto.", "warning");
    return;
  }

  try {
    const configuracionId = obtenerValor("configuracion_id");

    const payload = {
      producto_id: estado.productoId,
      nombre: obtenerValor("configuracion_nombre"),
      atributo_principal_nombre: obtenerValor("atributo_principal_nombre") || null,
      atributo_principal_valor: obtenerValor("atributo_principal_valor") || null,
      atributo_secundario_nombre: obtenerValor("atributo_secundario_nombre") || null,
      atributo_secundario_valor: obtenerValor("atributo_secundario_valor") || null,
      atributo_extra_nombre: obtenerValor("atributo_extra_nombre") || null,
      atributo_extra_valor: obtenerValor("atributo_extra_valor") || null,
      observaciones: obtenerValor("configuracion_observaciones") || null,
      activa: obtenerCheck("configuracion_activa"),
      es_predeterminada: obtenerCheck("configuracion_predeterminada"),
    };

    if (configuracionId) {
      await actualizarConfiguracionProducto(Number(configuracionId), payload);
      mostrarToast("Configuración actualizada correctamente.", "success");
    } else {
      await crearConfiguracionProducto(estado.productoId, payload);
      mostrarToast("Configuración creada correctamente.", "success");
    }

    modalConfiguracion.hide();
    await cargarConfiguracionesYVariantes();
  } catch (error) {
    mostrarToast(error.message, "danger");
  }
}

function renderizarConfiguraciones() {
  if (!estado.configuraciones.length) {
    elementos.listaConfiguraciones.innerHTML = `
      <div class="text-muted small">
        Este producto todavía no tiene configuraciones.
      </div>
    `;
    return;
  }

  elementos.listaConfiguraciones.innerHTML = estado.configuraciones
    .map((configuracion) => {
      const atributos = construirTextoAtributos(configuracion);

      return `
        <div class="configuracion-item">
          <div class="d-flex justify-content-between gap-2">
            <div>
              <div class="configuracion-nombre">${escaparHtml(configuracion.nombre)}</div>
              <div class="configuracion-meta">${escaparHtml(atributos || "Sin atributos adicionales")}</div>
              <div class="mt-2">
                ${configuracion.activa ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>'}
                ${configuracion.es_predeterminada ? '<span class="badge text-bg-primary">Predeterminada</span>' : ""}
              </div>
            </div>

            <button
              class="btn btn-outline-primary btn-sm"
              type="button"
              data-accion-configuracion="editar"
              data-id="${configuracion.id}"
            >
              Editar
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function manejarAccionesConfiguracion(evento) {
  const boton = evento.target.closest("[data-accion-configuracion]");

  if (!boton) return;

  const accion = boton.dataset.accionConfiguracion;
  const configuracionId = Number(boton.dataset.id);

  if (accion === "editar") {
    abrirModalEditarConfiguracion(configuracionId);
  }
}

function renderizarOpcionesConfiguracionVariante(configuracionActualId = null) {
  elementos.selectConfiguracionVariante.innerHTML = '<option value="">Sin configuración</option>';

  const configuracionesPermitidas = estado.configuraciones.filter((configuracion) => {
    if (configuracion.activa) return true;

    return configuracionActualId !== null && configuracion.id === configuracionActualId;
  });

  configuracionesPermitidas.forEach((configuracion) => {
    const option = document.createElement("option");
    option.value = configuracion.id;

    option.textContent = configuracion.activa
      ? configuracion.nombre
      : `${configuracion.nombre} (inactiva)`;

    elementos.selectConfiguracionVariante.appendChild(option);
  });
}

function abrirModalNuevaVariante() {
  if (!estado.productoId) {
    mostrarToast("Guarda primero el producto.", "warning");
    return;
  }

  elementos.formVariante.reset();

  setValor("variante_id", "");
  setValor("variante_stock", 0);
  setValor("variante_stock_minimo", 0);
  setValor("variante_condicion", "nuevo");

  setCheck("variante_activa", true);
  setCheck("variante_predeterminada", false);
  setCheck("variante_publicar_merchant", false);

  renderizarOpcionesConfiguracionVariante();
  actualizarControlTipoComercialVariante();

  if (!estado.operacionImagenVarianteActiva) {
    activarTabVariante("tab-variante-operacion");
  }

  elementos.tituloModalVariante.textContent = "Nueva variante";

  inicializarCamposSeoAutogenerables(true);
  autogenerarCamposVariante();
  actualizarContadoresSeoMerchant();
  actualizarEstadoMerchant();

  limpiarGestionImagenesVariante();

  modalVariante.show();
}

function abrirModalEditarVariante(varianteId) {
  const variante = estado.variantes.find((item) => item.id === varianteId);

  if (!variante) return;

  elementos.formVariante.reset();

  renderizarOpcionesConfiguracionVariante(variante.configuracion_id || null);

  setValor("variante_id", variante.id);
  setValor("variante_configuracion_id", variante.configuracion_id || "");
  setValor("variante_principal", variante.variante_principal || "");
  setValor("variante_marca_repuesto", variante.marca_repuesto || "");

  actualizarControlTipoComercialVariante(variante.variante_principal || "");

  setValor("variante_nombre", variante.nombre || "");
  setValor("variante_precio", variante.precio ?? "");
  setValor("variante_costo", variante.costo ?? "");
  setValor("variante_stock", variante.stock ?? 0);
  setValor("variante_stock_minimo", variante.stock_minimo ?? 0);

  setValor("variante_codigo_interno", variante.codigo_interno || "");
  setValor("variante_referencia_oem", variante.referencia_oem || "");
  setValor("variante_ubicacion", variante.ubicacion || "");
  setValor("variante_secundaria", variante.variante_secundaria || "");

  setValor("variante_condicion", variante.condicion || "nuevo");

  setValor("variante_slug", variante.slug || "");
  setValor("variante_titulo_seo", variante.titulo_seo || "");
  setValor("variante_resumen_seo", variante.resumen_seo || "");
  setValor("variante_descripcion_merchant", variante.descripcion_merchant || "");
  setValor("variante_incluye", variante.incluye || "");
  setValor("variante_paquete", variante.paquete || "");
  setValor("variante_sku", variante.sku || "");

  setCheck("variante_activa", variante.activa);
  setCheck("variante_predeterminada", variante.es_predeterminada);
  setCheck("variante_publicar_merchant", variante.publicar_merchant);

  if (!estado.operacionImagenVarianteActiva) {
    activarTabVariante("tab-variante-operacion");
  }

  inicializarCamposSeoAutogenerables(false);
  actualizarContadoresSeoMerchant();
  actualizarEstadoMerchant();

  elementos.tituloModalVariante.textContent = "Editar variante";

  limpiarGestionImagenesVariante(variante.id);
  cargarImagenesVariante(variante.id);

  modalVariante.show();
}

async function guardarVariante(evento) {
  evento.preventDefault();

  if (!estado.productoId) {
    mostrarToast("Guarda primero el producto.", "warning");
    return;
  }

  try {
    const varianteId = obtenerValor("variante_id");

    sincronizarTipoComercialVariante();

    const validacion = validarVarianteAntesDeGuardar();

    if (!validacion.valida) {
      if (validacion.tab === "seo") {
        activarTabVariante("tab-variante-seo");
      } else {
        if (!estado.operacionImagenVarianteActiva) {
          activarTabVariante("tab-variante-operacion");
        }
      }

      mostrarToast(validacion.mensaje, "warning");
      return;
    }

    const payload = {
      producto_id: estado.productoId,
      configuracion_id: obtenerValor("variante_configuracion_id")
        ? Number(obtenerValor("variante_configuracion_id"))
        : null,

      variante_principal: obtenerValor("variante_principal") || null,
      variante_secundaria: obtenerValor("variante_secundaria") || null,
      marca_repuesto: obtenerValor("variante_marca_repuesto") || null,

      nombre: obtenerValor("variante_nombre"),
      slug: obtenerValor("variante_slug") || null,
      titulo_seo: obtenerValor("variante_titulo_seo") || null,
      resumen_seo: obtenerValor("variante_resumen_seo") || null,
      descripcion_merchant: obtenerValor("variante_descripcion_merchant") || null,

      incluye: obtenerValor("variante_incluye") || null,
      paquete: obtenerValor("variante_paquete") || null,

      condicion: obtenerValor("variante_condicion") || "nuevo",
      publicar_merchant: obtenerCheck("variante_publicar_merchant"),

      codigo_interno: obtenerValor("variante_codigo_interno") || null,
      sku: obtenerValor("variante_sku") || null,
      referencia_oem: obtenerValor("variante_referencia_oem") || null,

      precio: Number(obtenerValor("variante_precio")),
      costo: obtenerValor("variante_costo") ? Number(obtenerValor("variante_costo")) : null,
      stock: Number(obtenerValor("variante_stock") || 0),
      stock_minimo: Number(obtenerValor("variante_stock_minimo") || 0),
      ubicacion: obtenerValor("variante_ubicacion") || null,

      activa: obtenerCheck("variante_activa"),
      es_predeterminada: obtenerCheck("variante_predeterminada"),
    };

    if (varianteId) {
      await actualizarVarianteProducto(Number(varianteId), payload);
      mostrarToast("Variante actualizada correctamente.", "success");
    } else {
      await crearVarianteProducto(estado.productoId, payload);
      mostrarToast("Variante creada correctamente.", "success");
    }

    modalVariante.hide();
    await cargarConfiguracionesYVariantes();
  } catch (error) {
    mostrarToast(error.message, "danger");
  }
}

function limpiarGestionImagenesVariante(varianteId = null) {
  estado.imagenesVariante = [];
  estado.imagenPendienteEliminarId = null;

  limpiarFormularioImagenVariante();

  if (!elementos.alertaImagenesVarianteNueva || !elementos.contenedorImagenesVariante) {
    return;
  }

  if (!varianteId) {
    elementos.alertaImagenesVarianteNueva.classList.remove("d-none");
    elementos.contenedorImagenesVariante.classList.add("d-none");
    renderizarImagenesVariante();
    return;
  }

  elementos.alertaImagenesVarianteNueva.classList.add("d-none");
  elementos.contenedorImagenesVariante.classList.remove("d-none");
  renderizarImagenesVariante();
}

async function cargarImagenesVariante(varianteId) {
  if (!varianteId) return;

  try {
    estado.imagenesVarianteCargando = true;
    renderizarImagenesVariante();

    estado.imagenesVariante = await obtenerImagenesVariante(varianteId);
    renderizarImagenesVariante();
  } catch (error) {
    mostrarToast(error.message, "danger");
  } finally {
    estado.imagenesVarianteCargando = false;
    renderizarImagenesVariante();
  }
}

function renderizarImagenesVariante() {
  if (elementos.contadorImagenesVariante) {
    elementos.contadorImagenesVariante.textContent =
      `${estado.imagenesVariante.length}/${MAXIMO_IMAGENES_VARIANTE}`;
  }

  if (!elementos.listaImagenesVariante) return;

  const varianteId = obtenerValor("variante_id");

  if (!varianteId) {
    elementos.listaImagenesVariante.innerHTML = `
      <div class="text-muted small">
        Guarda primero la variante para poder subir imágenes.
      </div>
    `;
    actualizarEstadoBotonSubirImagen();
    return;
  }

  if (estado.imagenesVarianteCargando) {
    elementos.listaImagenesVariante.innerHTML = `
      <div class="text-muted small">
        Cargando imágenes...
      </div>
    `;
    actualizarEstadoBotonSubirImagen();
    return;
  }

  if (!estado.imagenesVariante.length) {
    elementos.listaImagenesVariante.innerHTML = `
      <div class="text-muted small">
        Esta variante todavía no tiene imágenes.
      </div>
    `;
    actualizarEstadoBotonSubirImagen();
    return;
  }

  elementos.listaImagenesVariante.innerHTML = `
    <div class="row g-3">
      ${estado.imagenesVariante.map(construirTarjetaImagenVariante).join("")}
    </div>
  `;

  actualizarEstadoBotonSubirImagen();
}

function construirTarjetaImagenVariante(imagen) {
  const url = construirUrlImagen(imagen.url_imagen);
  const alt = imagen.texto_alternativo || "Imagen de variante";
  const esperandoConfirmacion = estado.imagenPendienteEliminarId === imagen.id;

  const textoPrincipal = imagen.es_principal
    ? '<span class="badge text-bg-primary">Principal</span>'
    : '<span class="badge text-bg-light border">Galería</span>';

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <div class="card h-100">
        <div class="imagen-variante-preview">
          <img
            src="${escaparHtml(url)}"
            alt="${escaparHtml(alt)}"
            loading="lazy"
          >
        </div>

        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              ${textoPrincipal}
              <span class="badge text-bg-light border">Orden ${imagen.orden}</span>
            </div>
          </div>

          <div class="small text-muted mb-2">
            ${escaparHtml(imagen.texto_alternativo || "Alt automático pendiente")}
          </div>

          ${
            esperandoConfirmacion
              ? `
                <div class="alert alert-warning py-2 px-3 mb-0">
                  <div class="small mb-2">
                    ¿Eliminar esta imagen de la variante?
                  </div>

                  <div class="d-flex flex-wrap gap-2">
                    <button
                      class="btn btn-outline-danger btn-sm"
                      type="button"
                      data-accion-imagen="confirmar-eliminar"
                      data-id="${imagen.id}"
                    >
                      Sí, eliminar
                    </button>

                    <button
                      class="btn btn-outline-secondary btn-sm"
                      type="button"
                      data-accion-imagen="cancelar-eliminar"
                      data-id="${imagen.id}"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              `
              : `
                <div class="d-flex flex-wrap gap-2">
                  ${
                    imagen.es_principal
                      ? ""
                      : `
                        <button
                          class="btn btn-outline-primary btn-sm"
                          type="button"
                          data-accion-imagen="principal"
                          data-id="${imagen.id}"
                        >
                          Marcar principal
                        </button>
                      `
                  }

                  <button
                    class="btn btn-outline-danger btn-sm"
                    type="button"
                    data-accion-imagen="eliminar"
                    data-id="${imagen.id}"
                  >
                    Eliminar
                  </button>
                </div>
              `
          }
        </div>
      </div>
    </div>
  `;
}

function actualizarEstadoBotonSubirImagen() {
  if (!elementos.btnSubirImagenVariante) return;

  const varianteId = obtenerValor("variante_id");
  const limiteAlcanzado = estado.imagenesVariante.length >= MAXIMO_IMAGENES_VARIANTE;

  elementos.btnSubirImagenVariante.disabled = !varianteId || limiteAlcanzado;

  if (!varianteId) {
    elementos.btnSubirImagenVariante.textContent = "Guarda primero";
    return;
  }

  if (limiteAlcanzado) {
    elementos.btnSubirImagenVariante.textContent = "Máximo 7";
    return;
  }

  elementos.btnSubirImagenVariante.textContent = "Subir";
}

async function subirImagenVarianteDesdeFormulario(evento) {
  evento?.preventDefault();
  evento?.stopPropagation();

  const varianteId = obtenerValor("variante_id");

  if (!varianteId) {
    mostrarToast("Guarda primero la variante antes de subir imágenes.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  if (estado.imagenesVariante.length >= MAXIMO_IMAGENES_VARIANTE) {
    mostrarToast("La variante ya tiene el máximo de 7 imágenes.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  const archivo = elementos.inputImagenVarianteArchivo?.files?.[0];

  if (!archivo) {
    mostrarToast("Selecciona una imagen para subir.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!tiposPermitidos.includes(archivo.type)) {
    mostrarToast("Formato no permitido. Usa JPG, PNG o WEBP.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  const tamanoMaximo = 5 * 1024 * 1024;

  if (archivo.size > tamanoMaximo) {
    mostrarToast("La imagen supera el tamaño máximo de 5 MB.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  const ordenValor = obtenerValor("imagenVarianteOrden");
  const orden = ordenValor ? Number(ordenValor) : null;

  if (orden !== null && (!Number.isInteger(orden) || orden < 1 || orden > 7)) {
    mostrarToast("El orden debe estar entre 1 y 7.", "warning");
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  try {
    estado.operacionImagenVarianteActiva = true;
    estado.reabrirModalVarianteEnImagenes = true;
    estado.cierreManualModalVariante = false;

    mantenerModalVarianteAbiertoEnImagenes();
    alternarSubiendoImagen(true);

    await subirImagenVariante(Number(varianteId), {
      archivo,
      texto_alternativo: null,
      orden,
      es_principal: obtenerCheck("imagenVariantePrincipal"),
    });

    mostrarToast("Imagen subida correctamente.", "success");
    limpiarFormularioImagenVariante();

    await cargarImagenesVariante(Number(varianteId));

    mantenerModalVarianteAbiertoEnImagenes();
  } catch (error) {
    mostrarToast(error.message, "danger");
    mantenerModalVarianteAbiertoEnImagenes();
  } finally {
    alternarSubiendoImagen(false);

    window.setTimeout(() => {
      estado.operacionImagenVarianteActiva = false;
      estado.reabrirModalVarianteEnImagenes = false;
      activarTabVariante("tab-variante-imagenes");
    }, 450);
  }
}

function manejarAccionesImagenVariante(evento) {
  evento.preventDefault();
  evento.stopPropagation();

  const boton = evento.target.closest("[data-accion-imagen]");

  if (!boton) return;

  const accion = boton.dataset.accionImagen;
  const imagenId = Number(boton.dataset.id);

  if (accion === "principal") {
    marcarImagenVarianteComoPrincipal(imagenId);
    return;
  }

  if (accion === "eliminar") {
    estado.imagenPendienteEliminarId = imagenId;
    renderizarImagenesVariante();
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  if (accion === "cancelar-eliminar") {
    estado.imagenPendienteEliminarId = null;
    renderizarImagenesVariante();
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  if (accion === "confirmar-eliminar") {
    eliminarImagenVarianteActual(imagenId);
  }
}

async function marcarImagenVarianteComoPrincipal(imagenId) {
  const varianteId = Number(obtenerValor("variante_id"));

  if (!varianteId) {
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  try {
    estado.operacionImagenVarianteActiva = true;
    estado.reabrirModalVarianteEnImagenes = true;
    estado.cierreManualModalVariante = false;

    mantenerModalVarianteAbiertoEnImagenes();

    await actualizarImagenVariante(imagenId, {
      es_principal: true,
    });

    mostrarToast("Imagen principal actualizada.", "success");

    await cargarImagenesVariante(varianteId);

    mantenerModalVarianteAbiertoEnImagenes();
  } catch (error) {
    mostrarToast(error.message, "danger");
    mantenerModalVarianteAbiertoEnImagenes();
  } finally {
    window.setTimeout(() => {
      estado.operacionImagenVarianteActiva = false;
      estado.reabrirModalVarianteEnImagenes = false;
      activarTabVariante("tab-variante-imagenes");
    }, 450);
  }
}

async function eliminarImagenVarianteActual(imagenId) {
  const varianteId = Number(obtenerValor("variante_id"));

  if (!varianteId) {
    mantenerModalVarianteAbiertoEnImagenes();
    return;
  }

  try {
    estado.operacionImagenVarianteActiva = true;
    estado.reabrirModalVarianteEnImagenes = true;
    estado.cierreManualModalVariante = false;

    mantenerModalVarianteAbiertoEnImagenes();

    await eliminarImagenVariante(imagenId);

    estado.imagenPendienteEliminarId = null;

    mostrarToast("Imagen eliminada correctamente.", "success");

    await cargarImagenesVariante(varianteId);

    mantenerModalVarianteAbiertoEnImagenes();
  } catch (error) {
    mostrarToast(error.message, "danger");
    mantenerModalVarianteAbiertoEnImagenes();
  } finally {
    window.setTimeout(() => {
      estado.operacionImagenVarianteActiva = false;
      estado.reabrirModalVarianteEnImagenes = false;
      activarTabVariante("tab-variante-imagenes");
    }, 450);
  }
}

function mantenerModalVarianteAbiertoEnImagenes() {
  activarTabVariante("tab-variante-imagenes");

  if (!modalVariante || !elementos.modalVariante) {
    return;
  }

  const modalVisible = elementos.modalVariante.classList.contains("show");

  if (!modalVisible) {
    modalVariante.show();

    window.setTimeout(() => {
      activarTabVariante("tab-variante-imagenes");
    }, 80);
  }
}

function limpiarFormularioImagenVariante() {
  if (elementos.inputImagenVarianteArchivo) {
    elementos.inputImagenVarianteArchivo.value = "";
  }

  if (elementos.inputImagenVarianteOrden) {
    elementos.inputImagenVarianteOrden.value = "";
  }

  if (elementos.inputImagenVariantePrincipal) {
    elementos.inputImagenVariantePrincipal.checked = false;
  }

  actualizarEstadoBotonSubirImagen();
}

function alternarSubiendoImagen(subiendo) {
  if (!elementos.btnSubirImagenVariante) return;

  elementos.btnSubirImagenVariante.disabled = subiendo;

  if (subiendo) {
    elementos.btnSubirImagenVariante.textContent = "Subiendo...";
    return;
  }

  actualizarEstadoBotonSubirImagen();
}

function construirUrlImagen(urlImagen) {
  if (!urlImagen) return "";

  if (String(urlImagen).startsWith("http")) {
    return urlImagen;
  }

  return `${URL_BASE_BACKEND}${urlImagen}`;
}

function prepararEstilosEnfoqueVariante() {
  if (document.getElementById("estilos-enfoque-variante")) {
    return;
  }

  const estilos = document.createElement("style");
  estilos.id = "estilos-enfoque-variante";

  estilos.textContent = `
    .variante-destacada-temporal {
      outline: 2px solid var(--color-azul-marca);
      outline-offset: -2px;
      background-color: rgba(13, 110, 253, 0.08) !important;
      transition: background-color 0.3s ease, outline-color 0.3s ease;
    }

    .variante-destacada-temporal td {
      background-color: rgba(13, 110, 253, 0.08) !important;
    }
  `;

  document.head.appendChild(estilos);
}

function aplicarEnfoqueVarianteDesdeUrl() {
  const varianteId = estado.varianteIdPendienteEnfoque;

  if (!varianteId) {
    return;
  }

  const varianteExiste = estado.variantes.some(
    (variante) => Number(variante.id) === Number(varianteId)
  );

  if (!varianteExiste) {
    mostrarToast("La variante indicada no pertenece a este producto o ya no existe.", "warning");
    estado.varianteIdPendienteEnfoque = null;
    return;
  }

  setTimeout(() => {
    const fila = document.querySelector(`[data-variante-fila="${varianteId}"]`);
    const seccionVariantes = elementos.listaVariantes?.closest("section");

    if (seccionVariantes) {
      seccionVariantes.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    if (fila) {
      fila.classList.add("variante-destacada-temporal");

      setTimeout(() => {
        fila.classList.remove("variante-destacada-temporal");
      }, 4500);
    }

    abrirModalEditarVariante(varianteId);
  }, 300);

  estado.varianteIdPendienteEnfoque = null;
}

function renderizarVariantes() {
  if (!estado.variantes.length) {
    elementos.listaVariantes.innerHTML = `
      <div class="text-muted small">
        Este producto todavía no tiene variantes comerciales.
      </div>
    `;
    return;
  }

  elementos.listaVariantes.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover align-middle tabla-variantes-producto">
        <thead>
          <tr>
            <th class="col-tipo">Tipo</th>
            <th class="col-configuracion">Configuración</th>
            <th class="col-codigo">Código</th>
            <th class="col-marca">Marca</th>
            <th>Stock</th>
            <th>Venta</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th class="col-acciones text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${estado.variantes.map(construirFilaVariante).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function construirFilaVariante(variante) {
  const tipo = variante.variante_principal || "—";
  const configuracion = variante.nombre_configuracion || "No";
  const codigo = variante.codigo_interno || variante.sku || "—";
  const marca = variante.marca_repuesto || "—";
  const textoAccionEstado = variante.activa ? "Desactivar" : "Activar";
  const claseEstado = variante.activa ? "btn-outline-danger" : "btn-outline-success";

  return `
    <tr data-variante-fila="${variante.id}">
      <td>${escaparHtml(tipo)}</td>
      <td>${escaparHtml(configuracion)}</td>
      <td>${escaparHtml(codigo)}</td>
      <td>${escaparHtml(marca)}</td>
      <td>${variante.stock}</td>
      <td>${formatearMoneda(variante.precio)}</td>
      <td>${escaparHtml(variante.ubicacion || "—")}</td>
      <td>
        ${variante.activa ? '<span class="badge text-bg-success">Activa</span>' : '<span class="badge text-bg-secondary">Inactiva</span>'}
        ${variante.publicar_merchant ? '<span class="badge text-bg-info ms-1">Merchant</span>' : ""}
      </td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button
            class="btn btn-outline-primary"
            type="button"
            data-accion-variante="editar"
            data-id="${variante.id}"
          >
            Editar
          </button>

          <button
            class="btn ${claseEstado}"
            type="button"
            data-accion-variante="cambiar-estado"
            data-id="${variante.id}"
          >
            ${textoAccionEstado}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function manejarAccionesVariante(evento) {
  const boton = evento.target.closest("[data-accion-variante]");

  if (!boton) return;

  const accion = boton.dataset.accionVariante;
  const varianteId = Number(boton.dataset.id);

  if (accion === "editar") {
    abrirModalEditarVariante(varianteId);
    return;
  }

  if (accion === "cambiar-estado") {
    abrirModalCambioEstadoVariante(varianteId);
  }
}

function abrirModalCambioEstadoVariante(varianteId) {
  const variante = estado.variantes.find((item) => item.id === varianteId);

  if (!variante) return;

  estado.variantePendienteCambioEstado = variante;

  const accion = variante.activa ? "desactivar" : "activar";

  elementos.textoConfirmarEstadoVariante.textContent =
    `¿Deseas ${accion} la variante ${variante.variante_principal || ""} ${variante.nombre || ""}?`;

  elementos.btnConfirmarDesactivarVariante.textContent = variante.activa
    ? "Desactivar"
    : "Activar";

  elementos.btnConfirmarDesactivarVariante.className = variante.activa
    ? "btn btn-outline-danger"
    : "btn btn-outline-success";

  modalConfirmarDesactivarVariante.show();
}

async function confirmarCambioEstadoVariante() {
  if (!estado.variantePendienteCambioEstado) return;

  const variante = estado.variantePendienteCambioEstado;
  const textoBotonOriginal = variante.activa ? "Desactivar" : "Activar";

  try {
    elementos.btnConfirmarDesactivarVariante.disabled = true;
    elementos.btnConfirmarDesactivarVariante.textContent = variante.activa
      ? "Desactivando..."
      : "Activando...";

    if (variante.activa) {
      await desactivarVarianteProducto(variante.id);
      mostrarToast("Variante desactivada correctamente.", "success");
    } else {
      await actualizarVarianteProducto(variante.id, { activa: true });
      mostrarToast("Variante activada correctamente.", "success");
    }

    estado.variantePendienteCambioEstado = null;
    cerrarModalConfirmacionVariante();

    await cargarConfiguracionesYVariantes();
  } catch (error) {
    estado.variantePendienteCambioEstado = null;
    mostrarErrorVarianteDespuesDeCerrarConfirmacion(error.message);
  } finally {
    elementos.btnConfirmarDesactivarVariante.disabled = false;
    elementos.btnConfirmarDesactivarVariante.textContent = textoBotonOriginal;
  }
}

function cerrarModalConfirmacionVariante() {
  if (modalConfirmarDesactivarVariante) {
    modalConfirmarDesactivarVariante.hide();
  }
}

function modalConfirmacionVarianteEstaVisible() {
  return elementos.modalConfirmarDesactivarVariante?.classList.contains("show");
}

function mostrarErrorVarianteDespuesDeCerrarConfirmacion(mensaje) {
  if (!modalConfirmarDesactivarVariante || !modalConfirmacionVarianteEstaVisible()) {
    mostrarToast(mensaje, "danger");
    return;
  }

  elementos.modalConfirmarDesactivarVariante.addEventListener(
    "hidden.bs.modal",
    () => mostrarToast(mensaje, "danger"),
    { once: true }
  );

  cerrarModalConfirmacionVariante();
}

function construirTextoAtributos(configuracion) {
  const partes = [];

  if (configuracion.atributo_principal_nombre || configuracion.atributo_principal_valor) {
    partes.push(`${configuracion.atributo_principal_nombre || "Atributo"}: ${configuracion.atributo_principal_valor || "—"}`);
  }

  if (configuracion.atributo_secundario_nombre || configuracion.atributo_secundario_valor) {
    partes.push(`${configuracion.atributo_secundario_nombre || "Atributo"}: ${configuracion.atributo_secundario_valor || "—"}`);
  }

  if (configuracion.atributo_extra_nombre || configuracion.atributo_extra_valor) {
    partes.push(`${configuracion.atributo_extra_nombre || "Atributo"}: ${configuracion.atributo_extra_valor || "—"}`);
  }

  return partes.join(" · ");
}

function autogenerarSlug() {
  if (estado.productoId) {
    return;
  }

  const slugTecnico = construirSlugProductoTecnico();

  if (slugTecnico) {
    setValor("slug", slugTecnico);
    return;
  }

  setValor("slug", convertirSlug(obtenerValor("nombre")));
}

function autogenerarCamposVariante() {
  sincronizarTipoComercialVariante();

  const tipoComercial = obtenerValor("variante_principal");
  const configuracionNombre = obtenerNombreConfiguracionSeleccionada();
  const marcaRepuesto = obtenerValor("variante_marca_repuesto");
  const referenciaOem =
    obtenerValor("variante_referencia_oem") ||
    estado.producto?.referencia_original ||
    obtenerValor("referencia_original");

  const titulo = construirTituloVariante(tipoComercial, configuracionNombre);
  const slug = construirSlugVariante(tipoComercial, configuracionNombre);

  if (debeAutogenerarCampo("variante_titulo_seo")) {
    setValorAutogenerado("variante_titulo_seo", titulo.slice(0, 150));
  }

  const varianteId = obtenerValor("variante_id");
  const slugActual = obtenerValor("variante_slug");

  if (!varianteId || !slugActual) {
    setValor("variante_slug", slug.slice(0, 220));
  }

  if (debeAutogenerarCampo("variante_resumen_seo")) {
    const resumen = construirResumenSeoVariante({
      tipoComercial,
      configuracionNombre,
      marcaRepuesto,
      referenciaOem,
    });

    setValorAutogenerado("variante_resumen_seo", resumen.slice(0, 255));
  }

  if (debeAutogenerarCampo("variante_descripcion_merchant")) {
    const descripcion = construirDescripcionMerchantVariante({
      tipoComercial,
      configuracionNombre,
      marcaRepuesto,
      referenciaOem,
    });

    setValorAutogenerado("variante_descripcion_merchant", descripcion.slice(0, 5000));
  }

  actualizarContadoresSeoMerchant();
}

function obtenerTipoComercialDiferente(tipoComercial, tipoRepuesto) {
  const comercial = String(tipoComercial || "").trim();
  const repuesto = String(tipoRepuesto || "").trim();

  if (!comercial) return "";

  if (normalizarTextoBase(comercial) === normalizarTextoBase(repuesto)) {
    return "";
  }

  return comercial;
}

function agregarParteSlugSinDuplicar(partes, valor) {
  const slug = convertirSlug(valor);

  if (!slug) return;

  if (partes.includes(slug)) return;

  partes.push(slug);
}

function construirTituloVariante(tipoComercial, configuracionNombre) {
  const nombreProducto = obtenerValor("nombre") || estado.producto?.nombre || "";
  const tipoRepuesto = obtenerValor("tipo_repuesto") || estado.producto?.tipo_repuesto || "";
  const tipoComercialTexto = obtenerTipoComercialDiferente(tipoComercial, tipoRepuesto);

  if (nombreProducto && tipoRepuesto && tipoComercialTexto) {
    const regexTipo = new RegExp(`^(${escaparRegex(tipoRepuesto)})\\b`, "i");

    if (regexTipo.test(nombreProducto)) {
      const titulo = nombreProducto.replace(regexTipo, (coincidencia) => {
        return `${capitalizar(coincidencia)} ${capitalizar(tipoComercialTexto)}`;
      });

      return limpiarTextoSeo(
        configuracionNombre
          ? `${titulo} ${configuracionNombre}`
          : titulo
      );
    }
  }

  if (nombreProducto) {
    const partes = [nombreProducto];

    if (tipoComercialTexto) partes.push(capitalizar(tipoComercialTexto));
    if (configuracionNombre) partes.push(configuracionNombre);

    return limpiarTextoSeo(partes.join(" "));
  }

  return limpiarTextoSeo(
    [
      capitalizar(tipoRepuesto),
      tipoComercialTexto ? capitalizar(tipoComercialTexto) : "",
      configuracionNombre,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function escaparRegex(valor) {
  return String(valor || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function construirSlugProductoTecnico() {
  const tipoRepuesto = obtenerValor("tipo_repuesto") || detectarTipoRepuestoDesdeCategoria();
  const marcas = obtenerMarcasSeleccionadasTexto();
  const cilindraje = obtenerValor("cilindraje");
  const motor = obtenerValor("motor");
  const combustible = obtenerValor("tipo_combustible");

  const partes = [];

  if (tipoRepuesto) partes.push(tipoRepuesto);
  if (marcas) partes.push(marcas);
  if (cilindraje) partes.push(cilindraje);
  if (motor) partes.push(motor);
  if (combustible) partes.push(combustible);

  const texto = partes
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return convertirSlug(texto);
}

function construirSlugVariante(tipoComercial, configuracionNombre) {
  const tipoRepuesto = obtenerValor("tipo_repuesto") || estado.producto?.tipo_repuesto || "";

  const slugProducto =
    obtenerValor("slug") ||
    estado.producto?.slug ||
    construirSlugProductoTecnico() ||
    convertirSlug(obtenerValor("nombre") || estado.producto?.nombre || "");

  const partes = [slugProducto].filter(Boolean);
  const tipoComercialDiferente = obtenerTipoComercialDiferente(tipoComercial, tipoRepuesto);

  agregarParteSlugSinDuplicar(partes, tipoComercialDiferente);
  agregarParteSlugSinDuplicar(partes, configuracionNombre);

  return partes.filter(Boolean).join("-");
}

function construirResumenSeoVariante({
  tipoComercial,
  configuracionNombre,
  marcaRepuesto,
  referenciaOem,
}) {
  const tipoRepuesto = obtenerValor("tipo_repuesto") || estado.producto?.tipo_repuesto || "";
  const vehiculos = obtenerVehiculosCompatiblesCortos(4);
  const cilindraje = obtenerValor("cilindraje") || estado.producto?.cilindraje || "";
  const combustible = obtenerValor("tipo_combustible") || estado.producto?.tipo_combustible || "";
  const motor = obtenerValor("motor") || estado.producto?.motor || "";

  const partes = [];

  const tipoComercialDiferente = obtenerTipoComercialDiferente(tipoComercial, tipoRepuesto);

  if (tipoRepuesto) partes.push(capitalizar(tipoRepuesto));
  if (tipoComercialDiferente) partes.push(String(tipoComercialDiferente).toLowerCase());
  if (vehiculos) partes.push(vehiculos);
  //if (cilindraje) partes.push(cilindraje);
  if (combustible) partes.push(capitalizar(combustible));
  if (motor) partes.push(motor);
  if (configuracionNombre) partes.push(configuracionNombre);
  if (referenciaOem) partes.push(referenciaOem);

  let resumen = limpiarTextoSeo(partes.filter(Boolean).join(" "));

  if (marcaRepuesto) {
    resumen += ` marca ${marcaRepuesto}`;
  }

  return `${resumen}.`.replace(/\s+\./g, ".");
}

function construirDescripcionMerchantVariante({
  tipoComercial,
  configuracionNombre,
  marcaRepuesto,
  referenciaOem,
}) {
  const tipoRepuesto = obtenerValor("tipo_repuesto") || estado.producto?.tipo_repuesto || "";
  const vehiculos = obtenerVehiculosCompatiblesCortos(5);
  const cilindraje = obtenerValor("cilindraje") || estado.producto?.cilindraje || "";
  const combustible = obtenerValor("tipo_combustible") || estado.producto?.tipo_combustible || "";
  const motor = obtenerValor("motor") || estado.producto?.motor || "";
  const cilindros = obtenerValor("numero_cilindros") || estado.producto?.numero_cilindros || "";
  const valvulas = obtenerValor("numero_valvulas") || estado.producto?.numero_valvulas || "";
  const material = obtenerValor("material") || estado.producto?.material || "";
  const garantia = obtenerValor("garantia_tiempo") || estado.producto?.garantia_tiempo || "";
  const condicion = obtenerValor("variante_condicion") || "nuevo";

  const incluye =
    limpiarListaComoFrase(obtenerValor("variante_incluye")) ||
    limpiarListaComoFrase(obtenerValor("variante_nombre"));

  const paquete = limpiarListaComoFrase(obtenerValor("variante_paquete"));

  const tipoComercialDiferente = obtenerTipoComercialDiferente(tipoComercial, tipoRepuesto);

  const nombreBase = [
    tipoRepuesto,
    tipoComercialDiferente ? String(tipoComercialDiferente).toLowerCase() : "",
  ]
    .filter(Boolean)
    .join(" ");

  const frases = [];

  if (nombreBase) {
    frases.push(`Compra ${nombreBase}.`);
  }

  const detallesProducto = [];

  detallesProducto.push(`Producto ${condicion}`);

  if (marcaRepuesto) {
    detallesProducto.push(`marca ${marcaRepuesto}`);
  }

  if (material) {
    detallesProducto.push(`en ${material.toLowerCase()}`);
  }

  if (detallesProducto.length) {
    frases.push(`${limpiarTextoSeo(detallesProducto.join(" "))}.`);
  }

  if (vehiculos) {
    frases.push(`Compatible con ${vehiculos}.`);
  }

  const aplicacionTecnica = [];

  if (motor) aplicacionTecnica.push(`motor ${motor}`);
  if (cilindraje) aplicacionTecnica.push(cilindraje);
  if (combustible) aplicacionTecnica.push(capitalizar(combustible));
  if (cilindros) aplicacionTecnica.push(`${cilindros} cilindros`);
  if (valvulas) aplicacionTecnica.push(`${valvulas} válvulas`);

  if (aplicacionTecnica.length) {
    frases.push(`Aplicación técnica: ${aplicacionTecnica.join(", ")}.`);
  }

  if (configuracionNombre) {
    frases.push(`Configuración ${configuracionNombre}.`);
  }

  if (referenciaOem) {
    frases.push(`Referencia OEM ${referenciaOem}.`);
  }

  if (incluye) {
    frases.push(`Incluye ${incluye}.`);
  }

  if (paquete) {
    frases.push(`Paquete: ${paquete}.`);
  }

  if (garantia) {
    frases.push(`Cuenta con garantía de ${garantia}.`);
  }

  frases.push("Verifica compatibilidad por motor, modelo, año y referencia antes de comprar.");
  frases.push("Disponible para cotización por WhatsApp y envío en Colombia.");

  return limpiarTextoSeo(frases.join(" "));
}

function obtenerVehiculosCompatiblesCortos(maximo = 2) {
  const texto =
    obtenerValor("vehiculos_compatibles") ||
    estado.producto?.vehiculos_compatibles ||
    "";

  if (!texto) {
    return obtenerMarcasSeleccionadasTexto();
  }

  const lineas = String(texto)
    .split("\n")
    .map((linea) => linea.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .slice(0, maximo);

  if (!lineas.length) {
    return obtenerMarcasSeleccionadasTexto();
  }

  return lineas.join(", ");
}

function limpiarListaComoFrase(valor) {
  return String(valor || "")
    .split("\n")
    .map((linea) => linea.replace(/^-\s*/, "").trim())
    .filter(Boolean)
    .join(", ");
}

function limpiarTextoSeo(valor) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .trim();
}

function actualizarContadoresSeoMerchant() {
  actualizarContadorCampo(
    elementos.inputTituloSeo,
    elementos.contadorTituloSeo,
    150,
    60,
    75
  );

  actualizarContadorCampo(
    elementos.inputResumenSeo,
    elementos.contadorResumenSeo,
    255,
    140,
    160
  );

  actualizarContadorCampo(
    elementos.inputDescripcionMerchant,
    elementos.contadorDescripcionMerchant,
    5000,
    500,
    1000
  );
}

function actualizarContadorCampo(input, contador, maximo, idealMinimo, idealMaximo) {
  if (!input || !contador) return;

  const longitud = input.value.length;

  contador.textContent = `${longitud}/${maximo}`;

  contador.classList.remove("text-success", "text-warning", "text-danger", "text-muted");

  if (longitud > maximo) {
    contador.classList.add("text-danger");
    return;
  }

  if (longitud >= idealMinimo && longitud <= idealMaximo) {
    contador.classList.add("text-success");
    return;
  }

  if (longitud > 0) {
    contador.classList.add("text-warning");
    return;
  }

  contador.classList.add("text-muted");
}

function actualizarEstadoMerchant() {
  if (!elementos.alertaMerchantVariante || !elementos.inputPublicarMerchant) return;

  const publicarMerchant = obtenerCheck("variante_publicar_merchant");
  const validacion = validarDatosMerchant();

  if (!publicarMerchant) {
    elementos.alertaMerchantVariante.className = "alert alert-light border mt-3 mb-0 d-none";
    elementos.alertaMerchantVariante.innerHTML = "";
    actualizarContadoresSeoMerchant();
    return;
  }

  if (validacion.valida) {
    elementos.alertaMerchantVariante.className = "alert alert-success mt-3 mb-0";
    elementos.alertaMerchantVariante.innerHTML = `
      <strong>Lista para Merchant:</strong>
      esta variante tiene los datos básicos para publicarse en el feed.
    `;
  } else {
    elementos.alertaMerchantVariante.className = "alert alert-warning mt-3 mb-0";
    elementos.alertaMerchantVariante.innerHTML = `
      <strong>Faltan datos para Merchant:</strong>
      <ul class="mb-0 mt-2">
        ${validacion.errores.map((error) => `<li>${escaparHtml(error)}</li>`).join("")}
      </ul>
    `;
  }

  actualizarContadoresSeoMerchant();
}

function validarDatosMerchant() {
  const errores = [];

  if (!obtenerValor("variante_titulo_seo")) {
    errores.push("Título SEO / Merchant.");
  }

  if (!obtenerValor("variante_resumen_seo")) {
    errores.push("Resumen SEO.");
  }

  if (!obtenerValor("variante_descripcion_merchant")) {
    errores.push("Descripción Merchant.");
  }

  if (!obtenerValor("variante_marca_repuesto")) {
    errores.push("Marca del repuesto.");
  }

  if (!obtenerValor("variante_condicion")) {
    errores.push("Condición.");
  }

  const precio = Number(obtenerValor("variante_precio"));

  if (!Number.isFinite(precio) || precio <= 0) {
    errores.push("Precio de venta mayor a cero.");
  }

  const stock = Number(obtenerValor("variante_stock"));

  if (!Number.isFinite(stock) || stock < 0) {
    errores.push("Stock válido.");
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

function validarVarianteAntesDeGuardar() {
  const errores = [];

  if (!obtenerValor("variante_principal")) {
    errores.push("Selecciona o confirma el tipo comercial.");
  }

  if (!obtenerValor("variante_nombre")) {
    errores.push("Escribe la descripción corta de la variante.");
  }

  if (!obtenerValor("variante_marca_repuesto")) {
    errores.push("Escribe la marca del repuesto.");
  }

  const precio = Number(obtenerValor("variante_precio"));

  if (!Number.isFinite(precio) || precio <= 0) {
    errores.push("El precio de venta debe ser mayor a cero.");
  }

  const costoTexto = obtenerValor("variante_costo");

  if (costoTexto && Number(costoTexto) < 0) {
    errores.push("El costo no puede ser negativo.");
  }

  const stock = Number(obtenerValor("variante_stock"));

  if (!Number.isInteger(stock) || stock < 0) {
    errores.push("El stock debe ser un número entero mayor o igual a cero.");
  }

  const stockMinimo = Number(obtenerValor("variante_stock_minimo"));

  if (!Number.isInteger(stockMinimo) || stockMinimo < 0) {
    errores.push("El stock mínimo debe ser un número entero mayor o igual a cero.");
  }

  if (obtenerCheck("variante_publicar_merchant")) {
    const validacionMerchant = validarDatosMerchant();

    if (!validacionMerchant.valida) {
      return {
        valida: false,
        mensaje: "Completa los datos requeridos para publicar esta variante en Merchant.",
        tab: "seo",
      };
    }
  }

  return {
    valida: errores.length === 0,
    mensaje: errores[0] || "",
    tab: "operacion",
  };
}

function inicializarCamposSeoAutogenerables(esNuevaVariante) {
  [
    "variante_titulo_seo",
    "variante_resumen_seo",
    "variante_descripcion_merchant",
  ].forEach((id) => {
    const campo = document.getElementById(id);

    if (!campo) return;

    campo.dataset.autoGenerado = esNuevaVariante || !campo.value ? "true" : "false";
  });
}

function debeAutogenerarCampo(id) {
  const campo = document.getElementById(id);

  if (!campo) return false;

  return campo.dataset.autoGenerado !== "false";
}

function setValorAutogenerado(id, valor) {
  const campo = document.getElementById(id);

  if (!campo) return;

  campo.value = valor || "";
}

function actualizarControlTipoComercialVariante(valorActual = null) {
  if (!elementos.inputTipoVariante || !elementos.inputTipoVarianteVisual) {
    return;
  }

  const tipoDetectado = detectarTipoRepuestoDesdeCategoria();
  const esCulata = normalizarTextoBase(tipoDetectado) === "culata";

  if (esCulata) {
    elementos.grupoTipoVarianteCulatas?.classList.remove("d-none");
    elementos.grupoTipoVarianteAuto?.classList.add("d-none");

    if (elementos.selectTipoVariante && valorActual) {
      elementos.selectTipoVariante.value = valorActual;
    }

    sincronizarTipoComercialVariante();
    return;
  }

  elementos.grupoTipoVarianteCulatas?.classList.add("d-none");
  elementos.grupoTipoVarianteAuto?.classList.remove("d-none");

  const tipoAutomatico = tipoDetectado || obtenerValor("tipo_repuesto") || "repuesto";
  elementos.inputTipoVariante.value = tipoAutomatico;
  elementos.inputTipoVarianteVisual.value = capitalizar(tipoAutomatico);
}

function sincronizarTipoComercialVariante() {
  if (!elementos.inputTipoVariante) return;

  const tipoDetectado = detectarTipoRepuestoDesdeCategoria();
  const esCulata = normalizarTextoBase(tipoDetectado) === "culata";

  if (esCulata && elementos.selectTipoVariante) {
    elementos.inputTipoVariante.value = elementos.selectTipoVariante.value || "";
    return;
  }

  elementos.inputTipoVariante.value = tipoDetectado || obtenerValor("tipo_repuesto") || "repuesto";
}

function obtenerNombreConfiguracionSeleccionada() {
  const configuracionId = Number(obtenerValor("variante_configuracion_id"));

  if (!configuracionId) return "";

  const configuracion = estado.configuraciones.find((item) => item.id === configuracionId);

  return configuracion?.nombre || "";
}

function aplicarTipoDetectadoDesdeCategoria(sobrescribir = true) {
  const tipoDetectado = detectarTipoRepuestoDesdeCategoria();
  const tipoActual = obtenerValor("tipo_repuesto");

  if (sobrescribir || !tipoActual) {
    setValor("tipo_repuesto", tipoDetectado);
  }
}

function detectarTipoRepuestoDesdeCategoria() {
  const categoriaTexto = obtenerTextoSelect("categoria_id");
  const normalizada = normalizarTextoBase(categoriaTexto);

  if (normalizada.includes("culata")) return "culata";
  if (normalizada.includes("ciguenal")) return "cigüeñal";
  if (normalizada.includes("biela")) return "biela";
  if (normalizada.includes("turbo")) return "turbo";
  if (normalizada.includes("inyector")) return "inyector";
  if (normalizada.includes("bomba")) return "bomba de inyección";
  if (normalizada.includes("leva")) return "eje de levas";
  if (normalizada.includes("bloque")) return "bloque";
  if (normalizada.includes("motor")) return "motor";

  return "repuesto";
}

function obtenerMarcasSeleccionadasTexto() {
  const select = document.getElementById("marca_ids");

  if (!select) return "";

  return Array.from(select.selectedOptions)
    .map((option) => option.textContent.trim())
    .filter(Boolean)
    .join(" ");
}

function obtenerTextoSelect(id) {
  const select = document.getElementById(id);

  if (!select) return "";

  if (select.multiple) {
    return Array.from(select.selectedOptions)
      .map((option) => option.textContent.trim())
      .join(" ");
  }

  return select.options[select.selectedIndex]?.textContent || "";
}

function normalizarTextoBase(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function convertirSlug(valor) {
  return normalizarTextoBase(valor)
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function activarTabVariante(tabId) {
  const boton = document.getElementById(tabId);

  if (!boton) return;

  const tab = new bootstrap.Tab(boton);
  tab.show();
}

function obtenerValor(id) {
  const elemento = document.getElementById(id);

  if (!elemento) return "";

  return String(elemento.value || "").trim();
}

function setValor(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.value = valor ?? "";
}

function obtenerCheck(id) {
  const elemento = document.getElementById(id);

  if (!elemento) return false;

  return Boolean(elemento.checked);
}

function setCheck(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.checked = Boolean(valor);
}

function obtenerValoresMultiples(id) {
  const select = document.getElementById(id);

  if (!select) return [];

  return Array.from(select.selectedOptions)
    .map((option) => Number(option.value))
    .filter((valor) => Number.isInteger(valor) && valor > 0);
}

function setValoresMultiples(id, valores) {
  const select = document.getElementById(id);

  if (!select) return;

  const valoresTexto = new Set((valores || []).map((valor) => String(valor)));

  Array.from(select.options).forEach((option) => {
    option.selected = valoresTexto.has(option.value);
  });
}

function setTexto(id, texto) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.textContent = texto ?? "—";
}

function setListaTexto(id, texto) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const lineas = String(texto || "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (!lineas.length) {
    elemento.textContent = "—";
    return;
  }

  elemento.innerHTML = lineas
    .map((linea) => `<div>${escaparHtml(linea)}</div>`)
    .join("");
}

function setTextoConSaltos(id, texto) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const limpio = String(texto || "").trim();

  if (!limpio) {
    elemento.textContent = "—";
    return;
  }

  elemento.innerHTML = escaparHtml(limpio).replaceAll("\n", "<br>");
}

function alternarGuardandoProducto(guardando) {
  if (!elementos.btnGuardarProducto) return;

  elementos.btnGuardarProducto.disabled = guardando;
  elementos.btnGuardarProducto.textContent = guardando ? "Guardando..." : "Guardar producto";
}

function mostrarToast(mensaje, tipo = "info") {
  if (!elementos.contenedorToast) {
    alert(mensaje);
    return;
  }

  const clases = {
    success: "text-bg-success",
    danger: "text-bg-danger",
    warning: "text-bg-warning",
    info: "text-bg-primary",
  };

  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 ${clases[tipo] || clases.info}`;
  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";

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

function formatearMoneda(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));
}

function capitalizar(valor) {
  const texto = String(valor || "").trim();

  if (!texto || texto === "—") return texto || "—";

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}