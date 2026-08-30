(() => {
  const boot = () => {
    const gallery = document.querySelector('.gallery');
    const empty = document.querySelector('#emptyState');
    const add = document.querySelector('.add:not(.add-album)');
    const emptyAdd = document.querySelector('#emptyAddPhoto');
    const search = document.querySelector('#photoSearch');
    const filters = [...document.querySelectorAll('.gallery-filters button')];
    if (!gallery || !empty) return setTimeout(boot, 150);

    const title = empty.querySelector('h2');
    const text = empty.querySelector('p');
    let reset = empty.querySelector('#emptyResetFilters');
    if (!reset) {
      reset = document.createElement('button');
      reset.type = 'button';
      reset.id = 'emptyResetFilters';
      reset.textContent = 'Wyczyść wyszukiwanie i filtry';
      reset.hidden = true;
      empty.append(reset);
    }

    const resetFilters = () => {
      if (search) search.value = '';
      const all = filters.find(button => button.dataset.filter === 'all');
      all?.click();
      search?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const sync = () => {
      const cards = [...gallery.querySelectorAll('.photo-card')];
      const visibleCards = cards.filter(card => !card.hidden && card.style.display !== 'none');
      const hasFilter = Boolean(search?.value.trim()) || filters.some(button => button.classList.contains('active') && button.dataset.filter !== 'all');

      empty.hidden = visibleCards.length !== 0;
      if (visibleCards.length) {
        empty.style.display = 'none';
        return;
      }

      empty.style.display = '';
      if (cards.length && hasFilter) {
        if (title) title.textContent = 'Nie znaleziono wspomnień';
        if (text) text.textContent = 'Spróbuj zmienić wyszukiwanie lub wyczyścić aktywne filtry.';
        emptyAdd.hidden = true;
        reset.hidden = false;
      } else {
        if (title) title.textContent = 'Twoja historia zaczyna się tutaj';
        if (text) text.textContent = 'Dodaj pierwsze zdjęcie i zacznij zachowywać chwile, do których warto wracać.';
        emptyAdd.hidden = false;
        reset.hidden = true;
      }
    };

    emptyAdd?.addEventListener('click', () => add?.click());
    reset.addEventListener('click', resetFilters);
    search?.addEventListener('input', sync);
    filters.forEach(button => button.addEventListener('click', () => setTimeout(sync, 0)));
    gallery.addEventListener('lapchwile:filters-applied', sync);
    new MutationObserver(sync).observe(gallery, { childList:true, subtree:true, attributes:true, attributeFilter:['style','hidden'] });
    sync();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();