document.addEventListener("DOMContentLoaded", () => {
  console.log("Łap Chwile — app.js działa");

  const buttons = document.querySelectorAll("button, a");

  buttons.forEach((button) => {
    const text = button.textContent.trim().toLowerCase();

    // Logowanie
    if (text.includes("zaloguj")) {
      button.addEventListener("click", (e) => {
        e.preventDefault();

        const modal = document.querySelector(
          '[role="dialog"], .modal, .login-modal, [class*="modal"]'
        );

        if (modal) {
          modal.style.display = "flex";
          modal.style.visibility = "visible";
          modal.style.opacity = "1";
        } else {
          alert("Logowanie zostanie podłączone do Supabase.");
        }
      });
    }

    // Dodawanie chwili
    if (text.includes("dodaj chwilę") || text.includes("dodaj zdjęcie")) {
      button.addEventListener("click", (e) => {
        e.preventDefault();

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.click();

        input.addEventListener("change", () => {
          if (input.files && input.files.length > 0) {
            alert("Wybrano zdjęcie: " + input.files[0].name);
          }
        });
      });
    }

    // Zobacz chwile
    if (text.includes("zobacz chwile")) {
      button.addEventListener("click", (e) => {
        e.preventDefault();

        const gallery = document.querySelector("section:last-of-type");

        if (gallery) {
          gallery.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        } else {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth"
          });
        }
      });
    }
  });
});
