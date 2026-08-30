(() => {
  const url = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const key = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const bucket = "photos";
  const boot = () => {
    if (!window.supabase?.createClient) return setTimeout(boot, 50);
    const client = window.supabase.createClient(url, key, { auth: { persistSession: true, storageKey: "lap-chwile-auth-v10" } });
    const anchor = document.querySelector(".profile");
    if (!anchor) return;
    const panel = document.createElement("section"); panel.className = "albums-panel";
    panel.innerHTML = `<div class="albums-head"><div><h2>Moje albumy</h2><p>Porządkuj swoje chwile w prywatne kolekcje.</p></div><button id="newAlbumBtn" type="button">＋ Nowy album</button></div><div id="albumsGrid" class="albums-grid"></div><div id="albumEmpty" class="album-empty">Nie masz jeszcze albumów. Utwórz pierwszy.</div>`;
    anchor.insertAdjacentElement("beforebegin", panel);
    const grid = panel.querySelector("#albumsGrid"), empty = panel.querySelector("#albumEmpty");
    const modal = document.createElement("div"); modal.className = "album-modal";
    modal.innerHTML = `<div class="album-modal-box"><button class="album-modal-close" type="button">×</button><h3>Nowy album</h3><p>Wybierz krótką nazwę dla swojej kolekcji.</p><form><label>Nazwa albumu<input id="albumName" maxlength="80" required placeholder="np. Wakacje 2026"></label><label>Opis <span>(opcjonalnie)</span></label><textarea id="albumDescription" maxlength="300" placeholder="Kilka słów o tej chwili..."></textarea><button type="submit">Utwórz album</button></form><div class="album-msg" aria-live="polite"></div></div>`;
    document.body.append(modal);
    const open = () => { modal.classList.add("open"); document.body.style.overflow = "hidden"; modal.querySelector("#albumName")?.focus(); };
    const close = () => { modal.classList.remove("open"); document.body.style.overflow = ""; modal.querySelector("form")?.reset(); modal.querySelector(".album-msg").textContent = ""; };
    const openAlbumCreator = async () => { const { data: { session } } = await client.auth.getSession(); if (!session) return document.querySelector(".login")?.click(); open(); };
    panel.querySelector("#newAlbumBtn").onclick = openAlbumCreator;
    document.querySelector("#quickAddAlbum")?.addEventListener("click", openAlbumCreator);
    modal.querySelector(".album-modal-close").onclick = close; modal.addEventListener("click", e => { if (e.target === modal) close(); });
    const msg = modal.querySelector(".album-msg");

    async function signed(path) { const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl; }
    async function currentUser() { const { data: { user } } = await client.auth.getUser(); return user; }

    async function openAlbum(album, user) {
      const photosRes = await client.from("photos").select("id,image_path,caption,created_at,album_id").eq("user_id", user.id).order("created_at", { ascending: false });
      if (photosRes.error) return alert("Nie udało się wczytać zdjęć albumu.");
      const photos = photosRes.data || [];
      const inAlbum = photos.filter(p => p.album_id === album.id), outside = photos.filter(p => p.album_id !== album.id);
      const box = document.createElement("div"); box.className = "album-detail-modal";
      box.innerHTML = `<div class="album-detail-box"><button class="album-modal-close" type="button">×</button><h3></h3><p class="album-detail-sub"></p><div class="album-detail-actions"><button class="album-add-photos" type="button">＋ Dodaj istniejące zdjęcia</button></div><div class="album-detail-grid"></div><div class="album-detail-empty">Album nie ma jeszcze zdjęć.</div></div>`;
      document.body.append(box); document.body.style.overflow = "hidden";
      box.querySelector("h3").textContent = album.name;
      const photoWord = inAlbum.length === 1 ? "zdjęcie" : (inAlbum.length % 10 >= 2 && inAlbum.length % 10 <= 4 && (inAlbum.length % 100 < 10 || inAlbum.length % 100 >= 20) ? "zdjęcia" : "zdjęć");
      box.querySelector(".album-detail-sub").textContent = `${inAlbum.length} ${photoWord}`;
      const grid = box.querySelector(".album-detail-grid"), emptyDetail = box.querySelector(".album-detail-empty");
      const closeDetail = () => { box.remove(); document.body.style.overflow = ""; };
      box.querySelector(".album-modal-close").onclick = closeDetail; box.addEventListener("click", e => { if (e.target === box) closeDetail(); });
      for (const photo of inAlbum) { try { const card = document.createElement("div"); card.className = "album-photo"; const img = document.createElement("img"); img.src = await signed(photo.image_path); img.alt = "Zdjęcie w albumie"; card.append(img); const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Usuń z albumu"; remove.onclick = async () => { const r = await client.from("photos").update({ album_id: null }).eq("id", photo.id).eq("user_id", user.id); if (r.error) alert("Nie udało się usunąć zdjęcia z albumu."); else { closeDetail(); openAlbum(album, user); } }; card.append(remove); grid.append(card); } catch (e) { console.error(e); } }
      emptyDetail.style.display = inAlbum.length ? "none" : "block";
      box.querySelector(".album-add-photos").onclick = () => {
        const picker = document.createElement("div"); picker.className = "album-picker";
        picker.innerHTML = `<div class="album-picker-box"><button class="album-modal-close" type="button">×</button><h3></h3><p>Wybierz zapisane zdjęcia. Niczego nie przesyłasz ponownie.</p><div class="album-picker-grid"></div><button class="album-picker-save" type="button">Zapisz wybrane</button><div class="album-msg"></div></div>`;
        picker.querySelector("h3").textContent = `Dodaj zdjęcia do „${album.name}”`;
        box.append(picker);
        const pg = picker.querySelector(".album-picker-grid"), selected = new Set();
        for (const photo of outside) { try { const item = document.createElement("button"); item.type = "button"; item.className = "picker-photo"; const img = document.createElement("img"); img.src = await signed(photo.image_path); img.alt = "Zdjęcie"; item.append(img); item.onclick = () => { if (selected.has(photo.id)) { selected.delete(photo.id); item.classList.remove("selected"); } else { selected.add(photo.id); item.classList.add("selected"); } }; pg.append(item); } catch (e) { console.error(e); } }
        if (!outside.length) pg.innerHTML = `<p class="picker-none">Wszystkie Twoje zdjęcia są już w tym albumie.</p>`;
        picker.querySelector(".album-modal-close").onclick = () => picker.remove();
        picker.querySelector(".album-picker-save").onclick = async () => { if (!selected.size) return picker.querySelector(".album-msg").textContent = "Wybierz przynajmniej jedno zdjęcie."; const { error } = await client.from("photos").update({ album_id: album.id }).in("id", [...selected]).eq("user_id", user.id); if (error) picker.querySelector(".album-msg").textContent = "Nie udało się zapisać wyboru."; else { picker.remove(); closeDetail(); openAlbum(album, user); } };
      };
    }

    async function loadAlbums() {
      const user = await currentUser(); if (!user) { panel.style.display = "none"; return; }
      panel.style.display = "block";
      const { data, error } = await client.from("albums").select("id,name,description,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) { grid.innerHTML = ""; empty.textContent = "Nie udało się wczytać albumów."; empty.style.display = "block"; return; }
      grid.innerHTML = ""; empty.style.display = data?.length ? "none" : "block";
      for (const album of data || []) {
        const card = document.createElement("article"); card.className = "album-card"; card.innerHTML = `<div class="album-icon">▦</div><div class="album-copy"><h3></h3><p></p><small></small></div><button class="album-delete" title="Usuń album" type="button">🗑</button>`;
        card.querySelector("h3").textContent = album.name; card.querySelector("p").textContent = album.description || "Bez opisu"; card.querySelector("small").textContent = new Date(album.created_at).toLocaleDateString("pl-PL");
        card.onclick = e => { if (e.target.closest(".album-delete")) return; currentUser().then(u => u && openAlbum(album, u)); };
        card.querySelector(".album-delete").onclick = async e => { e.stopPropagation(); if (!confirm(`Usunąć album „${album.name}”? Zdjęcia pozostaną w galerii.`)) return; const result = await client.from("albums").delete().eq("id", album.id).eq("user_id", user.id); if (result.error) alert("Nie udało się usunąć albumu."); else loadAlbums(); };
        grid.append(card);
      }
    }
    modal.querySelector("form").onsubmit = async e => { e.preventDefault(); const user = await currentUser(); if (!user) return close(); const name = modal.querySelector("#albumName").value.trim(); const description = modal.querySelector("#albumDescription").value.trim(); if (!name) return; const { error } = await client.from("albums").insert({ user_id: user.id, name, description }); if (error) { msg.textContent = error.message; return; } close(); loadAlbums(); };
    client.auth.onAuthStateChange(() => setTimeout(loadAlbums, 0)); loadAlbums();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
