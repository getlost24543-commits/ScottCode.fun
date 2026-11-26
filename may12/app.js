(() => {
"use strict";
const $ = id => document.getElementById(id);
const frostCanvas=$("frostCanvas"), frost=frostCanvas.getContext("2d");
const waterCanvas=$("waterCanvas"), water=waterCanvas.getContext("2d");
const dial=$("masterDial"), dialPointer=$("dialPointer"), dialValue=$("dialValue"), dialUnit=$("dialUnit");
const slider=$("modeSlider"), sliderWrap=$("modeSliderWrap"), sliderIcon=$("sliderIcon"), sliderValue=$("sliderValue");
const dots=[...document.querySelectorAll(".mode-dot")], scene=$("gardenScene"), sunlight=$("sunlight"), stage=$("experience"), ring=$("touchRing");
const soundButton=$("soundButton"), resetButton=$("resetButton"), status=$("status");
const modes={
 frost:{label:"FROST",icon:"❄",value:55,min:0,max:100},
 wind:{label:"WIND",icon:"〰",value:35,min:0,max:100},
 sun:{label:"SUNLIGHT",icon:"☼",value:55,min:0,max:100},
 garden:{label:"GARDEN",icon:"✿",value:0,min:0,max:3}
};
const gardenNames=["GARDEN","MORNING","GOLDEN","EVENING"];
let activeMode=null, width=0,height=0,drawing=false,lastPoint=null,soundOn=false,audio=null;
let drops=[], lastDrop=0, frostTexture=null, raf=0;

function resize(){
 const rect=frostCanvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 width=rect.width;height=rect.height;
 for(const c of [frostCanvas,waterCanvas]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);const x=c.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0)}
 drawFrost(); drawWater();
}
function seeded(n){const x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x)}
function drawFrost(){
 frost.clearRect(0,0,width,height);
 const opacity=(modes.frost.value/100)*.83;
 if(opacity<=0)return;
 const g=frost.createLinearGradient(0,0,width,height);
 g.addColorStop(0,`rgba(226,235,229,${opacity})`);
 g.addColorStop(.48,`rgba(174,190,180,${opacity*.86})`);
 g.addColorStop(1,`rgba(215,225,217,${opacity})`);
 frost.fillStyle=g;frost.fillRect(0,0,width,height);
 // Fine frozen grain and cloudy condensation patches.
 for(let i=0;i<210;i++){
  const x=seeded(i*17+3)*width,y=seeded(i*29+11)*height,r=2+seeded(i*43+7)*18;
  const cloud=frost.createRadialGradient(x,y,0,x,y,r);
  cloud.addColorStop(0,`rgba(247,255,250,${opacity*.10})`);cloud.addColorStop(1,"rgba(255,255,255,0)");
  frost.fillStyle=cloud;frost.beginPath();frost.arc(x,y,r,0,Math.PI*2);frost.fill();
 }
 frost.fillStyle=`rgba(255,255,255,${opacity*.2})`;
 for(let i=0;i<700;i++){frost.fillRect(seeded(i*11+8)*width,seeded(i*23+4)*height,.6+seeded(i*31)*1.4,.6+seeded(i*19)*1.4)}
}
function setDial(){
 const m=activeMode?modes[activeMode]:null;
 dialValue.textContent=m?(activeMode==="garden"?gardenNames[m.value]:String(Math.round(m.value))):"—";
 dialUnit.textContent=m?m.label:"NO MODE";
 const pct=m?(m.value-m.min)/(m.max-m.min):0;
 dialPointer.style.transform=`rotate(${-135+pct*270}deg)`;
 dots.forEach(d=>d.classList.toggle("selected",d.dataset.mode===activeMode));
 sliderWrap.hidden=!m;
 if(m){slider.min=m.min;slider.max=m.max;slider.value=m.value;sliderIcon.textContent=m.icon;sliderValue.textContent=activeMode==="garden"?gardenNames[m.value]:String(Math.round(m.value))}
}
function chooseMode(mode){
 activeMode=activeMode===mode?null:mode;
 // Effects are mode-scoped: leaving a mode removes its active environmental effect.
 stage.classList.remove("wind-on");
 stage.style.removeProperty("--wind-strength");
 sunlight.style.opacity="0";
 if(activeMode==="wind")applyWind();
 if(activeMode==="sun")applySun();
 setDial();
 status.textContent=activeMode?`${modes[activeMode].label} selected`:"No mode selected";
 playClick();
}
function applyWind(){
 const v=modes.wind.value/100;
 stage.style.setProperty("--wind-strength",v);
 stage.classList.toggle("wind-on",v>.01);
}
function applySun(){
 const v=modes.sun.value/100;
 sunlight.style.opacity=String(.08+v*.8);
 scene.querySelector("img").style.filter=`saturate(${.72+v*.3}) brightness(${.68+v*.48}) sepia(${Math.max(0,v-.55)*.12})`;
 sunlight.style.background=`linear-gradient(115deg,rgba(255,${Math.round(205+v*45)},${Math.round(160+v*80)},${.12+v*.18}),transparent 50%),radial-gradient(ellipse at 72% 12%,rgba(255,${Math.round(225+v*25)},${Math.round(175+v*70)},${.12+v*.24}),transparent 54%)`;
}
function applyGarden(){
 const v=modes.garden.value;
 const filters=["saturate(.84) brightness(.78)","saturate(1.05) brightness(.94) sepia(.08)","saturate(1.2) brightness(1.02) sepia(.13)","saturate(.78) brightness(.62) hue-rotate(8deg)"];
 scene.querySelector("img").style.filter=filters[v];
}
function setValue(raw){
 if(!activeMode)return;
 const m=modes[activeMode];m.value=Math.max(m.min,Math.min(m.max,Math.round(Number(raw))));
 if(activeMode==="frost")drawFrost();
 if(activeMode==="wind")applyWind();
 if(activeMode==="sun")applySun();
 if(activeMode==="garden")applyGarden();
 setDial();
}
dots.forEach(d=>d.addEventListener("click",()=>chooseMode(d.dataset.mode)));
slider.addEventListener("input",()=>setValue(slider.value));
function valueFromPointer(e){
 const r=dial.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let angle=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI+90;angle=(angle+360)%360;
 const pct=Math.max(0,Math.min(1,((angle+135)%360)/270));
 const m=modes[activeMode];setValue(m.min+pct*(m.max-m.min));
}
dial.addEventListener("pointerdown",e=>{
 if(!activeMode||e.target.closest(".mode-dot")||e.target.closest(".dial-center"))return;
 dial.setPointerCapture(e.pointerId);valueFromPointer(e);playClick();
});
dial.addEventListener("pointermove",e=>{if(activeMode&&e.buttons)valueFromPointer(e)});
$("dialCenter").addEventListener("click",()=>{activeMode=null;stage.classList.remove("wind-on");sunlight.style.opacity="0";scene.querySelector("img").style.filter="saturate(.84) brightness(.78)";setDial();status.textContent="No mode selected";playClick()});

function point(e){const r=frostCanvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function makeDrop(x,y){
 const now=performance.now();
 if(now-lastDrop<65)return;lastDrop=now;
 drops.push({x:x+(Math.random()-.5)*7,y:y+Math.random()*5,r:1.1+Math.random()*2.3,vy:.25+Math.random()*.45,life:1,stretch:1+Math.random()*1.8});
 if(drops.length>180)drops.shift();
}
function wipe(p){
 // A narrow soft fingertip trail: ~22px on phones, never a giant circle.
 const brush=Math.max(18,Math.min(28,width*.024));
 frost.save();frost.globalCompositeOperation="destination-out";frost.lineCap="round";frost.lineJoin="round";frost.lineWidth=brush;
 if(lastPoint){frost.beginPath();frost.moveTo(lastPoint.x,lastPoint.y);frost.lineTo(p.x,p.y);frost.stroke()}
 const grad=frost.createRadialGradient(p.x,p.y,0,p.x,p.y,brush*.72);
 grad.addColorStop(0,"rgba(0,0,0,.98)");grad.addColorStop(.72,"rgba(0,0,0,.72)");grad.addColorStop(1,"rgba(0,0,0,0)");
 frost.fillStyle=grad;frost.beginPath();frost.arc(p.x,p.y,brush*.72,0,Math.PI*2);frost.fill();frost.restore();
 if(lastPoint){const dist=Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y);if(dist>4)makeDrop(p.x+(Math.random()-.5)*brush*.8,p.y+brush*.2)}
 lastPoint=p;
}
function drawWater(){
 water.clearRect(0,0,width,height);
 for(let i=drops.length-1;i>=0;i--){
  const d=drops[i];d.y+=d.vy;d.vy+=.018;d.life-=.0017;
  const grad=water.createRadialGradient(d.x-d.r*.3,d.y-d.r*.4,.2,d.x,d.y,d.r*1.6);
  grad.addColorStop(0,"rgba(255,255,255,.92)");grad.addColorStop(.35,"rgba(210,235,231,.58)");grad.addColorStop(1,"rgba(130,170,165,.08)");
  water.fillStyle=grad;water.beginPath();water.ellipse(d.x,d.y,d.r,d.r*d.stretch,0,0,Math.PI*2);water.fill();
  water.strokeStyle="rgba(255,255,255,.5)";water.lineWidth=.6;water.stroke();
  if(d.y>height+12||d.life<=0)drops.splice(i,1);
 }
}
function animate(){drawWater();raf=requestAnimationFrame(animate)}
let startPoint=null;
frostCanvas.addEventListener("pointerdown",e=>{
 if(e.pointerType==="mouse"&&e.button!==0)return;
 drawing=true;frostCanvas.setPointerCapture(e.pointerId);startPoint=point(e);lastPoint=null;
 ring.classList.add("visible");ring.style.left=`${startPoint.x}px`;ring.style.top=`${startPoint.y}px`;
 wipe(startPoint);$("hint").style.opacity="0";
});
frostCanvas.addEventListener("pointermove",e=>{
 const p=point(e);ring.style.left=`${p.x}px`;ring.style.top=`${p.y}px`;
 if(drawing)wipe(p);
});
function endWipe(){if(!drawing)return;drawing=false;lastPoint=null;ring.classList.remove("visible");startPoint=null}
frostCanvas.addEventListener("pointerup",endWipe);frostCanvas.addEventListener("pointercancel",endWipe);
frostCanvas.addEventListener("lostpointercapture",endWipe);

function playClick(){
 if(!soundOn)return;
 try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==="suspended")audio.resume();
  const o=audio.createOscillator(),g=audio.createGain();o.type="triangle";o.frequency.setValueAtTime(740,audio.currentTime);o.frequency.exponentialRampToValueAtTime(510,audio.currentTime+.045);
  g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.018,audio.currentTime+.006);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.07);
  o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.08);
 }catch(_){}
}
soundButton.addEventListener("click",()=>{soundOn=!soundOn;soundButton.textContent=soundOn?"SOUND ON":"SOUND OFF";soundButton.setAttribute("aria-pressed",String(soundOn));playClick()});
resetButton.addEventListener("click",()=>{
 modes.frost.value=55;modes.wind.value=35;modes.sun.value=55;modes.garden.value=0;activeMode=null;
 stage.classList.remove("wind-on");stage.style.removeProperty("--wind-strength");sunlight.style.opacity="0";
 scene.querySelector("img").style.filter="saturate(.84) brightness(.78)";
 drops=[];drawFrost();setDial();$("hint").style.opacity="1";status.textContent="Window reset";playClick();
});
if("ResizeObserver"in window)new ResizeObserver(resize).observe(frostCanvas);else window.addEventListener("resize",resize);
resize();setDial();animate();
})();