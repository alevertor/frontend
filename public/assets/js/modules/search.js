import { obtenerProductosPublicos } from "../api.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const LIMITE_RESULTADOS = 6;
const MINIMO_CARACTERES = 2;

export function iniciarBuscadorPublico() {
  const buscadores = document.querySelectorAll("[data-buscador-publico]");

  buscadores.forEach((formulario) => {
    configurarBuscador(formulario);
  });
}

/*Rutas públicas*/

function estaEnPaginaInterna() {
  return window.location.pathname.toLowerCase().includes("/pages/");
}

function construirRutaPagina(nombreArchivo, parametros = "") {
  const ruta = estaEnPaginaInterna()
    ? `./${nombreArchivo}`
    : `./pages/${nombreArchivo}`;

  return `${ruta}${parametros}`;
}

function construirRutaResultados(busqueda) {
  return construirRutaPagina(
    "resultados.html",
    `?q=${encodeURIComponent(busqueda)}`
  );
}

function construirRutaProducto(slug) {
  return construirRutaPagina(
    "producto.html",
    `?slug=${encodeURIComponent(slug)}`
  );
}

/*Configuración*/

function configurarBuscador(formulario) {
  const entrada = formulario.querySelector("[data-buscador-input]");
  const contenedorResultados = formulario.querySelector("[data-buscador-resultados]");

  if (!entrada || !contenedorResultados) {
    return;
  }

  entrada.addEventListener(
    "input",
    esperarAntesDeBuscar(() => {
      buscarSugerencias(entrada, contenedorResultados);
    }, 350)
  );

  entrada.addEventListener("focus", () => {
    if (entrada.value.trim().length >= MINIMO_CARACTERES) {
      buscarSugerencias(entrada, contenedorResultados);
    }
  });

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const busqueda = entrada.value.trim();

    if (!busqueda) {
      return;
    }

    window.location.href = construirRutaResultados(busqueda);
  });

  document.addEventListener("click", (evento) => {
    if (!formulario.contains(evento.target)) {
      ocultarResultados(contenedorResultados);
    }
  });

  entrada.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
      ocultarResultados(contenedorResultados);
      entrada.blur();
    }
  });
}

/*Sugerencias*/

async function buscarSugerencias(entrada, contenedorResultados) {
  const busqueda = entrada.value.trim();

  if (busqueda.length < MINIMO_CARACTERES) {
    ocultarResultados(contenedorResultados);
    return;
  }

  pintarCargando(contenedorResultados);

  try {
    const respuesta = await obtenerProductosPublicos({
      busqueda,
      pagina: 1,
      tamano: LIMITE_RESULTADOS,
    });

    pintarResultados({
      productos: respuesta.items || [],
      busqueda,
      contenedorResultados,
    });
  } catch (error) {
    console.error("Error buscando productos públicos:", error);
    pintarError(contenedorResultados);
  }
}

function pintarCargando(contenedorResultados) {
  contenedorResultados.hidden = false;
  contenedorResultados.innerHTML = `
    <div class="buscador-publico-mensaje">
      Buscando productos...
    </div>
  `;
}

function pintarError(contenedorResultados) {
  contenedorResultados.hidden = false;
  contenedorResultados.innerHTML = `
    <div class="buscador-publico-mensaje buscador-publico-mensaje-error">
      No fue posible buscar productos.
    </div>
  `;
}

function pintarResultados({ productos, busqueda, contenedorResultados }) {
  contenedorResultados.hidden = false;

  if (!productos.length) {
    contenedorResultados.innerHTML = `
      <div class="buscador-publico-mensaje">
        No encontramos productos para “${escaparHtml(busqueda)}”.
      </div>
    `;
    return;
  }

  const resultados = productos
    .map((producto) => crearResultadoProducto(producto))
    .join("");

  contenedorResultados.innerHTML = `
    <div class="buscador-publico-lista">
      ${resultados}
    </div>

    <a class="buscador-publico-ver-todos" href="${construirRutaResultados(busqueda)}">
      Ver todos los resultados
    </a>
  `;
}

function crearResultadoProducto(producto) {
  const urlProducto = construirRutaProducto(producto.slug);
  const urlImagen = construirUrlImagen(producto.imagen_principal_url);
  const opciones = crearTextoOpciones(producto);
  const textoAlternativo = escaparHtml(
    producto.imagen_principal_alt || producto.nombre || "Producto Solo Culatas"
  );

  return `
    <a class="buscador-publico-item" href="${urlProducto}">
      <span class="buscador-publico-item-imagen">
        <img
          src="${urlImagen}"
          alt="${textoAlternativo}"
          loading="lazy"
        />
      </span>

      <span class="buscador-publico-item-contenido">
        <span class="buscador-publico-item-nombre">
          ${escaparHtml(producto.nombre)}
        </span>

        ${
          opciones
            ? `<span class="buscador-publico-item-opciones">${opciones}</span>`
            : ""
        }
      </span>
    </a>
  `;
}

function crearTextoOpciones(producto) {
  const partes = [];

  if (Array.isArray(producto.variantes_disponibles) && producto.variantes_disponibles.length) {
    partes.push(producto.variantes_disponibles.join(" | "));
  }

  if (Array.isArray(producto.configuraciones) && producto.configuraciones.length) {
    partes.push(producto.configuraciones.join(" | "));
  }

  return partes.map((parte) => escaparHtml(parte)).join("  ");
}

function ocultarResultados(contenedorResultados) {
  contenedorResultados.hidden = true;
  contenedorResultados.innerHTML = "";
}

/*Utilidades*/

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

function esperarAntesDeBuscar(funcion, espera = 350) {
  let temporizador = null;

  return (...argumentos) => {
    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
      funcion(...argumentos);
    }, espera);
  };
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}