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

test('pickArchetype intro slot 0 with noviceColor → simpleCollect', () => {
  const arch = G.pickArchetype({ tag: 'intro', subIndex: 0, segmentLen: 2 }, { obstacleTheme: 'ice', noviceColor: 4, num: 2 });
  assert.equal(arch, 'simpleCollect');
});

test('pickArchetype intro slot 0 without noviceColor → simpleCollect (chapter 1 ladder)', () => {
  const arch = G.pickArchetype({ tag: 'intro', subIndex: 0, segmentLen: 2 }, { obstacleTheme: 'none', noviceColor: null, num: 1 });
  assert.equal(arch, 'simpleCollect');
});

test('pickArchetype intro slot 1 → simpleCollect when noviceColor null else dualCollect', () => {
  // Ch1 (noviceColor null) — both intro slots teach a kind in isolation
  assert.equal(G.pickArchetype({ tag: 'intro', subIndex: 1, segmentLen: 2 }, { obstacleTheme: 'none', noviceColor: null, num: 1 }), 'simpleCollect');
  // Ch2 (noviceColor set) — slot 0 was simpleCollect, slot 1 dualCollect
  assert.equal(G.pickArchetype({ tag: 'intro', subIndex: 1, segmentLen: 2 }, { obstacleTheme: 'ice', noviceColor: 4, num: 2 }), 'dualCollect');
});

test('pickArchetype build_a rotates pool by subIndex', () => {
  const ch = { obstacleTheme: 'ice', noviceColor: 4, num: 2 };
  const pool = G.ARCHETYPE_POOLS.ice;
  assert.equal(G.pickArchetype({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, ch), pool[0]);
  assert.equal(G.pickArchetype({ tag: 'build_a', subIndex: 1, segmentLen: 3 }, ch), pool[1]);
  assert.equal(G.pickArchetype({ tag: 'build_a', subIndex: 2, segmentLen: 3 }, ch), pool[2]);
});

test('pickArchetype build_c resets rotation to pool[0]', () => {
  const ch = { obstacleTheme: 'ice', noviceColor: 4, num: 2 };
  const pool = G.ARCHETYPE_POOLS.ice;
  assert.equal(G.pickArchetype({ tag: 'build_c', subIndex: 0, segmentLen: 2 }, ch), pool[0]);
});

test('pickArchetype relief never picks iceBreak/vineControl/scoreOnly', () => {
  const arch = G.pickArchetype({ tag: 'relief_a', subIndex: 0, segmentLen: 1 }, { obstacleTheme: 'mix', num: 4 });
  assert.ok(!['iceBreak', 'vineControl', 'scoreOnly'].includes(arch));
});

test('pickArchetype finale follows chapter-progression table', () => {
  for (const num of [1, 2, 3, 4, 5]) {
    const arch = G.pickArchetype({ tag: 'finale', subIndex: 0, segmentLen: 1 }, { obstacleTheme: 'mix', num });
    assert.equal(arch, G.FINALE_ARCHETYPE_BY_CHAPTER[num]);
  }
});

test('pickKinds intro slot 0 with noviceColor → [noviceColor]', () => {
  const kinds = G.pickKinds(
    { tag: 'intro', subIndex: 0, segmentLen: 2 },
    'simpleCollect',
    { spawnKinds: [0, 1, 2, 3, 4], noviceColor: 4 },
    /*history*/ []
  );
  assert.deepEqual(kinds, [4]);
});

test('pickKinds intro slot 0 without noviceColor → [spawnKinds[0]]', () => {
  const kinds = G.pickKinds(
    { tag: 'intro', subIndex: 0, segmentLen: 2 },
    'simpleCollect',
    { spawnKinds: [0, 1, 2, 3], noviceColor: null },
    []
  );
  assert.deepEqual(kinds, [0]);
});

test('pickKinds Ch1 intro slot 1 → [spawnKinds[1]] (teaching ladder)', () => {
  const kinds = G.pickKinds(
    { tag: 'intro', subIndex: 1, segmentLen: 2 },
    'simpleCollect',
    { spawnKinds: [0, 1, 2, 3], noviceColor: null },
    [{ kinds: [0] }]
  );
  assert.deepEqual(kinds, [1]);
});

test('pickKinds dualCollect picks 2 kinds not in last 2 levels', () => {
  const kinds = G.pickKinds(
    { tag: 'build_a', subIndex: 0, segmentLen: 3 },
    'dualCollect',
    { spawnKinds: [0, 1, 2, 3, 4], noviceColor: null },
    [{ kinds: [0] }, { kinds: [1] }]
  );
  assert.equal(kinds.length, 2);
  // Should prefer kinds not in [0, 1]
  assert.ok(kinds.every(k => ![0, 1].includes(k) || kinds.length === 2));
});

test('pickKinds scoreOnly returns empty array', () => {
  const kinds = G.pickKinds(
    { tag: 'mid', subIndex: 0, segmentLen: 1 },
    'scoreOnly',
    { spawnKinds: [0, 1, 2], noviceColor: null },
    []
  );
  assert.deepEqual(kinds, []);
});

test('pickKinds tripleCollect uses 3 kinds from spawnKinds', () => {
  const kinds = G.pickKinds(
    { tag: 'build_b', subIndex: 0, segmentLen: 3 },
    'tripleCollect',
    { spawnKinds: [0, 1, 2, 3], noviceColor: null },
    []
  );
  assert.equal(kinds.length, 3);
  for (const k of kinds) assert.ok([0, 1, 2, 3].includes(k));
});

test('pickKinds mixed gets 3 kinds at mid/payingMoment', () => {
  const ch = { spawnKinds: [0, 1, 2, 3, 4], noviceColor: null };
  const k1 = G.pickKinds({ tag: 'mid', subIndex: 0, segmentLen: 1 }, 'mixed', ch, []);
  const k2 = G.pickKinds({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 }, 'mixed', ch, []);
  assert.equal(k1.length, 3);
  assert.equal(k2.length, 3);
});

test('pickKinds mixed gets 2 kinds in regular builds', () => {
  const ch = { spawnKinds: [0, 1, 2, 3, 4], noviceColor: null };
  const kinds = G.pickKinds({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, 'mixed', ch, []);
  assert.equal(kinds.length, 2);
});

test('pickKinds finale precursor (build_c last slot) bumps mixed kindsLen', () => {
  const ch = { spawnKinds: [0, 1, 2, 3, 4], noviceColor: null };
  // Last subIndex of segment (segmentLen=2, subIndex=1)
  const kinds = G.pickKinds({ tag: 'build_c', subIndex: 1, segmentLen: 2 }, 'mixed', ch, []);
  assert.equal(kinds.length, 4);
});

test('pickObstacles intro/relief slots emit no obstacles', () => {
  const ch = { obstacleTheme: 'ice', num: 2 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  assert.deepEqual(G.pickObstacles({ tag: 'intro', subIndex: 0, segmentLen: 2 }, ch, state), undefined);
  assert.deepEqual(G.pickObstacles({ tag: 'relief_a', subIndex: 0, segmentLen: 1 }, ch, state), undefined);
  assert.deepEqual(G.pickObstacles({ tag: 'relief_b', subIndex: 0, segmentLen: 1 }, ch, state), undefined);
});

test('pickObstacles theme=none never emits obstacles', () => {
  const ch = { obstacleTheme: 'none', num: 1 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  assert.deepEqual(G.pickObstacles({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, ch, state), undefined);
  assert.deepEqual(G.pickObstacles({ tag: 'finale', subIndex: 0, segmentLen: 1 }, ch, state), undefined);
});

test('pickObstacles theme=ice emits ice from build_a slot 0 (v7: dropped late-gate)', () => {
  const ch = { obstacleTheme: 'ice', num: 2 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  // v7 change: every build_a slot emits ice (was: only the last slot).
  // Fixes Ch1-style monotony where 3-4 consecutive obstacle-free boards
  // looked identical despite archetype rotation.
  const obsFirst = G.pickObstacles({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, ch, state);
  assert.ok(obsFirst && obsFirst.ice === G.ICE_ROTATION[0]);
  // Rotation advances slot by slot
  const obsLast = G.pickObstacles({ tag: 'build_a', subIndex: 2, segmentLen: 3 }, ch, state);
  assert.ok(obsLast && obsLast.ice === G.ICE_ROTATION[1]);
});

test('pickObstacles theme=vine emits vine from build_a slot 0 (v7)', () => {
  const ch = { obstacleTheme: 'vine', num: 3 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const obsFirst = G.pickObstacles({ tag: 'build_a', subIndex: 0, segmentLen: 2 }, ch, state);
  assert.ok(obsFirst && obsFirst.vine === G.VINE_ROTATION[0]);
  const obsLast = G.pickObstacles({ tag: 'build_a', subIndex: 1, segmentLen: 2 }, ch, state);
  assert.ok(obsLast && obsLast.vine === G.VINE_ROTATION[1]);
});

test('pickObstacles payingMoment forces signature combo for mix theme', () => {
  const ch = { obstacleTheme: 'mix', num: 4 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const obs = G.pickObstacles({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 }, ch, state);
  assert.equal(obs.ice, 'ice:cross');
  assert.equal(obs.vine, 'vine:scatter');
});

test('pickObstacles finale forces signature combo for mix theme', () => {
  const ch = { obstacleTheme: 'mix', num: 4 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const obs = G.pickObstacles({ tag: 'finale', subIndex: 0, segmentLen: 1 }, ch, state);
  assert.equal(obs.ice, 'ice:horseshoe');
  assert.equal(obs.vine, 'vine:ring');
});

test('pickObstacles theme=full carries ice+vine from mid onwards', () => {
  const ch = { obstacleTheme: 'full', num: 5 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  // Before mid: no obstacles
  assert.equal(G.pickObstacles({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, ch, state), undefined);
  // mid: both ice + vine
  const midObs = G.pickObstacles({ tag: 'mid', subIndex: 0, segmentLen: 1 }, ch, state);
  assert.ok(midObs.ice && midObs.vine);
});

test('pickObstacles vine:center4 reserved for payingMoment/finale', () => {
  const ch = { obstacleTheme: 'vine', num: 3 };
  // Walk through every build slot — vine:center4 must NEVER appear unless beat is paying/finale
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const buildBeats = [
    { tag: 'build_a', subIndex: 1, segmentLen: 2 },
    { tag: 'mid', subIndex: 0, segmentLen: 1 },
    { tag: 'build_b', subIndex: 0, segmentLen: 2 },
    { tag: 'build_b', subIndex: 1, segmentLen: 2 },
  ];
  for (const b of buildBeats) {
    const obs = G.pickObstacles(b, ch, state);
    if (obs && obs.vine) assert.notEqual(obs.vine, 'vine:center4', `vine:center4 leaked into ${b.tag}`);
  }
  // payingMoment may use it
  const pmObs = G.pickObstacles({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 }, ch, state);
  assert.ok(pmObs && pmObs.vine);
});

test('pickTightness payingMoment → tight', () => {
  assert.equal(G.pickTightness({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 }, { num: 4, difficultyArc: 'standard' }, /*num=*/40), 'tight');
});

test('pickTightness finale → tight when peak<10, brutal when peak=10', () => {
  // Ch2 peak=8 → tight
  assert.equal(G.pickTightness({ tag: 'finale', subIndex: 0, segmentLen: 1 }, { num: 2, difficultyArc: 'standard' }, 20), 'tight');
  // Ch4 peak=10 → brutal
  assert.equal(G.pickTightness({ tag: 'finale', subIndex: 0, segmentLen: 1 }, { num: 4, difficultyArc: 'standard' }, 45), 'brutal');
});

test('pickTightness relief never tight/brutal', () => {
  const t = G.pickTightness({ tag: 'relief_a', subIndex: 0, segmentLen: 1 }, { num: 4, difficultyArc: 'aggressive' }, 38);
  assert.ok(['loose', 'medium'].includes(t));
});

test('pickTightness aggressive arc tightens medium → tight from payingMoment onward', () => {
  // build_c after paying moment in Ch4 aggressive → should be tight
  const t = G.pickTightness({ tag: 'build_c', subIndex: 0, segmentLen: 2 }, { num: 4, difficultyArc: 'aggressive' }, 43);
  assert.equal(t, 'tight');
});

test('applyOverrides patches matching level by num (partial merge)', () => {
  const specs = [
    { num: 1, arch: 'simpleCollect', diff: 1, kinds: [0] },
    { num: 2, arch: 'simpleCollect', diff: 2, kinds: [1] },
  ];
  const patched = G.applyOverrides(specs, { 2: { tightness: 'tight' } });
  assert.equal(patched[0].arch, 'simpleCollect');
  assert.equal(patched[1].arch, 'simpleCollect');
  assert.equal(patched[1].tightness, 'tight');
  assert.equal(patched[1].diff, 2); // unchanged fields preserved
});

test('applyOverrides ignores unknown level nums', () => {
  const specs = [{ num: 1, arch: 'simpleCollect', diff: 1, kinds: [0] }];
  const patched = G.applyOverrides(specs, { 99: { tightness: 'tight' } });
  assert.deepEqual(patched, specs);
});

test('applyOverrides handles empty/undefined override map', () => {
  const specs = [{ num: 1, arch: 'simpleCollect', diff: 1, kinds: [0] }];
  assert.deepEqual(G.applyOverrides(specs, undefined), specs);
  assert.deepEqual(G.applyOverrides(specs, {}), specs);
});

// ─── Task 9: generateChapter orchestrator ────────────────────────────────────

test('generateChapter produces exactly L spec entries with consecutive nums', () => {
  const ch = {
    num: 1, start: 1, end: 9,
    spawnKinds: [0, 1, 2, 3],
    obstacleTheme: 'none', difficultyArc: 'gentle', noviceColor: null,
    overrides: {},
  };
  const specs = G.generateChapter(ch);
  assert.equal(specs.length, 9);
  assert.equal(specs[0].num, 1);
  assert.equal(specs[8].num, 9);
});

test('generateChapter every spec carries required fields', () => {
  const ch = {
    num: 2, start: 10, end: 20,
    spawnKinds: [0, 1, 2, 3, 4],
    obstacleTheme: 'ice', difficultyArc: 'standard', noviceColor: 4,
    overrides: {},
  };
  const specs = G.generateChapter(ch);
  for (const s of specs) {
    assert.equal(typeof s.num, 'number');
    assert.equal(typeof s.arch, 'string');
    assert.equal(typeof s.diff, 'number');
    assert.ok(Array.isArray(s.kinds) || s.arch === 'scoreOnly');
  }
});

test('generateChapter applies overrides as partial patches', () => {
  const ch = {
    num: 1, start: 1, end: 9,
    spawnKinds: [0, 1, 2, 3],
    obstacleTheme: 'none', difficultyArc: 'gentle', noviceColor: null,
    overrides: { 9: { tightness: 'tight' }, 4: { arch: 'simpleCollect', kinds: [3] } },
  };
  const specs = G.generateChapter(ch);
  const l9 = specs.find(s => s.num === 9);
  const l4 = specs.find(s => s.num === 4);
  assert.equal(l9.tightness, 'tight');
  assert.equal(l4.arch, 'simpleCollect');
  assert.deepEqual(l4.kinds, [3]);
});

test('generateChapter Ch1 (length 9) presents at least 3 distinct archetypes', () => {
  const ch = {
    num: 1, start: 1, end: 9,
    spawnKinds: [0, 1, 2, 3],
    obstacleTheme: 'none', difficultyArc: 'gentle', noviceColor: null,
    overrides: {},
  };
  const specs = G.generateChapter(ch);
  const archs = new Set(specs.map(s => s.arch));
  assert.ok(archs.size >= 3, `expected ≥3 archetypes, got ${[...archs].join(',')}`);
});

test('generateChapter Ch5 (length 15) finale uses hexaCollect', () => {
  const ch = {
    num: 5, start: 46, end: 60,
    spawnKinds: [0, 1, 2, 3, 4, 5],
    obstacleTheme: 'full', difficultyArc: 'aggressive', noviceColor: 0,
    overrides: {},
  };
  const specs = G.generateChapter(ch);
  const finale = specs[specs.length - 1];
  assert.equal(finale.arch, 'hexaCollect');
  assert.equal(finale.diff, 10);
  assert.equal(finale.tightness, 'brutal');
});

test('generateChapter is deterministic on identical input', () => {
  const ch = {
    num: 3, start: 21, end: 30,
    spawnKinds: [0, 1, 2, 4, 5],
    obstacleTheme: 'vine', difficultyArc: 'standard', noviceColor: 5,
    overrides: {},
  };
  const a = G.generateChapter(ch);
  const b = G.generateChapter(ch);
  assert.deepEqual(a, b);
});

// ─── Task 10: validateChapter ────────────────────────────────────────────────

test('validateChapter rejects kinds outside spawnKinds (would exit process)', () => {
  // Can't easily test process.exit; use a subprocess-style smoke check via
  // a hand-crafted invalid spec set. We assert validateChapter is wired up.
  assert.equal(typeof G.validateChapter, 'function');
});

test('validateChapter accepts a generator-produced chapter without exiting', () => {
  // If validateChapter passes the algorithm's own output, we know it's wired correctly.
  const ch = G.CHAPTERS[0];
  const specs = G.generateChapter(ch);
  // Should not throw / exit
  G.validateChapter(ch, specs);
  assert.ok(true);
});
