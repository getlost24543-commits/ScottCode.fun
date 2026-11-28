/* ==========================================================================
   AETHER — interactions
   Plain JavaScript, no libraries. Text and numbers live in the data tables
   (PLANETS, DESTS, VEHICLES, STAGES, VIEWS) so you can edit content freely.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  Helpers and shared state
   * ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    inQuad: t => t * t,
    inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
  };
  const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  const state = {
    view: 'home',
    px: -1e4, py: -1e4,        // pointer position in CSS px (for the gravity-lens effect)
    tx: 0, ty: 0,              // pointer target, -1..1
    mx: 0, my: 0,              // smoothed pointer, -1..1
    boost: 0,                  // 0..1, charged by holding on the home view
    pulse: 0                   // 0..1, a burst of warp when you change views
  };

  /* One shared animation loop. Modules register a function with onTick(). */
  const tickers = [];
  const onTick = fn => tickers.push(fn);
  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    for (let i = 0; i < tickers.length; i++) tickers[i](dt, now / 1000);
    requestAnimationFrame(frame);
  }

  /* Pointer smoothing and the warp pulse that plays whenever the view changes. */
  let pulseT = 1;
  const triggerPulse = () => { if (!reduceMotion) pulseT = 0; };
  onTick(dt => {
    state.mx += (state.tx - state.mx) * Math.min(1, dt * 4);
    state.my += (state.ty - state.my) * Math.min(1, dt * 4);
    if (pulseT < 1) {
      pulseT = Math.min(1, pulseT + dt / 1.25);
      state.pulse = Math.sin(Math.PI * Math.pow(pulseT, 0.65));
    } else {
      state.pulse = 0;
    }
  });

  window.addEventListener('pointermove', e => {
    state.px = e.clientX; state.py = e.clientY;
    state.tx = (e.clientX / window.innerWidth) * 2 - 1;
    state.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  const clearPointer = e => { if (!e || e.pointerType === 'touch') { state.px = -1e4; state.py = -1e4; } };
  window.addEventListener('pointerup', clearPointer);
  window.addEventListener('pointercancel', clearPointer);
  document.documentElement.addEventListener('pointerleave', () => { state.px = -1e4; state.py = -1e4; });


  /* ------------------------------------------------------------------ *
   *  Starfield: stars fly toward you; speed rises with warp.
   *  Stars bend around the pointer like light around a heavy object.
   * ------------------------------------------------------------------ */
  function initStarfield() {
    const cv = $('#starfield');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const Z = 1200;
    const colors = ['234,240,255', '234,240,255', '234,240,255', '190,208,255', '255,232,200'];
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, focal = 1;
    let stars = [];

    const spawn = initial => ({
      x: (Math.random() * 2 - 1) * Z,
      y: (Math.random() * 2 - 1) * Z,
      z: initial ? Math.random() * Z + 40 : Z,
      c: colors[(Math.random() * colors.length) | 0],
      s: 0.5 + Math.random() * 1.1,
      tw: Math.random() * 6.28
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      W = w; H = h; cx = W / 2; cy = H / 2; focal = Math.max(W, H) * 0.55;
      const n = window.innerWidth < 700 ? 260 : 520;
      while (stars.length < n) stars.push(spawn(true));
      stars.length = n;
      if (reduceMotion) draw(0, 0);
    }

    function draw(dt, t) {
      const warp = clamp(state.boost * 42 + state.pulse * 38, 0, 52);
      const speed = ((reduceMotion ? 0 : 0.35) + warp) * dt * 60;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      const vx = cx + state.mx * 26 * dpr;
      const vy = cy + state.my * 18 * dpr;
      const ptx = state.px * dpr, pty = state.py * dpr;
      const R = 150 * dpr, R2 = R * R;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const z0 = s.z;
        s.z -= speed;
        if (s.z < 2) { stars[i] = spawn(false); continue; }
        let x0 = vx + (s.x / z0) * focal, y0 = vy + (s.y / z0) * focal;
        let x1 = vx + (s.x / s.z) * focal, y1 = vy + (s.y / s.z) * focal;
        if (x1 < -60 || x1 > W + 60 || y1 < -60 || y1 > H + 60) { stars[i] = spawn(false); continue; }

        const dx = x1 - ptx, dy = y1 - pty, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = 1 - d / R;
          const push = f * f * 38 * dpr;
          x1 += (dx / d) * push; y1 += (dy / d) * push;
          x0 += (dx / d) * push; y0 += (dy / d) * push;
        }

        const depth = 1 - s.z / Z;                       // 0 far, 1 near
        const twinkle = reduceMotion ? 1 : 0.8 + 0.2 * Math.sin(t * s.s * 2 + s.tw);
        ctx.globalAlpha = clamp(depth * 1.25, 0.06, 1) * twinkle;
        ctx.strokeStyle = 'rgb(' + s.c + ')';
        ctx.lineWidth = (0.5 + depth * 1.5 * s.s) * dpr;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1 + 0.001);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    resize();
    if (!reduceMotion) onTick(draw);
  }


  /* ------------------------------------------------------------------ *
   *  Views, routing, pager and the distance readout
   * ------------------------------------------------------------------ */
  const LY = 9.4607e12; // kilometres in a light-year

  const VIEWS = [
    { id: 'home',     hash: '#/',         name: 'Home',     km: 408,      cap: 'from Earth, in low orbit' },
    { id: 'planets',  hash: '#/planets',  name: 'Planets',  km: 4.5e9,    cap: 'from Earth, out at Neptune' },
    { id: 'missions', hash: '#/missions', name: 'Missions', km: 2.4e10,   cap: 'from Earth, near Voyager 1' },
    { id: 'travel',   hash: '#/travel',   name: 'Travel',   km: LY * 4.2465, cap: 'from Earth, at the nearest star' },
    { id: 'light',    hash: '#/light',    name: 'Light',    km: 2.4e19,   cap: 'from Earth, at the Andromeda galaxy' },
    { id: 'timeline', hash: '#/timeline', name: 'Timeline', km: 4.4e23,   cap: 'from Earth, at the edge of the visible universe' },
    { id: 'join',     hash: '#/join',     name: 'Join',     km: 4.4e23,   cap: 'from Earth, at the edge of the visible universe' }
  ];

  function fmtDistance(km) {
    if (km < 1e3) return fmt(Math.round(km)) + ' km';
    if (km < 1e6) return fmt(Math.round(km)) + ' km';
    if (km < 1e9) { const v = km / 1e6; return fmt(v, v < 100 ? 1 : 0) + ' million km'; }
    if (km < 1e12) { const v = km / 1e9; return fmt(v, v < 10 ? 1 : 0) + ' billion km'; }
    if (km < LY) { const v = km / 1e12; return fmt(v, v < 10 ? 1 : 0) + ' trillion km'; }
    const ly = km / LY;
    if (ly < 1e3) return fmt(ly, ly < 10 ? 1 : 0) + ' light-years';
    if (ly < 1e6) return fmt(Math.round(ly)) + ' light-years';
    if (ly < 1e9) { const v = ly / 1e6; return fmt(v, v < 10 ? 1 : 0) + ' million light-years'; }
    return fmt(ly / 1e9, 1) + ' billion light-years';
  }

  const router = (() => {
    const views = $$('.view');
    const links = $$('.nav__links a');
    const pgPrev = $('#pgPrev'), pgNext = $('#pgNext'), pgNum = $('#pgNum'), pgName = $('#pgName');
    const jVal = $('#journeyVal'), jCap = $('#journeyCap');
    const baseTitle = document.title;
    let cur = -1;

    // Distance readout: tweens in log space so the numbers race through the scales.
    const journey = { cur: Math.log10(VIEWS[0].km), from: 0, to: 0, t: 1 };
    const journeyTo = view => {
      journey.from = journey.cur; journey.to = Math.log10(view.km);
      journey.t = reduceMotion ? 1 : 0;
      jCap.textContent = view.cap;
      if (reduceMotion) { journey.cur = journey.to; jVal.textContent = fmtDistance(view.km); }
    };
    onTick(dt => {
      if (journey.t >= 1) return;
      journey.t = Math.min(1, journey.t + dt / 1.6);
      journey.cur = lerp(journey.from, journey.to, ease.inOut(journey.t));
      jVal.textContent = fmtDistance(Math.pow(10, journey.cur));
    });

    // Give every .rv element in a view its own stagger delay.
    views.forEach(v => $$('.rv', v).forEach((el, i) => el.style.setProperty('--d', i)));

    function setMenu(open) {
      document.body.classList.toggle('menu-open', open);
      const t = $('.nav__toggle');
      t.setAttribute('aria-expanded', String(open));
      t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    function show(i) {
      if (i === cur || i < 0 || i >= views.length) return;
      const prev = cur;
      cur = i;
      const view = VIEWS[i];
      state.view = view.id;
      document.body.dataset.view = view.id;

      views.forEach((el, k) => {
        el.classList.toggle('is-active', k === i);
        el.classList.toggle('is-before', k < i);
        el.classList.toggle('is-after', k > i);
        if (k === i) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
        else { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      });
      views[i].scrollTop = 0;

      links.forEach(a => {
        if (a.getAttribute('href') === view.hash) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      pgNum.textContent = String(i + 1).padStart(2, '0');
      pgName.textContent = view.name;
      pgPrev.disabled = i === 0;
      pgNext.disabled = i === views.length - 1;
      document.title = i === 0 ? baseTitle : view.name + ' — Aether';
      setMenu(false);
      journeyTo(view);

      if (prev !== -1) {
        triggerPulse();
        const h = views[i].querySelector('h1, h2');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
      }
      document.dispatchEvent(new CustomEvent('viewchange', { detail: { id: view.id, index: i } }));
    }

    const fromHash = () => {
      const h = window.location.hash;
      if (!h || h === '#' || h === '#/') return 0;
      const m = /^#\/([a-z]+)\/?$/.exec(h);
      if (!m) return -1;
      return VIEWS.findIndex(v => v.id === m[1]);
    };
    const go = i => {
      const target = VIEWS[clamp(i, 0, VIEWS.length - 1)];
      if (window.location.hash === target.hash || (target.id === 'home' && (!window.location.hash || window.location.hash === '#/'))) show(VIEWS.indexOf(target));
      else window.location.hash = target.hash;
    };

    window.addEventListener('hashchange', () => { const i = fromHash(); if (i >= 0) show(i); });
    pgPrev.addEventListener('click', () => go(cur - 1));
    pgNext.addEventListener('click', () => go(cur + 1));
    $('.nav__toggle').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    $('.skip').addEventListener('click', e => { e.preventDefault(); const v = views[Math.max(cur, 0)]; const h = v.querySelector('h1, h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } });
    // Clicking the link for the view you are already on just closes the menu.
    links.forEach(a => a.addEventListener('click', () => { if (a.getAttribute('aria-current') === 'page') setMenu(false); }));

    return { show, go, start: () => { const i = fromHash(); show(i >= 0 ? i : 0); }, get index() { return cur; } };
  })();


  /* ------------------------------------------------------------------ *
   *  Home: press and hold to jump, and a headline that stretches with speed
   * ------------------------------------------------------------------ */
  function initHome() {
    const home = $('#view-home');
    if (!home) return;
    const lines = $$('.hero__title .ln > span', home);
    const ring = $('#holdRing');
    const flash = $('.flash', home);
    const HOLD_SECONDS = 1.15;
    let holding = false, hold = 0, jumped = false, sx = 0, sy = 0, lastW = -1;

    const stop = () => { holding = false; };
    home.addEventListener('pointerdown', e => {
      if (reduceMotion || e.button > 0 || e.target.closest('a, button, input, label')) return;
      holding = true; jumped = false; sx = e.clientX; sy = e.clientY;
    });
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    window.addEventListener('pointermove', e => {
      if (holding && e.pointerType === 'touch' && Math.hypot(e.clientX - sx, e.clientY - sy) > 18) stop();
    }, { passive: true });
    document.addEventListener('viewchange', stop);

    function jump() {
      flash.classList.remove('is-on');
      void flash.offsetWidth;
      flash.classList.add('is-on');
      setTimeout(() => router.go(1), 140);
    }

    onTick(dt => {
      if (state.view !== 'home' && hold === 0 && state.pulse === 0 && lastW <= 0.004) return;
      if (state.view === 'home') {
        hold = holding && !jumped ? Math.min(1, hold + dt / HOLD_SECONDS) : Math.max(0, hold - dt * 1.6);
        state.boost = ease.inQuad(hold);
        if (hold >= 1 && !jumped) { jumped = true; holding = false; jump(); }
      } else {
        hold = Math.max(0, hold - dt * 3);
        state.boost = ease.inQuad(hold);
      }
      ring.style.strokeDashoffset = (1 - hold).toFixed(3);

      home.style.setProperty('--px', state.mx.toFixed(3));
      home.style.setProperty('--py', state.my.toFixed(3));

      // The headline stretches like redshift: Archivo has a width axis.
      const w = clamp(state.boost + state.pulse * 0.9, 0, 1);
      if (Math.abs(w - lastW) > 0.004) {
        lastW = w;
        home.style.setProperty('--warp', w.toFixed(3));
        const stretch = (100 + w * 25).toFixed(1) + '%';
        for (let i = 0; i < lines.length; i++) lines[i].style.fontStretch = stretch;
      }
    });
  }


  /* ------------------------------------------------------------------ *
   *  Planets: an animated solar system you can tap
   * ------------------------------------------------------------------ */
  const PLANETS = [
    { id: 'mercury', name: 'Mercury', tag: 'The swift messenger', color: '#b8b2a7', fill: '#9d978d', r: 8, orbit: 78, years: 0.241, start: 20,
      desc: 'The smallest planet and the closest to the Sun. With almost no atmosphere to hold heat, its surface swings from about 430 °C by day to −180 °C at night.',
      dia: 4879, dist: '57.9 million km', day: '176 Earth days', daySub: 'Sunrise to sunrise', year: '88 Earth days', moons: '0', temp: '167 °C', tempSub: 'Average surface' },
    { id: 'venus', name: 'Venus', tag: 'The veiled furnace', color: '#f0cf9a', fill: '#e0b878', r: 13, orbit: 112, years: 0.615, start: 110,
      desc: 'The hottest planet, wrapped in thick clouds of sulphuric acid. A runaway greenhouse effect keeps its surface near 464 °C, and it spins backwards compared with most planets.',
      dia: 12104, dist: '108.2 million km', day: '117 Earth days', daySub: 'Sunrise to sunrise', year: '225 Earth days', moons: '0', temp: '464 °C', tempSub: 'Surface, hotter than molten lead' },
    { id: 'earth', name: 'Earth', tag: 'The only home we know', color: '#6aa0ff', fill: '#3a76d6', r: 14, orbit: 150, years: 1, start: 200,
      desc: 'The only world we know that has life. About 71% of its surface is ocean, under an atmosphere of 78% nitrogen and 21% oxygen.',
      dia: 12742, dist: '149.6 million km', day: '24 hours', daySub: '', year: '365.25 days', moons: '1', temp: '15 °C', tempSub: 'Average surface' },
    { id: 'mars', name: 'Mars', tag: 'The rust-red neighbour', color: '#e07a50', fill: '#c4582f', r: 10, orbit: 188, years: 1.881, start: 300,
      desc: 'A cold desert world with Olympus Mons, the tallest volcano in the solar system. At about 22 km high, it stands roughly two and a half times taller than Everest.',
      dia: 6779, dist: '227.9 million km', day: '24 h 37 min', daySub: '', year: '687 Earth days', moons: '2', temp: '−63 °C', tempSub: 'Average surface' },
    { id: 'jupiter', name: 'Jupiter', tag: 'The giant', color: '#e2c39b', fill: 'url(#bands-jupiter)', r: 30, orbit: 255, years: 11.86, start: 60,
      desc: 'More massive than every other planet combined. Its Great Red Spot is a storm larger than Earth that astronomers have tracked for well over a century.',
      dia: 139822, dist: '778.5 million km', day: '9 h 56 min', daySub: '', year: '11.9 Earth years', moons: '95+', temp: '−108 °C', tempSub: 'Near the cloud tops' },
    { id: 'saturn', name: 'Saturn', tag: 'Lord of the rings', color: '#ead9a8', fill: 'url(#bands-saturn)', r: 26, orbit: 322, years: 29.46, start: 250,
      desc: 'Its rings stretch up to about 280,000 km across but are only around 10 metres thick in places. Saturn is the least dense planet, lighter than water.',
      dia: 116464, dist: '1.43 billion km', day: 'About 10.7 hours', daySub: '', year: '29.4 Earth years', moons: '270+', temp: '−139 °C', tempSub: 'Near the cloud tops' },
    { id: 'uranus', name: 'Uranus', tag: 'The sideways planet', color: '#8fe0e8', fill: '#7fd0da', r: 19, orbit: 385, years: 84.0, start: 150,
      desc: 'Tipped on its side by about 98°, it rolls around the Sun. Each pole gets about 42 years of sunlight followed by 42 years of darkness.',
      dia: 50724, dist: '2.87 billion km', day: '17 h 14 min', daySub: '', year: '84 Earth years', moons: '28+', temp: '−197 °C', tempSub: 'Near the cloud tops' },
    { id: 'neptune', name: 'Neptune', tag: 'The distant storm', color: '#6f8cff', fill: '#4a67e0', r: 18, orbit: 440, years: 164.8, start: 330,
      desc: 'The windiest planet, with gusts that top 2,000 km/h. It was the first planet found by mathematics before telescopes confirmed it, in 1846.',
      dia: 49244, dist: '4.50 billion km', day: '16 h 6 min', daySub: '', year: '165 Earth years', moons: '16+', temp: '−201 °C', tempSub: 'Near the cloud tops' }
  ];
  const EARTH_KM = 12742;

  function initPlanets() {
    const svg = $('#orrerySvg');
    if (!svg) return;
    const host = $('#orrery'), tag = $('#orreryTag'), chipsEl = $('#chips'), panel = $('#panel'), body = $('#pBody');
    const el = {
      count: $('#pCount'), tag: $('#pTag'), name: $('#pName'), desc: $('#pDesc'),
      dia: $('#fDia'), dist: $('#fDist'), day: $('#fDay'), year: $('#fYear'), moons: $('#fMoons'), temp: $('#fTemp')
    };

    // Chart bezel: a ring with degree ticks, like a star chart.
    const bezel = $('#bezel');
    svgEl('circle', { class: 'bezel-ring', r: 488 }, bezel);
    for (let a = 0; a < 360; a += 5) {
      const rad = (a * Math.PI) / 180, r1 = a % 30 === 0 ? 470 : 477, r2 = 486;
      svgEl('line', {
        class: 'bezel-tick',
        x1: (Math.cos(rad) * r1).toFixed(1), y1: (Math.sin(rad) * r1).toFixed(1),
        x2: (Math.cos(rad) * r2).toFixed(1), y2: (Math.sin(rad) * r2).toFixed(1)
      }, bezel);
    }

    const orbitsG = $('#orbits');
    const layer = $('#planetLayer');

    PLANETS.forEach((p, i) => {
      p.index = i;
      p.a = (p.start * Math.PI) / 180;
      p.w = (Math.PI * 2) / (14 * Math.pow(p.years, 0.55));   // compressed so outer planets still visibly move
      p.x = 0; p.y = 0;
      p.orbitEl = svgEl('circle', { class: 'orbit', r: p.orbit }, orbitsG);

      const g = svgEl('g', { class: 'planet', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'aria-label': p.name + ', show details', 'data-i': i }, layer);
      const pb = svgEl('g', { class: 'pbody' }, g);
      if (p.id === 'saturn') {
        const ring = svgEl('g', { transform: 'rotate(-18)', fill: 'none' }, pb);
        svgEl('path', { d: 'M-44 0A44 12 0 0 1 44 0', stroke: 'rgba(235,220,170,.55)', 'stroke-width': 5 }, ring);
        svgEl('path', { d: 'M-35 0A35 9.6 0 0 1 35 0', stroke: 'rgba(235,220,170,.4)', 'stroke-width': 2 }, ring);
      }
      svgEl('circle', { r: p.r, fill: p.fill }, pb);
      if (p.id === 'earth') {
        svgEl('ellipse', { cx: -3.5, cy: -3, rx: 5.5, ry: 3.6, fill: '#4e9b6c', opacity: .9 }, pb);
        svgEl('ellipse', { cx: 4.5, cy: 3.5, rx: 3.4, ry: 2.6, fill: '#4e9b6c', opacity: .85 }, pb);
        svgEl('ellipse', { cx: 0, cy: -8, rx: 7, ry: 1.6, fill: '#fff', opacity: .35 }, pb);
      }
      if (p.id === 'mars') svgEl('ellipse', { cx: 0, cy: -8.5, rx: 4, ry: 1.4, fill: '#fff', opacity: .6 }, pb);
      if (p.id === 'jupiter') svgEl('ellipse', { cx: 9, cy: 8, rx: 5.5, ry: 3.2, fill: '#c0603f', opacity: .85 }, pb);
      svgEl('circle', { r: p.r, fill: 'url(#sphere)' }, pb);
      p.shade = svgEl('g', {}, pb);
      svgEl('circle', { r: p.r, fill: 'url(#shade)' }, p.shade);
      if (p.id === 'saturn') {
        const ring = svgEl('g', { transform: 'rotate(-18)', fill: 'none' }, pb);
        svgEl('path', { d: 'M-44 0A44 12 0 0 0 44 0', stroke: 'rgba(235,220,170,.9)', 'stroke-width': 5 }, ring);
        svgEl('path', { d: 'M-35 0A35 9.6 0 0 0 35 0', stroke: 'rgba(235,220,170,.65)', 'stroke-width': 2 }, ring);
      }
      svgEl('circle', { class: 'hit', r: Math.max(p.r + 14, 26) }, g);
      p.g = g;
    });

    // Gold selection ring that follows the chosen planet.
    const selGroup = svgEl('g', { 'aria-hidden': 'true', 'pointer-events': 'none' }, layer);
    const selRing = svgEl('circle', { class: 'selring', r: 20 }, selGroup);

    // Planet chips: always-visible names, easy to hit on a phone.
    const chips = PLANETS.map(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.style.setProperty('--c', p.color);
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<i></i>' + p.name;
      b.addEventListener('click', () => select(p.index));
      chipsEl.appendChild(b);
      return b;
    });

    let current = -1, swapTimer = 0, hoverIdx = -1, scale = 1;

    const setFact = (node, main, sub) => {
      node.textContent = main;
      if (sub) { const s = document.createElement('small'); s.textContent = sub; node.appendChild(s); }
    };
    function fill(p) {
      el.count.textContent = String(p.index + 1).padStart(2, '0') + ' of ' + String(PLANETS.length).padStart(2, '0');
      el.tag.textContent = p.tag;
      el.name.textContent = p.name;
      el.desc.textContent = p.desc;
      const ratio = p.dia / EARTH_KM;
      setFact(el.dia, fmt(p.dia) + ' km', p.id === 'earth' ? 'Our yardstick' : fmt(ratio, ratio < 10 ? 2 : 1) + ' × Earth');
      setFact(el.dist, p.dist);
      setFact(el.day, p.day, p.daySub);
      setFact(el.year, p.year);
      setFact(el.moons, p.moons);
      setFact(el.temp, p.temp, p.tempSub);
    }

    function select(i, immediate) {
      i = (i + PLANETS.length) % PLANETS.length;
      if (i === current) return;
      const first = current === -1;
      current = i;
      const p = PLANETS[i];
      PLANETS.forEach((pl, k) => {
        pl.g.classList.toggle('is-active', k === i);
        pl.g.setAttribute('aria-pressed', String(k === i));
        pl.orbitEl.classList.toggle('is-active', k === i);
        chips[k].setAttribute('aria-pressed', String(k === i));
      });
      selRing.setAttribute('r', String(p.r + 11));
      tag.textContent = p.name;
      panel.style.setProperty('--pc', p.color);

      const c = chips[i];
      if (chipsEl.scrollWidth > chipsEl.clientWidth + 2) {
        chipsEl.scrollTo({ left: c.offsetLeft - (chipsEl.clientWidth - c.offsetWidth) / 2, behavior: reduceMotion || first ? 'auto' : 'smooth' });
      }

      clearTimeout(swapTimer);
      if (immediate || first || reduceMotion) { fill(p); return; }
      body.classList.add('is-out');
      swapTimer = setTimeout(() => { fill(p); body.classList.remove('is-out'); }, 200);
    }

    // Pointer: pick the planet nearest to the tap, so small planets are easy to hit on phones.
    const pt = svg.createSVGPoint();
    const toSvg = (cx, cy) => {
      pt.x = cx; pt.y = cy;
      const m = svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: 1e5, y: 1e5 };
    };
    const nearest = (cx, cy) => {
      const q = toSvg(cx, cy);
      let best = -1, bd = Infinity;
      for (const p of PLANETS) {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bd) { bd = d; best = p.index; }
      }
      return best >= 0 && bd < Math.max(PLANETS[best].r + 26, 46) ? best : -1;
    };
    svg.addEventListener('click', e => { const i = nearest(e.clientX, e.clientY); if (i >= 0) select(i); });
    svg.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const i = nearest(e.clientX, e.clientY);
      if (i !== hoverIdx) {
        hoverIdx = i;
        PLANETS.forEach((p, k) => p.g.classList.toggle('is-hover', k === i));
        svg.style.cursor = i >= 0 ? 'pointer' : 'default';
      }
    });
    svg.addEventListener('pointerleave', () => {
      hoverIdx = -1; PLANETS.forEach(p => p.g.classList.remove('is-hover')); svg.style.cursor = 'default';
    });
    svg.addEventListener('keydown', e => {
      const g = e.target.closest && e.target.closest('.planet');
      if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(Number(g.dataset.i)); }
    });
    $('#pPrev').addEventListener('click', () => select(current - 1));
    $('#pNext').addEventListener('click', () => select(current + 1));
    $('#view-planets').addEventListener('keydown', e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') { select(current - 1); }
      else if (e.key === 'ArrowRight') { select(current + 1); }
    });

    const measure = () => { scale = host.clientWidth / 1000; };
    measure();
    new ResizeObserver(measure).observe(host);

    function place(dt) {
      for (const p of PLANETS) {
        if (!reduceMotion) p.a += dt * p.w;
        p.x = Math.cos(p.a) * p.orbit;
        p.y = Math.sin(p.a) * p.orbit;
        p.g.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ')');
        p.shade.setAttribute('transform', 'rotate(' + ((p.a * 180) / Math.PI).toFixed(1) + ')');
      }
      const s = PLANETS[current];
      selGroup.setAttribute('transform', 'translate(' + s.x.toFixed(2) + ' ' + s.y.toFixed(2) + ')');
      tag.style.transform = 'translate(' + ((s.x + 500) * scale).toFixed(1) + 'px,' + (((s.y + 500 - s.r - 20) * scale) - 4).toFixed(1) + 'px) translate(-50%,-100%)';
    }

    select(2, true);   // start on Earth
    place(0);
    onTick(dt => { if (state.view === 'planets') place(dt); });
  }


  /* ------------------------------------------------------------------ *
   *  Missions: Webb mirror drawing and tilt cards
   * ------------------------------------------------------------------ */
  function initMissions() {
    // The Webb telescope's mirror: 18 hexagons in two rings around an empty centre.
    const g = $('#webbHex');
    if (g) {
      const s = 15;
      const cells = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
        [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1]];
      cells.forEach(([q, r]) => {
        const cx = 1.5 * s * q, cy = Math.sqrt(3) * s * (r + q / 2);
        const pts = [0, 1, 2, 3, 4, 5].map(k => {
          const a = (Math.PI / 3) * k;
          return (cx + (s - 0.9) * Math.cos(a)).toFixed(1) + ',' + (cy + (s - 0.9) * Math.sin(a)).toFixed(1);
        }).join(' ');
        svgEl('polygon', { points: pts }, g);
      });
    }

    $$('.plate').forEach(card => {
      card.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (finePointer && !reduceMotion) {
          card.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
          card.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        }
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }


  /* ------------------------------------------------------------------ *
   *  Travel calculator
   * ------------------------------------------------------------------ */
  const DESTS = [
    { id: 'moon',    name: 'The Moon',          km: 384400,        note: 'average distance' },
    { id: 'sun',     name: 'The Sun',           km: 149.6e6,       note: 'average distance' },
    { id: 'mars',    name: 'Mars',              km: 54.6e6,        note: 'closest approach' },
    { id: 'jupiter', name: 'Jupiter',           km: 588e6,         note: 'closest approach' },
    { id: 'neptune', name: 'Neptune',           km: 4.3e9,         note: 'closest approach' },
    { id: 'proxima', name: 'Proxima Centauri',  km: LY * 4.2465,   note: 'the nearest star after the Sun' }
  ];
  const VEHICLES = [
    { id: 'jet',     name: 'Passenger jet',      kmh: 900,                   note: '900 km/h' },
    { id: 'apollo',  name: 'Apollo capsule',     kmh: 39897,                 note: '39,897 km/h, the fastest speed humans have travelled' },
    { id: 'voyager', name: 'Voyager 1',          kmh: 61200,                 note: '61,200 km/h' },
    { id: 'parker',  name: 'Parker Solar Probe', kmh: 692000,                note: '692,000 km/h, the fastest spacecraft' },
    { id: 'light',   name: 'Light',              kmh: 299792.458 * 3600,     note: '299,792 km every second' }
  ];
  const YEAR = 31557600;

  function humanTime(sec) {
    let v, u;
    if (sec < 60) { v = sec; u = sec === 1 ? 'second' : 'seconds'; }
    else if (sec < 3600) { v = sec / 60; u = 'minutes'; }
    else if (sec < 86400) { v = sec / 3600; u = 'hours'; }
    else if (sec < YEAR) { v = sec / 86400; u = 'days'; }
    else {
      const y = sec / YEAR;
      if (y < 1e6) { v = y; u = 'years'; }
      else if (y < 1e9) { v = y / 1e6; u = 'million years'; }
      else if (y < 1e12) { v = y / 1e9; u = 'billion years'; }
      else { v = y / 1e12; u = 'trillion years'; }
    }
    return { v, u, dec: v < 10 ? 2 : v < 100 ? 1 : 0 };
  }

  function funLine(sec) {
    const years = sec / YEAR;
    if (sec < 2) return 'About one heartbeat.';
    if (sec < 3600) return 'Less than a lunch break.';
    if (sec < 86400) return 'Done in less than a day.';
    if (years < 1) return 'Under a year of travel.';
    if (years < 80) return 'About ' + fmt((years / 80) * 100, 0) + '% of a human lifetime.';
    if (years < 3e5) return 'About ' + fmt(years / 80, 0) + ' human lifetimes.';
    return 'Longer than our species has existed.';
  }

  function initTravel() {
    const destEl = $('#destPills'), vehEl = $('#vehPills');
    if (!destEl) return;
    const tNum = $('#tNum'), tUnit = $('#tUnit'), tMeta = $('#tMeta'), tFun = $('#tFun'), tSr = $('#tSr');
    const ship = $('#ship'), routeDest = $('#routeDest');
    let dest = DESTS.find(d => d.id === 'mars');
    let veh = VEHICLES.find(v => v.id === 'jet');
    let raf = 0;

    const pills = (box, name, items, checked) => {
      items.forEach(it => {
        const label = document.createElement('label');
        label.className = 'pill';
        label.innerHTML = '<input type="radio" name="' + name + '" value="' + it.id + '"' + (it.id === checked ? ' checked' : '') + '><span>' + it.name + '</span>';
        box.appendChild(label);
      });
    };
    pills(destEl, 'dest', DESTS, dest.id);
    pills(vehEl, 'veh', VEHICLES, veh.id);
    destEl.addEventListener('change', e => { dest = DESTS.find(d => d.id === e.target.value); update(); });
    vehEl.addEventListener('change', e => { veh = VEHICLES.find(v => v.id === e.target.value); update(); });

    function update() {
      const sec = dest.km / (veh.kmh / 3600);
      const t = humanTime(sec);
      routeDest.textContent = dest.name;
      tUnit.textContent = t.u;
      tMeta.textContent = dest.name + ' is ' + fmtDistance(dest.km) + ' away (' + dest.note + '). ' + veh.name + ': ' + veh.note + '.';
      tFun.textContent = funLine(sec);
      tSr.textContent = dest.name + ' by ' + veh.name.toLowerCase() + ': ' + fmt(t.v, t.dec) + ' ' + t.u + '. ' + funLine(sec);
      ship.style.setProperty('--dur', clamp(1 + Math.log10(sec + 10) * 0.62, 1.2, 7).toFixed(2) + 's');

      cancelAnimationFrame(raf);
      const start = performance.now(), dur = reduceMotion ? 0 : 750;
      const step = now => {
        const k = dur ? clamp((now - start) / dur, 0, 1) : 1;
        tNum.textContent = fmt(t.v * ease.outQuart(k), t.dec);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    update();
    document.addEventListener('viewchange', e => { if (e.detail.id === 'travel') update(); });
  }


  /* ------------------------------------------------------------------ *
   *  Light ladder: count-up numbers and logarithmic bars
   * ------------------------------------------------------------------ */
  function initLight() {
    const rows = $$('#view-light .ladder li');
    if (!rows.length) return;
    const secs = rows.map(r => Number(r.dataset.sec));
    const lo = Math.log10(secs[0]), hi = Math.log10(secs[secs.length - 1]);
    rows.forEach((r, i) => r.style.setProperty('--w', (0.04 + 0.96 * ((Math.log10(secs[i]) - lo) / (hi - lo))).toFixed(3)));

    let token = 0;
    function run() {
      const my = ++token;
      rows.forEach((row, i) => {
        const num = $('.num', row), to = Number(row.dataset.value), dec = Number(row.dataset.dec);
        if (reduceMotion) { num.textContent = fmt(to, dec); return; }
        const t0 = performance.now() + 450 + i * 160, dur = 1500;
        const step = now => {
          if (my !== token) return;
          const k = clamp((now - t0) / dur, 0, 1);
          num.textContent = fmt(to * ease.outQuart(k), dec);
          if (k < 1) requestAnimationFrame(step);
        };
        num.textContent = fmt(0, dec);
        requestAnimationFrame(step);
      });
    }
    document.addEventListener('viewchange', e => { if (e.detail.id === 'light') run(); });
  }


  /* ------------------------------------------------------------------ *
   *  Timeline: a slider through cosmic history with a live canvas
   * ------------------------------------------------------------------ */
  const STAGES = [
    { tick: 'Big Bang',     when: '13.8 billion years ago',            title: 'The Big Bang',
      text: 'Space, time and energy unfold from an unimaginably hot, dense state. The universe has been expanding ever since.' },
    { tick: 'First nuclei', when: 'The first few minutes',             title: 'The first nuclei',
      text: 'As the universe cools, protons and neutrons fuse into the first atomic nuclei, mostly hydrogen and helium, the raw material of every star.' },
    { tick: 'First light',  when: 'About 380,000 years in',            title: 'The first light',
      text: 'The universe cools enough for atoms to form, and light travels freely for the first time. That glow still reaches us as the cosmic microwave background.' },
    { tick: 'Dark ages',    when: '380,000 to about 100 million years', title: 'The dark ages',
      text: 'No stars yet, only clouds of gas gathering around invisible dark matter while gravity does its slow work.' },
    { tick: 'First stars',  when: '100 to 300 million years in',      title: 'The first stars and galaxies',
      text: 'The first stars ignite and the first galaxies assemble. The James Webb Space Telescope has spotted some from about 300 million years after the Big Bang.' },
    { tick: 'Cosmic noon',  when: 'About 10 billion years ago',        title: 'Cosmic noon',
      text: 'Star formation peaks. Galaxies forge stars far faster than they do today, building the heavy elements that planets are made of.' },
    { tick: 'Sun forms',    when: '4.6 billion years ago',             title: 'The Sun is born',
      text: 'A cloud of gas and dust collapses, ignites a new star and leaves behind a spinning disc that becomes the planets.' },
    { tick: 'Life',         when: 'At least 3.5 billion years ago',    title: 'Life on Earth',
      text: 'Microbes leave their earliest known traces in ancient rock. Life has been on this planet for most of its history.' },
    { tick: 'Today',        when: '13.8 billion years later',          title: 'You are here',
      text: 'Atoms forged inside stars are now reading about them on a screen.' }
  ];

  function initTimeline() {
    const range = $('#tlRange'), cv = $('#tlCanvas');
    if (!range || !cv) return;
    const ctx = cv.getContext('2d');
    const textBox = $('.tl__text'), whenEl = $('#tlWhen'), titleEl = $('#tlTitle'), descEl = $('#tlDesc'), ticksEl = $('#tlTicks');
    const LAST = STAGES.length - 1;

    // How the picture looks at each milestone; values in between are blended.
    const P = {
      glow:   [1.00, 0.80, 0.55, 0.14, 0.30, 0.42, 0.46, 0.48, 0.50],
      glowA:  [1.00, 0.85, 0.60, 0.18, 0.34, 0.40, 0.46, 0.44, 0.36],
      col:    [[255, 255, 255], [255, 196, 130], [255, 150, 90], [30, 40, 90], [130, 160, 255], [170, 150, 255], [255, 214, 150], [120, 170, 255], [110, 165, 255]],
      parts:  [0, 0.15, 0.3, 0.25, 0.7, 0.95, 1, 1, 1],
      spread: [0.04, 0.25, 0.5, 0.85, 0.9, 1, 1, 1, 1],
      spiral: [0, 0, 0, 0, 0.25, 0.75, 1, 1, 1],
      dot:    [0, 0, 0, 0, 0, 0, 0, 0.7, 1]
    };
    const at = (arr, f) => { const i = Math.floor(f), j = Math.min(i + 1, arr.length - 1); return lerp(arr[i], arr[j], f - i); };
    const atc = (arr, f) => { const i = Math.floor(f), j = Math.min(i + 1, arr.length - 1), t = f - i; return arr[i].map((c, k) => lerp(c, arr[j][k], t)); };

    const N = window.innerWidth < 700 ? 420 : 760;
    const parts = Array.from({ length: N }, () => ({ u: Math.random(), v: Math.random(), w: Math.random() }));
    let W = 0, H = 0, dpr = 1;
    let cur = 0, target = 0, shown = -1, swap = 0;

    // Milestone buttons under the slider.
    const ticks = STAGES.map((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tick';
      b.style.setProperty('--f', (i / LAST).toFixed(4));
      b.setAttribute('aria-label', 'Jump to ' + s.title);
      b.innerHTML = '<span>' + s.tick + '</span>';
      b.addEventListener('click', () => snapTo(i * 100));
      ticksEl.appendChild(b);
      return b;
    });

    function setText(i, immediate) {
      const s = STAGES[i];
      const apply = () => { whenEl.textContent = s.when; titleEl.textContent = s.title; descEl.textContent = s.text; };
      ticks.forEach((t, k) => t.classList.toggle('is-active', k === i));
      range.setAttribute('aria-valuetext', s.title + ', ' + s.when);
      clearTimeout(swap);
      if (immediate || reduceMotion) { apply(); textBox.classList.remove('is-out'); return; }
      textBox.classList.add('is-out');
      swap = setTimeout(() => { apply(); textBox.classList.remove('is-out'); }, 190);
    }
    function sync() {
      const v = Number(range.value);
      target = v / 100;
      range.style.setProperty('--p', (v / 8).toFixed(2) + '%');
      const i = clamp(Math.round(target), 0, LAST);
      if (i !== shown) { shown = i; setText(i, false); }
    }
    function snapTo(v) {
      const from = Number(range.value), t0 = performance.now();
      const step = now => {
        const k = clamp((now - t0) / (reduceMotion ? 1 : 320), 0, 1);
        range.value = String(lerp(from, v, ease.outCubic(k)));
        sync();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    range.addEventListener('input', sync);
    range.addEventListener('change', () => snapTo(Math.round(Number(range.value) / 100) * 100));
    range.addEventListener('keydown', e => {
      const i = Math.round(Number(range.value) / 100);
      let n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') n = i + 1;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') n = i - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = LAST;
      if (n !== null) { e.preventDefault(); snapTo(clamp(n, 0, LAST) * 100); }
    });

    function resize() {
      const box = cv.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.floor(box.width * dpr)); H = Math.max(1, Math.floor(box.height * dpr));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    }
    new ResizeObserver(resize).observe(cv.parentElement);
    resize();

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const f = cur, m = Math.min(W, H), cx = W / 2, cy = H / 2;
      const col = atc(P.col, f).map(Math.round);
      const rgb = col.join(',');

      // Soft glow at the centre.
      const gR = at(P.glow, f) * m * 0.62, gA = at(P.glowA, f);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
      g.addColorStop(0, 'rgba(' + rgb + ',' + gA.toFixed(3) + ')');
      g.addColorStop(0.12, 'rgba(' + rgb + ',' + (gA * 0.7).toFixed(3) + ')');
      g.addColorStop(0.4, 'rgba(' + rgb + ',' + (gA * 0.2).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Matter: a loose cloud that gathers into spiral galaxies.
      const pa = at(P.parts, f), R = m * 0.46 * at(P.spread, f), sw = at(P.spiral, f);
      if (pa > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgb(' + col.map(c => Math.round(lerp(c, 255, 0.45))).join(',') + ')';
        for (let i = 0; i < N; i++) {
          const p = parts[i];
          const ang0 = p.v * 6.2832, r0 = Math.sqrt(p.u) * R;
          const arm = p.w < 0.5 ? 0 : Math.PI;
          const ang1 = arm + p.u * 5.2 + (p.v - 0.5) * 0.55 + t * 0.05;
          const r1 = p.u * R * 0.95;
          const x = cx + lerp(Math.cos(ang0) * r0, Math.cos(ang1) * r1, sw);
          const y = cy + lerp(Math.sin(ang0) * r0, Math.sin(ang1) * r1 * 0.52, sw);
          ctx.globalAlpha = pa * (0.25 + 0.75 * p.w);
          const s = (0.7 + p.v * 1.6) * dpr;
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      // A pale blue dot appears late in the story, then a ring marks "you are here".
      const dot = at(P.dot, f);
      if (dot > 0.01) {
        const dx = W * 0.74, dy = H * 0.3;
        const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, 22 * dpr);
        dg.addColorStop(0, 'rgba(150,195,255,' + (0.9 * dot).toFixed(3) + ')');
        dg.addColorStop(1, 'rgba(150,195,255,0)');
        ctx.fillStyle = dg;
        ctx.fillRect(dx - 24 * dpr, dy - 24 * dpr, 48 * dpr, 48 * dpr);
        ctx.fillStyle = 'rgba(210,230,255,' + dot.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(dx, dy, 3.2 * dpr, 0, 6.2832); ctx.fill();
        const you = clamp(f - 7, 0, 1);
        if (you > 0.01) {
          ctx.strokeStyle = 'rgba(240,201,133,' + (0.9 * you).toFixed(3) + ')';
          ctx.lineWidth = 1.2 * dpr;
          ctx.beginPath(); ctx.arc(dx, dy, (15 + Math.sin(t * 2.4) * 2) * dpr, 0, 6.2832); ctx.stroke();
        }
      }
    }

    sync();
    setText(0, true);
    cur = target;
    onTick((dt, t) => {
      if (state.view !== 'timeline') return;
      cur += (target - cur) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 6));
      draw(t);
    });
    document.addEventListener('viewchange', e => { if (e.detail.id === 'timeline') resize(); });
  }


  /* ------------------------------------------------------------------ *
   *  Sign-up form (front end only)
   * ------------------------------------------------------------------ */
  function initSignup() {
    const form = $('#signup');
    if (!form) return;
    const email = $('#email'), msg = $('#signupMsg');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        email.setAttribute('aria-invalid', 'true');
        msg.className = 'signup__msg is-error';
        msg.textContent = 'Enter an email address like name@example.com.';
        email.focus();
        return;
      }
      email.removeAttribute('aria-invalid');
      // TODO: send `v` to your email service (Mailchimp, ConvertKit, a form backend...) before launch.
      msg.className = 'signup__msg is-ok';
      msg.textContent = 'You’re on the list. Welcome aboard.';
      form.reset();
    });
    email.addEventListener('input', () => { if (email.getAttribute('aria-invalid')) { email.removeAttribute('aria-invalid'); msg.textContent = ''; msg.className = 'signup__msg'; } });
  }


  /* ------------------------------------------------------------------ *
   *  Preloader, then start
   * ------------------------------------------------------------------ */
  function reveal() {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    router.start();
  }

  function initPreloader() {
    const pre = $('.preloader');
    if (!pre || reduceMotion) { if (pre) pre.remove(); reveal(); return; }
    const count = $('#loadCount'), bar = $('.preloader__bar i');
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const start = performance.now(), dur = 1300;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      pre.classList.add('is-done');
      reveal();
      setTimeout(() => pre.remove(), 1500);
    };
    const step = now => {
      const k = clamp((now - start) / dur, 0, 1);
      const v = Math.round(ease.outCubic(k) * 100);
      count.textContent = String(v);
      bar.style.transform = 'scaleX(' + (v / 100) + ')';
      if (k < 1) requestAnimationFrame(step);
      else fonts.then(finish);
    };
    requestAnimationFrame(step);
    setTimeout(finish, 4000);   // safety net if fonts are slow
  }

  /* ------------------------------------------------------------------ */
  initStarfield();
  initHome();
  initPlanets();
  initMissions();
  initTravel();
  initLight();
  initTimeline();
  initSignup();
  requestAnimationFrame(frame);
  initPreloader();
})();
