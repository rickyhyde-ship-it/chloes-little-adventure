export const ZONES = [
  {name:'Sunshine Bay',tag:'A sunny little beginning',icon:'☀',unlock:0,base:0,sky:'#fff0c8',water:'#42c6d4',deep:'#137aab',accent:'#e6ad46'},
  {name:'Coral Cove',tag:'A rainbow beneath the waves',icon:'✿',unlock:120,base:120,sky:'#ffe2df',water:'#4bbcc4',deep:'#315c93',accent:'#dc7f98'},
  {name:'Moonlit Sea',tag:'Where the ocean twinkles',icon:'☾',unlock:280,base:280,sky:'#c8cee9',water:'#627dc7',deep:'#252950',accent:'#a998de'}
];
export const SPECIES = [
  {id:'minnow',name:'Pebble Minnow',zone:0,min:6,value:5,color:'#a5e8df',accent:'#60ada5',shape:'fish',size:22},
  {id:'guppy',name:'Sunshine Guppy',zone:0,min:18,value:8,color:'#ffd478',accent:'#ea9b60',shape:'fish',size:26},
  {id:'puffer',name:'Peach Puffer',zone:0,min:40,value:12,color:'#f9b1a7',accent:'#d87c86',shape:'puffer',size:29},
  {id:'turtle',name:'Little Sea Turtle',zone:0,min:75,value:20,color:'#91c997',accent:'#487b78',shape:'turtle',size:35},
  {id:'clown',name:'Candy Clownfish',zone:1,min:6,value:13,color:'#f4a076',accent:'#fff3db',shape:'stripe',size:28},
  {id:'angel',name:'Lavender Angelfish',zone:1,min:25,value:18,color:'#c8b7ea',accent:'#8e75bb',shape:'angel',size:30},
  {id:'ray',name:'Velvet Ray',zone:1,min:55,value:28,color:'#7bc4d9',accent:'#5593b3',shape:'ray',size:38},
  {id:'seahorse',name:'Golden Seahorse',zone:1,min:100,value:40,color:'#f4cd75',accent:'#bd9959',shape:'seahorse',size:28},
  {id:'jelly',name:'Moon Jelly',zone:2,min:6,value:22,color:'#d7b6ee',accent:'#a17ccd',shape:'jelly',size:30},
  {id:'lantern',name:'Starlight Lanternfish',zone:2,min:30,value:30,color:'#8cdee0',accent:'#fff0a4',shape:'fish',size:31},
  {id:'octopus',name:'Pearl Octopus',zone:2,min:70,value:45,color:'#e6a6cf',accent:'#b980ae',shape:'octopus',size:35},
  {id:'whale',name:'Dreamy Baby Whale',zone:2,min:130,value:65,color:'#9caedc',accent:'#657eb1',shape:'whale',size:48}
];
export const UPGRADES = [
  {id:'strength',name:'Cast power',icon:'↗',detail:'Throw your float further',base:15},
  {id:'weight',name:'Dive weight',icon:'↓',detail:'Explore deeper water',base:18},
  {id:'rebound',name:'Water bounce',icon:'≈',detail:'More skips across the sea',base:16},
  {id:'resistance',name:'Gentle line',icon:'♡',detail:'Bring back more sea friends',base:24}
];
export const MAX_LEVEL=8;
export const costFor=(id,level)=>Math.ceil(UPGRADES.find(u=>u.id===id).base*1.45**level);
export const freshProgress=()=>({coins:0,record:0,casts:0,upgrades:{strength:0,weight:0,rebound:0,resistance:0},collection:{}});
export function cleanProgress(raw) {
  const p=freshProgress(),number=(n,max)=>Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;
  if(!raw||typeof raw!=='object')return p;
  p.coins=number(raw.coins,10000000);p.record=number(raw.record,2000);p.casts=number(raw.casts,1000000);
  for(const u of UPGRADES)p.upgrades[u.id]=number(raw.upgrades?.[u.id],MAX_LEVEL);
  for(const s of SPECIES){const n=number(raw.collection?.[s.id],1000000);if(n)p.collection[s.id]=n;}
  return p;
}
export const STORAGE_KEY='chloe-fishing-v1';
export function loadProgress(storage) {try{return cleanProgress(JSON.parse(storage.getItem(STORAGE_KEY)));}catch{return freshProgress();}}
export function saveProgress(storage,progress) {try{storage.setItem(STORAGE_KEY,JSON.stringify(cleanProgress(progress)));return true;}catch{return false;}}
