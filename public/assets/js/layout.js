import { iniciarBuscadorPublico } from "./modules/search.js";

const TELEFONO_WHATSAPP_PUBLICO = "573000000000";


const ICONOS_BOTONERA = {
  inicio: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.25 10.65 12 4.35l7.75 6.3v8.1a1 1 0 0 1-1 1h-4.5v-5.7h-4.5v5.7h-4.5a1 1 0 0 1-1-1v-8.1Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
    </svg>
  `,
  culatas: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.25 6.25h13.5v3.8H5.25v-3.8Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/>
      <path d="M5.25 13.95h13.5v3.8H5.25v-3.8Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/>
      <path d="M8.2 6.25v3.8M12 6.25v3.8M15.8 6.25v3.8M8.2 13.95v3.8M12 13.95v3.8M15.8 13.95v3.8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
    </svg>
  `,
  catalogo: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.2 6.3h13.6M5.2 12h13.6M5.2 17.7h13.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4.8 6.3h.02M4.8 12h.02M4.8 17.7h.02" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,
  nosotros: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 12.15a3.55 3.55 0 1 0 0-7.1 3.55 3.55 0 0 0 0 7.1Z" fill="none" stroke="currentColor" stroke-width="1.75"/>
      <path d="M5.4 19.2c.8-3.05 3.15-4.85 6.6-4.85s5.8 1.8 6.6 4.85" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
    </svg>
  `,
  contacto: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.25 7.25h13.5a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1H5.25a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/>
      <path d="m5.2 8.25 6.8 5.1 6.8-5.1" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
};

document.addEventListener("DOMContentLoaded", iniciarLayoutPublico);

async function iniciarLayoutPublico() {
  try {
    await cargarComponentesPublicos();

    marcarRutaActiva();
    crearBotoneraMobilePublica();
    iniciarBuscadorPublico();
    crearBotonWhatsAppFlotante();
    prepararTransicionesPublicas();

    setTimeout(crearBotoneraMobilePublica, 150);
    setTimeout(crearBotoneraMobilePublica, 600);

    window.addEventListener("resize", crearBotoneraMobilePublica);
    window.addEventListener("orientationchange", crearBotoneraMobilePublica);
  } catch (error) {
    console.error("No fue posible cargar el layout público:", error);
  } finally {
    finalizarCargaPublica();
  }
}

function finalizarCargaPublica() {
  window.requestAnimationFrame(() => {
    document.documentElement.classList.remove("layout-publico-preparando");
    document.documentElement.classList.add("layout-publico-listo");
  });
}

function prepararTransicionesPublicas() {
  document.addEventListener("click", (evento) => {
    const enlace = evento.target.closest("a[href]");

    if (!enlace || !debeAplicarTransicionPublica(enlace, evento)) {
      return;
    }

    evento.preventDefault();

    document.documentElement.classList.add("layout-publico-saliendo");

    window.setTimeout(() => {
      window.location.href = enlace.href;
    }, 140);
  });
}

function debeAplicarTransicionPublica(enlace, evento) {
  if (
    evento.defaultPrevented ||
    evento.button !== 0 ||
    evento.metaKey ||
    evento.ctrlKey ||
    evento.shiftKey ||
    evento.altKey
  ) {
    return false;
  }

  const destino = enlace.getAttribute("href") || "";

  if (
    !destino ||
    destino.startsWith("#") ||
    destino.startsWith("mailto:") ||
    destino.startsWith("tel:")
  ) {
    return false;
  }

  if (enlace.target && enlace.target !== "_self") {
    return false;
  }

  let urlDestino;

  try {
    urlDestino = new URL(enlace.href, window.location.href);
  } catch {
    return false;
  }

  if (urlDestino.origin !== window.location.origin) {
    return false;
  }

  if (urlDestino.href === window.location.href) {
    return false;
  }

  return true;
}

/*Componentes públicos*/

function estaEnPaginaInterna() {
  return window.location.pathname.toLowerCase().includes("/pages/");
}

function obtenerRutaBaseComponentes() {
  return estaEnPaginaInterna() ? "../" : "./";
}

function construirRutaComponente(nombreArchivo) {
  return `${obtenerRutaBaseComponentes()}components/${nombreArchivo}`;
}

function construirRutaInicio() {
  return estaEnPaginaInterna() ? "../index.html" : "./index.html";
}

function construirRutaPagina(nombreArchivo, parametros = "") {
  const ruta = estaEnPaginaInterna()
    ? `./${nombreArchivo}`
    : `./pages/${nombreArchivo}`;

  return `${ruta}${parametros}`;
}

function obtenerComponentesPublicos() {
  return [
    {
      selector: "#headerPublico",
      ruta: construirRutaComponente("nav.html"),
    },
    {
      selector: "#footerPublico",
      ruta: construirRutaComponente("footer.html"),
    },
  ];
}

async function cargarComponentesPublicos() {
  const componentes = obtenerComponentesPublicos();

  for (const componente of componentes) {
    const contenedor = document.querySelector(componente.selector);

    if (!contenedor) {
      console.warn(`No existe el contenedor ${componente.selector}`);
      continue;
    }

    try {
      const respuesta = await fetch(`${componente.ruta}?v=layout-publico-1`, {
        cache: "no-store",
      });

      if (!respuesta.ok) {
        console.error(
          `No se pudo cargar ${componente.ruta}. Status: ${respuesta.status}. URL final: ${respuesta.url}`
        );
        continue;
      }

      const htmlComponente = await respuesta.text();

      contenedor.innerHTML = htmlComponente;

      contenedor.querySelectorAll("script").forEach((script) => {
        script.remove();
      });

      normalizarEnlacesPublicos(contenedor);

      console.log(`Componente cargado: ${componente.selector}`, {
        ruta: componente.ruta,
        caracteres: htmlComponente.length,
      });
    } catch (error) {
      console.error(`Error cargando ${componente.ruta}:`, error);
    }
  }
}

function normalizarEnlacesPublicos(contenedor) {
  contenedor.querySelectorAll("a[href]").forEach((enlace) => {
    const rutaPublica = enlace.dataset.rutaPublica;

    if (rutaPublica) {
      enlace.href = obtenerHrefPorRutaPublica(rutaPublica);
      return;
    }

    const hrefOriginal = enlace.getAttribute("href");

    if (!hrefOriginal || hrefOriginal.startsWith("#")) {
      return;
    }

    if (
      hrefOriginal.startsWith("http://") ||
      hrefOriginal.startsWith("https://") ||
      hrefOriginal.startsWith("mailto:") ||
      hrefOriginal.startsWith("tel:")
    ) {
      return;
    }

    enlace.href = normalizarHrefPublico(hrefOriginal);
  });
}

function obtenerHrefPorRutaPublica(rutaPublica) {
  const rutas = {
    inicio: construirRutaInicio(),
    catalogo: construirRutaPagina("catalogo.html"),
    categorias: construirRutaPagina("catalogo.html"),
    culatas: construirRutaPagina("catalogo.html", "?categoria=culatas"),
    ciguenales: construirRutaPagina("catalogo.html", "?categoria=ciguenales"),
    turbos: construirRutaPagina("catalogo.html", "?categoria=turbos"),
    nosotros: construirRutaPagina("nosotros.html"),
    contacto: construirRutaPagina("contacto.html"),
    politicas: construirRutaPagina("politicas.html"),
  };

  return rutas[rutaPublica] || "#";
}

function normalizarHrefPublico(hrefOriginal) {
  const href = hrefOriginal.toLowerCase();

  if (href.includes("index.html")) {
    return construirRutaInicio();
  }

  if (href.includes("catalogo.html")) {
    return construirRutaPagina("catalogo.html", extraerParametrosHref(hrefOriginal));
  }

  if (href.includes("producto.html")) {
    return construirRutaPagina("producto.html", extraerParametrosHref(hrefOriginal));
  }

  if (href.includes("resultados.html")) {
    return construirRutaPagina("resultados.html", extraerParametrosHref(hrefOriginal));
  }

  if (href.includes("nosotros.html")) {
    return construirRutaPagina("nosotros.html");
  }

  if (href.includes("contacto.html")) {
    return construirRutaPagina("contacto.html");
  }

  return hrefOriginal;
}

function extraerParametrosHref(href) {
  const indiceParametros = href.indexOf("?");

  if (indiceParametros === -1) {
    return "";
  }

  return href.slice(indiceParametros);
}

/*Ruta activa*/

function marcarRutaActiva() {
  const rutaActual = obtenerRutaActual();

  document.querySelectorAll("[data-ruta-publica]").forEach((enlace) => {
    const rutaEnlace = enlace.dataset.rutaPublica;

    if (rutaEnlace !== rutaActual) {
      enlace.classList.remove("activo");
      enlace.removeAttribute("aria-current");
      return;
    }

    enlace.classList.add("activo");
    enlace.setAttribute("aria-current", "page");
  });
}

function obtenerRutaActual() {
  const pathname = window.location.pathname.toLowerCase();
  const parametros = new URLSearchParams(window.location.search);
  const categoria = parametros.get("categoria");

  if (
    pathname.endsWith("/index.html") ||
    pathname.endsWith("/public/") ||
    pathname.endsWith("/public")
  ) {
    return "inicio";
  }

  if (pathname.includes("catalogo.html")) {
    if (categoria === "culatas") return "culatas";
    if (categoria === "ciguenales") return "ciguenales";
    if (categoria === "turbos") return "turbos";

    return "catalogo";
  }

  if (pathname.includes("producto.html") || pathname.includes("resultados.html")) {
    return "catalogo";
  }

  if (pathname.includes("nosotros.html")) {
    return "nosotros";
  }

  if (pathname.includes("contacto.html")) {
    return "contacto";
  }

  return "";
}

/*Botonera mobile*/

function crearBotoneraMobilePublica() {
  const anchoViewport =
    window.visualViewport?.width ||
    window.innerWidth ||
    document.documentElement.clientWidth;

  const esMobile = anchoViewport <= 900;
  const botoneraExistente = document.querySelector(".botonera-mobile-publica");

  if (!esMobile) {
    if (botoneraExistente) {
      botoneraExistente.remove();
    }

    document.body.style.removeProperty("padding-bottom");
    return;
  }

  if (botoneraExistente) {
    marcarRutaActivaBotonera(botoneraExistente);
    return;
  }

  const botonera = document.createElement("nav");

  botonera.className = "botonera-mobile-publica";
  botonera.setAttribute("aria-label", "Navegación móvil principal");

  botonera.innerHTML = `
    <a href="${construirRutaInicio()}" data-ruta-publica="inicio">
      ${ICONOS_BOTONERA.inicio}
      <small>Inicio</small>
    </a>

    <a href="${construirRutaPagina("catalogo.html", "?categoria=culatas")}" data-ruta-publica="culatas">
      ${ICONOS_BOTONERA.culatas}
      <small>Culatas</small>
    </a>

    <a href="${construirRutaPagina("catalogo.html")}" data-ruta-publica="catalogo">
      ${ICONOS_BOTONERA.catalogo}
      <small>Catálogo</small>
    </a>

    <a href="${construirRutaPagina("nosotros.html")}" data-ruta-publica="nosotros">
      ${ICONOS_BOTONERA.nosotros}
      <small>Nosotros</small>
    </a>

    <a href="${construirRutaPagina("contacto.html")}" data-ruta-publica="contacto">
      ${ICONOS_BOTONERA.contacto}
      <small>Contacto</small>
    </a>
  `;

  aplicarEstilosBotoneraMobile(botonera);
  document.body.appendChild(botonera);
  document.body.style.setProperty("padding-bottom", "72px", "important");

  marcarRutaActivaBotonera(botonera);
}

function aplicarEstilosBotoneraMobile(botonera) {
  botonera.style.position = "fixed";
  botonera.style.right = "0";
  botonera.style.bottom = "0";
  botonera.style.left = "0";
  botonera.style.zIndex = "99999";
  botonera.style.display = "grid";
  botonera.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
  botonera.style.height = "72px";
  botonera.style.padding = "0 0.2rem";
  botonera.style.background = "rgba(255, 255, 255, 0.98)";
  botonera.style.borderTop = "1px solid #edf0f4";
  botonera.style.boxShadow = "0 -10px 28px rgba(17, 17, 17, 0.1)";
  botonera.style.backdropFilter = "blur(14px)";

  botonera.querySelectorAll("a").forEach((enlace) => {
    enlace.style.display = "flex";
    enlace.style.flexDirection = "column";
    enlace.style.alignItems = "center";
    enlace.style.justifyContent = "center";
    enlace.style.gap = "0.24rem";
    enlace.style.minWidth = "0";
    enlace.style.color = "#667085";
    enlace.style.fontFamily = "var(--fuente-base)";
    enlace.style.fontSize = "0.66rem";
    enlace.style.fontWeight = "500";
    enlace.style.lineHeight = "1";
    enlace.style.textDecoration = "none";
  });

  botonera.querySelectorAll("svg").forEach((icono) => {
    icono.style.display = "block";
    icono.style.width = "22px";
    icono.style.height = "22px";
    icono.style.color = "#111111";
  });

  botonera.querySelectorAll("small").forEach((texto) => {
    texto.style.display = "block";
    texto.style.maxWidth = "100%";
    texto.style.overflow = "hidden";
    texto.style.color = "inherit";
    texto.style.fontSize = "0.66rem";
    texto.style.lineHeight = "1";
    texto.style.textOverflow = "ellipsis";
    texto.style.whiteSpace = "nowrap";
  });
}

function marcarRutaActivaBotonera(botonera) {
  const rutaActual = obtenerRutaActual();

  botonera.querySelectorAll("[data-ruta-publica]").forEach((enlace) => {
    const estaActivo = enlace.dataset.rutaPublica === rutaActual;

    enlace.classList.toggle("activo", estaActivo);

    if (estaActivo) {
      enlace.setAttribute("aria-current", "page");
      enlace.style.color = "#111111";
      enlace.style.fontWeight = "600";
      return;
    }

    enlace.removeAttribute("aria-current");
    enlace.style.color = "#667085";
    enlace.style.fontWeight = "500";
  });
}

/*WhatsApp flotante*/

function crearBotonWhatsAppFlotante() {
  if (!debeMostrarBotonWhatsAppFlotante()) {
    return;
  }

  if (document.querySelector(".boton-whatsapp-flotante")) {
    return;
  }

  const mensaje =
    "Hola, quiero consultar disponibilidad y precio de una autoparte para motor en Solo Culatas.";

  const enlace = document.createElement("a");

  enlace.className = "boton-whatsapp-flotante";
  enlace.href = `https://api.whatsapp.com/send?phone=${TELEFONO_WHATSAPP_PUBLICO}&text=${encodeURIComponent(mensaje)}`;
  enlace.target = "_blank";
  enlace.rel = "noopener noreferrer";
  enlace.setAttribute("aria-label", "Contactar por WhatsApp");

  enlace.innerHTML = `
    <svg
      class="boton-whatsapp-flotante-icono"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M16.01 3.2c-7.05 0-12.78 5.63-12.78 12.57 0 2.22.6 4.38 1.74 6.28L3.2 28.8l6.92-1.77a13.02 13.02 0 0 0 5.89 1.42c7.05 0 12.79-5.63 12.79-12.57S23.06 3.2 16.01 3.2Zm0 22.98c-1.87 0-3.7-.5-5.3-1.44l-.38-.22-4.1 1.05 1.08-3.9-.25-.4a10.2 10.2 0 0 1-1.56-5.5c0-5.68 4.72-10.3 10.51-10.3 5.8 0 10.52 4.62 10.52 10.3 0 5.69-4.72 10.41-10.52 10.41Zm5.78-7.72c-.32-.16-1.88-.91-2.17-1.02-.29-.1-.5-.16-.72.16-.21.32-.82 1.02-1.01 1.23-.19.22-.37.24-.69.08-.32-.16-1.35-.49-2.57-1.55-.95-.84-1.59-1.87-1.78-2.18-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.31.32-.53.1-.21.05-.4-.03-.56-.08-.16-.72-1.7-.99-2.33-.26-.61-.52-.53-.72-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.07-1.11 2.61s1.14 3.03 1.3 3.24c.16.21 2.25 3.38 5.45 4.74.76.32 1.35.52 1.81.66.76.24 1.46.21 2.01.13.61-.09 1.88-.76 2.15-1.49.27-.73.27-1.36.19-1.49-.08-.13-.29-.21-.61-.37Z"
      />
    </svg>
  `;

  document.body.appendChild(enlace);
}

function debeMostrarBotonWhatsAppFlotante() {
  const pathname = window.location.pathname.toLowerCase();

  if (pathname.includes("contacto.html")) {
    return false;
  }

  return true;
}