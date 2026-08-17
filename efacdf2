document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";

  const loginButtons = document.querySelectorAll(
    'button.login, button[class*="login"]'
  );

  const addButtons = document.querySelectorAll(
    'button.add, button[class*="add"]'
  );

  // =========================
  // LOGOWANIE SUPABASE
  // =========================

  loginButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();

      const email = prompt("Podaj adres e-mail:");
      if (!email) return;

      const password = prompt("Podaj hasło:");
      if (!password) return;

      try {
        const response = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_KEY
            },
            body: JSON.stringify({
              email,
              password
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(
            "Logowanie nieudane:\n" +
            (data.error_description || data.msg || "Nieprawidłowe dane.")
          );
          return;
        }

        localStorage.setItem(
          "lap_chwile_session",
          JSON.stringify(data)
        );

        alert("Zalogowano pomyślnie ❤️");
        location.reload();

      } catch (error) {
        console.error(error);
        alert("Nie udało się połączyć z Supabase.");
      }
    });
  });


  // =========================
  // DODAJ CHWILĘ
  // =========================

  addButtons.forEach((button) => {
  button.addEventListener("click", async (event) => {
    event.preventDefault();

    const sessionText = localStorage.getItem("lap_chwile_session");

    if (!sessionText) {
      alert("Najpierw się zaloguj.");
      return;
    }

    const session = JSON.parse(sessionText);
    const user = session.user;

    if (!user) {
      alert("Sesja użytkownika jest nieprawidłowa.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.addEventListener("change", async () => {
      if (!input.files || !input.files[0]) return;

      const file = input.files[0];

      if (!file.type.startsWith("image/")) {
        alert("Wybierz plik graficzny.");
        return;
      }

      const filePath =
        user.id + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const SUPABASE_URL =
        "https://jcmwjmaywkmnjrciziix.supabase.co";

      const SUPABASE_KEY =
        "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";

      try {
        const response = await fetch(
          `${SUPABASE_URL}/storage/v1/object/photos/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + session.access_token,
              apikey: SUPABASE_KEY,
              "Content-Type": file.type,
              "x-upsert": "false"
            },
            body: file
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error(result);
          alert(
            "Nie udało się zapisać zdjęcia:\n" +
            (result.message || result.error || "Błąd Storage")
          );
          return;
        }

        const gallery = document.querySelector(".gallery");

        if (gallery) {
          const img = document.createElement("img");
          img.src = URL.createObjectURL(file);
          img.alt = "Moja chwila";
          gallery.prepend(img);
        }

        alert("🔥 Zdjęcie zostało zapisane w Supabase!");

      } catch (error) {
        console.error(error);
        alert("Błąd połączenia z Supabase Storage.");
      }
    });

    input.click();
  });
});
    button.addEventListener("click", (event) => {
      event.preventDefault();

      const session = localStorage.getItem("lap_chwile_session");

      if (!session) {
        alert("Najpierw się zaloguj.");
        return;
      }

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

          alert("Zdjęcie wybrane ❤️");
        };

        reader.readAsDataURL(file);
      });

      input.click();
    });
  });

});
