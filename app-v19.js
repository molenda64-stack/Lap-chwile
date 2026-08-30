(() => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";
  const SIGNED_URL_TTL = 3600;
  let heicReady = null;

  const loadHeic = () => {
    if (window.heic2any) return Promise.resolve(window.heic2any);
    if (heicReady) return heicReady;
    heicReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload = () => window.heic2any ? resolve(window.heic2any) : reject(new Error("HEIC converter unavailable"));
      s.onerror = () => reject(new Error("Nie można załadować konwertera HEIC/HEIF."));
      document.head.appendChild(s);
    });
    return heicReady;
  };

  const isHeif = value => /\.(heic|heif)$/i.test(value?.name || value || "") || /image\/(heic|heif)/i.test(value?.type || "");
  const mimeExtension = type => ({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/bmp":"bmp","image/avif":"avif"}[type] || "");
  const safeExtension = file => mimeExtension(file.type) || ((file.name || "").match(/\.([a-z0-9]+)$/i)?.[1] || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

  async function boot() {
    if (!window.supabase?.createClient) { setTimeout(boot, 50); return; }
    window.__lapChwileBooted = true;
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage, storageKey: "lap-chwile-auth-v10" } });
    const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
    const loginButtons = $$('button.login,button[class*="login"]'), addButtons = $$('button.add,button[class*="add"]');
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

    const openAuth = m => { mode = m; const login = m === "login"; title.textContent = login ? "Witaj w Łap Chwilę" : "Utwórz konto"; subtitle.textContent = login ? "Zaloguj się, aby zachowywać swoje wspomnienia." : "Załóż konto i zacznij zachowywać swoje chwile."; submit.textContent = login ? "Zaloguj się" : "Utwórz konto"; switcher.textContent = login ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"; password.style.display = "block"; password.required = true; form.querySelector('label[for="authPassword"]')?.style.setProperty("display", "block"); setMessage(""); form.reset(); modal.classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => email?.focus(), 50); };
    const closeAuth = () => { modal.classList.remove("open"); document.body.style.overflow = ""; setMessage(""); };

    const viewer = document.createElement("div"); viewer.className = "photo-viewer"; viewer.innerHTML = '<button class="viewer-close" type="button">×</button><img class="viewer-image" alt="Powiększone zdjęcie">'; document.body.append(viewer);
    const viewerImage = viewer.querySelector(".viewer-image");
    viewer.addEventListener("click", e => { if (e.target === viewer || e.target.classList.contains("viewer-close")) { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; } });

    async function getViewUrl(path) {
      const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
      if (error || !data?.signedUrl) throw error || new Error("Nie udało się uzyskać bezpiecznego adresu zdjęcia.");
      return data.signedUrl;
    }

    async function toJpeg(fileOrBlob) {
      if (!isHeif(fileOrBlob)) return fileOrBlob;
      const convert = await loadHeic();
      const out = await convert({ blob: fileOrBlob, toType: "image/jpeg", quality: 0.88 });
      const blob = Array.isArray(out) ? out[0] : out;
      if (!blob) throw new Error("Nie udało się przekonwertować zdjęcia HEIF.");
      return blob;
    }

    async function deletePhoto(id, path, card) {
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user || !confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return;
      const { error } = await client.from("photos").delete().eq("id", id).eq("user_id", user.id);
      if (error) return setStatus(`Nie udało się usunąć zdjęcia: ${error.message}`);
      const storageDelete = await client.storage.from(BUCKET).remove([path]);
      if (storageDelete.error) setStatus(`Zdjęcie usunięte z galerii, ale nie udało się usunąć pliku ze Storage: ${storageDelete.error.message}`);
      card?.remove(); setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0);
    }

    function addCard(url, id, path, photo = {}) {
      if (!gallery || gallery.querySelector(`[data-photo-id="${CSS.escape(String(id))}"]`)) return;
      const card = document.createElement("article"); card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = id;
      const img = document.createElement("img"); img.src = url; img.alt = "Moja chwila"; img.loading = "lazy"; img.onerror = () => card.remove(); img.onclick = () => { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; };
      const del = document.createElement("button"); del.className = "delete-photo"; del.type = "button"; del.title = "Usuń zdjęcie"; del.textContent = "🗑"; del.onclick = () => deletePhoto(id, path, card);
      const fav = document.createElement("button"); fav.className = "favorite-photo"; fav.type = "button"; fav.title = photo.is_favorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"; fav.textContent = photo.is_favorite ? "♥" : "♡"; fav.onclick = async () => { const { data:{ user } } = await client.auth.getUser(); if (!user) return; const next = !photo.is_favorite; const { error } = await client.from("photos").update({ is_favorite: next }).eq("id", id).eq("user_id", user.id); if (!error) { photo.is_favorite = next; fav.textContent = next ? "♥" : "♡"; fav.title = next ? "Usuń z ulubionych" : "Dodaj do ulubionych"; } }; const date = document.createElement("div"); date.className = "photo-memory-date"; date.textContent = photo.memory_date || (photo.created_at ? new Date(photo.created_at).toLocaleDateString("pl-PL") : ""); const meta = document.createElement("button"); meta.className = "photo-edit-meta"; meta.type = "button"; meta.title = "Edytuj wspomnienie"; meta.textContent = "✎"; meta.onclick = async () => { const caption = prompt("Opis wspomnienia:", photo.caption || ""); if (caption === null) return; const current = photo.memory_date || ""; const memoryDate = prompt("Data wspomnienia (RRRR-MM-DD):", current); if (memoryDate === null) return; const { data:{ user } } = await client.auth.getUser(); if (!user) return; const payload = { caption: caption.trim(), memory_date: memoryDate.trim() || null }; const { error } = await client.from("photos").update(payload).eq("id", id).eq("user_id", user.id); if (error) return setStatus(`Nie udało się zapisać: ${error.message}`); photo.caption = payload.caption; photo.memory_date = payload.memory_date; img.alt = photo.caption || "Moja chwila"; date.textContent = photo.memory_date || (photo.created_at ? new Date(photo.created_at).toLocaleDateString("pl-PL") : ""); const captionEl = card.querySelector(".photo-caption"); if (captionEl) captionEl.textContent = photo.caption; else if (photo.caption) { const el = document.createElement("div"); el.className = "photo-caption"; el.textContent = photo.caption; card.insertBefore(el, date); } }; if (photo.caption) { const captionEl = document.createElement("div"); captionEl.className = "photo-caption"; captionEl.textContent = photo.caption; card.append(img, fav, meta, del, captionEl, date); } else card.append(img, fav, meta, del, date); gallery.append(card);
    }

    async function addHeifCard(photo) {
      const signedUrl = await getViewUrl(photo.image_path);
      const response = await fetch(signedUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Storage HTTP ${response.status}`);
      const jpeg = await toJpeg(await response.blob());
      const url = URL.createObjectURL(jpeg); addCard(url, photo.id, photo.image_path, photo);
    }

    async function loadPhotos() {
      if (loading) return; loading = true;
      try {
        const { data: { user }, error: userError } = await client.auth.getUser(); if (userError) throw userError;
        if (!user) { clearGallery(); setCount(0); return; }
        const { data, error } = await client.from("photos").select("id,image_path,caption,created_at,is_favorite,memory_date").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) throw error;
        clearGallery(); let visible = 0;
        for (const photo of data || []) {
          if (!photo.image_path) continue;
          try { if (isHeif(photo.image_path)) { setStatus("Przygotowywanie zdjęć HEIF…"); await addHeifCard(photo); } else { const signedUrl = await getViewUrl(photo.image_path); addCard(signedUrl, photo.id, photo.image_path, photo); } visible++; }
          catch (e) { console.error("display photo", photo.image_path, e); }
        }
        setCount(visible); setStatus("");
      } catch (e) { console.error("loadPhotos", e); setStatus(`Nie udało się wczytać zdjęć: ${e.message || e}`); }
      finally { loading = false; }
    }

    async function hashFile(file) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join(""); }

    async function uploadOne(original, user) {
      if (!original.type.startsWith("image/") && !isHeif(original)) throw new Error("Wybrany plik nie jest zdjęciem.");
      if (original.size > 20 * 1024 * 1024) throw new Error(`${original.name}: maks. 20 MB przed konwersją.`);
      const file = isHeif(original) ? new File([await toJpeg(original)], `${(original.name || "zdjecie").replace(/\.(heic|heif)$/i, "")}.jpg`, { type: "image/jpeg" }) : original;
      if (file.size > 10 * 1024 * 1024) throw new Error(`${original.name}: po konwersji zdjęcie przekracza 10 MB.`);
      const hash = await hashFile(file);
      const extension = isHeif(original) ? "jpg" : safeExtension(file);
      const path = `${user.id}/${hash}.${extension}`;
      const existing = await client.from("photos").select("id").eq("user_id", user.id).eq("image_path", path).limit(1);
      if (existing.error) throw existing.error;
      if (existing.data?.length) return false;
      const up = await client.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: "3600", contentType: file.type || "application/octet-stream" });
      if (up.error && !/already exists|duplicate/i.test(up.error.message || "")) throw up.error;
      const db = await client.from("photos").upsert({ user_id: user.id, image_path: path, caption: "" }, { onConflict: "user_id,image_path", ignoreDuplicates: true });
      if (db.error) throw db.error;
      return !up.error;
    }

    async function uploadFiles(files) {
      if (busy) return; busy = true;
      try {
        const { data: { user }, error } = await client.auth.getUser(); if (error || !user) { openAuth("login"); return; }
        const selected = [...files].filter(f => (f.type.startsWith("image/") || isHeif(f)) && f.size <= 20 * 1024 * 1024); if (!selected.length) { setStatus("Wybierz zdjęcia do 20 MB każde."); return; }
        const hashes = new Set(); let added = 0, skipped = 0, failed = 0;
        for (let i = 0; i < selected.length; i++) { try { const rawHash = await hashFile(selected[i]); if (hashes.has(rawHash)) { skipped++; continue; } hashes.add(rawHash); setStatus(isHeif(selected[i]) ? `Konwersja ${i + 1}/${selected.length}…` : `Przesyłanie ${i + 1}/${selected.length}…`); if (await uploadOne(selected[i], user)) added++; else skipped++; } catch (e) { failed++; console.error("upload", e); setStatus(`Błąd przy ${selected[i].name}: ${e.message || e}`); } }
        await loadPhotos(); setStatus(failed ? `Dodano ${added}, pominięto ${skipped}, błędy: ${failed}.` : `Gotowe — dodano ${added}, pominięto ${skipped} duplikat${skipped === 1 ? "" : "ów"}.`);
      } finally { busy = false; }
    }

    addButtons.forEach(b => b.addEventListener("click", async e => { e.preventDefault(); e.stopImmediatePropagation(); const { data: { user } } = await client.auth.getUser(); if (!user) return openAuth("login"); const input = document.createElement("input"); input.type = "file"; input.accept = "image/*,.heic,.heif"; input.multiple = true; input.onchange = () => input.files?.length && uploadFiles(input.files); input.click(); }, true));
    loginButtons.forEach(b => b.addEventListener("click", async e => { e.preventDefault(); e.stopImmediatePropagation(); const { data: { session }, error } = await client.auth.getSession(); if (error) return openAuth("login"); if (session) await client.auth.signOut(); else openAuth("login"); }, true));
    close?.addEventListener("click", closeAuth); modal?.addEventListener("click", e => { if (e.target === modal) closeAuth(); }); switcher?.addEventListener("click", () => openAuth(mode === "login" ? "signup" : "login"));
    form?.addEventListener("submit", async e => { e.preventDefault(); e.stopImmediatePropagation(); submit.disabled = true; setMessage(""); try { const em = email.value.trim(), pw = password.value; if (mode === "login") { const { data, error } = await client.auth.signInWithPassword({ email: em, password: pw }); if (error) throw error; if (!data.session) throw new Error("Logowanie nie utworzyło sesji."); closeAuth(); updateUI(data.session.user); await loadPhotos(); } else { const { data, error } = await client.auth.signUp({ email: em, password: pw }); if (error) throw error; if (data.session) { closeAuth(); updateUI(data.session.user); await loadPhotos(); } else setMessage("Konto utworzone. Sprawdź e-mail, aby potwierdzić adres.", true); } } catch (e) { console.error("auth", e); setMessage(e.message || "Wystąpił błąd logowania."); } finally { submit.disabled = false; } }, true);
    document.addEventListener("keydown", e => { if (e.key === "Escape") { viewer.classList.remove("open"); closeAuth(); } });
    try { const { data: { session }, error } = await client.auth.getSession(); if (error) throw error; updateUI(session?.user || null); if (session?.user) await loadPhotos(); } catch (e) { console.error("session", e); updateUI(null); setStatus(`Błąd sesji: ${e.message || e}`); }
    client.auth.onAuthStateChange((event, session) => { updateUI(session?.user || null); if (session?.user) setTimeout(loadPhotos, 0); else { clearGallery(); setCount(0); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
