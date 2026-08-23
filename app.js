document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";
  if (!window.supabase?.createClient) return;
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const loginButtons = document.querySelectorAll('button.login, button[class*="login"]');
  const addButtons = document.querySelectorAll('button.add, button[class*="add"]');
  const gallery = document.querySelector(".gallery");
  const photoCount = document.querySelector("#photoCount");
  const setCount = (count) => { if (photoCount) photoCount.textContent = count === 1 ? "1 zapisana chwila" : `${count} zapisanych chwil`; };
  const clearSavedPhotos = () => { if (gallery) gallery.querySelectorAll('[data-saved-photo="true"]').forEach((el) => el.remove()); };
  const updateAuthUI = (user) => loginButtons.forEach((button) => { button.textContent = user ? "Wyloguj" : "Zaloguj"; button.dataset.authenticated = user ? "true" : "false"; });

  const viewer = document.createElement("div");
  viewer.className = "photo-viewer";
  viewer.innerHTML = '<button class="viewer-close" type="button" aria-label="Zamknij">×</button><img class="viewer-image" alt="Powiększone zdjęcie">';
  document.body.appendChild(viewer);
  const viewerImage = viewer.querySelector(".viewer-image");
  const closeViewer = () => { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; };
  viewer.addEventListener("click", (event) => { if (event.target === viewer || event.target.classList.contains("viewer-close")) closeViewer(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeViewer(); });
  function openViewer(url) { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; }

  async function deletePhoto(photoId, imagePath, card) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !photoId || !imagePath) return;
    if (!confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return;
    const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId).eq("user_id", user.id);
    if (dbError) return alert("Nie udało się usunąć zdjęcia: " + dbError.message);
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([imagePath]);
    if (storageError) console.warn("Rekord usunięty, ale plik Storage nie został usunięty:", storageError);
    card?.remove(); setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0);
  }

  function addImageToGallery(url, id, imagePath) {
    if (!gallery) return;
    const card = document.createElement("article"); card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = id;
    const image = document.createElement("img"); image.src = url; image.alt = "Moja chwila"; image.loading = "lazy"; image.addEventListener("click", () => openViewer(url));
    const button = document.createElement("button"); button.className = "delete-photo"; button.type = "button"; button.title = "Usuń zdjęcie"; button.setAttribute("aria-label", "Usuń zdjęcie"); button.textContent = "🗑"; button.addEventListener("click", () => deletePhoto(id, imagePath, card));
    card.append(image, button); gallery.append(card);
  }

  async function loadSavedPhotos() {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) { clearSavedPhotos(); setCount(0); return; }
    const { data, error } = await supabase.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { console.error("Błąd pobierania zdjęć:", error); return; }
    clearSavedPhotos(); data.forEach((photo) => { const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(photo.image_path); addImageToGallery(publicData.publicUrl, photo.id, photo.image_path); }); setCount(data.length);
  }

  async function uploadPhoto(file) {
    if (!file) return; if (!file.type.startsWith("image/")) return alert("Wybierz zdjęcie."); if (file.size > 10 * 1024 * 1024) return alert("Zdjęcie jest za duże. Maksymalny rozmiar to 10 MB.");
    const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) return alert("Najpierw się zaloguj.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type }); if (uploadError) return alert("Nie udało się dodać zdjęcia: " + uploadError.message);
    const { error: dbError } = await supabase.from("photos").insert({ user_id: user.id, image_path: filePath, caption: "" }); if (dbError) { await supabase.storage.from(BUCKET).remove([filePath]); return alert("Nie udało się zapisać zdjęcia w bazie."); }
    await loadSavedPhotos(); alert("Zdjęcie dodane i zapisane. ✅");
  }

  addButtons.forEach((button) => button.addEventListener("click", async (event) => { event.preventDefault(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return alert("Najpierw się zaloguj."); const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = () => uploadPhoto(input.files?.[0]); input.click(); }));
  loginButtons.forEach((button) => button.addEventListener("click", async (event) => { event.preventDefault(); const { data: { session } } = await supabase.auth.getSession(); if (session) { await supabase.auth.signOut(); return; } const email = prompt("Podaj adres e-mail:"); if (!email) return; const password = prompt("Podaj hasło:"); if (!password) return; const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) alert("Logowanie nieudane: " + error.message); }));
  (async () => { const { data: { session }, error } = await supabase.auth.getSession(); if (error) return updateAuthUI(null); updateAuthUI(session?.user ?? null); if (session?.user) await loadSavedPhotos(); })();
  supabase.auth.onAuthStateChange((event, session) => { updateAuthUI(session?.user ?? null); if (session?.user) setTimeout(loadSavedPhotos, 0); else { clearSavedPhotos(); setCount(0); } });
});