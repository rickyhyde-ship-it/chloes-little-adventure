import { levels, GROUND } from './levels.js';

export const PHYSICS = { gravity: 1600, jump: 650, speed: 255, width: 38, height: 76 };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class PlatformWorld {
  constructor(levelIndex = 0, score = { apple: 0, banana: 0 }) {
    this.levelIndex = levelIndex;
    this.level = levels[levelIndex];
    this.score = { ...score };
    this.time = 0; this.status = 'playing'; this.camera = 0;
    this.player = { x: 90, y: GROUND - PHYSICS.height, w: PHYSICS.width, h: PHYSICS.height,
      vx: 0, vy: 0, grounded: true, face: 1, small: 0, beeGrace: 0, webbed: 0, hurt: 0, coyote: 0.12, jumpBuffer: 0 };
    this.fruit = this.level.fruit.map(f => ({ ...f, collected: false }));
    this.dinosaurs = this.level.dinosaurs.map(d => ({ ...d, origin: d.x, y: GROUND - 46, w: 56, h: 46, direction: 1 }));
    this.bees = this.level.bees.map((b, i) => ({ ...b, originY: b.y, phase: i * 1.3, w: 48, h: 37 }));
    this.webs = []; this.particles = []; this.events = [];
    this.checkpoint = 90; this.checkpointLit = false;
    this.boss = this.level.boss ? { x: 4500, y: GROUND - 120, w: 204, h: 120, hits: 0, immune: 0, shot: 1.5, direction: -1, active: false, defeated: false } : null;
  }

  jump() { if (this.status === 'playing') this.player.jumpBuffer = 0.15; }

  groundAt(x) { return !this.level.pits.some(pit => x > pit.x && x < pit.x + pit.w); }

  burst(x, y, color, count = 9) {
    for (let i = 0; i < count; i++) this.particles.push({ x, y, vx: Math.cos(i * 2.4) * 100, vy: -75 + Math.sin(i * 2.4) * 90, life: 0.7, color });
  }

  shrink() {
    const p = this.player, feet = p.y + p.h;
    p.small = 10; p.beeGrace = 1.25; p.w = PHYSICS.width / 2; p.h = PHYSICS.height / 2; p.y = feet - p.h;
    this.events.push('shrink'); this.burst(p.x, p.y, '#eed375');
  }

  respawn() {
    const p = this.player;
    Object.assign(p, { x: this.checkpoint, y: GROUND - p.h, vx: 0, vy: 0, grounded: true, hurt: 1, webbed: 0, jumpBuffer: 0 });
    this.webs = []; this.events.push('respawn');
  }

  update(dt, input = {}) {
    if (this.status !== 'playing') return;
    dt = Math.min(dt, 1 / 30); this.time += dt;
    const p = this.player;
    for (const timer of ['beeGrace', 'webbed', 'hurt', 'jumpBuffer']) p[timer] = Math.max(0, p[timer] - dt);
    if (p.small > 0) {
      p.small = Math.max(0, p.small - dt);
      if (p.small === 0) { const feet = p.y + p.h; p.w = PHYSICS.width; p.h = PHYSICS.height; p.y = feet - p.h; this.events.push('grow'); }
    }
    p.coyote = p.grounded ? 0.12 : Math.max(0, p.coyote - dt);
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      // Height = velocity² / (2 * gravity): sqrt(2), not 2, halves jump height.
      p.vy = -PHYSICS.jump / (p.small > 0 ? Math.SQRT2 : 1);
      p.grounded = false; p.coyote = 0; p.jumpBuffer = 0; this.events.push('jump');
    }
    const direction = Number(!!input.right) - Number(!!input.left);
    if (direction) p.face = direction;
    const speed = PHYSICS.speed * (p.webbed > 0 ? 0.32 : 1);
    p.vx += (direction * speed - p.vx) * Math.min(1, dt * 15);
    p.x = clamp(p.x + p.vx * dt, 0, this.level.length - p.w);
    const previousFeet = p.y + p.h;
    p.vy += PHYSICS.gravity * dt; p.y += p.vy * dt; p.grounded = false;
    if (p.vy >= 0) {
      const surfaces = this.level.platforms.filter(s => p.x + p.w > s.x && p.x < s.x + s.w && previousFeet <= s.y + 2 && p.y + p.h >= s.y);
      if (this.groundAt(p.x + p.w / 2) && previousFeet <= GROUND + 2 && p.y + p.h >= GROUND) surfaces.push({ y: GROUND });
      surfaces.sort((a, b) => a.y - b.y);
      if (surfaces.length) { p.y = surfaces[0].y - p.h; p.vy = 0; p.grounded = true; }
    }
    if (p.y > 570) this.respawn();
    if (!this.checkpointLit && p.x >= this.level.checkpoint && this.groundAt(p.x + p.w / 2)) {
      this.checkpointLit = true; this.checkpoint = this.level.checkpoint;
      this.events.push('checkpoint'); this.burst(p.x, p.y, '#fff2aa');
    }
    for (const f of this.fruit) {
      if (!f.collected && overlap(p, { x: f.x - 14, y: f.y - 14, w: 28, h: 28 })) {
        f.collected = true; this.score[f.kind]++; this.events.push('fruit'); this.burst(f.x, f.y, '#e9b85d', 5);
      }
    }
    for (const d of this.dinosaurs) {
      d.x += d.direction * d.speed * dt;
      if (Math.abs(d.x - d.origin) > d.range) { d.direction *= -1; d.x = clamp(d.x, d.origin - d.range, d.origin + d.range); }
      if (overlap(p, d)) {
        const side = p.x + p.w / 2 < d.x + d.w / 2 ? -1 : 1;
        p.x = side < 0 ? d.x - p.w - 2 : d.x + d.w + 2;
        p.vx = side * 300;
        // No damage or stuck state: jumping always remains available.
        if (!p.hurt) { this.events.push('bump'); p.hurt = 0.25; }
      }
    }
    for (const b of this.bees) {
      b.y = b.originY + Math.sin(this.time * b.speed + b.phase) * b.range;
      if (!p.beeGrace && overlap(p, b)) this.shrink();
    }
    if (this.boss && !this.boss.defeated) this.updateBoss(dt, previousFeet);
    for (const web of this.webs) {
      web.x += web.vx * dt; web.y += web.vy * dt; web.life -= dt;
      if (web.life > 0 && overlap(p, { x: web.x - 13, y: web.y - 13, w: 26, h: 26 })) {
        web.life = 0; p.webbed = 1.5; p.vx = web.vx > 0 ? 160 : -160;
        p.x = clamp(p.x + (web.vx > 0 ? 22 : -22), 0, this.level.length - p.w);
        this.events.push('web'); this.burst(p.x, p.y + 25, '#eee7ff');
      }
    }
    this.webs = this.webs.filter(w => w.life > 0);
    for (const s of this.particles) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 140 * dt; s.life -= dt; }
    this.particles = this.particles.filter(s => s.life > 0);
    if (p.x > this.level.length - 115 && (!this.boss || this.boss.defeated)) { this.status = this.levelIndex === 2 ? 'won' : 'levelComplete'; this.events.push('complete'); }
  }

  updateBoss(dt, previousFeet) {
    const b = this.boss, p = this.player;
    if (p.x > 4050) b.active = true;
    if (!b.active) return;
    b.immune = Math.max(0, b.immune - dt);
    b.x += b.direction * (57 + b.hits * 3) * dt;
    if (b.x < 4330 || b.x > 4650) { b.x = clamp(b.x, 4330, 4650); b.direction *= -1; }
    b.shot -= dt;
    if (b.shot <= 0) {
      b.shot = Math.max(0.9, 1.85 - b.hits * 0.085);
      const sx = b.x + b.w / 2, sy = b.y + 65;
      const dx = p.x + p.w / 2 - sx, dy = p.y + p.h / 2 - sy;
      const angle = Math.atan2(dy, dx);
      for (const spread of b.hits >= 5 ? [-0.18, 0.18] : [0]) {
        this.webs.push({ x: sx, y: sy, vx: Math.cos(angle + spread) * 270, vy: Math.sin(angle + spread) * 270, life: 4 });
      }
    }
    const horizontal = p.x + p.w > b.x + 18 && p.x < b.x + b.w - 18;
    if (!b.immune && p.vy > 0 && horizontal && previousFeet <= b.y + 14 && p.y + p.h >= b.y) {
      b.hits++; b.immune = 0.6; p.y = b.y - p.h; p.vy = -560; p.grounded = false; p.coyote = 0;
      this.events.push('stomp'); this.burst(p.x + p.w / 2, b.y, '#ffe39c', 15);
      if (b.hits === 10) { b.defeated = true; this.webs = []; this.events.push('bossDefeated'); }
    } else if (overlap(p, { x: b.x + 10, y: b.y + 16, w: b.w - 20, h: b.h - 16 })) {
      const side = p.x + p.w / 2 < b.x + b.w / 2 ? -1 : 1;
      p.x = side < 0 ? b.x - p.w - 8 : b.x + b.w + 8; p.vx = side * 340;
    }
    // The exit is gated until all ten distinct descending stomps land.
    if (!b.defeated) p.x = Math.min(p.x, 4900);
  }
}
