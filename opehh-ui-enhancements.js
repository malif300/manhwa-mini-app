/* Manhwa Opehh enhancements. Loaded after the app's inline script. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;
  let imageObserver = null;
  let isLoadingNext = false;

  const css = `
    #bottomNav .nav-tab svg { width:24px; height:24px; }
    
    /* DISABLE LONG PRESS ON IMAGES EVERYWHERE */
    img { -webkit-touch-callout: none; user-select: none; pointer-events: none; }
    
    #splash .opehh-mark { position:relative; isolation:isolate; overflow:hidden; }
    #splash .opehh-mark::before { content:""; position:absolute; inset:-50%; z-index:-1; background:linear-gradient(105deg,transparent 42%,rgba(126,249,255,.55) 49%,rgba(169,149,255,.62) 51%,transparent 58%); animation:opehh-sweep 1.15s steps(10,end) infinite; }
    #splash .opehh-mark::after { content:""; position:absolute; inset:0; z-index:-1; background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.08) 7px,transparent 8px); animation:opehh-scan 1.6s steps(2,end) infinite; }
    #splash .opehh-title { color:#e7edff; text-shadow:2px 0 #7ef9ff,-2px 0 #a995ff,0 0 20px rgba(126,249,255,.3); animation:opehh-flicker 2.4s steps(1,end) infinite; }
    #splash .opehh-subtitle { color:#9aa8c2; letter-spacing:.28em; text-transform:uppercase; font-size:9px; }
    @keyframes opehh-sweep { 0%{transform:translateX(-70%) skewX(-15deg)}65%{transform:translateX(65%) skewX(-15deg)}72%{transform:translateX(59%) skewX(-12deg)}100%{transform:translateX(150%) skewX(-15deg)} }
    @keyframes opehh-scan { 50%{transform:translateY(3px);opacity:.12} }
    @keyframes opehh-flicker { 0%,88%,100%{transform:none;clip-path:none}89%{transform:translateX(2px);clip-path:inset(15% 0 68%)}91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)}93%{transform:none;clip-path:inset(40% 0 40%)} }
    
    #readerView.opehh-webtoon #readerContent { padding-top:3.5rem!important; padding-bottom:9rem!important; scroll-behavior:auto; }
    #readerView.opehh-webtoon #readerContent img { display:block; width:100%; max-width:none; height:auto; margin:0; border-radius:0!important; }
    
    #opehhInfiniteLoader { text-align: center; padding: 20px; color: #aeb8ca; font-size: 12px; display: none; }
    #opehhInfiniteLoader.show { display: block; }
    
    @media(prefers-reduced-motion:reduce){#splash .opehh-mark::before,#splash .opehh-mark::after,#splash .opehh-title{animation:none!important}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Only check the dataset, no owner ID bypass
  const hasPremiumAccess = () => $('accountPlan')?.dataset?.premium === 'true';

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

  async function loadNextChapterInfinite() {
    if (!webtoonEnabled || isLoadingNext) return;
    
    const nextIdx = window.currentChapterIndex + 1;
    if (nextIdx >= window.currentChapters.length) return;
    
    isLoadingNext = true;
    const loader = $('opehhInfiniteLoader');
    if (loader) loader.classList.add('show');
    
    try {
      const nextChapter = window.currentChapters[nextIdx];
      const content = $('readerContent');
      
      const divider = document.createElement('div');
      divider.style.cssText = 'text-align:center; padding:20px; color:#bcf36b; font-size:12px; font-weight:bold;';
      divider.textContent = `--- ${nextChapter.name || `Chapter ${nextChapter.number}`} ---`;
      content.appendChild(divider);

      const res = await window.apiFetch(`/api/chapter/${encodeURIComponent(nextChapter.id)}`);
      const data = await res.json();
      const pages = data.pages || [];
      
      pages.forEach((url, n) => {
        const im = document.createElement('img');
        im.alt = `Page ${n+1}`;
        im.loading = 'lazy';
        im.decoding = 'async';
        const src = window.resolveImage(url);
        im.src = src;
        let tries = 0;
        im.onerror = () => {
          if (tries++ < 2) im.src = `${src}${src.includes('?')?'&':'?'}retry=${Date.now()}-${tries}`;
          else { im.onerror = null; im.alt = `Page ${n+1} failed`; im.classList.add('cover-fallback'); }
        };
        content.appendChild(im);
      });
      
      window.currentChapterIndex = nextIdx;
      $('prevBtn').disabled = false;
      $('nextBtn').disabled = nextIdx === window.currentChapters.length - 1;
      
      window.apiFetch(`/api/chapter/${encodeURIComponent(nextChapter.id)}/read`, { method: 'POST' }).catch(console.warn);
      
    } catch (e) {
      console.warn("Infinite scroll load failed", e);
    } finally {
      isLoadingNext = false;
      if (loader) loader.classList.remove('show');
    }
  }

  $('readerContent')?.addEventListener('scroll', (e) => {
    if (!webtoonEnabled) return;
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
      loadNextChapterInfinite();
    }
  });

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
          if (i < 4)
