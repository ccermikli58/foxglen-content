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

test('allocateBeats: Ch1 L=9 produces 9 beats ending in finale', () => {
  const beats = G.allocateBeats({ num: 1, start: 1, end: 9 });
  assert.equal(beats.length, 9);
  assert.equal(beats[beats.length - 1].tag, 'finale');
  assert.equal(beats[0].tag, 'intro');
  // Ch1 has no payingMoment (only ch.num >= 2)
  assert.ok(!beats.some(b => b.tag === 'payingMoment'));
  // Ch1 short enough (L<13) → no relief_b
  assert.ok(!beats.some(b => b.tag === 'relief_b'));
});

test('allocateBeats: Ch2 L=11 produces 11 beats with payingMoment', () => {
  const beats = G.allocateBeats({ num: 2, start: 10, end: 20 });
  assert.equal(beats.length, 11);
  assert.equal(beats[beats.length - 1].tag, 'finale');
  assert.equal(beats.filter(b => b.tag === 'payingMoment').length, 1);
  assert.equal(beats.filter(b => b.tag === 'relief_b').length, 0);
});

test('allocateBeats: Ch4 L=15 produces 15 beats with payingMoment + relief_b', () => {
  const beats = G.allocateBeats({ num: 4, start: 31, end: 45 });
  assert.equal(beats.length, 15);
  assert.equal(beats.filter(b => b.tag === 'payingMoment').length, 1);
  assert.equal(beats.filter(b => b.tag === 'relief_b').length, 1);
});

test('allocateBeats: every beat carries tag + subIndex + segmentLen', () => {
  const beats = G.allocateBeats({ num: 2, start: 10, end: 20 });
  for (const b of beats) {
    assert.ok(typeof b.tag === 'string');
    assert.ok(typeof b.subIndex === 'number');
    assert.ok(typeof b.segmentLen === 'number' && b.segmentLen >= 1);
  }
});

test('allocateBeats: subIndex restarts at 0 per segment', () => {
  const beats = G.allocateBeats({ num: 4, start: 31, end: 45 });
  const buildA = beats.filter(b => b.tag === 'build_a');
  assert.equal(buildA[0].subIndex, 0);
  assert.equal(buildA[buildA.length - 1].subIndex, buildA.length - 1);
});

test('allocateBeats: throws on L < 7', () => {
  assert.throws(() => G.allocateBeats({ num: 1, start: 1, end: 6 }), /minimum chapter length/i);
});

test('computeDiff intro slot 0 = band.base', () => {
  const band = { base: 3, peak: 8 };
  assert.equal(G.computeDiff({ tag: 'intro', subIndex: 0, segmentLen: 2 }, band, /*prev*/ null), 3);
});

test('computeDiff intro slot 1 = band.base + 1', () => {
  const band = { base: 3, peak: 8 };
  assert.equal(G.computeDiff({ tag: 'intro', subIndex: 1, segmentLen: 2 }, band, null), 4);
});

test('computeDiff build slot ramps from base+1 to peak-2', () => {
  const band = { base: 3, peak: 8 };
  const first = G.computeDiff({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, band, null);
  const last  = G.computeDiff({ tag: 'build_a', subIndex: 2, segmentLen: 3 }, band, null);
  assert.equal(first, 4);  // base + 1
  assert.equal(last, 6);   // peak - 2
});

test('computeDiff mid = peak - 1', () => {
  assert.equal(G.computeDiff({ tag: 'mid', subIndex: 0, segmentLen: 1 }, { base: 3, peak: 8 }, null), 7);
});

test('computeDiff relief drops 2 from previous level diff (floor base)', () => {
  const band = { base: 3, peak: 8 };
  assert.equal(G.computeDiff({ tag: 'relief_a', subIndex: 0, segmentLen: 1 }, band, { diff: 7 }), 5);
  assert.equal(G.computeDiff({ tag: 'relief_a', subIndex: 0, segmentLen: 1 }, band, { diff: 4 }), 3);
});

test('computeDiff payingMoment = peak - 1', () => {
  assert.equal(G.computeDiff({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 }, { base: 5, peak: 10 }, null), 9);
});

test('computeDiff finale = peak', () => {
  assert.equal(G.computeDiff({ tag: 'finale', subIndex: 0, segmentLen: 1 }, { base: 6, peak: 10 }, null), 10);
});
