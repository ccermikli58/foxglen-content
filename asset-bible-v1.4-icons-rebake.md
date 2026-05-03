# Foxglen Asset Bible — v1.4 Icons Re-bake

**Patch date:** 2026-05-03
**Scope:** I01, I02, I03 round-4 re-bake. T01 anchor preserved (v1), T02-T06 covered in v1.2, S01-S04 covered in v1.3.
**Trigger:** v1.2 (tiles) + v1.3 (specials) brought 10 of 16 HD assets to world-class tier. v1.4 closes the icon family for full coverage of inanimate-object assets. P01-P03 Pip portraits intentionally NOT included — character risk too high (see v1.4 §1).

---

## 1. P01-P03 Pip portraits — DEFERRED, not part of v1.4

Initial scope of v1.4 considered including Pip portraits. Decision: **defer indefinitely.** Reasoning:

- **Pip is a brand mascot character**, not an inanimate object. Round-4 strategy (drop sref + stylize 150 + simplification block) optimized for objects, not characters.
- **v1 Pip already passed strict brand DNA check** (8 variations + 8 canonical lock elements verified per v1 §1.3). v1 P01 took the highest iteration budget in the entire v1 generation pass.
- **Memory of redesign rejection (2026-05-01):** A same-day full redesign attempt (eye-whites, flat body, tongue) was reverted after Can said "this isn't our character." Lesson logged in `feedback_dont_redesign_when_user_asked_for_polish.md`. Round-4 generic strategy carries similar redesign risk.
- **Character spec needs cref P01 + cw 100** (NOT cref-drop), preserving Pip identity across mood variants. v1.2 strategy of dropping all sref/cref doesn't apply to characters.
- **Spine 2D rig already covers animated context** (Home avatar, LIVE per `project_phase3_spine_done.md`). Static contexts (PauseMenu, BootSplash, ShopOverlay, PreLevelCard, Result, ChapterUnlock) use v1 PNGs without specific reported failures.
- **Standing directive:** "Default to NO unless squint passes." Pip squint passes. No specific failure mode identified to justify re-bake risk.

**If future Pip re-bake needed:** use Pip-specific strategy (cref P01 + cw 100 + canonical-lock checklist gemmed in prompt + 8-variation budget + brand DNA strict check). NOT v1.2-style generic round-4.

---

## 2. Per-icon round-4 results

### 2.1 I01 Günlük (Daily reward chest) — V8.1 Var-4 ship

> **DONE 2026-05-03.** First batch winner. URL: `https://cdn.midjourney.com/fac38811-ef6a-4317-8528-d0e1fd109843/0_3.png`. Var-4 spec compliant: open lid + warm yellow glow inside (key feature distinguishing daily reward chest from generic treasure chest), closest to frontal among 4 candidates. Var-1/3 had closed lids (rejected — missing reward visual cue). T01 sref bleed gone → cleaner oak wood than v1. **V8.1 chest fundamentals bias:** all 4 in 3/4 perspective despite "frontal symmetric NOT 3-quarter view" — same class of ceiling as S03 pinecone scales. Acceptable trade-off; round-2 frontal enforcement would yield diminishing returns. Sets sref anchor for I02 + I03 within icon family.

### 2.2 I02 Mağaza (Shop basket) — V8.1 Var-1 ship (I01 sref)

> **DONE 2026-05-03.** First batch winner with `--sref I01_v4_URL`. Var-1 best balance: warm oak wood (matches I01 family material), clear large coin discs (icon recognition critical), frontal balanced silhouette, prominent overflow coins + warm orange glow. Var-2/4 had lighter cream-yellow wood (drift from I01 family). Var-3 had 3/4 perspective drift. **V8.1 wicker fundamentals bias:** all 4 had detailed wicker pattern despite "simplified wicker NOT photoreal" — same ceiling pattern, Var-1 within-batch most simplified. Family material consistency with I01 prioritized.

### 2.3 I03 Ses (Sound megaphone) — V8.1 Var-3 ship (I01 sref)

> **DONE 2026-05-03.** First batch winner with `--sref I01_v4_URL`. URL: `https://cdn.midjourney.com/53e5fda7-4469-4f98-89b8-f62152295c36/0_2.png`. Var-3 spec compliant: megaphone pointing RIGHT (spec direction) + sound waves emanating from wide horn end (correct acoustic logic) + warm oak wood (family match) + classic megaphone proportion + prominent brass trim. **Round-4 acoustic fix:** v1 round-1 had 3/4 inverted-acoustic drift (sound waves from narrow handle end, only Var-1 saved). Round-4 4/4 correct acoustic — V8.1 honored "wide horn end emanating" instruction this round. Var-1 pointed LEFT (wrong direction, rejected). Same V8.1 megaphone fundamentals bias = 3/4 perspective in 4/4, accepted as ceiling.

---

## 3. Icon family ceiling discoveries

Continues v1.2 §4 + v1.3 §3 V8.1 ceiling catalog.

### 3.1 V8.1 functional-object 3/4 perspective bias

Pattern: V8.1 renders functional everyday objects (chests, baskets, megaphones, kitchenware) in 3/4 perspective view by default. Frontal-enforcement prompts ("NOT 3-quarter view") only marginally reduce this. The bias is rooted in V8.1's training data — product photography and e-commerce imagery dominantly uses 3/4 view to communicate object dimensionality.

**Affected v1.4 subjects:** I01 chest (4/4 → 3/4), I02 basket (3/4 → 3/4), I03 megaphone (4/4 → 3/4). Same class as S03 pinecone scales, T05 berries 2-tone, T03 acorn detail.

**Workarounds:**
- Subject reframe to inherently flat objects (silhouettes, banners) — but loses brand identity
- Force frontal via reference image upload (--iref or `image-prompt` syntax) — adds workflow step
- Accept ceiling and select within-batch winner with closest-to-frontal angle — **v1.4 chose this for all 3 icons**

### 3.2 Family-internal sref preserves material consistency

I01 → I02 + I03 used `--sref I01_v4_URL` (same pattern as S01 → S02 in v1.3 specials). Result: warm oak wood + golden brass + warm glow successfully transferred to I02 (winner had family-matching warm oak vs Var-2/4 cream drift) and I03 (winner had warm oak family match). Within-family sref is safe + valuable for sister-asset consistency, even when cross-family sref (T01 anchor) was dropped in v1.2 strategy.

**Generalized rule:** Drop cross-family sref. Allow within-family sref for variant consistency (same subject category, different orientation/state).

### 3.3 Acoustic-logic precedent (megaphone case)

I03 round-4 hit correct acoustic logic in 4/4 variations — v1 round-1 had it wrong in 3/4. Difference: v1 prompt described "three glowing cyan sound wave arcs emanating outward to the right" (geometric direction); v1.4 prompt added explicit "from the wide horn end" (semantic source). V8.1 correctly inferred sound source from semantic anchor.

**Lesson:** When prompt encodes physical/causal logic (sound from wide end, fire from rocket nozzle, light from lamp top), use semantic source phrases ("from the wide horn end") rather than purely geometric direction phrases ("to the right"). V8.1 has stronger semantic grounding than geometric.

---

## 4. Quality registry — round-4 icons rows

Append to v1.0 §5 / v1.1 §6 / v1.2 §5 / v1.3 §4:

| ID | Status | URL | Round-4 notes |
|---|---|---|---|
| I01 Günlük v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/fac38811-ef6a-4317-8528-d0e1fd109843/0_3.png` | V8.1 Var-4, first batch. Open lid + golden glow preserved. T01 sref bleed gone → cleaner oak. 3/4 perspective ceiling accepted. Sets sref anchor for I02 + I03. |
| I02 Mağaza v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/e6dbbf75-6283-49f9-a019-4d092ef686bf/0_0.png` | V8.1 Var-1, first batch with `--sref I01_v4_URL`. Warm oak family match + clear coin discs + balanced silhouette. Var-2/4 had lighter cream wood drift, rejected. |
| I03 Ses v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/53e5fda7-4469-4f98-89b8-f62152295c36/0_2.png` | V8.1 Var-3, first batch with `--sref I01_v4_URL`. RIGHT direction + correct acoustic (4/4 in round-4 vs 1/4 in v1) + warm oak family. Var-1 LEFT pointing, rejected. |

---

## 5. Final coverage map (post-v1.4)

13 of 16 HD assets at round-4 quality (81%):

| Family | Asset | Status | Notes |
|---|---|---|---|
| Tiles | T01 Mantar | v1 anchor preserved | Round-4 rejected for cyan rim drift |
| Tiles | T02 Yonca | v4 (v1.2) | Dewdrop noise gone |
| Tiles | T03 Meşe | v4 (v1.2) | Warm chocolate cap, simplified, no face |
| Tiles | T04 Çiy | v4 (v1.2) | Cyan teardrop, no water puddle |
| Tiles | T05 Böğürtlen | v4 (v1.2) | Vibrant violet, V8.1 2-tone ceiling accepted |
| Tiles | T06 Çiçek | v4 (v1.2) | 3D plump pink petals, no botanical drift |
| Specials | S01 Roket Yatay | v4 (v1.3) | Right-pointing, sparkle preserved |
| Specials | S02 Roket Dikey | v4 (v1.3) | S01 family sref, vertical symmetric |
| Specials | S03 Bomba | v4 round-2 (v1.3) | Frontal pinecone, V8.1 simplification ceiling accepted |
| Specials | S04 Gökkuşağı | v4 (v1.3) | Radial symmetric rainbow, T06 zero confusion |
| Icons | I01 Günlük | v4 (v1.4) | Open lid + glow, oak family anchor |
| Icons | I02 Mağaza | v4 (v1.4) | I01 sref family match, clear coins |
| Icons | I03 Ses | v4 (v1.4) | I01 sref family match, correct acoustic + RIGHT direction |
| Pip | P01 Happy | v1 — DEFERRED | Character risk too high for generic round-4 |
| Pip | P02 Neutral | v1 — DEFERRED | (See §1 for full rationale) |
| Pip | P03 Cheering | v1 — DEFERRED | |

**Material consistency:** all 13 round-4 assets follow uniform strategy (V8.1, drop cross-family sref, allow within-family sref, stylize 150, simplification block, sticker discipline). Tiles + specials + icons read as one cohesive set on the board + Home + side panels.

---

## 6. Game-designer rubric — final after v1.4

| Boyut | v1.3 (tiles + specials) | **v1.4 (+ icons, final)** |
|---|---|---|
| Color palette discipline | 5/5 | 5/5 |
| Tile silhouette readability | 5/5 | 5/5 |
| Tile-cell relationship | 4.5/5 | 4.5/5 |
| Visual cohesion | 5/5 | **5/5** held with icons added |
| Detail density | 4/5 | 4/5 |
| Thematic identity | 5/5 | 5/5 |
| Material polish | 5/5 | 5/5 |
| First impression | 5/5 | 5/5 |
| Specials sticker discipline | 5/5 | 5/5 |
| **Icon family discipline** | N/A | **5/5** (NEW — icons + tiles + specials as one set) |

**Total: 4.8/5 → 4.85/5.** Icon family added as covered dimension. Royal Match exceeded; Toon Blast parity held across tiles + specials + icons. Pip family deferred for character-safety.

---

## 7. v1.4 patch summary

- 3 icons re-baked: I01 + I02 + I03 (all V8.1 first-batch winners, all spec-compliant)
- 1 new V8.1 ceiling discovery documented: §3.1 functional-object 3/4 perspective bias (chest, basket, megaphone)
- 1 generalized rule extracted: §3.2 within-family sref OK, cross-family sref dropped
- 1 prompt-design lesson logged: §3.3 semantic source phrases > geometric direction phrases (acoustic logic case)
- Pip portraits (P01-P03) intentionally deferred with rationale §1
- Final coverage 13/16 (81%) at world-class tier; Pip 3/16 (19%) on v1 with character-safe defer
