document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";

  if (!window.supabase?.createClient) {
    console.error("Supabase JS nie jest załadowany.");
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const loginButtons = document.querySelectorAll('button.login, button[class*="login"]');
  const addButtons = document.querySelectorAll('button.add, button[class*="add"]');
  const gallery = document.querySelector(".gallery");
  const photoCount = document.querySelector("#photoCount");

  const setCount = (count) => {
    if (photoCount) {
      photoCount.textContent = count === 1 ? "1 zapisana chwila" : `${count} zapisanych chwil`;
    }
  };

  const clearSavedPhotos = () => {
    if (!gallery) return;
    gallery.querySelectorAll('[data-saved-photo="true"]').forEach((el) => el.remove());
  };

  const updateAuthUI = (user) => {
    loginButtons.forEach((button) => {
      button.textContent = user ? "Wyloguj" : "Zaloguj";
      button.dataset.authenticated = user ? "true" : "false";
    });
  };

  const addImageToGallery = (url, id = "") => {
    if (!gallery) return;
    const image = document.createElement("img");
    image.src = url;
    image.alt = "Moja chwila";
    image.loading = "lazy";
    image.dataset.savedPhoto = "true";
    image.dataset.photoId = id;
    gallery.prepend(image);
  };

  async function loadSavedPhotos() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      clearSavedPhotos();
      setCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("photos")
      .select("id,image_path,caption,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd pobierania zdjęć z bazy:", error);
      return;
    }

    clearSavedPhotos();

    data.forEach((photo) => {
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(photo.image_path);
      addImageToGallery(publicData.publicUrl, photo.id);
    });

    setCount(data.length);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Wybierz zdjęcie.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Zdjęcie jest za duże. Maksymalny rozmiar to 10 MB.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      alert("Najpierw się zaloguj.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

    if (uploadError) {
      console.error("Błąd Storage:", uploadError);
      alert("Nie udało się dodać zdjęcia: " + uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from("photos").insert({
      user_id: user.id,
      image_path: filePath,
      caption: ""
    });

    if (dbError) {
      console.error("Błąd zapisu rekordu photos:", dbError);
      await supabase.storage.from(BUCKET).remove([filePath]);
      alert("Zdjęcie wysłane, ale nie udało się zapisać go w bazie.");
      return;
    }

    await loadSavedPhotos();
    alert("Zdjęcie dodane i zapisane. ✅");
  }

  addButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Najpierw się zaloguj.");
        return;
      }

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => uploadPhoto(input.files?.[0]);
      input.click();
    });
  });

  loginButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.signOut();
        return;
      }

      const email = prompt("Podaj adres e-mail:");
      if (!email) return;
      const password = prompt("Podaj hasło:");
      if (!password) return;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Logowanie nieudane: " + error.message);
    });
  });

  // Przywrócenie sesji po uruchomieniu/odświeżeniu strony.
  (async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Błąd przywracania sesji:", error);
      updateAuthUI(null);
      return;
    }
    updateAuthUI(session?.user ?? null);
    if (session?.user) await loadSavedPhotos();
  })();

  // Reakcja na logowanie, wylogowanie i odświeżenie tokenu.
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth event:", event);
    updateAuthUI(session?.user ?? null);
    if (session?.user) {
      setTimeout(loadSavedPhotos, 0);
    } else {
      clearSavedPhotos();
      setCount(0);
    }
  });
});