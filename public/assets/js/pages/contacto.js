import {
  obtenerCategoriasPublicas,
  crearSolicitudPublica,
} from "../api.js";

const formSolicitudCotizacion = document.getElementById("formSolicitudCotizacion");

const nombre = document.getElementById("nombre");
const whatsapp = document.getElementById("whatsapp");
const correo = document.getElementById("correo");
const vehiculo = document.getElementById("vehiculo");
const contenedorCategorias = document.getElementById("contenedorCategorias");
const cantidad = document.getElementById("cantidad");
const preferenciaWhatsapp = document.getElementById("preferenciaWhatsapp");
const preferenciaCorreo = document.getElementById("preferenciaCorreo");
const mensaje = document.getElementById("mensaje");
const aceptaTerminos = document.getElementById("aceptaTerminos");

const alertaFormulario = document.getElementById("alertaFormulario");
const btnEnviarSolicitud = document.getElementById("btnEnviarSolicitud");
const contadorMensaje = document.getElementById("contadorMensaje");

const errores = {
  nombre: document.getElementById("errorNombre"),
  whatsapp: document.getElementById("errorWhatsapp"),
  correo: document.getElementById("errorCorreo"),
  vehiculo: document.getElementById("errorVehiculo"),
  categorias: document.getElementById("errorCategorias"),
  cantidad: document.getElementById("errorCantidad"),
  preferencia: document.getElementById("errorPreferencia"),
  mensaje: document.getElementById("errorMensaje"),
  terminos: document.getElementById("errorTerminos"),
};

const camposTocados = {
  nombre: false,
  whatsapp: false,
  correo: false,
  vehiculo: false,
  categorias: false,
  cantidad: false,
  preferencia: false,
  mensaje: false,
  terminos: false,
};

let categoriasDisponibles = [];
let formularioEnviadoIntentado = false;

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
  registrarEventos();
  actualizarContadorMensaje();
  actualizarPreferenciaCorreo();
  actualizarEstadoBotonEnviar();

  await cargarCategorias();

  setTimeout(() => {
    actualizarPreferenciaCorreo();
    actualizarEstadoBotonEnviar();
  }, 300);
}

function registrarEventos() {
  formSolicitudCotizacion?.addEventListener("submit", enviarSolicitud);

  nombre?.addEventListener("input", () => {
    nombre.value = limpiarEspaciosInternos(nombre.value, false);
    validarCampoSiCorresponde("nombre");
    actualizarEstadoBotonEnviar();
  });

  nombre?.addEventListener("blur", () => {
    camposTocados.nombre = true;
    nombre.value = limpiarEspaciosInternos(nombre.value);
    validarCampoNombre(true);
    actualizarEstadoBotonEnviar();
  });

  whatsapp?.addEventListener("input", () => {
    whatsapp.value = whatsapp.value.replace(/\D/g, "").slice(0, 10);

    if (whatsapp.value.length > 0) {
      camposTocados.whatsapp = true;
    }

    validarCampoSiCorresponde("whatsapp");
    actualizarEstadoBotonEnviar();
  });

  whatsapp?.addEventListener("blur", () => {
    camposTocados.whatsapp = true;
    validarCampoWhatsapp(true);
    actualizarEstadoBotonEnviar();
  });

  correo?.addEventListener("input", () => {
    correo.value = correo.value.trim().toLowerCase();

    if (correo.value.length > 0) {
      camposTocados.correo = true;
    }

    actualizarPreferenciaCorreo();
    validarCampoSiCorresponde("correo");
    validarCampoSiCorresponde("preferencia");
    actualizarEstadoBotonEnviar();
  });

  correo?.addEventListener("blur", () => {
    camposTocados.correo = true;
    correo.value = correo.value.trim().toLowerCase();
    actualizarPreferenciaCorreo();
    validarCampoCorreo(true);
    validarCampoPreferencia(true);
    actualizarEstadoBotonEnviar();
  });

  vehiculo?.addEventListener("input", () => {
    vehiculo.value = limpiarEspaciosInternos(vehiculo.value, false);
    validarCampoSiCorresponde("vehiculo");
    actualizarEstadoBotonEnviar();
  });

  vehiculo?.addEventListener("blur", () => {
    camposTocados.vehiculo = true;
    vehiculo.value = limpiarEspaciosInternos(vehiculo.value);
    validarCampoVehiculo(true);
    actualizarEstadoBotonEnviar();
  });

  cantidad?.addEventListener("input", () => {
    cantidad.value = cantidad.value.replace(/[^\d]/g, "");

    if (Number(cantidad.value) > 99) {
      cantidad.value = 99;
    }

    if (cantidad.value.length > 0) {
      camposTocados.cantidad = true;
    }

    validarCampoSiCorresponde("cantidad");
    actualizarEstadoBotonEnviar();
  });

  cantidad?.addEventListener("blur", () => {
    camposTocados.cantidad = true;

    if (!cantidad.value) {
      cantidad.value = 1;
    }

    validarCampoCantidad(true);
    actualizarEstadoBotonEnviar();
  });

  [preferenciaWhatsapp, preferenciaCorreo].forEach((campo) => {
    campo?.addEventListener("change", () => {
      camposTocados.preferencia = true;
      validarCampoPreferencia(true);
      actualizarEstadoBotonEnviar();
    });
  });

  mensaje?.addEventListener("input", () => {
    mensaje.value = limpiarEspaciosInternos(mensaje.value, false);
    actualizarContadorMensaje();
    validarCampoSiCorresponde("mensaje");
    actualizarEstadoBotonEnviar();
  });

  mensaje?.addEventListener("blur", () => {
    camposTocados.mensaje = true;
    mensaje.value = limpiarEspaciosInternos(mensaje.value);
    actualizarContadorMensaje();
    validarCampoMensaje(true);
    actualizarEstadoBotonEnviar();
  });

  aceptaTerminos?.addEventListener("change", () => {
    camposTocados.terminos = true;
    validarCampoTerminos(true);
    actualizarEstadoBotonEnviar();
  });
}

async function cargarCategorias() {
  try {
    contenedorCategorias.innerHTML = `
      <div class="text-muted small">
        Cargando repuestos disponibles...
      </div>
    `;

    const respuesta = await obtenerCategoriasPublicas();

    categoriasDisponibles = Array.isArray(respuesta)
      ? respuesta
      : Array.isArray(respuesta.items)
        ? respuesta.items
        : [];

    renderizarCategorias();
    actualizarEstadoBotonEnviar();
  } catch (error) {
    contenedorCategorias.innerHTML = `
      <div class="alert alert-warning mb-0">
        No fue posible cargar las categorías de repuestos.
      </div>
    `;

    mostrarAlerta(
      error.message || "No fue posible cargar las categorías de repuestos.",
      "warning"
    );

    actualizarEstadoBotonEnviar();
  }
}

function renderizarCategorias() {
  if (!categoriasDisponibles.length) {
    contenedorCategorias.innerHTML = `
      <div class="alert alert-warning mb-0">
        No hay categorías disponibles para solicitar.
      </div>
    `;
    return;
  }

  contenedorCategorias.innerHTML = categoriasDisponibles
    .map((categoria) => `
      <div class="form-check categoria-check">
        <input
          id="categoria-${categoria.id}"
          class="form-check-input"
          type="checkbox"
          name="categoria_ids"
          value="${categoria.id}"
        >
        <label class="form-check-label" for="categoria-${categoria.id}">
          ${escaparHtml(categoria.nombre)}
        </label>
      </div>
    `)
    .join("");

  document.querySelectorAll('input[name="categoria_ids"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      camposTocados.categorias = true;
      validarCampoCategorias(true);
      actualizarEstadoBotonEnviar();
    });
  });
}

async function enviarSolicitud(evento) {
  evento.preventDefault();

  formularioEnviadoIntentado = true;
  ocultarAlerta();

  const validacion = validarFormulario(true);

  if (!validacion.valido) {
    mostrarAlerta("Revisa los campos marcados antes de enviar la solicitud.", "danger");
    enfocarPrimerCampoConError();
    actualizarEstadoBotonEnviar();
    return;
  }

  try {
    btnEnviarSolicitud.disabled = true;
    btnEnviarSolicitud.textContent = "Enviando...";

    await crearSolicitudPublica(validacion.payload);

    mostrarAlerta(
      "Solicitud enviada correctamente. Te contactaremos por WhatsApp lo antes posible.",
      "success"
    );

    reiniciarFormulario();
  } catch (error) {
    mostrarAlerta(error.message || "No fue posible enviar la solicitud.", "danger");
  } finally {
    btnEnviarSolicitud.disabled = false;
    btnEnviarSolicitud.textContent = "Enviar solicitud";
    actualizarEstadoBotonEnviar();
  }
}

function validarFormulario(mostrarErrores = false) {
  const nombreValido = validarCampoNombre(mostrarErrores);
  const whatsappValido = validarCampoWhatsapp(mostrarErrores);
  const correoValido = validarCampoCorreo(mostrarErrores);
  const vehiculoValido = validarCampoVehiculo(mostrarErrores);
  const categoriasValidas = validarCampoCategorias(mostrarErrores);
  const cantidadValida = validarCampoCantidad(mostrarErrores);
  const preferenciaValida = validarCampoPreferencia(mostrarErrores);
  const mensajeValido = validarCampoMensaje(mostrarErrores);
  const terminosValidos = validarCampoTerminos(mostrarErrores);

  const valido = [
    nombreValido,
    whatsappValido,
    correoValido,
    vehiculoValido,
    categoriasValidas,
    cantidadValida,
    preferenciaValida,
    mensajeValido,
    terminosValidos,
  ].every(Boolean);

  return {
    valido,
    payload: construirPayload(),
  };
}

function validarCampoSiCorresponde(nombreCampo) {
  if (formularioEnviadoIntentado || camposTocados[nombreCampo]) {
    const validadores = {
      nombre: validarCampoNombre,
      whatsapp: validarCampoWhatsapp,
      correo: validarCampoCorreo,
      vehiculo: validarCampoVehiculo,
      categorias: validarCampoCategorias,
      cantidad: validarCampoCantidad,
      preferencia: validarCampoPreferencia,
      mensaje: validarCampoMensaje,
      terminos: validarCampoTerminos,
    };

    validadores[nombreCampo]?.(true);
  }
}

function validarCampoNombre(mostrarError = false) {
  const valor = limpiarEspaciosInternos(nombre.value);

  if (valor.length < 3 || valor.length > 120) {
    if (mostrarError) {
      marcarError(nombre, errores.nombre, "El nombre debe tener entre 3 y 120 caracteres.");
    }

    return false;
  }

  limpiarError(nombre, errores.nombre);
  return true;
}

function validarCampoWhatsapp(mostrarError = false) {
  const valor = whatsapp.value.replace(/\D/g, "");

  if (!/^\d{10}$/.test(valor)) {
    if (mostrarError) {
      marcarError(whatsapp, errores.whatsapp, "El WhatsApp debe tener exactamente 10 números.");
    }

    return false;
  }

  if (!valor.startsWith("3")) {
    if (mostrarError) {
      marcarError(whatsapp, errores.whatsapp, "El WhatsApp debe empezar por 3.");
    }

    return false;
  }

  limpiarError(whatsapp, errores.whatsapp);
  return true;
}

function validarCampoCorreo(mostrarError = false) {
  const valor = correo.value.trim().toLowerCase();

  if (!valor) {
    limpiarError(correo, errores.correo);
    return true;
  }

  if (!validarCorreo(valor)) {
    if (mostrarError) {
      marcarError(correo, errores.correo, "Escribe un correo válido.");
    }

    return false;
  }

  limpiarError(correo, errores.correo);
  return true;
}

function validarCampoVehiculo(mostrarError = false) {
  const valor = limpiarEspaciosInternos(vehiculo.value);

  if (valor.length < 5 || valor.length > 180) {
    if (mostrarError) {
      marcarError(
        vehiculo,
        errores.vehiculo,
        "Los datos del vehículo deben tener entre 5 y 180 caracteres."
      );
    }

    return false;
  }

  limpiarError(vehiculo, errores.vehiculo);
  return true;
}

function validarCampoCategorias(mostrarError = false) {
  const categoriaIds = obtenerCategoriasSeleccionadas();

  if (!categoriaIds.length) {
    if (mostrarError) {
      marcarError(null, errores.categorias, "Selecciona al menos un repuesto.");
    }

    return false;
  }

  if (categoriaIds.length > 8) {
    if (mostrarError) {
      marcarError(null, errores.categorias, "Selecciona máximo 8 repuestos.");
    }

    return false;
  }

  limpiarError(null, errores.categorias);
  return true;
}

function validarCampoCantidad(mostrarError = false) {
  const valor = Number(cantidad.value);

  if (!Number.isInteger(valor) || valor < 1 || valor > 99) {
    if (mostrarError) {
      marcarError(cantidad, errores.cantidad, "La cantidad debe estar entre 1 y 99.");
    }

    return false;
  }

  limpiarError(cantidad, errores.cantidad);
  return true;
}

function validarCampoPreferencia(mostrarError = false) {
  const preferenciaContacto = obtenerPreferenciaContacto();
  const correoValor = correo.value.trim().toLowerCase();

  if (preferenciaContacto === "correo" && !validarCorreo(correoValor)) {
    if (mostrarError) {
      marcarError(
        null,
        errores.preferencia,
        "Para elegir correo como preferencia debes escribir un correo válido."
      );
    }

    return false;
  }

  limpiarError(null, errores.preferencia);
  return true;
}

function validarCampoMensaje(mostrarError = false) {
  const valor = limpiarEspaciosInternos(mensaje.value);

  if (valor.length < 5 || valor.length > 700) {
    if (mostrarError) {
      marcarError(mensaje, errores.mensaje, "El comentario debe tener entre 5 y 700 caracteres.");
    }

    return false;
  }

  limpiarError(mensaje, errores.mensaje);
  return true;
}

function validarCampoTerminos(mostrarError = false) {
  if (!aceptaTerminos.checked) {
    if (mostrarError) {
      marcarError(null, errores.terminos, "Debes aceptar los términos y condiciones.");
    }

    return false;
  }

  limpiarError(null, errores.terminos);
  return true;
}

function construirPayload() {
  return {
    nombre: limpiarEspaciosInternos(nombre.value),
    telefono: whatsapp.value.replace(/\D/g, ""),
    correo: correo.value.trim().toLowerCase() || null,
    vehiculo: limpiarEspaciosInternos(vehiculo.value),
    categoria_ids: obtenerCategoriasSeleccionadas(),
    cantidad: Number(cantidad.value),
    preferencia_contacto: obtenerPreferenciaContacto(),
    mensaje: limpiarEspaciosInternos(mensaje.value),
  };
}

function obtenerCategoriasSeleccionadas() {
  return Array.from(document.querySelectorAll('input[name="categoria_ids"]:checked'))
    .map((checkbox) => Number(checkbox.value))
    .filter((valor) => Number.isInteger(valor) && valor > 0);
}

function obtenerPreferenciaContacto() {
  if (preferenciaCorreo.checked && !preferenciaCorreo.disabled) {
    return "correo";
  }

  return "whatsapp";
}

function actualizarPreferenciaCorreo() {
  const correoValido = validarCorreo(correo.value.trim());

  preferenciaCorreo.disabled = !correoValido;

  if (!correoValido) {
    preferenciaWhatsapp.checked = true;
  }
}

function actualizarEstadoBotonEnviar() {
  if (!btnEnviarSolicitud) return;

  const validacion = validarFormulario(false);

  btnEnviarSolicitud.disabled = !validacion.valido;
}

function actualizarContadorMensaje() {
  contadorMensaje.textContent = `${mensaje.value.length}/700`;
}

function marcarError(campo, contenedorError, mensajeError) {
  if (campo) {
    campo.classList.add("is-invalid");
    campo.setAttribute("aria-invalid", "true");
  }

  if (contenedorError) {
    contenedorError.textContent = mensajeError;
  }
}

function limpiarError(campo, contenedorError) {
  if (campo) {
    campo.classList.remove("is-invalid");
    campo.removeAttribute("aria-invalid");
  }

  if (contenedorError) {
    contenedorError.textContent = "";
  }
}

function mostrarAlerta(mensajeAlerta, tipo = "primary") {
  alertaFormulario.className = `alert alert-${tipo}`;
  alertaFormulario.textContent = mensajeAlerta;
  alertaFormulario.classList.remove("d-none");

  alertaFormulario.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function ocultarAlerta() {
  alertaFormulario.className = "d-none";
  alertaFormulario.textContent = "";
}

function enfocarPrimerCampoConError() {
  const campoConError = document.querySelector(".is-invalid");

  if (campoConError) {
    campoConError.focus();
  }
}

function reiniciarFormulario() {
  formSolicitudCotizacion.reset();

  cantidad.value = 1;
  preferenciaWhatsapp.checked = true;
  preferenciaCorreo.disabled = true;

  Object.keys(camposTocados).forEach((campo) => {
    camposTocados[campo] = false;
  });

  formularioEnviadoIntentado = false;

  limpiarTodosLosErrores();
  actualizarContadorMensaje();
  actualizarEstadoBotonEnviar();
}

function limpiarTodosLosErrores() {
  [nombre, whatsapp, correo, vehiculo, cantidad, mensaje].forEach((campo) => {
    campo?.classList.remove("is-invalid");
    campo?.removeAttribute("aria-invalid");
  });

  Object.values(errores).forEach((contenedorError) => {
    if (contenedorError) {
      contenedorError.textContent = "";
    }
  });
}

function validarCorreo(valor) {
  if (!valor) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function limpiarEspaciosInternos(valor, recortarExtremos = true) {
  const texto = String(valor || "").replace(/\s+/g, " ");

  return recortarExtremos ? texto.trim() : texto;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}