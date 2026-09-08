import { assets } from '../assets.js';
import { GROUND } from './levels.js';

const pictures = Object.fromEntries(['chloe', 'apple', 'banana', 'bee', 'dinosaur', 'star'].map(name => {
  const image = new Image(); image.src = assets[name]; return [name, image];
}));
const ready = image => image.complete && image.naturalWidth > 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function round(ctx, x, y, w, h, radius, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}
function ellipse(ctx, x, y, rx, ry, fill, stroke) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
}
function picture(ctx, name, x, y, w, h) {
  if (ready(pictures[name])) ctx.drawImage(pictures[name], x, y, w, h);
  else ellipse(ctx, x + w / 2, y + h / 2, w / 2, h / 2, name === 'apple' ? '#ef797b' : '#f8d17c', '#765749');
}

function tree(ctx, x, base, scale, forest) {
  ctx.save(); ctx.translate(x, base); ctx.scale(scale, scale);
  round(ctx, -12, -160, 24, 165, 10, forest ? '#9c7d88' : '#ba926f');
  ctx.strokeStyle = '#8b7666'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(-22, -95); ctx.moveTo(0, -77); ctx.lineTo(26, -124); ctx.stroke();
  for (const [x, y, r] of [[-42, -162, 50], [42, -168, 48], [0, -202, 63], [0, -153, 55]])
    ellipse(ctx, x, y, r, r * 0.86, forest ? '#a5abb9' : '#a3c990');
  ellipse(ctx, -12, -213, 35, 19, forest ? '#bdc0cf' : '#bbd9a5'); ctx.restore();
}

function web(ctx, x, y, radius, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.strokeStyle = '#fffcf0'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); ctx.stroke(); }
  for (const size of [0.4, 0.75, 1]) {
    ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * radius * size, Math.sin(a) * radius * size); } ctx.stroke();
  }
  ctx.restore();
}

function spider(ctx, boss, time) {
  const { x, y, w, h } = boss;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2);
  if (boss.defeated) { ctx.rotate(0.14); ctx.globalAlpha = 0.6; }
  // Eight articulated legs make the boss visibly larger than Chloe.
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const sway = Math.sin(time * 5 + i * 1.7) * (boss.defeated || reducedMotion.matches ? 0 : 8);
    ctx.beginPath(); ctx.moveTo(side * 51, -24 + i * 16);
    ctx.lineTo(side * (104 + i * 8), -51 + i * 21 + sway);
    ctx.lineTo(side * (130 + i * 5), 45 + sway / 2);
    ctx.strokeStyle = '#594566'; ctx.lineWidth = 12; ctx.stroke();
    ctx.strokeStyle = '#9f83b4'; ctx.lineWidth = 6; ctx.stroke();
  }
  ellipse(ctx, 0, -8, 91, 55, boss.immune > 0 ? '#c0a2cf' : '#9b7fb1', '#594566');
  ellipse(ctx, -15, -32, 54, 17, '#bca4cc');
  for (const x of [-37, 37]) {
    ellipse(ctx, x, 4, 22, 27, '#fff9e7', '#594566');
    ellipse(ctx, x + Math.sin(time) * 3, 9, 10, 15, '#554260');
    ellipse(ctx, x - 3, 3, 4, 5, '#fffdf7');
  }
  for (const x of [-52, -19, 19, 52]) ellipse(ctx, x, -32, 5, 6, '#594566');
  ctx.beginPath(); ctx.arc(0, 25, 13, 0.1, Math.PI - 0.1); ctx.strokeStyle = '#594566'; ctx.lineWidth = 3; ctx.stroke();
  ellipse(ctx, -64, 24, 12, 6, '#d1a1bd'); ellipse(ctx, 64, 24, 12, 6, '#d1a1bd');
  if (boss.defeated) { ctx.fillStyle = '#fff2a7'; ctx.font = '28px Trebuchet MS'; ctx.fillText('✦', -12, -70); }
  ctx.restore();
}

export function renderWorld(ctx, world, width, height) {
  const viewWidth = width / height * 480, scale = height / 480;
  const { level, player: p } = world;
  const desired = Math.max(0, Math.min(level.length - viewWidth, p.x - viewWidth * 0.3));
  world.camera += (desired - world.camera) * (reducedMotion.matches ? 1 : 0.12);
  const camera = world.camera;
  ctx.clearRect(0, 0, width, height); ctx.save(); ctx.scale(scale, scale);
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, level.sky[0]); sky.addColorStop(1, level.sky[1]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, viewWidth, 480);
  ellipse(ctx, viewWidth - 120, 81, 38, 38, world.levelIndex === 2 ? '#fff1d9' : '#ffe3a0');
  for (let i = -1; i < 8; i++) {
    const x = i * 320 - camera * 0.12 % 320;
    ellipse(ctx, x + 60, 64, 64, 15, '#ffffffa0'); ellipse(ctx, x + 40, 55, 30, 19, '#ffffffb0');
    ellipse(ctx, x + 140, 370, 220, 155, level.hills[0]);
    ellipse(ctx, x + 260, 394, 185, 118, level.hills[1]);
  }
  for (let i = -1; i < 7; i++) tree(ctx, i * 390 - camera * 0.32 % 390 + 100, GROUND + 10, 0.86, world.levelIndex === 2);
  ctx.save(); ctx.translate(-camera, 0);
  const visible = (x, w = 100) => x + w > camera - 50 && x < camera + viewWidth + 50;
  let left = 0;
  for (const pit of [...level.pits, { x: level.length, w: 0 }]) {
    const x = Math.max(left, camera - 20), right = Math.min(pit.x, camera + viewWidth + 20);
    if (right > x) {
      round(ctx, x, GROUND, right - x, 160, 0, '#c4a379');
      ctx.fillStyle = '#a8c57c'; ctx.fillRect(x, GROUND, right - x, 15);
      ctx.fillStyle = '#789b5e'; ctx.fillRect(x, GROUND + 13, right - x, 5);
      for (let dot = Math.ceil(x / 47) * 47; dot < right; dot += 47) {
        ellipse(ctx, dot, GROUND + 46 + Math.sin(dot) * 11, 5, 3, '#a78665');
        ellipse(ctx, dot + 17, GROUND + 83, 4, 3, '#dcc295');
      }
    }
    if (visible(pit.x, pit.w) && pit.w) {
      ctx.fillStyle = '#a6d6d1'; ctx.fillRect(pit.x, GROUND + 100, pit.w, 50);
      ctx.strokeStyle = '#e2f3e4'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pit.x + 8, GROUND + 113); ctx.lineTo(pit.x + pit.w - 8, GROUND + 113); ctx.stroke();
      ctx.fillStyle = '#f7e7b7'; ctx.beginPath(); ctx.moveTo(pit.x - 23, GROUND - 8); ctx.lineTo(pit.x - 8, GROUND - 8); ctx.lineTo(pit.x - 15, GROUND - 22); ctx.fill();
    }
    left = pit.x + pit.w;
  }
  for (const shelf of level.platforms) if (visible(shelf.x, shelf.w)) {
    round(ctx, shelf.x, shelf.y, shelf.w, 20, 9, '#b58d6a', '#86674f');
    round(ctx, shelf.x - 2, shelf.y - 3, shelf.w + 4, 9, 5, '#bad78e');
    for (let x = shelf.x + 14; x < shelf.x + shelf.w - 10; x += 32) {
      ctx.strokeStyle = '#d4b491'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, shelf.y + 12); ctx.lineTo(x + 15, shelf.y + 12); ctx.stroke();
    }
  }
  for (const f of world.fruit) if (!f.collected && visible(f.x, 30)) {
    const bob = reducedMotion.matches ? 0 : Math.sin(world.time * 2.8 + f.x) * 3;
    ellipse(ctx, f.x, f.y + 18, 12, 3, '#66744a1a');
    picture(ctx, f.kind, f.x - 18, f.y - 20 + bob, 36, 36);
  }
  for (const d of world.dinosaurs) if (visible(d.x)) {
    ctx.save(); ctx.translate(d.x + d.w / 2, d.y + d.h);
    if (d.direction > 0) ctx.scale(-1, 1);
    picture(ctx, 'dinosaur', -d.w / 2, -d.h - 5, d.w, d.h + 5); ctx.restore();
  }
  for (const b of world.bees) if (visible(b.x)) picture(ctx, 'bee', b.x - 5, b.y - 5, b.w + 10, b.h + 10);
  // Checkpoints are small pink pennants; the large exit is always at the far right.
  for (const [x, checkpoint] of [[level.checkpoint, true], [level.length - 95, false]]) if (visible(x)) {
    const locked = !checkpoint && world.boss && !world.boss.defeated;
    const flagY = checkpoint ? GROUND - 78 : GROUND - 145;
    round(ctx, x, flagY, 7, GROUND - flagY, 4, '#a27f61');
    ctx.fillStyle = locked ? '#9b8ba5' : checkpoint && world.checkpointLit ? '#82b47b' : '#e782a1';
    ctx.beginPath(); ctx.moveTo(x + 7, flagY + 3); ctx.lineTo(x + 62, flagY + 19); ctx.lineTo(x + 7, flagY + 38); ctx.fill();
    if (!checkpoint) picture(ctx, 'star', x + 12, flagY + 3, 30, 30);
  }
  if (world.boss && visible(world.boss.x, 320)) spider(ctx, world.boss, world.time);
  for (const shot of world.webs) if (visible(shot.x)) web(ctx, shot.x, shot.y, 18, world.time * 2);
  for (const s of reducedMotion.matches ? [] : world.particles) {
    ctx.globalAlpha = Math.max(0, s.life / 0.7); ellipse(ctx, s.x, s.y, 3, 3, s.color);
  }
  ctx.globalAlpha = 1;
  ctx.save();
  const drawWidth = p.h * 0.57, drawHeight = p.h * 1.07;
  ctx.translate(p.x + p.w / 2, p.y + p.h); ctx.scale(p.face, 1);
  const bob = !reducedMotion.matches && p.grounded && Math.abs(p.vx) > 30 ? Math.sin(world.time * 19) * 1.5 : 0;
  ctx.translate(-drawWidth / 2, -drawHeight + bob);
  if (ready(pictures.chloe)) {
    // Clip neighbouring poses out of the existing sheet while preserving proportions.
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(drawWidth * 0.94, 0); ctx.lineTo(drawWidth * 0.94, drawHeight * 0.24);
    ctx.lineTo(drawWidth, drawHeight * 0.24); ctx.lineTo(drawWidth, drawHeight); ctx.lineTo(drawWidth * 0.07, drawHeight);
    ctx.lineTo(drawWidth * 0.07, drawHeight * 0.85); ctx.lineTo(0, drawHeight * 0.85); ctx.closePath(); ctx.clip();
    ctx.drawImage(pictures.chloe, 549, 0, 491, 1024, 0, 0, drawWidth, drawHeight);
  } else {
    round(ctx, 0, drawHeight * 0.3, drawWidth, drawHeight * 0.7, 8, '#e68099');
    ellipse(ctx, drawWidth / 2, drawHeight * 0.2, drawWidth / 2, drawHeight * 0.2, '#e9b298');
  }
  ctx.restore();
  if (p.webbed > 0) web(ctx, p.x + p.w / 2, p.y + p.h / 2, p.h * 0.6);
  ctx.restore();
  if (world.boss?.active && !world.boss.defeated) {
    const w = Math.min(360, viewWidth * 0.48), x = (viewWidth - w) / 2;
    round(ctx, x, 80, w, 37, 17, '#fff8eadf', '#c4aacd');
    ctx.fillStyle = '#614769'; ctx.font = 'bold 15px Trebuchet MS'; ctx.textAlign = 'center';
    ctx.fillText(`SPIDER  ·  ${world.boss.hits} / 10`, viewWidth / 2, 96);
    for (let i = 0; i < 10; i++) round(ctx, x + 18 + i * (w - 36) / 10, 102, (w - 48) / 10 - 3, 6, 3, i < world.boss.hits ? '#e383a3' : '#d9cbdc');
  }
  ctx.restore();
}
