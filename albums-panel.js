(() => {
  const url = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const key = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const boot = () => {
    if (!window.supabase?.createClient) return setTimeout(boot, 50);
    const client = window.supabase.createClient(url, key, { auth: { persistSession: true, storageKey: "lap-chwile-auth-v10" } });
    const main = document.querySelector("main");
    const anchor = document.querySelector(".profile");
    if (!main || !anchor) return;
    const panel = document.createElement("section");
    panel.className = "albums-panel";
    panel.innerHTML = `<div class="albums-head"><div><h2>Moje albumy</h2><p>Porządkuj swoje chwile w prywatne kolekcje.</p></div><button id="newAlbumBtn" type="button">＋ Nowy album</button></div><div id="albumsGrid" class="albums-grid"></div><div id="albumEmpty" class="album-empty">Nie masz jeszcze albumów. Utwórz pierwszy.</div>`;
    anchor.insertAdjacentElement("beforebegin", panel);
    const grid = panel.querySelector("#albumsGrid"), empty = panel.querySelector("#albumEmpty");
    const modal = document.createElement("div");
    modal.className = "album-modal";
    modal.innerHTML = `<div class="album-modal-box"><button class="album-modal-close" type="button">×</button><h3>Nowy album</h3><p>Wybierz krótką nazwę dla swojej kolekcji.</p><form><label>Nazwa albumu<input id="albumName" maxlength="80" required placeholder="np. Wakacje 2026"></label><label>Opis <span>(opcjonalnie)</span><textarea id="albumDescription" maxlength="300" placeholder="Kilka słów o tej chwili..."></textarea></label><button type="submit">Utwórz album</button></form><div class="album-msg" aria-live="polite"></div></div>`;
    document.body.append(modal);
    const open = () => { modal.classList.add("open"); document.body.style.overflow = "hidden"; modal.querySelector("#albumName")?.focus(); };
    const close = () => { modal.classList.remove("open"); document.body.style.overflow = ""; modal.querySelector("form")?.reset(); modal.querySelector(".album-msg").textContent = ""; };
    panel.querySelector("#newAlbumBtn").onclick = async () => { const { data: { session } } = await client.auth.getSession(); if (!session) return document.querySelector(".login")?.click(); open(); };
    modal.querySelector(".album-modal-close").onclick = close; modal.addEventListener("click", e => { if (e.target === modal) close(); });
    const msg = modal.querySelector(".album-msg");
    async function loadAlbums() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { panel.style.display = "none"; return; }
      panel.style.display = "block";
      const { data, error } = await client.from("albums").select("id,name,description,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) { grid.innerHTML = ""; empty.textContent = "Nie udało się wczytać albumów."; empty.style.display = "block"; return; }
      grid.innerHTML = ""; empty.style.display = data?.length ? "none" : "block";
      for (const album of data || []) {
        const card = document.createElement("article"); card.className = "album-card";
        card.innerHTML = `<div class="album-icon">▦</div><div class="album-copy"><h3></h3><p></p><small></small></div><button class="album-delete" title="Usuń album" type="button">🗑</button>`;
        card.querySelector("h3").textContent = album.name; card.querySelector("p").textContent = album.description || "Bez opisu"; card.querySelector("small").textContent = new Date(album.created_at).toLocaleDateString("pl-PL");
        card.querySelector(".album-delete").onclick = async () => { if (!confirm(`Usunąć album „${album.name}”? Zdjęcia pozostaną w galerii.`)) return; const result = await client.from("albums").delete().eq("id", album.id).eq("user_id", user.id); if (result.error) alert("Nie udało się usunąć albumu."); else loadAlbums(); };
        grid.append(card);
      }
    }
    modal.querySelector("form").onsubmit = async e => { e.preventDefault(); const { data: { user } } = await client.auth.getUser(); if (!user) return close(); const name = modal.querySelector("#albumName").value.trim(); const description = modal.querySelector("#albumDescription").value.trim(); if (!name) return; const { error } = await client.from("albums").insert({ user_id: user.id, name, description }); if (error) { msg.textContent = error.message; return; } close(); loadAlbums(); };
    client.auth.onAuthStateChange(() => setTimeout(loadAlbums, 0));
    loadAlbums();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();
