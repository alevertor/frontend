// Función para cargar el nav
function cargarNav() {
    fetch('/frontend/componentes/nav.html')
        .then(response => response.text())
        .then(data => {
        document.querySelector('body').insertAdjacentHTML('afterbegin', data);
        })
        .catch(error => console.error('Error al cargar el nav:', error));
}

// Función para cargar el footer
function cargarFooter() {
    fetch('/frontend/componentes/footer.html')
        .then(response => response.text())
        .then(data => {
        document.querySelector('body').insertAdjacentHTML('beforeend', data);
        })
        .catch(error => console.error('Error al cargar el footer:', error));
}

// Llamar a las funciones cuando cargue la página
document.addEventListener('DOMContentLoaded', function () {
    cargarNav();
    cargarFooter();
});


document.addEventListener("DOMContentLoaded", function() {
  // Obtener los elementos de los menús
  const menuToggle = document.getElementById("menu-toggle");
  const closeMenu = document.getElementById("close-menu");
  const menuLinks = document.getElementById("enlaces-navegacion");

  // Función para abrir el menú
  menuToggle.addEventListener("click", function() {
    menuLinks.classList.toggle("show");  // Abre o cierra el menú
    closeMenu.style.display = 'block';   // Muestra el botón de cerrar
  });

  // Función para cerrar el menú al hacer clic en el icono de cerrar
  closeMenu.addEventListener("click", function() {
    menuLinks.classList.remove("show");  // Cierra el menú
    closeMenu.style.display = 'none';    // Oculta el botón de cerrar
  });

  // Cerrar el menú al hacer clic en un enlace
  const links = menuLinks.getElementsByTagName("a");
  for (let link of links) {
    link.addEventListener("click", function() {
      menuLinks.classList.remove("show");  // Ocultar el menú después de hacer clic en un enlace
      closeMenu.style.display = 'none';    // Ocultar el icono de cerrar
    });
  }
});