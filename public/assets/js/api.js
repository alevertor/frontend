const URL_BASE_API = "http://127.0.0.1:8000/api/v1";

function construirUrl(ruta, parametros = {}) {
  const url = new URL(`${URL_BASE_API}${ruta}`);

  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== null && valor !== undefined && valor !== "") {
      url.searchParams.append(clave, valor);
    }
  });

  return url;
}

async function manejarRespuesta(respuesta) {
  const tipoContenido = respuesta.headers.get("content-type") || "";
  const esJson = tipoContenido.includes("application/json");
  const datos = esJson ? await respuesta.json() : null;

  if (!respuesta.ok) {
    let mensaje = "Ocurrió un error al comunicarse con el servidor.";

    if (typeof datos?.detail === "string") {
      mensaje = datos.detail;
    } else if (Array.isArray(datos?.detail)) {
      mensaje = datos.detail
        .map((error) => {
          const campo = Array.isArray(error.loc) ? error.loc.join(" → ") : "campo";
          return `${campo}: ${error.msg}`;
        })
        .join(" | ");
    } else if (datos?.detail && typeof datos.detail === "object") {
      mensaje = JSON.stringify(datos.detail);
    }

    throw new Error(mensaje);
  }

  return datos;
}

export async function obtenerJsonPublico(ruta, parametros = {}) {
  const url = construirUrl(ruta, parametros);

  const respuesta = await fetch(url.toString(), {
    method: "GET",
  });

  return manejarRespuesta(respuesta);
}

export async function enviarJsonPublico(ruta, metodo, payload = null) {
  const opciones = {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (payload !== null) {
    opciones.body = JSON.stringify(payload);
  }

  const respuesta = await fetch(`${URL_BASE_API}${ruta}`, opciones);

  return manejarRespuesta(respuesta);
}

export async function obtenerCategoriasPublicas() {
  return obtenerJsonPublico("/public/categorias");
}

export async function obtenerMarcasPublicas() {
  return obtenerJsonPublico("/public/marcas");
}

export async function obtenerProductosPublicos({
  busqueda = "",
  categoriaId = null,
  marcaId = null,
  pagina = 1,
  tamano = 12,
} = {}) {
  return obtenerJsonPublico("/public/productos", {
    q: busqueda,
    categoria_id: categoriaId,
    marca_id: marcaId,
    pagina,
    tamano,
  });
}

export async function obtenerProductoPublicoPorSlug(slug) {
  if (!slug) {
    throw new Error("No se recibió el identificador del producto.");
  }

  return obtenerJsonPublico(`/public/productos/${encodeURIComponent(slug)}`);
}

export async function crearSolicitudPublica(payload) {
  return enviarJsonPublico("/public/solicitudes", "POST", payload);
}