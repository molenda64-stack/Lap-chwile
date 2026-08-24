document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  // Verified browser-safe anon key for this project.
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbXdqbWF5d2ttbmpyY2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODI4MjQsImV4cCI6MjEwMjQ1ODgyNH0.RtBREQD2r-shvaAJ9tSPR5ypYdIe9pqhwh4QJ3n-ruA";
  const BUCKET = "photos";
  const supabase = window.supabase?.createClient ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
      storageKey: "lap-chwile-auth-v5"
    }
  }) : null;

  const loginButtons = document.querySelectorAll('button.login, button[class*="login"]');
  const addButtons = document.querySelectorAll('button.add, button[class*="add"]');
  const gallery = document.querySelector(".gallery");
  const photoCount = document.querySelector("#photoCount");
  const uploadStatus = document.querySelector("#uploadStatus");
  const authModal = document.querySelector("#authModal");
  const authForm = document.querySelector("#authForm");
  const authEmail = document.querySelector("#authEmail");
  const authPassword = document.querySelector("#authPassword");
  const authSubmit = document.querySelector("#authSubmit");
  const authSwitch = document.querySelector("#authSwitch");
  const authClose = document.querySelector("#authClose");
  const authTitle = document.querySelector("#authTitle");
  const authSubtitle = document.querySelector("#authSubtitle");
  const authMessage = document.querySelector("#authMessage");

  let authMode = "login";
  let loadingPhotos = false;
  let uploading = false;
  let recoveryLink;
  let resendLink;

  const setCount = (n) => {
    if (photoCount) photoCount.textContent = n === 1 ? "1 zapisana chwila" : `${n} zapisanych chwil`;
  };
  const setUploadStatus = (text) => {
    if (uploadStatus) uploadStatus.textContent = text;
  };
  const clearSavedPhotos = () => gallery?.querySelectorAll('[data-saved-photo="true"]').forEach((el) => el.remove());
  const updateAuthUI = (user) => loginButtons.forEach((b) => {
    b.textContent = user ? "Wyloguj" : "Zaloguj";
    b.dataset.authenticated = user ? "true" : "false";
  });
  const setAuthMessage = (text, ok = false) => {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.className = `auth-message${ok ? " ok" : ""}`;
  };

  function ensureAuthLinks() {
    if (!authForm || recoveryLink) return;
    recoveryLink = document.createElement("button");
    recoveryLink.type = "button";
    recoveryLink.className = "auth-switch";
    recoveryLink.textContent = "Nie pamiętasz hasła? Zresetuj je";
    recoveryLink.style.display = "block";
    recoveryLink.style.marginTop = "8px";
    recoveryLink.addEventListener("click", () => openAuth("recovery"));
    authForm.insertAdjacentElement("afterend", recoveryLink);

    resendLink = document.createElement("button");
    resendLink.type = "button";
    resendLink.className = "auth-switch";
    resendLink.textContent = "Nie dostałeś potwierdzenia e-mail? Wyślij ponownie";
    resendLink.style.display = "none";
    resendLink.style.marginTop = "8px";
    resendLink.addEventListener("click", resendConfirmation);
    recoveryLink.insertAdjacentElement("afterend", resendLink);
  }

  function openAuth(mode = "login") {
    ensureAuthLinks();
    authMode = mode;
    const login = mode === "login";
    const signup = mode === "signup";
    const recovery = mode === "recovery";
    authTitle.textContent = login ? "Witaj w Łap Chwilę" : recovery ? "Odzyskaj dostęp" : "Utwórz konto";
    authSubtitle.textContent = login
      ? "Zaloguj się, aby zachowywać swoje wspomnienia."
      : recovery
        ? "Podaj e-mail, a wyślemy Ci link do ustawienia nowego hasła."
        : "Załóż konto i zacznij zachowywać swoje chwile.";
    authSubmit.textContent = login ? "Zaloguj się" : recovery ? "Wyślij link" : "Utwórz konto";
    authSwitch.textContent = login ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się";
    authSwitch.style.display = "block";
    authPassword.style.display = recovery ? "none" : "block";
    authPassword.required = !recovery;
    authForm.querySelector('label[for="authPassword"]')?.style.setProperty("display", recovery ? "none" : "block");
    recoveryLink.style.display = login ? "block" : "none";
    resendLink.style.display = "none";
    setAuthMessage("");
    authForm?.reset();
    authModal?.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => authEmail?.focus(), 50);
  }

  function closeAuth() {
    authModal?.classList.remove("open");
    document.body.style.overflow = "";
    if (authPassword) authPassword.style.display = "block";
    authForm?.querySelector('label[for="authPassword"]')?.style.setProperty("display", "block");
    setAuthMessage("");
  }

  if (!supabase) {
    updateAuthUI(null);
    setAuthMessage("Nie udało się uruchomić logowania. Odśwież stronę i spróbuj ponownie.");
    return;
  }

  const viewer = document.createElement("div");
  viewer.className = "photo-viewer";
  viewer.innerHTML = '<button class="viewer-close" type="button" aria-label="Zamknij">×</button><img class="viewer-image" alt="Powiększone zdjęcie">';
  document.body.appendChild(viewer);
  const viewerImage = viewer.querySelector(".viewer-image");
  const closeViewer = () => {
    viewer.classList.remove("open");
    viewerImage.removeAttribute("src");
    document.body.style.overflow = "";
  };
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer || e.target.classList.contains("viewer-close")) closeViewer();
  });
  const openViewer = (url) => {
    viewerImage.src = url;
    viewer.classList.add("open");
    document.body.style.overflow = "hidden";
  };

  async function deletePhoto(photoId, imagePath, card) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !photoId || !imagePath) return;
    if (!confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return;
    const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId).eq("user_id", user.id);
    if (dbError) return alert("Nie udało się usunąć zdjęcia: " + dbError.message);
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([imagePath]);
    if (storageError) console.warn(storageError);
    card?.remove();
    setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0);
  }

  function addImageToGallery(url, id, imagePath) {
    if (!gallery || gallery.querySelector(`[data-photo-id="${CSS.escape(String(id))}"]`)) return;
    const card = document.createElement("article");
    card.className = "photo-card";
    card.dataset.savedPhoto = "true";
    card.dataset.photoId = id;
    const image = document.createElement("img");
    image.src = url;
    image.alt = "Moja chwila";
    image.loading = "lazy";
    image.addEventListener("error", () => card.remove());
    image.addEventListener("click", () => openViewer(url));
    const button = document.createElement("button");
    button.className = "delete-photo";
    button.type = "button";
    button.title = "Usuń zdjęcie";
    button.setAttribute("aria-label", "Usuń zdjęcie");
    button.textContent = "🗑";
    button.addEventListener("click", () => deletePhoto(id, imagePath, card));
    card.append(image, button);
    gallery.append(card);
  }

  async function loadSavedPhotos() {
    if (loadingPhotos) return;
    loadingPhotos = true;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        clearSavedPhotos();
        setCount(0);
        return;
      }
      const { data, error } = await supabase.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) {
        console.error("photos select:", error);
        setUploadStatus("Nie udało się wczytać zapisanych chwil.");
        return;
      }
      clearSavedPhotos();
      const seenPaths = new Set();
      data.forEach((photo) => {
        if (seenPaths.has(photo.image_path)) return;
        seenPaths.add(photo.image_path);
        const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(photo.image_path);
        addImageToGallery(publicData.publicUrl, photo.id, photo.image_path);
      });
      setCount(seenPaths.size);
    } finally {
      loadingPhotos = false;
    }
  }

  async function sha256(file) {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function uploadOne(file, user) {
    if (!file.type.startsWith("image/")) throw new Error("To nie jest zdjęcie.");
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: maks. 10 MB.`);
    const hash = await sha256(file);
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const filePath = `${user.id}/${hash}.${extension}`;
    const { data: existing, error: existingError } = await supabase.from("photos").select("id").eq("user_id", user.id).eq("image_path", filePath).limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return false;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploadError) {
      if (String(uploadError.message || "").toLowerCase().includes("already exists")) return false;
      throw uploadError;
    }
    const { error: dbError } = await supabase.from("photos").insert({ user_id: user.id, image_path: filePath, caption: "" });
    if (dbError) {
      await supabase.storage.from(BUCKET).remove([filePath]);
      if (String(dbError.message || "").toLowerCase().includes("duplicate") || String(dbError.code || "").startsWith("23")) return false;
      throw dbError;
    }
    return true;
  }

  async function uploadPhotos(files) {
    if (uploading) return;
    uploading = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        openAuth("login");
        return;
      }
      const selected = Array.from(files || []);
      const valid = selected.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
      if (!valid.length) {
        alert("Wybierz zdjęcia do 10 MB każde.");
        return;
      }
      setUploadStatus(`Przesyłanie 0/${valid.length} zdjęć…`);
      let done = 0, skipped = 0, failed = 0;
      const batchHashes = new Set();
      for (const file of valid) {
        try {
          const hash = await sha256(file);
          if (batchHashes.has(hash)) {
            skipped++;
            continue;
          }
          batchHashes.add(hash);
          const added = await uploadOne(file, user);
          if (added) done++; else skipped++;
          setUploadStatus(`Przesyłanie ${done + skipped}/${valid.length} zdjęć…`);
        } catch (error) {
          failed++;
          console.error(error);
        }
      }
      await loadSavedPhotos();
      if (failed) setUploadStatus(`Dodano ${done}. Pominięto ${skipped}. Błędy: ${failed}.`);
      else if (skipped) setUploadStatus(`Gotowe — dodano ${done}, pominięto ${skipped} duplikat${skipped === 1 ? "" : "y"}.`);
      else setUploadStatus(`Gotowe — dodano ${done} ${done === 1 ? "zdjęcie" : "zdjęć"}.`);
    } finally {
      uploading = false;
    }
  }

  async function resendConfirmation() {
    const email = authEmail?.value.trim();
    if (!email) return setAuthMessage("Najpierw wpisz swój e-mail.");
    resendLink.disabled = true;
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      setAuthMessage("Wysłaliśmy ponownie wiadomość potwierdzającą. Sprawdź skrzynkę i spam.", true);
      resendLink.style.display = "none";
    } catch (error) {
      console.error("Resend confirmation:", error);
      setAuthMessage(String(error?.message || "Nie udało się wysłać wiadomości."));
    } finally {
      resendLink.disabled = false;
    }
  }

  async function sendRecovery() {
    const email = authEmail?.value.trim();
    if (!email) return setAuthMessage("Podaj adres e-mail.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw error;
    setAuthMessage("Link do ustawienia nowego hasła został wysłany. Sprawdź e-mail i spam.", true);
  }

  addButtons.forEach((button) => button.addEventListener("click", async (e) => {
    e.preventDefault();
    if (uploading) return;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return openAuth("login");
    if (!user) return openAuth("login");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => { if (input.files?.length) uploadPhotos(input.files); };
    input.click();
  }));

  loginButtons.forEach((button) => button.addEventListener("click", async (e) => {
    e.preventDefault();
    const authenticated = button.dataset.authenticated === "true";
    if (authenticated) {
      await supabase.auth.signOut();
      return;
    }
    openAuth("login");
  }));

  authClose?.addEventListener("click", closeAuth);
  authModal?.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); });
  authSwitch?.addEventListener("click", () => openAuth(authMode === "login" ? "signup" : "login"));

  authForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email) return setAuthMessage("Podaj e-mail.");
    if (authMode !== "recovery" && !password) return setAuthMessage("Podaj hasło.");
    authSubmit.disabled = true;
    setAuthMessage(authMode === "recovery" ? "Wysyłanie…" : authMode === "login" ? "Logowanie…" : "Tworzenie konta…", true);
    try {
      if (authMode === "recovery") {
        await sendRecovery();
      } else if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session || !data?.user) throw new Error("Logowanie nie utworzyło sesji. Spróbuj ponownie.");
        closeAuth();
        updateAuthUI(data.user);
        await loadSavedPhotos();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) {
          closeAuth();
          updateAuthUI(data.user);
          await loadSavedPhotos();
        } else {
          setAuthMessage("Konto utworzone. Sprawdź e-mail, aby potwierdzić adres.", true);
          resendLink.style.display = "block";
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      const message = String(err?.message || "Wystąpił błąd logowania.");
      const lower = message.toLowerCase();
      if (lower.includes("email not confirmed")) {
        setAuthMessage("Ten adres e-mail nie został jeszcze potwierdzony. Sprawdź skrzynkę lub wyślij wiadomość ponownie.");
        resendLink.style.display = "block";
      } else if (lower.includes("invalid login credentials")) {
        setAuthMessage("Nieprawidłowy e-mail lub hasło. Jeśli nie pamiętasz hasła, użyj opcji „Zresetuj je”.");
      } else if (lower.includes("too many requests") || lower.includes("rate limit")) {
        setAuthMessage("Za dużo prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie.");
      } else if (lower.includes("invalid api key")) {
        setAuthMessage("Błąd połączenia z usługą logowania. Odśwież stronę i spróbuj ponownie.");
      } else {
        setAuthMessage(message);
      }
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = authMode === "login" ? "Zaloguj się" : authMode === "recovery" ? "Wyślij link" : "Utwórz konto";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeViewer();
      closeAuth();
    }
  });

  ensureAuthLinks();
  (async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Session error:", error);
      updateAuthUI(null);
      return;
    }
    updateAuthUI(session?.user ?? null);
    if (session?.user) await loadSavedPhotos();
  })();

  supabase.auth.onAuthStateChange((event, session) => {
    console.info("Supabase auth event:", event, Boolean(session));
    updateAuthUI(session?.user ?? null);
    if (session?.user) setTimeout(loadSavedPhotos, 0);
    else {
      clearSavedPhotos();
      setCount(0);
    }
  });
});