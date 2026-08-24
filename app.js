document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3_r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";
  if (!window.supabase?.createClient) return;
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const loginButtons = document.querySelectorAll('button.login, button[class*="login"]');
  const addButtons = document.querySelectorAll('button.add, button[class*="add"]');
  const gallery = document.querySelector(".gallery"), photoCount = document.querySelector("#photoCount"), uploadStatus = document.querySelector("#uploadStatus");
  const authModal = document.querySelector("#authModal"), authForm = document.querySelector("#authForm"), authEmail = document.querySelector("#authEmail"), authPassword = document.querySelector("#authPassword"), authSubmit = document.querySelector("#authSubmit"), authSwitch = document.querySelector("#authSwitch"), authClose = document.querySelector("#authClose"), authTitle = document.querySelector("#authTitle"), authSubtitle = document.querySelector("#authSubtitle"), authMessage = document.querySelector("#authMessage");
  let authMode = "login", loadingPhotos = false, uploading = false;
  const setCount = (n) => { if (photoCount) photoCount.textContent = n === 1 ? "1 zapisana chwila" : `${n} zapisanych chwil`; };
  const setUploadStatus = (text) => { if (uploadStatus) uploadStatus.textContent = text; };
  const clearSavedPhotos = () => gallery?.querySelectorAll('[data-saved-photo="true"]').forEach((el) => el.remove());
  const updateAuthUI = (user) => loginButtons.forEach((b) => { b.textContent = user ? "Wyloguj" : "Zaloguj"; b.dataset.authenticated = user ? "true" : "false"; });
  const setAuthMessage = (text, ok = false) => { if (authMessage) { authMessage.textContent = text; authMessage.className = `auth-message${ok ? " ok" : ""}`; } };
  function openAuth(mode = "login") { authMode = mode; authTitle.textContent = mode === "login" ? "Witaj w Łap Chwilę" : "Utwórz konto"; authSubtitle.textContent = mode === "login" ? "Zaloguj się, aby zachowywać swoje wspomnienia." : "Załóż konto i zacznij zachowywać swoje chwile."; authSubmit.textContent = mode === "login" ? "Zaloguj się" : "Utwórz konto"; authSwitch.textContent = mode === "login" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"; setAuthMessage(""); authForm?.reset(); authModal?.classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => authEmail?.focus(), 50); }
  function closeAuth() { authModal?.classList.remove("open"); document.body.style.overflow = ""; setAuthMessage(""); }
  const viewer = document.createElement("div"); viewer.className = "photo-viewer"; viewer.innerHTML = '<button class="viewer-close" type="button" aria-label="Zamknij">×</button><img class="viewer-image" alt="Powiększone zdjęcie">'; document.body.appendChild(viewer); const viewerImage = viewer.querySelector(".viewer-image"); const closeViewer = () => { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; }; viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.classList.contains("viewer-close")) closeViewer(); }); const openViewer = (url) => { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; };
  async function deletePhoto(photoId, imagePath, card) { const { data: { user } } = await supabase.auth.getUser(); if (!user || !photoId || !imagePath) return; if (!confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return; const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId).eq("user_id", user.id); if (dbError) return alert("Nie udało się usunąć zdjęcia: " + dbError.message); const { error: storageError } = await supabase.storage.from(BUCKET).remove([imagePath]); if (storageError) console.warn(storageError); card?.remove(); setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0); }
  function addImageToGallery(url, id, imagePath) { if (!gallery || gallery.querySelector(`[data-photo-id="${CSS.escape(String(id))}"]`)) return; const card = document.createElement("article"); card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = id; const image = document.createElement("img"); image.src = url; image.alt = "Moja chwila"; image.loading = "lazy"; image.addEventListener("click", () => openViewer(url)); const button = document.createElement("button"); button.className = "delete-photo"; button.type = "button"; button.title = "Usuń zdjęcie"; button.setAttribute("aria-label", "Usuń zdjęcie"); button.textContent = "🗑"; button.addEventListener("click", () => deletePhoto(id, imagePath, card)); card.append(image, button); gallery.append(card); }
  async function loadSavedPhotos() { if (loadingPhotos) return; loadingPhotos = true; try { const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) { clearSavedPhotos(); setCount(0); return; } const { data, error } = await supabase.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) return console.error(error); clearSavedPhotos(); const seenPaths = new Set(); data.forEach((photo) => { if (seenPaths.has(photo.image_path)) return; seenPaths.add(photo.image_path); const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(photo.image_path); addImageToGallery(publicData.publicUrl, photo.id, photo.image_path); }); setCount(seenPaths.size); } finally { loadingPhotos = false; } }
  async function sha256(file) { const buffer = await file.arrayBuffer(); const digest = await crypto.subtle.digest("SHA-256", buffer); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
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
    if (uploadError) { if (String(uploadError.message || "").toLowerCase().includes("already exists")) return false; throw uploadError; }
    const { error: dbError } = await supabase.from("photos").insert({ user_id: user.id, image_path: filePath, caption: "" });
    if (dbError) { await supabase.storage.from(BUCKET).remove([filePath]); if (String(dbError.message || "").toLowerCase().includes("duplicate") || String(dbError.code || "").startsWith("23")) return false; throw dbError; }
    return true;
  }
  async function uploadPhotos(files) {
    if (uploading) return;
    uploading = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { openAuth("login"); return; }
      const selected = Array.from(files || []);
      const valid = selected.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
      if (!valid.length) { alert("Wybierz zdjęcia do 10 MB każde."); return; }
      setUploadStatus(`Przesyłanie 0/${valid.length} zdjęć…`);
      let done = 0, skipped = 0, failed = 0;
      const batchHashes = new Set();
      for (const file of valid) {
        try {
          const hash = await sha256(file);
          if (batchHashes.has(hash)) { skipped++; continue; }
          batchHashes.add(hash);
          const added = await uploadOne(file, user);
          if (added) done++; else skipped++;
          setUploadStatus(`Przesyłanie ${done + skipped}/${valid.length} zdjęć…`);
        } catch (error) { failed++; console.error(error); }
      }
      await loadSavedPhotos();
      if (failed) setUploadStatus(`Dodano ${done}. Pominięto ${skipped}. Błędy: ${failed}.`);
      else if (skipped) setUploadStatus(`Gotowe — dodano ${done}, pominięto ${skipped} duplikat${skipped === 1 ? "" : "y"}.`);
      else setUploadStatus(`Gotowe — dodano ${done} ${done === 1 ? "zdjęcie" : "zdjęć"}.`);
    } finally { uploading = false; }
  }
  addButtons.forEach((b) => b.addEventListener("click", async (e) => { e.preventDefault(); if (uploading) return; const { data: { user } } = await supabase.auth.getUser(); if (!user) return openAuth("login"); const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.multiple = true; input.onchange = () => { if (input.files?.length) uploadPhotos(input.files); }; input.click(); }));
  loginButtons.forEach((b) => b.addEventListener("click", async (e) => { e.preventDefault(); const { data: { session } } = await supabase.auth.getSession(); if (session) await supabase.auth.signOut(); else openAuth("login"); }));
  authClose?.addEventListener("click", closeAuth); authModal?.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); }); authSwitch?.addEventListener("click", () => openAuth(authMode === "login" ? "signup" : "login"));
  authForm?.addEventListener("submit", async (e) => { e.preventDefault(); const email = authEmail.value.trim(), password = authPassword.value; authSubmit.disabled = true; try { if (authMode === "login") { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; closeAuth(); } else { const { data, error } = await supabase.auth.signUp({ email, password }); if (error) throw error; if (data.session) closeAuth(); else setAuthMessage("Konto utworzone. Sprawdź e-mail, aby potwierdzić adres.", true); } } catch (err) { setAuthMessage(err.message || "Wystąpił błąd."); } finally { authSubmit.disabled = false; authSubmit.textContent = authMode === "login" ? "Zaloguj się" : "Utwórz konto"; } });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeViewer(); closeAuth(); } });
  (async () => { const { data: { session }, error } = await supabase.auth.getSession(); if (error) return updateAuthUI(null); updateAuthUI(session?.user ?? null); if (session?.user) await loadSavedPhotos(); })();
  supabase.auth.onAuthStateChange((event, session) => { updateAuthUI(session?.user ?? null); if (session?.user) setTimeout(loadSavedPhotos, 0); else { clearSavedPhotos(); setCount(0); } });
});