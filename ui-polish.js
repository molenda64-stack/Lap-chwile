(() => {
  const boot = () => {
    const gallery = document.querySelector('.gallery');
    const empty = document.querySelector('#emptyState');
    const add = document.querySelector('.add');
    const emptyAdd = document.querySelector('#emptyAddPhoto');
    if (!gallery || !empty) return setTimeout(boot, 150);
    const sync = () => {
      const cards = gallery.querySelectorAll('.photo-card');
      empty.hidden = cards.length !== 0;
      if (cards.length) empty.style.display = 'none'; else empty.style.display = '';
    };
    emptyAdd?.addEventListener('click', () => add?.click());
    new MutationObserver(sync).observe(gallery, {childList:true,subtree:true});
    sync();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();