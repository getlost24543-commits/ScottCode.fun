const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let vw = innerWidth, vh = innerHeight;
const MINZ = .06, MAXZ = 6, B = { x0: -2700, x1: 3900, y0: -2300, y1: 3100 };
const cam = { x: 0, y: 0, z: .04 }, tgt = { x: 0, y: 0, z: .04 };
const vp = $('#viewport'), layers = $$('.layer'), sts = $$('.st');

/* depth layers: far nebulae + near bokeh */
const rnd = (a, b) => a + Math.random() * (b - a), COL = ['#7cf3ff', '#b388ff', '#ff7ab8', '#5b3df0'];
const blobs = (el, n, s0, s1, op, blur, spread) => { for (let i = 0; i < n; i++) { const b = document.createElement('div'), s = rnd(s0, s1), c = COL[i % 4]; b.className = 'blob'; b.style.cssText = `left:${rnd(-spread, spread)}px;top:${rnd(-spread, spread)}px;width:${s}px;height:${s}px;background:radial-gradient(circle,${c}${op},transparent 68%);filter:blur(${blur}px)`; el.appendChild(b); } };
blobs($('#far'), 26, 900, 2200, '40', 30, 6000);
blobs($('#mid'), 18, 300, 800, '2a', 20, 4500);
blobs($('#near'), 16, 120, 420, '22', 14, 2500);

/* camera */
function zoomAt(f, sx, sy) {
  const z2 = clamp(tgt.z * f, MINZ, MAXZ), wx = tgt.x + (sx - vw / 2) / tgt.z, wy = tgt.y + (sy - vh / 2) / tgt.z;
  tgt.z = z2; tgt.x = wx - (sx - vw / 2) / z2; tgt.y = wy - (sy - vh / 2) / z2;
}
const fly = (x, y, z) => {
  hideHint(); tgt.z = Math.min(tgt.z, .16);
  setTimeout(() => { tgt.x = x; tgt.y = y; }, 380);
  setTimeout(() => { tgt.z = z; }, 1050);
};
const flyTo = el => fly(el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2 - (el.classList.contains('hero') ? 0 : 40), clamp(vw * .86 / el.offsetWidth, .18, 1));
const home = () => flyTo(sts[0]);
let hinted = false; const hideHint = () => { if (!hinted) { hinted = true; $('#hint').classList.add('off'); } };

/* input: wheel pans, ctrl/pinch zooms */
vp.addEventListener('wheel', e => {
  e.preventDefault(); hideHint();
  if (e.ctrlKey) zoomAt(Math.exp(-e.deltaY * .012), e.clientX, e.clientY);
  else { tgt.x += e.deltaX / cam.z; tgt.y += e.deltaY / cam.z; }
}, { passive: false });
const ptrs = new Map(); let vx = 0, vy = 0, lastD = 0, dragging = false;
vp.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; vp.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e); dragging = true; vx = vy = 0; vp.classList.add('drag'); hideHint(); lastD = 0; });
vp.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 1) { const dx = e.clientX - p.clientX, dy = e.clientY - p.clientY; tgt.x -= dx / cam.z; tgt.y -= dy / cam.z; vx = dx; vy = dy; }
  ptrs.set(e.pointerId, e);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); if (lastD) zoomAt(d / lastD, (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2); lastD = d; }
});
const up = e => { ptrs.delete(e.pointerId); lastD = 0; if (!ptrs.size) { dragging = false; vp.classList.remove('drag'); } };
vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
vp.addEventListener('dblclick', e => zoomAt(2, e.clientX, e.clientY));
addEventListener('keydown', e => {
  if (/INPUT/.test(e.target.tagName)) return;
  const s = 120 / cam.z, k = e.key;
  if (k === 'ArrowLeft') tgt.x -= s; if (k === 'ArrowRight') tgt.x += s; if (k === 'ArrowUp') tgt.y -= s; if (k === 'ArrowDown') tgt.y += s;
  if (k === '+' || k === '=') zoomAt(1.4, vw / 2, vh / 2); if (k === '-') zoomAt(1 / 1.4, vw / 2, vh / 2); if (k === '0') home();
});
$('#zin').onclick = () => zoomAt(1.5, vw / 2, vh / 2); $('#zout').onclick = () => zoomAt(1 / 1.5, vw / 2, vh / 2); $('#zhome').onclick = home; $('#logo').onclick = e => { e.preventDefault(); home(); };

/* stars with motion streaks */
const bg = $('#bg'), ctx = bg.getContext('2d'); let stars = [];
const sizeBg = () => { vw = innerWidth; vh = innerHeight; bg.width = vw; bg.height = vh; stars = Array.from({ length: 280 }, () => ({ x: Math.random(), y: Math.random(), d: Math.random() * .9 + .1, p: Math.random() * 6 })); };
addEventListener('resize', sizeBg); sizeBg();

/* minimap */
const mini = $('#mini'), mc = mini.getContext('2d'), MW = 180, MH = 120, bw = B.x1 - B.x0, bh = B.y1 - B.y0;
const mx = x => (x - B.x0) / bw * MW, my = y => (y - B.y0) / bh * MH;
mini.addEventListener('click', e => { const r = mini.getBoundingClientRect(); fly(B.x0 + (e.clientX - r.left) / r.width * bw, B.y0 + (e.clientY - r.top) / r.height * bh, Math.max(.35, tgt.z)); });

/* menu */
$('#menuNav').innerHTML = sts.map((s, i) => `<a href="#" data-i="${i}" style="--i:${i}">${s.dataset.name}</a>`).join('') + `<button id="menuChat" style="--i:${sts.length}">Live chat</button>`;
const setMenu = on => { document.body.classList.toggle('menu', on); $('#burger').setAttribute('aria-expanded', on); $('#menu').setAttribute('aria-hidden', !on); };
$('#burger').onclick = () => setMenu(!document.body.classList.contains('menu'));
$$('#menuNav a').forEach(a => a.onclick = e => { e.preventDefault(); setMenu(false); flyTo(sts[+a.dataset.i]); });
$('#menuChat').onclick = () => { setMenu(false); openChat(); };
$('#sigBtn').onclick = () => openChat();
addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeChat(); } });

/* main loop */
let px = 0, py = 0;
function loop() {
  const k = reduce ? .4 : .11;
  if (!dragging && (Math.abs(vx) > .05 || Math.abs(vy) > .05)) { tgt.x -= vx / cam.z; tgt.y -= vy / cam.z; vx *= .93; vy *= .93; }
  tgt.x = clamp(tgt.x, B.x0, B.x1); tgt.y = clamp(tgt.y, B.y0, B.y1);
  cam.x += (tgt.x - cam.x) * k; cam.y += (tgt.y - cam.y) * k; cam.z += (tgt.z - cam.z) * k;
  layers.forEach(l => { const d = +l.dataset.d, zd = Math.pow(cam.z, d); l.style.transform = `translate3d(${vw / 2 - cam.x * d * zd}px,${vh / 2 - cam.y * d * zd}px,0) scale(${zd})`; });
  const sx = (cam.x - px) * cam.z, sy = (cam.y - py) * cam.z; px = cam.x; py = cam.y;
  ctx.clearRect(0, 0, vw, vh); ctx.lineCap = 'round';
  const zs = 1 + (cam.z - .9) * .25;
  for (const s of stars) {
    let x = (s.x * vw - cam.x * cam.z * s.d * .5) % vw, y = (s.y * vh - cam.y * cam.z * s.d * .5) % vh; if (x < 0) x += vw; if (y < 0) y += vh;
    x = vw / 2 + (x - vw / 2) * (1 + (zs - 1) * s.d); y = vh / 2 + (y - vh / 2) * (1 + (zs - 1) * s.d);
    ctx.strokeStyle = `rgba(230,236,255,${.3 + .7 * Math.abs(Math.sin(performance.now() * .001 * s.d + s.p))})`;
    ctx.lineWidth = s.d * 2.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sx * s.d * .9 + .1, y + sy * s.d * .9); ctx.stroke();
  }
  $$('.zr').forEach(el => { el.style.opacity = clamp((cam.z - +el.dataset.zmin) / .35 + .15, 0, 1) * (cam.z >= +el.dataset.zmin - .1 ? 1 : 0); });
  mc.clearRect(0, 0, MW, MH);
  sts.forEach(s => { mc.fillStyle = '#7cf3ff'; mc.beginPath(); mc.arc(mx(s.offsetLeft + s.offsetWidth / 2), my(s.offsetTop + s.offsetHeight / 2), 3, 0, 7); mc.fill(); });
  mc.strokeStyle = '#ff7ab8'; mc.lineWidth = 1.5; mc.strokeRect(mx(cam.x - vw / 2 / cam.z), my(cam.y - vh / 2 / cam.z), vw / cam.z / bw * MW, vh / cam.z / bh * MH);
  $('#readout').textContent = `${Math.round(cam.x)}, ${Math.round(cam.y)} · ×${cam.z.toFixed(2)}`;
  requestAnimationFrame(loop);
}
loop();
/* cinematic intro: zoom out of nothing */
setTimeout(() => { tgt.z = clamp(vw * .86 / sts[0].offsetWidth, .18, 1); }, reduce ? 0 : 500);
setTimeout(() => $('#hint').classList.add('off'), 9000);

/* ================= LIVE CHAT (Firebase) ================= */
let FB = null, unsub = null, mode = 'up', lastSend = 0;
const chat = $('#chat'), E = id => document.getElementById(id);
function openChat() { chat.classList.add('open'); chat.setAttribute('aria-hidden', 'false'); initChat(); }
function closeChat() { chat.classList.remove('open'); chat.setAttribute('aria-hidden', 'true'); }
E('chatX').onclick = closeChat;
const setMode = m => { mode = m; E('tUp').classList.toggle('on', m === 'up'); E('tIn').classList.toggle('on', m === 'in'); E('aName').hidden = m === 'in'; $('#authF .cta').textContent = m === 'up' ? 'Create account' : 'Log in'; E('authMsg').textContent = ''; };
E('tUp').onclick = () => setMode('up'); E('tIn').onclick = () => setMode('in'); setMode('up');
const ERR = { 'auth/email-already-in-use': 'That email already has an account. Try Log in.', 'auth/invalid-credential': 'Wrong email or password.', 'auth/weak-password': 'Password needs 6+ characters.', 'auth/invalid-email': 'That email does not look right.', 'auth/too-many-requests': 'Too many tries. Wait a minute.' };

async function initChat() {
  if (FB) return;
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) { E('authMsg').textContent = 'Chat is not switched on yet. Owner: follow SETUP.md.'; return; }
  try {
    const V = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const [app, A, S] = await Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-auth.js'), import(V + 'firebase-firestore.js')]);
    const a = app.initializeApp(cfg); FB = { A, S, auth: A.getAuth(a), db: S.getFirestore(a) };
  } catch (e) { E('authMsg').textContent = 'Could not load chat. Check your connection.'; return; }
  FB.A.onAuthStateChanged(FB.auth, u => {
    E('authView').hidden = !!u; E('chatView').hidden = !u; E('outBtn').hidden = !u; E('idBtn').hidden = !u;
    E('who').textContent = u ? (u.displayName || '') : '';
    if (unsub) { unsub(); unsub = null; }
    if (u) listen();
  });
}
E('authF').onsubmit = async e => {
  e.preventDefault(); if (!FB) return initChat();
  const msg = E('authMsg'); msg.textContent = '';
  try {
    if (mode === 'up') {
      const n = E('aName').value.trim().replace(/[^\w .-]/g, '').slice(0, 20); if (n.length < 2) { msg.textContent = 'Pick a username (2+ letters).'; return; }
      const c = await FB.A.createUserWithEmailAndPassword(FB.auth, E('aMail').value, E('aPass').value);
      await FB.A.updateProfile(c.user, { displayName: n }); E('who').textContent = n;
    } else await FB.A.signInWithEmailAndPassword(FB.auth, E('aMail').value, E('aPass').value);
  } catch (er) { msg.textContent = ERR[er.code] || 'Something went wrong. Try again.'; }
};
E('outBtn').onclick = () => FB.A.signOut(FB.auth);
E('idBtn').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(FB.auth.currentUser.uid); E('idBtn').textContent = 'Copied'; setTimeout(() => E('idBtn').textContent = 'ID', 1500); };

function listen() {
  const { S, db } = FB, q = S.query(S.collection(db, 'messages'), S.orderBy('ts', 'asc'), S.limitToLast(300));
  unsub = S.onSnapshot(q, snap => {
    const box = E('msgs'), near = box.scrollHeight - box.scrollTop - box.clientHeight < 80, me = FB.auth.currentUser, owner = me && me.uid === window.OWNER_UID;
    box.innerHTML = '';
    if (snap.empty) sys('No messages yet. Say hi!');
    snap.forEach(d => {
      const m = d.data({ serverTimestamps: 'estimate' }), el = document.createElement('div'), s = document.createElement('small');
      el.className = 'm' + (me && m.uid === me.uid ? ' me' : ''); s.textContent = (m.name || '?') + (m.uid === window.OWNER_UID && window.OWNER_UID ? ' ★' : ''); el.appendChild(s);
      el.appendChild(document.createTextNode(m.text));
      if (owner) { const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕'; x.title = 'Delete'; x.onclick = () => S.deleteDoc(d.ref); el.appendChild(x); }
      box.appendChild(el);
    });
    if (near) box.scrollTop = box.scrollHeight;
  }, () => sys('Could not read messages. Check the Firestore rules in SETUP.md.'));
}
function sys(t) { const d = document.createElement('div'); d.className = 'm sys'; d.textContent = t; E('msgs').appendChild(d); E('msgs').scrollTop = E('msgs').scrollHeight; }
E('sendF').onsubmit = async e => {
  e.preventDefault(); const i = E('msgI'), t = i.value.trim(), u = FB && FB.auth.currentUser; if (!t || !u) return;
  if (t.toLowerCase() === '/del chat') {
    i.value = '';
    if (!window.OWNER_UID || u.uid !== window.OWNER_UID) return sys('Only the owner can use that command.');
    const { S, db } = FB, snap = await S.getDocs(S.collection(db, 'messages'));
    for (let a = 0; a < snap.docs.length; a += 400) { const b = S.writeBatch(db); snap.docs.slice(a, a + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
    return sys('Chat cleared.');
  }
  if (Date.now() - lastSend < 1200) return sys('Slow down a little.'); lastSend = Date.now(); i.value = '';
  try { await FB.S.addDoc(FB.S.collection(FB.db, 'messages'), { uid: u.uid, name: (u.displayName || 'guest').slice(0, 20), text: t.slice(0, 300), ts: FB.S.serverTimestamp() }); } catch { sys('Message failed to send.'); }
};
