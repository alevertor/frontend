const COMPONENTES = [
  {
    selector: "#headerPublico",
    ruta: "../components/nav.html",
  },
  {
    selector: "#footerPublico",
    ruta: "../components/footer.html",
  },
  {
    selector: "#navMobilePublico",
    ruta: "../components/mobile-nav.html",
  },
];

document.addEventListener("DOMContentLoaded", iniciarLayoutPublico);

async function iniciarLayoutPublico() {
  try {
    await cargarComponentesPublicos();
    marcarRutaActiva();
  } catch (error) {
    console.error("No fue posible cargar el layout público:", error);
  }
}

async function cargarComponentesPublicos() {
  await Promise.all(
    COMPONENTES.map(async (componente) => {
      const contenedor = document.querySelector(componente.selector);

      if (!contenedor) {
        return;
      }

      const respuesta = await fetch(componente.ruta);

      if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${componente.ruta}`);
      }

      contenedor.innerHTML = await respuesta.text();
    })
  );
}

function marcarRutaActiva() {
  const rutaActual = obtenerRutaActual();

  document
    .querySelectorAll("[data-ruta-publica]")
    .forEach((enlace) => {
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

  if (pathname.endsWith("/index.html") || pathname.endsWith("/public/") || pathname.endsWith("/public")) {
    return "inicio";
  }

  if (pathname.includes("catalogo.html") || pathname.includes("producto.html")) {
    return "catalogo";
  }

  if (pathname.includes("nosotros.html")) {
    return "nosotros";
  }

  if (pathname.includes("contacto.html")) {
    return "contacto";
  }

  if (pathname.includes("carrito.html")) {
    return "carrito";
  }

  return "";
}