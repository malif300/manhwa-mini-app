/* Manhwa Opehh enhancements. Loaded after the app's inline script. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;
  let imageObserver = null;
  let isLoadingNext = false;
  let heartbeatInterval = null;
  let isFullscreen = false;

  const css = `
    /* Bigger bottom nav symbols */
    #bottomNav .nav-tab { font-size: 14px; }
    #bottomNav .nav-tab br + * { display: block; margin-top: 2px; font-size: 10px; }
    
    /* Splash effects */
    #splash .opehh-mark { position:relative; isolation:isolate; overflow:hidden; }
    #splash .opehh-mark::before { content:""; position:absolute; inset:-50%; z-index:-1; background:linear-gradient(105deg,transparent 42%,rgba(126,249,255,.55) 49%,rgba(169,149,255,.62) 51%,transparent 58%); animation:opehh-sweep 1.15s steps(10,end) infinite; }
    #splash .opehh-mark::after { content:""; position:absolute; inset:0; z-index:-1; background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.08) 7px,transparent 8px); animation:opehh-scan 1.6s steps(2,end) infinite; }
    #splash .opehh-title { color:#e7edff; text-shadow:2px 0 #7ef9ff,-2px 0 #a995ff,0 0 20px rgba(126,249,255,.3); animation:opehh-flicker 2.4s steps(1,end) infinite; }
    #splash .opehh-subtitle { color:#9aa8c2; letter-spacing:.28em; text-transform:uppercase; font-size:9px; }
    @keyframes opehh-sweep { 0%{transform:translateX(-70%) skewX(-15deg)}65%{transform:translateX(65%) skewX(-15deg)}72%{transform:translateX(59%) skewX(-12deg)}100%{transform:translateX(150%) skewX(-15deg)} }
    @keyframes opehh-scan { 50%{transform:translateY(3px);opacity:.12} }
    @keyframes opehh-flicker { 0%,88%,100%{transform:none;clip-path:none}89%{transform:translateX(2px);clip-path:inset(15% 0 68%)}91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)}93%{transform:none;clip-path:inset(40% 0 40%)} }
    
    /* Webtoon mode */
    #readerView.opehh-webtoon #readerContent { padding-top:3.5rem!important; padding-bottom:9rem!important; scroll-behavior:auto; }
    #readerView.opehh-webtoon #readerContent img { display:block; width:100%; max-width:none; height:auto; margin:0; border-radius:0!important; }
    
    /* Disable image long press */
    #readerContent img { -webkit-touch-callout: none; user-select: none; pointer-events: auto; }
    
    /* Infinite Scroll Loader */
    #opehhInfiniteLoader { text-align: center; padding: 20px; color: #aeb8ca; font-size: 12px; display: none; }
    #opehhInfiniteLoader.show { display: block; }
    
    /* Header Glitch Effect */
    .header-opehh-title { position:relative; color:#f5f6f8; text-shadow:2px 0 #bcf36b,-2px 0 #a995ff; animation:logoGlitch 2.4s steps(1,end) infinite; }
    @keyframes logoGlitch { 0%,88%,100%{transform:none;clip-path:none}89%{transform:translateX(2px);clip-path:inset(15% 0 68%)}91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)}93%{transform:none;clip-path:inset(40% 0 40%)} }

    /* Blackout Screen */
    #opehhBlackout { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.95); display: none; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; }
    #opehhBlackout.show { display: flex; }

    @media(prefers-reduced-motion:reduce){#splash .opehh-mark::before,#splash .opehh-mark::after,#splash .opehh-title,.header-opehh-title{animation:none!important}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const hasPremiumAccess = () => $('accountPlan')?.dataset?.premium === 'true';

  // --- HEADER & UI CHANGES ---
  function applyUIChanges() {
    try {
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

      // Header text replacement
      const browseHeader = $('browseView')?.querySelector('header');
      if (browseHeader && !$('opehhFullscreenBtn')) {
        const titleContainer = $('browseTitleContainer');
        if (titleContainer) {
          titleContainer.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[.24em] text-lime-300">Explore</p><h1 class="mt-1 text-2xl font-bold header-opehh-title">Manhwa Opehh</h1>`;
        }
        
        // Add Fullscreen button with TOGGLE logic
        const btn = document.createElement('button');
        btn.id = 'opehhFullscreenBtn';
        btn.className = 'ml-2 text-slate-400 hover:text-lime-200 text-lg z-50 relative';
        btn.innerHTML = '⛶';
        btn.title = 'Toggle Fullscreen';
        
        btn.onclick = () => {
          const tg = window.Telegram?.WebApp;
          
          if (isFullscreen) {
            if (tg?.exitFullscreen) tg.exitFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
            isFullscreen = false;
            btn.innerHTML = '⛶';
          } else {
            if (tg?.requestFullscreen) tg.requestFullscreen();
            else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            isFullscreen = true;
            btn.innerHTML = '✕';
          }
        };

        const controlsDiv = browseHeader.querySelector('.mb-4 > div:last-child');
        if (controlsDiv) controlsDiv.appendChild(btn);
      }
    } catch (e) {
      console.warn("UI Changes Error:", e);
    }
  }
  applyUIChanges();
  document.addEventListener('DOMContentLoaded', applyUIChanges);

  // Disable Context Menu on Images
  $('readerContent')?.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });

  // --- WEBTOON TOGGLE ---
  function installWebtoonToggle() {
    try {
      const view = $('readerView');
      const header = $('readerTopBar');
      if (!view || !header || header.querySelector('#opehhWebtoonToggle')) return;
      
      const button = document.createElement('button');
      button.id = 'opehhWebtoonToggle';
      button.type = 'button';
      button.className = 'rounded-lg border border-white/10 px-2 py-1 text-[10px] font-semibold text-slate-300 ml-2 z-50 relative';
      button.textContent = 'Webtoon';
      button.title = 'Continuous vertical pages';
      button.hidden = true;
      
      button.addEventListener('click', () => {
        if (!hasPremiumAccess()) { 
          if (typeof window.showToast === 'function') window.showToast('Webtoon mode is available to Premium readers.');
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
    } catch (e) {
      console.warn("Webtoon Toggle Error:", e);
    }
  }
  installWebtoonToggle();
  document.addEventListener('DOMContentLoaded', () => { installWebtoonToggle(); }, { once:true });

  // --- INFINITE SCROLL & HEARTBEAT LOGIC ---
  async function loadNextChapterInfinite() {
    if (!webtoonEnabled || isLoadingNext) return;
    
    if (typeof window.currentChapterIndex === 'undefined' || typeof window.currentChapters === 'undefined') return;
    
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
      if ($('prevBtn')) $('prevBtn').disabled = false;
      if ($('nextBtn')) $('nextBtn').disabled = nextIdx === window.currentChapters.length - 1;
      
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

  // --- HEARTBEAT & BLACKOUT ---
  function showBlackout() {
    let blackout = $('opehhBlackout');
    if (!blackout) {
      blackout = document.createElement('div');
      blackout.id = 'opehhBlackout';
      blackout.innerHTML = `
        <h2 class="text-2xl font-bold text-rose-500 mb-2">Out of Reading Time</h2>
        <p class="text-sm text-slate-300 mb-6">You have used your 5 hours for today. Do missions or get Premium to keep reading.</p>
        <div class="space-y-3 w-full max-w-xs">
          <button onclick="window.Telegram?.WebApp?.close()" class="w-full rounded-xl bg-lime-300 py-3 font-bold text-black">Get Premium</button>
          <button onclick="document.getElementById('opehhBlackout').classList.remove('show'); document.querySelector('[data-tab=\\'more\\']').click();" class="w-full rounded-xl border border-white/10 bg-[#121621] py-3 font-bold text-white">Do Missions</button>
          <button onclick="document.getElementById('opehhBlackout').classList.remove('show'); closeReader();" class="w-full rounded-xl py-3 text-sm text-slate-400">Close</button>
        </div>
      `;
      document.body.appendChild(blackout);
    }
    blackout.classList.add('show');
  }

  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    
    window.apiFetch('/api/heartbeat', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (data.timeLeft === 0) {
          showBlackout();
          closeReader();
        }
      }).catch(console.warn);

    heartbeatInterval = setInterval(async () => {
      if (!$('readerView')?.classList.contains('flex')) return;
      
      try {
        const res = await window.apiFetch('/api/heartbeat', { method: 'POST' });
        const data = await res.json();
        if (data.timeLeft === 0) {
          showBlackout();
          closeReader();
        }
      } catch (e) {
        console.warn("Heartbeat failed", e);
      }
    }, 60000);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // --- WRAPPERS ---
  if (typeof window.openReader === 'function') {
    const originalOpenReader = window.openReader;
    window.openReader = async function (index) {
      const content = $('readerContent');
      const view = $('readerView');
      const result = await originalOpenReader.apply(this, arguments);
      
      startHeartbeat();
      
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
        
        const loader = document.createElement('div');
        loader.id = 'opehhInfiniteLoader';
        loader.innerHTML = '<div class="spinner mx-auto mb-2"></div> Loading next chapter...';
        content.appendChild(loader);
      });
      return result;
    };
  }

  if (typeof window.closeReader === 'function') {
    const originalCloseReader = window.closeReader;
    window.closeReader = function() {
      stopHeartbeat();
      return originalCloseReader.apply(this, arguments);
    };
  }

  // --- IMAGE LOGIC ---
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
  
  // FIXED: Changed from observeImageRetry to observeReaderImages
  observeReaderImages();

})();
