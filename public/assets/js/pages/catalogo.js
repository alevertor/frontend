import {
  obtenerCategoriasPublicas,
  obtenerMarcasPublicas,
  obtenerProductosPublicos,
} from "../api.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const TAMANO_PAGINA = 12;

const CATEGORIAS_CATALOGO = {
  culatas: {
    categoriaIdRespaldo: 1,
    titulo: "Culatas multimarca solas y completas",
    descripcion:
      "Culatas nuevas para motores diésel y gasolina. Revisa referencias, compatibilidad y disponibilidad antes de cotizar.",
    miga: "Culatas",
  },
  ciguenales: {
    categoriaIdRespaldo: null,
    titulo: "Cigüeñales",
    descripcion:
      "Cigüeñales nuevos para diferentes motores y marcas. Consulta compatibilidad, referencia y disponibilidad.",
    miga: "Cigüeñales",
  },
  turbos: {
    categoriaIdRespaldo: 5,
    titulo: "Turbos",
    descripcion:
      "Turbos nuevos para vehículos diésel y gasolina. Revisa referencia, aplicación y disponibilidad antes de cotizar.",
    miga: "Turbos",
  },
};

const estadoCatalogo = {
  busqueda: "",
  categoriaSlug: "culatas",
  categoriaId: 1,
  marcaSlug: "",
  marcaId: null,
  marcaNombre: "",
  pagina: 1,
  tamano: TAMANO_PAGINA,
};

const elementos = {
  buscador: document.getElementById("buscador-productos"),
  tituloCatalogo: document.getElementById("titulo-catalogo"),
  descripcionCatalogo: document.querySelector(".catalogo-descripcion"),
  migaCategoria: document.querySelector(".catalogo-migas span:last-child"),
  textoResultados: document.getElementById("texto-resultados"),
  estado: document.getElementById("catalogo-estado"),
  grid: document.getElementById("catalogo-grid"),
  paginacion: document.getElementById("catalogo-paginacion"),
};

document.addEventListener("DOMContentLoaded", () => {
  inicializarCatalogo();
});

async function inicializarCatalogo() {
  if (!elementos.grid) {
    return;
  }

  leerParametrosUrl();

  await resolverCategoriaId();
  await resolverMarcaId();

  aplicarTextosCatalogo();
  configurarBuscador();

  cargarProductos();
}

function leerParametrosUrl() {
  const parametros = new URLSearchParams(window.location.search);

  const categoriaUrl = normalizarTexto(parametros.get("categoria") || "");
  const categoriaIdUrl = Number(parametros.get("categoria_id"));
  const marcaUrl = normalizarTexto(parametros.get("marca") || "");

  if (categoriaUrl && CATEGORIAS_CATALOGO[categoriaUrl]) {
    estadoCatalogo.categoriaSlug = categoriaUrl;
    estadoCatalogo.categoriaId = CATEGORIAS_CATALOGO[categoriaUrl].categoriaIdRespaldo;
  }

  if (categoriaIdUrl > 0) {
    estadoCatalogo.categoriaId = categoriaIdUrl;
  }

  if (marcaUrl) {
    estadoCatalogo.marcaSlug = marcaUrl;

    if (!categoriaUrl && !categoriaIdUrl) {
      estadoCatalogo.categoriaSlug = "";
      estadoCatalogo.categoriaId = null;
    }
  }
}

async function resolverCategoriaId() {
  if (!estadoCatalogo.categoriaSlug || estadoCatalogo.categoriaId) {
    return;
  }

  try {
    const categorias = await obtenerCategoriasPublicas();
    const categoriaActual = CATEGORIAS_CATALOGO[estadoCatalogo.categoriaSlug];

    const categoriaEncontrada = categorias.find((categoria) => {
      const nombre = normalizarTexto(categoria.nombre || "");
      const slug = normalizarTexto(categoria.slug || "");

      return (
        slug === estadoCatalogo.categoriaSlug ||
        nombre === estadoCatalogo.categoriaSlug ||
        nombre.includes(estadoCatalogo.categoriaSlug)
      );
    });

    if (categoriaEncontrada) {
      estadoCatalogo.categoriaId = categoriaEncontrada.id;
      return;
    }

    estadoCatalogo.categoriaId = categoriaActual?.categoriaIdRespaldo || null;
  } catch (error) {
    estadoCatalogo.categoriaId =
      CATEGORIAS_CATALOGO[estadoCatalogo.categoriaSlug]?.categoriaIdRespaldo || null;
  }
}

async function resolverMarcaId() {
  if (!estadoCatalogo.marcaSlug) {
    return;
  }

  try {
    const marcas = await obtenerMarcasPublicas();

    const marcaEncontrada = marcas.find((marca) => {
      const nombre = normalizarTexto(marca.nombre || "");
      const slug = normalizarTexto(marca.slug || "");

      return (
        slug === estadoCatalogo.marcaSlug ||
        nombre === estadoCatalogo.marcaSlug ||
        nombre.includes(estadoCatalogo.marcaSlug)
      );
    });

    if (!marcaEncontrada) {
      estadoCatalogo.marcaId = null;
      estadoCatalogo.marcaNombre = formatearTextoDesdeSlug(estadoCatalogo.marcaSlug);
      return;
    }

    estadoCatalogo.marcaId = marcaEncontrada.id;
    estadoCatalogo.marcaNombre =
      marcaEncontrada.nombre || formatearTextoDesdeSlug(estadoCatalogo.marcaSlug);
  } catch (error) {
    estadoCatalogo.marcaId = null;
    estadoCatalogo.marcaNombre = formatearTextoDesdeSlug(estadoCatalogo.marcaSlug);
  }
}

function aplicarTextosCatalogo() {
  if (estadoCatalogo.marcaSlug) {
    aplicarTextosMarca();
    return;
  }

  aplicarTextosCategoria();
}

function aplicarTextosCategoria() {
  const categoria = CATEGORIAS_CATALOGO[estadoCatalogo.categoriaSlug];

  if (!categoria) {
    document.title = "Catálogo | Solo Culatas";

    if (elementos.tituloCatalogo) {
      elementos.tituloCatalogo.textContent = "Catálogo de autopartes";
    }

    if (elementos.descripcionCatalogo) {
      elementos.descripcionCatalogo.textContent =
        "Consulta autopartes nuevas para motor y verifica disponibilidad antes de cotizar.";
    }

    if (elementos.migaCategoria) {
      elementos.migaCategoria.textContent = "Catálogo";
    }

    return;
  }

  document.title = `${categoria.titulo} | Solo Culatas`;

  if (elementos.tituloCatalogo) {
    elementos.tituloCatalogo.textContent = categoria.titulo;
  }

  if (elementos.descripcionCatalogo) {
    elementos.descripcionCatalogo.textContent = categoria.descripcion;
  }

  if (elementos.migaCategoria) {
    elementos.migaCategoria.textContent = categoria.miga;
  }
}

function aplicarTextosMarca() {
  const marca = estadoCatalogo.marcaNombre || formatearTextoDesdeSlug(estadoCatalogo.marcaSlug);

  document.title = `Autopartes para ${marca} | Solo Culatas`;

  if (elementos.tituloCatalogo) {
    elementos.tituloCatalogo.textContent = `Autopartes para ${marca}`;
  }

  if (elementos.descripcionCatalogo) {
    elementos.descripcionCatalogo.textContent =
      `Consulta autopartes nuevas para motor compatibles con ${marca}. Revisa referencias, disponibilidad y compatibilidad antes de cotizar.`;
  }

  if (elementos.migaCategoria) {
    elementos.migaCategoria.textContent = marca;
  }
}

function configurarBuscador() {
  if (!elementos.buscador) {
    return;
  }

  elementos.buscador.addEventListener(
    "input",
    esperarAntesDeBuscar((evento) => {
      estadoCatalogo.busqueda = evento.target.value.trim();
      estadoCatalogo.pagina = 1;
      cargarProductos();
    }, 450)
  );
}

async function cargarProductos() {
  mostrarCargando();

  if (estadoCatalogo.marcaSlug && !estadoCatalogo.marcaId) {
    pintarMarcaSinProductos();
    return;
  }

  try {
    const respuesta = await obtenerProductosPublicos({
      busqueda: estadoCatalogo.busqueda,
      categoriaId: estadoCatalogo.categoriaId,
      marcaId: estadoCatalogo.marcaId,
      pagina: estadoCatalogo.pagina,
      tamano: estadoCatalogo.tamano,
    });

    pintarProductos(respuesta.items || []);
    pintarPaginacion(respuesta.paginacion);
    pintarTextoResultados(respuesta.paginacion);
    ocultarEstado();
  } catch (error) {
    pintarError(error.message);
  }
}

function mostrarCargando() {
  elementos.grid.innerHTML = "";
  elementos.paginacion.innerHTML = "";
  elementos.textoResultados.textContent = "Cargando productos...";

  elementos.estado.hidden = false;
  elementos.estado.textContent = "Cargando catálogo...";
  elementos.estado.className = "catalogo-estado";
}

function ocultarEstado() {
  elementos.estado.hidden = true;
  elementos.estado.textContent = "";
}

function pintarMarcaSinProductos() {
  elementos.grid.innerHTML = "";
  elementos.paginacion.innerHTML = "";
  elementos.textoResultados.textContent = "Sin productos encontrados.";

  elementos.estado.hidden = false;
  elementos.estado.className = "catalogo-estado";
  elementos.estado.textContent = "No encontramos productos para esta marca.";
}

function pintarProductos(productos) {
  if (!productos.length) {
    elementos.grid.innerHTML = "";
    elementos.estado.hidden = false;
    elementos.estado.className = "catalogo-estado";
    elementos.estado.textContent = estadoCatalogo.marcaSlug
      ? "No encontramos productos para esta marca."
      : "No encontramos productos con esa búsqueda.";
    return;
  }

  elementos.grid.innerHTML = productos
    .map((producto) => crearTarjetaProducto(producto))
    .join("");
}

function crearTarjetaProducto(producto) {
  const urlProducto = `./producto.html?slug=${encodeURIComponent(producto.slug)}`;
  const urlImagen = construirUrlImagen(producto.imagen_principal_url);
  const textoAlternativo = escaparHtml(
    producto.imagen_principal_alt || producto.nombre || "Producto Solo Culatas"
  );

  const variantes = crearLineaOpciones(producto.variantes_disponibles);
  const configuraciones = crearLineaOpciones(producto.configuraciones);
  const precio = producto.precio_texto || "Consultar precio";
  const disponibilidad = producto.disponibilidad_texto || "Agotado";
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
            href="${crearUrlWhatsApp(producto)}"
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

function crearLineaOpciones(opciones) {
  if (!Array.isArray(opciones) || !opciones.length) {
    return "";
  }

  return opciones
    .filter(Boolean)
    .map((opcion) => escaparHtml(opcion))
    .join(" | ");
}

function pintarTextoResultados(paginacion) {
  if (!paginacion || !paginacion.total) {
    elementos.textoResultados.textContent = "Sin productos encontrados.";
    return;
  }

  const inicio = (paginacion.pagina - 1) * paginacion.tamano + 1;
  const fin = Math.min(paginacion.pagina * paginacion.tamano, paginacion.total);

  elementos.textoResultados.textContent = `Mostrando ${inicio}-${fin} de ${paginacion.total} productos.`;
}

function pintarPaginacion(paginacion) {
  if (!paginacion || paginacion.total_paginas <= 1) {
    elementos.paginacion.innerHTML = "";
    return;
  }

  const paginaActual = paginacion.pagina;
  const totalPaginas = paginacion.total_paginas;

  elementos.paginacion.innerHTML = `
    <button
      class="boton-paginacion"
      type="button"
      ${paginaActual <= 1 ? "disabled" : ""}
      data-pagina="${paginaActual - 1}"
    >
      Anterior
    </button>

    <span class="catalogo-pagina-actual">
      ${paginaActual} de ${totalPaginas}
    </span>

    <button
      class="boton-paginacion"
      type="button"
      ${paginaActual >= totalPaginas ? "disabled" : ""}
      data-pagina="${paginaActual + 1}"
    >
      Siguiente
    </button>
  `;

  elementos.paginacion.querySelectorAll("[data-pagina]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const nuevaPagina = Number(boton.dataset.pagina);

      if (!nuevaPagina || nuevaPagina === estadoCatalogo.pagina) {
        return;
      }

      estadoCatalogo.pagina = nuevaPagina;
      cargarProductos();
      subirAlInicioCatalogo();
    });
  });
}

function crearUrlWhatsApp(producto) {
  const opciones = crearTextoOpcionesWhatsApp(producto);
  const precio = producto.precio_texto || "Consultar precio";

  const mensaje = [
    "Hola, quiero comprar o cotizar este producto:",
    "",
    producto.nombre,
    "",
    opciones ? `Opciones vistas: ${opciones}` : "",
    `Precio mostrado: ${precio}`,
    "",
    "Quiero confirmar disponibilidad, compatibilidad y forma de compra.",
  ]
    .filter(Boolean)
    .join("\n");

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
}

function crearTextoOpcionesWhatsApp(producto) {
  const partes = [];

  if (Array.isArray(producto.variantes_disponibles) && producto.variantes_disponibles.length) {
    partes.push(producto.variantes_disponibles.join(" | "));
  }

  if (Array.isArray(producto.configuraciones) && producto.configuraciones.length) {
    partes.push(producto.configuraciones.join(" | "));
  }

  return partes.join(" - ");
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

function esperarAntesDeBuscar(funcion, espera = 400) {
  let temporizador = null;

  return (...argumentos) => {
    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
      funcion(...argumentos);
    }, espera);
  };
}

function subirAlInicioCatalogo() {
  const seccionCatalogo = document.querySelector(".catalogo-resultados");

  if (!seccionCatalogo) {
    return;
  }

  seccionCatalogo.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function normalizarTexto(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("ñ", "n");
}

function formatearTextoDesdeSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ");
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}