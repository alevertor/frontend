import {
  obtenerProductoPublicoPorSlug,
  obtenerProductosPublicos,
} from "../api.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const TELEFONO_WHATSAPP = "573000000000";

const estado = {
  producto: null,
  varianteSeleccionada: null,
  imagenes: [],
  indiceImagen: 0,
};

const elementos = {
  estado: document.getElementById("productoEstado"),
  detalle: document.getElementById("productoDetalle"),

  migaCategoria: document.getElementById("productoMigaCategoria"),
  migaNombre: document.getElementById("productoMigaNombre"),

  titulo: document.getElementById("productoTitulo"),
  anios: document.getElementById("productoAnios"),

  miniaturas: document.getElementById("productoMiniaturas"),
  imagenPrincipal: document.getElementById("productoImagenPrincipal"),
  imagenAnterior: document.getElementById("productoImagenAnterior"),
  imagenSiguiente: document.getElementById("productoImagenSiguiente"),

  precio: document.getElementById("productoPrecio"),
  disponibilidad: document.getElementById("productoDisponibilidad"),
  condicion: document.getElementById("productoCondicion"),
  marca: document.getElementById("productoMarca"),
  garantia: document.getElementById("productoGarantia"),
  whatsapp: document.getElementById("productoWhatsApp"),

  grupoVariantes: document.getElementById("productoGrupoVariantes"),
  variantes: document.getElementById("productoVariantes"),

  grupoConfiguraciones: document.getElementById("productoGrupoConfiguraciones"),
  configuraciones: document.getElementById("productoConfiguraciones"),

  bloqueIncluye: document.getElementById("productoBloqueIncluye"),
  incluye: document.getElementById("productoIncluye"),

  vehiculos: document.getElementById("productoVehiculos"),
  fichaTecnica: document.getElementById("productoFichaTecnica"),

  bloquePaquete: document.getElementById("productoBloquePaquete"),
  paquete: document.getElementById("productoPaquete"),

  bloqueObservaciones: document.getElementById("productoBloqueObservaciones"),
  observaciones: document.getElementById("productoObservaciones"),

  otrosProductos: document.getElementById("otrosProductos"),
  otrosProductosGrid: document.getElementById("otrosProductosGrid"),
};

document.addEventListener("DOMContentLoaded", inicializarProducto);

async function inicializarProducto() {
  const slug = obtenerSlugDesdeUrl();

  if (!slug) {
    mostrarError("No se recibió el producto a consultar.");
    return;
  }

  mostrarCargando();

  try {
    const producto = await obtenerProductoPublicoPorSlug(slug);

    estado.producto = producto;
    estado.varianteSeleccionada = obtenerVarianteSolicitada(producto) || obtenerVarianteInicial(producto);

    pintarProducto();
    configurarEventosGaleria();
    protegerGaleriaProducto();
    cargarOtrosProductos();
  } catch (error) {
    mostrarError(error.message || "No fue posible cargar el producto.");
  }
}

function obtenerSlugDesdeUrl() {
  const parametros = new URLSearchParams(window.location.search);
  return parametros.get("slug");
}

function mostrarCargando() {
  elementos.estado.hidden = false;
  elementos.estado.textContent = "Cargando producto...";
  elementos.estado.className = "producto-estado";
  elementos.detalle.hidden = true;
}

function mostrarError(mensaje) {
  elementos.estado.hidden = false;
  elementos.estado.textContent = mensaje;
  elementos.estado.className = "producto-estado producto-estado-error";
  elementos.detalle.hidden = true;
}

function pintarProducto() {
  const producto = estado.producto;
  const titulo = obtenerTituloProductoBase(producto);

  elementos.estado.hidden = true;
  elementos.detalle.hidden = false;

  actualizarSeoProducto(producto, estado.varianteSeleccionada, titulo);

  elementos.titulo.textContent = titulo;
  elementos.migaNombre.textContent = titulo;
  elementos.anios.textContent = obtenerTextoAnios(producto);

  configurarMigaCategoria(producto);

  pintarGaleria();
  pintarBloqueCompra();
  pintarVariantes();
  pintarConfiguraciones();
  pintarIncluye();
  pintarVehiculosCompatibles();
  pintarFichaTecnica();
  pintarPaquete();
  pintarObservaciones();
  pintarWhatsApp();
}

function configurarMigaCategoria(producto) {
  const categoria = producto.categoria_nombre || "Productos";
  elementos.migaCategoria.textContent = categoria;

  const categoriaNormalizada = normalizarTexto(categoria);

  if (categoriaNormalizada.includes("culata")) {
    elementos.migaCategoria.href = "./catalogo.html?categoria=culatas";
    return;
  }

  if (categoriaNormalizada.includes("ciguenal")) {
    elementos.migaCategoria.href = "./catalogo.html?categoria=ciguenales";
    return;
  }

  if (categoriaNormalizada.includes("turbo")) {
    elementos.migaCategoria.href = "./catalogo.html?categoria=turbos";
    return;
  }

  elementos.migaCategoria.href = "./catalogo.html";
}

/* =========================
   Producto base / variante
========================= */

function obtenerVarianteInicial(producto) {
  const variantes = obtenerVariantes(producto);

  return (
    variantes.find((variante) => variante.es_predeterminada && obtenerDisponibilidadVariante(variante)) ||
    variantes.find((variante) => obtenerDisponibilidadVariante(variante)) ||
    variantes.find((variante) => variante.es_predeterminada) ||
    variantes[0] ||
    null
  );
}

function obtenerVarianteSolicitada(producto) {
  const variantes = obtenerVariantes(producto);
  const varianteIdSolicitada = Number(producto?.variante_id_solicitada);
  const varianteSlugSolicitada = limpiarTexto(
    producto?.variante_slug_solicitada ||
    (producto?.tipo_slug_solicitado === "variante" ? producto?.slug_solicitado : "")
  );

  if (Number.isInteger(varianteIdSolicitada) && varianteIdSolicitada > 0) {
    const variantePorId = variantes.find((variante) => variante.id === varianteIdSolicitada);

    if (variantePorId) {
      return variantePorId;
    }
  }

  if (varianteSlugSolicitada) {
    return (
      variantes.find((variante) => {
        return normalizarTexto(variante.slug) === normalizarTexto(varianteSlugSolicitada);
      }) || null
    );
  }

  return null;
}

function obtenerVariantes(producto) {
  return Array.isArray(producto.variantes) ? producto.variantes : [];
}

function obtenerTituloProductoBase(producto) {
  return limpiarTexto(producto.nombre) || "Producto Solo Culatas";
}

function obtenerTextoAnios(producto) {
  const anios = limpiarTexto(producto.anos_compatibles);

  if (!anios || normalizarTexto(anios) === "todos") {
    return "";
  }

  return `Años compatibles: ${anios}`;
}

/* =========================
   Galería
========================= */

function pintarGaleria() {
  const imagenes = obtenerImagenesParaVariante(estado.varianteSeleccionada);

  estado.imagenes = imagenes;
  estado.indiceImagen = 0;

  pintarImagenPrincipal();
  pintarMiniaturas();
}

function obtenerImagenesParaVariante(variante) {
  const producto = estado.producto;
  const imagenesVariante = Array.isArray(variante?.imagenes)
    ? variante.imagenes
    : [];

  const imagenes = imagenesVariante
    .map((imagen) => ({
      url: imagen.url_imagen || imagen.url || imagen.imagen_url,
      alt:
        imagen.texto_alternativo ||
        imagen.alt ||
        obtenerTituloProductoBase(producto),
    }))
    .filter((imagen) => Boolean(imagen.url));

  if (imagenes.length) {
    return imagenes;
  }

  if (producto.imagen_principal_url) {
    return [
      {
        url: producto.imagen_principal_url,
        alt: producto.imagen_principal_alt || obtenerTituloProductoBase(producto),
      },
    ];
  }

  return [];
}

function pintarImagenPrincipal() {
  const imagen = estado.imagenes[estado.indiceImagen];

  if (!imagen) {
    elementos.imagenPrincipal.removeAttribute("src");
    elementos.imagenPrincipal.alt = "Imagen no disponible";
    elementos.imagenPrincipal.style.visibility = "hidden";
    elementos.imagenAnterior.hidden = true;
    elementos.imagenSiguiente.hidden = true;
    return;
  }

  elementos.imagenPrincipal.src = construirUrlImagen(imagen.url);
  elementos.imagenPrincipal.alt = imagen.alt;
  elementos.imagenPrincipal.loading = "eager";
  elementos.imagenPrincipal.decoding = "async";
  elementos.imagenPrincipal.draggable = false;
  elementos.imagenPrincipal.style.visibility = "visible";
  animarImagenPrincipal();

  const tieneVariasImagenes = estado.imagenes.length > 1;

  elementos.imagenAnterior.hidden = !tieneVariasImagenes;
  elementos.imagenSiguiente.hidden = !tieneVariasImagenes;
}

function pintarMiniaturas() {
  if (!estado.imagenes.length) {
    elementos.miniaturas.innerHTML = "";
    return;
  }

  elementos.miniaturas.innerHTML = estado.imagenes
    .map((imagen, indice) => {
      const activa = indice === estado.indiceImagen ? "activa" : "";

      return `
        <button
          class="producto-miniatura ${activa}"
          type="button"
          data-indice-imagen="${indice}"
          aria-label="Ver imagen ${indice + 1}"
        >
          <img
            src="${construirUrlImagen(imagen.url)}"
            alt="${escaparHtml(imagen.alt)}"
            loading="lazy"
            draggable="false"
            oncontextmenu="return false"
          />
        </button>
      `;
    })
    .join("");

  elementos.miniaturas.querySelectorAll("[data-indice-imagen]").forEach((boton) => {
    boton.addEventListener("click", () => {
      estado.indiceImagen = Number(boton.dataset.indiceImagen) || 0;
      pintarImagenPrincipal();
      pintarMiniaturas();
    });
  });
}

function configurarEventosGaleria() {
  elementos.imagenAnterior.addEventListener("click", () => {
    moverImagen(-1);
  });

  elementos.imagenSiguiente.addEventListener("click", () => {
    moverImagen(1);
  });
}

function moverImagen(direccion) {
  const total = estado.imagenes.length;

  if (total <= 1) {
    return;
  }

  estado.indiceImagen = (estado.indiceImagen + direccion + total) % total;

  pintarImagenPrincipal();
  pintarMiniaturas();
}

function animarImagenPrincipal() {
  const marcoImagen = elementos.imagenPrincipal.closest(".producto-imagen-marco");
  reiniciarAnimacion(marcoImagen, "producto-imagen-cambiando");
}

function animarPanelProducto() {
  reiniciarAnimacion(elementos.precio.closest(".producto-panel"), "producto-panel-cambiando");
}

function reiniciarAnimacion(elemento, claseAnimacion) {
  if (!elemento) {
    return;
  }

  elemento.classList.remove(claseAnimacion);
  void elemento.offsetWidth;
  elemento.classList.add(claseAnimacion);

  window.setTimeout(() => {
    elemento.classList.remove(claseAnimacion);
  }, 220);
}

function protegerGaleriaProducto() {
  document.addEventListener("contextmenu", (evento) => {
    if (evento.target.closest(".producto-galeria")) {
      evento.preventDefault();
    }
  });

  document.addEventListener("dragstart", (evento) => {
    if (evento.target.closest(".producto-galeria")) {
      evento.preventDefault();
    }
  });
}

/* =========================
   Panel compra
========================= */

function pintarBloqueCompra() {
  const producto = estado.producto;
  const variante = estado.varianteSeleccionada;

  const precio = obtenerPrecio(variante, producto);
  const disponible = obtenerDisponibilidadVariante(variante);

  elementos.precio.textContent = precio;

  elementos.disponibilidad.textContent = disponible ? "Disponible" : "Agotado";
  elementos.disponibilidad.classList.toggle("agotado", !disponible);

  elementos.condicion.textContent = obtenerCondicionTexto(variante);
  elementos.marca.textContent = obtenerMarcaTexto(producto, variante);
  elementos.garantia.textContent = obtenerGarantiaTexto(producto);
}

function obtenerPrecio(variante, producto) {
  if (variante?.precio_texto) {
    return variante.precio_texto;
  }

  if (variante?.precio) {
    return formatearPrecio(variante.precio);
  }

  return producto.precio_texto || "Consultar precio";
}

function obtenerStockVariante(variante) {
  if (!variante) {
    return 0;
  }

  const stock = Number(variante.stock);

  if (Number.isFinite(stock)) {
    return stock;
  }

  return variante.disponible ? 1 : 0;
}

function obtenerDisponibilidadVariante(variante) {
  if (!variante) {
    return false;
  }

  if (typeof variante.disponible === "boolean") {
    return variante.disponible;
  }

  return obtenerStockVariante(variante) > 0;
}

function obtenerCondicionTexto(variante) {
  const condicion = limpiarTexto(variante?.condicion);
  return convertirTextoEtiqueta(condicion || "producto nuevo");
}

function obtenerMarcaTexto(producto, variante) {
  if (variante?.marca_repuesto) {
    return `marca ${limpiarTexto(variante.marca_repuesto)}`;
  }

  if (Array.isArray(producto.marca_nombres) && producto.marca_nombres.length) {
    return `marca ${producto.marca_nombres.join(", ")}`;
  }

  if (producto.marca_nombre) {
    return `marca ${producto.marca_nombre}`;
  }

  return "";
}

function obtenerGarantiaTexto(producto) {
  const garantia = limpiarTexto(producto.garantia_tiempo);

  if (!garantia) {
    return "";
  }

  return `${convertirTextoEtiqueta(garantia)} de garantía`;
}

/* =========================
   Variantes y configuración visual
========================= */

function pintarVariantes() {
  const variantes = obtenerVariantes(estado.producto);
  const varianteSeleccionada = estado.varianteSeleccionada;
  const opciones = obtenerOpcionesVariantes(variantes);
  const productoTieneDisponibles = variantes.some((variante) =>
    obtenerDisponibilidadVariante(variante)
  );

  if (!opciones.length) {
    elementos.grupoVariantes.hidden = true;
    elementos.variantes.innerHTML = "";
    return;
  }

  elementos.grupoVariantes.hidden = false;

  const tituloVariantes = elementos.grupoVariantes.querySelector("h2");
  const nombreActivo =
    limpiarTexto(varianteSeleccionada?.variante_principal) ||
    limpiarTexto(varianteSeleccionada?.nombre);

  if (tituloVariantes) {
    tituloVariantes.textContent = nombreActivo
      ? `Tipo de culata: ${nombreActivo}`
      : "Tipo de culata";
  }

  elementos.variantes.innerHTML = opciones
    .map((opcion) => {
      const activa =
        normalizarTexto(opcion.nombre) ===
        normalizarTexto(varianteSeleccionada?.variante_principal || varianteSeleccionada?.nombre);

      const agotada = !opcion.disponible;
      const deshabilitada = agotada && productoTieneDisponibles && !activa;

      return crearOpcionVisual({
        clase: "producto-opcion-visual",
        activa,
        agotada,
        deshabilitada,
        nombre: opcion.nombre,
        imagenUrl: obtenerUrlImagenDeVariante(opcion.variante),
        dataAtributo: "data-variante-principal",
        dataValor: opcion.nombre,
      });
    })
    .join("");

  elementos.variantes.querySelectorAll("[data-variante-principal]").forEach((boton) => {
    if (boton.disabled || boton.getAttribute("aria-disabled") === "true") {
      return;
    }

    boton.addEventListener("click", () => {
      seleccionarVariante({
        variantePrincipal: boton.dataset.variantePrincipal,
        configuracionId: estado.varianteSeleccionada?.configuracion_id || null,
      });
    });
  });
}

function pintarConfiguraciones() {
  const variantes = obtenerVariantes(estado.producto);
  const varianteSeleccionada = estado.varianteSeleccionada;
  const variantePrincipalActiva =
    limpiarTexto(varianteSeleccionada?.variante_principal) ||
    limpiarTexto(varianteSeleccionada?.nombre);

  const configuraciones = obtenerOpcionesConfiguracionesPorVariante(
    variantes,
    variantePrincipalActiva
  );

  if (!configuraciones.length) {
    elementos.grupoConfiguraciones.hidden = true;
    elementos.configuraciones.innerHTML = "";
    return;
  }

  elementos.grupoConfiguraciones.hidden = false;

  const tituloConfiguraciones = elementos.grupoConfiguraciones.querySelector("h2");
  const configuracionActiva =
    limpiarTexto(varianteSeleccionada?.nombre_configuracion) ||
    configuraciones[0]?.nombre ||
    "";

  if (tituloConfiguraciones) {
    tituloConfiguraciones.textContent = configuracionActiva
      ? `Configuración: ${configuracionActiva}`
      : "Configuración";
  }

  const tieneMasDeUnaConfiguracion = configuraciones.length > 1;
  const grupoTieneDisponibles = configuraciones.some((opcion) => opcion.disponible);

  elementos.configuraciones.innerHTML = configuraciones
    .map((opcion) => {
      const activa = opcion.id === varianteSeleccionada?.configuracion_id;
      const agotada = !opcion.disponible;
      const sinSeleccionReal = !tieneMasDeUnaConfiguracion;
      const deshabilitada = agotada && grupoTieneDisponibles && !activa;

      return crearOpcionVisual({
        clase: "producto-opcion-visual producto-opcion-configuracion",
        activa,
        agotada,
        noClicable: sinSeleccionReal,
        deshabilitada,
        nombre: opcion.nombre,
        imagenUrl: obtenerUrlImagenDeVariante(opcion.variante),
        dataAtributo: "data-configuracion-id",
        dataValor: String(opcion.id),
      });
    })
    .join("");

  if (!tieneMasDeUnaConfiguracion) {
    return;
  }

  elementos.configuraciones.querySelectorAll("[data-configuracion-id]").forEach((boton) => {
    if (boton.disabled || boton.getAttribute("aria-disabled") === "true") {
      return;
    }

    boton.addEventListener("click", () => {
      seleccionarVariante({
        variantePrincipal: estado.varianteSeleccionada?.variante_principal || null,
        configuracionId: Number(boton.dataset.configuracionId),
      });
    });
  });
}

function obtenerOpcionesVariantes(variantes) {
  const opciones = [];

  variantes.forEach((variante) => {
    const nombre = limpiarTexto(variante.variante_principal || variante.nombre);

    if (!nombre) {
      return;
    }

    const existente = opciones.find(
      (opcion) => normalizarTexto(opcion.nombre) === normalizarTexto(nombre)
    );

    if (!existente) {
      opciones.push({
        nombre,
        variante,
        disponible: obtenerDisponibilidadVariante(variante),
      });

      return;
    }

    if (!existente.disponible && obtenerDisponibilidadVariante(variante)) {
      existente.variante = variante;
      existente.disponible = true;
    }
  });

  return opciones.sort((a, b) => compararOrdenVariantes(a.nombre, b.nombre));
}

function obtenerOpcionesConfiguracionesPorVariante(variantes, variantePrincipal) {
  const opciones = [];

  variantes.forEach((variante) => {
    const nombreVariante =
      limpiarTexto(variante.variante_principal) ||
      limpiarTexto(variante.nombre);

    const coincideVariante =
      !variantePrincipal ||
      normalizarTexto(nombreVariante) === normalizarTexto(variantePrincipal);

    if (!coincideVariante) {
      return;
    }

    if (!variante.configuracion_id || !limpiarTexto(variante.nombre_configuracion)) {
      return;
    }

    const existente = opciones.find((opcion) => opcion.id === variante.configuracion_id);

    if (!existente) {
      opciones.push({
        id: variante.configuracion_id,
        nombre: limpiarTexto(variante.nombre_configuracion),
        variante,
        disponible: obtenerDisponibilidadVariante(variante),
      });

      return;
    }

    if (!existente.disponible && obtenerDisponibilidadVariante(variante)) {
      existente.variante = variante;
      existente.disponible = true;
    }
  });

  return opciones;
}

function crearOpcionVisual({
  clase,
  activa,
  agotada = false,
  noClicable = false,
  deshabilitada = false,
  nombre,
  imagenUrl,
  dataAtributo,
  dataValor,
}) {
  const clases = [
    clase,
    activa ? "activa" : "",
    agotada ? "agotada" : "",
    noClicable ? "no-clicable" : "",
    deshabilitada ? "deshabilitada" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const imagen = imagenUrl ? construirUrlImagen(imagenUrl) : "";
  const ariaDisabled = noClicable || deshabilitada ? "true" : "false";
  const atributoDisabled = deshabilitada ? "disabled" : "";
  const textoTitle = agotada ? `${nombre} - Agotado` : nombre;

  return `
    <button
      class="${clases}"
      type="button"
      ${dataAtributo}="${escaparHtml(dataValor)}"
      title="${escaparHtml(textoTitle)}"
      aria-label="${escaparHtml(textoTitle)}"
      aria-disabled="${ariaDisabled}"
      ${atributoDisabled}
    >
      <span class="producto-opcion-visual-imagen">
        ${
          imagen
            ? `
              <img
                src="${imagen}"
                alt="${escaparHtml(nombre)}"
                loading="lazy"
                draggable="false"
                oncontextmenu="return false"
              />
            `
            : ""
        }
      </span>
      <span class="producto-opcion-visual-texto">${escaparHtml(nombre)}</span>
    </button>
  `;
}

function obtenerUrlImagenDeVariante(variante) {
  const imagenes = Array.isArray(variante?.imagenes) ? variante.imagenes : [];

  const imagenVariante = imagenes.find((imagen) => {
    return imagen.url_imagen || imagen.url || imagen.imagen_url;
  });

  if (imagenVariante) {
    return imagenVariante.url_imagen || imagenVariante.url || imagenVariante.imagen_url;
  }

  if (estado.producto?.imagen_principal_url) {
    return estado.producto.imagen_principal_url;
  }

  return "";
}

function seleccionarVariante({ variantePrincipal = null, configuracionId = null }) {
  const variantes = obtenerVariantes(estado.producto);

  let encontrada = buscarVarianteExacta({
    variantes,
    variantePrincipal,
    configuracionId,
    soloDisponibles: true,
  });

  if (!encontrada) {
    encontrada = buscarVarianteExacta({
      variantes,
      variantePrincipal,
      configuracionId,
      soloDisponibles: false,
    });
  }

  if (!encontrada && variantePrincipal) {
    encontrada = buscarVariantePorPrincipal({
      variantes,
      variantePrincipal,
      soloDisponibles: true,
    });
  }

  if (!encontrada && variantePrincipal) {
    encontrada = buscarVariantePorPrincipal({
      variantes,
      variantePrincipal,
      soloDisponibles: false,
    });
  }

  if (!encontrada && configuracionId) {
    encontrada = buscarVariantePorConfiguracion({
      variantes,
      configuracionId,
      soloDisponibles: true,
    });
  }

  if (!encontrada && configuracionId) {
    encontrada = buscarVariantePorConfiguracion({
      variantes,
      configuracionId,
      soloDisponibles: false,
    });
  }

  if (!encontrada) {
    return;
  }

  estado.varianteSeleccionada = encontrada;
  actualizarUrlVarianteSeleccionada(encontrada);
  pintarProducto();
  animarPanelProducto();
}

function actualizarUrlVarianteSeleccionada(variante) {
  const slug = limpiarTexto(variante?.slug || estado.producto?.slug);

  if (!slug || !window.history?.replaceState) {
    return;
  }

  const url = new URL(window.location.href);
  const slugActual = url.searchParams.get("slug") || "";

  if (slugActual === slug) {
    return;
  }

  url.search = `?slug=${encodeURIComponent(slug)}`;
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

function buscarVarianteExacta({
  variantes,
  variantePrincipal = null,
  configuracionId = null,
  soloDisponibles = false,
}) {
  return variantes.find((variante) => {
    const coincideVariante =
      !variantePrincipal ||
      normalizarTexto(variante.variante_principal || variante.nombre) ===
        normalizarTexto(variantePrincipal);

    const coincideConfiguracion =
      !configuracionId || variante.configuracion_id === configuracionId;

    const coincideDisponibilidad =
      !soloDisponibles || obtenerDisponibilidadVariante(variante);

    return coincideVariante && coincideConfiguracion && coincideDisponibilidad;
  });
}

function buscarVariantePorPrincipal({
  variantes,
  variantePrincipal,
  soloDisponibles = false,
}) {
  return variantes.find((variante) => {
    const coincideVariante =
      normalizarTexto(variante.variante_principal || variante.nombre) ===
      normalizarTexto(variantePrincipal);

    const coincideDisponibilidad =
      !soloDisponibles || obtenerDisponibilidadVariante(variante);

    return coincideVariante && coincideDisponibilidad;
  });
}

function buscarVariantePorConfiguracion({
  variantes,
  configuracionId,
  soloDisponibles = false,
}) {
  return variantes.find((variante) => {
    const coincideConfiguracion = variante.configuracion_id === configuracionId;

    const coincideDisponibilidad =
      !soloDisponibles || obtenerDisponibilidadVariante(variante);

    return coincideConfiguracion && coincideDisponibilidad;
  });
}

/* =========================
   Información técnica
========================= */

function pintarIncluye() {
  const variante = estado.varianteSeleccionada;

  if (!variante?.incluye) {
    elementos.bloqueIncluye.hidden = true;
    elementos.incluye.innerHTML = "";
    return;
  }

  elementos.bloqueIncluye.hidden = false;
  elementos.incluye.innerHTML = crearListaDesdeTexto(variante.incluye);
}

function pintarVehiculosCompatibles() {
  const producto = estado.producto;
  const items = obtenerItemsVehiculos(producto);

  elementos.vehiculos.innerHTML = `
    <ul>
      ${items.map((item) => `<li>${escaparHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function obtenerItemsVehiculos(producto) {
  const vehiculos = limpiarTexto(producto.vehiculos_compatibles);
  const anios = limpiarTexto(producto.anos_compatibles);

  if (!vehiculos && !anios) {
    return ["Consultar compatibilidad por WhatsApp."];
  }

  const itemsVehiculos = dividirTextoEnItems(vehiculos);

  if (itemsVehiculos.length) {
    return itemsVehiculos;
  }

  if (anios && normalizarTexto(anios) !== "todos") {
    return [anios];
  }

  return ["Consultar compatibilidad por WhatsApp."];
}

function pintarFichaTecnica() {
  const producto = estado.producto;
  const variante = estado.varianteSeleccionada;

  const datos = [
    ["Motor", producto.motor],
    ["Cilindraje", producto.cilindraje],
    ["Combustible", producto.tipo_combustible],
    ["Cilindros", producto.numero_cilindros],
    ["Válvulas", producto.numero_valvulas],
    ["Referencia", variante?.referencia_oem || producto.referencia_original],
    ["Código", variante?.codigo_interno || variante?.sku],
    ["Material", producto.material],
  ].filter(([, valor]) => Boolean(limpiarTexto(valor)));

  elementos.fichaTecnica.innerHTML = datos
    .map(([titulo, valor]) => {
      return `
        <div>
          <dt>${escaparHtml(titulo)}</dt>
          <dd>${escaparHtml(valor)}</dd>
        </div>
      `;
    })
    .join("");
}

function pintarPaquete() {
  const variante = estado.varianteSeleccionada;

  if (!variante?.paquete) {
    elementos.bloquePaquete.hidden = true;
    elementos.paquete.innerHTML = "";
    return;
  }

  elementos.bloquePaquete.hidden = false;
  elementos.paquete.innerHTML = crearListaDesdeTexto(variante.paquete);
}

function pintarObservaciones() {
  const producto = estado.producto;

  if (!producto.observaciones_tecnicas) {
    elementos.bloqueObservaciones.hidden = true;
    elementos.observaciones.textContent = "";
    return;
  }

  elementos.bloqueObservaciones.hidden = false;
  elementos.observaciones.textContent = producto.observaciones_tecnicas;
}

/* =========================
   WhatsApp
========================= */

function pintarWhatsApp() {
  const producto = estado.producto;
  const variante = estado.varianteSeleccionada;
  const precio = obtenerPrecio(variante, producto);
  const disponibilidad = obtenerDisponibilidadVariante(variante)
    ? "Disponible"
    : "Agotado";

  const mensaje = [
    "Hola, quiero comprar o cotizar este producto:",
    "",
    `Producto: ${obtenerTituloProductoBase(producto)}`,
    variante?.variante_principal ? `Tipo: ${variante.variante_principal}` : "",
    variante?.nombre_configuracion ? `Configuración: ${variante.nombre_configuracion}` : "",
    `Precio mostrado: ${precio}`,
    `Disponibilidad mostrada: ${disponibilidad}`,
    producto.vehiculos_compatibles
      ? `Vehículos compatibles: ${producto.vehiculos_compatibles}`
      : "",
    "",
    "Quiero confirmar disponibilidad, compatibilidad y forma de compra.",
  ]
    .filter(Boolean)
    .join("\n");

  elementos.whatsapp.href = `https://api.whatsapp.com/send?phone=${TELEFONO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
}

/* =========================
   Otros productos usando tarjetas del catálogo
========================= */

async function cargarOtrosProductos() {
  try {
    const respuesta = await obtenerProductosPublicos({
      pagina: 1,
      tamano: 10,
    });

    const productos = (respuesta.items || [])
      .filter((producto) => producto.id !== estado.producto.id)
      .slice(0, 5);

    if (!productos.length) {
      elementos.otrosProductos.hidden = true;
      return;
    }

    elementos.otrosProductos.hidden = false;
    elementos.otrosProductosGrid.innerHTML = productos
      .map((producto) => crearTarjetaCatalogoProducto(producto))
      .join("");
  } catch (error) {
    elementos.otrosProductos.hidden = true;
  }
}

function crearTarjetaCatalogoProducto(producto) {
  const urlProducto = `./producto.html?slug=${encodeURIComponent(producto.slug)}`;
  const urlImagen = construirUrlImagen(producto.imagen_principal_url);
  const textoAlternativo = escaparHtml(
    producto.imagen_principal_alt || producto.nombre || "Producto Solo Culatas"
  );

  const variantes = crearLineaOpcionesCatalogo(producto.variantes_disponibles);
  const configuraciones = crearLineaOpcionesCatalogo(producto.configuraciones);
  const precio = producto.precio_texto || "Consultar precio";
  const disponibilidad = producto.disponibilidad_texto || (producto.disponible ? "Disponible" : "Agotado");
  const claseDisponibilidad = producto.disponible
    ? "producto-disponible"
    : "producto-consultar";

  return `
    <article class="tarjeta-producto">
      <a class="tarjeta-producto-enlace-imagen" href="${urlProducto}" aria-label="Ver ${escaparHtml(producto.nombre)}">
        <img
          class="tarjeta-producto-imagen"
          src="${urlImagen}"
          alt="${textoAlternativo}"
          loading="lazy"
          draggable="false"
          oncontextmenu="return false"
        />
      </a>

      <div class="tarjeta-producto-cuerpo">
        <a class="tarjeta-producto-titulo-enlace" href="${urlProducto}">
          <h3 class="tarjeta-producto-titulo">${escaparHtml(producto.nombre)}</h3>
        </a>

        <a class="tarjeta-producto-resumen" href="${urlProducto}">
          ${variantes ? `<p>${variantes}</p>` : ""}
          ${configuraciones ? `<p>${configuraciones}</p>` : ""}
        </a>

        <div class="tarjeta-producto-info">
          <p class="tarjeta-producto-precio">${escaparHtml(precio)}</p>
          <p class="tarjeta-producto-disponibilidad ${claseDisponibilidad}">
            ${escaparHtml(disponibilidad)}
          </p>
        </div>

        <div class="tarjeta-producto-acciones">
          <a class="boton-producto boton-producto-principal" href="${urlProducto}">
            Ver producto
          </a>

          <a
            class="boton-producto boton-producto-whatsapp"
            href="${crearUrlWhatsAppOtroProducto(producto)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Comprar
          </a>
        </div>
      </div>
    </article>
  `;
}

function crearLineaOpcionesCatalogo(opciones) {
  if (!Array.isArray(opciones) || !opciones.length) {
    return "";
  }

  return opciones
    .filter(Boolean)
    .map((opcion) => escaparHtml(opcion))
    .join(" | ");
}

function crearUrlWhatsAppOtroProducto(producto) {
  const mensaje = [
    "Hola, quiero comprar o cotizar este producto:",
    "",
    `Producto: ${producto.nombre}`,
    `Precio mostrado: ${producto.precio_texto || "Consultar precio"}`,
    producto.disponibilidad_texto
      ? `Disponibilidad mostrada: ${producto.disponibilidad_texto}`
      : "",
    "",
    "Quiero confirmar disponibilidad y compatibilidad.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://api.whatsapp.com/send?phone=${TELEFONO_WHATSAPP}&text=${encodeURIComponent(mensaje)}`;
}


/* =========================
   SEO técnico del detalle
========================= */

function actualizarSeoProducto(producto, variante, tituloBase) {
  const tituloSeo = obtenerTituloSeoProducto(producto, variante, tituloBase);
  const descripcionSeo = obtenerDescripcionSeoProducto(producto, variante, tituloBase);
  const urlCanonica = obtenerUrlCanonicaProducto(producto);
  const imagenSeo = obtenerImagenSeoProducto(producto, variante);

  document.title = `${tituloSeo} | Solo Culatas`;

  actualizarMeta("description", descripcionSeo);
  actualizarMetaPropiedad("og:title", `${tituloSeo} | Solo Culatas`);
  actualizarMetaPropiedad("og:description", descripcionSeo);
  actualizarMetaPropiedad("og:type", "product");
  actualizarMetaPropiedad("og:url", urlCanonica);
  actualizarMetaPropiedad("og:locale", "es_CO");
  actualizarMeta("twitter:card", "summary_large_image");
  actualizarMeta("twitter:title", `${tituloSeo} | Solo Culatas`);
  actualizarMeta("twitter:description", descripcionSeo);

  if (imagenSeo) {
    actualizarMetaPropiedad("og:image", imagenSeo);
    actualizarMeta("twitter:image", imagenSeo);
  }

  actualizarCanonical(urlCanonica);
  actualizarSchemaProducto(producto, variante, tituloSeo, descripcionSeo, urlCanonica, imagenSeo);
}

function obtenerTituloSeoProducto(producto, variante, tituloBase) {
  return (
    limpiarTexto(variante?.titulo_seo) ||
    limpiarTexto(producto?.titulo_seo) ||
    limpiarTexto(tituloBase) ||
    "Producto Solo Culatas"
  );
}

function obtenerDescripcionSeoProducto(producto, variante, tituloBase) {
  const descripcionDirecta =
    limpiarTexto(variante?.resumen_seo) ||
    limpiarTexto(producto?.resumen_seo) ||
    limpiarTexto(variante?.descripcion_merchant) ||
    limpiarTexto(producto?.descripcion_merchant);

  if (descripcionDirecta) {
    return limitarTextoSeo(descripcionDirecta, 158);
  }

  const titulo = limpiarTexto(tituloBase || producto?.nombre || "producto");
  const marca = limpiarTexto(variante?.marca_repuesto || producto?.marca_nombre || "");
  const vehiculos = limpiarTexto(producto?.vehiculos_compatibles);
  const referencia = limpiarTexto(variante?.referencia_oem || producto?.referencia_original);
  const partes = [
    `Compra ${titulo}`,
    marca ? `marca ${marca}` : "producto nuevo",
    vehiculos ? `compatible con ${vehiculos}` : "verifica compatibilidad por WhatsApp",
    referencia ? `referencia ${referencia}` : "",
    "envíos a toda Colombia",
  ];

  return limitarTextoSeo(partes.filter(Boolean).join(", "), 158);
}

function obtenerUrlCanonicaProducto(producto) {
  const slug = (
    limpiarTexto(estado.varianteSeleccionada?.slug) ||
    limpiarTexto(producto?.slug_solicitado) ||
    limpiarTexto(producto?.slug) ||
    obtenerSlugDesdeUrl()
  );

  const url = new URL(window.location.href);
  url.search = slug ? `?slug=${encodeURIComponent(slug)}` : "";
  url.hash = "";
  return url.toString();
}

function obtenerImagenSeoProducto(producto, variante) {
  const imagenesVariante = Array.isArray(variante?.imagenes) ? variante.imagenes : [];
  const imagenVariante = imagenesVariante.find((imagen) =>
    imagen.url_imagen || imagen.url || imagen.imagen_url
  );

  const urlImagen =
    imagenVariante?.url_imagen ||
    imagenVariante?.url ||
    imagenVariante?.imagen_url ||
    producto?.imagen_principal_url ||
    "";

  const urlConstruida = construirUrlImagen(urlImagen);

  if (!urlConstruida) {
    return "";
  }

  try {
    return new URL(urlConstruida, window.location.origin).toString();
  } catch (error) {
    return urlConstruida;
  }
}

function actualizarMeta(nombre, contenido) {
  if (!contenido) {
    return;
  }

  let etiqueta = document.querySelector(`meta[name="${nombre}"]`);

  if (!etiqueta) {
    etiqueta = document.createElement("meta");
    etiqueta.setAttribute("name", nombre);
    document.head.appendChild(etiqueta);
  }

  etiqueta.setAttribute("content", contenido);
}

function actualizarMetaPropiedad(propiedad, contenido) {
  if (!contenido) {
    return;
  }

  let etiqueta = document.querySelector(`meta[property="${propiedad}"]`);

  if (!etiqueta) {
    etiqueta = document.createElement("meta");
    etiqueta.setAttribute("property", propiedad);
    document.head.appendChild(etiqueta);
  }

  etiqueta.setAttribute("content", contenido);
}

function actualizarCanonical(urlCanonica) {
  if (!urlCanonica) {
    return;
  }

  let enlace = document.querySelector('link[rel="canonical"]');

  if (!enlace) {
    enlace = document.createElement("link");
    enlace.setAttribute("rel", "canonical");
    document.head.appendChild(enlace);
  }

  enlace.setAttribute("href", urlCanonica);
}

function actualizarSchemaProducto(producto, variante, tituloSeo, descripcionSeo, urlCanonica, imagenSeo) {
  let script = document.getElementById("productoSchemaJsonLd");

  if (!script) {
    script = document.createElement("script");
    script.id = "productoSchemaJsonLd";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  const precio = Number(variante?.precio || producto?.precio || 0);
  const disponible = obtenerDisponibilidadVariante(variante);
  const marca = limpiarTexto(variante?.marca_repuesto || producto?.marca_nombre || "Solo Culatas");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: tituloSeo,
    description: descripcionSeo,
    url: urlCanonica,
    brand: {
      "@type": "Brand",
      name: marca,
    },
    condition: "https://schema.org/NewCondition",
    sku: limpiarTexto(variante?.codigo_interno || variante?.sku),
    mpn: limpiarTexto(variante?.referencia_oem || producto?.referencia_original),
    offers: {
      "@type": "Offer",
      url: urlCanonica,
      priceCurrency: "COP",
      availability: disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Solo Culatas",
      },
    },
  };

  if (imagenSeo) {
    schema.image = [imagenSeo];
  }

  if (Number.isFinite(precio) && precio > 0) {
    schema.offers.price = String(Math.round(precio));
  }

  script.textContent = JSON.stringify(limpiarObjetoSchema(schema));
}

function limpiarObjetoSchema(valor) {
  if (Array.isArray(valor)) {
    return valor.map(limpiarObjetoSchema).filter((item) => item !== undefined && item !== "");
  }

  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .map(([clave, item]) => [clave, limpiarObjetoSchema(item)])
        .filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && !item.length))
    );
  }

  return valor;
}

function limitarTextoSeo(texto, limite) {
  const limpio = limpiarTexto(texto).replace(/\s+/g, " ");

  if (limpio.length <= limite) {
    return limpio;
  }

  return `${limpio.slice(0, limite - 1).trim()}…`;
}

/* =========================
   Utilidades
========================= */

function compararOrdenVariantes(a, b) {
  const orden = {
    sola: 1,
    parcial: 2,
    completa: 3,
  };

  const ordenA = orden[normalizarTexto(a)] || 99;
  const ordenB = orden[normalizarTexto(b)] || 99;

  if (ordenA !== ordenB) {
    return ordenA - ordenB;
  }

  return a.localeCompare(b);
}

function crearListaDesdeTexto(texto) {
  const items = dividirTextoEnItems(texto);

  if (!items.length) {
    return `<p>${escaparHtml(texto)}</p>`;
  }

  return `
    <ul>
      ${items.map((item) => `<li>${escaparHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function dividirTextoEnItems(texto) {
  return String(texto || "")
    .split(/\n|;|•|\*/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function construirUrlImagen(urlImagen) {
  if (!urlImagen) {
    return "";
  }

  if (urlImagen.startsWith("http://") || urlImagen.startsWith("https://")) {
    return urlImagen;
  }

  if (urlImagen.startsWith("/")) {
    return `${URL_BASE_BACKEND}${urlImagen}`;
  }

  return `${URL_BASE_BACKEND}/${urlImagen}`;
}

function convertirTextoEtiqueta(valor) {
  const texto = limpiarTexto(valor);

  if (!texto) {
    return "";
  }

  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

function formatearPrecio(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "Consultar precio";
  }

  return `$${new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(numero)} COP`;
}

function limpiarTexto(valor) {
  return String(valor ?? "").trim();
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ñ", "n");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}