const formLogin = document.getElementById("formLogin");
const btnLogin = document.getElementById("btn-login");
const inputCorreo = document.getElementById("correo");
const inputPassword = document.getElementById("password");
const btnVerPassword = document.getElementById("btnVerPassword");
const iconoPassword = document.getElementById("iconoPassword");
const contenedorError = document.getElementById("error");

const ICONO_OJO_ABIERTO = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M2.25 12S5.75 5.75 12 5.75 21.75 12 21.75 12 18.25 18.25 12 18.25 2.25 12 2.25 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const ICONO_OJO_CERRADO = `
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M9.36 5.93A8.4 8.4 0 0 1 12 5.5c6.25 0 9.75 6.5 9.75 6.5a17.2 17.2 0 0 1-3.13 3.83" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.57 7.6A17.4 17.4 0 0 0 2.25 12S5.75 18.5 12 18.5c1.24 0 2.39-.26 3.43-.68" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

formLogin?.addEventListener("submit", login);
btnVerPassword?.addEventListener("click", alternarVisibilidadPassword);

function alternarVisibilidadPassword() {
  const estaVisible = inputPassword.type === "text";

  inputPassword.type = estaVisible ? "password" : "text";

  btnVerPassword.setAttribute(
    "aria-label",
    estaVisible ? "Mostrar contraseña" : "Ocultar contraseña"
  );

  btnVerPassword.setAttribute("aria-pressed", String(!estaVisible));
  iconoPassword.innerHTML = estaVisible ? ICONO_OJO_ABIERTO : ICONO_OJO_CERRADO;

  inputPassword.focus();
}

async function login(evento) {
  evento?.preventDefault();

  const correo = inputCorreo.value.trim().toLowerCase();
  const password = inputPassword.value;

  ocultarError();

  if (!correo || !password) {
    mostrarError("Ingresa correo y contraseña.");
    return;
  }

  try {
    alternarIngresando(true);

    const respuesta = await fetch("http://127.0.0.1:8000/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ correo, password }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.detail || "Credenciales incorrectas.");
    }

    if (!datos.access_token) {
      throw new Error("El servidor no devolvió token de acceso.");
    }

    if (!datos.usuario) {
      throw new Error("El servidor no devolvió los datos del usuario.");
    }

    localStorage.setItem("token_acceso", datos.access_token);
    localStorage.setItem("usuario_admin", JSON.stringify(datos.usuario));
    localStorage.setItem("usuario_rol", datos.usuario.rol || "admin");
    localStorage.setItem("usuario_nombre", datos.usuario.nombre || "");
    localStorage.setItem("usuario_correo", datos.usuario.correo || "");

    if (datos.usuario.rol === "vendedor") {
      window.location.href = "./inventario.html";
    } else {
      window.location.href = "./dashboard.html";
    }
  } catch (error) {
    limpiarSesion();
    mostrarError(error.message);
  } finally {
    alternarIngresando(false);
  }
}

function alternarIngresando(ingresando) {
  btnLogin.disabled = ingresando;
  btnLogin.innerText = ingresando ? "Ingresando..." : "Ingresar";
}

function mostrarError(mensaje) {
  contenedorError.textContent = mensaje;
  contenedorError.classList.remove("d-none");
}

function ocultarError() {
  contenedorError.textContent = "";
  contenedorError.classList.add("d-none");
}

function limpiarSesion() {
  localStorage.removeItem("token_acceso");
  localStorage.removeItem("usuario_admin");
  localStorage.removeItem("usuario_rol");
  localStorage.removeItem("usuario_nombre");
  localStorage.removeItem("usuario_correo");
}