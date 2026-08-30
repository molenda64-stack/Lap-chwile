(() => {
  const boot = () => {
    const search = document.querySelector('#photoSearch');
    const buttons = [...document.querySelectorAll('.gallery-filters button')];
    const gallery = document.querySelector('.gallery');
    if (!search || !gallery || gallery.dataset.filtersReady) return setTimeout(boot, 100);
    gallery.dataset.filtersReady = '1';
    let mode = 'all';
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      [...gallery.querySelectorAll('.photo-card')].forEach(card => {
        const favorite = card.querySelector('.favorite-photo')?.textContent.trim() === '♥';
        const text = card.textContent.toLowerCase();
        const matchSearch = !q || text.includes(q);
        const matchMode = mode === 'all' || (mode === 'favorites' && favorite) || (mode === 'recent');
        card.hidden = !(matchSearch && matchMode);
      });
    };
    search.addEventListener('input', apply);
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.dataset.filter;
      apply();
    }));
    const originalApply = apply;
    const observer = new MutationObserver(originalApply);
    observer.observe(gallery, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();