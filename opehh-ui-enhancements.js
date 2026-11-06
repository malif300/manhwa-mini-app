/* Manhwa Opehh enhancements. Load after the app's existing inline script. */
(() => {
  'use strict';

  const OWNER_ID = 1405846034;
  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;

  const css = `
    /* Slightly larger bottom tabs only; chapter toolbar layout is unchanged. */
    #bottomNav .nav-tab {
      min-height: 60px;
      padding-top: 10px;
      padding-bottom: calc(9px + env(safe-area-inset-bottom));
    }
    #bottomNav .nav-tab svg { width: 22px; height: 22px; }

    /* Opehh splash treatment reuses the app's existing logo and layout. */
    #splash .opehh-mark { position: relative; isolation: isolate; overflow: hidden; }
    #splash .opehh-mark::before {
      content: ""; position: absolute; inset: -50%; z-index: -1;
      background: linear-gradient(105deg, transparent 42%, rgba(126,249,255,.55) 49%, rgba(169,149,255,.62) 51%, transparent 58%);
      animation: opehh-sweep 1.15s steps(10,end) infinite;
    }
    #splash .opehh-mark::after {
      content: ""; position: absolute; inset: 0; z-index: -1;
      background: repeating-linear-gradient(0deg, transparent 0 6px, rgba(255,255,255,.08) 7px, transparent 8px);
      animation: opehh-scan 1.6s steps(2,end) infinite;
    }
    #splash .opehh-title {
      color: #e7edff;
      text-shadow: 2px 0 #7ef9ff, -2px 0 #a995ff, 0 0 20px rgba(126,249,255,.3);
      animation: opehh-flicker 2.4s steps(1,end) infinite;
    }
    #splash .opehh-subtitle { color: #9aa8c2; letter-spacing: .28em; text-transform: uppercase; font-size: 9px; }
    @keyframes opehh-sweep {
      0% { transform: translateX(-70%) skewX(-15deg); }
      65% { transform: translateX(65%) skewX(-15deg); }
      72% { transform: translateX(59%) skewX(-12deg); }
      100% { transform: translateX(150%) skewX(-15deg); }
    }
    @keyframes opehh-scan { 50% { transform: translateY(3px); opacity: .12; } }
    @keyframes opehh-flicker {
      0%,88%,100% { transform: none; clip-path: none; }
      89% { transform: translateX(2px); clip-path: inset(15% 0 68%); }
      91% { transform: translateX(-2px); clip-path: inset(65% 0 12%); }
      93% { transform: none; clip-path: inset(40% 0 40%); }
    }

    /* Webtoon mode: continuous full-width vertical panels without gaps. */
    #readerView.opehh-webtoon #readerContent { scroll-behavior: auto; }
    #readerView.opehh-webtoon #readerContent img {
      display: block; width: 100%; max-width: none; height: auto;
      margin: 0; border-radius: 0 !important;
    }
    @media (prefers-reduced-motion: reduce) {
      #splash .opehh-mark::before, #splash .opehh-mark::after, #splash .opehh-title { animation: none !important; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const getUserId = () => Number(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 0);
  const hasPremiumAccess = () =>
    getUserId() === OWNER_ID || $('accountPlan')?.dataset?.premium === 'true';

  // Keep the splash's existing structure and icon; only update its label/effects.
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

  // Reset old title data synchronously. Existing request-ID guards still decide
  // which response may render when users tap titles quickly in succession.
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

  // Keep chapter rendering untouched. Prioritize only the first viewport after
  // the existing reader has inserted its images; don't pre-download duplicates.
  if (typeof window.openReader === 'function') {
    const originalOpenReader = window.openReader;
    window.openReader = async function (index) {
      const content = $('readerContent');
      const view = $('readerView');
      if (content) {
        content.replaceChildren();
        content.scrollTop = 0;
      }
      if (view) view.classList.toggle('opehh-webtoon', webtoonEnabled);

      const result = await originalOpenReader.apply(this, arguments);
      requestAnimationFrame(() => {
        if (!content) return;
        const images = [...content.querySelectorAll('img')];
        images.forEach((img, i) => {
          img.decoding = 'async';
          if (i < 4) img.loading = 'eager';
          if (i === 0) img.fetchPriority = 'high';
        });
        if (view) view.classList.toggle('opehh-webtoon', webtoonEnabled);
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
    button.title = 'Continuous vertical webtoon reading';
    button.hidden = true;

    button.addEventListener('click', () => {
      if (!hasPremiumAccess()) {
        window.showToast?.('Webtoon mode is available to the owner and Premium readers.');
        return;
      }
      webtoonEnabled = !webtoonEnabled;
      view.classList.toggle('opehh-webtoon', webtoonEnabled);
      button.textContent = webtoonEnabled ? 'Webtoon ✓' : 'Webtoon';
      const content = $('readerContent');
      if (content) content.scrollTop = 0;
    });

    const buttons = header.querySelectorAll('button');
    if (buttons.length > 1) header.insertBefore(button, buttons[buttons.length - 1]);
    else header.appendChild(button);

    const updateButton = () => {
      const opened = view.classList.contains('flex') && !view.classList.contains('hidden');
      const access = hasPremiumAccess();
      button.hidden = !opened;
      button.disabled = !access;
      button.classList.toggle('opacity-50', !access);
      button.title = access
        ? 'Toggle continuous vertical webtoon reading'
        : 'Webtoon mode is available to the owner and Premium readers';
    };

    new MutationObserver(updateButton).observe(view, { attributes: true, attributeFilter: ['class'] });
    const accountPlan = $('accountPlan');
    if (accountPlan) new MutationObserver(updateButton).observe(accountPlan, { attributes: true, attributeFilter: ['data-premium'] });
    updateButton();
  }

  installWebtoonToggle();
  document.addEventListener('DOMContentLoaded', installWebtoonToggle, { once: true });
})();
