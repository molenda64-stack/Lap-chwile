(() => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";

  async function boot() {
    if (!window.supabase?.createClient) { setTimeout(boot, 50); return; }
    window.__lapChwileBooted = true;
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage, storageKey: "lap-chwile-auth-v10" }
    });
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];
    const loginButtons = $$('button.login,button[class*="login"]');
    const addButtons = $$('button.add,button[class*="add"]');
    const gallery = $(".gallery"), count = $("#photoCount"), status = $("#uploadStatus");
    const modal = $("#authModal"), form = $("#authForm"), email = $("#authEmail"), password = $("#authPassword");
    const submit = $("#authSubmit"), switcher = $("#authSwitch"), close = $("#authClose");
    const title = $("#authTitle"), subtitle = $("#authSubtitle"), message = $("#authMessage");
    let mode = "login", busy = false, loading = false;
    const setStatus = t => { if (status) status.textContent = t || ""; };
    const setMessage = (t, ok = false) => { if (message) { message.textContent = t || ""; message.className = `auth-message${ok ? " ok" : ""}`; } };
    const setCount = n => { if (count) count.textContent = n === 1 ? "1 zapisana chwila" : `${n} zapisanych chwil`; };
    const updateUI = user => loginButtons.forEach(b => b.textContent = user ? "Wyloguj" : "Zaloguj");
    const clearGallery = () => gallery?.querySelectorAll('[data-saved-photo="true"]').forEach(e => e.remove());

    const openAuth = m => {
      mode = m; const login = m === "login";
      title.textContent = login ? "Witaj w Łap Chwilę" : "Utwórz konto";
      subtitle.textContent = login ? "Zaloguj się, aby zachowywać swoje wspomnienia." : "Załóż konto i zacznij zachowywać swoje chwile.";
      submit.textContent = login ? "Zaloguj się" : "Utwórz konto";
      switcher.textContent = login ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się";
      password.style.display = "block"; password.required = true;
      form.querySelector('label[for="authPassword"]')?.style.setProperty("display", "block");
      setMessage(""); form.reset(); modal.classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => email?.focus(), 50);
    };
    const closeAuth = () => { modal.classList.remove("open"); document.body.style.overflow = ""; setMessage(""); };

    const viewer = document.createElement("div");
    viewer.className = "photo-viewer";
    viewer.innerHTML = '<button class="viewer-close" type="button">×</button><img class="viewer-image" alt="Powiększone zdjęcie">';
    document.body.append(viewer);
    const viewerImage = viewer.querySelector(".viewer-image");
    viewer.addEventListener("click", e => { if (e.target === viewer || e.target.classList.contains("viewer-close")) { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; } });

    async function deletePhoto(id, path, card) {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user || !confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return;
      const { error } = await client.from("photos").delete().eq("id", id).eq("user_id", user.id);
      if (error) return setStatus(`Nie udało się usunąć zdjęcia: ${error.message}`);
      await client.storage.from(BUCKET).remove([path]);
      card?.remove(); setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0);
    }

    function addCard(url, id, path) {
      if (!gallery || gallery.querySelector(`[data-photo-id="${CSS.escape(String(id))}"]`)) return;
      const card = document.createElement("article"); card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = id;
      const img = document.createElement("img"); img.src = url; img.alt = "Moja chwila"; img.loading = "lazy";
      img.onerror = () => card.remove();
      img.onclick = () => { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; };
      const del = document.createElement("button"); del.className = "delete-photo"; del.type = "button"; del.title = "Usuń zdjęcie"; del.textContent = "🗑"; del.onclick = () => deletePhoto(id, path, card);
      card.append(img, del); gallery.append(card);
    }

    async function loadPhotos() {
      if (loading) return; loading = true;
      try {
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (!user) { clearGallery(); setCount(0); return; }
        const { data, error } = await client.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        clearGallery(); const seen = new Set();
        for (const photo of data || []) {
          if (!photo.image_path || seen.has(photo.image_path)) continue;
          seen.add(photo.image_path);
          const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(photo.image_path);
          addCard(publicData.publicUrl, photo.id, photo.image_path);
        }
        setCount(seen.size); setStatus("");
      } catch (e) { console.error("loadPhotos", e); setStatus(`Nie udało się wczytać zdjęć: ${e.message || e}`); }
      finally { loading = false; }
    }

    async function hashFile(file) {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    }

    async function uploadOne(file, user) {
      if (!file.type.startsWith("image/")) throw new Error("Wybrany plik nie jest zdjęciem.");
      if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: maksymalny rozmiar to 10 MB.`);
      const hash = await hashFile(file);
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/${hash}.${ext}`;

      const { error: storageError } = await client.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type });
      if (storageError && !/already exists|duplicate/i.test(storageError.message || "")) throw storageError;

      // Idempotent insert: an existing (user_id,image_path) is treated as a duplicate, not as a fatal error.
      const { error: dbError } = await client.from("photos").upsert(
        { user_id: user.id, image_path: path, caption: "" },
        { onConflict: "user_id,image_path", ignoreDuplicates: true }
      );
      if (dbError) throw dbError;
      return !storageError;
    }

    async function uploadFiles(files) {
      if (busy) return; busy = true;
      try {
        const { data: { user }, error } = await client.auth.getUser();
        if (error || !user) { openAuth("login"); return; }
        const selected = [...files].filter(f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
        if (!selected.length) { setStatus("Wybierz zdjęcia do 10 MB każde."); return; }
        const hashes = new Set(); let added = 0, skipped = 0;
        for (let i = 0; i < selected.length; i++) {
          const hash = await hashFile(selected[i]);
          if (hashes.has(hash)) { skipped++; continue; }
          hashes.add(hash);
          try { if (await uploadOne(selected[i], user)) added++; else skipped++; }
          catch (e) { console.error("upload", e); setStatus(`Błąd przy ${selected[i].name}: ${e.message || e}`); }
          setStatus(`Przesyłanie ${i + 1}/${selected.length}…`);
        }
        await loadPhotos();
        setStatus(`Gotowe — dodano ${added}, pominięto ${skipped} duplikat${skipped === 1 ? "" : "ów"}.`);
      } finally { busy = false; }
    }

    addButtons.forEach(b => b.addEventListener("click", async e => {
      e.preventDefault();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return openAuth("login");
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.multiple = true;
      input.onchange = () => input.files?.length && uploadFiles(input.files); input.click();
    }));

    loginButtons.forEach(b => b.addEventListener("click", async e => {
      e.preventDefault();
      const { data: { session }, error } = await client.auth.getSession();
      if (error) { openAuth("login"); return; }
      if (session) await client.auth.signOut(); else openAuth("login");
    }));
    close?.addEventListener("click", closeAuth);
    modal?.addEventListener("click", e => { if (e.target === modal) closeAuth(); });
    switcher?.addEventListener("click", () => openAuth(mode === "login" ? "signup" : "login"));
    form?.addEventListener("submit", async e => {
      e.preventDefault(); submit.disabled = true; setMessage("");
      try {
        const em = email.value.trim(), pw = password.value;
        if (mode === "login") {
          const { data, error } = await client.auth.signInWithPassword({ email: em, password: pw });
          if (error) throw error; if (!data.session) throw new Error("Logowanie nie utworzyło sesji.");
          closeAuth(); updateUI(data.session.user); await loadPhotos();
        } else {
          const { data, error } = await client.auth.signUp({ email: em, password: pw });
          if (error) throw error;
          if (data.session) { closeAuth(); updateUI(data.session.user); await loadPhotos(); }
          else setMessage("Konto utworzone. Sprawdź e-mail, aby potwierdzić adres.", true);
        }
      } catch (e) { console.error("auth", e); setMessage(e.message || "Wystąpił błąd logowania."); }
      finally { submit.disabled = false; }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { viewer.classList.remove("open"); closeAuth(); } });

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error) throw error; updateUI(session?.user || null); if (session?.user) await loadPhotos();
    } catch (e) { console.error("session", e); updateUI(null); setStatus(`Błąd sesji: ${e.message || e}`); }
    client.auth.onAuthStateChange((event, session) => { updateUI(session?.user || null); if (session?.user) setTimeout(loadPhotos, 0); else { clearGallery(); setCount(0); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
