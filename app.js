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
  const setCount = (count) => { if (photoCount) photoCount.textContent = count === 1 ? "1 zapisana chwila" : `${count} zapisanych chwil`; };
  const clearSavedPhotos = () => { if (gallery) gallery.querySelectorAll('[data-saved-photo="true"]').forEach((el) => el.remove()); };
  const updateAuthUI = (user) => loginButtons.forEach((button) => { button.textContent = user ? "Wyloguj" : "Zaloguj"; button.dataset.authenticated = user ? "true" : "false"; });
  function setAuthMessage(text, ok = false) { if (!authMessage) return; authMessage.textContent = text; authMessage.className = `auth-message${ok ? " ok" : ""}`; }
  function openAuth(mode = "login") { authMode = mode; if (!authModal) return; authTitle.textContent = mode === "login" ? "Witaj w Łap Chwilę" : "Utwórz konto"; authSubtitle.textContent = mode === "login" ? "Zaloguj się, aby zachowywać swoje wspomnienia." : "Załóż konto i zacznij zachowywać swoje chwile."; authSubmit.textContent = mode === "login" ? "Zaloguj się" : "Utwórz konto"; authSwitch.textContent = mode === "login" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"; setAuthMessage(""); authForm?.reset(); authModal.classList.add("open"); document.body.style.overflow = "hidden"; setTimeout(() => authEmail?.focus(), 50); }
  function closeAuth() { authModal?.classList.remove("open"); document.body.style.overflow = ""; setAuthMessage(""); }

  const viewer = document.createElement("div"); viewer.className = "photo-viewer"; viewer.innerHTML = '<button class="viewer-close" type="button" aria-label="Zamknij">×</button><img class="viewer-image" alt="Powiększone zdjęcie">'; document.body.appendChild(viewer);
  const viewerImage = viewer.querySelector(".viewer-image"); const closeViewer = () => { viewer.classList.remove("open"); viewerImage.removeAttribute("src"); document.body.style.overflow = ""; }; viewer.addEventListener("click", (e) => { if (e.target === viewer || e.target.classList.contains("viewer-close")) closeViewer(); });
  function openViewer(url) { viewerImage.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; }

  async function deletePhoto(photoId, imagePath, card) { const { data: { user } } = await supabase.auth.getUser(); if (!user || !photoId || !imagePath) return; if (!confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return; const { error: dbError } = await supabase.from("photos").delete().eq("id", photoId).eq("user_id", user.id); if (dbError) return alert("Nie udało się usunąć zdjęcia: " + dbError.message); const { error: storageError } = await supabase.storage.from(BUCKET).remove([imagePath]); if (storageError) console.warn("Rekord usunięty, ale plik Storage nie został usunięty:", storageError); card?.remove(); setCount(gallery?.querySelectorAll('[data-saved-photo="true"]').length || 0); }
  function addImageToGallery(url, id, imagePath) { if (!gallery) return; const card = document.createElement("article"); card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = id; const image = document.createElement("img"); image.src = url; image.alt = "Moja chwila"; image.loading = "lazy"; image.addEventListener("click", () => openViewer(url)); const button = document.createElement("button"); button.className = "delete-photo"; button.type = "button"; button.title = "Usuń zdjęcie"; button.setAttribute("aria-label", "Usuń zdjęcie"); button.textContent = "🗑"; button.addEventListener("click", () => deletePhoto(id, imagePath, card)); card.append(image, button); gallery.append(card); }
  async function loadSavedPhotos() { const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) { clearSavedPhotos(); setCount(0); return; } const { data, error } = await supabase.from("photos").select("id,image_path,caption,created_at").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) { console.error("Błąd pobierania zdjęć:", error); return; } clearSavedPhotos(); data.forEach((photo) => { const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(photo.image_path); addImageToGallery(publicData.publicUrl, photo.id, photo.image_path); }); setCount(data.length); }
  async function uploadPhoto(file) { if (!file) return; if (!file.type.startsWith("image/")) return alert("Wybierz zdjęcie."); if (file.size > 10 * 1024 * 1024) return alert("Zdjęcie jest za duże. Maksymalny rozmiar to 10 MB."); const { data: { user }, error: userError } = await supabase.auth.getUser(); if (userError || !user) return openAuth("login"); const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`; const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type }); if (uploadError) return alert("Nie udało się dodać zdjęcia: " + uploadError.message); const { error: dbError } = await supabase.from("photos").insert({ user_id: user.id, image_path: filePath, caption: "" }); if (dbError) { await supabase.storage.from(BUCKET).remove([filePath]); return alert("Nie udało się zapisać zdjęcia w bazie."); } await loadSavedPhotos(); }

  addButtons.forEach((button) => button.addEventListener("click", async (event) => { event.preventDefault(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return openAuth("login"); const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = () => uploadPhoto(input.files?.[0]); input.click(); }));
  loginButtons.forEach((button) => button.addEventListener("click", async (event) => { event.preventDefault(); const { data: { session } } = await supabase.auth.getSession(); if (session) { await supabase.auth.signOut(); return; } openAuth("login"); }));
  authClose?.addEventListener("click", closeAuth); authModal?.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); }); authSwitch?.addEventListener("click", () => openAuth(authMode === "login" ? "signup" : "login"));
  authForm?.addEventListener("submit", async (event) => { event.preventDefault(); const email = authEmail.value.trim(); const password = authPassword.value; if (!email || !password) return; authSubmit.disabled = true; authSubmit.textContent = authMode === "login" ? "Logowanie…" : "Tworzenie konta…"; setAuthMessage("");
    try { if (authMode === "login") { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; closeAuth(); } else { const { data, error } = await supabase.auth.signUp({ email, password }); if (error) throw error; if (data.session) { closeAuth(); } else { setAuthMessage("Konto utworzone. Sprawdź e-mail, aby potwierdzić adres.", true); } } } catch (error) { setAuthMessage(error.message || "Wystąpił błąd."); } finally { authSubmit.disabled = false; authSubmit.textContent = authMode === "login" ? "Zaloguj się" : "Utwórz konto"; }
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeViewer(); closeAuth(); } });
  (async () => { const { data: { session }, error } = await supabase.auth.getSession(); if (error) return updateAuthUI(null); updateAuthUI(session?.user ?? null); if (session?.user) await loadSavedPhotos(); })();
  supabase.auth.onAuthStateChange((event, session) => { updateAuthUI(session?.user ?? null); if (session?.user) setTimeout(loadSavedPhotos, 0); else { clearSavedPhotos(); setCount(0); } });
});