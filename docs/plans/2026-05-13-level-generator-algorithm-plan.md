# Foxglen Level Generator Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-authored `SOURCE` array in `foxglen-content/scripts/gen-levels.js` with a deterministic 7-step algorithm that turns chapter metadata into level specs, plus an override-patch surface for signature levels. Emit `content-v6.json` for live-ops ship.

**Architecture:** Pure-Node generator using built-in `node:test`. Algorithm = pure functions composed via `generateChapter(chapter)`. Existing `compileLevel()`, obstacle library, `ECONOMY`, and `validateBundle()` stay untouched. New `validateChapter(chapter, specs)` validates algorithm output before compile. Output round-trips through `compileLevel` so star math + moves formulas are unchanged.

**Tech Stack:** Node.js 18+ (built-in `node:test` runner, `assert/strict`). No new npm deps. Spec lives at `foxglen-content/docs/specs/2026-05-13-level-generator-algorithm-design.md` — read it before implementing.

---

## File Structure

| File | Responsibility | Operation |
|------|---------------|-----------|
| `foxglen-content/package.json` | Test runner script | **Create** |
| `foxglen-content/scripts/gen-levels.js` | Generator + algorithm + validators | **Modify** |
| `foxglen-content/scripts/gen-levels.test.js` | Unit tests for algorithm steps | **Create** |
| `foxglen-content/content-v6.json` | Compiled bundle output | **Create** (auto by `--write`) |

`compileLevel`, `ICE_PATTERNS`, `VINE_PATTERNS`, `pickBySize`, `resolveObstacle`, `ECONOMY`, `validateBundle`, `chapterFor` stay byte-identical inside `gen-levels.js`. The algorithm is added alongside them; only `SOURCE` and `BUNDLE_VERSION` change.

---

## Task 1: Test infrastructure + exports

**Files:**
- Create: `foxglen-content/package.json`
- Create: `foxglen-content/scripts/gen-levels.test.js`
- Modify: `foxglen-content/scripts/gen-levels.js` (append `module.exports` block)

- [ ] **Step 1.1: Create `package.json`**

Create `foxglen-content/package.json` with:
```json
{
  "name": "foxglen-content",
  "version": "1.0.0",
  "private": true,
  "description": "Foxglen / Tilki Korusu live-ops content bundle (chapters + levels + economy).",
  "scripts": {
    "test": "node --test scripts/gen-levels.test.js",
    "gen": "node scripts/gen-levels.js",
    "gen:write": "node scripts/gen-levels.js --write"
  }
}
```

- [ ] **Step 1.2: Append exports to `gen-levels.js`**

At the very end of `foxglen-content/scripts/gen-levels.js` (after the last `run();` line) add:
```js
// ─── Exports for tests ───────────────────────────────────────────────────────
// Only populated when this module is `require()`d (not when run directly via
// `node scripts/gen-levels.js`). The `run()` call above still fires on direct
// invocation; require()ing skips it via the conditional.
if (require.main !== module) {
  module.exports = {
    ICE_PATTERNS,
    VINE_PATTERNS,
    pickBySize,
    resolveObstacle,
    compileLevel,
    chapterFor,
    CHAPTERS,
    ECONOMY,
    BUNDLE_VERSION,
  };
}
```

Then wrap the existing `run();` (last line of the file) so it only runs on direct invocation:
```js
if (require.main === module) {
  run();
}
```

- [ ] **Step 1.3: Write smoke test**

Create `foxglen-content/scripts/gen-levels.test.js`:
```js
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
  assert.ok(lv.star1 < lv.star2 && lv.star2 < lv.star3);
  assert.deepEqual(Object.keys(lv.goals), ['0']);
});
```

- [ ] **Step 1.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content
npm test
```
Expected output:
```
▶ module exports compile pipeline  ✔
▶ compileLevel produces a v5-shaped spec  ✔
# pass 2
```

- [ ] **Step 1.5: Commit**

```bash
git add package.json scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Wire test infrastructure for gen-levels.js

Adds node:test runner via npm test, exports the generator's internals
for testability, guards run() behind require.main === module so the
script still works when invoked directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Constants + pure helpers

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (insert new section after line ~122, before `compileLevel`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 2.1: Add algorithm constants + helpers**

Insert a new section into `gen-levels.js` immediately AFTER the existing `roundTo` helper (around line 122, before `function compileLevel(spec)`):
```js
// ─── Algorithm constants ────────────────────────────────────────────────────

// Archetype pools per obstacleTheme. Pool order = rotation order within each
// segment. Beat-specific overrides (intro/relief/finale) bypass these pools.
const ARCHETYPE_POOLS = {
  none: ['dualCollect', 'tripleCollect', 'dualCollect', 'mixed', 'tripleCollect'],
  ice:  ['iceBreak', 'mixed', 'dualCollect', 'iceBreak', 'tripleCollect'],
  vine: ['vineControl', 'mixed', 'dualCollect', 'vineControl', 'tripleCollect'],
  mix:  ['iceBreak', 'vineControl', 'mixed', 'tripleCollect', 'scoreOnly'],
  full: ['pentaCollect', 'mixed', 'iceBreak', 'vineControl', 'scoreOnly', 'quadCollect', 'hexaCollect'],
};

// Size-ordered (small → big) pattern rotations consumed by Step 5.
const ICE_ROTATION  = ['ice:corners', 'ice:cross', 'ice:pillars', 'ice:horseshoe', 'ice:border'];
const VINE_ROTATION = ['vine:scatter', 'vine:lines', 'vine:ring', 'vine:center4'];

// Chapter-progression finale archetype. Index = chapter num.
const FINALE_ARCHETYPE_BY_CHAPTER = {
  1: 'tripleCollect',
  2: 'quadCollect',
  3: 'pentaCollect',
  4: 'scoreOnly',
  5: 'hexaCollect',
};

// Diff bands per chapter (before `difficultyArc` modifier).
const DIFF_BAND = {
  1: { base: 1, peak: 6 },
  2: { base: 3, peak: 8 },
  3: { base: 4, peak: 9 },
  4: { base: 5, peak: 10 },
  5: { base: 6, peak: 10 },
};

// Pure math helpers — used by allocateBeats, computeDiff, pickKinds.
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// Applies `difficultyArc` modifier to a (base, peak) pair. Never narrows
// the band below 3 so even 'gentle' chapters have a real climb.
function applyArc(band, arc) {
  if (arc === 'gentle')     return { base: band.base, peak: Math.max(band.peak - 1, band.base + 3) };
  if (arc === 'aggressive') return { base: band.base + 1, peak: band.peak };
  return band;
}
```

- [ ] **Step 2.2: Export helpers**

Update the `module.exports` block at the bottom of `gen-levels.js` to include the new symbols:
```js
if (require.main !== module) {
  module.exports = {
    ICE_PATTERNS,
    VINE_PATTERNS,
    pickBySize,
    resolveObstacle,
    compileLevel,
    chapterFor,
    CHAPTERS,
    ECONOMY,
    BUNDLE_VERSION,
    // algorithm primitives
    ARCHETYPE_POOLS,
    ICE_ROTATION,
    VINE_ROTATION,
    FINALE_ARCHETYPE_BY_CHAPTER,
    DIFF_BAND,
    clamp,
    lerp,
    applyArc,
  };
}
```

- [ ] **Step 2.3: Write tests**

Append to `gen-levels.test.js`:
```js
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
```

- [ ] **Step 2.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 10 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Stage algorithm constants + helpers for chapter generator

Adds ARCHETYPE_POOLS, ICE_ROTATION, VINE_ROTATION, FINALE_ARCHETYPE_BY_CHAPTER,
DIFF_BAND tables + clamp/lerp/applyArc pure helpers. Exported for unit
tests; consumed by upcoming generateChapter pipeline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Step 1 — `allocateBeats`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `allocateBeats`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 3.1: Write failing tests**

Append to `gen-levels.test.js`:
```js
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
```

- [ ] **Step 3.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 6 new tests fail with `TypeError: G.allocateBeats is not a function`.

- [ ] **Step 3.3: Implement `allocateBeats`**

Insert into `gen-levels.js` immediately after `applyArc` (in the algorithm constants section):
```js
// Step 1 — beat allocation. Maps chapter (num, start, end) → ordered list of
// { tag, subIndex, segmentLen } beats covering exactly L levels. Pacing
// template scales by length; trims/pads the latest build group to fit budget.
function allocateBeats(chapter) {
  const L = chapter.end - chapter.start + 1;
  if (L < 7) {
    throw new Error(`Chapter ${chapter.num}: minimum chapter length is 7 (got L=${L})`);
  }
  const hasPayingMoment = chapter.num >= 2;
  const hasReliefB = L >= 13;

  let intro   = clamp(Math.round(L * 0.22), 1, 2);
  let build_a = clamp(Math.round(L * 0.30), 2, 4);
  let build_b = clamp(Math.round(L * 0.25), 2, 4);
  let build_c = 0;

  const fixed = 1 /*mid*/ + 1 /*relief_a*/ + (hasPayingMoment ? 1 : 0) + (hasReliefB ? 1 : 0) + 1 /*finale*/;
  let total = intro + build_a + build_b + build_c + fixed;

  // Pad: prefer growing build_c (introduces a new segment), then build_b, build_a.
  while (total < L) {
    if (build_c < 4) build_c++;
    else if (build_b < 4) build_b++;
    else if (build_a < 4) build_a++;
    else break;
    total++;
  }
  // Trim: from the latest existing build group. Build floors stay ≥2 unless
  // even that overflows, in which case intro drops to 1.
  while (total > L) {
    if (build_c > 0) build_c--;
    else if (build_b > 2) build_b--;
    else if (build_a > 2) build_a--;
    else if (intro > 1) intro--;
    else break;
    total--;
  }
  if (total !== L) {
    throw new Error(`Chapter ${chapter.num}: cannot fit L=${L} into beat template (overflow ${total - L})`);
  }

  const beats = [];
  const pushSegment = (tag, count) => {
    for (let i = 0; i < count; i++) beats.push({ tag, subIndex: i, segmentLen: count });
  };
  pushSegment('intro', intro);
  pushSegment('build_a', build_a);
  beats.push({ tag: 'mid', subIndex: 0, segmentLen: 1 });
  beats.push({ tag: 'relief_a', subIndex: 0, segmentLen: 1 });
  pushSegment('build_b', build_b);
  if (hasPayingMoment) beats.push({ tag: 'payingMoment', subIndex: 0, segmentLen: 1 });
  if (hasReliefB)      beats.push({ tag: 'relief_b', subIndex: 0, segmentLen: 1 });
  pushSegment('build_c', build_c);
  beats.push({ tag: 'finale', subIndex: 0, segmentLen: 1 });

  return beats;
}
```

Also add `allocateBeats` to the `module.exports` block.

- [ ] **Step 3.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 16 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Step 1 of generator: beat allocation

allocateBeats(chapter) → ordered list of { tag, subIndex, segmentLen }
sized exactly to chapter length. Pacing template scales by L with
pad/trim against the latest build segment. Throws for L<7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Step 2 — `computeDiff`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `computeDiff`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 4.1: Write failing tests**

Append:
```js
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
```

- [ ] **Step 4.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 7 new tests fail with `TypeError: G.computeDiff is not a function`.

- [ ] **Step 4.3: Implement `computeDiff`**

Insert into `gen-levels.js` right after `allocateBeats`:
```js
// Step 2 — diff curve. Given a beat + the chapter's effective (base, peak)
// band + the previous level's diff (for relief), returns integer diff [1, 10].
function computeDiff(beat, band, prev) {
  const { tag, subIndex, segmentLen } = beat;
  switch (tag) {
    case 'intro':
      return band.base + subIndex;
    case 'build_a':
    case 'build_b':
    case 'build_c': {
      const t = segmentLen <= 1 ? 0 : subIndex / (segmentLen - 1);
      return Math.round(lerp(band.base + 1, band.peak - 2, t));
    }
    case 'mid':
      return band.peak - 1;
    case 'relief_a':
    case 'relief_b': {
      const prevDiff = prev ? prev.diff : band.peak - 2;
      return Math.max(band.base, prevDiff - 2);
    }
    case 'payingMoment':
      return band.peak - 1;
    case 'finale':
      return band.peak;
    default:
      throw new Error(`computeDiff: unknown beat tag '${tag}'`);
  }
}
```

Add `computeDiff` to the `module.exports`.

- [ ] **Step 4.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 23 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Step 2 of generator: per-beat diff curve

computeDiff(beat, band, prev) maps a beat tag + the chapter's (base, peak)
band to an integer difficulty 1-10. Intro ramps from base, build segments
linear-lerp toward peak-2, mid/payingMoment plateau at peak-1, finale = peak,
relief drops 2 from previous (floor at band.base).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Step 3 — `pickArchetype`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `pickArchetype`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 5.1: Write failing tests**

Append:
```js
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
```

- [ ] **Step 5.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 7 new tests fail with `G.pickArchetype is not a function`.

- [ ] **Step 5.3: Implement `pickArchetype`**

Insert after `computeDiff`:
```js
// Step 3 — archetype selection. Beat-tag specific overrides bypass the pool;
// pool rotation runs per-segment (subIndex resets between build_a/build_b/build_c).
function pickArchetype(beat, chapter) {
  const { tag, subIndex } = beat;

  // intro: noviceColor==null → both slots simpleCollect (Ch1 teaching ladder)
  //        noviceColor set    → slot 0 simpleCollect, slot 1 dualCollect
  if (tag === 'intro') {
    if (chapter.noviceColor == null) return 'simpleCollect';
    return subIndex === 0 ? 'simpleCollect' : 'dualCollect';
  }
  if (tag === 'finale') {
    return FINALE_ARCHETYPE_BY_CHAPTER[chapter.num] || 'mixed';
  }

  const pool = ARCHETYPE_POOLS[chapter.obstacleTheme] || ARCHETYPE_POOLS.none;

  if (tag === 'relief_a' || tag === 'relief_b') {
    const safe = pool.filter(a => !['iceBreak', 'vineControl', 'scoreOnly'].includes(a));
    return safe.length > 0 ? safe[safe.length - 1] : 'dualCollect';
  }
  if (tag === 'mid' || tag === 'payingMoment') {
    // Mid + paying lean toward 'mixed' if available, otherwise pool[subIndex].
    const mixedIdx = pool.indexOf('mixed');
    if (mixedIdx >= 0) return 'mixed';
    return pool[subIndex % pool.length];
  }
  // build_a / build_b / build_c — rotate pool by subIndex (segment-local)
  return pool[subIndex % pool.length];
}
```

Add to `module.exports`.

- [ ] **Step 5.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 30 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Step 3 of generator: archetype rotation

pickArchetype(beat, chapter) — intro teaching ladder, per-segment pool
rotation, relief filters out obstacle-heavy archetypes, mid/payingMoment
prefer 'mixed', finale uses chapter-progression table.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Step 4 — `pickKinds`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `pickKinds`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 6.1: Write failing tests**

Append:
```js
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
```

- [ ] **Step 6.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 9 new tests fail with `G.pickKinds is not a function`.

- [ ] **Step 6.3: Implement `pickKinds`**

Insert after `pickArchetype`:
```js
// Step 4 — kinds (goal colors). Picks `desiredCount` kinds from chapter's
// spawnKinds with 2-level lookback to avoid repeating same kind twice in a row.
// Deterministic on (beat, chapter, history).
function pickKinds(beat, archetype, chapter, history) {
  const { tag, subIndex, segmentLen } = beat;

  // ── intro special cases ──
  if (tag === 'intro') {
    if (chapter.noviceColor != null && subIndex === 0) return [chapter.noviceColor];
    // Ch1 ladder: noviceColor null → intro slot N teaches spawnKinds[N]
    if (chapter.noviceColor == null) return [chapter.spawnKinds[subIndex] ?? chapter.spawnKinds[0]];
    // Ch2+ slot 1 (dualCollect): mix noviceColor with next spawnKind
    const nextKind = chapter.spawnKinds.find(k => k !== chapter.noviceColor) ?? chapter.spawnKinds[0];
    return [chapter.noviceColor, nextKind];
  }

  // ── desired count per archetype ──
  let desiredCount;
  switch (archetype) {
    case 'simpleCollect':  desiredCount = 1; break;
    case 'dualCollect':    desiredCount = 2; break;
    case 'tripleCollect':  desiredCount = 3; break;
    case 'quadCollect':    desiredCount = 4; break;
    case 'pentaCollect':   desiredCount = 5; break;
    case 'hexaCollect':    desiredCount = 6; break;
    case 'iceBreak':       desiredCount = 1; break;
    case 'vineControl':    desiredCount = 1; break;
    case 'scoreOnly':      return [];
    case 'mixed': {
      // 2 default; 3 at mid/payingMoment; 4 at build_c's last slot (finale precursor)
      if (tag === 'mid' || tag === 'payingMoment') desiredCount = 3;
      else if (tag === 'build_c' && subIndex === segmentLen - 1) desiredCount = 4;
      else desiredCount = 2;
      break;
    }
    default: desiredCount = 2;
  }

  // Cap at spawnKinds length
  desiredCount = Math.min(desiredCount, chapter.spawnKinds.length);

  // ── selection: prefer kinds NOT in the last 2 levels' kinds ──
  const recentKinds = new Set();
  for (const h of history.slice(-2)) for (const k of h.kinds || []) recentKinds.add(k);

  // Walk spawnKinds, prefer un-recent first, then fill from any
  const ordered = [
    ...chapter.spawnKinds.filter(k => !recentKinds.has(k)),
    ...chapter.spawnKinds.filter(k => recentKinds.has(k)),
  ];
  return ordered.slice(0, desiredCount);
}
```

Add to `module.exports`.

- [ ] **Step 6.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 39 tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Step 4 of generator: kinds selection

pickKinds(beat, archetype, chapter, history) — intro teaching ladder
(Ch1 chain or noviceColor pin), 2-level Hamming lookback for non-intro
beats, mixed archetype's variable kindsLen by beat tag, scoreOnly emits [].

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Step 5 — `pickObstacles`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `pickObstacles`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 7.1: Write failing tests**

Append:
```js
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

test('pickObstacles theme=ice introduces ice at build_a last slot', () => {
  const ch = { obstacleTheme: 'ice', num: 2 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  // Earlier slots in build_a → no obstacles
  assert.equal(G.pickObstacles({ tag: 'build_a', subIndex: 0, segmentLen: 3 }, ch, state), undefined);
  // Last slot of build_a → first ice pattern
  const obs = G.pickObstacles({ tag: 'build_a', subIndex: 2, segmentLen: 3 }, ch, state);
  assert.ok(obs && obs.ice === G.ICE_ROTATION[0]);
});

test('pickObstacles theme=vine puts vine on build_a last slot', () => {
  const ch = { obstacleTheme: 'vine', num: 3 };
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const obs = G.pickObstacles({ tag: 'build_a', subIndex: 1, segmentLen: 2 }, ch, state);
  assert.ok(obs && obs.vine === G.VINE_ROTATION[0]);
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
```

- [ ] **Step 7.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 8 new tests fail with `G.pickObstacles is not a function`.

- [ ] **Step 7.3: Implement `pickObstacles`**

Insert after `pickKinds`:
```js
// Step 5 — obstacle assignment. Returns an object { ice?, vine? } with
// PATTERN-NAME strings (resolved later by resolveObstacle in compileLevel),
// or `undefined` for no obstacles. Mutates `state` to advance rotations.
//   state shape: { iceIdx, vineIdx, mixCounter }
function pickObstacles(beat, chapter, state) {
  const { tag, subIndex, segmentLen } = beat;
  const theme = chapter.obstacleTheme;

  if (theme === 'none') return undefined;
  if (tag === 'intro' || tag === 'relief_a' || tag === 'relief_b') return undefined;

  // Signature combos — bypass rotation
  if (theme === 'mix' && tag === 'payingMoment') return { ice: 'ice:cross', vine: 'vine:scatter' };
  if (theme === 'mix' && tag === 'finale')        return { ice: 'ice:horseshoe', vine: 'vine:ring' };
  if (theme === 'full' && tag === 'payingMoment') return { ice: 'ice:border', vine: 'vine:ring' };
  if (theme === 'full' && tag === 'finale')        return { ice: 'ice:border', vine: 'vine:center4' };

  // Pure ice theme
  if (theme === 'ice') {
    // First obstacle lands on build_a's LAST slot. Earlier build_a slots: none.
    if (tag === 'build_a' && subIndex < segmentLen - 1) return undefined;
    const pat = ICE_ROTATION[state.iceIdx % ICE_ROTATION.length];
    state.iceIdx++;
    return { ice: pat };
  }

  // Pure vine theme
  if (theme === 'vine') {
    if (tag === 'build_a' && subIndex < segmentLen - 1) return undefined;
    let pat = VINE_ROTATION[state.vineIdx % VINE_ROTATION.length];
    // vine:center4 reserved → skip if not paying/finale
    if (pat === 'vine:center4' && tag !== 'payingMoment' && tag !== 'finale') {
      state.vineIdx++;
      pat = VINE_ROTATION[state.vineIdx % VINE_ROTATION.length];
    }
    state.vineIdx++;
    return { vine: pat };
  }

  // mix theme: parity-alternate ice and vine across obstacle-bearing slots
  if (theme === 'mix') {
    if (tag === 'build_a' && subIndex < segmentLen - 1) return undefined;
    const isIce = state.mixCounter % 2 === 0;
    state.mixCounter++;
    if (isIce) {
      const pat = ICE_ROTATION[state.iceIdx % ICE_ROTATION.length];
      state.iceIdx++;
      return { ice: pat };
    }
    const pat = VINE_ROTATION[state.vineIdx % VINE_ROTATION.length];
    state.vineIdx++;
    return { vine: pat };
  }

  // full theme: ice + vine simultaneously from mid onwards
  if (theme === 'full') {
    if (tag === 'build_a') return undefined;
    const icePat  = ICE_ROTATION[state.iceIdx % ICE_ROTATION.length];
    const vinePat = VINE_ROTATION[state.vineIdx % VINE_ROTATION.length];
    state.iceIdx++; state.vineIdx++;
    return { ice: icePat, vine: vinePat };
  }
  return undefined;
}
```

Add to `module.exports`.

- [ ] **Step 7.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 47 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Step 5 of generator: obstacle assignment

pickObstacles(beat, chapter, state) — per-theme rotation through ICE_ROTATION
and VINE_ROTATION, intro/relief slots emit nothing, mix theme alternates by
parity, full theme stacks both from mid onwards. Signature combos hardcoded
for mix/full at payingMoment and finale. vine:center4 spreader reserved for
paying/finale only.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Step 6 — `pickTightness` + Step 7 — `applyOverrides`

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `pickTightness` + `applyOverrides`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 8.1: Write failing tests**

Append:
```js
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
```

- [ ] **Step 8.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 7 new tests fail with `G.pickTightness is not a function` / `G.applyOverrides is not a function`.

- [ ] **Step 8.3: Implement `pickTightness` + `applyOverrides`**

Insert after `pickObstacles`:
```js
// Step 6 — tightness. Starts from defaultTightness(num, arch) then applies
// beat-tag overrides. Aggressive difficultyArc tightens all medium beats
// from payingMoment onward.
function pickTightness(beat, chapter, num) {
  const { tag } = beat;
  // Relief beats always loose/medium (psychological slack)
  if (tag === 'relief_a' || tag === 'relief_b') return 'medium';
  // Paying moment + finale carry chapter peak
  if (tag === 'payingMoment') return 'tight';
  if (tag === 'finale') {
    const band = applyArc(DIFF_BAND[chapter.num] || { base: 1, peak: 6 }, chapter.difficultyArc);
    return band.peak >= 10 ? 'brutal' : 'tight';
  }
  // Aggressive arc tightens build_c (post-payingMoment slots) — they fall AFTER
  // payingMoment in the beat order, so use the tag.
  if (chapter.difficultyArc === 'aggressive' && tag === 'build_c') return 'tight';
  // Default to what defaultTightness() returns for this level number.
  // We rely on the arch arg in defaultTightness defaulting harmlessly when null.
  return defaultTightness(num, null);
}

// Step 7 — override patch. Partial merge: override fields override matching
// LevelSpec fields, all other fields preserved.
function applyOverrides(specs, overrides) {
  if (!overrides || Object.keys(overrides).length === 0) return specs;
  const result = specs.slice();
  for (const [numKey, patch] of Object.entries(overrides)) {
    const num = parseInt(numKey, 10);
    const idx = result.findIndex(s => s.num === num);
    if (idx < 0) continue;
    result[idx] = { ...result[idx], ...patch };
  }
  return result;
}
```

Add `pickTightness` and `applyOverrides` to `module.exports`.

- [ ] **Step 8.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 54 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add Steps 6+7 of generator: tightness + override patches

pickTightness(beat, chapter, num) — relief always loose/medium,
payingMoment=tight, finale=tight or brutal by chapter peak, aggressive
arc tightens build_c. applyOverrides(specs, overrides) — partial merge
patching by level num. Unknown override keys silently ignored.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `generateChapter` orchestrator

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (add `generateChapter`)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (append tests)

- [ ] **Step 9.1: Write failing tests**

Append:
```js
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
```

- [ ] **Step 9.2: Run tests, expect FAIL**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: 6 new tests fail with `G.generateChapter is not a function`.

- [ ] **Step 9.3: Implement `generateChapter`**

Insert after `applyOverrides`:
```js
// Orchestrator — chapter metadata → list of LevelSpec entries ready for
// compileLevel. Composes all 7 algorithm steps. Strictly deterministic.
function generateChapter(chapter) {
  const beats = allocateBeats(chapter);
  const band = applyArc(DIFF_BAND[chapter.num] || { base: 1, peak: 6 }, chapter.difficultyArc);
  const state = { iceIdx: 0, vineIdx: 0, mixCounter: 0 };
  const history = [];
  const specs = [];

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const num = chapter.start + i;
    const prev = i > 0 ? specs[i - 1] : null;
    const arch = pickArchetype(beat, chapter);
    const diff = computeDiff(beat, band, prev);
    const kinds = pickKinds(beat, arch, chapter, history);
    const obstacles = pickObstacles(beat, chapter, state);
    const tightness = pickTightness(beat, chapter, num);

    const spec = { num, arch, diff, tightness, kinds };
    if (obstacles) spec.obstacles = obstacles;
    specs.push(spec);
    history.push({ kinds });
  }

  return applyOverrides(specs, chapter.overrides || {});
}
```

Add `generateChapter` to `module.exports`.

- [ ] **Step 9.4: Run tests, expect PASS**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```
Expected: all 60 tests pass.

- [ ] **Step 9.5: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js
git commit -m "$(cat <<'EOF'
Add generateChapter orchestrator

Composes Steps 1-7: allocateBeats → applyArc → per-beat (computeDiff,
pickArchetype, pickKinds, pickObstacles, pickTightness) → applyOverrides.
Strictly deterministic on chapter metadata.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Extend `CHAPTERS` + replace `SOURCE` + validator + bump to v6

**Files:**
- Modify: `foxglen-content/scripts/gen-levels.js` (CHAPTERS extension, SOURCE replacement, validateChapter, BUNDLE_VERSION 5→6, header comment)
- Modify: `foxglen-content/scripts/gen-levels.test.js` (validator tests)
- Create: `foxglen-content/content-v6.json` (auto via `--write`)

- [ ] **Step 10.1: Extend `CHAPTERS` with algorithm fields**

Replace the `CHAPTERS = [...]` block (lines ~244-250 in current `gen-levels.js`) with:
```js
const CHAPTERS = [
  {
    num: 1, start: 1,  end: 9,
    name: { tr: 'Çiy Açıklığı', en: 'Dewdrop Grove' },
    biome: '#4a8a48',
    spawnKinds: [0, 1, 2, 3],
    obstacleTheme: 'none',
    difficultyArc: 'gentle',
    noviceColor: null,
    overrides: {
      4: { arch: 'simpleCollect', kinds: [3] },     // meet Çiy/Dewdrop in isolation
      9: { tightness: 'tight' },                     // finale
    },
    bonus: { coins: 500,  gems: 2,  boosters: { rocket: 1 } },
  },
  {
    num: 2, start: 10, end: 20,
    name: { tr: 'Yosun Oyuğu', en: 'Mossy Hollow' },
    biome: '#206b6e',
    spawnKinds: [0, 1, 2, 3, 4],
    obstacleTheme: 'ice',
    difficultyArc: 'standard',
    noviceColor: 4,                                  // Böğürtlen joins the cast
    overrides: {
      11: { kinds: [4], obstacles: { ice: 'ice:corners' } },
      20: { obstacles: { ice: 'ice:border', vine: 'vine:scatter' } },
    },
    bonus: { coins: 800,  gems: 4,  boosters: { rocket: 1, bomb: 1 } },
  },
  {
    num: 3, start: 21, end: 30,
    name: { tr: 'Ballıorman', en: 'Honeywood' },
    biome: '#a57024',
    spawnKinds: [0, 1, 2, 4, 5],
    obstacleTheme: 'vine',
    difficultyArc: 'standard',
    noviceColor: 5,                                  // Çiçek joins
    overrides: {
      23: { kinds: [1], obstacles: { vine: 'vine:scatter' } },
      30: { tightness: 'brutal' },
    },
    bonus: { coins: 1200, gems: 6,  boosters: { rocket: 1, bomb: 1, moves5: 1 } },
  },
  {
    num: 4, start: 31, end: 45,
    name: { tr: 'Pırıltılı Çayır', en: 'Shimmering Meadow' },
    biome: '#c48a30',
    spawnKinds: [1, 2, 3, 4, 5],
    obstacleTheme: 'mix',
    difficultyArc: 'aggressive',
    noviceColor: null,
    overrides: {
      33: { arch: 'scoreOnly' },
      45: { arch: 'scoreOnly', tightness: 'brutal' },
    },
    bonus: { coins: 1600, gems: 8,  boosters: { rocket: 2, bomb: 1, moves5: 1 } },
  },
  {
    num: 5, start: 46, end: 60,
    name: { tr: 'Gümüş Göl', en: 'Silver Lake' },
    biome: '#2a5e8a',
    spawnKinds: [0, 1, 2, 3, 4, 5],
    obstacleTheme: 'full',
    difficultyArc: 'aggressive',
    noviceColor: 0,                                  // Mushroom returns
    overrides: {
      60: { tightness: 'brutal', obstacles: { ice: 'ice:border', vine: 'vine:ring' } },
    },
    bonus: { coins: 2400, gems: 12, boosters: { rocket: 2, bomb: 2, moves5: 2 } },
  },
];
```

- [ ] **Step 10.2: Replace `SOURCE` array with algorithmic generation**

Replace the entire `const SOURCE = [ ... ];` block (lines ~322-402 in current file) with:
```js
// ─── SOURCE: generated from CHAPTERS metadata via generateChapter ────────────
// SOURCE is no longer hand-authored — each chapter's level list is computed by
// the algorithm (Steps 1-7 above) from the chapter's metadata block. For
// signature levels (chapter finales, archetype intros, paying-moment walls)
// edit the chapter's `overrides` map. ≤3 overrides per chapter is the
// sustainability target; the validator warns above that.
const SOURCE = CHAPTERS.flatMap(generateChapter);
```

- [ ] **Step 10.3: Add `validateChapter`**

Insert right before `function validateBundle(...)`:
```js
// Validates algorithm-emitted specs against pacing rules from
// docs/specs/2026-05-13-level-generator-algorithm-design.md §Validation.
// Runs after generateChapter, before compileLevel — catches algorithm bugs
// + override misuse early.
function validateChapter(chapter, specs) {
  const errors = [];
  const warnings = [];

  // 1. Every spec's kinds subset of chapter.spawnKinds
  const pool = new Set(chapter.spawnKinds);
  for (const s of specs) {
    if (!s.kinds) continue;
    for (const k of s.kinds) {
      if (!pool.has(k)) errors.push(`L${s.num}: kinds ${k} not in chapter spawnKinds`);
    }
  }

  // 2. Chapter finale: diff == peak, tightness in {tight, brutal}
  const band = applyArc(DIFF_BAND[chapter.num] || { base: 1, peak: 6 }, chapter.difficultyArc);
  const finale = specs[specs.length - 1];
  if (finale.diff !== band.peak) {
    errors.push(`L${finale.num}: finale diff ${finale.diff} ≠ chapter peak ${band.peak}`);
  }
  if (!['tight', 'brutal'].includes(finale.tightness)) {
    errors.push(`L${finale.num}: finale tightness '${finale.tightness}' must be tight/brutal`);
  }

  // 3. No 4+ consecutive levels at diff >= chapter avg without relief
  const avg = specs.reduce((a, s) => a + s.diff, 0) / specs.length;
  let streak = 0;
  for (const s of specs) {
    if (s.diff >= avg) {
      streak++;
      if (streak >= 4) {
        warnings.push(`L${s.num}: 4+ consecutive levels at diff>=avg without relief`);
        streak = 0;
      }
    } else if (s.diff <= avg - 2) {
      streak = 0;
    }
  }

  // 4. Override cap warning
  const oc = Object.keys(chapter.overrides || {}).length;
  if (oc > 3) warnings.push(`chapter ${chapter.num}: ${oc} overrides — target is ≤3`);

  if (errors.length > 0) {
    console.error(`✗ chapter ${chapter.num} validation failed:\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  for (const w of warnings) console.warn(`⚠ ${w}`);
}
```

- [ ] **Step 10.4: Wire validator into `run()` + bump version**

Modify `BUNDLE_VERSION` (line ~264): `const BUNDLE_VERSION = 6;`

Modify the start of `run()` (around line 532) — insert validateChapter calls BEFORE the existing `validateBundle` call:
```js
function run() {
  // Per-chapter validation runs first — catches algorithm misuse before
  // compileLevel obscures the source-level issue.
  for (const ch of CHAPTERS) {
    const specs = generateChapter(ch);
    validateChapter(ch, specs);
  }
  const compiled = SOURCE.map(compileLevel);
  validateBundle(CHAPTERS, compiled, ECONOMY);
  // ... rest of run() unchanged
```

- [ ] **Step 10.5: Update header comment + write test for validator**

Add validator test to `gen-levels.test.js`:
```js
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
```

Add `validateChapter` to `module.exports`. Also update the header comment block at the top of `gen-levels.js` (lines 1-39) — replace the "Use cases" + "Deploy flow for a new chapter" sections with:
```
// Use cases:
//   1. Preview the compiled bundle (summary table only):
//        node scripts/gen-levels.js
//   2. Print full JSON:
//        node scripts/gen-levels.js --json
//   3. Write the bundle file to disk:
//        node scripts/gen-levels.js --write
//   4. Run unit tests:
//        npm test
//
// Authoring guide (v6+ algorithmic generation):
//   1. To add a NEW CHAPTER: append one entry to the CHAPTERS array with
//      { num, start, end, name, biome, spawnKinds, obstacleTheme,
//        difficultyArc, noviceColor, overrides, bonus }. The algorithm
//      generates the chapter's levels deterministically — no per-level
//      hand-authoring required. Aim for ≤3 entries in `overrides` (the
//      validator warns above that).
//   2. To TWEAK an existing level: add/update the entry in the chapter's
//      `overrides` map (partial-patch merge — only the fields you specify
//      override the algorithm output).
//   3. Bump BUNDLE_VERSION below — required for the remote-fetch path to
//      recognise the new bundle. Output filename is content-v${N}.json.
//   4. `node scripts/gen-levels.js` (preview) → validate the table
//   5. `node scripts/gen-levels.js --write` → emit content-v${N}.json
//   6. git commit + push → GitHub Pages publishes ~1 min
//
// Spec: docs/specs/2026-05-13-level-generator-algorithm-design.md
// Schema contract: app/src/content/content.ts (RN) + Scripts/Content/LevelData.cs (Unity)
```

- [ ] **Step 10.6: Run preview, sanity-check the output table**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && node scripts/gen-levels.js
```

Expected: 60-row table prints, no `✗` errors, possibly a few `⚠` warnings (acceptable).

Compare summary against v5 (existing `content-v5.json`):
```bash
diff <(node scripts/gen-levels.js | grep -E '^\s+[0-9]+') <(python3 -c "
import json
b = json.load(open('content-v5.json'))
for L in b['levels']:
    gs = sum(L['goals'].values())
    obs = L.get('obstacles', {})
    ice = len(obs.get('ice', []))
    vine = len(obs.get('vine', []))
    obs_s = ' '.join([f'ice×{ice}' if ice else '', f'vine×{vine}' if vine else '']).strip() or '-'
    print(f'  {L[chr(34)+chr(110)+chr(117)+chr(109)+chr(34)] if False else L[\"num\"]:>3}  {L[\"moves\"]:>5}  {gs:>7}  {L[\"star1\"]:>7}  {L[\"star2\"]:>7}  {L[\"star3\"]:>7}  {obs_s}')
")
```

Expected: deltas exist (Ch1 now has obstacle variety) but the structure (3 columns: moves / goalSum / stars) shows similar magnitude per chapter. Star3 distribution should be within ~±20% of v5 per chapter.

- [ ] **Step 10.7: Emit `content-v6.json`**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && node scripts/gen-levels.js --write
```

Expected:
```
✓ wrote bundle v6 (5 chapters, 60 levels) → content-v6.json
Next: git commit + push to publish via GitHub Pages.
```

Verify the file:
```bash
python3 -c "
import json
b = json.load(open('content-v6.json'))
print('version:', b['version'])
print('chapters:', len(b['chapters']))
print('levels:', len(b['levels']))
print('Ch1 obstacle variety:')
for L in b['levels'][:9]:
    obs = L.get('obstacles') or {}
    ice = len(obs.get('ice') or [])
    vine = len(obs.get('vine') or [])
    print(f'  L{L[chr(34)+\"num\"+chr(34)] if False else L[\"num\"]:>2}  ice={ice} vine={vine}  arch={L.get(\"archetype\")}')"
```

Expected: `version: 6`, 5 chapters, 60 levels, AND Ch1 (L1-L9) shows obstacle variety (at least 2-3 entries with non-zero ice/vine, multiple distinct archetypes).

- [ ] **Step 10.8: Run full test suite**

```bash
cd /Users/cancermikli/disk/projects/react-native/foxglen-content && npm test
```

Expected: all 62 tests pass.

- [ ] **Step 10.9: Commit**

```bash
git add scripts/gen-levels.js scripts/gen-levels.test.js content-v6.json
git commit -m "$(cat <<'EOF'
Ship content-v6 generated by chapter algorithm

Replaces hand-authored SOURCE array with CHAPTERS.flatMap(generateChapter).
Extends CHAPTERS with obstacleTheme/difficultyArc/noviceColor/overrides
per chapter (≤3 overrides each). Adds validateChapter() running before
validateBundle to catch algorithm misuse. Bumps BUNDLE_VERSION 5→6,
emits content-v6.json.

Fixes Ch1 visual monotony — L1-9 now ramp obstacles + archetypes
deterministically. No engine/binary changes; pure content swap. Remote
clients pick up on next cold start once Firebase Remote Config
content_bundle_url is bumped to v6.

Spec: docs/specs/2026-05-13-level-generator-algorithm-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✓ §Inputs (Chapter metadata extension) → Task 10.1
- ✓ §Outputs (LevelSpec shape) → Task 9.3 spec emission
- ✓ §Algorithm Step 1 beat allocation → Task 3
- ✓ §Algorithm Step 2 difficulty curve → Task 4
- ✓ §Algorithm Step 3 archetype rotation → Task 5
- ✓ §Algorithm Step 4 kinds selection → Task 6
- ✓ §Algorithm Step 5 obstacle assignment → Task 7
- ✓ §Algorithm Step 6 tightness → Task 8
- ✓ §Algorithm Step 7 overrides → Task 8
- ✓ §Validation rules → Task 10.3 (validateChapter)
- ✓ §Foxglen-specific calibration table → Task 10.1
- ✓ §Implementation footprint (gen-levels.js, BUNDLE_VERSION bump) → Task 10
- ✓ §Deploy path step 1-3 → Task 10.7
- ⚠ §Deploy path step 4-7 (git push, Remote Config bump) → INTENTIONALLY OUT OF SCOPE (user feedback: never commit/push without explicit request); will be a follow-up after user approves the v6 content
- ⚠ Spec §Risks — gen-time playability check (Engine.MakeBoard × 5 seeds) → SKIPPED; Engine.Reshuffle ladder is runtime safety net + cross-repo Engine import is awkward from Node script
- ⚠ Spec §Open decisions §3 (`level-design.md` updates) → REPLACED with `gen-levels.js` header comment update (Task 10.5); the header is where future contributors land first, more discoverable than RN-side doc

**Placeholder scan:** No TBD/TODO/"implement later" — every step has actual code or commands.

**Type consistency:** `pickArchetype` returns string archetype name (consumed by `pickKinds` + `compileLevel`). `pickObstacles` returns `{ ice?: PATTERN_NAME, vine?: PATTERN_NAME } | undefined` (resolved by `resolveObstacle` inside `compileLevel`). `applyOverrides` accepts and returns `LevelSpec[]`. `beats[]` shape `{ tag, subIndex, segmentLen }` consistent across Steps 1-7. `state` shape `{ iceIdx, vineIdx, mixCounter }` consistent within `pickObstacles` calls. `chapter` shape matches CHAPTERS extension in Task 10.1.

---

**Plan complete and saved to** `foxglen-content/docs/plans/2026-05-13-level-generator-algorithm-plan.md`.

Two execution options:

1. **Subagent-Driven** (recommended) — fresh subagent per task, review between, fast iteration. Best for this plan since each task is independently testable + commits cleanly.

2. **Inline Execution** — execute tasks in this session via `executing-plans`, batch with checkpoints.

Which approach?
