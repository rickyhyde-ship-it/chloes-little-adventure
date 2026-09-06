import {fallbackImages} from './fallback-images.js';
export const fruits=['apple','banana','strawberry','orange','grapes','watermelon'];
export const assets={chloe:'assets/chloe/chloe-poses.webp',bee:'assets/bees/bee.svg',dinosaur:'assets/dinosaurs/dino.svg',basket:'assets/ui/basket.svg',star:'assets/ui/star.svg',...Object.fromEntries(fruits.map(f=>[f,`assets/fruit/${f}.svg`]))};
export const icons={home:'<path d="M5 15 20 3l15 12M9 13v21h22V13M17 34V23h7v11"/>',sound:'<path d="M6 16h7L23 8v24l-10-8H6zM29 14q7 6 0 12M33 7q14 13 0 26"/>',muted:'<path d="M6 16h7L23 8v24l-10-8H6zM29 15l9 10m0-10-9 10"/>',play:'<path d="M10 5q-3-2-3 3v25q0 5 4 2l24-13q4-2 0-4z" fill="currentColor" stroke="none"/>',replay:'<path d="M9 13a14 14 0 1 1-2 17M9 4v11H0"/>'};
export const icon=name=>`<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
export function pic(name,cls=''){return `<img class="${cls}" src="${assets[name]||assets.star}" alt="" draggable="false" data-asset="${name}">`;}
export function preload(){Object.values(assets).forEach(src=>{const img=new Image();img.src=src;});}
export function installFallbacks(){document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement&&!e.target.dataset.fallback){e.target.dataset.fallback='true';e.target.src=fallbackImages[e.target.dataset.asset]||fallbackImages.star;}},true);}
