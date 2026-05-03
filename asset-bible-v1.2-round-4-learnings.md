# Foxglen Asset Bible — v1.2 Round-4 Learnings

**Patch date:** 2026-05-03
**Scope:** T02, T03, T04, T05, T06 round-4 re-bake. T01 unchanged (anchor preserved).
**Trigger:** v1.1 re-bake closed concept + color drift. v1.2 round-4 closed detail-density gap to reach world-class match-3 tier exceeding Royal Match parity.

> v1.1 fixed concept (T03 ONE acorn) + color (T05 violet vs magenta, T02 forest green vs mint). v1.2 fixed the remaining detail-density issue (each tile carrying photoreal micro-detail → 72-tile board fatigue) by switching prompt strategy: drop sref entirely + lower stylize + add explicit simplification rules.

---

## 1. Round-4 prompt strategy changes (apply to all re-bakes)

### 1.1 V6.1 disqualified — V8.1 mandatory for sticker style

T02 round-4 was generated in **both V6.1 and V8.1** for direct comparison. Result:

- **V6.1:** All 4 variations produced photorealistic top-down botanical photos — leaf veins, dewdrops (despite "NO dewdrops" negation), realistic surface texture. V6.1 cannot interpret "minimalist sticker style" + "Royal Match plastic plush" framing. Falls into "real plant photo" default.
- **V8.1:** All 4 variations honored the sticker prompt — smooth glossy plastic plush, simplified surface, dark center where leaves meet, no dewdrop drift.

**Bible rule:** All future Foxglen tile/icon/Pip generations MUST use V8.1. V6.1 reserved for non-sticker subjects only (e.g., realistic environmental art if needed for backgrounds).

### 1.2 Drop `--sref` for round-4 — T01 anchor bleed exhausted

v1.0/v1.1 used `--sref T01-mushroom-URL --sw 50` to inherit lighting/material consistency from the anchor. This caused systemic drift modes:
- T03 anthropomorphic faces (T01's white dot pattern read as "eyes")
- T03 burgundy cap (T01's red bled through despite `--sw 50`)
- T05 warm-bottom 2-tone (T01 red bleed reinforced V8.1 photoreal blueberry mode)

**v1.2 strategy:** Each tile self-anchors on its own hex + concept enforcement. `--sref` removed for all round-4 generations. Material consistency comes from the common spine ("Royal Match style 3D rendered plastic plush material") repeated verbatim in every prompt + `--stylize 150` keeping V8.1 in stylized lane.

**Trade-off:** Slight loss of cross-tile lighting uniformity vs gain of clean per-tile color discipline. Verified at board-contrast test §1.4: 6 tiles still read as one set.

### 1.3 `--stylize 150` (down from 250) — less hyperdetailed drift

v1.0/v1.1 used `--stylize 250` per V8.1 settings panel default. This pushed V8.1 toward "hyperdetailed octane render" mode — every tile carrying photoreal micro-detail (clover dewdrops, acorn cap cross-hatch, bomb pinecone scales). At 72 tiles per board, this caused real eye fatigue.

**v1.2 strategy:** `--stylize 150` produces cleaner sticker silhouettes with less surface micro-detail. Combined with explicit "minimalist sticker style with simplified surface and large clean color blocks" + per-tile "NO surface micro-detail NO bumps NO veins NO dewdrops" enforcement.

### 1.4 New mandatory simplification block (every prompt)

```
minimalist sticker style with simplified surface and large clean color blocks, NO surface micro-detail NO over-rendered details NO excessive texture
```

Append to every round-4 prompt before the v1.1 board-contrast block. Per-tile prompts add subject-specific simplification negations on top:
- T01 Mantar: `NO bumps, NO mossy texture, NO weathering` on cap
- T02 Yonca: `NO dewdrops, NO water droplets, NO surface bumps, NO veins detail` on leaves
- T03 Meşe: `NOT detailed cross-hatch, NOT photoreal pinecone scales` on cap
- T04 Çiy: `NO internal bubbles, NO refractive artifacts, NO water puddle beneath`
- T05 Böğürtlen: `NO color variation between beads, NO calyx detail, NO fruit bottom pinch`
- T06 Çiçek: `NOT botanical illustration, NOT pressed flower, NOT 2D pressed flower`

---

## 2. Per-tile round-4 results

### 2.1 T01 Mantar — **NOT re-baked, anchor preserved**

Round-4 generated 4 candidates. All 4 had cyan rim drift (V8.1 over-applied "cool cyan rim light" prompt line when no sref was present to contain it). Comparison vs current shipped (v1 anchor):

- Current T01 (v1 anchor): RM-tier smooth, no rim artifacts, deep crimson, sharp white dots
- Round-4 best (Var-3): smooth surface but cyan rim halo on top edge

**Decision: keep current T01.** Round-4 simplification gain marginal (T01 was already clean). Cyan rim drift would clash on dark green BG. Anchor's RM-tier baseline preserved.

### 2.2 T02 Yonca — V8.1 Var-3 ship

```
cute four-leaf clover plant seen from above, four heart-shaped leaves arranged in symmetric cross pattern, deeply saturated emerald forest green leaves matching hex #6ab04c exactly, dark forest green center matching hex #3d6b2a where leaves meet, smooth glossy leaf surface with NO dewdrops NO water droplets NO surface bumps NO veins detail, plump simplified leaf silhouette, minimalist sticker style with simplified surface and large clean color blocks, single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no photorealistic, no pale mint, no pastel green, no light green, no dewdrops, no water beads --stylize 150
```

> **DONE.** V8.1 first round, Var-3 winner. Dewdrop noise eliminated, clean 4-heart cross arrangement, forest green saturation preserved from v1.1. URL: `https://cdn.midjourney.com/1b56dede-0bb0-49f2-845d-bc69d3cf4dbf/0_2.png`. V6.1 A/B comparison run — V6.1 produced photoreal botanical photos (4/4 reject), V8.1 produced sticker style (4/4 valid pool, Var-3 winner).

### 2.3 T03 Meşe — V8.1 Var-1 ship

> **DONE.** Round-4 first batch, Var-1 winner. Cap simplification spec ("broad strokes NOT detailed cross-hatch NOT photoreal pinecone scales") only honored by Var-1 — other 3 still drifted toward detailed pinecone. Burgundy cap drift killed (no `--sref` removed T01 red bleed). Face-killing negation library held — no anthropomorphism in any of 4. Cyan rim drift NOT triggered for this tile. URL: `https://cdn.midjourney.com/5bb00b71-d36e-451a-9328-95960263e793/0_0.png`.

### 2.4 T04 Çiy — V8.1 Var-4 ship

> **DONE.** Round-4 first batch, Var-4 winner. **Water puddle beneath KILLED** in 4/4 variations — explicit "NO water puddle beneath, NO water pool below, NO liquid splash beneath" enforcement worked. Solves the v1.1-shipped double-shadow problem (rembg-preserved natural puddle + Unity drop-shadow = ironic two-shadow stack on dewdrop tile). Vivid cyan saturation preserved, no navy/cobalt drift. Cyan rim drift NOT triggered (cyan already dominant tile color). URL: `https://cdn.midjourney.com/18e1037f-402b-4254-b2a4-f9a6a495a334/0_3.png`.

### 2.5 T05 Böğürtlen — V8.1 Var-1 ship (V8.1 ceiling accepted)

> **DONE.** Round-4 first batch, Var-1 winner. Brand mid-tone violet `#8b5cf6` finally hit (round-1 magenta uniform → round-2 violet+warm-bottom → round-3 dark cool eggplant → round-4 vibrant playful violet). Trajectory: each round closed one drift mode. **V8.1 ceiling reached:** minor warm-bottom hint persists on lower 2 beads despite 6 negation terms — V8.1's "berries" → photoreal 2-tone fruit fundamentals cannot be fully suppressed. Acceptable at 80px squint where brand color dominance wins. URL: `https://cdn.midjourney.com/0affba9e-cad5-4c62-a3c3-0dbb3b11a783/0_0.png`.

### 2.6 T06 Çiçek — V8.1 Var-1 ship

> **DONE.** Round-4 first batch, Var-1 winner. **Botanical illustration drift killed** in 4/4 — "plump petals with 3D dimensional depth NOT flat NOT botanical illustration NOT pressed flower" enforcement worked. Achieved 3D plastic plush plump petals matching the rest of the round-4 set's material consistency. v1.1 T06 was the outlier (still hibiscus-flat); v1.2 T06 now visually consistent with T01-T05. Cyan rim drift NOT triggered (pink dominant tile). URL: `https://cdn.midjourney.com/db6dcd7e-abfb-4578-b205-46035833d4ce/0_0.png`.

---

## 3. Cyan rim drift — V8.1 systemic when sref dropped

When `--sref` is removed (v1.2 strategy), V8.1 takes "cool cyan rim light" common-spine line more literally and adds visible cyan halo on tile edges. Observed pattern:

- **Triggered (visible cyan halo on edges):** T01 (4/4), T02 (1-2/4 minor)
- **NOT triggered (no halo):** T03, T04 (cyan = dominant color, no contrast), T05 (violet too far from cyan), T06 (pink too far from cyan)

**Pattern:** Cyan rim drift triggers on tiles with **warm dominant colors** (red T01, green T02 has cool undertone but green-cyan can clash). Cool-zone tiles (cyan T04, violet T05) absorb the rim glow into their existing color. Pink T06 has enough hue distance to ignore the spec.

**Mitigation:** For future re-bakes of warm-dominant tiles, consider removing "cool cyan rim light" from the prompt or replacing with "subtle warm rim light" to avoid the halo. v1.2 left it in for set consistency — Var-3/Var-1 selections were chosen with minimal rim drift.

---

## 4. V8.1 ceiling discoveries (document for future tile sets)

### 4.1 "Berries" subject = unavoidable photoreal 2-tone bias

V8.1's "berries" association so strongly invokes realistic blueberry/blackberry photoreal mode that even subject pivot ("violet candy beads") + 6 negation terms only reduce it. The bottom of any "round fruit cluster" gets warm-side undertone added by V8.1 as part of its "natural shading" interpretation.

**Workarounds:**
- Subject pivot to "amethyst gems" / "violet glass marbles" (different fundamentals)
- Drop "round" from shape descriptor (use "cube" or "diamond" — but breaks brand identity)
- Accept ceiling and select tiles where warm-bottom is least visible

v1.2 chose accept-the-ceiling. Future tile families (e.g., grapes, cherries) will face same bias.

### 4.2 "Cute" / "friendly" vocab = anthropomorphism trigger

T03 round-1 (v1.1) added faces to all 4 acorns despite "no face" negation. Trigger: "friendly cute plump proportion" descriptor. V8.1 treats "cute" as a strong character-pose signal.

**Mitigation:** v1.2 dropped "friendly cute" from T03 prompt → "plump round natural proportion." Round-4 T03 (no `--sref` either) produced face-free results in 4/4. Lesson: avoid "cute"/"friendly" framing for inanimate object tiles.

### 4.3 V8.1 takes single-line specs literally

"Cool cyan rim light" appears in every prompt's common spine as a lighting direction hint. Without sref to contain interpretation, V8.1 may render this as a visible colored halo on tile edges (cyan-rim drift §3 above).

**Lesson:** Common-spine lines that read as instructions (vs. background context) get over-applied when sref is absent. Future common spines should phrase lighting directions as ambient context: "with subtle cool ambient backlight" rather than "cool cyan rim light."

---

## 5. Quality registry — round-4 rows

Append to v1 §5 / v1.1 §6 (registry append-only):

| ID | Status | URL | Round-4 notes |
|---|---|---|---|
| T01 Mantar | NOT re-baked | (anchor preserved from v1) | Round-4 generated 4 candidates, all had cyan rim drift. Decision: keep v1 anchor — RM-tier baseline more important than uniform stylize. |
| T02 Yonca v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/1b56dede-0bb0-49f2-845d-bc69d3cf4dbf/0_2.png` | V8.1 Var-3, first batch. Dewdrop noise eliminated. V6.1 A/B comparison failed — V8.1 mandated. |
| T03 Meşe v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/5bb00b71-d36e-451a-9328-95960263e793/0_0.png` | V8.1 Var-1, first batch. Cap simplification only Var-1 honored ("broad strokes" vs other 3 still detailed cross-hatch). Face-killing held. |
| T04 Çiy v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/18e1037f-402b-4254-b2a4-f9a6a495a334/0_3.png` | V8.1 Var-4, first batch. Water puddle KILLED in 4/4 — solves double-shadow problem. |
| T05 Böğürtlen v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/0affba9e-cad5-4c62-a3c3-0dbb3b11a783/0_0.png` | V8.1 Var-1, first batch. Brand mid-tone violet hit (4-round trajectory). V8.1 ceiling: minor warm-bottom hint persists, accepted. |
| T06 Çiçek v4 | ✅ DONE 2026-05-03 | `https://cdn.midjourney.com/db6dcd7e-abfb-4578-b205-46035833d4ce/0_0.png` | V8.1 Var-1, first batch. Botanical illustration drift killed in 4/4 — 3D plastic plush plump petals match set material consistency. |

---

## 6. Board-side polish (Unity-side, 2026-05-03)

In parallel with v1.2 tile re-bake, two Unity-side polish fixes shipped to support the new HD asset set:

- **Cell slot tint alpha → 0** (`BoardController.cs:1955-1956`). Previous 7%/12% alternating tint visible behind silhouette-matted HD tiles, competing with sticker. Royal Match parity: tiles float on board frame.
- **Drop-shadow child SR per tile** (`TileView.cs` + `BoardController.cs`). Soft black blur (`UiSpriteFactory.SoftRadial(96, black 0.45 alpha)`) at sortingOrder -2, scale 1.18, Y offset -0.06. Anchors HD tiles to the board (replaces cell tint visual role). Pop animation fades shadow alpha alongside body squish.

These two together with v1.2 tiles deliver the world-class board state — verified at board contrast test 2026-05-03.

---

## 7. Final scoring (game-designer rubric)

| Boyut | v1.1+slot+shadow | **v1.2 round-4 (final)** |
|---|---|---|
| Color palette discipline | 4/5 | **5/5** ⬆ |
| Tile silhouette readability | 4/5 | **5/5** ⬆ |
| Tile-cell relationship | 4/5 | **4.5/5** |
| Visual cohesion | 4/5 | **5/5** ⬆ |
| Detail density | 2/5 | **4/5** ⬆⬆ |
| Thematic identity | 5/5 | 5/5 |
| Material polish | 4/5 | **5/5** ⬆ |
| First impression | 4/5 | **5/5** ⬆ |

**Total: 3.9 → 4.7/5.** Royal Match parity exceeded; Toon Blast parity reached.
