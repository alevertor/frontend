const btnLogin = document.getElementById("btn-login");
const inputCorreo = document.getElementById("correo");
const inputPassword = document.getElementById("password");
const contenedorError = document.getElementById("error");

btnLogin.addEventListener("click", login);

async function login() {
  const correo = inputCorreo.value.trim().toLowerCase();
  const password = inputPassword.value;

  contenedorError.innerText = "";

  if (!correo || !password) {
    contenedorError.innerText = "Ingresa correo y contraseña.";
    return;
  }

  try {
    btnLogin.disabled = true;
    btnLogin.innerText = "Ingresando...";

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
    localStorage.removeItem("token_acceso");
    localStorage.removeItem("usuario_admin");
    localStorage.removeItem("usuario_rol");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_correo");

    contenedorError.innerText = error.message;
  } finally {
    btnLogin.disabled = false;
    btnLogin.innerText = "Ingresar";
  }
}

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    login();
  }
});