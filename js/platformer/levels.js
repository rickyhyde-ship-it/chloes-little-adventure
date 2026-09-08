export const GROUND = 342;

const shelf = (x, y, w = 130) => ({ x, y, w, h: 20 });
function rewards(length, pits, platforms) {
  const fruit = [];
  for (let x = 230; x < length - 260; x += 140) {
    if (!pits.some(p => x > p.x - 30 && x < p.x + p.w + 30))
      fruit.push({ x, y: GROUND - 28, kind: fruit.length % 2 ? 'banana' : 'apple' });
  }
  for (const p of platforms) {
    for (let x = p.x + 25; x < p.x + p.w - 12; x += 48)
      fruit.push({ x, y: p.y - 25, kind: fruit.length % 2 ? 'apple' : 'banana', elevated: true });
  }
  return fruit;
}

const configurations = [
  {
    name: 'Apple Meadow', difficulty: 'Easy', length: 3000,
    sky: ['#d9f0ed', '#fff3d1'], hills: ['#b6d799', '#8cbb73'],
    platforms: [shelf(430, 290), shelf(610, 240), shelf(840, 280), shelf(1410, 290), shelf(1610, 238), shelf(2070, 286), shelf(2250, 238)],
    pits: [], dinosaurs: [{ x: 1150, range: 65, speed: 25 }, { x: 2480, range: 70, speed: 32 }],
    bees: [{ x: 1870, y: 214, range: 65, speed: 1.2 }],
    checkpoint: 1530, hint: 'Hold an arrow to move. Tap ↑ to jump!',
  },
  {
    name: 'Dinosaur Valley', difficulty: 'Medium', length: 3900,
    sky: ['#e0eef7', '#f7efd8'], hills: ['#aac7ba', '#79a696'],
    platforms: [shelf(400, 290), shelf(570, 238), shelf(790, 205), shelf(1350, 292), shelf(1520, 242), shelf(1720, 194), shelf(2320, 289), shelf(2510, 240), shelf(3140, 287), shelf(3330, 236)],
    pits: [{ x: 1080, w: 95 }, { x: 2070, w: 105 }, { x: 2890, w: 110 }],
    dinosaurs: [{ x: 900, range: 55, speed: 48 }, { x: 1850, range: 80, speed: 52 }, { x: 3500, range: 90, speed: 48 }],
    bees: [{ x: 680, y: 205, range: 95, speed: 1.6 }, { x: 1450, y: 230, range: 64, speed: 1.8 }, { x: 2700, y: 218, range: 84, speed: 1.7 }],
    checkpoint: 1940, hint: 'Jump over gaps. Find the fruit on the platforms!',
  },
  {
    name: 'The Webwood', difficulty: 'Hard', length: 5100,
    sky: ['#d9dcea', '#f4e5d9'], hills: ['#b5b5cf', '#8b9eac'],
    platforms: [shelf(360, 291, 105), shelf(525, 242, 100), shelf(690, 193, 105), shelf(1250, 292, 105), shelf(1420, 240, 110), shelf(1590, 190, 100), shelf(2230, 291, 100), shelf(2400, 241, 100), shelf(2570, 192, 110), shelf(3130, 291, 105), shelf(3300, 240, 100), shelf(3490, 191, 115), shelf(4050, 292, 135), shelf(4215, 246, 115), shelf(4790, 292, 145)],
    pits: [{ x: 950, w: 125 }, { x: 1900, w: 130 }, { x: 2840, w: 135 }, { x: 3750, w: 125 }],
    dinosaurs: [{ x: 805, range: 50, speed: 66 }, { x: 1740, range: 60, speed: 64 }, { x: 2680, range: 70, speed: 70 }, { x: 3590, range: 60, speed: 68 }],
    bees: [{ x: 600, y: 209, range: 97, speed: 2.1 }, { x: 1350, y: 220, range: 81, speed: 2.3 }, { x: 2300, y: 212, range: 98, speed: 2.2 }, { x: 3240, y: 215, range: 96, speed: 2.4 }],
    checkpoint: 3980, boss: true, hint: 'Avoid the webs. Jump on the spider 10 times!',
  },
];

export const levels = configurations.map(level => ({ ...level, fruit: rewards(level.length, level.pits, level.platforms) }));
