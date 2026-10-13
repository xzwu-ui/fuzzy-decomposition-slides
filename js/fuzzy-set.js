/* Fuzzy-set arithmetic: integers encode thousandths, avoiding tolerance-based boundary errors. */
(function(root){
'use strict';
const DEMO=[{id:'p',mu:900},{id:'q',mu:600},{id:'r',mu:600},{id:'s',mu:200}];
const COURSE=[{id:'a',mu:1000},{id:'b',mu:950},{id:'c',mu:760},{id:'d',mu:650},{id:'e',mu:300},{id:'f',mu:0}];
const defaultChoices={p:true,q:true,r:false,s:false,a:true,b:false,c:false,d:true,e:false,f:false};
function cut(data,level,strong=false){return data.filter(x=>strong?x.mu>level:x.mu>=level).map(x=>x.id);}
function H(data,level,choices=defaultChoices){return data.filter(x=>x.mu>level||(x.mu===level&&!!choices[x.id])).map(x=>x.id);}
function intersection(sets,universe){return sets.reduce((a,b)=>a.filter(x=>b.includes(x)),universe.slice());}
function union(sets){return [...new Set(sets.flat())];}
function equal(a,b){return a.length===b.length&&a.every(x=>b.includes(x));}
function legal(data,level,choices){const h=H(data,level,choices);return cut(data,level,true).every(x=>h.includes(x))&&h.every(x=>cut(data,level).includes(x));}
/* A finite-domain certificate for the infinite operation. Each rejected (left)
   or accepted (right) element supplies a midpoint witness strictly in the index interval.
   Midpoints can be half-integers; they are exactly representable in this encoding. */
function certificate(data,lambda,side,choices=defaultChoices){
 if(lambda<0||lambda>1000)throw new RangeError('lambda outside [0,1]');
 const candidates=data.filter(x=>side==='left'?x.mu<lambda:x.mu>lambda);
 const witnesses=candidates.map(x=>({id:x.id,level:(x.mu+lambda)/2}));
 const levels=[...new Set(witnesses.map(x=>x.level))];
 const sets=levels.map(a=>H(data,a,choices));
 const result=side==='left'?intersection(sets,data.map(x=>x.id)):union(sets);
 return {witnesses,levels,sets,result,expected:cut(data,lambda,side==='right'),emptyIndex:side==='left'?lambda===0:lambda===1000};
}
function fmtLevel(n){return (n/1000).toFixed(n%10===0?2:3).replace(/0+$/,'').replace(/\.$/,'');}
function setText(a){return a.length?'{ '+a.join(', ')+' }':'∅';}
const api={DEMO,COURSE,defaultChoices,cut,H,intersection,union,equal,legal,certificate,fmtLevel,setText};
root.Fuzzy=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
