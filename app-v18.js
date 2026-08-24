(() => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";

  const boot = async () => {
    if (!window.supabase?.createClient) {
      showError("Nie udało się uruchomić biblioteki logowania. Odśwież stronę.");
      return;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: "lap-chwile-auth-v8"
      }
    });

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => [...document.querySelectorAll(s)];
    const loginButtons = $$('button.login, button[class*="login"]');
    const addButtons = $$('button.add, button[class*="add"]');
    const gallery = $(".gallery");
    const count = $("#photoCount");
    const status = $("#uploadStatus");
    const modal = $("#authModal");
    const form = $("#authForm");
    const email = $("#authEmail");
    const password = $("#authPassword");
    const submit = $("#authSubmit");
    const switcher = $("#authSwitch");
    const close = $("#authClose");
    const title = $("#authTitle");
    const subtitle = $("#authSubtitle");
    const message = $("#authMessage");
    let mode = "login";
    let busy = false;
    let loading = false;

    const setMessage = (text, ok = false) => {
      if (message) {
        message.textContent = text;
        message.className = `auth-message${ok ? " ok" : ""}`;
      }
    };
    const setStatus = (text) => { if (status) status.textContent = text; };
    const setCount = (n) => { if (count) count.textContent = n === 1 ? "1 zapisana chwila" : `${n} zapisanych chwil`; };
    const clearGallery = () => gallery?.querySelectorAll('[data-saved-photo="true"]').forEach((e) => e.remove());
    const updateUI = (user) => loginButtons.forEach((b) => { b.textContent = user ? "Wyloguj" : "Zaloguj"; });
    const showError = (text) => console.error(text);

    const openAuth = (nextMode = "login") => {
      mode = nextMode;
      const recovery = mode === "recovery";
      const login = mode === "login";
      title.textContent = login ? "Witaj w Łap Chwilę" : recovery ? "Odzyskaj dostęp" : "Utwórz konto";
      subtitle.textContent = login ? "Zaloguj się, aby zachowywać swoje wspomnienia." : recovery ? "Podaj e-mail, aby otrzymać link do zmiany hasła." : "Załóż konto i zacznij zachowywać swoje chwile.";
      submit.textContent = login ? "Zaloguj się" : recovery ? "Wyślij link" : "Utwórz konto";
      switcher.textContent = login ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się";
      password.style.display = recovery ? "none" : "block";
      password.required = !recovery;
      form.querySelector('label[for="authPassword"]')?.style.setProperty("display", recovery ? "none" : "block");
      setMessage("");
      form.reset();
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(() => email?.focus(), 50);
    };
    const closeAuth = () => {
      modal.classList.remove("open");
      document.body.style.overflow = "";
      password.style.display = "block";
      password.required = true;
      form.querySelector('label[for="authPassword"]')?.style.setProperty("display", "block");
      setMessage("");
    };

    const viewer = document.createElement("div");
    viewer.className = "photo-viewer";
    viewer.innerHTML = '<button class="viewer-close" type="button">×</button><img class="viewer-image" alt="Powiększone zdjęcie">';
    document.body.append(viewer);
    const viewerImage = viewer.querySelector(".viewer-image");
    const closeViewer = () => { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; };
    viewer.onclick = (e) => { if (e.target === viewer || e.target.classList.contains("viewer-close")) closeViewer(); };

    const deletePhoto = async (id, path, card) => {
      const { data: { user } } = await client.auth.getUser();
      if (!user || !confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return;
      const { error } = await client.from("photos").delete().eq("id", id).eq("user_id", user.id);
      if (error) { setStatus(`Nie udało się usunąć zdjęcia: ${error.message}`); return; }
      await client.storage.from(BUCKET).remove([path]);
      card?.remove();
      setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0);
    };

    const addCard = (url, id, path) => {
      if (!gallery || gallery.querySelector(`[data-photo-id="${CSS.escape(String(id))}"]`)) return;
      const card = document.createElement("article");
      card.className = "photo-card";
      card.dataset.savedPhoto = "true";
      card.dataset.photoId = id;
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Moja chwila";
      img.loading = "lazy";
      img.onerror = () => card.remove();
      img.onclick = () => { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; };
      const del = document.createElement("button");
      del.className = "delete-photo";
      del.type = "button";
      del.title = "Usuń zdjęcie";
      del.textContent = "🗑";
      del.onclick = () => deletePhoto(id, path, card);
      card.append(img, del);
      gallery.append(card);
    };

    const loadPhotos = async () => {
      if (loading) return;
      loading = true;
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) { clearGallery(); setCount(0); return; }
        const { data, error } = await client.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) { setStatus(`Nie udało się wczytać zdjęć: ${error.message}`); return; }
        clearGallery();
        const paths = new Set();
        for (const photo of data || []) {
          if (!photo.image_path || paths.has(photo.image_path)) continue;
          paths.add(photo.image_path);
          const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(photo.image_path);
          addCard(publicData.publicUrl, photo.id, photo.image_path);
        }
        setCount(paths.size);
      } finally { loading = false; }
    };

    const hashFile = async (file) => {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };

    const uploadOne = async (file, user) => {
      if (!file.type.startsWith("image/")) throw new Error("Wybrany plik nie jest zdjęciem.");
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: maksymalny rozmiar to 10 MB.`);
      const hash = await hashFile(file);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${hash}.${ext}`;
      const { data: existing } = await client.from("photos").select("id").eq("user_id", user.id).eq("image_path", path).limit(1);
      if (existing?.length) return false;
      const { error: storageError } = await client.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
      if (storageError) {
        if (/already exists|duplicate/i.test(storageError.message || "")) return false;
        throw storageError;
      }
      const { error: dbError } = await client.from("photos").insert({ user_id: user.id, image_path: path, caption: "" });
      if (dbError) { await client.storage.from(BUCKET).remove([path]); throw dbError; }
      return true;
    };

    const uploadFiles = async (files) => {
      if (busy) return;
      busy = true;
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) { openAuth("login"); return; }
        const selected = [...files].filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
        if (!selected.length) { setStatus("Wybierz zdjęcia do 10 MB każde."); return; }
        const hashes = new Set(); let added = 0; let skipped = 0;
        for (let i = 0; i < selected.length; i++) {
          const hash = await hashFile(selected[i]);
          if (hashes.has(hash)) { skipped++; continue; }
          hashes.add(hash);
          try { if (await uploadOne(selected[i], user)) added++; else skipped++; }
          catch (e) { console.error(e); setStatus(`Błąd przy ${selected[i].name}: ${e.message}`); }
          setStatus(`Przesyłanie ${i + 1}/${selected.length}…`);
        }
        await loadPhotos();
        setStatus(`Gotowe — dodano ${added}, pominięto ${skipped} duplikatów.`);
      } finally { busy = false; }
    };

    addButtons.forEach((button) => button.addEventListener("click", async (e) => {
      e.preventDefault();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return openAuth("login");
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*"; input.multiple = true;
      input.onchange = () => input.files?.length && uploadFiles(input.files);
      input.click();
    }));

    loginButtons.forEach((button) => button.addEventListener("click", async (e) => {
      e.preventDefault();
      const { data: { session } } = await client.auth.getSession();
      if (session) { await client.auth.signOut(); } else openAuth("login");
    }));

    close.onclick = closeAuth;
    modal.onclick = (e) => { if (e.target === modal) closeAuth(); };
    switcher.onclick = () => openAuth(mode === "login" ? "signup" : "login");

    form.onsubmit = async (e) => {
      e.preventDefault();
      const mail = email.value.trim();
      const pass = password.value;
      if (!mail) return setMessage("Podaj e-mail.");
      if (mode !== "recovery" && !pass) return setMessage("Podaj hasło.");
      submit.disabled = true;
      setMessage(mode === "login" ? "Logowanie…" : "Przetwarzanie…", true);
      try {
        if (mode === "login") {
          const { data, error } = await client.auth.signInWithPassword({ email: mail, password: pass });
          if (error) throw error;
          if (!data.session) throw new Error("Supabase nie zwrócił sesji.");
          closeAuth();
          updateUI(data.user);
          await loadPhotos();
        } else if (mode === "signup") {
          const { data, error } = await client.auth.signUp({ email: mail, password: pass, options: { emailRedirectTo: window.location.origin } });
          if (error) throw error;
          if (data.session) { closeAuth(); updateUI(data.user); await loadPhotos(); }
          else setMessage("Konto utworzone. Potwierdź adres e-mail.", true);
        } else {
          const { error } = await client.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin });
          if (error) throw error;
          setMessage("Link do zmiany hasła został wysłany.", true);
        }
      } catch (error) {
        console.error("Supabase Auth:", error);
        const m = String(error?.message || "Nie udało się zalogować.");
        setMessage(m);
      } finally {
        submit.disabled = false;
      }
    };

    client.auth.onAuthStateChange((event, session) => {
      console.info("Auth state:", event, !!session);
      updateUI(session?.user || null);
      if (session?.user) setTimeout(loadPhotos, 0); else { clearGallery(); setCount(0); }
    });

    const { data: { session }, error } = await client.auth.getSession();
    if (error) console.error("getSession:", error);
    updateUI(session?.user || null);
    if (session?.user) await loadPhotos();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();