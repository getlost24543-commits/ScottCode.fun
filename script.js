const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, A = reduce ? 0 : 1;
let vw, vh, cur = 0, vel = 0, T = {}, docH;

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
let stars = [];
function sizeBg() {
  bg.width = innerWidth; bg.height = innerHeight;
  stars = Array.from({ length: 220 }, () => ({ x: Math.random() * bg.width, y: Math.random() * bg.height, z: Math.random() * .9 + .1, p: Math.random() * 6 }));
}
addEventListener('resize', sizeBg); sizeBg();

/* cursor */
const cur_el = $('#cursor'); let cx = 0, cy = 0, tx = 0, ty = 0;
addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
$$('.card, .hero h1, .note').forEach(el => {
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
  for (const s of stars) {
    let y = (s.y - cur * s.z * .5) % bg.height; if (y < 0) y += bg.height;
    ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t * s.z + s.p));
    ctx.fillStyle = s.z > .8 ? '#ffd9c2' : '#dfe8ff';
    ctx.fillRect(s.x, y, s.z * 2.2, s.z * 2.2);
  }

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
