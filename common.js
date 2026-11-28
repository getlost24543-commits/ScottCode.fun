const $=s=>document.querySelector(s);const ROOT=document.currentScript.src.replace(/js\/common\.js.*$/,'');
document.body.insertAdjacentHTML('afterbegin',`<nav><b>ORBITAL</b><a class=h href="${ROOT}index.html">Universe</a><a class=h href="${ROOT}jwst/index.html">JWST</a><a class=h href="${ROOT}voyager/index.html">Voyager</a><a class=h href="${ROOT}index.html#artemis">Artemis</a><a class=h href="${ROOT}index.html#signal">Chat</a>
<select id=env aria-label="Sound environment"><option value=0>Deep Space</option><option value=1>Observatory</option><option value=2>Mission Control</option><option value=3>Cornfield (original)</option></select><button id=lic>Licensed track</button>
<input id=vol type=range min=0 max=1 step=.05 value=.4 aria-label=Volume><button id=snd aria-pressed=false>Sound off</button></nav><canvas id=bg></canvas>`);
let AC,master,nodes=[];const CH=[[110,165,220,330],[98,147,196,294],[82,123,164,247],[110,165,220,277]];
function startAudio(){AC=AC||new(window.AudioContext||window.webkitAudioContext)();AC.resume();master=AC.createGain();master.gain.value=+$('#vol').value;master.connect(AC.destination);
 const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=900;f.connect(master);
 const lfo=AC.createOscillator(),lg=AC.createGain();lfo.frequency.value=.07;lg.gain.value=400;lfo.connect(lg);lg.connect(f.frequency);lfo.start();nodes=[lfo];
 CH[+$('#env').value].forEach((fr,i)=>[0,4].forEach(d=>{const o=AC.createOscillator(),g=AC.createGain();o.type=i%2?'sine':'triangle';o.frequency.value=fr;o.detune.value=d*(i+1);g.gain.value=.07;o.connect(g);g.connect(f);o.start();nodes.push(o)}));
 if($('#env').value==3){const i0=[0,2,4,2,5,4,2,1];let k=0;arp=setInterval(()=>pluck(SC[i0[k++%8]]*(k%16<8?1:.75),master),520)}}
let arp;const SC=[220,247,262,330,392,440,524,660];
function pluck(f,dest){const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.connect(g);g.connect(dest);o.start(t);o.stop(t+2.3)}
function stopAudio(){clearInterval(arp);nodes.forEach(o=>{try{o.stop()}catch(e){}});nodes=[]}
let on=false;function setSnd(v){on=v;$('#snd').textContent=v?'Sound on':'Sound off';$('#snd').setAttribute('aria-pressed',v);sessionStorage.snd=v?1:'';stopAudio();if(v)startAudio()}
$('#snd').onclick=()=>setSnd(!on);$('#env').onchange=()=>on&&setSnd(true);$('#vol').oninput=e=>master&&(master.gain.value=+e.target.value);
$('#lic').onclick=()=>{const u=(window.ORBITAL||{}).MUSIC_URL;if(u&&u.includes('/embed/')){let b=$('#lp');if(!b){document.body.insertAdjacentHTML('beforeend',`<iframe id=lp src="${u}" width=300 height=152 allow="autoplay;encrypted-media" style="position:fixed;right:10px;bottom:10px;z-index:25;border:0;border-radius:12px"></iframe>`)}else b.remove()}else open(u||'https://open.spotify.com/search/Cornfield%20Chase','_blank','noopener')};
if(sessionStorage.snd)$('#snd').textContent='Resume sound';$('#snd').addEventListener('click',()=>{},{once:true});
function stars(){const r=new THREE.WebGLRenderer({canvas:$('#bg'),alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1:1.5));
 const s=new THREE.Scene(),c=new THREE.PerspectiveCamera(60,1,.1,4000),N=innerWidth<700?1500:4000,p=new Float32Array(N*3);
 for(let i=0;i<N*3;i++)p[i]=(Math.random()-.5)*2000;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));
 const pts=new THREE.Points(g,new THREE.PointsMaterial({size:1.6,color:0xcfe0ff,sizeAttenuation:false}));s.add(pts);
 const rs=()=>{r.setSize(innerWidth,innerHeight);c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix()};rs();addEventListener('resize',rs);return{r,s,c,pts}}
document.querySelectorAll('.rail').forEach(el=>{let d,x,sl;el.onpointerdown=e=>{if(e.pointerType=='mouse'){d=1;x=e.clientX;sl=el.scrollLeft}};addEventListener('pointerup',()=>d=0);el.onpointermove=e=>{if(d)el.scrollLeft=sl-(e.clientX-x)};
 el.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){const m=el.scrollLeft,M=el.scrollWidth-el.clientWidth;if((e.deltaY>0&&m<M-1)||(e.deltaY<0&&m>0)){e.preventDefault();el.scrollLeft+=e.deltaY}}},{passive:false})});
// 3D viewer: drag to rotate, wheel/pinch-less zoom
function viewer3d(cv,build){const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio,2));
 const s=new THREE.Scene(),c=new THREE.PerspectiveCamera(45,1,.1,100),o=new THREE.Group();s.add(o);s.add(new THREE.AmbientLight(0x8899cc,.7));const dl=new THREE.DirectionalLight(0xffffff,1.4);dl.position.set(3,4,5);s.add(dl);build(o);
 let rx=.3,ry=.6,z=11,d=0,x,y;cv.onpointerdown=e=>{d=1;x=e.clientX;y=e.clientY;cv.setPointerCapture(e.pointerId)};cv.onpointerup=()=>d=0;
 cv.onpointermove=e=>{if(d){ry+=(e.clientX-x)*.008;rx+=(e.clientY-y)*.008;x=e.clientX;y=e.clientY}};cv.addEventListener('wheel',e=>{e.preventDefault();z=Math.min(24,Math.max(3,z+e.deltaY*.01))},{passive:false});
 const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
 (function f(){const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!=w*r.getPixelRatio())r.setSize(w,h,false),c.aspect=w/h,c.updateProjectionMatrix();if(!d&&!rm)ry+=.003;
  o.rotation.y+=(ry-o.rotation.y)*.15;o.rotation.x+=(rx-o.rotation.x)*.15;c.position.z+=(z-c.position.z)*.1;r.render(s,c);requestAnimationFrame(f)})();return{o,view:(zz,xx)=>{z=zz;rx=xx}}}
function modal(id,html){const m=$('#'+id);m.innerHTML=html;m.classList.add('on');m.onclick=e=>{if(e.target==m||e.target.dataset.x)m.classList.remove('on')}}
addEventListener('keydown',e=>{if(e.key=='Escape')document.querySelectorAll('#panel,#viewer').forEach(m=>m.classList.remove('on'))});
async function chat(){const box=$('#log');if(!box)return;const K=window.ORBITAL||{},live=K.SUPABASE_URL&&K.SUPABASE_ANON_KEY;
 const name=sessionStorage.nm||(sessionStorage.nm='Voyager-'+Math.floor(Math.random()*9000+1000));$('#me').textContent=name;
 const esc=t=>String(t).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
 const add=m=>{box.insertAdjacentHTML('beforeend',`<div class=m><u>${esc(m.name)}</u> <i>${new Date(m.created_at).toLocaleString()}</i><br>${esc(m.body)} ${live&&m.id?`<button class=btn data-r="${m.id}" style="padding:1px 8px">report</button>`:''}</div>`);box.scrollTop=1e9};
 let send;
 if(live){try{await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';s.onload=ok;s.onerror=no;document.head.append(s)});
  const sb=supabase.createClient(K.SUPABASE_URL,K.SUPABASE_ANON_KEY);
  const {data}=await sb.from('messages').select('*').order('created_at',{ascending:false}).limit(100);(data||[]).reverse().forEach(add);
  const ch=sb.channel('room',{config:{presence:{key:name}}});
  ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>add(p.new)).on('presence',{event:'sync'},()=>{$('#on').textContent=Object.keys(ch.presenceState()).length+' online'})
   .subscribe(st=>{if(st=='SUBSCRIBED')ch.track({n:name})}); // supabase-js reconnects automatically
  send=async b=>{const {error}=await sb.from('messages').insert({name,body:b});if(error)alert('Message rejected: '+error.message)};
  box.onclick=async e=>{const id=e.target.dataset.r;if(id){await sb.from('reports').insert({message_id:+id});e.target.textContent='reported'}}
 }catch(e){$('#on').textContent='Chat server unreachable. Reload to retry.';return}}
 else{$('#on').textContent='DEMO MODE: messages stay on this device only';JSON.parse(localStorage.demo||'[]').forEach(add);
  send=async b=>{const m={name,body:b,created_at:new Date().toISOString()};const a=JSON.parse(localStorage.demo||'[]');a.push(m);localStorage.demo=JSON.stringify(a.slice(-100));add(m)}}
 let last=0;$('#chat form').onsubmit=e=>{e.preventDefault();const i=$('#msg'),b=i.value.trim().slice(0,280);if(!b||Date.now()-last<2500)return;last=Date.now();i.value='';send(b)}}
addEventListener('DOMContentLoaded',chat);

// UI layer: enter gate, progress, cursor glow, tilt
document.body.insertAdjacentHTML('beforeend','<div id=prog></div><div id=glow></div>');
addEventListener('scroll',()=>$('#prog').style.height=scrollY/(document.documentElement.scrollHeight-innerHeight)*100+'%',{passive:true});
if(matchMedia('(pointer:fine)').matches)addEventListener('pointermove',e=>{$('#glow').style.transform=`translate(${e.clientX-200}px,${e.clientY-200}px)`});else $('#glow').remove();
if(matchMedia('(pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches)document.addEventListener('pointermove',e=>{const k=e.target.closest&&e.target.closest('.card');if(!k)return;const r=k.getBoundingClientRect();k.style.transform=`perspective(700px) rotateY(${((e.clientX-r.left)/r.width-.5)*10}deg) rotateX(${-((e.clientY-r.top)/r.height-.5)*10}deg) translateY(-4px)`;k.onpointerleave=()=>k.style.transform=''});
if($('.hero')){document.body.style.overflow='hidden';document.body.insertAdjacentHTML('beforeend','<div id=gate><h1>ORBITAL</h1><p>Beyond the known.</p><div class=row style="justify-content:center"><button class=btn id=g1>Enter with sound</button><button class=btn id=g2>Enter silent</button></div><small>Headphones recommended. Sound is generated ambience and can be turned off at any time.</small></div>');
 const go=s=>{if(s)setSnd(true);$('#gate').classList.add('out');dispatchEvent(new Event('entered'));document.body.style.overflow='';setTimeout(()=>$('#gate').remove(),1500)};$('#g1').onclick=()=>go(1);$('#g2').onclick=()=>go(0)}

function drawGal(cv,t,h){const x=cv.getContext('2d'),W=cv.width,C=W/2;x.fillStyle='#02030a';x.fillRect(0,0,W,W);
 for(let i=0;i<(t=='n'?1800:3200);i++){let px,py,c,s=Math.random()<.04?2:1;
  if(t=='i'||t=='n'){const k=i%7,rr=(Math.random()+Math.random()+Math.random()-1.5)*W*(t=='n'?.28:.22),an=Math.random()*6.28;px=C+Math.sin(k*2.1+h)*W*.2+Math.cos(an)*rr;py=C+Math.cos(k*1.7+h)*W*.2+Math.sin(an)*rr;c=`hsl(${h+(k*12)%60},80%,${55+Math.random()*30}%)`}
  else{const arm=i%2*Math.PI,u=Math.random()**.7*3.4*Math.PI,r=u/(3.4*Math.PI)*C*.92,sp=(Math.random()-.5)*r*.18;let ax=Math.cos(u+arm)*r+sp,ay=Math.sin(u+arm)*r+sp;
   if(t=='e'){ax=(Math.random()+Math.random()-1)*C*.95;ay=(Math.random()+Math.random()-1)*C*.24*(1-Math.abs(ax)/C)}
   if(t=='t'){ay*=.38;const q=.9,rx=ax*Math.cos(q)-ay*Math.sin(q);ay=ax*Math.sin(q)+ay*Math.cos(q);ax=rx}
   px=C+ax;py=C+ay;c=`hsl(${r<C*.3?40:h},75%,${60+Math.random()*30}%)`}
  x.globalAlpha=.25+Math.random()*.6;x.fillStyle=c;x.fillRect(px,py,s,s)}
 const q=x.createRadialGradient(C,C,0,C,C,W*.2);q.addColorStop(0,'rgba(255,230,180,.8)');q.addColorStop(1,'transparent');x.globalAlpha=1;x.fillStyle=q;x.fillRect(0,0,W,W);
 if(t=='e'){x.fillStyle='#02030a';x.fillRect(0,C-2,W,3)}}
