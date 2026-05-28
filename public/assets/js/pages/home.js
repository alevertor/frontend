import { obtenerProductosPublicos } from "../api.js";

const URL_BASE_BACKEND = "http://127.0.0.1:8000";
const TELEFONO_WHATSAPP = "573000000000";
const LIMITE_PRODUCTOS_DESTACADOS = 5;

const elementos = {
  estadoProductos: document.getElementById("homeProductosEstado"),
  productosGrid: document.getElementById("homeProductosGrid"),
};

document.addEventListener("DOMContentLoaded", inicializarHome);

async function inicializarHome() {
  await cargarProductosDestacados();
}

/*Productos destacados*/

async function cargarProductosDestacados() {
  if (!elementos.estadoProductos || !elementos.productosGrid) {
    return;
  }

  mostrarEstadoProductos("Cargando productos destacados...");

  try {
    const respuesta = await obtenerProductosPublicos({
      pagina: 1,
      tamano: 30,
    });

    const productos = obtenerProductosParaDestacar(respuesta.items || []);

    if (!productos.length) {
      mostrarEstadoProductos("Pronto publicaremos productos destacados.");
      return;
    }

    elementos.estadoProductos.hidden = true;
    elementos.productosGrid.hidden = false;
    elementos.productosGrid.innerHTML = productos
      .map((producto) => crearTarjetaCatalogoProducto(producto))
      .join("");
  } catch (error) {
    console.error("Error cargando productos destacados:", error);

    mostrarEstadoProductos(
      "No fue posible cargar los productos destacados en este momento.",
      true
    );
  }
}

function mostrarEstadoProductos(mensaje, esError = false) {
  elementos.estadoProductos.hidden = false;
  elementos.estadoProductos.textContent = mensaje;
  elementos.estadoProductos.classList.toggle("error", esError);
  elementos.productosGrid.hidden = true;
}

function obtenerProductosParaDestacar(productos) {
  const productosActivos = productos.filter((producto) => producto.activo !== false);

  if (!productosActivos.length) {
    return [];
  }

  const productosDestacados = productosActivos.filter(
    (producto) => producto.destacado === true
  );

  const productosDisponibles = productosActivos.filter(
    (producto) => producto.disponible === true
  );

  const baseProductos = construirBaseProductosDestacados(
    productosDestacados,
    productosDisponibles,
    productosActivos
  );

  return obtenerProductosRotadosPorDia(baseProductos, LIMITE_PRODUCTOS_DESTACADOS);
}

function construirBaseProductosDestacados(
  productosDestacados,
  productosDisponibles,
  productosActivos
) {
  const productosBase = [];

  agregarProductosUnicos(productosBase, productosDestacados);
  agregarProductosUnicos(productosBase, productosDisponibles);
  agregarProductosUnicos(productosBase, productosActivos);

  return productosBase;
}

function agregarProductosUnicos(listaDestino, productos) {
  productos.forEach((producto) => {
    const identificador = producto.id || producto.slug || producto.nombre;

    const yaExiste = listaDestino.some((productoExistente) => {
      const identificadorExistente =
        productoExistente.id || productoExistente.slug || productoExistente.nombre;

      return identificadorExistente === identificador;
    });

    if (!yaExiste) {
      listaDestino.push(producto);
    }
  });
}

function obtenerProductosRotadosPorDia(productos, limite) {
  if (productos.length <= limite) {
    return productos;
  }

  const productosOrdenados = [...productos].sort((productoA, productoB) => {
    const valorA = productoA.slug || productoA.nombre || "";
    const valorB = productoB.slug || productoB.nombre || "";

    return valorA.localeCompare(valorB, "es");
  });

  const diaActual = obtenerNumeroDiaActual();
  const posicionInicial = diaActual % productosOrdenados.length;
  const productosRotados = [
    ...productosOrdenados.slice(posicionInicial),
    ...productosOrdenados.slice(0, posicionInicial),
  ];

  return productosRotados.slice(0, limite);
}

function obtenerNumeroDiaActual() {
  const ahora = new Date();

  const fechaLocal = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );

  const milisegundosPorDia = 24 * 60 * 60 * 1000;

  return Math.floor(fechaLocal.getTime() / milisegundosPorDia);
}

function crearTarjetaCatalogoProducto(producto) {
  const urlProducto = `./pages/producto.html?slug=${encodeURIComponent(producto.slug)}`;
  const urlImagen = construirUrlImagen(producto.imagen_principal_url);
  const textoAlternativo = escaparHtml(
    producto.imagen_principal_alt || producto.nombre || "Producto Solo Culatas"
  );

  const variantes = crearLineaOpcionesCatalogo(producto.variantes_disponibles);
  const configuraciones = crearLineaOpcionesCatalogo(producto.configuraciones);
  const precio = producto.precio_texto || "Consultar precio";
  const disponibilidad =
    producto.disponibilidad_texto || (producto.disponible ? "Disponible" : "Agotado");

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
            href="${crearUrlWhatsAppProducto(producto)}"
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

function crearUrlWhatsAppProducto(producto) {
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

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}