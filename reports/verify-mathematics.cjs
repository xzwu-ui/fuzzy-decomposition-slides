'use strict';
const assert = require('node:assert/strict');
const F = require('../js/fuzzy-set.js');
let cases = 0;
for (const data of [F.DEMO, F.COURSE]) {
  for (let mask = 0; mask < 2 ** data.length; mask++) {
    const choices = Object.fromEntries(data.map((x, i) => [x.id, Boolean(mask & (1 << i))]));
    for (let lambda = 0; lambda <= 1000; lambda++) {
      for (const side of ['left', 'right']) {
        const left = side === 'left';
        const candidates = data.filter(x => left ? x.mu < lambda : x.mu > lambda).map(x => x.mu);
        let result;
        if (left && lambda === 0) result = data.map(x => x.id);
        else if (!left && lambda === 1000) result = [];
        else {
          const gamma = candidates.length
            ? (lambda + (left ? Math.max(...candidates) : Math.min(...candidates))) / 2
            : (left ? lambda / 2 : (lambda + 1000) / 2);
          assert(left ? gamma < lambda : gamma > lambda);
          assert(gamma >= 0 && gamma <= 1000);
          result = F.H(data, gamma, choices);
        }
        assert(F.equal(result, F.cut(data, lambda, !left)), 'Single-level recovery failed');
        cases++;
      }
    }
  }
}
assert.equal(cases, 160160);
console.log('PASS: 160160 single-level recovery checks, all boundary choices and endpoint conventions.');
