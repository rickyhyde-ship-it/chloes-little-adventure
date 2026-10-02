import { KartWorld } from './engine.js';
import { TRACKS, SPEEDS } from './tracks.js';
import { KartRenderer, CanvasKartRenderer } from './render.js';
import { audio } from '../audio.js';

function trackPicture(track,index) {
  const trees=index===0?'<path d="M28 78V43M214 84V45" stroke="#a58166" stroke-width="7"/><g fill="#73a77c"><circle cx="28" cy="39" r="18"/><circle cx="214" cy="38" r="22"/></g><g fill="#f2b5c7"><circle cx="52" cy="62" r="12"/><circle cx="196" cy="63" r="13"/></g>':index===1?'<path d="M0 52H250V110H0" fill="#7acbd5"/><path d="M0 83Q70 45 250 88V110H0" fill="#eed7a5"/><path d="M35 82L39 40M214 84L207 40" stroke="#ae8d6b" stroke-width="5"/><path d="M16 43Q39 15 61 41Q40 36 39 52Q28 35 16 43M183 44Q205 15 230 41Q205 35 207 53" fill="#6da77c"/>':'<g fill="#eee8c0"><circle cx="20" cy="18" r="1.5"/><circle cx="65" cy="32" r="2"/><circle cx="222" cy="19" r="2"/><circle cx="182" cy="42" r="1.5"/></g><circle cx="36" cy="36" r="17" fill="#e8a0bb"/><ellipse cx="36" cy="36" rx="25" ry="7" fill="none" stroke="#ecd0e4" stroke-width="3" transform="rotate(-20 36 36)"/><path d="M217 76L226 52L238 76" fill="#8cdbd3"/>';
  return `<svg viewBox="0 0 250 110" aria-hidden="true"><rect width="250" height="110" fill="${track.sky}"/><path d="M0 83Q70 40 135 81Q194 52 250 76V110H0" fill="${track.ground}"/>${trees}<path d="M70 107Q58 88 114 79Q168 71 169 96Q168 105 195 105" fill="none" stroke="${track.edge}" stroke-width="21"/><path d="M70 107Q58 88 114 79Q168 71 169 96Q168 105 195 105" fill="none" stroke="${track.road}" stroke-width="15"/><ellipse cx="140" cy="64" rx="15" ry="30" fill="none" stroke="${track.edge}" stroke-width="9"/><ellipse cx="140" cy="64" rx="15" ry="30" fill="none" stroke="${track.road}" stroke-width="4"/></svg>`;
}
function mapPicture(track) {
  const points=track.samples.filter((_,i)=>i%12===0),xs=points.map(p=>p.p[0]),zs=points.map(p=>p.p[2]);
  const minX=Math.min(...xs),minZ=Math.min(...zs),dx=Math.max(...xs)-minX,dz=Math.max(...zs)-minZ;
  const path=points.map((p,i)=>`${i?'L':'M'}${12+(p.p[0]-minX)/dx*60},${8+(p.p[2]-minZ)/dz*62}`).join(' ')+'Z';
  return `<svg viewBox="0 0 84 80" aria-label="Track map"><path d="${path}" fill="none" stroke="#fff5e6" stroke-width="9"/><path d="${path}" fill="none" stroke="${track.edge}" stroke-width="4"/><circle class="kart-map-dot" r="4" fill="#714e66"/></svg>`;
}
export class ChlioKartsGame {
  constructor(scene,{onHome,isPaused}) {
    this.scene=scene;this.onHome=onHome;this.isPaused=isPaused;this.trackIndex=0;this.speedIndex=0;
    this.world=new KartWorld();this.pointers=new Map();this.keys=new Set();this.input={};this.abort=new AbortController();this.stopped=false;this.accumulator=0;this.last=performance.now();this.noticeUntil=0;
    this.previousLive=scene.getAttribute('aria-live');scene.setAttribute('aria-live','off');
    scene.innerHTML=`<div class="karts"><canvas aria-label="Chlio Karts race with Chloe. Steer with Left and Right. Brake slows down; keep holding to reverse."></canvas><div class="kart-hud" hidden><div class="kart-track-name"></div><div class="kart-lap"></div><div class="kart-place"></div><div class="kart-stars"></div></div><div class="kart-map" hidden></div><div class="kart-speed" hidden></div><div class="kart-notice" role="status"></div><div class="kart-countdown" role="status" hidden></div><div class="kart-controls" hidden><div><button data-kart-control="left" aria-label="Steer left"><b aria-hidden="true">◀</b><span>Left</span></button><button data-kart-control="right" aria-label="Steer right"><b aria-hidden="true">▶</b><span>Right</span></button></div><button data-kart-control="brake" class="kart-brake" aria-label="Brake. Keep holding to reverse."><b aria-hidden="true">▰</b><span>Brake</span></button></div><div class="kart-overlay"></div></div>`;
    this.root=scene.querySelector('.karts');this.canvas=scene.querySelector('canvas');this.overlay=scene.querySelector('.kart-overlay');
    const opts={signal:this.abort.signal};
    for(const button of scene.querySelectorAll('[data-kart-control]')) {
      button.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();if(this.isPaused()||this.world.status!=='racing')return;
        button.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,button.dataset.kartControl);this.syncInput();
      },opts);
      for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{e.stopPropagation();this.pointers.delete(e.pointerId);this.syncInput();},opts);
      button.addEventListener('contextmenu',e=>e.preventDefault(),opts);
      // Native assistive activation provides a short input; keyboard keys below
      // and touch pointer capture provide continuous holds.
      button.addEventListener('click',e=>{e.stopPropagation();if(e.detail!==0||this.isPaused()||this.world.status!=='racing')return;this.pointers.set('accessible',button.dataset.kartControl);this.syncInput();clearTimeout(this.pulse);this.pulse=setTimeout(()=>{this.pointers.delete('accessible');this.syncInput();},350);},opts);
    }
    window.addEventListener('keydown',e=>{
      if(this.world.status!=='racing'||this.isPaused()||!['ArrowLeft','ArrowRight','ArrowDown',' ','a','d','s'].includes(e.key))return;
      // Space on a focused button uses its native activation instead.
      if(e.key===' '&&e.target.closest?.('button'))return;
      e.preventDefault();this.keys.add(e.key);this.syncInput();
    },opts);
    window.addEventListener('keyup',e=>{this.keys.delete(e.key);this.syncInput();},opts);
    window.addEventListener('blur',()=>this.clearInput(),opts);
    window.addEventListener('resize',()=>{this.renderer?.resize();if(this.isPaused())this.clearInput();},opts);
    document.addEventListener('visibilitychange',()=>this.clearInput(),opts);
    this.choose();this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  syncInput(){const held=[...this.pointers.values()];this.input={left:held.includes('left')||this.keys.has('ArrowLeft')||this.keys.has('a'),right:held.includes('right')||this.keys.has('ArrowRight')||this.keys.has('d'),brake:held.includes('brake')||this.keys.has('ArrowDown')||this.keys.has(' ')||this.keys.has('s')};for(const b of this.scene.querySelectorAll('[data-kart-control]')){b.classList.toggle('held',this.input[b.dataset.kartControl]);b.setAttribute('aria-pressed',String(!!this.input[b.dataset.kartControl]));}}
  clearInput(){this.pointers.clear();this.keys.clear();clearTimeout(this.pulse);this.syncInput();}
  choose() {
    this.clearInput();this.renderer?.destroy();this.renderer=null;this.canvas.replaceWith(this.canvas=this.canvas.cloneNode());this.world=new KartWorld(this.trackIndex,this.speedIndex);this.root.classList.remove('is-racing');
    this.scene.querySelectorAll('.kart-hud,.kart-map,.kart-speed,.kart-controls,.kart-countdown').forEach(e=>e.hidden=true);this.scene.querySelector('.kart-notice').textContent='';
    this.overlay.hidden=false;
    this.overlay.innerHTML=`<div class="kart-selection"><div class="kart-title"><img src="assets/karts/chloe-kart.png" alt="Chloe in her pink racing kart"><div><span class="eyebrow">CHLOE’S LITTLE RACING ADVENTURE</span><h1>Chlio <em>Karts</em><span aria-hidden="true"> ✦</span></h1></div><span class="kart-title-note">Little hands.<br>Big adventures.</span></div><div class="kart-track-options" role="group" aria-label="Choose your track">${TRACKS.map((track,index)=>`<button class="kart-track-card" data-kart-track="${index}" aria-pressed="${index===this.trackIndex}" style="--track-accent:${track.accent}">${trackPicture(track,index)}<span class="kart-track-copy"><small>${track.badge} · ${track.icon}</small><strong>${track.name}</strong><span>${track.description}</span></span><i aria-hidden="true">✓</i></button>`).join('')}</div><div class="kart-setup"><div class="kart-speed-options" role="group" aria-label="Choose driving speed"><span>Choose your speed</span><div>${SPEEDS.map((speed,i)=>`<button data-kart-speed="${i}" aria-pressed="${i===this.speedIndex}"><span aria-hidden="true">${['🐢','🌼','⚡'][i]}</span> ${speed.label}</button>`).join('')}</div></div><div class="kart-start-area"><p>Left · Right · Brake<br><span>Hold Brake to reverse. Jumps happen for you!</span></p><button class="play-button kart-start" data-kart-start>Let’s race! <span aria-hidden="true">→</span></button></div></div></div>`;
    for(const b of this.overlay.querySelectorAll('[data-kart-track]'))b.onclick=e=>{e.stopPropagation();this.trackIndex=Number(b.dataset.kartTrack);for(const x of this.overlay.querySelectorAll('[data-kart-track]'))x.setAttribute('aria-pressed',String(x===b));};
    for(const b of this.overlay.querySelectorAll('[data-kart-speed]'))b.onclick=e=>{e.stopPropagation();this.speedIndex=Number(b.dataset.kartSpeed);for(const x of this.overlay.querySelectorAll('[data-kart-speed]'))x.setAttribute('aria-pressed',String(x===b));};
    this.overlay.querySelector('[data-kart-start]').onclick=e=>{e.stopPropagation();this.start();};
  }
  start() {
    if(this.isPaused())return;
    this.clearInput();this.world=new KartWorld(this.trackIndex,this.speedIndex);this.accumulator=0;this.last=performance.now();this.noticeUntil=0;this.lastHud='';
    this.renderer?.destroy();this.canvas.replaceWith(this.canvas=this.canvas.cloneNode());
    try {this.renderer=new KartRenderer(this.canvas,this.world);} catch {
      // A failed WebGL constructor can claim the old canvas's context.
      this.canvas.replaceWith(this.canvas=this.canvas.cloneNode());this.renderer=new CanvasKartRenderer(this.canvas,this.world);
    }
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.stopped||e.currentTarget!==this.canvas||!this.renderer)return;this.renderer.destroy();this.canvas.replaceWith(this.canvas=this.canvas.cloneNode());this.renderer=new CanvasKartRenderer(this.canvas,this.world);},{once:true,signal:this.abort.signal});
    this.overlay.hidden=true;this.root.classList.add('is-racing');this.scene.querySelectorAll('.kart-hud,.kart-map,.kart-speed,.kart-controls').forEach(e=>e.hidden=false);
    this.scene.querySelector('.kart-map').innerHTML=mapPicture(this.world.track);
    const xs=this.world.track.samples.map(s=>s.p[0]),zs=this.world.track.samples.map(s=>s.p[2]);
    this.mapBounds={minX:Math.min(...xs),minZ:Math.min(...zs),dx:Math.max(...xs)-Math.min(...xs),dz:Math.max(...zs)-Math.min(...zs)};
    this.world.start();this.updateHud();this.canvas.tabIndex=-1;this.canvas.focus();
  }
  loop(time) {
    if(this.stopped)return;const dt=Math.min((time-this.last)/1000,.05);this.last=time;
    if(this.isPaused()){this.clearInput();this.accumulator=0;}else{
      this.accumulator+=dt;
      while(this.accumulator>=1/120){this.world.update(1/120,this.input);this.accumulator-=1/120;}
      for(const event of this.world.events.splice(0)) {
        if(['star','count'].includes(event))audio.effect('tap');
        if(['jump','loop','go','boost','finish'].includes(event))audio.effect('success');
        if(event==='jump')this.notice('Wheee! A lovely little jump!');
        if(event==='loop')this.notice('Around the loop! Lovely driving!');
        if(event==='boost')this.notice('A little burst of sunshine!');
        if(event==='go')this.notice('Go, Chloe! Left · Right · Brake');
        if(event==='finish')this.finish();
      }
      this.updateHud();
    }
    this.renderer?.render();this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  notice(text){this.scene.querySelector('.kart-notice').textContent=text;this.noticeUntil=this.world.time+3.5;}
  updateHud() {
    const w=this.world;if(w.status==='ready')return;
    const set=(selector,text)=>{const e=this.scene.querySelector(selector);if(e.textContent!==text)e.textContent=text;};
    set('.kart-track-name',`${w.track.icon} ${w.track.name}`);set('.kart-lap',`Lap ${w.lap} / ${w.track.laps}`);set('.kart-place',`${w.position} / 4`);set('.kart-stars',`★ ${w.stars}`);
    set('.kart-speed',`${w.speed<-.1?'↶ Reverse':this.input.brake?'Braking':SPEEDS[w.speedIndex].label} · ${Math.round(Math.abs(w.speed)*3.6)} km/h`);
    const count=this.scene.querySelector('.kart-countdown');count.hidden=w.status!=='countdown';if(w.status==='countdown')set('.kart-countdown',String(Math.ceil(w.countdown)));
    if(w.time>this.noticeUntil)set('.kart-notice','');
    const dot=this.scene.querySelector('.kart-map-dot');if(dot){const b=this.mapBounds,p=w.sample.p;dot.setAttribute('cx',12+(p[0]-b.minX)/b.dx*60);dot.setAttribute('cy',8+(p[2]-b.minZ)/b.dz*62);}
  }
  finish() {
    this.clearInput();this.scene.querySelector('.kart-controls').hidden=true;this.overlay.hidden=false;
    const w=this.world,time=`${Math.floor(w.raceTime/60)}:${String(Math.floor(w.raceTime%60)).padStart(2,'0')}`;
    this.overlay.innerHTML=`<div class="kart-result"><img src="assets/karts/chloe-kart.png" alt="Chloe in her pink kart"><div><span class="eyebrow">WHAT A LOVELY RACE</span><h2>Chloe, you did it!</h2><p>${w.track.name} · ${w.track.laps} laps of adventure</p><div class="kart-result-stats"><span>★ ${w.stars} stars</span><span>↻ ${w.loops} loops</span><span>↑ ${w.jumps} jumps</span><span>${time}</span></div><div class="kart-result-buttons"><button class="play-button" data-kart-again>Race again</button><button class="kart-other" data-kart-choose>Choose a track</button></div></div></div>`;
    this.overlay.querySelector('[data-kart-again]').onclick=e=>{e.stopPropagation();this.start();};this.overlay.querySelector('[data-kart-choose]').onclick=e=>{e.stopPropagation();this.choose();};
    this.overlay.querySelector('[data-kart-again]').focus();
  }
  destroy(){this.stopped=true;cancelAnimationFrame(this.frame);this.clearInput();this.abort.abort();this.renderer?.destroy();this.renderer=null;if(this.previousLive===null)this.scene.removeAttribute('aria-live');else this.scene.setAttribute('aria-live',this.previousLive);}
}
