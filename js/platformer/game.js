import { PlatformWorld } from './engine.js';
import { renderWorld } from './render.js';
import { audio } from '../audio.js';
import { pic } from '../assets.js';

export class ChloieoGame {
  constructor(scene, { onHome, isPaused }) {
    this.scene = scene; this.onHome = onHome; this.isPaused = isPaused;
    this.world = new PlatformWorld(); this.input = { left: false, right: false };
    this.pointers = new Map(); this.keys = new Set(); this.abort = new AbortController(); this.stopped = false;
    scene.innerHTML = `<div class="chloieo"><canvas aria-label="Chloieo side-scrolling adventure. Use the arrow buttons and jump button."></canvas><div class="runner-hud"><span class="runner-level"></span><div class="runner-rewards">${pic('apple')}<b data-total="apple">0</b>${pic('banana')}<b data-total="banana">0</b></div><span class="runner-status" aria-live="polite"></span></div><div class="runner-hint" aria-live="polite"></div><div class="runner-controls"><div class="direction-controls"><button data-control="left" aria-label="Move left">◀</button><button data-control="right" aria-label="Move right">▶</button></div><button class="jump-control" data-control="jump" aria-label="Jump">↑</button></div><div class="runner-overlay" hidden></div></div>`;
    this.canvas = scene.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
    this.hint = scene.querySelector('.runner-hint'); this.overlay = scene.querySelector('.runner-overlay');
    this.notice = ''; this.noticeUntil = 0;
    const options = { signal: this.abort.signal };
    for (const button of scene.querySelectorAll('[data-control]')) {
      button.addEventListener('pointerdown', event => {
        event.preventDefault(); event.stopPropagation();
        if (this.isPaused() || this.world.status !== 'playing') return;
        button.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, button.dataset.control); button.classList.add('held');
        if (button.dataset.control === 'jump') this.world.jump();
        this.syncInput();
      }, options);
      for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(eventName, event => {
        event.stopPropagation(); this.pointers.delete(event.pointerId);
        if (![...this.pointers.values()].includes(button.dataset.control)) button.classList.remove('held');
        this.syncInput();
      }, options);
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (event.detail === 0 && button.dataset.control === 'jump') this.world.jump();
      }, options);
      button.addEventListener('contextmenu', event => event.preventDefault(), options);
    }
    window.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'd', 'w'].includes(event.key) || this.isPaused()) return;
      event.preventDefault();
      if ([' ', 'ArrowUp', 'w'].includes(event.key) && !event.repeat) this.world.jump();
      this.keys.add(event.key); this.syncInput();
    }, options);
    window.addEventListener('keyup', event => { this.keys.delete(event.key); this.syncInput(); }, options);
    window.addEventListener('blur', () => this.clearInput(), options);
    window.addEventListener('resize', () => { this.resize(); if (this.isPaused()) this.clearInput(); }, options);
    document.addEventListener('visibilitychange', () => this.clearInput(), options);
    this.resize(); this.updateHud(); this.last = performance.now(); this.accumulator = 0;
    this.frame = requestAnimationFrame(time => this.loop(time));
  }

  syncInput() {
    const touches = [...this.pointers.values()];
    this.input.left = touches.includes('left') || this.keys.has('ArrowLeft') || this.keys.has('a');
    this.input.right = touches.includes('right') || this.keys.has('ArrowRight') || this.keys.has('d');
  }

  clearInput() {
    this.pointers.clear(); this.keys.clear(); this.syncInput();
    this.scene.querySelectorAll('.held').forEach(button => button.classList.remove('held'));
    this.world.player.jumpBuffer = 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    this.width = rect.width; this.height = rect.height;
    this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  loop(time) {
    if (this.stopped) return;
    const elapsed = Math.min((time - this.last) / 1000, 0.05); this.last = time;
    if (!this.isPaused() && this.world.status === 'playing') {
      this.accumulator += elapsed;
      while (this.accumulator >= 1 / 120) { this.world.update(1 / 120, this.input); this.accumulator -= 1 / 120; }
      this.handleEvents(); this.updateHud();
    } else { this.accumulator = 0; if (this.isPaused()) this.clearInput(); }
    renderWorld(this.ctx, this.world, this.width, this.height);
    this.frame = requestAnimationFrame(next => this.loop(next));
  }

  updateHud() {
    const w = this.world;
    this.scene.querySelector('.runner-level').textContent = `${w.levelIndex + 1} / 3 · ${w.level.name} · ${w.level.difficulty}`;
    for (const fruit of ['apple', 'banana']) this.scene.querySelector(`[data-total="${fruit}"]`).textContent = w.score[fruit];
    this.scene.querySelector('.runner-status').textContent = w.player.small > 0 ? `Tiny Chloe · ${Math.ceil(w.player.small)}s` : w.player.webbed > 0 ? 'Sticky web!' : '';
    this.hint.textContent = w.time < this.noticeUntil ? this.notice : w.time < 7 ? w.level.hint : '';
    this.hint.hidden = !this.hint.textContent;
  }

  handleEvents() {
    for (const event of this.world.events.splice(0)) {
      if (event === 'fruit') audio.effect('tap');
      if (['stomp', 'checkpoint', 'bossDefeated', 'complete'].includes(event)) audio.effect('success');
      if (event === 'shrink') this.showNotice('A bee made Chloe tiny! Back to normal in 10 seconds.');
      if (event === 'grow') this.showNotice('Chloe is big again!');
      if (event === 'checkpoint') this.showNotice('Checkpoint! Your fruit is safe.');
      if (event === 'respawn') this.showNotice('Let’s try that jump again!');
      if (event === 'bossDefeated') this.showNotice('Ten jumps! You did it! Head for the star flag.');
      if (event === 'complete') this.complete();
    }
  }

  showNotice(message) { this.notice = message; this.noticeUntil = this.world.time + 4; }

  complete() {
    this.clearInput(); const won = this.world.status === 'won';
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="runner-card"><span class="eyebrow">${won ? 'TEN STOMPS. ONE BRAVE CHLOE.' : 'A LOVELY LITTLE VICTORY'}</span><div class="runner-star">${pic('star')}</div><h2>${won ? 'Chloieo champion!' : 'Level complete!'}</h2><p>${won ? 'You explored all three worlds and beat the giant spider.' : `Next: ${this.world.levelIndex === 0 ? 'Dinosaur Valley · Medium' : 'The Webwood · Hard'}`}</p><div class="runner-result">${pic('apple')} ${this.world.score.apple} ${pic('banana')} ${this.world.score.banana}</div><button class="play-button" data-runner-next>${won ? 'Play Chloieo again' : 'Next level →'}</button><button class="home-text" data-runner-home>Home</button></div>`;
    // Native click works for touch and assistive technology, isolated from Numbers input.
    this.overlay.querySelector('[data-runner-next]').onclick = event => {
      event.stopPropagation();
      this.world = new PlatformWorld(won ? 0 : this.world.levelIndex + 1, won ? { apple: 0, banana: 0 } : this.world.score);
      this.noticeUntil = 0; this.accumulator = 0; this.overlay.hidden = true; this.updateHud();
    };
    this.overlay.querySelector('[data-runner-home]').onclick = event => { event.stopPropagation(); this.onHome(); };
  }

  destroy() { this.stopped = true; cancelAnimationFrame(this.frame); this.abort.abort(); this.clearInput(); }
}
