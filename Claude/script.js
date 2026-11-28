/* ---------- Warp starfield ---------- */
const cv = document.getElementById('stars'), ctx = cv.getContext('2d');
let W, H, stars = [], mx = 0, my = 0, boost = 0, hold = false;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){ W = cv.width = innerWidth; H = cv.height = innerHeight; }
addEventListener('resize', resize); resize();
const N = 600;
const mk = () => ({ x:(Math.random()-.5)*W*2, y:(Math.random()-.5)*H*2, z:Math.random()*W, hue:Math.random()<.15?20:Math.random()<.3?260:200 });
for (let i=0;i<N;i++) stars.push(mk());
addEventListener('mousemove', e => { mx = (e.clientX/W-.5); my = (e.clientY/H-.5); });
addEventListener('pointerdown', () => hold = true);
addEventListener('pointerup', () => hold = false);
let speed = 2;
function frame(){
  const target = reduce ? 0.5 : (hold ? 40 : 2 + Math.abs(scrollY - (frame.last||0))*0.4);
  frame.last = scrollY;
  speed += (target - speed) * 0.06;
  ctx.fillStyle = 'rgba(5,6,15,.35)'; ctx.fillRect(0,0,W,H);
  const cx = W/2 + mx*200, cy = H/2 + my*200;
  for (const s of stars){
    const pz = s.z; s.z -= speed;
    if (s.z < 1){ Object.assign(s, mk()); s.z = W; continue; }
    const k = 300, sx = cx + s.x/s.z*k, sy = cy + s.y/s.z*k;
    const px = cx + s.x/pz*k, py = cy + s.y/pz*k;
    const a = Math.min(1, 1 - s.z/W + .2);
    ctx.strokeStyle = `hsla(${s.hue},90%,80%,${a})`;
    ctx.lineWidth = Math.max(.5, (1 - s.z/W)*2.2);
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(sx,sy); ctx.stroke();
  }
  // HUD
  const c = (0.2 + speed/40*0.99);
  document.getElementById('speed').textContent = c.toFixed(2);
  frame.dist = (frame.dist||0) + speed*0.9;
  document.getElementById('dist').textContent = Math.floor(frame.dist).toLocaleString();
  requestAnimationFrame(frame);
}
frame();
const t0 = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now()-t0)/1000), p = n => String(n).padStart(2,'0');
  document.getElementById('clock').textContent = `${p(Math.floor(s/3600))}:${p(Math.floor(s/60)%60)}:${p(s%60)}`;
}, 1000);

/* ---------- Planet data ---------- */
const P = [
  {n:'Mercury', c:'#b5a79a', r:9,  yr:.24,  g:.38, day:'58.6 Earth days', year:'88 days', moons:0,  d:'Scorched by day, frozen by night. A swing of more than 600°C.'},
  {n:'Venus',   c:'#f0c27a', r:13, yr:.62,  g:.91, day:'243 Earth days',  year:'225 days', moons:0, d:'A day here is longer than its year. Clouds of sulfuric acid, surface hot enough to melt lead.'},
  {n:'Earth',   c:'#4fa3ff', r:14, yr:1,    g:1,   day:'24 hours',        year:'365.25 days', moons:1, d:'The only place we know of with oceans, weather and someone reading this.'},
  {n:'Mars',    c:'#ff6a3d', r:11, yr:1.88, g:.38, day:'24h 37m',         year:'687 days', moons:2, d:'Home to Olympus Mons, a volcano nearly three times taller than Everest.'},
  {n:'Jupiter', c:'#e3b98a', r:30, yr:11.9, g:2.53,day:'9h 56m',          year:'11.9 years', moons:95, d:'The Great Red Spot is a storm wider than Earth that has raged for centuries.'},
  {n:'Saturn',  c:'#f3dca1', r:26, yr:29.5, g:1.07,day:'10h 34m',         year:'29.5 years', moons:146, d:'Its rings are mostly water ice and span 280,000 km, yet are often only 10 m thick.'},
  {n:'Uranus',  c:'#9fe8f0', r:19, yr:84,   g:.89, day:'17h 14m',         year:'84 years', moons:28, d:'Tipped on its side, it rolls around the Sun like a ball.'},
  {n:'Neptune', c:'#5a7bff', r:18, yr:165,  g:1.14,day:'16h 6m',          year:'165 years', moons:16, d:'Supersonic winds above 2,000 km/h blow on this distant ice giant.'},
];
/* ---------- Orrery ---------- */
const orr = document.getElementById('orrery');
orr.insertAdjacentHTML('beforeend','<div class="sun"></div>');
P.forEach((p,i) => {
  const rad = 14 + i*(84/8);           // % of half-size
  const ring = document.createElement('div');
  ring.className = 'ring'; ring.style.width = ring.style.height = rad*1 + '%';
  orr.appendChild(ring);
  const arm = document.createElement('div');
  arm.className = 'arm';
  // compressed period so outer planets still move, keep ratio order
  const dur = 8 * Math.pow(p.yr, .55);
  arm.style.animationDuration = dur + 's';
  arm.style.animationDelay = (-Math.random()*dur) + 's';
  const b = document.createElement('button');
  b.className = 'planet'; b.setAttribute('aria-label', p.n);
  const size = 6 + p.r*0.35;
  b.style.cssText = `width:${size}px;height:${size}px;background:${p.c};color:${p.c};left:${rad/2*orr.clientWidth/100*0 + 0}px`;
  b.dataset.rad = rad; b.dataset.i = i;
  arm.appendChild(b);
  orr.appendChild(arm);
  b.addEventListener('click', () => show(i));
});
function layout(){ document.querySelectorAll('.planet').forEach(b => { b.style.left = (orr.clientWidth * b.dataset.rad/200) + 'px'; }); }
addEventListener('resize', layout); layout();
function show(i){
  const p = P[i], $ = id => document.getElementById(id);
  document.querySelectorAll('.planet').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
  $('c-name').textContent = p.n; $('c-name').style.color = p.c;
  $('c-desc').textContent = p.d; $('c-day').textContent = p.day;
  $('c-year').textContent = p.year; $('c-moons').textContent = p.moons; $('c-g').textContent = p.g + ' g';
}
show(2);

/* ---------- Weight calculator ---------- */
const bars = document.getElementById('bars'), w = document.getElementById('w'), wout = document.getElementById('wout');
P.forEach(p => bars.insertAdjacentHTML('beforeend',
  `<div class="bar"><span>${p.n}</span><i style="background:${p.c};width:0"></i><span></span></div>`));
function upd(){
  const kg = +w.value; wout.textContent = kg + ' kg';
  [...bars.children].forEach((row,i) => {
    const v = kg*P[i].g;
    row.querySelector('i').style.width = (v/(150*2.6)*100) + '%';
    row.lastElementChild.textContent = v.toFixed(1) + ' kg';
  });
}
w.addEventListener('input', upd); upd();
