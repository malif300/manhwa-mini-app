(function(){
  'use strict';
  if (window.OpehhEnhancements) return;
  var $ = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

  /* ---------- Level helpers (from pictures) ---------- */
  function levelColor(level){
    level = Number(level)||1;
    if (level>=31) return 'rainbow';
    if (level>=21) return '#a855f7';
    if (level>=11) return '#f59e0b';
    if (level>=6) return '#3b82f6';
    return '#22c55e';
  }
  function levelName(level){
    level = Number(level)||1;
    if (level>=31) return 'Legend';
    if (level>=21) return 'Sage';
    if (level>=11) return 'Master';
    if (level>=6) return 'Knight';
    return 'Novice';
  }
  function missionName(raw){
    var map = {
      'daily_grind':'Daily Grind',
      'daily':'Daily Grind',
      'sage_mode':'Sage Mode Activated',
      'sage':'Sage Mode Activated',
      'scroll_reader':'Scroll Reader',
      'scroll':'Scroll Reader'
    };
    if (!raw) return 'Daily Grind';
    var k = String(raw).toLowerCase();
    return map[k] || raw;
  }

  /* ---------- ADDITIVE CSS ONLY - does NOT replace your CSS ---------- */
  function injectCSS(){
    if (document.getElementById('opehh-enhancements-css')) return;
    var st = document.createElement('style');
    st.id = 'opehh-enhancements-css';
    st.textContent = [
      '/* Quick Wins from pictures - ONLY this overrides tap feel */',
      'button, .card, .nav-tab, .chapter-row, .manga-card { transition: all 0.2s ease !important; }',
      'button:active, .card:active, .nav-tab:active, .chapter-row:active, .manga-card:active { transform: scale(0.95) !important; }',
      '/* Level glow - ONLY on level elements, NOT whole UI */',
      '.opehh-level-glow { box-shadow: 0 0 0 2px var(--opehh-level, #22c55e), 0 0 14px var(--opehh-level, #22c55e); }',
      '.opehh-level-31 { animation: opehh-rainbow-glow 3s linear infinite !important; }',
      '@keyframes opehh-rainbow-glow { 0%{box-shadow:0 0 12px #ef4444} 25%{box-shadow:0 0 12px #f59e0b} 50%{box-shadow:0 0 12px #22c55e} 75%{box-shadow:0 0 12px #3b82f6} 100%{box-shadow:0 0 12px #a855f7} }',
      '@keyframes opehh-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }',
      '@keyframes opehh-float-up { 0%{opacity:0; transform:translateY(10px)} 20%{opacity:1} 100%{opacity:0; transform:translateY(-40px)} }',
      '@keyframes opehh-flash { 0%{opacity:0.7} 100%{opacity:0} }',
      '@keyframes opehh-spin { to{transform:rotate(360deg)} }',
      '@keyframes opehh-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }',
      '@keyframes opehh-fade-in { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }',
      '@keyframes opehh-shimmer { to{background-position:-200% 0} }',
      '.opehh-refresh-spin { animation: opehh-spin 0.6s linear !important; }',
      '.opehh-fade-in { animation: opehh-fade-in 0.25s ease !important; }',
      '/* Chapter list stagger - additive, uses your existing .chapter-row */',
      '.opehh-chapter-stagger { animation: opehh-fade-in 0.3s ease both !important; }',
      '/* Reader page curl - additive, does NOT change reader layout */',
      '#readerContent img.opehh-page { transform-origin: left center; transition: transform 0.35s ease, filter 0.2s !important; }',
      '#readerContent img.opehh-page.opehh-page-turn { transform: perspective(800px) rotateY(-8deg) scale(0.99); }',
      '/* Image-only black - ONLY image, NOT whole app */',
      '#readerContent.opehh-black-images img { filter: brightness(0) !important; }',
      '#readerContent.opehh-black-images { background:#000 !important; }',
      '/* Image protection - reader images only */',
      '#readerContent img { -webkit-touch-callout: none !important; -webkit-user-select: none !important; user-select: none !important; -webkit-user-drag: none !important; }',
      '/* Level-up overlay - created dynamically, does NOT replace any page */',
      '#opehh-levelup { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.85); display:none; align-items:center; justify-content:center; flex-direction:column; text-align:center; padding:20px; }',
      '#opehh-levelup.show { display:flex; }',
      '#opehh-levelup .opehh-big { font-size:42px; font-weight:900; color:#f59e0b; }',
      '#opehh-levelup .opehh-fox { font-size:64px; animation: opehh-bounce 1s infinite; }',
      '#opehh-flash { position:fixed; inset:0; z-index:199; background:#fff; opacity:0; pointer-events:none; }',
      '#opehh-flash.show { animation: opehh-flash 0.1s ease-out forwards; }',
      '/* Mission burst - toast, does NOT replace missions box */',
      '#opehh-mission-burst { position:fixed; top:70px; left:50%; transform:translateX(-50%); z-index:200; background:#bcf36b; color:#000; padding:10px 16px; border-radius:999px; font-weight:800; font-size:13px; display:none; box-shadow:0 8px 24px rgba(188,243,107,0.4); }',
      '#opehh-mission-burst.show { display:block; }',
      '/* Time popup - created dynamically, does NOT replace any page */',
      '#opehh-time-overlay { position:fixed; inset:0; z-index:100; background:rgba(0,0,0,0.7); display:none; align-items:flex-end; justify-content:center; }',
      '#opehh-time-overlay.show { display:flex; }',
      '#opehh-time-overlay .opehh-popup { background:#121621; border-radius:20px 20px 0 0; padding:20px 16px 28px; width:100%; max-width:520px; position:relative; animation: opehh-fade-in 0.25s ease; }',
      '#opehh-time-overlay .opehh-x { position:absolute; right:16px; top:16px; background:#222; border:0; color:#fff; width:32px; height:32px; border-radius:50%; font-size:16px; }',
      '/* Confetti / star particles */',
      '.opehh-confetti { position:fixed; z-index:201; pointer-events:none; font-size:18px; animation: opehh-float-up 2s ease-out forwards; }',
      '.opehh-xp-float { position:fixed; z-index:201; pointer-events:none; color:#bcf36b; font-weight:900; font-size:16px; animation: opehh-float-up 1.2s ease-out forwards; }',
      '/* Premium tools panel - additive, slides up, does NOT replace reader */',
      '#opehh-tools-panel { position:fixed; left:0; right:0; bottom:0; z-index:90; background:#121621; border-radius:20px 20px 0 0; padding:18px 16px 28px; transform:translateY(110%); transition:transform 0.3s ease; max-height:70vh; overflow:auto; }',
      '#opehh-tools-panel.open { transform:translateY(0); }',
      '#opehh-tools-panel .opehh-auto-on { animation: opehh-pulse 1s infinite !important; }',
      '/* Recent glow - additive, uses level color */',
      '.opehh-recent-glow { box-shadow:0 0 0 2px var(--opehh-level, #bcf36b), 0 0 16px var(--opehh-level, #bcf36b) !important; }',
      '/* Owner badge - additive badge, does NOT replace header */',
      '.opehh-owner-badge { display:inline-block; font-size:10px; padding:2px 7px; border-radius:999px; font-weight:800; background:linear-gradient(90deg,#f59e0b,#ef4444); color:#000; margin-left:6px; }',
      '.opehh-premium-badge { display:inline-block; font-size:10px; padding:2px 7px; border-radius:999px; font-weight:800; background:#f59e0b; color:#000; margin-left:6px; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- Level-up celebration (from pictures) ---------- */
  function ensureLevelUpDOM(){
    if (!$('#opehh-levelup')){
      var d = document.createElement('div');
      d.id = 'opehh-levelup';
      d.innerHTML = '<div class="opehh-fox">🦊</div><div class="opehh-big">LEVEL UP!</div><div id="opehh-levelup-text" style="font-size:18px;font-weight:800;margin-top:8px;color:#fff"></div><div id="opehh-levelup-reward" style="color:#f59e0b;font-size:13px;margin-top:6px"></div><button id="opehh-levelup-close" style="margin-top:18px;background:#bcf36b;color:#000;border:0;border-radius:12px;padding:11px 16px;font-weight:800">Awesome! Continue</button>';
      document.body.appendChild(d);
      $('#opehh-levelup-close').addEventListener('click', function(){ d.classList.remove('show'); });
    }
    if (!$('#opehh-flash')){
      var f = document.createElement('div');
      f.id = 'opehh-flash';
      document.body.appendChild(f);
    }
    if (!$('#opehh-mission-burst')){
      var b = document.createElement('div');
      b.id = 'opehh-mission-burst';
      document.body.appendChild(b);
    }
  }
  function celebrateLevelUp(level, extra){
    ensureLevelUpDOM();
    var lvl = Number(level)||1;
    var txt = $('#opehh-levelup-text');
    if (txt) txt.textContent = 'You reached Level ' + lvl + ' • ' + levelName(lvl);
    var rew = $('#opehh-levelup-reward');
    if (rew) rew.textContent = extra || '🦊 Sage Mode Activated! + Time Reward Unlocked';
    // Screen flash 100ms
    var flash = $('#opehh-flash');
    if (flash){ flash.classList.remove('show'); void flash.offsetWidth; flash.classList.add('show'); setTimeout(function(){ flash.classList.remove('show'); }, 120); }
    // Show overlay
    var ov = $('#opehh-levelup');
    if (ov) ov.classList.add('show');
    // Confetti 2s - star particles
    var emojis = ['⭐','✨','🎉','🦊','💫'];
    for (var i=0;i<18;i++){
      (function(i){
        var c = document.createElement('div');
        c.className = 'opehh-confetti';
        c.textContent = emojis[i % emojis.length];
        c.style.left = (10 + Math.random()*80) + '%';
        c.style.top = (20 + Math.random()*50) + '%';
        document.body.appendChild(c);
        setTimeout(function(){ c.remove(); }, 2000);
      })(i);
    }
    // Haptic
    try { window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback && window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy'); } catch(e){}
    // Auto hide after 2.5s if user does not close
    setTimeout(function(){ if (ov) ov.classList.remove('show'); }, 3500);
  }
  function showXPFLoat(text, x, y){
    var el = document.createElement('div');
    el.className = 'opehh-xp-float';
    el.textContent = text || '+100 XP';
    el.style.left = (x||window.innerWidth/2) + 'px';
    el.style.top = (y||120) + 'px';
    document.body.appendChild(el);
    setTimeout(function(){ el.remove(); }, 1200);
  }
  function showMissionBurst(text){
    ensureLevelUpDOM();
    var b = $('#opehh-mission-burst');
    if (!b) return;
    b.textContent = text || '🎉 Mission Complete!';
    b.classList.add('show');
    try { window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback && window.Telegram.WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
    setTimeout(function(){ b.classList.remove('show'); }, 2500);
  }

  /* ---------- Time popup - image-only black ---------- */
  function ensureTimePopup(){
    if ($('#opehh-time-overlay')) return $('#opehh-time-overlay');
    var ov = document.createElement('div');
    ov.id = 'opehh-time-overlay';
    ov.innerHTML = '<div class="opehh-popup"><button class="opehh-x" id="opehh-time-x">✕</button><h2 style="margin:0 0 6px;color:#fff">⏱ Out of Reading Time</h2><p style="color:#929bad;font-size:13px;line-height:1.5">Your Free Preview 5 hours for today is finished. Chapter images are now black.<br><br>You can still browse, see cover, title, description, author, genres, chapter list, library, history, profile.<br><br><b style="color:#fff">To continue reading:</b> Do a mission to gain time, or Get Premium (manual bank transfer USD).</p><button id="opehh-do-mission" style="width:100%;background:#22c55e;color:#000;border:0;border-radius:12px;padding:11px;font-weight:800;margin-top:6px">✅ Do Missions to Gain Time</button><button id="opehh-buy-premium" style="width:100%;background:#f59e0b;color:#000;border:0;border-radius:12px;padding:11px;font-weight:800;margin-top:10px">⭐ Get Premium → @malif300</button><button id="opehh-close-popup" style="width:100%;background:#222;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:800;margin-top:10px">✕ Do Nothing (X)</button><p style="font-size:11px;text-align:center;color:#929bad">X = Close popup, do nothing. Black stays only inside chapter image.</p></div>';
    document.body.appendChild(ov);
    $('#opehh-time-x').addEventListener('click', closeTimePopup);
    $('#opehh-close-popup').addEventListener('click', closeTimePopup);
    $('#opehh-do-mission').addEventListener('click', function(){
      closeTimePopup();
      // Go to More / Missions if exists, else Browse
      var moreBtn = document.querySelector('[data-tab="more"]') || document.querySelector('[onclick*="more"]');
      if (moreBtn) moreBtn.click();
      else if (window.switchTab) window.switchTab('browse');
    });
    $('#opehh-buy-premium').addEventListener('click', function(){ window.open('https://t.me/malif300','_blank'); });
    return ov;
  }
  function showTimePopup(){
    var ov = ensureTimePopup();
    ov.classList.add('show');
  }
  function closeTimePopup(){
    var ov = $('#opehh-time-overlay');
    if (ov) ov.classList.remove('show');
  }
  function setImageBlack(isBlack){
    var rc = $('#readerContent') || $('#readerView');
    if (!rc) return;
    if (isBlack) rc.classList.add('opehh-black-images');
    else rc.classList.remove('opehh-black-images');
  }

  /* ---------- Image protection - reader images only ---------- */
  function bindImageProtection(){
    var rc = $('#readerContent');
    if (!rc) return;
    // Use delegation so dynamically added images are covered
    rc.addEventListener('contextmenu', function(e){
      if (e.target && e.target.tagName === 'IMG'){ e.preventDefault(); e.stopPropagation(); }
    });
    rc.addEventListener('dragstart', function(e){
      if (e.target && e.target.tagName === 'IMG'){ e.preventDefault(); }
    });
    rc.addEventListener('copy', function(e){ e.preventDefault(); });
    // Long-press callout is handled by CSS above. No screenshot block - cannot be fully blocked.
  }

  /* ---------- Apply level glow - ONLY to level elements ---------- */
  function applyLevelToUI(level, xpPct){
    var lvl = Number(level)||1;
    var col = levelColor(lvl);
    var cssCol = col === 'rainbow' ? '#ef4444' : col;
    // Only set CSS var for glow, do NOT change base UI colors
    document.documentElement.style.setProperty('--opehh-level', cssCol);
    // Avatar ring - if your original has #accountAvatar, add glow class, do NOT replace avatar
    var av = $('#accountAvatar');
    if (av){
      av.classList.add('opehh-level-glow');
      if (lvl >= 31) av.classList.add('opehh-level-31');
      else av.classList.remove('opehh-level-31');
    }
    // Level badge - if exists, add glow. If not exists, do NOT create new header.
    var lvlEl = $('[data-level-badge]') || $('#levelBadge');
    if (lvlEl){
      lvlEl.classList.add('opehh-level-glow');
      if (lvl >= 31) lvlEl.classList.add('opehh-level-31');
    }
    // XP bar - if exists, keep your lime bar, only add glow via class
    var xpBar = $('#xpBar') || $('.xp-fill');
    if (xpBar && typeof xpPct === 'number'){
      xpBar.style.width = xpPct + '%';
    }
  }
  function addOwnerBadge(isOwner, isPremium){
    // Additive badge next to account name, do NOT replace header
    var nameEl = $('#accountName');
    if (!nameEl) return;
    if (nameEl.querySelector('.opehh-owner-badge') || nameEl.querySelector('.opehh-premium-badge')) return;
    if (isOwner){
      var s = document.createElement('span');
      s.className = 'opehh-owner-badge';
      s.textContent = 'OWNER • UNLIMITED';
      nameEl.appendChild(s);
    } else if (isPremium){
      var p = document.createElement('span');
      p.className = 'opehh-premium-badge';
      p.textContent = 'PREMIUM';
      nameEl.appendChild(p);
    }
  }

  /* ---------- Reader helpers - additive ---------- */
  function addPageCurl(){
    var rc = $('#readerContent');
    if (!rc) return;
    $$('img', rc).forEach(function(img){
      img.classList.add('opehh-page');
      img.setAttribute('draggable','false');
    });
  }
  function enhanceChapters(){
    // Chapter stagger - add class with delay, do NOT replace chapter list
    $$('.chapter-row').forEach(function(row, i){
      row.classList.add('opehh-chapter-stagger');
      row.style.animationDelay = (i*30) + 'ms';
    });
  }
  function enhanceRefresh(){
    // Refresh spin - find your existing Refresh button, add spin class on click, do NOT replace button
    var btn = document.querySelector('button[onclick="loadHistory()"]') || $('#refreshBtn');
    if (btn && !btn.dataset.opehhBound){
      btn.dataset.opehhBound = '1';
      btn.addEventListener('click', function(){
        btn.classList.add('opehh-refresh-spin');
        setTimeout(function(){ btn.classList.remove('opehh-refresh-spin'); }, 600);
      });
    }
  }
  function enhanceRecentGlow(){
    // Recent glow - first 3 cards in browse grid get glow, do NOT change card layout
    var grid = $('#browseGrid');
    if (!grid) return;
    $$('.manga-card, [class*="card"]', grid).slice(0,3).forEach(function(c){ c.classList.add('opehh-recent-glow'); });
  }
  function ensureToolsPanel(){
    if ($('#opehh-tools-panel')) return $('#opehh-tools-panel');
    var p = document.createElement('div');
    p.id = 'opehh-tools-panel';
    p.innerHTML = '<h3 style="margin:0;color:#fff">Premium Reader Tools</h3><p style="color:#929bad;font-size:12px;margin:6px 0 0">Panel slides up. Auto-scroll pulsates when on.</p><div style="margin:14px 0"><label style="font-size:13px;font-weight:700;color:#fff;display:flex;justify-content:space-between">Auto-Scroll <span id="opehh-auto-label">Off</span></label><button id="opehh-auto-btn" style="width:100%;margin-top:8px;background:#bcf36b;color:#000;border:0;border-radius:12px;padding:11px;font-weight:800">▶ Start Auto-Scroll</button></div><div style="margin:14px 0"><label style="font-size:13px;font-weight:700;color:#fff;display:flex;justify-content:space-between">Speed <span id="opehh-speed-label">1x</span></label><input type="range" id="opehh-speed" min="0.5" max="3" step="0.5" value="1" style="width:100%"></div><div style="margin:14px 0"><label style="font-size:13px;font-weight:700;color:#fff;display:flex;justify-content:space-between">Brightness <span id="opehh-bright-label">100%</span></label><input type="range" id="opehh-bright" min="40" max="150" step="5" value="100" style="width:100%"></div><button id="opehh-tools-close" style="width:100%;background:#222;color:#fff;border:0;border-radius:12px;padding:11px;font-weight:800">Close Tools</button>';
    document.body.appendChild(p);
    var autoOn = false, autoTimer = null, speed = 1;
    $('#opehh-auto-btn').addEventListener('click', function(){
      var btn = $('#opehh-auto-btn');
      if (autoOn){ autoOn=false; clearInterval(autoTimer); btn.textContent='▶ Start Auto-Scroll'; btn.classList.remove('opehh-auto-on'); $('#opehh-auto-label').textContent='Off'; }
      else { autoOn=true; btn.textContent='⏸ Stop Auto-Scroll'; btn.classList.add('opehh-auto-on'); $('#opehh-auto-label').textContent='On • Pulsating'; autoTimer=setInterval(function(){ window.scrollBy({top:120*speed, behavior:'smooth'}); }, 1200); }
    });
    $('#opehh-speed').addEventListener('input', function(e){ speed=Number(e.target.value); $('#opehh-speed-label').textContent=speed+'x'; });
    $('#opehh-bright').addEventListener('input', function(e){ var v=e.target.value; $('#opehh-bright-label').textContent=v+'%'; $$('#readerContent img').forEach(function(img){ img.style.filter='brightness('+v+'%)'; }); });
    $('#opehh-tools-close').addEventListener('click', function(){ p.classList.remove('open'); });
    return p;
  }
  function openToolsPanel(){ ensureToolsPanel().classList.add('open'); }
  function closeToolsPanel(){ var p=$('#opehh-tools-panel'); if(p) p.classList.remove('open'); }

  /* ---------- Init - additive only ---------- */
  function init(){
    injectCSS();
    ensureLevelUpDOM();
    bindImageProtection();
    enhanceRefresh();
    // Observe DOM for new chapters / browse cards, enhance additively
    var obs = new MutationObserver(function(){
      enhanceChapters();
      addPageCurl();
    });
    if (document.body) obs.observe(document.body, {childList:true, subtree:true});
    // Get Premium buttons - if your original already has one, only ensure it opens @malif300, do NOT replace layout
    $$('button').forEach(function(b){
      if (b.textContent && b.textContent.toLowerCase().indexOf('get premium') !== -1 && !b.dataset.opehhPremiumBound){
        b.dataset.opehhPremiumBound = '1';
        b.addEventListener('click', function(){ window.open('https://t.me/malif300','_blank'); });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.OpehhEnhancements = {
    celebrateLevelUp: celebrateLevelUp,
    showXPFLoat: showXPFLoat,
    showMissionBurst: showMissionBurst,
    showTimePopup: showTimePopup,
    closeTimePopup: closeTimePopup,
    setImageBlack: setImageBlack,
    applyLevelToUI: applyLevelToUI,
    addOwnerBadge: addOwnerBadge,
    openToolsPanel: openToolsPanel,
    closeToolsPanel: closeToolsPanel,
    levelColor: levelColor,
    levelName: levelName,
    missionName: missionName,
    enhanceRecentGlow: enhanceRecentGlow,
    PREMIUM_CHAT_URL: 'https://t.me/malif300',
    PREMIUM_HANDLE: '@malif300',
    CURRENCY: 'USD'
  };
})();
