document.addEventListener("DOMContentLoaded", () => {

  // ==============================
  // SUPABASE
  // ==============================

  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";

  let accessToken = null;
    // Przywróć sesję po odświeżeniu
  const savedSession = localStorage.getItem("lap_chwile_session");

  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);

      if (session.access_token) {
        accessToken = session.access_token;
      }
    } catch (error) {
      console.error("Nieprawidłowa zapisana sesja:", error);
      localStorage.removeItem("lap_chwile_session");
    }
  }

  // ==============================
  // PRZYCISK ZALOGUJ
  // ==============================

  const loginButtons = document.querySelectorAll(
    'button.login, button[class*="login"]'
  );

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
          alert("Logowanie nieudane: " + (data.error_description || data.message || "Błąd"));
          return;
        }

        accessToken = data.access_token;

localStorage.setItem(
  "lap_chwile_session",
  JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  })
);

alert("Zalogowano ✅");

        // Po zalogowaniu aktywujemy dodawanie zdjęć
        enableAddButtons();

      } catch (error) {

        console.error(error);
        alert("Błąd połączenia z Supabase.");

      }

    });

  });


  // ==============================
  // DODAWANIE CHWILI / ZDJĘCIA
  // ==============================

  function enableAddButtons() {

    const addButtons = document.querySelectorAll(
      'button.add, button[class*="add"]'
    );

    addButtons.forEach((button) => {

      button.onclick = async (event) => {

        event.preventDefault();

        if (!accessToken) {
          alert("Najpierw się zaloguj.");
          return;
        }

        const input = document.createElement("input");

        input.type = "file";
        input.accept = "image/*";

        input.onchange = async () => {

          const file = input.files[0];

          if (!file) return;

          if (!file.type.startsWith("image/")) {
            alert("Wybierz zdjęcie.");
            return;
          }

          // Maksymalnie 10 MB
          if (file.size > 10 * 1024 * 1024) {
            alert("Zdjęcie jest za duże. Maksymalny rozmiar to 10 MB.");
            return;
          }

          try {

            alert("Wysyłam zdjęcie... 📸");

            const fileName =
              `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

            const uploadResponse = await fetch(
              `${SUPABASE_URL}/storage/v1/object/photos/${fileName}`,
              {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "apikey": SUPABASE_KEY,
                  "Content-Type": file.type
                },
                body: file
              }
            );

            const uploadData = await uploadResponse.json();

            if (!uploadResponse.ok) {
              console.error(uploadData);

              alert(
                "Nie udało się dodać zdjęcia: " +
                (uploadData.message || "błąd Storage")
              );

              return;
            }

            // Publiczny adres zdjęcia
            const imageUrl =
              `${SUPABASE_URL}/storage/v1/object/public/photos/${encodeURIComponent(fileName)}`;

            addImageToGallery(imageUrl);

            alert("Zdjęcie dodane! ✅");

          } catch (error) {

            console.error(error);

            alert("Wystąpił błąd podczas wysyłania zdjęcia.");

          }

        };

        input.click();

      };

    });

  }


  // ==============================
  // POKAŻ NOWE ZDJĘCIE
  // ==============================

  function addImageToGallery(imageUrl) {

    let gallery = document.querySelector(".gallery");

    if (!gallery) {

      gallery = document.createElement("section");

      gallery.className = "gallery";

      document.querySelector("main")?.appendChild(gallery);

    }

    const image = document.createElement("img");

    image.src = imageUrl;
    image.alt = "Moja chwila";

    image.style.width = "100%";
    image.style.display = "block";
    image.style.marginBottom = "20px";
    image.style.borderRadius = "20px";

    gallery.prepend(image);

  }

});  // ==============================
  // POBIERANIE ZAPISANYCH ZDJĘĆ
  // ==============================

  async function loadSavedPhotos() {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/list/photos`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prefix: "",
            limit: 100,
            offset: 0,
            sortBy: {
              column: "created_at",
              order: "desc"
            }
          })
        }
      );

      const files = await response.json();

      if (!response.ok) {
        console.error(files);
        return;
      }
const imageFiles = Array.isArray(files)
    ? files.filter(file => file?.name && !file.name.endsWith("/"))
    : [];

const photoCount = document.querySelector("#photoCount");

if (photoCount) {
    photoCount.textContent =
        imageFiles.length === 1
            ? "1 zapisana chwila"
            : `${imageFiles.length} zapisanych chwil`;
}
      const gallery = document.querySelector(".gallery");

      if (!gallery) return;

      imagefiles.forEach((file) => {
        if (!file.name) return;

        const imageUrl =
          `${SUPABASE_URL}/storage/v1/object/public/photos/${encodeURIComponent(file.name)}`;

        addImageToGallery(imageUrl);
      });

    } catch (error) {
      console.error("Błąd pobierania zdjęć:", error);
    }
  }

  // Pobierz zdjęcia po zalogowaniu
  loadSavedPhotos();
