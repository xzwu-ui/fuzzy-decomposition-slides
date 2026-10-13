'use strict';
const assert=require('node:assert/strict'),F=require('../js/fuzzy-set.js');let cases=0;
for(const data of [F.DEMO,F.COURSE]){
 const ids=data.map(x=>x.id);
 for(let mask=0;mask<2**ids.length;mask++){
  const choices=Object.fromEntries(ids.map((id,i)=>[id,!!(mask&(1<<i))]));
  for(let lambda=0;lambda<=1000;lambda++){
   assert(F.legal(data,lambda,choices));
   for(const side of ['left','right']){
    const c=F.certificate(data,lambda,side,choices);
    assert(F.equal(c.result,c.expected),`certificate failed: ${mask},${lambda},${side}`);
    for(const w of c.witnesses){const m=data.find(x=>x.id===w.id).mu;assert(side==='left'?m<w.level&&w.level<lambda:lambda<w.level&&w.level<m);assert(F.legal(data,w.level,choices));}
    cases++;
   }
  }
  const levels=[...new Set([0,1000,...data.map(x=>x.mu),...data.map(x=>Math.min(1000,x.mu+.5)),...data.map(x=>Math.max(0,x.mu-.5))])].sort((a,b)=>a-b);
  for(let i=0;i<levels.length;i++)for(let j=i+1;j<levels.length;j++){const lo=F.H(data,levels[i],choices),hi=F.H(data,levels[j],choices);assert(hi.every(x=>lo.includes(x)),'H monotonicity');}
 }
}
assert.deepEqual(F.cut(F.COURSE,760),['a','b','c']);assert.deepEqual(F.cut(F.COURSE,760,true),['a','b']);
assert.deepEqual(F.H(F.DEMO,600),['p','q']);assert(!F.equal(F.H(F.DEMO,600),F.cut(F.DEMO,600)));assert(!F.equal(F.H(F.DEMO,600),F.cut(F.DEMO,600,true)));
for(let c=0;c<2;c++){
 const choices={...F.defaultChoices,c:!!c};
 const left=F.intersection([200,600,700,750,759].map(a=>F.H(F.COURSE,a,choices)),F.COURSE.map(x=>x.id));
 const right=F.union([990,950,850,800,761].map(a=>F.H(F.COURSE,a,choices)));
 assert.deepEqual(left,['a','b','c']);assert(F.equal(right,['a','b']));
}
assert.deepEqual(F.intersection([],F.COURSE.map(x=>x.id)),['a','b','c','d','e','f']);assert.deepEqual(F.union([]),[]);
console.log(`PASS: ${cases.toLocaleString()} recovery cases, all legal boundary masks, critical-level monotonicity, six-element exact values, empty-family conventions.`);
