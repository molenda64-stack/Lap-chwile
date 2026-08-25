(() => {
  const URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET = "photos";
  let client;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const isHeif = fileOrPath => /\.(heic|heif)$/i.test(fileOrPath?.name || fileOrPath || "");
  const getClient = () => {
    if (client) return client;
    if (!window.supabase?.createClient) return null;
    client = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage, storageKey: "lap-chwile-auth-v10" } });
    return client;
  };

  async function convert(file) {
    if (!isHeif(file) && !/^image\/(heic|heif)$/i.test(file.type || "")) return file;
    if (!window.heic2any) throw new Error("Konwerter HEIC/HEIF nie jest jeszcze gotowy. Odśwież stronę i spróbuj ponownie.");
    const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.88 });
    const blob = Array.isArray(out) ? out[0] : out;
    return new File([blob], `${(file.name || "zdjecie").replace(/\.(heic|heif)$/i, "")}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  }

  async function sha256(file) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function uploadBatch(files, user, status) {
    const sb = getClient();
    const converted = [];
    for (const original of files) {
      if (!original.type.startsWith("image/") && !isHeif(original)) continue;
      if (original.size > 20 * 1024 * 1024) throw new Error(`${original.name}: maks. 20 MB przed konwersją.`);
      status.textContent = isHeif(original) ? `Konwersja ${original.name}…` : `Przygotowanie ${original.name}…`;
      converted.push(await convert(original));
    }
    let added = 0, skipped = 0;
    const hashes = new Set();
    for (let i = 0; i < converted.length; i++) {
      const file = converted[i];
      status.textContent = `Przesyłanie ${i + 1}/${converted.length}…`;
      const hash = await sha256(file);
      if (hashes.has(hash)) { skipped++; continue; }
      hashes.add(hash);
      const path = `${user.id}/${hash}.jpg`;
      const existing = await sb.from("photos").select("id").eq("user_id", user.id).eq("image_path", path).limit(1);
      if (existing.error) throw existing.error;
      if (existing.data?.length) { skipped++; continue; }
      const up = await sb.storage.from(BUCKET).upload(path, file, { upsert: false, cacheControl: "3600", contentType: "image/jpeg" });
      if (up.error && !/already exists|duplicate/i.test(up.error.message || "")) throw up.error;
      const db = await sb.from("photos").upsert({ user_id: user.id, image_path: path, caption: "" }, { onConflict: "user_id,image_path", ignoreDuplicates: true });
      if (db.error) throw db.error;
      if (!up.error) added++; else skipped++;
    }
    return { added, skipped };
  }

  async function renderHeifPhotos() {
    const sb = getClient();
    if (!sb || !window.heic2any) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const gallery = document.querySelector(".gallery");
    const count = document.querySelector("#photoCount");
    const status = document.querySelector("#uploadStatus");
    if (!gallery) return;
    const { data, error } = await sb.from("photos").select("id,image_path,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) return;
    const heifs = (data || []).filter(p => isHeif(p.image_path));
    for (const photo of heifs) {
      if (gallery.querySelector(`[data-photo-id="${CSS.escape(String(photo.id))}"]`)) continue;
      try {
        status.textContent = "Przygotowywanie zapisanych zdjęć…";
        const { data: publicData } = sb.storage.from(BUCKET).getPublicUrl(photo.image_path);
        const response = await fetch(publicData.publicUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const out = await window.heic2any({ blob, toType: "image/jpeg", quality: 0.88 });
        const jpeg = Array.isArray(out) ? out[0] : out;
        const url = URL.createObjectURL(jpeg);
        const card = document.createElement("article");
        card.className = "photo-card"; card.dataset.savedPhoto = "true"; card.dataset.photoId = photo.id;
        const img = document.createElement("img"); img.src = url; img.alt = "Moja chwila"; img.loading = "lazy";
        img.onclick = () => { const viewer = document.querySelector(".photo-viewer"); const vi = viewer?.querySelector(".viewer-image"); if (viewer && vi) { vi.src = url; viewer.classList.add("open"); document.body.style.overflow = "hidden"; } };
        const del = document.createElement("button"); del.className = "delete-photo"; del.type = "button"; del.title = "Usuń zdjęcie"; del.textContent = "🗑";
        del.onclick = async () => { if (!confirm("Usunąć tę chwilę? Tej operacji nie można cofnąć.")) return; const d = await sb.from("photos").delete().eq("id", photo.id).eq("user_id", user.id); if (d.error) return; await sb.storage.from(BUCKET).remove([photo.image_path]); URL.revokeObjectURL(url); card.remove(); };
        card.append(img, del); gallery.append(card);
      } catch (e) { console.error("HEIF display", photo.image_path, e); }
    }
    if (heifs.length) { const visible = gallery.querySelectorAll('[data-saved-photo="true"]').length; if (count) count.textContent = visible === 1 ? "1 zapisana chwila" : `${visible} zapisanych chwil`; status.textContent = ""; }
  }

  function bindUploadOverride() {
    const add = document.querySelector("button.add");
    if (!add || add.dataset.heifBound) return;
    add.dataset.heifBound = "1";
    add.addEventListener("click", async e => {
      const sb = getClient();
      if (!sb) return;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*,.heic,.heif"; input.multiple = true;
      input.onchange = async () => {
        const files = [...(input.files || [])]; const status = document.querySelector("#uploadStatus");
        if (!files.length) return;
        try { const result = await uploadBatch(files, user, status); await renderHeifPhotos(); status.textContent = `Gotowe — dodano ${result.added}, pominięto ${result.skipped}.`; setTimeout(() => location.reload(), 700); }
        catch (err) { console.error("HEIF upload", err); status.textContent = `Błąd dodawania: ${err.message || err}`; }
      };
      input.click();
    }, true);
  }

  async function start() {
    for (let i = 0; i < 80 && !window.__lapChwileBooted; i++) await sleep(100);
    bindUploadOverride();
    await renderHeifPhotos();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true }); else start();
})();
