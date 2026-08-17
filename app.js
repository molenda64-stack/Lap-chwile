document.addEventListener("DOMContentLoaded", () => {
  console.log("Łap Chwile — aplikacja działa");

  const buttons = document.querySelectorAll("button, a");

  buttons.forEach((button) => {
    const text = button.textContent.trim().toLowerCase();

    // LOGOWANIE
    iif (text.includes("zaloguj")) {
  button.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = prompt("Podaj adres e-mail:");
    if (!email) return;

    const password = prompt("Podaj hasło:");
    if (!password) return;

    const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
    const SUPABASE_KEY = "sb_publishable_...";djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";

    try {
      const response = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY
          },
          body: JSON.stringify({
            email: email,
            password: password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          "Nie udało się zalogować: " +
          (data.error_description || data.msg || "Nieprawidłowe dane.")
        );
        return;
      }

      localStorage.setItem("lap_chwile_access_token", data.access_token);
      localStorage.setItem("lap_chwile_refresh_token", data.refresh_token);
      localStorage.setItem("lap_chwile_user", JSON.stringify(data.user));

      alert("Zalogowano pomyślnie! ❤️");
      location.reload();

    } catch (error) {
      console.error(error);
      alert("Błąd połączenia z Supabase.");
    }
  });
    }

    // DODAWANIE CHWILI / ZDJĘCIA
    if (
      text.includes("dodaj chwilę") ||
      text.includes("dodaj chwile") ||
      text.includes("dodaj zdjęcie") ||
      text.includes("dodaj zdjecie")
    ) {
      button.addEventListener("click", (e) => {
        e.preventDefault();

        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.addEventListener("change", () => {
          if (input.files && input.files.length > 0) {
            alert("Wybrano zdjęcie: " + input.files[0].name);
          }
        });

        input.click();
      });
    }

    // ZOBACZ CHWILE
    if (text.includes("zobacz chwile") || text.includes("zobacz chwilę")) {
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
