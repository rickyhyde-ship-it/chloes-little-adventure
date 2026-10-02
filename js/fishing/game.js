import { FishingWorld } from './engine.js?v=4.0.0';
import { FishingRenderer } from './render.js?v=4.0.0';
import { SPECIES, ZONES, UPGRADES, MAX_LEVEL, costFor, loadProgress, saveProgress } from './data.js';
import { fishIcon } from './art.js';
import { audio } from '../audio.js';

export class ChloeFishingGame {
  constructor(scene,{isPaused}){
    this.scene=scene;this.isPaused=isPaused;this.stopped=false;this.abort=new AbortController();this.keys=new Set();this.pointers=new Map();this.input={};this.tab='gear';this.accumulator=0;this.last=performance.now();this.lastDivePulse=0;
    try{this.storage=window.localStorage;}catch{this.storage=null;}
    this.world=new FishingWorld(loadProgress(this.storage));this.previousLive=scene.getAttribute('aria-live');scene.setAttribute('aria-live','off');
    scene.innerHTML=`<div class="fishing"><canvas aria-label="Chloe fishing in a colourful sea. Time your cast, tap to dive, then steer the hook to catch fish on the way up."></canvas><div class="fish-hud" hidden><div class="fish-location"></div><div class="fish-readings"><span class="fish-depth"></span><span class="fish-count"></span><span class="fish-coins"></span></div></div><img class="fish-portrait" src="assets/fishing/chloe-fishing.webp" alt="Chloe fishing from her pink boat" hidden><div class="fish-notice" role="status"></div><div class="fish-meter" hidden><span>Cast when the pointer is in the green!</span><div class="fish-meter-track"><i></i><b aria-hidden="true">▼</b></div><small>Little cast <span>Brilliant!</span> Little cast</small></div><div class="fish-controls" hidden><div class="fish-steering"><button data-fish-control="left" aria-label="Move hook left"><b aria-hidden="true">◀</b><span>Left</span></button><button data-fish-control="right" aria-label="Move hook right"><b aria-hidden="true">▶</b><span>Right</span></button></div><div class="fish-actions"><button data-fish-reel hidden>Reel up ↑</button><button data-fish-action class="fish-primary">Cast now! <span aria-hidden="true">↗</span></button></div></div><div class="fish-overlay"></div></div>`;
    this.root=scene.querySelector('.fishing');this.canvas=scene.querySelector('canvas');this.overlay=scene.querySelector('.fish-overlay');this.renderer=new FishingRenderer(this.canvas,this.world);
    const opts={signal:this.abort.signal};
    this.root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||this.isPaused())return;e.stopPropagation();
      if(b.dataset.fishTab){this.tab=b.dataset.fishTab;this.dock();}
      if(b.hasAttribute('data-fish-start'))this.start();
      if(b.hasAttribute('data-fish-action')){if(e.detail===0)this.action();}
      if(b.hasAttribute('data-fish-reel'))this.world.reel();
      if(b.hasAttribute('data-fish-dock')){this.world.status='dock';this.dock();}
      if(b.dataset.fishUpgrade){if(this.world.buy(b.dataset.fishUpgrade)){this.persist();this.dock();audio.effect('success');}}
      if(b.dataset.fishZone){if(this.world.chooseZone(Number(b.dataset.fishZone))){this.dock();audio.effect('tap');}}
    },opts);
    for(const b of scene.querySelectorAll('[data-fish-control],[data-fish-action]')){
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(this.isPaused()||b.disabled)return;b.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,b.dataset.fishControl||'action');this.syncInput();if(b.hasAttribute('data-fish-action'))this.action();},opts);
      for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{e.stopPropagation();this.pointers.delete(e.pointerId);this.syncInput();},opts);
      b.addEventListener('contextmenu',e=>e.preventDefault(),opts);
      if(b.dataset.fishControl)b.addEventListener('click',e=>{if(e.detail!==0||this.isPaused())return;this.pointers.set('accessible',b.dataset.fishControl);this.syncInput();clearTimeout(this.pulse);this.pulse=setTimeout(()=>{this.pointers.delete('accessible');this.syncInput();},250);},opts);
    }
    this.canvas.addEventListener('pointerdown',e=>{if(this.isPaused()||!['dive','reel'].includes(this.world.status))return;e.preventDefault();e.stopPropagation();this.canvas.setPointerCapture(e.pointerId);this.drag=e.pointerId;this.input.targetX=this.renderer.worldPoint(e.clientX,e.clientY).x;},opts);
    this.canvas.addEventListener('pointermove',e=>{if(this.drag===e.pointerId)this.input.targetX=this.renderer.worldPoint(e.clientX,e.clientY).x;},opts);
    for(const name of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(name,e=>{if(this.drag===e.pointerId){this.drag=null;delete this.input.targetX;}},opts);
    window.addEventListener('keydown',e=>{if(this.isPaused()||e.target.closest?.('.fish-overlay button')||!['ArrowLeft','ArrowRight','a','d',' ','ArrowDown','ArrowUp','r','Enter'].includes(e.key))return;if(e.key===' '&&e.target.closest?.('button'))return;e.preventDefault();if(!e.repeat&&(e.key===' '||e.key==='ArrowDown'||e.key==='Enter'))this.action();if(e.key==='r'||e.key==='ArrowUp')this.world.reel();this.keys.add(e.key);this.syncInput();},opts);
    window.addEventListener('keyup',e=>{this.keys.delete(e.key);this.syncInput();},opts);
    window.addEventListener('blur',()=>this.clearInput(),opts);
    window.addEventListener('resize',()=>{this.renderer.resize();this.clearInput();},opts);
    document.addEventListener('visibilitychange',()=>this.clearInput(),opts);
    this.dock();this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  persist(){this.saved=saveProgress(this.storage,this.world.progress);}
  syncInput(){const held=[...this.pointers.values()];this.input.left=held.includes('left')||this.keys.has('ArrowLeft')||this.keys.has('a');this.input.right=held.includes('right')||this.keys.has('ArrowRight')||this.keys.has('d');this.input.action=held.includes('action')||this.keys.has(' ')||this.keys.has('ArrowDown');for(const b of this.root.querySelectorAll('[data-fish-control]')){b.classList.toggle('held',!!this.input[b.dataset.fishControl]);b.setAttribute('aria-pressed',String(!!this.input[b.dataset.fishControl]));}}
  clearInput(){this.pointers.clear();this.keys.clear();this.drag=null;delete this.input.targetX;clearTimeout(this.pulse);this.syncInput();}
  action(){if(this.world.status==='aim')this.world.cast();else if(this.world.status==='dive'){this.world.tap();this.lastDivePulse=this.world.time;}}
  start(){if(this.isPaused())return;this.clearInput();this.world.aim();this.overlay.hidden=true;this.root.classList.add('is-fishing');this.root.querySelector('.fish-hud').hidden=false;this.root.querySelector('.fish-controls').hidden=false;this.canvas.tabIndex=-1;this.canvas.focus();this.updateHud();}
  dock(){
    this.clearInput();this.root.classList.remove('is-fishing');for(const e of this.root.querySelectorAll('.fish-hud,.fish-controls,.fish-meter,.fish-portrait'))e.hidden=true;this.root.querySelector('.fish-notice').textContent='';this.overlay.hidden=false;
    const p=this.world.progress,collection=Object.keys(p.collection).length;
    let panel='';
    if(this.tab==='gear')panel=`<div class="fish-upgrades">${UPGRADES.map(u=>{const level=p.upgrades[u.id],cost=costFor(u.id,level),max=level===MAX_LEVEL;return `<button data-fish-upgrade="${u.id}" ${max||p.coins<cost?'disabled':''} aria-label="Upgrade ${u.name}, level ${level} of ${MAX_LEVEL}, ${max?'fully upgraded':`${cost} coins`} "><i aria-hidden="true">${u.icon}</i><div><strong>${u.name}</strong><small>${u.detail}</small><span class="fish-level" aria-hidden="true">${Array.from({length:MAX_LEVEL},(_,i)=>`<b class="${i<level?'filled':''}"></b>`).join('')}</span></div><span class="fish-price">${max?'Max':`● ${cost}`}</span></button>`;}).join('')}</div><p class="fish-panel-note">Catch sea friends to earn coins. Every cast earns a little reward.</p>`;
    if(this.tab==='book')panel=`<div class="fish-book">${SPECIES.map(s=>{const n=p.collection[s.id];return `<div class="fish-book-card ${n?'found':''}" aria-label="${n?`${s.name}, found ${n} times`:`Undiscovered ${s.name}, ${ZONES[s.zone].name}, below ${s.min} metres`}">${fishIcon(s)}<strong>${n?s.name:'???'}</strong><small>${n?`Found ${n} · ${s.value} coins`:ZONES[s.zone].name}</small></div>`;}).join('')}</div>`;
    if(this.tab==='places')panel=`<div class="fish-zones">${ZONES.map((z,i)=>`<button data-fish-zone="${i}" ${p.record<z.unlock?'disabled':''} aria-pressed="${i===this.world.zoneIndex}" style="--zone:${z.water}"><i aria-hidden="true">${z.icon}</i><span><strong>${z.name}</strong><small>${p.record<z.unlock?`Discover ${z.unlock} m to unlock`:z.tag}</small></span><b aria-hidden="true">${p.record<z.unlock?'🔒':i===this.world.zoneIndex?'✓':'→'}</b></button>`).join('')}</div>`;
    this.overlay.innerHTML=`<div class="fish-dock"><div class="fish-welcome"><span class="eyebrow">A LITTLE OCEAN OF WONDER</span><h1>Chloe’s<br><em>Fishing Adventure</em></h1><img src="assets/fishing/chloe-fishing.webp" alt="Chloe holding her fishing rod in a pink boat"><p>Cast. Dive. Discover.<br><span>Who’s swimming down there?</span></p></div><div class="fish-workbench"><div class="fish-dock-stats"><span>● <b>${p.coins}</b> coins</span><span>↓ ${p.record} m best</span></div><div class="fish-tabs" role="group" aria-label="Fishing equipment, collection and places">${[['gear','Gear'],['book',`Fish book ${collection}/12`],['places','Places']].map(([id,label])=>`<button data-fish-tab="${id}" aria-pressed="${id===this.tab}">${label}</button>`).join('')}</div><div class="fish-panel" tabindex="0" aria-label="${this.tab==='gear'?'Equipment upgrades':this.tab==='book'?'Fish collection':'Fishing places'}">${panel}</div></div><div class="fish-dock-footer"><p><strong>${this.world.zone.icon} ${this.world.zone.name}</strong><span>Tap on green to cast. Steer to catch on the way up!</span></p><button class="fish-primary" data-fish-start>Let’s fish! <span aria-hidden="true">↗</span></button></div></div>`;
  }
  finish(){
    this.clearInput();this.persist();this.root.querySelector('.fish-controls').hidden=true;this.root.querySelector('.fish-meter').hidden=true;this.overlay.hidden=false;const r=this.world.result;
    this.overlay.innerHTML=`<div class="fish-result"><div class="fish-result-art"><img src="assets/fishing/chloe-fishing.webp" alt="Happy Chloe in her fishing boat"><span aria-hidden="true">✦</span></div><div class="fish-result-copy"><span class="eyebrow">${r.newSpecies.length?'A NEW LITTLE DISCOVERY':'WHAT A LOVELY ADVENTURE'}</span><h2>${this.world.caught.length?'Look who Chloe found!':'An ocean of possibilities!'}</h2><div class="fish-catch-list">${Object.entries(r.counts).map(([id,n])=>{const s=SPECIES.find(s=>s.id===id);return `<div>${fishIcon(s)}<span>${s.name}${n>1?` ×${n}`:''}${r.newSpecies.includes(id)?'<b>NEW</b>':''}</span></div>`;}).join('')||'<p>Some shy fish today. Try steering towards them as you reel up!</p>'}</div><div class="fish-result-stats"><span>● +${r.coins} coins</span><span>↓ ${r.depth} m dive</span><span>≈ ${r.bounces} bounces</span></div><p class="fish-result-note">${r.newZones.length?`${r.newZones.map(i=>ZONES[i].name).join(' and ')} unlocked! Visit Places to explore.`:r.newRecord?`A new best: ${this.world.progress.record} metres!`:`${r.exploreCoins} explorer coins included. Lovely fishing!`}</p><div class="fish-result-buttons"><button class="fish-primary" data-fish-start>Fish again ↗</button><button class="fish-secondary" data-fish-dock>Gear & fish book</button></div><small>${this.saved?'Your fishing discoveries are saved on this device.':'Your discoveries stay here while the page is open.'}</small></div></div>`;
    this.overlay.querySelector('[data-fish-start]').focus();
  }
  notice(text){this.root.querySelector('.fish-notice').textContent=text;this.noticeUntil=this.world.time+2.5;}
  updateHud(){
    const w=this.world,set=(s,t)=>{const e=this.root.querySelector(s);if(e.textContent!==t)e.textContent=t;};
    set('.fish-location',`${w.zone.icon} ${w.zone.name}`);set('.fish-depth',`↓ ${w.zone.base+Math.max(0,Math.round(w.hook.y/4))} m`);set('.fish-count',`♡ ${w.caught.length} / ${w.capacity}`);set('.fish-coins',`● ${w.progress.coins}`);
    const aim=w.status==='aim',underwater=['dive','reel'].includes(w.status);this.root.querySelector('.fish-meter').hidden=!aim;
    if(aim)this.root.querySelector('.fish-meter-track b').style.left=`${w.meter*100}%`;
    for(const b of this.root.querySelectorAll('[data-fish-control]'))b.disabled=!underwater;
    const action=this.root.querySelector('[data-fish-action]');action.disabled=!['aim','dive'].includes(w.status);const label=aim?'Cast now! ↗':w.status==='dive'?'Tap to dive ↓':w.status==='reel'?'Catch sea friends!':'Splashing…';if(action.textContent!==label)action.textContent=label;
    this.root.querySelector('[data-fish-reel]').hidden=w.status!=='dive';this.root.querySelector('.fish-portrait').hidden=!underwater||this.renderer.surfaceY-this.renderer.cameraY*this.renderer.scale>95;
    if(this.noticeUntil<w.time)set('.fish-notice','');
  }
  loop(time){
    if(this.stopped)return;const dt=Math.min((time-this.last)/1000,.05);this.last=time;
    if(this.isPaused()){this.clearInput();this.accumulator=0;}else{
      this.accumulator+=dt;while(this.accumulator>=1/120){if(this.input.action&&this.world.status==='dive'&&this.world.time-this.lastDivePulse>.22){this.world.tap();this.lastDivePulse=this.world.time;}this.world.update(1/120,this.input);this.accumulator-=1/120;}
      for(const e of this.world.events.splice(0)){if(e==='cast'){this.notice(this.world.castLabel);audio.effect('success');}if(e==='bounce')audio.effect('tap');if(e==='splash')this.notice('Tap or hold Dive to go deeper!');if(e==='reel')this.notice('Steer towards sea friends on the way up!');if(e==='fish')audio.effect('tap');if(e==='full')this.notice('A boat full of sea friends!');if(e==='finish'){audio.effect('success');this.finish();}}
      this.updateHud();
    }
    this.renderer.render();this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  destroy(){this.stopped=true;cancelAnimationFrame(this.frame);this.clearInput();this.abort.abort();this.renderer.destroy();if(this.previousLive===null)this.scene.removeAttribute('aria-live');else this.scene.setAttribute('aria-live',this.previousLive);}
}
