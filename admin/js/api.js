const URL_BASE_API = "http://127.0.0.1:8000/api/v1";

function obtenerTokenAcceso() {
  return localStorage.getItem("token_acceso");
}

function construirHeadersAutorizados() {
  const token = obtenerTokenAcceso();

  if (!token) {
    throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function construirHeadersGetAutorizados() {
  const token = obtenerTokenAcceso();

  if (!token) {
    throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function construirHeadersFormularioAutorizados() {
  const token = obtenerTokenAcceso();

  if (!token) {
    throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function manejarRespuesta(respuesta) {
  if (respuesta.status === 401) {
    localStorage.removeItem("token_acceso");
    window.location.href = "./login.html";
    throw new Error("Sesión expirada o token inválido.");
  }

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

function construirUrl(ruta, parametros = {}) {
  const url = new URL(`${URL_BASE_API}${ruta}`);

  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== null && valor !== undefined && valor !== "") {
      url.searchParams.append(clave, valor);
    }
  });

  return url;
}

export async function obtenerJson(ruta, parametros = {}) {
  const url = construirUrl(ruta, parametros);

  const respuesta = await fetch(url.toString(), {
    method: "GET",
    headers: construirHeadersGetAutorizados(),
  });

  return manejarRespuesta(respuesta);
}

export async function obtenerJsonPublico(ruta, parametros = {}) {
  const url = construirUrl(ruta, parametros);

  const respuesta = await fetch(url.toString(), {
    method: "GET",
  });

  return manejarRespuesta(respuesta);
}

async function enviarJson(ruta, metodo, payload = null) {
  const opciones = {
    method: metodo,
    headers: construirHeadersAutorizados(),
  };

  if (payload !== null) {
    opciones.body = JSON.stringify(payload);
  }

  const respuesta = await fetch(`${URL_BASE_API}${ruta}`, opciones);

  return manejarRespuesta(respuesta);
}

async function enviarFormulario(ruta, metodo, formData) {
  const respuesta = await fetch(`${URL_BASE_API}${ruta}`, {
    method: metodo,
    headers: construirHeadersFormularioAutorizados(),
    body: formData,
  });

  return manejarRespuesta(respuesta);
}

async function enviarJsonPublico(ruta, metodo, payload = null) {
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


export async function obtenerResumenDashboard() {
  return obtenerJson("/admin/dashboard/resumen");
}


export async function obtenerInventarioVariantes(parametros = {}) {
  return obtenerJson("/admin/variantes", parametros);
}

export async function obtenerDetalleVariante(varianteId) {
  return obtenerJson(`/admin/variantes/${varianteId}`);
}

export async function actualizarVariante(varianteId, payload) {
  return enviarJson(`/admin/variantes/${varianteId}`, "PUT", payload);
}


export async function obtenerProductos(parametros = {}) {
  return obtenerJson("/admin/productos", parametros);
}

export async function crearProducto(payload) {
  return enviarJson("/admin/productos", "POST", payload);
}

export async function obtenerDetalleProducto(productoId) {
  return obtenerJson(`/admin/productos/${productoId}`);
}

export async function actualizarProducto(productoId, payload) {
  return enviarJson(`/admin/productos/${productoId}`, "PUT", payload);
}

export async function activarProducto(productoId) {
  return enviarJson(`/admin/productos/${productoId}/activar`, "PATCH");
}

export async function desactivarProducto(productoId) {
  return enviarJson(`/admin/productos/${productoId}/desactivar`, "PATCH");
}


export async function obtenerConfiguracionesProducto(productoId) {
  return obtenerJson(`/admin/productos/${productoId}/configuraciones`);
}

export async function crearConfiguracionProducto(productoId, payload) {
  return enviarJson(`/admin/productos/${productoId}/configuraciones`, "POST", payload);
}

export async function obtenerConfiguracionProducto(configuracionId) {
  return obtenerJson(`/admin/productos/configuraciones/${configuracionId}`);
}

export async function actualizarConfiguracionProducto(configuracionId, payload) {
  return enviarJson(`/admin/productos/configuraciones/${configuracionId}`, "PUT", payload);
}

export async function eliminarConfiguracionProducto(configuracionId) {
  return enviarJson(`/admin/productos/configuraciones/${configuracionId}`, "DELETE");
}


export async function obtenerVariantesProducto(productoId) {
  return obtenerJson(`/admin/productos/${productoId}/variantes`);
}

export async function crearVarianteProducto(productoId, payload) {
  return enviarJson(`/admin/productos/${productoId}/variantes`, "POST", payload);
}

export async function obtenerVarianteProducto(varianteId) {
  return obtenerJson(`/admin/productos/variantes/${varianteId}`);
}

export async function actualizarVarianteProducto(varianteId, payload) {
  return enviarJson(`/admin/productos/variantes/${varianteId}`, "PUT", payload);
}

export async function activarVarianteProducto(varianteId) {
  return enviarJson(`/admin/productos/variantes/${varianteId}/activar`, "PATCH");
}

export async function desactivarVarianteProducto(varianteId) {
  return enviarJson(`/admin/productos/variantes/${varianteId}/desactivar`, "PATCH");
}


export async function obtenerImagenesVariante(varianteId) {
  return obtenerJson(`/admin/variantes/${varianteId}/imagenes`);
}

export async function subirImagenVariante(varianteId, payload) {
  const formData = new FormData();

  formData.append("archivo", payload.archivo);

  if (payload.texto_alternativo) {
    formData.append("texto_alternativo", payload.texto_alternativo);
  }

  if (payload.orden !== null && payload.orden !== undefined && payload.orden !== "") {
    formData.append("orden", payload.orden);
  }

  formData.append("es_principal", payload.es_principal ? "true" : "false");

  return enviarFormulario(`/admin/variantes/${varianteId}/imagenes`, "POST", formData);
}

export async function actualizarImagenVariante(imagenId, payload) {
  return enviarJson(`/admin/variantes/imagenes/${imagenId}`, "PATCH", payload);
}

export async function eliminarImagenVariante(imagenId) {
  return enviarJson(`/admin/variantes/imagenes/${imagenId}`, "DELETE");
}


export async function crearVenta(payload) {
  return enviarJson("/admin/ventas", "POST", payload);
}

export async function obtenerVentas(parametros = {}) {
  return obtenerJson("/admin/ventas", parametros);
}

export async function obtenerDetalleVenta(ventaId) {
  return obtenerJson(`/admin/ventas/${ventaId}`);
}

export async function actualizarVenta(ventaId, payload) {
  return enviarJson(`/admin/ventas/${ventaId}`, "PATCH", payload);
}

export async function anularVenta(ventaId, payload) {
  return enviarJson(`/admin/ventas/${ventaId}/anular`, "POST", payload);
}


export async function obtenerCategoriasAdmin(parametros = {}) {
  return obtenerJson("/admin/categorias", parametros);
}

export async function obtenerDetalleCategoria(categoriaId) {
  return obtenerJson(`/admin/categorias/${categoriaId}`);
}

export async function crearCategoria(payload) {
  return enviarJson("/admin/categorias", "POST", payload);
}

export async function actualizarCategoria(categoriaId, payload) {
  return enviarJson(`/admin/categorias/${categoriaId}`, "PUT", payload);
}

export async function activarCategoria(categoriaId) {
  return enviarJson(`/admin/categorias/${categoriaId}/activar`, "PATCH");
}

export async function desactivarCategoria(categoriaId) {
  return enviarJson(`/admin/categorias/${categoriaId}/desactivar`, "PATCH");
}


export async function obtenerMarcasAdmin(parametros = {}) {
  return obtenerJson("/admin/marcas", parametros);
}

export async function obtenerDetalleMarca(marcaId) {
  return obtenerJson(`/admin/marcas/${marcaId}`);
}

export async function crearMarca(payload) {
  return enviarJson("/admin/marcas", "POST", payload);
}

export async function actualizarMarca(marcaId, payload) {
  return enviarJson(`/admin/marcas/${marcaId}`, "PUT", payload);
}

export async function activarMarca(marcaId) {
  return enviarJson(`/admin/marcas/${marcaId}/activar`, "PATCH");
}

export async function desactivarMarca(marcaId) {
  return enviarJson(`/admin/marcas/${marcaId}/desactivar`, "PATCH");
}


export async function obtenerUsuariosAdmin(parametros = {}) {
  return obtenerJson("/admin/usuarios", parametros);
}

export async function obtenerDetalleUsuarioAdmin(usuarioId) {
  return obtenerJson(`/admin/usuarios/${usuarioId}`);
}

export async function crearUsuarioAdmin(payload) {
  return enviarJson("/admin/usuarios", "POST", payload);
}

export async function actualizarUsuarioAdmin(usuarioId, payload) {
  return enviarJson(`/admin/usuarios/${usuarioId}`, "PUT", payload);
}

export async function activarUsuarioAdmin(usuarioId) {
  return enviarJson(`/admin/usuarios/${usuarioId}/activar`, "PATCH");
}

export async function desactivarUsuarioAdmin(usuarioId) {
  return enviarJson(`/admin/usuarios/${usuarioId}/desactivar`, "PATCH");
}

export async function cambiarPasswordUsuarioAdmin(usuarioId, payload) {
  return enviarJson(`/admin/usuarios/${usuarioId}/password`, "PATCH", payload);
}


export async function obtenerSolicitudesAdmin(parametros = {}) {
  return obtenerJson("/admin/solicitudes", parametros);
}

export async function obtenerDetalleSolicitudAdmin(solicitudId) {
  return obtenerJson(`/admin/solicitudes/${solicitudId}`);
}

export async function actualizarSolicitudAdmin(solicitudId, payload) {
  return enviarJson(`/admin/solicitudes/${solicitudId}`, "PATCH", payload);
}

export async function cambiarEstadoSolicitudAdmin(solicitudId, payload) {
  return enviarJson(`/admin/solicitudes/${solicitudId}/estado`, "PATCH", payload);
}

export async function crearSolicitudPublica(payload) {
  return enviarJsonPublico("/public/solicitudes", "POST", payload);
}