(() => {
  const URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const boot = () => {
    if (!window.supabase?.createClient) return setTimeout(boot, 50);
    const client = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: "lap-chwile-auth-v10" } });
    const panel = document.querySelector('.albums-panel');
    if (!panel || panel.dataset.albumPhotosReady) return;
    panel.dataset.albumPhotosReady = '1';
    const grid = panel.querySelector('#albumsGrid');
    const modal = document.createElement('div');
    modal.className = 'album-photos-modal';
    modal.innerHTML = '<div class="album-photos-box"><button class="album-photos-close" type="button">×</button><div class="album-photos-top"><div><h3></h3><p></p></div><button class="album-add-existing" type="button">＋ Dodaj zdjęcia</button></div><div class="album-photos-grid"></div><div class="album-photos-empty">Ten album nie ma jeszcze zdjęć.</div><div class="album-photos-msg" aria-live="polite"></div></div>';
    document.body.append(modal);
    const close = () => { modal.classList.remove('open'); document.body.style.overflow = ''; };
    modal.querySelector('.album-photos-close').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    const photoGrid = modal.querySelector('.album-photos-grid'), empty = modal.querySelector('.album-photos-empty'), msg = modal.querySelector('.album-photos-msg');
    const title = modal.querySelector('h3'), desc = modal.querySelector('p');
    async function currentUser() { const { data: { user }, error } = await client.auth.getUser(); if (error || !user) return null; return user; }
    async function openAlbum(album) {
      const user = await currentUser(); if (!user) return;
      title.textContent = album.name; desc.textContent = album.description || 'Prywatna kolekcja Twoich chwil.'; modal.classList.add('open'); document.body.style.overflow = 'hidden'; photoGrid.innerHTML = ''; empty.style.display = 'none'; msg.textContent = '';
      const { data, error } = await client.from('photos').select('id,image_path,caption,created_at').eq('user_id', user.id).eq('album_id', album.id).order('created_at', { ascending: false });
      if (error) { msg.textContent = 'Nie udało się wczytać zdjęć albumu.'; return; }
      if (!data?.length) empty.style.display = 'block';
      for (const photo of data || []) {
        const { data: signed, error: signError } = await client.storage.from('photos').createSignedUrl(photo.image_path, 3600); if (signError || !signed?.signedUrl) continue;
        const card = document.createElement('article'); card.className = 'album-photo-card'; const img = document.createElement('img'); img.src = signed.signedUrl; img.alt = photo.caption || 'Zdjęcie z albumu'; img.loading = 'lazy';
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'album-photo-remove'; remove.textContent = '×'; remove.title = 'Usuń z albumu'; remove.onclick = async () => { if (!confirm('Usunąć zdjęcie tylko z tego albumu?')) return; const result = await client.from('photos').update({ album_id: null }).eq('id', photo.id).eq('user_id', user.id).eq('album_id', album.id); if (result.error) msg.textContent = 'Nie udało się usunąć zdjęcia z albumu.'; else card.remove(); };
        card.append(img, remove); photoGrid.append(card);
      }
    }
    async function refreshCards() {
      const user = await currentUser(); if (!user) return;
      for (const card of grid?.querySelectorAll('.album-card') || []) {
        if (card.dataset.albumBound) continue;
        card.dataset.albumBound = '1';
        const name = card.querySelector('h3')?.textContent || '';
        const description = card.querySelector('p')?.textContent === 'Bez opisu' ? '' : (card.querySelector('p')?.textContent || '');
        const { data } = await client.from('albums').select('id,name,description').eq('user_id', user.id).eq('name', name).maybeSingle();
        if (data) { card.style.cursor = 'pointer'; card.addEventListener('click', e => { if (!e.target.closest('.album-delete')) openAlbum(data); }); }
      }
    }
    panel.addEventListener('click', () => setTimeout(refreshCards, 50));
    setTimeout(refreshCards, 100);
    modal.querySelector('.album-add-existing').onclick = async () => {
      const user = await currentUser(); if (!user) return;
      const albumName = title.textContent; const { data: album } = await client.from('albums').select('id,name').eq('user_id', user.id).eq('name', albumName).maybeSingle(); if (!album) return;
      const { data: photos, error } = await client.from('photos').select('id,image_path,caption').eq('user_id', user.id).order('created_at', { ascending: false }); if (error) return;
      const choices = photos.filter(p => !p.album_id || p.album_id !== album.id);
      if (!choices.length) { msg.textContent = 'Nie masz innych zdjęć do dodania.'; return; }
      const input = document.createElement('div'); input.className = 'album-picker'; input.innerHTML = '<div class="album-picker-box"><h4>Wybierz zdjęcia</h4><div class="album-picker-grid"></div><div class="album-picker-actions"><button type="button" class="album-picker-cancel">Anuluj</button><button type="button" class="album-picker-save">Dodaj wybrane</button></div></div>';
      document.body.append(input); const pickerGrid = input.querySelector('.album-picker-grid');
      for (const photo of choices) { const item = document.createElement('label'); item.className = 'album-picker-item'; item.innerHTML = `<input type="checkbox" value="${photo.id}"><span>${photo.caption || 'Zdjęcie'}</span>`; pickerGrid.append(item); }
      input.querySelector('.album-picker-cancel').onclick = () => input.remove();
      input.querySelector('.album-picker-save').onclick = async () => { const ids = [...input.querySelectorAll('input:checked')].map(x => x.value); if (!ids.length) return; for (const id of ids) { await client.from('photos').update({ album_id: album.id }).eq('id', id).eq('user_id', user.id); } input.remove(); await openAlbum(album); };
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
