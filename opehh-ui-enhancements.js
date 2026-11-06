/* Manhwa Opehh enhancements. Loaded by index.html after the app's inline script. */
(() => {
  'use strict';

  const OWNER_ID = 1405846034;
  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;
  let imageObserver = null;

  const css = `
    /* Slightly larger bottom tabs only; keep existing app styling. */
    #bottomNav .nav-tab { min-height:60px; padding-top:10px; padding-bottom:calc(9px + env(safe-area-inset-bottom)); }
    #bottomNav .nav-tab svg { width:22px; height:22px; }
    /* Opehh splash: dramatic glitch, retaining original logo layout. */
    #splash .opehh-mark { position:relative; isolation:isolate; overflow:hidden; }
    #splash .opehh-mark::before { content:""; position:absolute; inset:-50%; z-index:-1; background:linear-gradient(105deg,transparent 42%,rgba(126,249,255,.55) 49%,rgba(169,149,255,.62) 51%,transparent 58%); animation:opehh-sweep 1.15s steps(10,end) infinite; }
    #splash .opehh-mark::after { content:""; position:absolute; inset:0; z-index:-1; background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.08) 7px,transparent 8px); animation:opehh-scan 1.6s steps(2,end) infinite; }
    #splash .opehh-title { color:#e7edff; text-shadow:2px 0 #7ef9ff,-2px 0 #a995ff,0 0 20px rgba(126,249,255,.3); animation:opehh-flicker 2.4s steps(1,end) infinite; }
    #splash .opehh-subtitle { color:#9aa8c2; letter-spacing:.28em; text-transform:uppercase; font-size:9px; }
    @keyframes opehh-sweep { 0%{transform:translateX(-70%) skewX(-15deg)}65%{transform:translateX(65%) skewX(-15deg)}72%{transform:translateX(59%) skewX(-12deg)}100%{transform:translateX(150%) skewX(-15deg)} }
    @keyframes opehh-scan { 50%{transform:translateY(3px);opacity:.12} }
    @keyframes opehh-flicker { 0%,88%,100%{transform:none;clip-path:none}89%{transform:translateX(2px);clip-path:inset(15% 0 68%)}91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)}93%{transform:none;clip-path:inset(40% 0 40%)} }
    /* True continuous Webtoon presentation: full-width pages, no gaps/toolbars. */
    #readerView.opehh-webtoon #readerContent { padding-top:0!important; padding-bottom:0!important; scroll-behavior:auto; }
    #readerView.opehh-webtoon #readerContent img { display:block; width:100%; max-width:none; height:auto; margin:0; border-radius:0!important; }
    #readerView.opehh-webtoon #readerTopBar.opehh-webtoon-hidden,
    #readerView.opehh-webtoon #readerBottomBar.opehh-webtoon-hidden { opacity:0; pointer-events:none; }
    @media(prefers-reduced-motion:reduce){#splash .opehh-mark::before,#splash .opehh-mark::after,#splash .opehh-title{animation:none!important}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const telegramId = () => Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0);
  const hasPremiumAccess = () => telegramId() === OWNER_ID || $('accountPlan')?.dataset?.premium === 'true';

  // Rebrand, but do not restructure, the existing splash screen.
  const splash = $('splash');
  if (splash) {
    const mark = splash.querySelector('.logo-mark') || splash.querySelector('div');
    if (mark) {
      mark.classList.add('opehh-mark');
      mark.setAttribute('aria-label', 'Manhwa Opehh');
    }
    const heading = splash.querySelector('h1');
    if (heading) {
      heading.textContent = 'MANHWA OPEHH';
      heading.classList.add('opehh-title');
    }
    const message = $('splashMessage');
    if (message && !splash.querySelector('.opehh-subtitle')) {
      const subtitle = document.createElement('p');
      subtitle.className = 'opehh-subtitle mt-4';
      subtitle.textContent = 'Stories beyond the frame';
      message.insertAdjacentElement('afterend', subtitle);
    }
  }

  // Retries transient image failures without changing the app's page renderer.
  function attachImageRetry(img) {
    if (img.dataset.opehhRetryAttached) return;
    img.dataset.opehhRetryAttached = 'true';
    img.addEventListener('error', () => {
      const attempt = Number(img.dataset.opehhRetryCount || 0);
      if (attempt >= 3 || !img.src) return;
      const nextAttempt = attempt + 1;
      img.dataset.opehhRetryCount = String(nextAttempt);
      const base = img.dataset.opehhOriginalSrc || img.src;
      img.dataset.opehhOriginalSrc = base;
      const delay = 250 * nextAttempt;
      setTimeout(() => {
        if (!img.isConnected) return;
        const retryUrl = new URL(base, window.location.href);
        retryUrl.searchParams.set('opehh_retry', `${Date.now()}_${nextAttempt}`);
        img.src = retryUrl.toString();
      }, delay);
    });
  }

  function observeReaderImages() {
    const content = $('readerContent');
    if (!content || imageObserver) return;
    imageObserver = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('img')) attachImageRetry(node);
          node.querySelectorAll?.('img').forEach(attachImageRetry);
        }
      }
    });
    imageObserver.observe(content, { childList: true, subtree: true });
    content.querySelectorAll('img').forEach(attachImageRetry);
  }
  observeReaderImages();

  // Clear stale details synchronously. Existing request guards prevent old
  // responses winning if a reader taps title A and then title B quickly.
  if (typeof window.openDetails === 'function') {
    const originalOpenDetails = window.openDetails;
    window.openDetails = function (id) {
      const cover = $('detailCover');
      if (cover) {
        cover.onerror = null;
        cover.removeAttribute('src');
        cover.alt = 'Loading cover';
      }
      if ($('detailTitle')) $('detailTitle').textContent = 'Loading title…';
      if ($('detailsHeaderTitle')) $('detailsHeaderTitle').textContent = '';
      if ($('detailDescription')) $('detailDescription').textContent = '';
      if ($('detailGenres')) $('detailGenres').replaceChildren();
      if ($('chapterList')) $('chapterList').textContent = 'Loading chapters…';
      return originalOpenDetails.apply(this, arguments);
    };
  }

  // The app already creates its first three pages eagerly. Ensure retry support,
  // preserve chosen Webtoon mode when changing chapters, and promote first pages.
  if (typeof window.openReader === 'function') {
    const originalOpenReader = window.openReader;
    window.openReader = async function (index) {
      const content = $('readerContent');
      const view = $('readerView');
      if (content) {
        content.replaceChildren();
        content.scrollTop = 0;
      }
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
        observeReaderImages();
      });
      return result;
    };
  }

  function setWebtoon(enabled, button) {
    webtoonEnabled = enabled;
    const view = $('readerView');
    const top = $('readerTopBar');
    const bottom = $('readerBottomBar');
    const content = $('readerContent');
    if (!view) return;

    view.classList.toggle('opehh-webtoon', enabled);
    button.textContent = enabled ? 'Webtoon ✓' : 'Webtoon';
    if (content) content.scrollTop = 0;

    // Webtoon is a distraction-free vertical flow. Tapping the page lets the
    // existing reader controls reappear; closing the reader restores them.
    if (enabled) {
      top?.classList.add('opehh-webtoon-hidden');
      bottom?.classList.add('opehh-webtoon-hidden');
    } else {
      top?.classList.remove('opehh-webtoon-hidden');
      bottom?.classList.remove('opehh-webtoon-hidden');
    }
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
    button.title = 'Continuous vertical Webtoon reader';
    button.hidden = true;
    button.addEventListener('click', () => {
      if (!hasPremiumAccess()) {
        window.showToast?.('Webtoon mode is available to the owner and Premium readers.');
        return;
      }
      setWebtoon(!webtoonEnabled, button);
    });

    const headerButtons = header.querySelectorAll('button');
    if (headerButtons.length > 1) header.insertBefore(button, headerButtons[headerButtons.length - 1]);
    else header.appendChild(button);

    const updateButton = () => {
      const opened = view.classList.contains('flex') && !view.classList.contains('hidden');
      const allowed = hasPremiumAccess();
      button.hidden = !opened;
      button.disabled = !allowed;
      button.classList.toggle('opacity-50', !allowed);
      button.title = allowed
        ? 'Toggle continuous vertical Webtoon reading'
        : 'Webtoon mode is available to the owner and Premium readers';
    };

    new MutationObserver(updateButton).observe(view, { attributes: true, attributeFilter: ['class'] });
    const plan = $('accountPlan');
    if (plan) new MutationObserver(updateButton).observe(plan, { attributes: true, attributeFilter: ['data-premium'] });
    updateButton();
  }

  // Webtoon page taps reveal/hide bars; normal reader tap behavior is preserved.
  $('readerContent')?.addEventListener('click', (event) => {
    if (!webtoonEnabled || !(event.target instanceof HTMLImageElement)) return;
    const top = $('readerTopBar');
    const bottom = $('readerBottomBar');
    const hidden = top?.classList.contains('opehh-webtoon-hidden');
    top?.classList.toggle('opehh-webtoon-hidden', !hidden);
    bottom?.classList.toggle('opehh-webtoon-hidden', !hidden);
  });

  // Closing the reader resets only the mode state, never the existing controls.
  $('readerView')?.addEventListener('transitionend', () => {
    const view = $('readerView');
    if (view?.classList.contains('hidden') && webtoonEnabled) {
      webtoonEnabled = false;
      view.classList.remove('opehh-webtoon');
      $('readerTopBar')?.classList.remove('opehh-webtoon-hidden');
      $('readerBottomBar')?.classList.remove('opehh-webtoon-hidden');
    }
  });

  installWebtoonToggle();
})();
