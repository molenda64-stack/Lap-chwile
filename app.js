document.addEventListener("DOMContentLoaded", () => {
  alert("APP.JS DZIAŁA");
  document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    alert("KLIK DZIAŁA: " + button.textContent);
  });
});

  const login = document.querySelector(
    'button.login, button[class*="login"]'
  );

  if (login) {
    login.addEventListener("click", () => {
      alert("PRZYCISK ZALOGUJ DZIAŁA");
    });
  }
});
