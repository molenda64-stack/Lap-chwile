(() => {
  const boot = () => {
    const search = document.querySelector('#photoSearch');
    const buttons = [...document.querySelectorAll('.gallery-filters button')];
    const gallery = document.querySelector('.gallery');
    if (gallery?.dataset.filtersReady) return;
    if (!search || !gallery) return setTimeout(boot, 100);
    gallery.dataset.filtersReady = '1';
    let mode = 'all';

    const apply = () => {
      const q = search.value.trim().toLowerCase();
      const cards = [...gallery.querySelectorAll('.photo-card')];
      cards.forEach((card, index) => {
        const favorite = card.querySelector('.favorite-photo')?.textContent.trim() === '♥';
        const text = card.textContent.toLowerCase();
        const matchSearch = !q || text.includes(q);
        const matchMode =
          mode === 'all' ||
          (mode === 'favorites' && favorite) ||
          (mode === 'recent' && index < 12);
        card.hidden = !(matchSearch && matchMode);
      });
      gallery.dispatchEvent(new CustomEvent('lapchwile:filters-applied', { detail: { visible: cards.filter(c => !c.hidden).length } }));
    };

    search.addEventListener('input', apply);
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.filter;
      apply();
    }));

    new MutationObserver(apply).observe(gallery, { childList: true });
    gallery.addEventListener('lapchwile:photo-updated', apply);
    apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();