import {
  actualizarConfiguracionProducto,
  actualizarProducto,
  actualizarVarianteProducto,
  crearConfiguracionProducto,
  crearProducto,
  crearVarianteProducto,
  desactivarVarianteProducto,
  obtenerCategoriasPublicas,
  obtenerConfiguracionesProducto,
  obtenerDetalleProducto,
  obtenerMarcasPublicas,
  obtenerVariantesProducto,
} from "../api.js";

const parametrosUrl = new URLSearchParams(window.location.search);
const productoIdInicial = parametrosUrl.get("id");
const varianteIdInicial = parametrosUrl.get("variante_id");

const estado = {
  productoId: productoIdInicial ? Number(productoIdInicial) : null,
  producto: null,
  configuraciones: [],
  variantes: [],
  variantePendienteCambioEstado: null,

  varianteIdDesdeUrl: varianteIdInicial ? Number(varianteIdInicial) : null,
  varianteIdPendienteEnfoque: varianteIdInicial ? Number(varianteIdInicial) : null,
};

const elementos = {
  btnCerrarSesion: document.getElementById("btnCerrarSesion"),

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

  modalConfirmarDesactivarVariante: document.getElementById("modalConfirmarDesactivarVariante"),
  textoConfirmarEstadoVariante: document.getElementById("textoConfirmarEstadoVariante"),
  btnConfirmarDesactivarVariante: document.getElementById("btnConfirmarDesactivarVariante"),

  contenedorToast: document.getElementById("contenedorToast"),
};

const modalProducto = new bootstrap.Modal(elementos.modalProducto);
const modalConfiguracion = new bootstrap.Modal(elementos.modalConfiguracion);
const modalVariante = new bootstrap.Modal(elementos.modalVariante);
const modalConfirmarDesactivarVariante = new bootstrap.Modal(
  elementos.modalConfirmarDesactivarVariante
);

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  if (!validarSesion()) return;

  registrarEventos();
  prepararEstilosEnfoqueVariante();

  try {
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
  }
}

function validarSesion() {
  const token = localStorage.getItem("token_acceso");

  if (!token) {
    window.location.href = "./login.html";
    return false;
  }

  return true;
}

function registrarEventos() {
  elementos.btnCerrarSesion?.addEventListener("click", () => {
    localStorage.removeItem("token_acceso");
    window.location.href = "./login.html";
  });

  elementos.btnEditarProducto?.addEventListener("click", abrirModalEditarProducto);
  elementos.btnNuevaConfiguracion?.addEventListener("click", abrirModalNuevaConfiguracion);
  elementos.btnNuevaVariante?.addEventListener("click", abrirModalNuevaVariante);

  elementos.formProducto.addEventListener("submit", guardarProducto);
  elementos.formConfiguracion.addEventListener("submit", guardarConfiguracion);
  elementos.formVariante.addEventListener("submit", guardarVariante);

  elementos.listaConfiguraciones.addEventListener("click", manejarAccionesConfiguracion);
  elementos.listaVariantes.addEventListener("click", manejarAccionesVariante);

  elementos.btnConfirmarDesactivarVariante.addEventListener(
    "click",
    confirmarCambioEstadoVariante
  );

  [
    "categoria_id",
    "marca_ids",
    "motor",
    "cilindraje",
    "tipo_combustible",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      aplicarTipoDetectadoDesdeCategoria();
      autogenerarSlug();
    });

    document.getElementById(id)?.addEventListener("change", () => {
      aplicarTipoDetectadoDesdeCategoria();
      actualizarControlTipoComercialVariante();
      autogenerarSlug();
    });
  });

  document.getElementById("nombre")?.addEventListener("input", autogenerarSlug);

  elementos.selectTipoVariante?.addEventListener("change", () => {
    sincronizarTipoComercialVariante();
    autogenerarCamposVariante();
  });

  [
    "variante_configuracion_id",
    "variante_marca_repuesto",
    "variante_referencia_oem",
  ].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", autogenerarCamposVariante);
    document.getElementById(id)?.addEventListener("change", autogenerarCamposVariante);
  });
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

  activarTabVariante("tab-variante-operacion");

  elementos.tituloModalVariante.textContent = "Nueva variante";
  autogenerarCamposVariante();

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

  activarTabVariante("tab-variante-operacion");

  elementos.tituloModalVariante.textContent = "Editar variante";
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
    modalConfirmarDesactivarVariante.hide();

    await cargarConfiguracionesYVariantes();
  } catch (error) {
    mostrarToast(error.message, "danger");
  } finally {
    elementos.btnConfirmarDesactivarVariante.disabled = false;
    elementos.btnConfirmarDesactivarVariante.textContent = "Confirmar";
  }
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

  const productoNombre = obtenerValor("nombre") || estado.producto?.nombre || "";
  const tipoComercial = obtenerValor("variante_principal");
  const configuracionNombre = obtenerNombreConfiguracionSeleccionada();
  const marcaRepuesto = obtenerValor("variante_marca_repuesto");
  const referenciaOem = obtenerValor("variante_referencia_oem");

  const titulo = construirTituloVariante(productoNombre, tipoComercial, configuracionNombre);
  const slug = construirSlugVariante(tipoComercial, configuracionNombre);

  if (!obtenerValor("variante_titulo_seo")) {
    setValor("variante_titulo_seo", titulo.slice(0, 150));
  }

  const varianteId = obtenerValor("variante_id");
  const slugActual = obtenerValor("variante_slug");

  if (!varianteId || !slugActual) {
    setValor("variante_slug", slug.slice(0, 220));
  }

  if (!obtenerValor("variante_resumen_seo") && titulo) {
    const resumen = construirResumenVariante(titulo, marcaRepuesto, referenciaOem);
    setValor("variante_resumen_seo", resumen.slice(0, 255));
  }
}

function construirTituloVariante(productoNombre, tipoComercial, configuracionNombre) {
  const partes = [];

  if (productoNombre) partes.push(productoNombre);
  if (tipoComercial) partes.push(tipoComercial);
  if (configuracionNombre) partes.push(configuracionNombre);

  return partes.join(" ").trim();
}

function construirSlugProductoTecnico() {
  const tipoRepuesto = obtenerValor("tipo_repuesto") || detectarTipoRepuestoDesdeCategoria();
  const marcaPrincipal = obtenerMarcaPrincipalSeleccionada();
  const cilindraje = obtenerValor("cilindraje");
  const motor = obtenerValor("motor");
  const combustible = obtenerValor("tipo_combustible");

  const partes = [];

  if (tipoRepuesto) partes.push(tipoRepuesto);
  partes.push("para motor");
  if (marcaPrincipal) partes.push(marcaPrincipal);
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
  const slugProducto =
    obtenerValor("slug") ||
    estado.producto?.slug ||
    construirSlugProductoTecnico() ||
    convertirSlug(obtenerValor("nombre") || estado.producto?.nombre || "");

  const partes = [slugProducto];

  if (tipoComercial) partes.push(convertirSlug(tipoComercial));
  if (configuracionNombre) partes.push(convertirSlug(configuracionNombre));

  return partes.filter(Boolean).join("-");
}

function obtenerMarcaPrincipalSeleccionada() {
  const select = elementos.selectMarca;

  if (!select) {
    return estado.producto?.marca_nombre || "";
  }

  const seleccionadas = Array.from(select.selectedOptions || []);

  if (seleccionadas.length) {
    return seleccionadas[0].textContent.trim();
  }

  if (estado.producto?.marca_nombres?.length) {
    return estado.producto.marca_nombres[0];
  }

  return estado.producto?.marca_nombre || "";
}

function obtenerNombreCategoriaSeleccionada() {
  const select = elementos.selectCategoria;

  if (!select) {
    return estado.producto?.categoria_nombre || "";
  }

  const option = select.options[select.selectedIndex];

  return option?.textContent?.trim() || estado.producto?.categoria_nombre || "";
}

function normalizarTextoBase(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function detectarTipoRepuestoDesdeCategoria(nombreCategoria = obtenerNombreCategoriaSeleccionada()) {
  const categoria = normalizarTextoBase(nombreCategoria);

  const mapa = {
    culatas: "culata",
    ciguenales: "cigüeñal",
    bielas: "biela",
    turbos: "turbo",
    inyectores: "inyector",
    bombas: "bomba de inyección",
    "bombas de inyeccion": "bomba de inyección",
    "ejes de levas": "eje de levas",
    bloques: "bloque",
    motores: "motor",
  };

  if (mapa[categoria]) {
    return mapa[categoria];
  }

  if (categoria.includes("bomba")) return "bomba de inyección";
  if (categoria.includes("ciguenal")) return "cigüeñal";
  if (categoria.includes("culata")) return "culata";
  if (categoria.includes("biela")) return "biela";
  if (categoria.includes("turbo")) return "turbo";
  if (categoria.includes("inyector")) return "inyector";
  if (categoria.includes("leva")) return "eje de levas";
  if (categoria.includes("bloque")) return "bloque";
  if (categoria.includes("motor")) return "motor";

  return categoria.replace(/s$/, "") || "";
}

function aplicarTipoDetectadoDesdeCategoria(actualizarSiVacio = true) {
  const tipoDetectado = detectarTipoRepuestoDesdeCategoria();

  if (!tipoDetectado) {
    if (actualizarSiVacio && !obtenerValor("tipo_repuesto")) {
      setValor("tipo_repuesto", "");
    }

    return;
  }

  setValor("tipo_repuesto", tipoDetectado);
}

function esCategoriaCulatas() {
  return normalizarTextoBase(obtenerNombreCategoriaSeleccionada()).includes("culata");
}

function obtenerTipoComercialAutomatico() {
  const tipo = detectarTipoRepuestoDesdeCategoria();

  return capitalizar(tipo || "");
}

function actualizarControlTipoComercialVariante(valorActual = null) {
  if (!elementos.inputTipoVariante) return;

  if (esCategoriaCulatas()) {
    elementos.grupoTipoVarianteCulatas?.classList.remove("d-none");
    elementos.grupoTipoVarianteAuto?.classList.add("d-none");

    const valor = valorActual ?? obtenerValor("variante_principal");

    elementos.selectTipoVariante.value = ["Sola", "Parcial", "Completa"].includes(valor)
      ? valor
      : "";

    setValor("variante_principal", elementos.selectTipoVariante.value);
    return;
  }

  const tipoAutomatico = obtenerTipoComercialAutomatico();

  elementos.grupoTipoVarianteCulatas?.classList.add("d-none");
  elementos.grupoTipoVarianteAuto?.classList.remove("d-none");

  setValor("variante_principal", tipoAutomatico);
  setValor("variante_principal_visual", tipoAutomatico);

  if (elementos.selectTipoVariante) {
    elementos.selectTipoVariante.value = "";
  }
}

function sincronizarTipoComercialVariante() {
  if (esCategoriaCulatas()) {
    setValor("variante_principal", elementos.selectTipoVariante?.value || "");
    return;
  }

  const tipoAutomatico = obtenerTipoComercialAutomatico();

  setValor("variante_principal", tipoAutomatico);
  setValor("variante_principal_visual", tipoAutomatico);
}

function construirResumenVariante(titulo, marcaRepuesto, referenciaOem) {
  const partes = [];

  if (titulo) partes.push(`Compra ${titulo}.`);
  if (marcaRepuesto) partes.push(`Marca ${marcaRepuesto}.`);
  if (referenciaOem) partes.push(`Referencia OEM ${referenciaOem}.`);

  partes.push("Disponible para cotización por WhatsApp.");

  return partes.join(" ");
}

function obtenerNombreConfiguracionSeleccionada() {
  const configuracionId = obtenerValor("variante_configuracion_id");

  if (!configuracionId) return "";

  const configuracion = estado.configuraciones.find(
    (item) => String(item.id) === String(configuracionId)
  );

  return configuracion?.nombre || "";
}

function activarTabVariante(tabId) {
  const tab = document.getElementById(tabId);

  if (!tab) return;

  const instancia = bootstrap.Tab.getOrCreateInstance(tab);
  instancia.show();
}

function convertirSlug(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function obtenerValor(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}

function setValor(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.value = valor ?? "";
}

function obtenerValoresMultiples(id) {
  const elemento = document.getElementById(id);

  if (!elemento) return [];

  return Array.from(elemento.selectedOptions)
    .map((option) => Number(option.value))
    .filter((valor) => Number.isInteger(valor) && valor > 0);
}

function setValoresMultiples(id, valores) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const valoresTexto = (valores || []).map((valor) => String(valor));

  Array.from(elemento.options).forEach((option) => {
    option.selected = valoresTexto.includes(String(option.value));
  });
}

function obtenerCheck(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.checked : false;
}

function setCheck(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.checked = Boolean(valor);
}

function setTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  elemento.textContent = valor ?? "—";
}

function setTextoConSaltos(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const texto = valor || "—";
  elemento.innerHTML = escaparHtml(texto).replaceAll("\n", "<br>");
}

function setListaTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) return;

  const texto = String(valor || "").trim();

  if (!texto || texto === "—") {
    elemento.textContent = "—";
    return;
  }

  const lineas = texto
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (!lineas.length) {
    elemento.textContent = texto;
    return;
  }

  elemento.innerHTML = `
    <ul class="producto-lista-compatible">
      ${lineas.map((linea) => `<li>${escaparHtml(linea.replace(/^-\s*/, ""))}</li>`).join("")}
    </ul>
  `;
}

function alternarGuardandoProducto(guardando) {
  elementos.btnGuardarProducto.disabled = guardando;
  elementos.btnGuardarProducto.textContent = guardando ? "Guardando..." : "Guardar producto";
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