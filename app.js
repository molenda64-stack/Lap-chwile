document.addEventListener("DOMContentLoaded", () => {

  console.log("Łap Chwilę — aplikacja działa");

  // =========================
  // DODAJ CHWILĘ / ZDJĘCIE
  // =========================

  const addButtons = document.querySelectorAll(
    'button.add, button[class*="add"]'
  );

  addButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.addEventListener("change", () => {
        if (!input.files || !input.files[0]) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = () => {
          const gallery = document.querySelector(".gallery");

          if (!gallery) return;

          const img = document.createElement("img");
          img.src = reader.result;
          img.alt = "Moja chwila";

          gallery.prepend(img);

          alert("Chwila została dodana ❤️");
        };

        reader.readAsDataURL(file);
      });

      input.click();
    });
  });


  // =========================
  // LOGOWANIE
  // =========================

  const loginButtons = document.querySelectorAll(
    'button.login, button[class*="login"]'
  );

  loginButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const email = prompt("Podaj adres e-mail:");

      if (!email) return;

      const password = prompt("Podaj hasło:");

      if (!password) return;

      alert(
        "Logowanie działa.\n\n" +
        "E-mail: " + email
      );
    });
  });

});
