export const state = { screen:'home', activityIndex:0, roundIndex:0, stickers:[], soundEnabled:true, interactionLocked:false, portrait:false, count:0, session:0 };
export function reset(screen='home') { state.session++; Object.assign(state,{screen,activityIndex:0,roundIndex:0,stickers:[],interactionLocked:false,count:0}); }
export const shuffle = values => { const a=[...values]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; };
