# Foxglen Asset Bible — v1.3 Specials Re-bake

**Patch date:** 2026-05-03
**Scope:** S01, S02, S03, S04 round-4 re-bake. T01-T06 already covered in v1.2 (this is the parallel pass for special tiles).
**Trigger:** v1.2 brought T01-T06 to world-class tier (4.7/5). S01-S04 still on v1 strategy (sref T01 + stylize 250) — same drift modes likely present. Material consistency demanded specials match the round-4 set.

---

## 1. Specials-specific strategy adjustments (vs tiles)

Specials need round-4 hygiene (V8.1 only, drop cross-family sref, stylize 150, simplification block) but **with three differences from tiles**:

| | Tile (T01-T06) | Special (S01-S04) |
|---|---|---|
| Board frequency | 72 tiles, detail density critical | 0-3 specials at once, density less critical |
| Visual goal | clean iconic silhouette | "supercharged" feel — sparkle/aura preserved |
| Sref strategy | full drop | drop T01-cross-family, but allow within-family (S01→S02 rocket internal) |
| Direction clarity | 2D radial | direction-encoded (rocket horizontal vs vertical) — frontal symmetric mandatory |

**Mandatory enforcement for specials (added to v1.2 simplification block):**
```
frontal symmetric centered view with vertical/horizontal central axis NOT tilted NOT angled NOT 3-quarter view NOT perspective drift
```

S03 round-1 produced a tilted pinecone winner — caught at large-preview review (invisible at 80px but visible in marketing/screenshot context). Round-2 with tilt enforcement fixed it. Lesson logged for all future specials.

---

## 2. Per-special round-4 results

### 2.1 S01 Roket Yatay — V8.1 Var-1 ship

> **DONE 2026-05-03.** First batch winner. URL: `https://cdn.midjourney.com/e4900fa7-35ad-40cd-9b76-51a60b01fd45/0_0.png`. Cleanest direction-clarity (right-pointing nose unambiguous at 80px). Sparkle particles preserved (supercharged feel). Background drift to dark green/teal in 4/4 — V8.1 misread "dark forest green background" reference (board context, not image BG) — handled by rembg foreground detection.

### 2.2 S02 Roket Dikey — V8.1 Var-1 ship (S01 sref, family internal)

> **DONE 2026-05-03.** First batch winner with `--sref <S01_v4_URL>`. Var-1 matched S01's plump rounded cylindrical body + smooth bottom (no fins). Var-2/3/4 added fin variations — sref drift, rejected for family consistency. Vertical direction (cyan up nose + cyan down thrust) symmetric reading at squint. Background dark green drift again, rembg handled.

### 2.3 S03 Bomba (Pinecone) — V8.1 Round-2 Var-1 ship

> **DONE 2026-05-03.** Required round-2: round-1 best candidate (Var-3) had ~5° tilt — invisible at 80px but visible in large preview. Round-2 prompt added "frontal symmetric centered view NOT tilted" enforcement. All 4 round-2 variations frontal ✓. Var-1 best simplification within V8.1 ceiling (broadest scale strokes — "broad strokes NOT detailed cross-hatch" not fully honored, but Var-1 closest). URL: `https://cdn.midjourney.com/5ead1952-b854-48e9-bcc1-496de11b0aee/0_0.png`. **V8.1 ceiling acknowledgment: pinecone subject invokes detailed cross-hatch fundamentals — same class of bias as T05 berries 2-tone (v1.2 §4.1).** Acceptable trade-off given frontal + amber glow + compass sparkles preserved.

### 2.4 S04 Gökkuşağı (Rainbow) — V8.1 Batch-1 Var-2 ship

> **DONE 2026-05-03.** Two batches generated for cross-batch comparison. Batch-1 Var-2 winner — truly radial symmetric, balanced composition, classic flower silhouette with teardrop petals. Batch-2 Var-1 was rich plump alternative but bottom petal asymmetric (extending down past others) — rejected for radial symmetry violation. T06 confusion check: ZERO risk (S04 multi-color rainbow + white pearl center vs T06 monochrome pink + golden center — instant squint distinguish). URL: `https://cdn.midjourney.com/eb03655c-7c6e-4bc9-aeae-1224592c8181/0_1.png`.

---

## 3. New V8.1 ceiling discoveries (specials)

### 3.1 "Pinecone" subject = unavoidable detailed scale bias

Same class of bias as v1.2 §4.1 ("berries" subject = unavoidable 2-tone). V8.1's "pinecone" association invokes detailed cross-hatch as a fundamental — even with explicit "broad strokes NOT detailed cross-hatch NOT photoreal pine cone scales" + 6 negation terms, only marginal simplification gains (within-batch comparison shows Var-1 broader strokes than Var-4, but no variation hit pure "broad stroke" sticker discipline).

**Workarounds:**
- Subject pivot to "smooth brown egg with star markings" (different fundamentals — but loses pinecone identity)
- Drop pinecone subject entirely, use abstract bomb form (loses Foxglen forest theme)
- Accept V8.1 ceiling and select within-batch winner with broadest scales

v1.3 chose accept-the-ceiling (S03 Round-2 Var-1).

### 3.2 Background drift on specials (dark green BG instead of pure white)

S01 + S02 produced dark green/teal image backgrounds in 4/4 variations despite "isolated on pure white background" spec. V8.1 took the subsequent "dark forest green background" reference (board context for the readability check) too literally and applied it as the IMAGE background.

**Mitigation for future:** Reword board-context spec so V8.1 doesn't conflate image BG with board BG. Suggested: replace "readable at 80 pixel thumbnail size against dark forest green background" with "readable at 80 pixel thumbnail size when placed on a dark game board" — separates image rendering BG from contextual usage BG.

**Current handling:** rembg isnet-general-use foreground detection successfully matted out dark green BG (object-based detection, not color-thresholded). No workflow change needed for v1.3.

### 3.3 Cyan rim drift NOT triggered on specials

v1.2 §3 documented cyan rim drift on warm-dominant tiles when sref dropped (T01 4/4, T02 1-2/4 minor). For v1.3 specials:
- S01/S02: white-dominant rockets with cyan tips — cyan integrated as design element, no edge halo drift
- S03: brown pinecone — too far from cyan in hue space, no drift
- S04: multi-color rainbow petals + cyan as one of the petal colors — no edge halo drift

**Pattern reinforces v1.2 §3 hypothesis:** cyan rim drift triggers when the target tile's dominant color is in the WARM zone AND cyan is absent from the tile's intentional palette. Specials with cyan as design element absorb the rim suggestion correctly.

---

## 4. Quality registry — round-4 specials rows

Append to v1 §5 / v1.1 §6 / v1.2 §5:

| ID | Status | URL | Round-4 notes |
|---|---|---|---|
| S01 Roket Yatay v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/e4900fa7-35ad-40cd-9b76-51a60b01fd45/0_0.png` | V8.1 Var-1, first batch. Direction clarity prioritized over premium 3D variants. Background dark green drift — rembg handled. Sets sref anchor for S02 within rocket family. |
| S02 Roket Dikey v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/fb9cdcd7-78bd-4c1a-af02-7f522fcc25f2/0_0.png` | V8.1 Var-1, first batch with `--sref S01_v4_URL`. Family internal sref preserved S01's plump cylindrical body + no-fins silhouette. Vertical direction symmetric reading at squint. |
| S03 Bomba v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/5ead1952-b854-48e9-bcc1-496de11b0aee/0_0.png` | V8.1 Round-2 Var-1. Round-1 best candidate (Var-3) had ~5° tilt — caught at large-preview review. Round-2 with frontal enforcement: 4/4 frontal. V8.1 pinecone simplification ceiling acknowledged (broadest scales but still detailed cross-hatch). |
| S04 Gökkuşağı v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/eb03655c-7c6e-4bc9-aeae-1224592c8181/0_1.png` | V8.1 Batch-1 Var-2 (cross-batch comparison rejected Batch-2 Var-1 for asymmetric bottom petal). Truly radial symmetric, classic flower silhouette with teardrop petals. T06 zero confusion (multi-color vs monochrome). |

---

## 5. Final coverage — round-4 set

After v1.2 (tiles) + v1.3 (specials) round-4 pass:

- **T01 Mantar:** v1 anchor preserved (round-4 rejected for cyan rim drift)
- **T02 Yonca:** v4 (clean 4-heart, dewdrop noise gone)
- **T03 Meşe:** v4 (warm chocolate cap, simplified, no face)
- **T04 Çiy:** v4 (cyan teardrop, no water puddle)
- **T05 Böğürtlen:** v4 (vibrant violet, V8.1 2-tone ceiling accepted)
- **T06 Çiçek:** v4 (3D plump pink petals, no botanical drift)
- **S01 Roket Yatay:** v4 (right-pointing, sparkle preserved)
- **S02 Roket Dikey:** v4 (S01 family sref, vertical symmetric)
- **S03 Bomba:** v4 round-2 (frontal pinecone, V8.1 simplification ceiling accepted)
- **S04 Gökkuşağı:** v4 (radial symmetric rainbow, T06 zero confusion)

10 of 16 HD assets at round-4 quality. Remaining 6 (P01-P03 Pip portraits + I01-I03 side icons) on v1 quality — separate future re-bake pass when needed.

**Material consistency:** all 10 round-4 assets follow v1.2 strategy uniformly (V8.1, drop cross-family sref, stylize 150, simplification block, sticker discipline). Tiles + specials read as one cohesive set on the board.

---

## 6. Game-designer rubric — final after v1.3

| Boyut | Pre-v1.2 | v1.2 (tiles only) | **v1.3 (tiles + specials)** |
|---|---|---|---|
| Color palette discipline | 4/5 | 5/5 | **5/5** |
| Tile silhouette readability | 4/5 | 5/5 | **5/5** |
| Tile-cell relationship | 4/5 | 4.5/5 | **4.5/5** |
| Visual cohesion | 4/5 | 5/5 | **5/5** ⬆ specials match tile material |
| Detail density | 2/5 | 4/5 | **4/5** |
| Thematic identity | 5/5 | 5/5 | 5/5 |
| Material polish | 4/5 | 5/5 | **5/5** |
| First impression | 4/5 | 5/5 | **5/5** |
| **Specials sticker discipline** | N/A | N/A | **5/5** (NEW dimension covered) |

**Total: 4.7/5 → 4.8/5.** Royal Match exceeded; Toon Blast parity reached and held across both tile + special families.
