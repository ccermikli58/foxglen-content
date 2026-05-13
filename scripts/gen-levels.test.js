const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('./gen-levels.js');

test('module exports compile pipeline', () => {
  assert.equal(typeof G.compileLevel, 'function');
  assert.equal(typeof G.chapterFor, 'function');
  assert.ok(Array.isArray(G.CHAPTERS));
  assert.equal(G.CHAPTERS.length, 5);
  assert.equal(typeof G.BUNDLE_VERSION, 'number');
});

test('compileLevel produces a v5-shaped spec', () => {
  const lv = G.compileLevel({ num: 1, arch: 'simpleCollect', diff: 1, kinds: [0] });
  assert.equal(lv.num, 1);
  assert.equal(lv.archetype, 'simpleCollect');
  assert.ok(lv.moves >= 10);
  assert.ok(lv.star1 <= lv.star2 && lv.star2 <= lv.star3);
  assert.deepEqual(Object.keys(lv.goals), ['0']);
});

test('clamp keeps value in [lo, hi]', () => {
  assert.equal(G.clamp(5, 1, 3), 3);
  assert.equal(G.clamp(0, 1, 3), 1);
  assert.equal(G.clamp(2, 1, 3), 2);
});

test('lerp interpolates linearly between endpoints', () => {
  assert.equal(G.lerp(0, 10, 0),   0);
  assert.equal(G.lerp(0, 10, 0.5), 5);
  assert.equal(G.lerp(0, 10, 1),  10);
});

test('applyArc gentle drops peak by 1 with floor base+3', () => {
  assert.deepEqual(G.applyArc({ base: 1, peak: 6 }, 'gentle'), { base: 1, peak: 5 });
  // Floor protects degenerate bands
  assert.deepEqual(G.applyArc({ base: 5, peak: 6 }, 'gentle'), { base: 5, peak: 8 });
});

test('applyArc aggressive lifts base by 1', () => {
  assert.deepEqual(G.applyArc({ base: 5, peak: 10 }, 'aggressive'), { base: 6, peak: 10 });
});

test('applyArc standard leaves band unchanged', () => {
  assert.deepEqual(G.applyArc({ base: 3, peak: 8 }, 'standard'), { base: 3, peak: 8 });
});

test('FINALE_ARCHETYPE_BY_CHAPTER covers Ch1-Ch5', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    assert.ok(typeof G.FINALE_ARCHETYPE_BY_CHAPTER[n] === 'string');
  }
});

test('ICE_ROTATION patterns are valid', () => {
  for (const p of G.ICE_ROTATION) assert.ok(G.ICE_PATTERNS[p], `unknown ice pattern: ${p}`);
});

test('VINE_ROTATION patterns are valid', () => {
  for (const p of G.VINE_ROTATION) assert.ok(G.VINE_PATTERNS[p], `unknown vine pattern: ${p}`);
});
