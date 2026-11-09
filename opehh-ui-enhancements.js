/* Manhwa Opehh enhancements. Loaded after the app's inline script. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let webtoonEnabled = false;
  let imageObserver = null;
  let isLoadingNext = false;
  let heartbeatInterval = null;
  let isFullscreen = false;
  let lastLevel = 1;
  let lastTimeLeft = null;
  let popupShownForZero = false;
  let readerProgressBarEl = null;
  let readerTapLeft = null;
  let readerTapRight = null;

  const OWNER_ID = 1405846034;
  const PREMIUM_CHAT_URL = 'https://t.me/malif300';

  const isOwner = () => {
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (tgUser && Number(tgUser.id) === OWNER_ID) return true;
      if (window.__opehhIsOwner) return true;
      const plan = $('accountPlan');
      if (plan && plan.dataset && plan.dataset.owner === 'true') return true;
      const badge = document.querySelector('[data-opehh-owner="true"]');
      if (badge) return true;
    } catch (e) {}
    return false;
  };

  const isPremiumUser = () => {
    if (isOwner()) return true;
    const plan = $('accountPlan');
    if (!plan) return false;
    const txt = (plan.textContent || '').toLowerCase();
    if (plan.dataset && plan.dataset.premium === 'true') return true;
    if (txt.includes('premium') && !txt.includes('free')) return true;
    return false;
  };

  // ---------- LEVEL THEME (Mira Color & Glow) ----------
  // 1-5 Green, 6-10 Blue, 11-20 Gold, 21-30 Violet, 31+ Rainbow
  function levelThemeFor(level) {
    const lv = Number(level) || 1;
    if (lv >= 31) return { name: 'Legend', color: '#ff3b5c', color2: '#ffd700', progress: 'linear-gradient(90deg,#ff3b5c,#ffb300,#22c55e,#3b82f6,#a855f7)', glow: '0 0 0 3px rgba(255,255,255,.25), 0 0 22px rgba(255,59,92,.7), 0 0 40px rgba(168,85,247,.5)', confetti: ['#ff3b5c','#ffb300','#22c55e','#3b82f6','#a855f7','#ffffff'], rainbow: true };
    if (lv >= 21) return { name: 'Purple', color: '#a855f7', color2: '#ec4899', progress: '#a855f7', glow: '0 0 18px rgba(168,85,247,.65)', confetti: ['#a855f7','#ec4899','#ffffff'], rainbow: false };
    if (lv >= 11) return { name: 'Gold', color: '#facc15', color2: '#a855f7', progress: '#facc15', glow: '0 0 18px rgba(250,204,21,.65)', confetti: ['#facc15','#a855f7','#ffffff'], rainbow: false };
    if (lv >= 6) return { name: 'Blue', color: '#3b82f6', color2: '#e5e7eb', progress: '#3b82f6', glow: '0 0 18px rgba(59,130,246,.65)', confetti: ['#3b82f6','#e5e7eb','#ffffff'], rainbow: false };
    return { name: 'Green', color: '#22c55e', color2: '#ffffff', progress: '#22c55e', glow: '0 0 18px rgba(34,197,94,.6)', confetti: ['#22c55e','#ffffff','#bcf36b'], rainbow: false };
  }

  function parseLevelFromText() {
    const el = $('accountLevel');
    if (!el) return 1;
    const m = (el.textContent || '').match(/(\d+)/);
    return m ? Number(m[1]) : 1;
  }

  function applyLevelTheme(level) {
    const theme = levelThemeFor(level);
    document.documentElement.style.setProperty('--opehh-level', theme.color);
    document.documentElement.style.setProperty('--opehh-level-2', theme.color2);
    document.documentElement.style.setProperty('--opehh-level-progress', theme.progress);
    document.documentElement.style.setProperty('--opehh-level-glow', theme.glow);
    document.body.classList.toggle('opehh-legend', !!theme.rainbow);
    document.body.dataset.opehhLevel = String(level);
    const avatar = $('accountAvatar');
    if (avatar) {
      avatar.classList.add('opehh-avatar-glow');
      avatar.style.setProperty('--opehh-glow', theme.glow);
    }
    const bar = $('accountXpBar');
    if (bar) {
      bar.style.background = theme.progress;
      if (theme.rainbow) bar.classList.add('opehh-rainbow-bar');
      else bar.classList.remove('opehh-rainbow-bar');
    }
    return theme;
  }

  // ---------- CSS (Mira Quick Wins + All Animations) ----------
  const css = `
    :root{ --opehh-level:#22c55e; --opehh-level-2:#ffffff; --opehh-level-progress:#22c55e; --opehh-level-glow:0 0 18px rgba(34,197,94,.6); }
    /* Quick Wins P0 */
    button, .nav-tab, .opehh-card, [role="button"] { transition: all .2s ease; }
    button:active, .nav-tab:active, .opehh-card:active { transform: scale(.95); }
    * { -webkit-tap-highlight-color: transparent; }
    #viewsContainer > section { animation: opehh-page-in .28s ease both; }
    @keyframes opehh-page-in { from { opacity:0; transform: translateX(18px) scale(.98); } to { opacity:1; transform:none; } }
    .opehh-page-out { animation: opehh-page-out .22s ease both !important; }
    @keyframes opehh-page-out { to { opacity:0; transform: translateX(-18px) scale(.98); } }

    /* Bottom nav bigger */
    #bottomNav .nav-tab { font-size: 14px; }
    #bottomNav .nav-tab br + * { display:block; margin-top:2px; font-size:10px; }

    /* Splash */
    #splash .opehh-mark { position:relative; isolation:isolate; overflow:hidden; }
    #splash .opehh-mark::before { content:""; position:absolute; inset:-50%; z-index:-1; background:linear-gradient(105deg,transparent 42%,rgba(126,249,255,.55) 49%,rgba(169,149,255,.62) 51%,transparent 58%); animation:opehh-sweep 1.15s steps(10,end) infinite; }
    #splash .opehh-mark::after { content:""; position:absolute; inset:0; z-index:-1; background:repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.08) 7px,transparent 8px); animation:opehh-scan 1.6s steps(2,end) infinite; }
    #splash .opehh-title { color:#e7edff; text-shadow:2px 0 #7ef9ff,-2px 0 #a995ff,0 0 20px rgba(126,249,255,.3); animation:opehh-flicker 2.4s steps(1,end) infinite; }
    #splash .opehh-subtitle { color:#9aa8c2; letter-spacing:.28em; text-transform:uppercase; font-size:9px; }
    @keyframes opehh-sweep { 0%{transform:translateX(-70%) skewX(-15deg)} 65%{transform:translateX(65%) skewX(-15deg)} 72%{transform:translateX(59%) skewX(-12deg)} 100%{transform:translateX(150%) skewX(-15deg)} }
    @keyframes opehh-scan { 50%{transform:translateY(3px);opacity:.12} }
    @keyframes opehh-flicker { 0%,88%,100%{transform:none;clip-path:none} 89%{transform:translateX(2px);clip-path:inset(15% 0 68%)} 91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)} 93%{transform:none;clip-path:inset(40% 0 40%)} }

    /* Header */
    .header-opehh-title { position:relative; color:#f5f6f8; text-shadow:2px 0 #bcf36b,-2px 0 #a995ff; animation:logoGlitch 2.4s steps(1,end) infinite; }
    @keyframes logoGlitch { 0%,88%,100%{transform:none;clip-path:none} 89%{transform:translateX(2px);clip-path:inset(15% 0 68%)} 91%{transform:translateX(-2px);clip-path:inset(65% 0 12%)} 93%{transform:none;clip-path:inset(40% 0 40%)} }

    /* Avatar glow by level */
    .opehh-avatar-glow { border-color: var(--opehh-level) !important; box-shadow: var(--opehh-level-glow); animation: opehh-avatar-pulse 2.4s ease-in-out infinite; }
    @keyframes opehh-avatar-pulse { 0%,100%{ box-shadow: var(--opehh-level-glow); transform:scale(1);} 50%{ box-shadow: 0 0 28px var(--opehh-level); transform:scale(1.03);} }
    body.opehh-legend .opehh-avatar-glow { animation: opehh-rainbow-pulse 2.2s linear infinite; }
    @keyframes opehh-rainbow-pulse { 0%{box-shadow:0 0 18px #ff3b5c} 25%{box-shadow:0 0 18px #ffb300} 50%{box-shadow:0 0 18px #22c55e} 75%{box-shadow:0 0 18px #3b82f6} 100%{box-shadow:0 0 18px #a855f7} }
    .opehh-rainbow-bar { background: linear-gradient(90deg,#ff3b5c,#ffb300,#22c55e,#3b82f6,#a855f7,#ff3b5c) !important; background-size:200% 100% !important; animation: opehh-rainbow-slide 2s linear infinite; }
    @keyframes opehh-rainbow-slide { to { background-position:200% 0; } }

    /* Webtoon */
    #readerView.opehh-webtoon #readerContent { padding-top:3.5rem!important; padding-bottom:9rem!important; scroll-behavior:auto; }
    #readerView.opehh-webtoon #readerContent img { display:block; width:100%; max-width:none; height:auto; margin:0; border-radius:0!important; }

    /* IMAGE PROTECTION: hold cannot download / copy link */
    #readerContent img, #detailCover, .opehh-protected-img {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
      touch-action: manipulation;
      pointer-events: auto;
    }
    #readerContent { -webkit-touch-callout: none; user-select:none; -webkit-user-select:none; }
    .opehh-no-drag { -webkit-user-drag:none; user-select:none; }

    /* Infinite loader */
    #opehhInfiniteLoader { text-align:center; padding:20px; color:#aeb8ca; font-size:12px; display:none; }
    #opehhInfiniteLoader.show { display:block; }

    /* Blackout old - kept but NOT used for full app anymore. Image-only is used. */
    #opehhBlackout { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.95); display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; }
    #opehhBlackout.show { display:flex; }

    /* Continue Reading scale, Recent glow, Refresh spin */
    .opehh-continue-tap { animation: opehh-continue-pop .32s ease; }
    @keyframes opehh-continue-pop { 0%{transform:scale(1)} 40%{transform:scale(1.02)} 100%{transform:scale(1)} }
    .opehh-recent-glow { border:1.5px solid rgba(34,197,94,.7) !important; box-shadow:0 0 18px rgba(34,197,94,.35); animation: opehh-recent-pulse 2.6s ease-in-out infinite; }
    @keyframes opehh-recent-pulse { 0%,100%{ box-shadow:0 0 8px rgba(34,197,94,.25);} 50%{ box-shadow:0 0 22px rgba(34,197,94,.55);} }
    .opehh-refresh-spin { animation: opehh-spin-once .6s ease !important; }
    @keyframes opehh-spin-once { to { transform: rotate(360deg); } }
    .opehh-reorder-in { animation: opehh-reorder .35s ease both; }
    @keyframes opehh-reorder { from { opacity:.4; transform: translateY(6px);} to { opacity:1; transform:none; } }

    /* Details: cover parallax, ripple, add-to-library check */
    #detailCover { transition: transform .3s ease; will-change: transform; }
    #detailCover.opehh-cover-zoom { transform: scale(1.05) rotate(-1deg); }
    .opehh-ripple { position:relative; overflow:hidden; }
    .opehh-ripple-wave { position:absolute; border-radius:50%; background: radial-gradient(circle, rgba(188,243,107,.55) 0%, rgba(188,243,107,0) 70%); transform: translate(-50%,-50%) scale(0); animation: opehh-ripple-anim .55s ease-out forwards; pointer-events:none; z-index:1; }
    @keyframes opehh-ripple-anim { to { transform: translate(-50%,-50%) scale(2.6); opacity:0; } }
    .opehh-added-check { display:inline-flex; align-items:center; gap:6px; }
    .opehh-check-circle { width:18px; height:18px; }
    .opehh-check-circle circle { stroke-dasharray:60; stroke-dashoffset:60; animation: opehh-draw .45s ease forwards; }
    .opehh-check-circle path { stroke-dasharray:20; stroke-dashoffset:20; animation: opehh-draw .3s .35s ease forwards; }
    @keyframes opehh-draw { to { stroke-dashoffset:0; } }

    /* Chapter list */
    .opehh-chapter-in { animation: opehh-chapter-slide .35s ease both; }
    @keyframes opehh-chapter-slide { from { opacity:0; transform: translateX(-14px);} to { opacity:1; transform:none; } }
    .opehh-read-arrow { display:inline-block; transition: transform .18s ease; }
    .opehh-chapter-row:active .opehh-read-arrow, .opehh-chapter-row:hover .opehh-read-arrow { transform: translateX(4px); }
    .opehh-unread-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 10px #22c55e; animation: opehh-dot-pulse 1.6s ease-in-out infinite; flex-shrink:0; }
    @keyframes opehh-dot-pulse { 0%,100%{ transform:scale(1); opacity:1;} 50%{ transform:scale(1.35); opacity:.7;} }

    /* Reader: page curl, progress bar, tap zones, skeleton shimmer */
    #readerContent { position:relative; }
    .opehh-page-curl { animation: opehh-curl .38s ease; }
    @keyframes opehh-curl { 0%{ transform: perspective(900px) rotateY(-10deg) scale(.98); transform-origin:left center; opacity:.7;} 100%{ transform:none; opacity:1;} }
    .opehh-page-curl-back { animation: opehh-curl-back .38s ease; }
    @keyframes opehh-curl-back { 0%{ transform: perspective(900px) rotateY(10deg) scale(.98); transform-origin:right center; opacity:.7;} 100%{ transform:none; opacity:1;} }
    #opehhReaderProgressBar { position:absolute; top:0; left:0; right:0; height:3px; background:rgba(255,255,255,.12); z-index:80; display:none; }
    #opehhReaderProgressBar.show { display:block; }
    #opehhReaderProgressFill { height:100%; width:0%; background: var(--opehh-level-progress); transition: width .25s ease; }
    .opehh-reader-tapzone { position:absolute; top:0; bottom:0; width:33.333%; z-index:65; }
    #opehhTapLeft { left:0; }
    #opehhTapRight { right:0; }
    .opehh-skeleton-shimmer { position:relative; overflow:hidden; background:#151a25; min-height:220px; }
    .opehh-skeleton-shimmer::after { content:""; position:absolute; inset:-40%; background:linear-gradient(105deg,transparent 35%,rgba(190,243,107,.18) 46%,rgba(171,151,255,.22) 49%,transparent 59%); transform:translateX(-70%) skewX(-15deg); animation: opehh-shimmer 1.1s linear infinite; }
    @keyframes opehh-shimmer { to { transform:translateX(150%) skewX(-15deg); } }

    /* Premium panel slide up + blur */
    #premiumPanel { transition: transform .3s ease, opacity .3s ease; }
    #premiumPanel.opehh-panel-in { animation: opehh-panel-up .3s ease both; }
    @keyframes opehh-panel-up { from { transform: translateY(16px); opacity:0;} to { transform:none; opacity:1;} }
    .opehh-premium-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.35); backdrop-filter:blur(8px); z-index:60; }
    #autoScrollBtn.opehh-autoscroll-on { animation: opehh-auto-pulse 1.4s ease-in-out infinite; border-color:#22c55e !important; color:#bcf36b !important; }
    @keyframes opehh-auto-pulse { 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.04);} }
    .opehh-slider-tooltip { position:absolute; transform:translate(-50%,-130%); background:#0f172a; border:1px solid rgba(255,255,255,.15); color:#fff; font-size:11px; font-weight:700; padding:3px 7px; border-radius:8px; pointer-events:none; white-space:nowrap; z-index:90; display:none; }
    .opehh-slider-tooltip.show { display:block; }
    #readerContent.opehh-theme-anim { transition: filter .3s ease, background .3s ease !important; }
    .opehh-brightness-overlay { position:absolute; inset:0; background:#000; pointer-events:none; z-index:66; opacity:0; }

    /* Level-up celebration */
    #opehhLevelUpOverlay { position:fixed; inset:0; z-index:10000; display:none; align-items:center; justify-content:center; flex-direction:column; text-align:center; padding:24px; background:rgba(5,6,10,.82); backdrop-filter:blur(6px); }
    #opehhLevelUpOverlay.show { display:flex; }
    .opehh-level-flash { position:fixed; inset:0; background:#fff; opacity:0; pointer-events:none; z-index:10001; }
    .opehh-level-flash.go { animation: opehh-flash .1s ease; }
    @keyframes opehh-flash { 0%{opacity:.85} 100%{opacity:0} }
    .opehh-level-number { font-size:56px; font-weight:900; line-height:1; animation: opehh-level-bounce .6s cubic-bezier(.2,1.6,.4,1) both; color: var(--opehh-level); text-shadow:0 0 22px var(--opehh-level); }
    @keyframes opehh-level-bounce { 0%{transform:scale(.5); opacity:0} 60%{transform:scale(1.2); opacity:1} 100%{transform:scale(1)} }
    .opehh-xp-float { animation: opehh-xp-up 1s ease forwards; color:#bcf36b; font-weight:800; }
    @keyframes opehh-xp-up { from { transform:translateY(0); opacity:1;} to { transform:translateY(-28px); opacity:0;} }
    .opehh-confetti-piece { position:absolute; top:-10px; width:8px; height:14px; border-radius:2px; animation: opehh-confetti-fall 2s ease-in forwards; pointer-events:none; }
    @keyframes opehh-confetti-fall { to { transform: translateY(110vh) rotate(540deg); opacity:.9; } }
    .opehh-star-particle { position:absolute; font-size:16px; animation: opehh-star-burst .8s ease-out forwards; pointer-events:none; }
    @keyframes opehh-star-burst { to { transform: translate(var(--sx), var(--sy)) scale(1.4); opacity:0; } }

    /* Mission burst */
    .opehh-mission-done { border-color: rgba(34,197,94,.6) !important; background: rgba(34,197,94,.12) !important; animation: opehh-mission-glow 1s ease; }
    @keyframes opehh-mission-glow { 0%{ box-shadow:0 0 0 rgba(34,197,94,0);} 50%{ box-shadow:0 0 22px rgba(34,197,94,.5);} 100%{ box-shadow:none;} }
    .opehh-mission-xp { color:#22c55e; font-weight:800; animation: opehh-xp-up 1s ease forwards; }

    /* Mascot */
    #opehhMascot { position:fixed; bottom:96px; right:16px; z-index:9998; width:72px; height:72px; display:none; align-items:center; justify-content:center; font-size:44px; filter: drop-shadow(0 6px 14px rgba(0,0,0,.5)); animation: opehh-mascot-bounce 1.8s ease-in-out infinite; }
    #opehhMascot.show { display:flex; }
    @keyframes opehh-mascot-bounce { 0%,100%{ transform:translateY(0) rotate(-3deg);} 50%{ transform:translateY(-6px) rotate(3deg);} }
    #opehhMascot .opehh-mascot-bubble { position:absolute; bottom:100%; right:0; background:#0f172a; border:1px solid rgba(255,255,255,.15); font-size:11px; font-weight:700; padding:6px 9px; border-radius:12px; white-space:nowrap; }

    /* Share flip */
    .opehh-share-flip { animation: opehh-flip 0.6s ease; transform-style: preserve-3d; }
    @keyframes opehh-flip { from { transform: rotateY(0);} to { transform: rotateY(360deg);} }
    .opehh-copied-tip { animation: opehh-tip .9s ease both; font-size:11px; font-weight:700; color:#bcf36b; }
    @keyframes opehh-tip { 0%{opacity:0; transform:translateY(4px)} 20%{opacity:1; transform:none} 80%{opacity:1} 100%{opacity:0} }

    /* Free popup + Image-only black */
    #opehhTimePopup { position:fixed; inset:0; z-index:10002; display:none; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); }
    #opehhTimePopup.show { display:flex; }
    #opehhTimePopup .opehh-popup-card { animation: opehh-panel-up .3s ease both; }
    #readerContent.opehh-images-blacked img { visibility:hidden; }
    #opehhImageBlack { position:absolute; inset:0; z-index:67; display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px; background:#000; }
    #opehhImageBlack.show { display:flex; }
    .opehh-premium-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:800; padding:4px 10px; border-radius:999px; background:rgba(250,204,21,.15); border:1px solid rgba(250,204,21,.4); color:#facc15; }
    .opehh-owner-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:900; padding:4px 10px; border-radius:999px; background:linear-gradient(90deg,rgba(255,59,92,.2),rgba(250,204,21,.2)); border:1px solid rgba(255,255,255,.35); color:#fff; }

    @media(prefers-reduced-motion:reduce){
      #splash .opehh-mark::before,#splash .opehh-mark::after,#splash .opehh-title,.header-opehh-title,.opehh-avatar-glow,#opehhMascot{animation:none!important}
      *,*::before,*::after{ transition-duration:.01ms!important; }
    }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const hasPremiumAccess = () => isPremiumUser();

  // ---------- HELPERS ----------
  function haptic(type) {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
        else tg.HapticFeedback.impactOccurred('light');
      } else if (navigator.vibrate) navigator.vibrate(20);
    } catch (e) {}
  }

  function openPremiumChat() {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.openTelegramLink) tg.openTelegramLink(PREMIUM_CHAT_URL);
      else window.open(PREMIUM_CHAT_URL, '_blank');
    } catch (e) { window.open(PREMIUM_CHAT_URL, '_blank'); }
  }

  function formatDateOnly(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(iso); }
  }

  function formatMinutes(mins) {
    const m = Number(mins);
    if (!isFinite(m)) return '—';
    if (m < 60) return m + 'm';
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    return r ? h + 'h ' + r + 'm' : h + 'h';
  }

  // ---------- MISSION NAMES (Mira Voice) ----------
  const MISSION_NAME_MAP = {
    'read 1 chapter': 'Daily Grind ★',
    'read 3 chapters': 'Scroll Reader',
    'read 5 chapters': 'Sage Mode Activated',
    'daily grind': 'Daily Grind ★',
    'sage mode': 'Sage Mode Activated',
    'scroll reader': 'Scroll Reader'
  };
  function prettyMissionName(raw) {
    if (!raw) return 'Daily Mission';
    const key = String(raw).toLowerCase().trim();
    if (MISSION_NAME_MAP[key]) return MISSION_NAME_MAP[key];
    for (const k in MISSION_NAME_MAP) if (key.includes(k)) return MISSION_NAME_MAP[k];
    return raw;
  }

  // ---------- HEADER & UI ----------
  function applyUIChanges() {
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
    const browseHeader = $('browseView')?.querySelector('header');
    if (browseHeader && !$('opehhFullscreenBtn')) {
      const titleContainer = $('browseTitleContainer');
      if (titleContainer) {
        titleContainer.innerHTML = `<p class="text-[10px] font-bold uppercase tracking-[.24em] text-lime-300">Explore</p><h1 class="mt-1 text-2xl font-bold header-opehh-title">Manhwa Opehh</h1>`;
      }
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
          isFullscreen = false; btn.innerHTML = '⛶';
        } else {
          if (tg?.requestFullscreen) tg.requestFullscreen();
          else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
          isFullscreen = true; btn.innerHTML = '✕';
        }
      };
      const controlsDiv = browseHeader.querySelector('.mb-4 > div:last-child');
      if (controlsDiv) controlsDiv.appendChild(btn);
    }
    // Owner / Premium badge in Account header if not present
    const accName = $('accountName');
    if (accName && !document.querySelector('[data-opehh-role-badge]')) {
      const badge = document.createElement('span');
      badge.setAttribute('data-opehh-role-badge', 'true');
      badge.style.marginLeft = '8px';
      if (isOwner()) {
        badge.className = 'opehh-owner-badge';
        badge.textContent = 'OWNER • Unlimited';
        badge.dataset.opehhOwner = 'true';
      } else if (isPremiumUser()) {
        badge.className = 'opehh-premium-badge';
        badge.textContent = 'PREMIUM';
      } else {
        badge.className = 'opehh-premium-badge';
        badge.style.background = 'rgba(255,255,255,.06)';
        badge.style.color = '#cbd5e1';
        badge.style.borderColor = 'rgba(255,255,255,.15)';
        badge.textContent = 'FREE • 5h / day';
      }
      accName.appendChild(badge);
    }
  }
  applyUIChanges();
  document.addEventListener('DOMContentLoaded', applyUIChanges);

  // ---------- IMAGE PROTECTION ----------
  function installImageProtection() {
    // Block context menu, drag, copy on reader + detail images
    document.addEventListener('contextmenu', (e) => {
      const t = e.target;
      if (t && (t.tagName === 'IMG' || t.closest && t.closest('#readerContent, #detailsView'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);
    document.addEventListener('dragstart', (e) => {
      if (e.target && e.target.tagName === 'IMG') { e.preventDefault(); return false; }
    }, true);
    document.addEventListener('copy', (e) => {
      const sel = window.getSelection ? window.getSelection().toString() : '';
      const inReader = e.target && e.target.closest && e.target.closest('#readerContent');
      if (inReader) { e.preventDefault(); return false; }
    }, true);
    // Long-press on iOS: prevent callout via touch handling on reader images
    const content = $('readerContent');
    if (content) {
      content.addEventListener('touchstart', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
          // Allow tap for controls / tap zones, but prevent long-press menu
          // We do not preventDefault here so tap still works, CSS handles callout.
        }
      }, { passive: true });
    }
    // Protect detail cover too
    const cover = $('detailCover');
    if (cover) cover.classList.add('opehh-protected-img');
  }
  installImageProtection();

  // ---------- WEBTOON TOGGLE ----------
  function installWebtoonToggle() {
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
    new MutationObserver(refresh).observe(view, { attributes: true, attributeFilter: ['class'] });
    const plan = $('accountPlan');
    if (plan) new MutationObserver(refresh).observe(plan, { attributes: true, attributeFilter: ['data-premium', 'class'], childList: true, subtree: true });
  }
  installWebtoonToggle();
  document.addEventListener('DOMContentLoaded', installWebtoonToggle);

  // ---------- READER: Progress Bar, Tap Zones, Page Curl, Brightness Overlay ----------
  function ensureReaderExtras() {
    const view = $('readerView');
    const content = $('readerContent');
    if (!view || !content) return;
    if (!readerProgressBarEl) {
      const bar = document.createElement('div');
      bar.id = 'opehhReaderProgressBar';
      bar.innerHTML = '<div id="opehhReaderProgressFill"></div>';
      view.appendChild(bar);
      readerProgressBarEl = bar;
    }
    if (!content.querySelector('#opehhTapLeft')) {
      const left = document.createElement('div');
      left.id = 'opehhTapLeft';
      left.className = 'opehh-reader-tapzone';
      left.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window.loadAdjacentChapter === 'function') { /* page back is handled by prevBtn logic in index.html, we use same */ }
        // Tap left = previous page / chapter: trigger prevBtn if exists
        const prev = $('prevBtn');
        if (prev) { prev.classList.add('opehh-page-curl-back'); setTimeout(() => prev.classList.remove('opehh-page-curl-back'), 400); prev.click(); }
      });
      content.appendChild(left);
      readerTapLeft = left;
    }
    if (!content.querySelector('#opehhTapRight')) {
      const right = document.createElement('div');
      right.id = 'opehhTapRight';
      right.className = 'opehh-reader-tapzone';
      right.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = $('nextBtn');
        if (next) { next.classList.add('opehh-page-curl'); setTimeout(() => next.classList.remove('opehh-page-curl'), 400); next.click(); }
      });
      content.appendChild(right);
      readerTapRight = right;
    }
    if (!content.querySelector('#opehhImageBlack')) {
      const black = document.createElement('div');
      black.id = 'opehhImageBlack';
      black.innerHTML = `
        <div style="font-size:44px; margin-bottom:12px;">📖</div>
        <h2 style="font-size:20px; font-weight:900; color:#fff; margin:0 0 8px;">Out of Reading Time</h2>
        <p style="font-size:13px; color:#cbd5e1; margin:0 0 16px; max-width:300px;">You have used your 5 hours for today. The chapter images are black until you gain time. You can still browse, see details, and check your profile.</p>
        <div style="display:flex; flex-direction:column; gap:10px; width:100%; max-width:300px;">
          <button id="opehhBlackMissionsBtn" style="width:100%; border-radius:12px; background:#bcf36b; padding:12px; font-weight:800; color:#000; border:none;">Do Missions to Gain Time</button>
          <button id="opehhBlackPremiumBtn" style="width:100%; border-radius:12px; background:#facc15; padding:12px; font-weight:800; color:#000; border:none;">Get Premium — @malif300</button>
          <button id="opehhBlackCloseBtn" style="width:100%; border-radius:12px; background:transparent; padding:12px; color:#94a3b8; border:1px solid rgba(255,255,255,.15);">Close Reader & Browse</button>
        </div>
      `;
      content.appendChild(black);
      const mBtn = black.querySelector('#opehhBlackMissionsBtn');
      const pBtn = black.querySelector('#opehhBlackPremiumBtn');
      const cBtn = black.querySelector('#opehhBlackCloseBtn');
      if (mBtn) mBtn.onclick = () => { hideImageBlack(); if (typeof window.closeReader === 'function') window.closeReader(); if (typeof window.switchTab === 'function') window.switchTab('more'); };
      if (pBtn) pBtn.onclick = () => openPremiumChat();
      if (cBtn) cBtn.onclick = () => { hideImageBlack(); if (typeof window.closeReader === 'function') window.closeReader(); };
    }
    if (!content.querySelector('.opehh-brightness-overlay')) {
      const ov = document.createElement('div');
      ov.className = 'opehh-brightness-overlay';
      content.appendChild(ov);
    }
  }

  function updateReaderProgress() {
    const fill = $('opehhReaderProgressFill');
    const bar = $('opehhReaderProgressBar');
    const slider = $('readerSlider');
    if (!fill || !bar) return;
    const view = $('readerView');
    const opened = view && view.classList.contains('flex');
    if (!opened) { bar.classList.remove('show'); return; }
    bar.classList.add('show');
    let pct = 0;
    if (slider) {
      const max = Number(slider.max) || 100;
      const val = Number(slider.value) || 0;
      pct = max ? (val / max) * 100 : 0;
    }
    // Fallback: use scroll position
    const content = $('readerContent');
    if (content && content.scrollHeight > content.clientHeight) {
      const scrollPct = (content.scrollTop / (content.scrollHeight - content.clientHeight)) * 100;
      if (scrollPct > pct) pct = scrollPct;
    }
    fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  function showImageBlack() {
    const content = $('readerContent');
    const black = $('opehhImageBlack');
    if (!content || !black) return;
    content.classList.add('opehh-images-blacked');
    black.classList.add('show');
  }
  function hideImageBlack() {
    const content = $('readerContent');
    const black = $('opehhImageBlack');
    if (content) content.classList.remove('opehh-images-blacked');
    if (black) black.classList.remove('show');
  }
  window.opehhShowImageBlack = showImageBlack;
  window.opehhHideImageBlack = hideImageBlack;

  // ---------- TIME POPUP (Do Missions / Get Premium / X) ----------
  function ensureTimePopup() {
    if ($('opehhTimePopup')) return;
    const pop = document.createElement('div');
    pop.id = 'opehhTimePopup';
    pop.innerHTML = `
      <div class="opehh-popup-card" style="width:100%; max-width:340px; background:#121621; border:1px solid rgba(255,255,255,.12); border-radius:20px; padding:20px; position:relative;">
        <button id="opehhPopupX" style="position:absolute; top:12px; right:12px; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,.08); color:#cbd5e1; border:none; font-size:14px;">✕</button>
        <div style="font-size:36px;">⏰</div>
        <h2 style="font-size:18px; font-weight:900; margin:8px 0 6px;">Out of Reading Time</h2>
        <p style="font-size:13px; color:#cbd5e1; line-height:1.5; margin:0 0 16px;">You have used your 5 hours for today. Do a mission to gain time, or get Premium. The chapter images will stay black until you gain time.</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button id="opehhPopupMissions" style="width:100%; border-radius:12px; background:#bcf36b; padding:12px; font-weight:800; color:#000; border:none;">Do Missions to Gain Time</button>
          <button id="opehhPopupPremium" style="width:100%; border-radius:12px; background:#facc15; padding:12px; font-weight:800; color:#000; border:none;">Get Premium — @malif300 (USD)</button>
          <button id="opehhPopupBrowse" style="width:100%; border-radius:12px; background:transparent; padding:12px; color:#94a3b8; border:1px solid rgba(255,255,255,.15);">Browse Only (Images Stay Black)</button>
        </div>
        <p style="font-size:11px; color:#64748b; margin-top:12px; text-align:center;">Premium is manual bank transfer in USD. Tap Get Premium to chat @malif300.</p>
      </div>
    `;
    document.body.appendChild(pop);
    const x = pop.querySelector('#opehhPopupX');
    const m = pop.querySelector('#opehhPopupMissions');
    const p = pop.querySelector('#opehhPopupPremium');
    const b = pop.querySelector('#opehhPopupBrowse');
    if (x) x.onclick = () => hideTimePopup();
    if (m) m.onclick = () => { hideTimePopup(); if (typeof window.closeReader === 'function') { try { window.closeReader(); } catch(e){} } if (typeof window.switchTab === 'function') window.switchTab('more'); };
    if (p) p.onclick = () => openPremiumChat();
    if (b) b.onclick = () => { hideTimePopup(); if (typeof window.closeReader === 'function') { try { window.closeReader(); } catch(e){} } };
  }
  function showTimePopup() {
    ensureTimePopup();
    const pop = $('opehhTimePopup');
    if (pop) pop.classList.add('show');
    haptic('error');
  }
  function hideTimePopup() {
    const pop = $('opehhTimePopup');
    if (pop) pop.classList.remove('show');
  }
  window.opehhShowTimePopup = showTimePopup;
  window.opehhHideTimePopup = hideTimePopup;

  // ---------- LEVEL-UP CELEBRATION ----------
  function ensureLevelUpOverlay() {
    if ($('opehhLevelUpOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'opehhLevelUpOverlay';
    ov.innerHTML = `
      <div style="font-size:44px; margin-bottom:8px;">🎉</div>
      <div class="opehh-level-number" id="opehhLevelUpNumber">LEVEL UP!</div>
      <p id="opehhLevelUpText" style="font-size:15px; font-weight:700; color:#e2e8f0; margin:12px 0 4px;">You reached a new level!</p>
      <p id="opehhLevelUpSub" style="font-size:12px; color:#94a3b8; margin:0 0 16px;">Keep reading to unlock more glow</p>
      <div id="opehhMascotInLevel" style="font-size:48px; margin-bottom:12px;">🦊</div>
      <button id="opehhLevelUpClaim" style="background:#bcf36b; color:#000; font-weight:900; padding:12px 22px; border-radius:12px; border:none;">Claim Reward</button>
      <button id="opehhLevelUpClose" style="margin-top:10px; background:transparent; color:#94a3b8; border:none; font-size:13px;">Close</button>
    `;
    document.body.appendChild(ov);
    const claim = ov.querySelector('#opehhLevelUpClaim');
    const close = ov.querySelector('#opehhLevelUpClose');
    if (claim) claim.onclick = () => { hideLevelUp(); if (typeof window.showToast === 'function') window.showToast('Reward claimed!'); };
    if (close) close.onclick = () => hideLevelUp();
  }
  function showLevelUp(newLevel, userName) {
    ensureLevelUpOverlay();
    const ov = $('opehhLevelUpOverlay');
    const num = $('opehhLevelUpNumber');
    const txt = $('opehhLevelUpText');
    if (!ov) return;
    const theme = levelThemeFor(newLevel);
    if (num) { num.textContent = 'LEVEL ' + newLevel; num.style.color = theme.color; }
    if (txt) txt.textContent = (userName ? userName + ' → ' : '') + 'Level ' + newLevel + ' • ' + theme.name + ' Glow';
    // Flash 100ms
    const flash = document.createElement('div');
    flash.className = 'opehh-level-flash';
    document.body.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('go'));
    setTimeout(() => flash.remove(), 160);
    // Confetti 2s with level colors
    for (let i = 0; i < 42; i++) {
      const c = document.createElement('div');
      c.className = 'opehh-confetti-piece';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = theme.confetti[i % theme.confetti.length];
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
    // Star particles
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('div');
      s.className = 'opehh-star-particle';
      s.textContent = '✦';
      s.style.left = '50%'; s.style.top = '38%';
      s.style.color = theme.color;
      const ang = (i / 10) * Math.PI * 2;
      s.style.setProperty('--sx', (Math.cos(ang) * 90) + 'px');
      s.style.setProperty('--sy', (Math.sin(ang) * 90) + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
    ov.classList.add('show');
    haptic('success');
    showMascot('Level Up! You look amazing! ✨', 4000);
    setTimeout(() => { if (ov.classList.contains('show')) hideLevelUp(); }, 6000);
  }
  function hideLevelUp() {
    const ov = $('opehhLevelUpOverlay');
    if (ov) ov.classList.remove('show');
  }
  window.opehhShowLevelUp = showLevelUp;

  // ---------- MASCOT ----------
  let mascotTimer = null;
  function ensureMascot() {
    if ($('opehhMascot')) return;
    const m = document.createElement('div');
    m.id = 'opehhMascot';
    m.innerHTML = '<div class="opehh-mascot-bubble" id="opehhMascotBubble" style="display:none;">Hi! Keep reading! 📖</div><span>🦊</span>';
    m.addEventListener('click', () => {
      const b = $('opehhMascotBubble');
      if (b) { b.style.display = b.style.display === 'none' ? 'block' : 'none'; }
    });
    document.body.appendChild(m);
  }
  function showMascot(msg, ms) {
    ensureMascot();
    const m = $('opehhMascot');
    const b = $('opehhMascotBubble');
    if (!m) return;
    if (b && msg) { b.textContent = msg; b.style.display = 'block'; }
    m.classList.add('show');
    if (mascotTimer) clearTimeout(mascotTimer);
    mascotTimer = setTimeout(() => { m.classList.remove('show'); if (b) b.style.display = 'none'; }, ms || 4000);
  }
  window.opehhShowMascot = showMascot;

  // ---------- PREMIUM PANEL ENHANCEMENTS ----------
  function installPremiumPanelEnhancements() {
    const panel = $('premiumPanel');
    if (!panel) return;
    // Slide-up animation when shown
    const obs = new MutationObserver(() => {
      if (!panel.classList.contains('hidden')) {
        panel.classList.add('opehh-panel-in');
        setTimeout(() => panel.classList.remove('opehh-panel-in'), 350);
      }
    });
    obs.observe(panel, { attributes: true, attributeFilter: ['class'] });
    // Auto-scroll pulsate
    const autoBtn = $('autoScrollBtn');
    if (autoBtn) {
      const orig = autoBtn.onclick;
      // We keep original onclick, just add class toggle via observer on text
      const aObs = new MutationObserver(() => {
        const isOn = (autoBtn.textContent || '').includes('Stop') || (autoBtn.textContent || '').includes('ON') || (autoBtn.textContent || '').includes('⏸');
        autoBtn.classList.toggle('opehh-autoscroll-on', isOn);
      });
      aObs.observe(autoBtn, { childList: true, characterData: true, subtree: true });
    }
    // Speed slider tooltip
    const speed = $('scrollSpeed');
    if (speed && !speed.dataset.opehhTip) {
      speed.dataset.opehhTip = '1';
      const tip = document.createElement('div');
      tip.className = 'opehh-slider-tooltip';
      tip.textContent = 'Speed: ' + speed.value;
      speed.parentElement.style.position = 'relative';
      speed.parentElement.appendChild(tip);
      const updateTip = () => { tip.textContent = 'Speed: ' + speed.value; const rect = speed.getBoundingClientRect(); const parentRect = speed.parentElement.getBoundingClientRect(); const pct = (Number(speed.value) - Number(speed.min)) / (Number(speed.max) - Number(speed.min)); tip.style.left = (pct * 100) + '%'; };
      speed.addEventListener('input', () => { tip.classList.add('show'); updateTip(); });
      speed.addEventListener('change', () => setTimeout(() => tip.classList.remove('show'), 600));
      speed.addEventListener('pointerdown', () => { tip.classList.add('show'); updateTip(); });
    }
    // Brightness live overlay
    const bright = $('readerBrightness');
    if (bright && !bright.dataset.opehhBright) {
      bright.dataset.opehhBright = '1';
      bright.addEventListener('input', () => {
        const content = $('readerContent');
        let ov = content ? content.querySelector('.opehh-brightness-overlay') : null;
        if (ov) {
          const v = Number(bright.value) || 100;
          // 50 = dark (overlay .4), 130 = bright (overlay 0)
          if (v < 100) ov.style.opacity = String((100 - v) / 100 * 0.6);
          else ov.style.opacity = '0';
        }
        if (content) content.classList.add('opehh-theme-anim');
      });
    }
    // Theme button smooth 300ms
    const themeBtn = $('readerThemeBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const content = $('readerContent');
        if (content) content.classList.add('opehh-theme-anim');
      });
    }
  }
  installPremiumPanelEnhancements();
  document.addEventListener('DOMContentLoaded', installPremiumPanelEnhancements);

  // ---------- DETAILS: Cover, Ripple, Add-to-Library, Chapters ----------
  function installDetailsEnhancements() {
    const cover = $('detailCover');
    if (cover && !cover.dataset.opehhParallax) {
      cover.dataset.opehhParallax = '1';
      const details = $('detailsView');
      if (details) {
        details.addEventListener('scroll', () => {
          const sc = details.scrollTop;
          if (sc > 20 && sc < 200) cover.style.transform = 'scale(1.02) rotate(-' + Math.min(3, sc / 60) + 'deg)';
          else cover.style.transform = '';
        }, { passive: true });
      }
      cover.addEventListener('click', () => {
        cover.classList.add('opehh-cover-zoom');
        setTimeout(() => cover.classList.remove('opehh-cover-zoom'), 350);
      });
    }
    // Ripple on Start Reading / Resume buttons inside resumeContainer
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('#resumeContainer button, #addToLibraryBtn, #detailsView button');
      if (!btn) return;
      if (!btn.classList.contains('opehh-ripple')) btn.classList.add('opehh-ripple');
      const rect = btn.getBoundingClientRect();
      const wave = document.createElement('span');
      wave.className = 'opehh-ripple-wave';
      const size = Math.max(rect.width, rect.height);
      wave.style.width = size + 'px'; wave.style.height = size + 'px';
      wave.style.left = (e.clientX - rect.left) + 'px';
      wave.style.top = (e.clientY - rect.top) + 'px';
      btn.appendChild(wave);
      setTimeout(() => wave.remove(), 600);
    });
    // Chapter list stagger + unread dot + read arrow
    const chapterList = $('chapterList');
    if (chapterList && !chapterList.dataset.opehhChap) {
      chapterList.dataset.opehhChap = '1';
      const obs = new MutationObserver(() => {
        const rows = chapterList.querySelectorAll(':scope > *');
        rows.forEach((row, idx) => {
          if (row.dataset.opehhDone) return;
          row.dataset.opehhDone = '1';
          row.classList.add('opehh-chapter-row', 'opehh-chapter-in');
          row.style.animationDelay = (Math.min(idx, 12) * 0.04) + 's';
          // Add unread dot if text says unread / not read, and read arrow
          const txt = (row.textContent || '').toLowerCase();
          if (!row.querySelector('.opehh-unread-dot') && (txt.includes('unread') || txt.includes('new'))) {
            const dot = document.createElement('span');
            dot.className = 'opehh-unread-dot';
            row.prepend(dot);
          }
          const readBtn = row.querySelector('button');
          if (readBtn && !readBtn.querySelector('.opehh-read-arrow')) {
            const arrow = document.createElement('span');
            arrow.className = 'opehh-read-arrow';
            arrow.textContent = ' →';
            readBtn.appendChild(arrow);
          }
        });
      });
      obs.observe(chapterList, { childList: true, subtree: true });
    }
  }
  installDetailsEnhancements();
  document.addEventListener('DOMContentLoaded', installDetailsEnhancements);

  // ---------- PROFILE: Premium Start / End + Time + Level ----------
  function ensureProfilePremiumBlock() {
    const moreView = $('moreView');
    if (!moreView) return;
    if ($('opehhPremiumDates')) return;
    const planEl = $('accountPlan');
    if (!planEl) return;
    const block = document.createElement('div');
    block.id = 'opehhPremiumDates';
    block.style.marginTop = '10px';
    block.style.padding = '10px 12px';
    block.style.borderRadius = '12px';
    block.style.background = 'rgba(0,0,0,.18)';
    block.style.border = '1px solid rgba(255,255,255,.06)';
    block.style.fontSize = '12px';
    block.style.lineHeight = '1.6';
    block.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:#94a3b8;">Premium Start</span><strong id="opehhPremiumStart">—</strong></div>
      <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:#94a3b8;">Premium End</span><strong id="opehhPremiumEnd">—</strong></div>
      <div style="display:flex; justify-content:space-between; gap:8px;"><span style="color:#94a3b8;">Plan</span><strong id="opehhPremiumPlan">—</strong></div>
      <div id="opehhPremiumNote" style="font-size:11px; color:#94a3b8; margin-top:6px;">Premium is manual bank transfer in USD. Tap Get Premium to chat @malif300.</div>
      <button id="opehhGetPremiumBtn" style="margin-top:10px; width:100%; border-radius:10px; background:#facc15; color:#000; font-weight:800; padding:10px; border:none;">Get Premium — @malif300</button>
    `;
    planEl.parentElement.appendChild(block);
    const btn = block.querySelector('#opehhGetPremiumBtn');
    if (btn) btn.onclick = () => openPremiumChat();
  }

  function updateProfilePremiumDisplay(data) {
    ensureProfilePremiumBlock();
    const startEl = $('opehhPremiumStart');
    const endEl = $('opehhPremiumEnd');
    const planEl = $('opehhPremiumPlan');
    if (!startEl || !endEl) return;
    if (!data) return;
    // Backend may send premium_start / premiumStart / premium_since, and premium_end / premium_until / premiumEnd
    const start = data.premium_start || data.premiumStart || data.premium_since || data.premiumSince || null;
    const end = data.premium_end || data.premiumEnd || data.premium_until || data.premiumUntil || data.premiumExpiry || null;
    const plan = data.premium_plan || data.premiumPlan || data.plan || data.tier || null;
    const amount = data.premium_amount_usd || data.premiumAmountUsd || data.premium_amount || null;
    if (isOwner()) {
      if (startEl) startEl.textContent = 'OWNER';
      if (endEl) endEl.textContent = 'Unlimited';
      if (planEl) planEl.textContent = 'OWNER • Unlimited';
      const note = $('opehhPremiumNote');
      if (note) note.textContent = 'You are the owner. No time limit, no black images.';
      const btn = $('opehhGetPremiumBtn');
      if (btn) btn.style.display = 'none';
      return;
    }
    if (start) startEl.textContent = formatDateOnly(start);
    if (end) endEl.textContent = formatDateOnly(end);
    if (planEl) {
      if (plan && amount) planEl.textContent = plan + ' • $' + amount + ' USD';
      else if (plan) planEl.textContent = plan;
      else if (isPremiumUser()) planEl.textContent = 'Premium';
      else planEl.textContent = 'Free • 5h / day';
    }
    // If premium, hide Get Premium button? Keep it for renewal
    const btn = $('opehhGetPremiumBtn');
    if (btn && isPremiumUser()) btn.textContent = 'Renew Premium — @malif300';
  }
  window.opehhUpdateProfilePremium = updateProfilePremiumDisplay;

  // ---------- MISSIONS: Pretty Names + Burst ----------
  function installMissionsEnhancements() {
    const list = $('missionsList');
    if (!list) return;
    if (list.dataset.opehhMission) return;
    list.dataset.opehhMission = '1';
    const obs = new MutationObserver(() => {
      const cards = list.querySelectorAll(':scope > div');
      cards.forEach((card) => {
        const nameEl = card.querySelector('p');
        if (nameEl && !nameEl.dataset.opehhPretty) {
          nameEl.dataset.opehhPretty = '1';
          nameEl.textContent = prettyMissionName(nameEl.textContent);
        }
        const btn = card.querySelector('button');
        if (btn && !btn.dataset.opehhMissionBtn) {
          btn.dataset.opehhMissionBtn = '1';
          const origClick = btn.onclick;
          btn.addEventListener('click', () => {
            // Burst will happen after claim succeeds via loadMissions wrapper below
            // Here we do immediate feedback: check draws, +XP floats
            if (btn.textContent.trim() === 'Claim') {
              card.classList.add('opehh-mission-done');
              const float = document.createElement('span');
              float.className = 'opehh-mission-xp';
              float.textContent = '+ XP';
              float.style.position = 'absolute';
              float.style.right = '12px';
              float.style.top = '8px';
              card.style.position = 'relative';
              card.appendChild(float);
              setTimeout(() => float.remove(), 1100);
              setTimeout(() => card.classList.remove('opehh-mission-done'), 1100);
              haptic('success');
            }
          });
        }
      });
    });
    obs.observe(list, { childList: true, subtree: true });
  }
  installMissionsEnhancements();
  document.addEventListener('DOMContentLoaded', installMissionsEnhancements);

  // ---------- LIBRARY / HISTORY / BROWSE: Recent Glow, Refresh Spin, Reorder ----------
  function markRecentGlow() {
    // History: first item = most recent
    const hist = $('historyList');
    if (hist) {
      const first = hist.querySelector(':scope > *:first-child');
      if (first && !first.classList.contains('opehh-recent-glow')) {
        first.classList.add('opehh-recent-glow', 'opehh-card');
      }
    }
    const lib = $('libraryGrid');
    if (lib) {
      const first = lib.querySelector(':scope > *:first-child');
      if (first) first.classList.add('opehh-card');
    }
  }
  function installRefreshSpin() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.includes('refresh') || txt.includes('↻')) {
        btn.classList.add('opehh-refresh-spin');
        setTimeout(() => btn.classList.remove('opehh-refresh-spin'), 650);
        setTimeout(() => markRecentGlow(), 400);
        const list = $('historyList') || $('libraryGrid') || $('browseGrid');
        if (list) {
          Array.from(list.children).forEach((child, i) => {
            child.classList.remove('opehh-reorder-in');
            setTimeout(() => child.classList.add('opehh-reorder-in'), 80 + i * 40);
          });
        }
      }
    });
  }
  installRefreshSpin();

  // ---------- SHARE FLIP ----------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('[data-share], .opehh-share-btn');
    if (!btn) return;
    btn.classList.add('opehh-share-flip');
    setTimeout(() => btn.classList.remove('opehh-share-flip'), 650);
    const tip = document.createElement('span');
    tip.className = 'opehh-copied-tip';
    tip.textContent = 'Copied!';
    btn.appendChild(tip);
    setTimeout(() => tip.remove(), 950);
  });

  // ---------- HEARTBEAT & BLACK IMAGE (FIXED) ----------
  function showBlackout() {
    // FIXED: Old code showed full-app blackout. New rule: image-only black.
    // If owner or premium, never show black.
    if (isOwner() || isPremiumUser()) { hideImageBlack(); hideTimePopup(); return; }
    // If reader is open, show image-only black + popup
    const readerOpen = $('readerView') && $('readerView').classList.contains('flex');
    if (readerOpen) {
      showImageBlack();
      if (!popupShownForZero) {
        popupShownForZero = true;
        showTimePopup();
      }
    } else {
      // Not in reader: just popup, do NOT block whole app
      if (!popupShownForZero) {
        popupShownForZero = true;
        showTimePopup();
      }
    }
  }
  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    // Heartbeat counts ONLY when in reader (rule: time counts inside manhwa image, stops when back)
    const doBeat = async () => {
      const readerOpen = $('readerView') && $('readerView').classList.contains('flex');
      if (!readerOpen) return; // STOP when not in image
      if (isOwner()) return; // Owner unlimited, no heartbeat needed
      try {
        const res = await window.apiFetch('/api/heartbeat', { method: 'POST' });
        const data = await res.json();
        lastTimeLeft = data.timeLeft;
        if (data.timeLeft === 0) {
          showBlackout();
        } else if (data.timeLeft > 0) {
          popupShownForZero = false;
          hideImageBlack();
        }
        // Update profile time display if available
        if (data.timeLeft !== undefined && $('accountTimeLeft')) {
          if (!isOwner() && !isPremiumUser()) {
            $('accountTimeLeft').textContent = formatMinutes(Math.ceil(data.timeLeft / 60)) + ' left today';
          }
        }
      } catch (e) { console.warn('Heartbeat failed', e); }
    };
    doBeat();
    heartbeatInterval = setInterval(doBeat, 60000);
  }
  function stopHeartbeat() {
    if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
  }

  // ---------- WRAPPERS ----------
  if (typeof window.openReader === 'function') {
    const originalOpenReader = window.openReader;
    window.openReader = async function (index) {
      ensureReaderExtras();
      hideImageBlack();
      popupShownForZero = false;
      const content = $('readerContent');
      const view = $('readerView');
      const result = await originalOpenReader.apply(this, arguments);
      // Check time before showing images: if time is 0, show image black immediately
      if (!isOwner() && !isPremiumUser() && lastTimeLeft === 0) {
        showImageBlack();
        showTimePopup();
      }
      startHeartbeat();
      requestAnimationFrame(() => {
        if (!content) return;
        const images = [...content.querySelectorAll('img')];
        images.forEach((img, i) => {
          attachImageRetry(img);
          img.decoding = 'async';
          if (i < 4) img.loading = 'eager';
          if (i === 0) img.fetchPriority = 'high';
          img.classList.add('opehh-no-drag');
        });
        if (view) view.classList.toggle('opehh-webtoon', webtoonEnabled);
        content.scrollTop = 0;
        observeReaderImages();
        updateReaderProgress();
        // Skeleton shimmer for loading next page is handled by loader below
        let loader = content.querySelector('#opehhInfiniteLoader');
        if (!loader) {
          loader = document.createElement('div');
          loader.id = 'opehhInfiniteLoader';
          loader.innerHTML = '<div class="spinner mx-auto mb-2"></div> Loading next chapter...';
          content.appendChild(loader);
        }
      });
      return result;
    };
  }

  if (typeof window.closeReader === 'function') {
    const originalCloseReader = window.closeReader;
    window.closeReader = function () {
      stopHeartbeat();
      hideImageBlack();
      hideTimePopup();
      // Time stops when back from image (heartbeat stopped above)
      return originalCloseReader.apply(this, arguments);
    };
  }

  if (typeof window.switchTab === 'function') {
    const origSwitch = window.switchTab;
    window.switchTab = function (name) {
      const container = $('viewsContainer');
      const current = container ? container.querySelector('section:not(.hidden)') : null;
      if (current) current.classList.add('opehh-page-out');
      setTimeout(() => {
        if (current) current.classList.remove('opehh-page-out');
        const r = origSwitch.apply(this, arguments);
        markRecentGlow();
        // Refresh level theme on tab change
        applyLevelTheme(parseLevelFromText());
        return r;
      }, 120);
    };
  }

  // Wrap loadAccount to detect level-up + update premium display + level theme
  // We cannot directly wrap if loadAccount is not on window, so we poll for it via observing accountLevel
  const levelObsTarget = $('accountLevel');
  if (levelObsTarget) {
    const obs = new MutationObserver(() => {
      const lv = parseLevelFromText();
      const theme = applyLevelTheme(lv);
      if (lv > lastLevel) {
        const nameEl = $('accountName');
        const name = nameEl ? nameEl.textContent.replace(/OWNER.*|PREMIUM|FREE.*/g, '').trim() : '';
        showLevelUp(lv, name);
      }
      lastLevel = lv;
    });
    obs.observe(levelObsTarget, { childList: true, characterData: true, subtree: true });
    // Init
    lastLevel = parseLevelFromText();
    applyLevelTheme(lastLevel);
  }

  // Wrap toggleLibrary to show Added check
  if (typeof window.toggleLibrary === 'function') {
    const origToggle = window.toggleLibrary;
    window.toggleLibrary = async function () {
      const btn = $('addToLibraryBtn');
      const wasAdd = btn && (btn.textContent || '').includes('Add');
      const res = await origToggle.apply(this, arguments);
      if (btn) {
        if (wasAdd) {
          btn.innerHTML = '<span class="opehh-added-check"><svg class="opehh-check-circle" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="#22c55e" stroke-width="2"/><path d="M6 10.5 L9 13.5 L14 7" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg> Added</span>';
          btn.classList.add('opehh-continue-tap');
          setTimeout(() => btn.classList.remove('opehh-continue-tap'), 400);
          haptic('success');
        }
      }
      return res;
    };
  }

  // ---------- INFINITE SCROLL + IMAGE RETRY + SKELETON ----------
  async function loadNextChapterInfinite() {
    if (isLoadingNext || !webtoonEnabled) return;
    const content = $('readerContent');
    if (!content) return;
    const nextIdx = (window.currentChapterIndex ?? 0) + 1;
    if (!window.currentChapters || nextIdx >= window.currentChapters.length) return;
    isLoadingNext = true;
    let loader = $('opehhInfiniteLoader');
    if (loader) loader.classList.add('show');
    // Show skeleton shimmer while loading
    const shimmer = document.createElement('div');
    shimmer.className = 'opehh-skeleton-shimmer';
    shimmer.style.height = '420px';
    shimmer.style.margin = '12px';
    shimmer.style.borderRadius = '12px';
    content.appendChild(shimmer);
    try {
      const nextChapter = window.currentChapters[nextIdx];
      const res = await window.apiFetch(`/api/chapter/${encodeURIComponent(nextChapter.id)}`);
      const data = await res.json();
      const pages = data.pages || [];
      shimmer.remove();
      pages.forEach((url, n) => {
        const im = document.createElement('img');
        im.alt = `Page ${n + 1}`;
        im.loading = 'lazy';
        im.decoding = 'async';
        im.classList.add('opehh-no-drag');
        const src = window.resolveImage(url);
        im.src = src;
        let tries = 0;
        im.onerror = () => {
          if (tries++ < 2) im.src = `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}-${tries}`;
          else { im.onerror = null; im.alt = `Page ${n + 1} failed`; im.classList.add('cover-fallback'); }
        };
        content.appendChild(im);
      });
      window.currentChapterIndex = nextIdx;
      if ($('prevBtn')) $('prevBtn').disabled = false;
      if ($('nextBtn')) $('nextBtn').disabled = nextIdx === window.currentChapters.length - 1;
      window.apiFetch(`/api/chapter/${encodeURIComponent(nextChapter.id)}/read`, { method: 'POST' }).catch(console.warn);
      updateReaderProgress();
    } catch (e) {
      console.warn('Infinite scroll load failed', e);
      shimmer.remove();
    } finally {
      isLoadingNext = false;
      if (loader) loader.classList.remove('show');
    }
  }

  if ($('readerContent')) {
    $('readerContent').addEventListener('scroll', (e) => {
      if (!webtoonEnabled) { updateReaderProgress(); return; }
      const el = e.target;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadNextChapterInfinite();
      updateReaderProgress();
    });
    // Tap zones are inside readerContent, scroll listener still works
  }

  // Prev / Next press feedback + page curl
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    const c = $('readerContent');
    if (c) { c.classList.remove('opehh-page-curl'); void c.offsetWidth; c.classList.add('opehh-page-curl-back'); setTimeout(() => c.classList.remove('opehh-page-curl-back'), 400); }
    updateReaderProgress();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const c = $('readerContent');
    if (c) { c.classList.remove('opehh-page-curl-back'); void c.offsetWidth; c.classList.add('opehh-page-curl'); setTimeout(() => c.classList.remove('opehh-page-curl'), 400); }
    updateReaderProgress();
  });
  const slider = $('readerSlider');
  if (slider) slider.addEventListener('input', updateReaderProgress);

  // ---------- IMAGE RETRY ----------
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
        if (node.matches('img')) { attachImageRetry(node); node.classList.add('opehh-no-drag'); }
        node.querySelectorAll?.('img').forEach((im) => { attachImageRetry(im); im.classList.add('opehh-no-drag'); });
      });
    }));
    imageObserver.observe(content, { childList: true, subtree: true });
    content.querySelectorAll('img').forEach((im) => { attachImageRetry(im); im.classList.add('opehh-no-drag'); });
  }
  observeReaderImages();

  // ---------- CONTINUE READING TAP (History / Library) ----------
  document.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('#historyList > *, #libraryGrid > *, #updatesList > *');
    if (!card) return;
    card.classList.add('opehh-continue-tap');
    setTimeout(() => card.classList.remove('opehh-continue-tap'), 350);
  });

  // ---------- INIT ----------
  ensureReaderExtras();
  ensureTimePopup();
  ensureLevelUpOverlay();
  ensureMascot();
  ensureProfilePremiumBlock();
  applyLevelTheme(parseLevelFromText());
  markRecentGlow();

  // Expose helpers for later codes (backend will fill premium data)
  window.opehhApplyLevelTheme = applyLevelTheme;
  window.opehhLevelThemeFor = levelThemeFor;
  window.opehhOpenPremiumChat = openPremiumChat;

  // If backend later provides account data via window, update profile
  document.addEventListener('opehh-account-loaded', (e) => {
    if (e.detail) updateProfilePremiumDisplay(e.detail);
  });

})();
