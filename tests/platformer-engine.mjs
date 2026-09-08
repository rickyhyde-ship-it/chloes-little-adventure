import assert from 'node:assert/strict';
import { PlatformWorld, PHYSICS } from '../js/platformer/engine.js';
import { levels, GROUND } from '../js/platformer/levels.js';
const dt = 1 / 120;
function step(world, seconds, input = {}) { for (let i = 0; i < seconds / dt; i++) world.update(dt, input); }
function at(world, x, feet = GROUND) { Object.assign(world.player, { x, y: feet - world.player.h, vy: 0, vx: 0, grounded: true, coyote: .12, jumpBuffer: 0 }); }

assert.deepEqual(levels.map(l => l.difficulty), ['Easy', 'Medium', 'Hard']);
assert.ok(levels[0].pits.length < levels[1].pits.length && levels[1].pits.length < levels[2].pits.length);
assert.ok(levels.every(l => l.fruit.some(f => f.elevated && f.kind === 'apple') && l.fruit.some(f => f.elevated && f.kind === 'banana')));

const fruit = new PlatformWorld(); at(fruit, 200); step(fruit, .3, { right: true });
assert.equal(fruit.score.apple, 1); const apple = fruit.fruit.find(f => f.collected);
at(fruit, apple.x - 10); step(fruit, .1); assert.equal(fruit.score.apple, 1, 'Rewards cannot count twice');

const platform = new PlatformWorld(); at(platform, 420); platform.jump();
let landed = false;
for (let i = 0; i < 180; i++) { platform.update(dt, { right: platform.player.x < 470 }); if (platform.player.grounded && platform.player.y + platform.player.h === 290) { landed = true; break; } }
assert.ok(landed, 'Chloe lands on top of a platform');
assert.ok(platform.fruit.some(f => f.elevated && f.collected), 'Jumping collects elevated rewards');

function apex(small) {
 const w = new PlatformWorld(); w.bees = []; w.dinosaurs = []; at(w, 80); if (small) w.shrink();
 w.jump(); let highest = GROUND;
 for (let i = 0; i < 140; i++) { w.update(dt); highest = Math.min(highest, w.player.y + w.player.h); }
 return GROUND - highest;
}
const normalJump = apex(false), tinyJump = apex(true);
assert.ok(Math.abs(tinyJump / normalJump - .5) < .02, 'Shrinking halves jump height, not jump speed');
const tiny = new PlatformWorld(); tiny.shrink(); assert.equal(tiny.player.h, PHYSICS.height / 2); assert.equal(tiny.player.w, PHYSICS.width / 2);
step(tiny, 9.9); assert.ok(tiny.player.small > 0); step(tiny, .12); assert.equal(tiny.player.small, 0); assert.equal(tiny.player.h, PHYSICS.height); assert.equal(tiny.player.y + tiny.player.h, GROUND);

const bee = new PlatformWorld(); const b = bee.bees[0]; at(bee, b.x, b.originY + 36); bee.update(dt); assert.ok(bee.player.small > 9.9); const oldY = b.y; step(bee, .3); assert.notEqual(b.y, oldY);

const dino = new PlatformWorld(); const d = dino.dinosaurs[0]; at(dino, d.x - 33); dino.update(dt, { right: true }); assert.ok(dino.player.x + dino.player.w <= d.x); assert.ok(dino.player.vx < 0);
dino.jump(); step(dino, .62, { right: true }); assert.ok(dino.player.x > d.x + d.w, 'Jumping escapes dinosaur pushback');

const fall = new PlatformWorld(1); fall.checkpoint = 1940; fall.score.apple = 8; at(fall, 1100); fall.player.y = 600; fall.update(dt);
assert.equal(fall.player.x, 1940); assert.equal(fall.score.apple, 8);

const bossWorld = new PlatformWorld(2), boss = bossWorld.boss; boss.active = true;
// Side/body contact must never count as a stomp.
at(bossWorld, boss.x + 50); bossWorld.update(dt); assert.equal(boss.hits, 0);
for (let hit = 1; hit <= 10; hit++) {
  boss.immune = 0;
  Object.assign(bossWorld.player, { x: boss.x + 70, y: boss.y - PHYSICS.height - 2, vy: 300, grounded: false });
  bossWorld.update(dt);
  assert.equal(boss.hits, hit); assert.ok(bossWorld.player.vy < 0);
  bossWorld.update(dt); assert.equal(boss.hits, hit, 'One landing produces one boss hit');
  if (hit < 10) assert.equal(boss.defeated, false);
}
assert.equal(boss.defeated, true); assert.deepEqual(bossWorld.webs, []);
at(bossWorld, 5020); bossWorld.update(dt); assert.equal(bossWorld.status, 'won');
const gate = new PlatformWorld(2); at(gate, 5020); gate.update(dt); assert.equal(gate.status, 'playing'); assert.ok(gate.player.x <= 4900);
const shoot = new PlatformWorld(2); at(shoot, 4200); step(shoot, 1.7); assert.ok(shoot.webs.length > 0, 'Boss fires webs');
shoot.webs = [{ x: shoot.player.x + 10, y: shoot.player.y + 20, vx: 0, vy: 0, life: 1 }]; shoot.update(dt); assert.ok(shoot.player.webbed > 0);
shoot.webs = []; shoot.boss.active = false; at(shoot, 100); step(shoot, 1.6); assert.equal(shoot.player.webbed, 0);
console.log(`PASS: level difficulty, platform fruit, collection, landings, dinosaur escape, bee bobbing, exact ten-second shrink, jump ratio ${(tinyJump / normalJump).toFixed(3)}, checkpoints, webs, boss gate and exactly ten distinct stomps.`);
