/* Manhwa Opehh enhancements. Loaded after the app's inline script. */
(() => {
  'use strict';

  const OWNER_ID = 1405846034;
  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;
  let imageObserver = null;
  let browseMode = 'popular';
  let browsePage = 1;
  let browseFilters = { lang: '', source: '' };
  let browseItems = [];
  let browseRequest = 0;

  const css = `
    #bottomNav .nav-tab { min-height:60px; padding-top:10px; padding-bottom:calc(9px + env(safe-area-inset-bottom)); }
    #bottomNav .nav-tab svg { width:22px; height:22px; }
    #splash .opehh-mark { position:relative; isolation:isolate; overflow:hidden; }
    #splash .opehh-mark::before { content:""; position:absolute; inset:-50%; z-index:-1; background:linear-gradient(105deg,transparent 42%,rgba(126,249,255,.55) 49%,rgba(169,149,255,.62) 51%,transparent 58%); animation:opehh-sweep 1.15s steps(10,end) infinite; }
    #splash .opehh-mark::after { content:""; position:absolute; inset:0; z-index:-1; background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.08) 7px,transparent 8px); animation:opehh-scan 1.6s steps(2,end) infinite; }
    #splash .opehh-title { color:#e7edff; text-shadow:2px 0 #7ef9ff,-2px 0 #a995ff,0 0 20px rgba(126,249,255,.3); animation:opehh-flicker 2.4s steps(1,end) infinite; }
    #splash .opehh-subtitle { color:#9aa8c2; letter-spacing:.28em; text-transform:uppercase; font-size:9px; }
    @keyframes opehh-sweep { 0%{transform:translateX(-70%) skewX(-15deg)}65%{transform:translateX(65%) skewX(-15deg)}72%{transform:translateX(59%) skewX(-12deg)}100%{transform:translateX(150%) skewX(-15deg)} }
    @keyframes opehh-scan { 50%{transform:translateY(3px);opacity:.12} }
    @keyframes opehh-flicker { 0%,88%,100%{transform:none;clip-path:none}89%{transform:translateX(2px);clip-path:inset(15% 0 68%)}91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)}93%{transform:none;clip-path:inset(40% 0 40%)} }

    /* Webtoon means gapless continuous pages, not hiding the reader controls. */
    #readerView.opehh-webtoon #readerContent { padding-top:3.5rem!important; padding-bottom:9rem!important; scroll-behavior:auto; }
    #readerView.opehh-webtoon #readerContent img { display:block; width:100%; max-width:none; height:auto; margin:0; border-radius:0!important; }

    .opehh-browse-controls { display:grid; gap:9px; margin:12px 0 4px; }
    .opehh-browse-tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .opehh-browse-tab,.opehh-browse-filter { min-height:42px; border:1px solid rgba(255,255,255,.1); border-radius:14px; background:#121621; color:#aeb8ca; font:600 12px inherit; }
    .opehh-browse-tab.active { color:#090b12; border-color:#bcf36b; background:#bcf36b; }
    .opehh-browse-filters { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .opehh-browse-filter { width:100%; padding:0 10px; text-align:left; }
    @media(prefers-reduced-motion:reduce){#splash .opehh-mark::before,#splash .opehh-mark::after,#splash .opehh-title{animation:none!important}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const telegramId = () => Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0);
  const hasPremiumAccess = () => telegramId() === OWNER_ID || $('accountPlan')?.dataset?.premium === 'true';
  const toast = (message) => {
    if (typeof window.showToast === 'function') window.showToast(message);
    else console.info(message);
  };

  const splash = $('splash');
  if (splash) {
    const mark = splash.querySelector('.logo-mark') || splash.querySelector('div');
    if (mark) { mark.classList.add('opehh-mark'); mark.setAttribute('aria-label', 'Manhwa Opehh'); }
    const heading = splash.querySelector('h1');
    if (heading) { heading.textContent = 'MANHWA OPEHH'; heading.classList.add('opehh-title'); }
    const message = $('splashMessage');
    if (message && !splash.querySelector('.opehh-subtitle')) {
      const subtitle = document.createElement('p');
      subtitle.className = 'opehh-subtitle mt-4';
      subtitle.textContent = 'Stories beyond the frame';
      message.insertAdjacentElement('afterend', subtitle);
    }
  }

  function attachImageRetry(img) {
    if (img.dataset.opehhRetryAttached) return;
    img.dataset.opehhRetryAttached = 'true';
    img.addEventListener('error', () => {
      const attempt = Number(img.dataset.opehhRetryCount || 0);
      if (attempt >= 3 || !img.src) return;
      const next = attempt + 1;
      img.dataset.opehhRetryCount = String(next);
      const original = img.dataset.opehhOriginalSrc || img.src;
      img.dataset.opehhOriginalSrc = original;
      setTimeout(() => {
        if (!img.isConnected) return;
        const url = new URL(original, window.location.href);
        url.searchParams.set('opehh_retry', `${Date.now()}_${next}`);
        img.src = url.toString();
      }, 250 * next);
    });
  }

  function observeReaderImages() {
    const content = $('readerContent');
    if (!content || imageObserver) return;
    imageObserver = new MutationObserver((records) => records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('img')) attachImageRetry(node);
        node.querySelectorAll?.('img').forEach(attachImageRetry);
      });
    }));
    imageObserver.observe(content, { childList:true, subtree:true });
    content.querySelectorAll('img').forEach(attachImageRetry);
  }
  observeReaderImages();

  if (typeof window.openDetails === 'function') {
    const originalOpenDetails = window.openDetails;
    window.openDetails = function (id) {
      const cover = $('detailCover');
      if (cover) { cover.onerror = null; cover.removeAttribute('src'); cover.alt = 'Loading cover'; }
      if ($('detailTitle')) $('detailTitle').textContent = 'Loading title…';
      if ($('detailsHeaderTitle')) $('detailsHeaderTitle').textContent = '';
      if ($('detailDescription')) $('detailDescription').textContent = '';
      if ($('detailGenres')) $('detailGenres').replaceChildren();
      if ($('chapterList')) $('chapterList').textContent = 'Loading chapters…';
      return originalOpenDetails.apply(this, arguments);
    };
  }

  // Keep the existing reader functions and controls intact. The buttons remain
  // visible and their chapter-navigation handlers are never intercepted.
  if (typeof window.openReader === 'function') {
    const originalOpenReader = window.openReader;
    window.openReader = async function (index) {
      const content = $('readerContent');
      const view = $('readerView');
      const result = await originalOpenReader.apply(this, arguments);
      requestAnimationFrame(() => {
        if (!content) return;
        const images = [...content.querySelectorAll('img')];
        images.forEach((img, i) => {
          attachImageRetry(img);
          img.decoding = 'async';
          if (i < 4) img.loading = 'eager';
          if (i === 0) img.fetchPriority = 'high';
        });
        if (view) view.classList.toggle('opehh-webtoon', webtoonEnabled);
        content.scrollTop = 0;
        observeReaderImages();
      });
      return result;
    };
  }

  function installWebtoonToggle() {
    const view = $('readerView');
    const header = $('readerTopBar');
    if (!view || !header || header.querySelector('#opehhWebtoonToggle')) return;
    const button = document.createElement('button');
    button.id = 'opehhWebtoonToggle';
    button.type = 'button';
    button.className = 'rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300';
    button.textContent = 'Webtoon';
    button.title = 'Continuous vertical pages; chapter controls stay available';
    button.hidden = true;
    button.addEventListener('click', () => {
      if (!hasPremiumAccess()) { toast('Webtoon mode is available to the owner and Premium readers.'); return; }
      webtoonEnabled = !webtoonEnabled;
      view.classList.toggle('opehh-webtoon', webtoonEnabled);
      button.textContent = webtoonEnabled ? 'Webtoon ✓' : 'Webtoon';
      const content = $('readerContent');
      if (content) content.scrollTop = 0;
    });
    const buttons = header.querySelectorAll('button');
    if (buttons.length > 1) header.insertBefore(button, buttons[buttons.length - 1]);
    else header.appendChild(button);
    const refresh = () => {
      const opened = view.classList.contains('flex') && !view.classList.contains('hidden');
      const allowed = hasPremiumAccess();
      button.hidden = !opened;
      button.disabled = !allowed;
      button.classList.toggle('opacity-50', !allowed);
    };
    new MutationObserver(refresh).observe(view, { attributes:true, attributeFilter:['class'] });
    const plan = $('accountPlan');
    if (plan) new MutationObserver(refresh).observe(plan, { attributes:true, attributeFilter:['data-premium'] });
    refresh();
  }

  function populateSelect(select, options, label, selected) {
    const values = [...new Set(options.filter(Boolean))].sort((a,b) => a.localeCompare(b));
    select.replaceChildren(new Option(label, ''));
    values.forEach((value) => select.add(new Option(value, value)));
    select.value = selected || '';
  }

  function installBrowseControls() {
    const search = $('searchInput');
    const grid = $('browseGrid');
    const header = search?.closest('header');
    if (!search || !grid || !header || $('opehhBrowseControls')) return;

    const controls = document.createElement('div');
    controls.id = 'opehhBrowseControls';
    controls.className = 'opehh-browse-controls';
    controls.innerHTML = `
      <div class="opehh-browse-tabs" role="tablist" aria-label="Browse lists">
        <button type="button" class="opehh-browse-tab active" data-mode="popular" role="tab" aria-selected="true">Popular</button>
        <button type="button" class="opehh-browse-tab" data-mode="latest" role="tab" aria-selected="false">Latest</button>
      </div>
      <div class="opehh-browse-filters">
        <select id="opehhLanguageFilter" class="opehh-browse-filter" aria-label="Filter by language"><option value="">All languages</option></select>
        <select id="opehhSourceFilter" class="opehh-browse-filter" aria-label="Filter by source"><option value="">All sources</option></select>
      </div>`;
    search.insertAdjacentElement('afterend', controls);

    const language = $('opehhLanguageFilter');
    const source = $('opehhSourceFilter');
    const setModeUI = () => {
      controls.querySelectorAll('[data-mode]').forEach((button) => {
        const active = button.dataset.mode === browseMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
      language.disabled = browseMode !== 'latest';
      source.disabled = false;
      language.classList.toggle('opacity-50', browseMode !== 'latest');
    };
    controls.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
      browseMode = button.dataset.mode;
      browsePage = 1;
      setModeUI();
      loadBrowseMode(1);
    }));
    language.addEventListener('change', () => { browseFilters.lang = language.value; browsePage = 1; loadBrowseMode(1); });
    source.addEventListener('change', () => { browseFilters.source = source.value; browsePage = 1; loadBrowseMode(1); });
    setModeUI();
  }

  async function loadBrowseMode(page = 1) {
    const grid = $('browseGrid');
    const more = $('loadMoreBtn');
    if (!grid) return;
    const requestId = ++browseRequest;
    browsePage = page;
    if (page === 1 && typeof window.skeletonGrid === 'function') window.skeletonGrid(grid, 6);
    if (more) { more.disabled = true; more.textContent = 'Loading…'; }
    try {
      const params = new URLSearchParams({ mode:browseMode, page:String(page) });
      if (browseFilters.lang) params.set('lang', browseFilters.lang);
      if (browseFilters.source) params.set('source', browseFilters.source);
      const response = await window.apiFetch(`/api/browse?${params.toString()}`);
      const data = await response.json();
      if (requestId !== browseRequest) return;

      const items = Array.isArray(data) ? data : (data.items || []);
      const filters = data.filters || {};
      if (page === 1) browseItems = items;
      else browseItems = browseItems.concat(items);
      populateSelect($('opehhLanguageFilter'), filters.languages || [], 'All languages', browseFilters.lang);
      populateSelect($('opehhSourceFilter'), (filters.sources || []).map((s) => s.name), 'All sources',
        (filters.sources || []).find((s) => String(s.id) === browseFilters.source)?.name || '');
      // Keep selected source ID associated with its display label after filter refresh.
      const sourceSelect = $('opehhSourceFilter');
      if (browseFilters.source && filters.sources?.some((s) => String(s.id) === browseFilters.source)) {
        sourceSelect.value = filters.sources.find((s) => String(s.id) === browseFilters.source).name;
      }
      if (typeof window.renderGrid === 'function') window.renderGrid('browseGrid', browseItems);
      if (more) more.textContent = items.length ? 'Load more' : 'No more titles';
    } catch (error) {
      if (requestId === browseRequest && typeof window.setMessage === 'function') {
        window.setMessage(grid, error.message || 'Browse failed. Try again.', true);
      }
      if (more) more.textContent = 'Retry';
    } finally {
      if (more) more.disabled = false;
    }
  }

  function activateBrowse() {
    installBrowseControls();
    if (typeof window.loadBrowse === 'function') {
      window.loadBrowse = (page = 1) => loadBrowseMode(page);
    }
    const more = $('loadMoreBtn');
    if (more) more.onclick = () => loadBrowseMode(browsePage + 1);
  }

  installWebtoonToggle();
  activateBrowse();
  document.addEventListener('DOMContentLoaded', () => { installWebtoonToggle(); activateBrowse(); }, { once:true });
})();
