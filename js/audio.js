export class AudioManager {
 constructor(){this.enabled=true;this.started=false;this.context=null;this.narration=null;this.effects=new Set();}
 unlock(){this.started=true;try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){this.context??=new AC();this.context.resume().catch(()=>{});}}catch{} }
 toggle(){this.enabled=!this.enabled;if(!this.enabled)this.stop();return this.enabled;}
 stop(){try{window.speechSynthesis?.cancel();}catch{}this.narration?.pause();this.effects.forEach(a=>a.pause());this.effects.clear();}
 say(text){if(!this.enabled||!this.started)return;try{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-GB';u.rate=.83;u.pitch=1.13;const voices=window.speechSynthesis.getVoices();const v=voices.find(v=>v.lang==='en-GB'&&/female|samantha|serena|susan|libby/i.test(v.name))||voices.find(v=>v.lang==='en-GB');if(v)u.voice=v;window.speechSynthesis.speak(u);}catch{} }
 effect(kind='success'){if(!this.enabled||!this.started||!this.context)return;try{const c=this.context;const notes=kind==='tap'?[440]:kind==='munch'?[240,320]:[523,659,784];notes.forEach((n,i)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+i*.11;o.type='sine';o.frequency.value=n;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.23);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.24);});}catch{} }
 preload(paths=[]){paths.forEach(p=>{const a=new Audio();a.preload='auto';a.src=p;});}
 async playFile(path,channel='narration'){if(!path||!this.enabled||!this.started)return false;try{const a=new Audio(path);if(channel==='narration'){this.stop();this.narration=a;}else this.effects.add(a);a.onended=()=>this.effects.delete(a);await a.play();return true;}catch{return false;} }
}
export const audio=new AudioManager();
