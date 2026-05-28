import { obtenerProductosPublicos } from "../api.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const TAMANO_PAGINA = 12;

const estadoResultados = {
  busqueda: "",
  pagina: 1,
  tamano: TAMANO_PAGINA,
};

const elementos = {
  titulo: document.getElementById("titulo-resultados-busqueda"),
  textoBusqueda: document.getElementById("texto-busqueda"),
  textoResultados: document.getElementById("texto-resultados"),
  estado: document.getElementById("catalogo-estado"),
  grid: document.getElementById("catalogo-grid"),
  paginacion: document.getElementById("catalogo-paginacion"),
};

document.addEventListener("DOMContentLoaded", () => {
  inicializarResultados();
});

function inicializarResultados() {
  leerParametrosUrl();
  aplicarTextosBusqueda();
  cargarResultados();
}

function leerParametrosUrl() {
  const parametros = new URLSearchParams(window.location.search);

  estadoResultados.busqueda = (parametros.get("q") || "").trim();
  estadoResultados.pagina = Number(parametros.get("pagina")) || 1;
}

function aplicarTextosBusqueda() {
  if (!estadoResultados.busqueda) {
    document.title = "Resultados de búsqueda | Solo Culatas";

    elementos.titulo.textContent = "Resultados de búsqueda";
    elementos.textoBusqueda.textContent =
      "Escribe una búsqueda desde la barra superior para encontrar productos.";

    return;
  }

  document.title = `Resultados para ${estadoResultados.busqueda} | Solo Culatas`;

  elementos.titulo.textContent = "Resultados de búsqueda";
  elementos.textoBusqueda.textContent = `Resultados para “${estadoResultados.busqueda}”.`;
}

async function cargarResultados() {
  if (!estadoResultados.busqueda) {
    pintarSinBusqueda();
    return;
  }

  mostrarCargando();

  try {
    const respuesta = await obtenerProductosPublicos({
      busqueda: estadoResultados.busqueda,
      pagina: estadoResultados.pagina,
      tamano: estadoResultados.tamano,
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
  elementos.textoResultados.textContent = "Cargando resultados...";

  elementos.estado.hidden = false;
  elementos.estado.textContent = "Buscando productos...";
  elementos.estado.className = "catalogo-estado";
}

function ocultarEstado() {
  elementos.estado.hidden = true;
  elementos.estado.textContent = "";
}

function pintarSinBusqueda() {
  elementos.grid.innerHTML = "";
  elementos.paginacion.innerHTML = "";
  elementos.textoResultados.textContent = "Sin búsqueda.";

  elementos.estado.hidden = false;
  elementos.estado.className = "catalogo-estado";
  elementos.estado.textContent =
    "Usa el buscador superior para encontrar productos por motor, vehículo, OEM o marca.";
}

function pintarError(mensaje) {
  elementos.grid.innerHTML = "";
  elementos.paginacion.innerHTML = "";
  elementos.textoResultados.textContent = "No fue posible cargar los resultados.";

  elementos.estado.hidden = false;
  elementos.estado.className = "catalogo-estado catalogo-estado-error";
  elementos.estado.textContent = mensaje || "Ocurrió un error al buscar productos.";
}

function pintarProductos(productos) {
  if (!productos.length) {
    elementos.grid.innerHTML = "";
    elementos.estado.hidden = false;
    elementos.estado.className = "catalogo-estado";
    elementos.estado.textContent = `No encontramos productos para “${estadoResultados.busqueda}”.`;
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

      if (!nuevaPagina || nuevaPagina === estadoResultados.pagina) {
        return;
      }

      estadoResultados.pagina = nuevaPagina;
      actualizarUrlPagina();
      cargarResultados();
      subirAlInicioResultados();
    });
  });
}

function actualizarUrlPagina() {
  const parametros = new URLSearchParams();

  parametros.set("q", estadoResultados.busqueda);
  parametros.set("pagina", String(estadoResultados.pagina));

  window.history.pushState({}, "", `./resultados.html?${parametros.toString()}`);
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

function subirAlInicioResultados() {
  const seccionResultados = document.querySelector(".resultados-contenido");

  if (!seccionResultados) {
    return;
  }

  seccionResultados.scrollIntoView({
    behavior: "smooth",
    block: "start",
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