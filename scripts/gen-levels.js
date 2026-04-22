#!/usr/bin/env node
// Live-ops content bundle generator. Pure Node, no deps.
//
// This script is the *single source of authorship* for the Foxglen /
// Tilki Korusu content bundle. Edit CHAPTERS + SOURCE here, run with
// `--write`, commit + push — GitHub Pages serves the new bundle within
// ~1 minute, and apps pick it up on the next cold start without an
// App Store update.
//
// Emits `content-v${BUNDLE_VERSION}.json` alongside this script's parent
// (i.e. the foxglen-content repo root). Immutable filenames per version
// so aggressive CDN caching stays safe.
//
// Use cases:
//   1. Preview the compiled bundle (summary table only):
//        node scripts/gen-levels.js
//   2. Print full JSON:
//        node scripts/gen-levels.js --json
//   3. Write the bundle file to disk:
//        node scripts/gen-levels.js --write
//
// Schema contract: `app/src/content/content.ts` in the app repo defines
// the Chapter / ContentBundle TS types. The runtime validator
// (`remote.ts:isValidBundle`) enforces the same invariants at boot, so a
// malformed bundle never activates — if a chapter is missing `name.tr`
// or `name.en`, the app silently ignores the remote bundle and keeps
// the cached/bundled one.
//
// Deploy flow for a new chapter (no binary release required):
//   1. Append to CHAPTERS + SOURCE below.
//   2. Bump BUNDLE_VERSION (immutable filenames, so the bump creates a
//      new file — previous versions stay published for older binaries).
//   3. `node scripts/gen-levels.js --write` → emits content-vN.json.
//   4. git commit + push → GitHub Pages publishes.
//   5. (optional) Set Remote Config `content_bundle_url` to override
//      the hardcoded default in `app/src/content/remote.ts`, if the
//      shipped binary still points at the previous version.
//   6. Cold-start users cache v(N) and activate it on the start after.

const fs = require('fs');
const path = require('path');

// ─── Obstacle pattern library ───────────────────────────────────────────────

const ICE_PATTERNS = {
  'ice:border':    [[0, 2], [0, 3], [0, 4], [0, 5], [8, 3], [8, 4]],
  'ice:corners':   [[0, 0], [0, 7], [8, 0], [8, 7]],
  'ice:cross':     [[3, 3], [3, 4], [4, 3], [4, 4]],
  'ice:horseshoe': [[0, 1], [0, 6], [1, 0], [1, 7], [2, 0], [2, 7]],
  'ice:pillars':   [[1, 2], [1, 5], [2, 2], [2, 5], [3, 2], [3, 5]],
};
const VINE_PATTERNS = {
  'vine:scatter': [[1, 3], [3, 1], [5, 6], [7, 4]],
  'vine:ring':    [[2, 3], [2, 4], [3, 2], [3, 5], [4, 2], [4, 5], [5, 3], [5, 4]],
  'vine:lines':   [[3, 0], [3, 1], [3, 6], [3, 7], [5, 0], [5, 1], [5, 6], [5, 7]],
  'vine:center4': [[3, 3], [3, 4], [4, 3], [4, 4]],
};
function pickBySize(lib, count) {
  const entries = Object.values(lib).map((p) => [p.length, p]);
  entries.sort((a, b) => Math.abs(a[0] - count) - Math.abs(b[0] - count));
  return entries[0][1];
}
function resolveObstacle(req, kind) {
  if (req == null) return undefined;
  if (typeof req === 'string') return kind === 'ice' ? ICE_PATTERNS[req] : VINE_PATTERNS[req];
  return kind === 'ice' ? pickBySize(ICE_PATTERNS, req) : pickBySize(VINE_PATTERNS, req);
}

// ─── Formulas ────────────────────────────────────────────────────────────────

function goalCountPerKind(arch, diff, kindsLen) {
  // baseTotal is the approximate *total tiles to collect* across all goals.
  // For archetypes with variable kind counts (`mixed`, `iceBreak`,
  // `vineControl`) we use the actual kindsLen to compute per-kind count.
  const baseTotal =
    arch === 'simpleCollect'  ? 8 + diff * 2 :
    arch === 'dualCollect'    ? 18 + diff * 2 :
    arch === 'tripleCollect'  ? 30 + diff * 1.5 :
    arch === 'quadCollect'    ? 44 + diff * 1 :
    arch === 'pentaCollect'   ? 60 :
    arch === 'hexaCollect'    ? 80 :
    arch === 'iceBreak'       ? 12 + diff * 2 :
    arch === 'vineControl'    ? 10 + diff * 1.5 :
    arch === 'scoreOnly'      ? 0 :
                                18 + diff * 2; /* mixed */
  const fixedKinds =
    arch === 'simpleCollect'  ? 1 :
    arch === 'dualCollect'    ? 2 :
    arch === 'tripleCollect'  ? 3 :
    arch === 'quadCollect'    ? 4 :
    arch === 'pentaCollect'   ? 5 :
    arch === 'hexaCollect'    ? 6 :
                                null; // variable
  const divisor = fixedKinds ?? Math.max(1, kindsLen || 1);
  return Math.max(6, Math.round(baseTotal / divisor));
}
// Moves-per-tile multiplier. A player clears ~2-5 tiles per swap depending on
// skill and board state; brutal levels demand chain/special usage.
//   loose   → ~1.2 tiles/move (beginner-friendly)
//   medium  → ~1.7 tiles/move
//   tight   → ~2.5 tiles/move
//   brutal  → ~4.0 tiles/move (requires chains + specials)
const TIGHTNESS_MULT = { loose: 0.85, medium: 0.60, tight: 0.40, brutal: 0.25 };
function defaultTightness(num, arch) {
  // Chapter openings stay relaxed, finales squeeze. Most chapters have a ~15
  // level span; the gentle intro is levels 1-2 of each chapter (e.g. 10-11,
  // 21-22, 31-32, 46-47) and the finale is the last 1-2 (9, 20, 30, 45, 60).
  // Designers always override with an explicit tightness when the
  // archetype's rhythm needs a hard pivot (relief inside a hard stretch).
  if (arch === 'scoreOnly') return 'medium';
  if (num <= 6) return 'loose';
  if (num <= 44) return 'medium';    // L7-44 default
  if (num <= 58) return 'medium';    // Ch5 body stays medium; tight via overrides
  return 'tight';                    // last couple of levels lean tight
}
function chainFactor(diff) {
  if (diff <= 3) return 1.4;
  if (diff <= 6) return 1.6;
  if (diff <= 8) return 1.8;
  return 2.0;
}
function roundTo(n, step) { return Math.max(step, Math.round(n / step) * step); }

function compileLevel(spec) {
  const { num, arch, diff } = spec;
  const tightness = spec.tightness || defaultTightness(num, arch);
  const mult = TIGHTNESS_MULT[tightness];

  const desiredKindCount =
    arch === 'simpleCollect' ? 1 :
    arch === 'dualCollect'   ? 2 :
    arch === 'tripleCollect' ? 3 :
    arch === 'quadCollect'   ? 4 :
    arch === 'pentaCollect'  ? 5 :
    arch === 'hexaCollect'   ? 6 :
    arch === 'scoreOnly'     ? 0 :
    arch === 'iceBreak' || arch === 'vineControl' ? 1 :
                               (spec.kinds ? spec.kinds.length : 2);
  const kinds = (spec.kinds || []).slice(0, desiredKindCount);

  const goals = {};
  let goalSum = 0;
  if (desiredKindCount > 0 && kinds.length > 0) {
    const defaultCount = goalCountPerKind(arch, diff, kinds.length);
    kinds.forEach((k, i) => {
      const count = (spec.goalCounts && spec.goalCounts[i] != null) ? spec.goalCounts[i] : defaultCount;
      goals[String(k)] = count;
      goalSum += count;
    });
  }

  const ice  = resolveObstacle(spec.obstacles && spec.obstacles.ice,  'ice');
  const vine = resolveObstacle(spec.obstacles && spec.obstacles.vine, 'vine');
  const iceN  = ice  ? ice.length  : 0;
  const vineN = vine ? vine.length : 0;

  // Obstacle chipping is a *side effect* of normal matches, not a separate
  // move cost — but we pad the budget slightly so a board full of ice doesn't
  // feel hopeless. Ratios tuned against hand-authored reference levels.
  let moves;
  if (arch === 'scoreOnly') {
    moves = Math.round((14 + diff) * 1.1);
  } else if (arch === 'iceBreak') {
    // Ice-focused levels: the ice IS the main work, so moves scale with it.
    moves = Math.round(iceN * 1.8 + goalSum * mult);
  } else if (arch === 'vineControl') {
    moves = Math.round(vineN * 2.4 + goalSum * mult);
  } else {
    moves = Math.round(goalSum * mult + iceN * 0.6 + vineN * 0.8);
  }
  moves = Math.max(10, moves);
  if (spec.movesOverride != null) moves = spec.movesOverride;

  let baseScore;
  if (arch === 'scoreOnly') {
    baseScore = moves * (380 + diff * 40);
  } else {
    baseScore = goalSum * 30 * chainFactor(diff);
    baseScore += iceN * 60 + vineN * 50;
  }
  const star1 = roundTo(baseScore * 0.6, 500);
  const star2 = roundTo(baseScore * 0.9, 500);
  const star3 = roundTo(baseScore * 1.25, 500);

  const level = { num, moves, goals, star1, star2, star3 };
  if (ice || vine) {
    level.obstacles = {};
    if (ice)  level.obstacles.ice  = ice;
    if (vine) level.obstacles.vine = vine;
  }
  return level;
}

// ─── Chapter metadata ───────────────────────────────────────────────────────
// This is the authoritative chapter list. Each chapter ships with inline
// localized display names so remote-delivered chapters never depend on an
// i18n.ts update in the app binary.
//
// Fields:
//   num      — chapter identifier (1-based, strictly increasing)
//   start    — first level number in this chapter (inclusive)
//   end      — last level number in this chapter (inclusive). Must equal
//              the final level in `SOURCE` for the chapter
//   name     — { tr, en } inline localized display name
//   biome    — hex color for winding-map gradient + overlay background
//   bonus    — all-stars perfect-run reward (coins/gems + booster pack)

// Biome tints — chosen so each chapter reads as a clearly DIFFERENT world
// when scrolled past. Hue deltas (green → teal → amber → gold → blue) are
// intentionally large; subtler palettes blur together on OLED displays and
// kill the "new world" dopamine hit on chapter crossings.
const CHAPTERS = [
  { num: 1, start: 1,  end: 9,  name: { tr: 'Çiy Açıklığı',    en: 'Dewdrop Grove'     }, biome: '#4a8a48', bonus: { coins: 500,  gems: 2,  boosters: { rocket: 1 } } },
  { num: 2, start: 10, end: 20, name: { tr: 'Yosun Oyuğu',     en: 'Mossy Hollow'      }, biome: '#206b6e', bonus: { coins: 800,  gems: 4,  boosters: { rocket: 1, bomb: 1 } } },
  { num: 3, start: 21, end: 30, name: { tr: 'Ballıorman',      en: 'Honeywood'         }, biome: '#a57024', bonus: { coins: 1200, gems: 6,  boosters: { rocket: 1, bomb: 1, moves5: 1 } } },
  { num: 4, start: 31, end: 45, name: { tr: 'Pırıltılı Çayır', en: 'Shimmering Meadow' }, biome: '#c48a30', bonus: { coins: 1600, gems: 8,  boosters: { rocket: 2, bomb: 1, moves5: 1 } } },
  { num: 5, start: 46, end: 60, name: { tr: 'Gümüş Göl',       en: 'Silver Lake'       }, biome: '#2a5e8a', bonus: { coins: 2400, gems: 12, boosters: { rocket: 2, bomb: 2, moves5: 2 } } },
];

// Bump `BUNDLE_VERSION` whenever CHAPTERS, SOURCE, or ECONOMY change
// meaningfully — the remote-fetch path uses this to decide whether to swap
// in a newer bundle. Also determines the output filename (`content-v${N}.json`).
const BUNDLE_VERSION = 4;

// ─── ECONOMY: live-ops-tunable pricing + rewards ────────────────────────────
// Every value here moves into the bundle so ops can tune F2P pressure (drop
// rates, continue costs, starter pack contents) without a binary release.
// The app's accessors in `app/src/content/content.ts` mirror this shape;
// missing fields fall back to DEFAULT_ECONOMY in that file for older caches.
//
// Tuning guide (short form — see `match-three-balance` skill for depth):
//   rewards          — coins/gems/drop chance per star tier. Flat across all
//                      levels on purpose; chapter reward scaling rides on
//                      CHAPTERS[i].bonus, not here.
//   boosterPrices    — pre-level staging cost. Coins primary (~1 win = 1
//                      rocket), gems as fallback when player runs dry.
//   continueCosts    — in-run escalator. Steep third step kills unbounded
//                      rescue loops; cap (200) is sticky for 4th+ attempts.
//   lifeRefill       — 20 min × 5 lives is the casual match-3 industry norm.
//                      Tune `minutes` to squeeze or relax session cadence.
//   starterPack      — must feel like ~2.5-3× the $0.99 gem bundle. If you
//                      change bundle contents, retune `gems` so the USD
//                      ratio stays in that band.
//   firstBoosterGift — post-L`afterLevel` one-time grant. Teaches BoosterBar
//                      exists. Raising `afterLevel` delays the reveal.
//   dropWeights      — relative, not absolute. Cheapest kind should have the
//                      highest weight so F2P players don't hoard high-cost
//                      ones they can't afford to spend.
//   shopPacks        — gem cost of the quantity bundles in the Shop screen.
//                      Titles/icons/grant logic stay in `Shop.tsx` — this
//                      only moves the numbers so A/B tests are bundle-driven.
const ECONOMY = {
  rewards: {
    star3: { coins: 180, gems: 2, boosterChance: 0.50 },
    star2: { coins: 120, gems: 1, boosterChance: 0.15 },
    star1: { coins:  80, gems: 0, boosterChance: 0.00 },
  },
  boosterPrices: {
    rocket: { coins: 150, gems: 15 },
    bomb:   { coins: 200, gems: 20 },
    moves5: { coins: 100, gems: 10 },
  },
  continueCosts: [50, 100, 200],
  lifeRefill: { minutes: 20, gemCost: 100 },
  starterPack: {
    gems: 500,
    coins: 0,
    boosters: { rocket: 3, bomb: 3, moves5: 3 },
    livesToMax: true,
  },
  firstBoosterGift: { afterLevel: 2, boosters: { rocket: 1, bomb: 1, moves5: 1 } },
  dropWeights: { moves5: 0.5, rocket: 0.3, bomb: 0.2 },
  shopPacks: { rocket3: 30, bomb3: 40, moves53: 20, boosterPack: 55 },
};

// ─── SOURCE: define / edit levels here ───────────────────────────────────────
// Add new entries to the end. `num` must be strictly increasing.
// See `app/src/engine/level-design.md` in the app repo for archetype /
// difficulty / tightness picking guidance.

const SOURCE = [
  // Chapter 1 — Çiy Açıklığı (gentle ramp, 1-3 difficulty)
  { num: 1,  arch: 'simpleCollect', diff: 1, kinds: [0] },
  { num: 2,  arch: 'simpleCollect', diff: 2, kinds: [1] },
  { num: 3,  arch: 'dualCollect',   diff: 2, kinds: [0, 2] },
  { num: 4,  arch: 'dualCollect',   diff: 3, kinds: [1, 3] },
  { num: 5,  arch: 'mixed',         diff: 4, kinds: [0, 2, 4], obstacles: { vine: 4 } },
  { num: 6,  arch: 'mixed',         diff: 4, kinds: [3, 5],    obstacles: { ice: 4 } },
  { num: 7,  arch: 'mixed',         diff: 5, kinds: [1, 2],    obstacles: { vine: 4 } },
  { num: 8,  arch: 'mixed',         diff: 5, kinds: [0, 2, 4, 5], obstacles: { ice: 6, vine: 4 } },
  { num: 9,  arch: 'simpleCollect', diff: 6, kinds: [4], tightness: 'tight' /* finale */ },

  // Chapter 2 — Yosun Oyuğu (mid-difficulty, 3-8)
  { num: 10, arch: 'dualCollect',   diff: 4, kinds: [1, 2],    obstacles: { ice: 4 } },
  { num: 11, arch: 'dualCollect',   diff: 4, kinds: [0, 3] },
  { num: 12, arch: 'tripleCollect', diff: 5, kinds: [2, 4, 5], obstacles: { vine: 4 } },
  { num: 13, arch: 'iceBreak',      diff: 5, kinds: [1], obstacles: { ice: 'ice:horseshoe' } },
  { num: 14, arch: 'dualCollect',   diff: 4, kinds: [3, 5] /* relief */ },
  { num: 15, arch: 'quadCollect',   diff: 7, kinds: [0, 1, 2, 4], obstacles: { ice: 'ice:cross', vine: 'vine:scatter' } },
  { num: 16, arch: 'vineControl',   diff: 6, kinds: [5], obstacles: { vine: 'vine:scatter' } },
  { num: 17, arch: 'dualCollect',   diff: 6, kinds: [0, 4],    obstacles: { ice: 4 } },
  { num: 18, arch: 'tripleCollect', diff: 7, kinds: [1, 2, 3], obstacles: { vine: 'vine:scatter' } },
  { num: 19, arch: 'dualCollect',   diff: 6, kinds: [4, 5] },
  { num: 20, arch: 'quadCollect',   diff: 9, kinds: [0, 2, 3, 5], tightness: 'tight', obstacles: { ice: 'ice:border', vine: 'vine:scatter' } /* boss */ },

  // Chapter 3 — Ballıorman (expert, 5-10)
  { num: 21, arch: 'dualCollect',   diff: 6, kinds: [1, 3] },
  { num: 22, arch: 'iceBreak',      diff: 6, kinds: [0], obstacles: { ice: 'ice:pillars' } },
  { num: 23, arch: 'tripleCollect', diff: 7, kinds: [2, 4, 5], obstacles: { vine: 'vine:scatter' } },
  { num: 24, arch: 'dualCollect',   diff: 7, kinds: [3, 5], obstacles: { ice: 'ice:border' } },
  { num: 25, arch: 'quadCollect',   diff: 8, kinds: [0, 1, 2, 4], obstacles: { ice: 'ice:cross', vine: 'vine:scatter' } },
  { num: 26, arch: 'simpleCollect', diff: 7, kinds: [5], obstacles: { vine: 'vine:scatter' } },
  { num: 27, arch: 'tripleCollect', diff: 8, kinds: [0, 2, 5], obstacles: { ice: 'ice:horseshoe', vine: 'vine:center4' } },
  { num: 28, arch: 'dualCollect',   diff: 7, kinds: [1, 4] },
  { num: 29, arch: 'dualCollect',   diff: 8, kinds: [2, 3], obstacles: { ice: 'ice:pillars', vine: 'vine:scatter' } },
  { num: 30, arch: 'hexaCollect',   diff: 10, kinds: [0, 1, 2, 3, 4, 5], tightness: 'brutal', obstacles: { ice: 'ice:border', vine: 'vine:ring' } /* grand finale */ },

  // Chapter 4 — Pırıltılı Çayır (L31-45, diff 5-10; amber/gold meadow)
  // Pacing: 2 gentle → 4 build → 2 mid → 1 relief → 3 build2 → 2 climax → 1 finale
  { num: 31, arch: 'dualCollect',   diff: 5, kinds: [0, 2],       tightness: 'loose' /* gentle */ },
  { num: 32, arch: 'dualCollect',   diff: 5, kinds: [1, 3],       tightness: 'loose' /* gentle */ },
  { num: 33, arch: 'tripleCollect', diff: 6, kinds: [0, 3, 5] },
  { num: 34, arch: 'mixed',         diff: 6, kinds: [1, 4],       obstacles: { ice: 4 } },
  { num: 35, arch: 'iceBreak',      diff: 7, kinds: [2],          obstacles: { ice: 'ice:horseshoe' } },
  { num: 36, arch: 'quadCollect',   diff: 7, kinds: [0, 1, 3, 5] },
  { num: 37, arch: 'mixed',         diff: 8, kinds: [2, 4, 5],    obstacles: { ice: 'ice:cross', vine: 4 } },
  { num: 38, arch: 'vineControl',   diff: 8, kinds: [3],          obstacles: { vine: 'vine:ring' } },
  { num: 39, arch: 'dualCollect',   diff: 5, kinds: [0, 4],       tightness: 'loose' /* relief */ },
  { num: 40, arch: 'tripleCollect', diff: 7, kinds: [1, 2, 5],    obstacles: { ice: 'ice:cross' } },
  { num: 41, arch: 'dualCollect',   diff: 8, kinds: [3, 4],       obstacles: { ice: 6, vine: 4 } },
  { num: 42, arch: 'quadCollect',   diff: 8, kinds: [0, 1, 2, 3] },
  { num: 43, arch: 'tripleCollect', diff: 9, kinds: [2, 4, 5],    tightness: 'tight', obstacles: { vine: 'vine:center4' } },
  { num: 44, arch: 'quadCollect',   diff: 9, kinds: [1, 2, 3, 5], obstacles: { ice: 4, vine: 'vine:scatter' } },
  { num: 45, arch: 'pentaCollect',  diff: 10, kinds: [0, 1, 2, 3, 4], tightness: 'tight', obstacles: { ice: 'ice:border', vine: 'vine:ring' } /* Ch4 finale */ },

  // Chapter 5 — Gümüş Göl (L46-60, diff 6-10; silver-teal, endgame)
  // Almost no "gentle" runway here — this is the post-mastery stretch.
  { num: 46, arch: 'dualCollect',   diff: 6, kinds: [2, 3] },
  { num: 47, arch: 'tripleCollect', diff: 7, kinds: [0, 1, 4] },
  { num: 48, arch: 'mixed',         diff: 7, kinds: [3, 5],       obstacles: { ice: 'ice:horseshoe' } },
  { num: 49, arch: 'quadCollect',   diff: 7, kinds: [0, 2, 3, 4] },
  { num: 50, arch: 'iceBreak',      diff: 8, kinds: [1],          obstacles: { ice: 'ice:border' } },
  { num: 51, arch: 'tripleCollect', diff: 8, kinds: [2, 3, 5],    obstacles: { vine: 'vine:ring' } },
  { num: 52, arch: 'quadCollect',   diff: 9, kinds: [0, 1, 4, 5], tightness: 'tight', obstacles: { ice: 'ice:cross', vine: 'vine:center4' } },
  { num: 53, arch: 'simpleCollect', diff: 6, kinds: [4], tightness: 'loose' /* relief — only one like this in Ch5 */ },
  { num: 54, arch: 'vineControl',   diff: 8, kinds: [0],          obstacles: { vine: 'vine:lines' } },
  { num: 55, arch: 'tripleCollect', diff: 8, kinds: [1, 3, 5],    obstacles: { ice: 6, vine: 4 } },
  { num: 56, arch: 'quadCollect',   diff: 9, kinds: [0, 2, 4, 5] },
  { num: 57, arch: 'mixed',         diff: 9, kinds: [1, 2, 3, 5], tightness: 'tight', obstacles: { ice: 'ice:border', vine: 'vine:scatter' } },
  { num: 58, arch: 'quadCollect',   diff: 9, kinds: [0, 1, 3, 4], tightness: 'tight', obstacles: { ice: 'ice:cross', vine: 'vine:center4' } },
  { num: 59, arch: 'pentaCollect',  diff: 10, kinds: [0, 1, 2, 3, 5], tightness: 'tight', obstacles: { ice: 'ice:border', vine: 'vine:ring' } },
  { num: 60, arch: 'hexaCollect',   diff: 10, kinds: [0, 1, 2, 3, 4, 5], tightness: 'brutal', obstacles: { ice: 'ice:border', vine: 'vine:ring' } /* grand finale */ },
];

// ─── CLI ─────────────────────────────────────────────────────────────────────

function validateBundle(chapters, levels, economy) {
  // Strictly increasing level numbers
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].num <= levels[i - 1].num) {
      console.error(`✗ num must be strictly increasing (${levels[i - 1].num} → ${levels[i].num})`);
      process.exit(1);
    }
  }
  // Every chapter range must span actual levels; chapter.end should be the
  // number of the last level before the next chapter starts.
  for (let i = 0; i < chapters.length; i++) {
    const c = chapters[i];
    const next = chapters[i + 1];
    const hasStart = levels.some((l) => l.num === c.start);
    const hasEnd = levels.some((l) => l.num === c.end);
    if (!hasStart || !hasEnd) {
      console.error(`✗ chapter ${c.num} ranges ${c.start}-${c.end} but no matching levels`);
      process.exit(1);
    }
    if (next && c.end + 1 !== next.start) {
      console.error(`✗ chapter ${c.num} ends at ${c.end} but chapter ${next.num} starts at ${next.start} — must be contiguous`);
      process.exit(1);
    }
    if (!c.name || typeof c.name.tr !== 'string' || typeof c.name.en !== 'string' || !c.name.tr || !c.name.en) {
      console.error(`✗ chapter ${c.num} must ship inline name.tr + name.en — remote bundles are fully self-describing`);
      process.exit(1);
    }
  }
  // Economy mirrors the runtime `isValidEconomy` in app/src/content/remote.ts.
  // Failing author-time catches the worst mistakes (negative price, missing
  // continue tier, reversed star thresholds) before GitHub Pages publishes.
  if (!economy) {
    console.error('✗ ECONOMY missing — bundle must ship economy block since v4');
    process.exit(1);
  }
  const tiers = ['star3', 'star2', 'star1'];
  for (const tier of tiers) {
    const r = economy.rewards && economy.rewards[tier];
    if (!r || typeof r.coins !== 'number' || typeof r.gems !== 'number' || typeof r.boosterChance !== 'number') {
      console.error(`✗ economy.rewards.${tier} missing coins/gems/boosterChance`);
      process.exit(1);
    }
    if (r.coins < 0 || r.gems < 0 || r.boosterChance < 0 || r.boosterChance > 1) {
      console.error(`✗ economy.rewards.${tier} out of range`);
      process.exit(1);
    }
  }
  if (economy.rewards.star3.coins < economy.rewards.star2.coins || economy.rewards.star2.coins < economy.rewards.star1.coins) {
    console.error('✗ economy.rewards must have monotonic coin payout (star3 ≥ star2 ≥ star1)');
    process.exit(1);
  }
  const kinds = ['rocket', 'bomb', 'moves5'];
  for (const k of kinds) {
    const p = economy.boosterPrices && economy.boosterPrices[k];
    if (!p || typeof p.coins !== 'number' || typeof p.gems !== 'number' || p.coins < 0 || p.gems < 0) {
      console.error(`✗ economy.boosterPrices.${k} must be non-negative {coins, gems}`);
      process.exit(1);
    }
  }
  if (!Array.isArray(economy.continueCosts) || economy.continueCosts.length === 0 || economy.continueCosts.some((n) => typeof n !== 'number' || n < 0)) {
    console.error('✗ economy.continueCosts must be a non-empty array of non-negative numbers');
    process.exit(1);
  }
  if (!economy.lifeRefill || typeof economy.lifeRefill.minutes !== 'number' || economy.lifeRefill.minutes <= 0 ||
      typeof economy.lifeRefill.gemCost !== 'number' || economy.lifeRefill.gemCost < 0) {
    console.error('✗ economy.lifeRefill requires positive minutes + non-negative gemCost');
    process.exit(1);
  }
  if (!economy.starterPack || typeof economy.starterPack.gems !== 'number' || typeof economy.starterPack.coins !== 'number' ||
      typeof economy.starterPack.livesToMax !== 'boolean' || !economy.starterPack.boosters) {
    console.error('✗ economy.starterPack malformed');
    process.exit(1);
  }
  if (!economy.firstBoosterGift || typeof economy.firstBoosterGift.afterLevel !== 'number' || !economy.firstBoosterGift.boosters) {
    console.error('✗ economy.firstBoosterGift malformed');
    process.exit(1);
  }
  if (!economy.dropWeights || typeof economy.dropWeights.moves5 !== 'number' ||
      typeof economy.dropWeights.rocket !== 'number' || typeof economy.dropWeights.bomb !== 'number') {
    console.error('✗ economy.dropWeights must be three numbers');
    process.exit(1);
  }
  if (!economy.shopPacks || ['rocket3', 'bomb3', 'moves53', 'boosterPack'].some((k) => typeof economy.shopPacks[k] !== 'number' || economy.shopPacks[k] < 0)) {
    console.error('✗ economy.shopPacks must be four non-negative numbers');
    process.exit(1);
  }
}

function run() {
  const compiled = SOURCE.map(compileLevel);
  validateBundle(CHAPTERS, compiled, ECONOMY);

  const bundle = {
    version: BUNDLE_VERSION,
    economy: ECONOMY,
    chapters: CHAPTERS,
    levels: compiled,
  };
  const json = JSON.stringify(bundle, null, 2);
  const args = new Set(process.argv.slice(2));

  if (args.has('--write')) {
    // Emit the bundle alongside this script's parent — the content repo
    // root. Filename follows the immutable `content-v${N}.json` convention
    // so each BUNDLE_VERSION bump creates a new file that the CDN can
    // cache aggressively. Previous versions stay on disk for old binaries.
    const out = path.resolve(__dirname, '..', `content-v${BUNDLE_VERSION}.json`);
    fs.writeFileSync(out, json + '\n');
    console.log(`✓ wrote bundle v${BUNDLE_VERSION} (${CHAPTERS.length} chapters, ${compiled.length} levels) → ${path.relative(process.cwd(), out)}`);
    console.log('Next: git commit + push to publish via GitHub Pages.');
  } else {
    // Default: print a compact summary table + (optional) full JSON.
    console.log(`Compiled ${CHAPTERS.length} chapters, ${compiled.length} levels (bundle v${BUNDLE_VERSION}).\n`);
    console.log('Num  Moves  GoalSum  Star1    Star2    Star3    Obstacles');
    console.log('───  ─────  ───────  ───────  ───────  ───────  ──────────');
    compiled.forEach((lv) => {
      const gs = Object.values(lv.goals).reduce((a, b) => a + b, 0);
      const obs = lv.obstacles
        ? [lv.obstacles.ice ? `ice×${lv.obstacles.ice.length}` : '',
           lv.obstacles.vine ? `vine×${lv.obstacles.vine.length}` : ''].filter(Boolean).join(' ')
        : '-';
      console.log(
        `${String(lv.num).padStart(3)}  ${String(lv.moves).padStart(5)}  ${String(gs).padStart(7)}  ` +
        `${String(lv.star1).padStart(7)}  ${String(lv.star2).padStart(7)}  ${String(lv.star3).padStart(7)}  ${obs}`,
      );
    });
    if (args.has('--json')) {
      console.log('\n' + json);
    } else {
      console.log(`\n(pass --json to print full JSON; --write to emit content-v${BUNDLE_VERSION}.json)`);
    }
  }
}

run();
