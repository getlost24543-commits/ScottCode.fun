const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, A = reduce ? 0 : 1;
let vw, vh, cur = 0, vel = 0, T = {}, docH;

/* universe tour chapters */
const CH = [["SUN", "The Sun is 99.86% of everything", "Almost all the mass in our Solar System is the Sun. Every planet, moon and asteroid together is a rounding error."], ["MERCURY", "Sunrise to sunrise takes 176 days", "Mercury zips round the Sun in 88 days but spins so slowly that one day on it lasts about 176 Earth days."], ["VENUS", "A day is longer than a year", "Venus spins in about 243 Earth days and orbits the Sun in about 225. It also spins backwards."], ["EARTH", "Home is 71% ocean", "Water covers about 71% of Earth. It is the only place we know with life."], ["MOON", "The Moon is drifting away", "It moves about 3.8 cm farther from us every year, roughly as fast as your fingernails grow."], ["MARS", "A volcano 2.5 times taller than Everest", "Olympus Mons is about 22 km high, the tallest volcano known in the Solar System."], ["JUPITER", "A storm wider than Earth", "The Great Red Spot has raged for centuries. Jupiter also has over 90 moons."], ["SATURN", "It would float in water", "Saturn is less dense than water. Its rings are 280,000 km wide but often only about ten metres thick."], ["URANUS", "The planet that rolls", "Uranus is tipped on its side, about 98 degrees, so it rolls around the Sun like a ball."], ["NEPTUNE", "Winds faster than sound", "Winds above 2,000 km/h blow on Neptune. One trip around the Sun takes 165 years."], ["BLACK HOLE", "Not even light escapes", "The black hole at the centre of our galaxy is about 4 million times heavier than the Sun."], ["NEUTRON", "A teaspoon weighs billions of tonnes", "Neutron stars are squashed so hard that atoms nearly vanish. Some spin hundreds of times a second."], ["LIGHT", "Old light in your eyes", "Sunlight is 8 minutes old. Light from the Andromeda galaxy left about 2.5 million years ago."], ["GALAXY", "Hundreds of billions of stars", "The Milky Way has 100 to 400 billion stars, and it is on course to merge with Andromeda in about 4 to 5 billion years."], ["UNIVERSE", "13.8 billion years and still growing", "The part we can see is about 93 billion light-years across, and space is still expanding."], ["YOU", "You are made of stars", "The iron in your blood and the calcium in your bones were forged inside stars that died long ago."]];
$('#chapters').innerHTML = CH.map((c, i) => `<article class="chap"><div class="cbig">${c[0]}</div><div class="cbody"><span class="cn">${i + 1} of ${CH.length}</span><h3>${c[1]}</h3><p>${c[2]}</p></div></article>`).join('');
const chaps = $$('.chap');

/* split hero letters */
$$('[data-letters]').forEach(el => {
  el.innerHTML = [...el.textContent].map(c => `<span>${c}</span>`).join('');
});
const letters = $$('.line span');

/* split words for scroll reveal */
const wp = $('#words');
wp.innerHTML = wp.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
const words = $$('.w');

const track = $('#track'), cards = $$('.card'), hs = $('#hscroll');
const rows = $$('.mrow'), mq = $('#marquees');
const trail = $('#trail'), rocket = $('#rocket'), len = trail.getTotalLength();
trail.style.strokeDasharray = len; trail.style.strokeDashoffset = len;
const notes = $$('.note'), planet = $('#planet'), d1 = $('#d1'), d2 = $('#d2');

function measure() {
  vw = innerWidth; vh = innerHeight;
  hs.style.height = (track.scrollWidth - vw + vh * 1.2) + 'px';
  $$('[data-sec]').forEach(el => {
    const r = el.getBoundingClientRect();
    T[el.dataset.sec] = { top: r.top + scrollY, h: el.offsetHeight };
  });
  T.mq = { top: mq.getBoundingClientRect().top + scrollY, h: mq.offsetHeight };
  docH = document.documentElement.scrollHeight;
}
addEventListener('resize', measure);
addEventListener('load', measure);
measure();

/* background stars with parallax */
const bg = $('#bg'), ctx = bg.getContext('2d');
const comets = [];
let stars = [], warp = 0, drift = 0, warpOn = false;
function sizeBg() {
  bg.width = innerWidth; bg.height = innerHeight;
  stars = Array.from({ length: 220 }, () => ({ x: Math.random() * bg.width, y: Math.random() * bg.height, z: Math.random() * .9 + .1, p: Math.random() * 6 }));
}
addEventListener('resize', sizeBg); sizeBg();

/* cursor */
const cur_el = $('#cursor'); let cx = 0, cy = 0, tx = 0, ty = 0;
addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
$$('.card, .hero h1, .note, .proj.live, .flip, .btn').forEach(el => {
  el.addEventListener('mouseenter', () => cur_el.classList.add('big'));
  el.addEventListener('mouseleave', () => cur_el.classList.remove('big'));
});

function loop(t) {
  t *= .001;
  const target = scrollY;
  vel = target - cur;
  cur += vel * .09;
  const prog = (key, pinned = true) => {
    const s = T[key]; if (!s) return 0;
    return pinned ? clamp((cur - s.top) / (s.h - vh)) : clamp((cur + vh * .55 - s.top) / s.h);
  };

  $('#progress').style.transform = `scaleX(${clamp(cur / (docH - vh))})`;

  /* stars */
  ctx.clearRect(0, 0, bg.width, bg.height);
  warp += ((warpOn && !reduce ? 18 : 0) - warp) * .08;
  drift += warp;
  for (const s of stars) {
    let y = (s.y - cur * s.z * .5 + drift * s.z) % bg.height; if (y < 0) y += bg.height;
    ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * s.z + s.p));
    ctx.fillStyle = s.z > .8 ? '#ffd9c2' : '#dfe8ff';
    ctx.fillRect(s.x, y, s.z * 2.2, s.z * 2.2 + warp * s.z * 3);
  }

  document.body.style.setProperty('--sy', cur);
  if (!reduce && Math.random() < .004) comets.push({ x: Math.random() * bg.width, y: -10, vx: -4 - Math.random() * 4, vy: 7 + Math.random() * 5, l: 1 });
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i]; c.x += c.vx; c.y += c.vy; c.l -= .008;
    if (c.l <= 0) { comets.splice(i, 1); continue; }
    const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * 9, c.y - c.vy * 9);
    g.addColorStop(0, `rgba(255,255,255,${c.l})`); g.addColorStop(1, 'rgba(106,75,255,0)');
    ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - c.vx * 9, c.y - c.vy * 9); ctx.stroke();
  }
  chaps.forEach((c, i) => {
    const r = c.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(1 - (r.top + r.height) / (vh + r.height)), d = i % 2 ? -1 : 1;
    const big = c.firstElementChild, body = c.lastElementChild;
    big.style.transform = `translateX(${(p - .5) * -d * vw * .9 + (d > 0 ? vw * .05 : 0)}px) rotate(${(p - .5) * 6 * A * d}deg) scale(${.85 + Math.sin(p * Math.PI) * .3})`;
    body.style.opacity = clamp(Math.sin(p * Math.PI) * 2.2);
    body.style.transform = `translateY(${(.5 - p) * 120 * A}px) skewY(${(.5 - p) * 6 * A}deg)`;
  });
  /* hero: wiggly letters that scatter on scroll */
  const hp = clamp(cur / vh);
  letters.forEach((l, i) => {
    const wob = Math.sin(t * 2 + i * .9) * 6 * A;
    const y = wob + hp * vh * (i % 2 ? .5 : -.35) * A + Math.sin(cur * .006 + i) * 25 * hp * A;
    const r = Math.sin(cur * .004 + i * 1.7) * 30 * hp * A;
    l.style.transform = `translateY(${y}px) rotate(${r}deg)`;
  });
  $('.hero').style.opacity = 1 - hp * .9;

  /* marquees: speed and skew follow scroll velocity */
  const sk = clamp(vel * .12, -22, 22) * A;
  rows.forEach((row, i) => {
    const w = row.firstElementChild.offsetWidth;
    const off = (t * 60 + cur * .7) % w;
    row.style.transform = `translateX(${i ? -w + off : -off}px) skewX(${sk}deg)`;
  });

  /* words light up one by one */
  const wpv = clamp((cur + vh * .75 - T.words.top) / (T.words.h * .9));
  words.forEach((w, i) => { w.style.opacity = clamp(.12 + (wpv * words.length * 1.15 - i) * .5, .12, 1); });

  /* horizontal scroll with wavy cards */
  const p = prog('hscroll');
  track.style.transform = `translateX(${-p * (track.scrollWidth - vw)}px)`;
  cards.forEach((c, i) => {
    const y = Math.sin(p * 9 + i * 1.4) * 45 * A;
    const r = Math.sin(p * 7 + i) * 5 * A;
    c.style.transform = `translateY(${y}px) rotate(${r}deg)`;
  });

  /* rocket along wavy path */
  const pp = prog('path', false);
  const L = pp * len;
  trail.style.strokeDashoffset = len - L;
  const a = trail.getPointAtLength(L), b = trail.getPointAtLength(Math.min(len, L + 2));
  rocket.setAttribute('transform', `translate(${a.x},${a.y}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI})`);
  notes.forEach(n => n.classList.toggle('on', pp >= +n.dataset.at));

  /* dive into the planet */
  const dp = prog('dive');
  planet.style.transform = `scale(${.15 + Math.pow(dp, 3) * 70})`;
  d1.style.opacity = 1 - clamp(dp * 3);
  d1.style.transform = `scale(${1 + dp * 2})`;
  d2.style.opacity = clamp((dp - .7) * 4);
  d2.style.transform = `scale(${.6 + clamp((dp - .6) * 2.5) * .4})`;

  /* cursor */
  cx += (tx - cx) * .18; cy += (ty - cy) * .18;
  cur_el.style.transform = `translate(${cx}px,${cy}px)`;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


/* ---------- landing extras ---------- */
$('#yr').textContent = new Date().getFullYear();
$('#top-btn').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

/* hyperdrive: hold H or hold the button */
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'h' && !e.repeat) warpOn = true; });
addEventListener('keyup', e => { if (e.key.toLowerCase() === 'h') warpOn = false; });
const wb = $('#warpBtn');
['pointerdown'].forEach(ev => wb.addEventListener(ev, e => { e.preventDefault(); warpOn = true; }));
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => wb.addEventListener(ev, () => warpOn = false));

/* counters */
const io = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  io.unobserve(en.target);
  const el = en.target, end = +el.dataset.count, dec = +(el.dataset.dec || 0), t0 = performance.now(), dur = 1800;
  (function tick(n) {
    const k = clamp((n - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = (end * e).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}), { threshold: .6 });
$$('[data-count]').forEach(el => io.observe(el));

/* flip-card facts */
const FACTS = [
  ['How long is a day on Venus?', 'Longer than its year. Venus spins in about 243 Earth days but orbits the Sun in about 225. It also spins backwards.'],
  ['Could Saturn float?', 'In a big enough bathtub, yes. Saturn is less dense than water, about 0.69 times as dense.'],
  ['How tall is the tallest volcano?', 'Olympus Mons on Mars is about 22 km high, roughly two and a half times the height of Mount Everest.'],
  ['What is the light from Andromeda?', 'About 2.5 million years old. You see the galaxy as it was before humans existed.'],
  ['How far has Voyager 1 gone?', 'More than 24 billion km from Earth since launching in 1977. It is the farthest human-made object.'],
  ['How heavy is neutron star stuff?', 'A teaspoon of it would weigh billions of tonnes. Gravity squashes atoms until almost only neutrons remain.'],
  ['How long do Moon footprints last?', 'Possibly millions of years. There is no wind or rain on the Moon to wear them away.'],
  ['Where is most of the Solar System\'s mass?', 'In the Sun, about 99.86 percent of it. Everything else is a rounding error.']
];
const grid = $('#flipGrid');
FACTS.forEach(([q, a]) => {
  const d = document.createElement('div');
  d.className = 'flip'; d.tabIndex = 0; d.setAttribute('role', 'button');
  d.innerHTML = `<div class="flip-in"><div class="face front">${q}</div><div class="face back">${a}</div></div>`;
  const flip = () => d.classList.toggle('on');
  d.addEventListener('click', flip);
  d.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  d.addEventListener('mouseenter', () => cur_el.classList.add('big'));
  d.addEventListener('mouseleave', () => cur_el.classList.remove('big'));
  grid.appendChild(d);
});

/* random fact typewriter */
const ONE = [
  'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  'There may be more stars in the universe than grains of sand on all of Earth\'s beaches.',
  'A year on Mercury is just 88 Earth days.',
  'Jupiter\'s Great Red Spot is a storm wider than Earth.',
  'Space is not totally empty: it still holds a few atoms in every cubic metre.',
  'The Milky Way and Andromeda are on course to merge in about 4 to 5 billion years.',
  'Footprints, flags and rovers are all still sitting up there right now.',
  'Your atoms were made inside stars that died long before the Sun was born.',
  'Light from the Sun takes thousands of years to get out of the Sun itself, then minutes to reach us.',
  'Neptune has supersonic winds that blow faster than 2,000 km/h.'
];
let last = -1, timer;
$('#randBtn').addEventListener('click', () => {
  let i; do { i = Math.floor(Math.random() * ONE.length); } while (i === last); last = i;
  const out = $('#randText'), txt = ONE[i]; let n = 0;
  clearInterval(timer);
  if (reduce) { out.textContent = txt; return; }
  timer = setInterval(() => { out.textContent = txt.slice(0, ++n); if (n >= txt.length) clearInterval(timer); }, 22);
});


/* ---------- premium layer ---------- */
/* preloader + staggered hero entrance */
letters.forEach((l, i) => l.style.transitionDelay = (1.1 + i * .06) + 's');
{
  const pre = $('#pre'), n = $('#preN'); let v = 0;
  const id = setInterval(() => {
    v = Math.min(100, v + 1 + Math.random() * 4); n.textContent = Math.floor(v);
    if (v >= 100) { clearInterval(id); setTimeout(() => { pre.classList.add('done'); document.body.classList.add('ready'); measure(); }, 250); setTimeout(() => pre.remove(), 1400); }
  }, 28);
}
/* spotlight + tilt */
$$('.stat, .proj').forEach(el => el.addEventListener('mousemove', e => {
  const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
  if (el.classList.contains('proj') && !reduce) el.style.transform = `perspective(700px) rotateY(${(x / r.width - .5) * 10}deg) rotateX(${(.5 - y / r.height) * 10}deg) translateY(-6px)`;
}));
$$('.proj').forEach(el => el.addEventListener('mouseleave', () => el.style.transform = ''));
/* magnetic buttons */
$$('.btn, .warp-btn, .fab').forEach(b => {
  b.addEventListener('mousemove', e => { if (reduce) return; const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px,${(e.clientY - r.top - r.height / 2) * .4}px)`; });
  b.addEventListener('mouseleave', () => b.style.transform = '');
});

/* ---------- live chat ---------- */
const CONFIG = {
  tawk: '6b0a8cc6b295e13cb436bfc3/1k8gjbq8f',   // paste 'PROPERTY_ID/WIDGET_ID' from tawk.to to switch on REAL live chat with you
  email: ''   // your email, used by the Contact reply
};
if (CONFIG.tawk) {
  const sc = document.createElement('script'); sc.async = true; sc.src = 'https://embed.tawk.to/' + CONFIG.tawk; document.head.appendChild(sc);
  $('#chatFab').remove(); $('#chat').remove();
} else {
  const box = $('#chat'), M = $('#chatM');
  const add = (t, who) => { const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = t; M.appendChild(d); M.scrollTop = M.scrollHeight; return d; };
  const RULES = [
    [/^(hi|hey|hello|yo|sup)\b/, () => 'Hey! I am Scott Bot. Ask me for a space fact, about the projects, or how to get in touch.'],
    [/fact|space|venus|saturn|mars|planet|star|moon/, () => ONE[Math.floor(Math.random() * ONE.length)]],
    [/project|orbital|panche|built|work/, () => 'The big one right now is ORBITAL, a scroll-driven space journey. Open it from the Projects section, or go to scottcode.fun/Panche.'],
    [/contact|email|hire|reach|message|talk/, () => CONFIG.email ? 'Email Scott at ' + CONFIG.email : 'Scott has not added a public email yet. Check back soon!'],
    [/who|scott|about/, () => 'Scott Code builds interactive, scroll-driven websites by hand. No templates, just HTML, CSS and JavaScript.'],
    [/how|made|tech|stack|code/, () => 'This whole page is plain HTML, CSS and JavaScript. No frameworks. The scroll effects run on one animation loop.'],
    [/hyper|warp|h key/, () => 'Hold the H key (or the hyperdrive button) and watch the stars streak.'],
    [/thank|thx/, () => 'Anytime! 🚀']
  ];
  const reply = q => {
    const t = q.toLowerCase().trim();
    const hit = RULES.find(([re]) => re.test(t));
    const typing = add('…', 'bot typing');
    setTimeout(() => { typing.remove(); add(hit ? hit[1]() : 'Not sure about that one. Try asking for a space fact, the projects, or contact info.', 'bot'); }, 500 + Math.random() * 500);
  };
  let opened = false;
  const toggle = open => { box.hidden = !open; if (open && !opened) { opened = true; add('Hi! I am Scott Bot 👋 What would you like to know?', 'bot'); } if (open) $('#chatI').focus(); };
  $('#chatFab').addEventListener('click', () => toggle(box.hidden));
  $('#chatX').addEventListener('click', () => toggle(false));
  $('#chatF').addEventListener('submit', e => { e.preventDefault(); const i = $('#chatI'), v = i.value.trim(); if (!v) return; add(v, 'me'); i.value = ''; reply(v); });
  $$('#chatQ button').forEach(b => b.addEventListener('click', () => { add(b.textContent, 'me'); reply(b.textContent); }));
}


/* ---------- hamburger menu ---------- */
const burger = $('#burger'), setMenu = on => { document.body.classList.toggle('menu', on); burger.setAttribute('aria-expanded', on); burger.setAttribute('aria-label', on ? 'Close menu' : 'Open menu'); $('#menu').setAttribute('aria-hidden', !on); };
burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu')));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
$$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
$('#menuChat').addEventListener('click', () => { setMenu(false); if (window.Tawk_API && Tawk_API.maximize) Tawk_API.maximize(); else if ($('#chatFab')) $('#chatFab').click(); });
