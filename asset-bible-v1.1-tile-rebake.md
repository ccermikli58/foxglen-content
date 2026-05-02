# Foxglen Asset Bible — v1.1 Tile Re-bake

**Patch date:** 2026-05-02
**Scope:** T02, T03, T04, T05 re-bake. T01 + T06 + S01-S04 + P01-P03 + I01-I03 unchanged.
**Trigger:** First-time integration in Unity board (PPU sizing fixed) revealed 4 tiles fail squint test on a real dark forest-green board background. v1 Quality Registry accepted color/concept drift that didn't survive in-game contrast.

> Anchor sref kept the same: `https://cdn.midjourney.com/794e758d-e852-40df-b732-3f72beafbc62/0_2.png` (T01 mushroom). All re-bakes still inherit T01's lighting/material via `--sref` + `--sw 50` so the family stays internally consistent.

---

## 1. What broke (squint test on dark green board)

| ID | Spec | What v1 shipped | Failure mode |
|---|---|---|---|
| **T02 Yonca** | `#6ab04c` saturated forest green | pale mint green, washed out | desaturation drift — sref red bleed neutralized green chroma |
| **T03 Meşe** | yellow oval body `#f4b000` + brown beret cap | brown acorn nut sitting on an orange peach/persimmon body | concept break — V8.1 invented a 2-piece "nut-on-fruit" composite |
| **T04 Çiy** | cyan/turquoise `#3ec1d3` | deep navy / cobalt blue | hue shift — color went from #3ec1d3 turquoise to ~#1a3a78 cobalt; lost the "fresh water" brand cue |
| **T05 Böğürtlen** | violet `#8b5cf6` (mid-purple, blue undertone) | magenta / pink-purple | hue shift — drifted toward warm purple; visually collides with T01 mushroom (red) and T06 bloom (pink) |

**Cross-tile readability cost:** in the shipped board, mushroom + berry + bloom all read as "warm reddish round thing" at 5m squint. v1.1 must restore color separation so a player can distinguish all 6 tile kinds in <0.3s.

---

## 2. New common rules (apply to all 4 re-bakes)

These are layered ON TOP of the v1 master spine (§2.1 in v1 bible). Add verbatim to every re-bake prompt:

```
single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, NO ambient floor color bleeding onto the object
```

**Why each clause:**
- "single dominant brand color readable at 80px thumbnail" — Royal Match / Toon Blast convention. v1 gave V8.1 too much room to introduce secondary colors that erode silhouette.
- "sticker-style NOT still-life NOT diorama" — v1 prompts said "Royal Match style 3D rendered plastic plush" but V8.1 still produced micro-photos with environmental lighting. "Sticker" is the magic word that kills baked environment.
- "NO ground surface / NO cast shadow on a surface / NO ambient floor color bleeding" — kills the "tile sitting on grass/sand" effect that made the v1 board look like 6 different photoshoots stitched together.

**Where to put it:** insert after `glossy fruit surface,` (or whatever subject-trailing phrase) and BEFORE `mobile match-3 puzzle game asset,` in every prompt below. Do NOT delete the v1 master spine — these rules supplement it.

---

## 3. Re-bake prompts (4 tiles)

> **Generation order:** T02 → T03 → T04 → T05 (alphabetical, no internal sref dependencies — each anchors back to T01 only).
> **Iteration budget:** 6 variations per tile, max 3 prompt revisions per tile. If round 3 fails, escalate to dropping `--sref` entirely and re-anchoring just on hex color enforcement.
> **Settings panel:** confirm V8.1 Standard + Raw + Stylize 250 + Personalization OFF before each batch.

### 3.1 T02 — Yonca (Clover) RE-BAKE

```
cute four-leaf clover plant seen from above, four heart-shaped leaves arranged in symmetric cross pattern, deeply saturated emerald forest green leaves matching hex #6ab04c exactly, dark forest green center #3d6b2a where leaves meet, soft chunky plump proportion with rolled rounded leaf edges, dewy semi-gloss on leaf surfaces, single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, NO ambient floor color bleeding onto the object, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no abstract shapes, no geometric polygon, no photorealistic, no pale mint, no pastel green, no light green, no sage, no lime --sref https://cdn.midjourney.com/794e758d-e852-40df-b732-3f72beafbc62/0_2.png --sw 50
```

**Diff vs v1:**
- "vibrant green" → "deeply saturated emerald forest green ... matching hex #6ab04c exactly"
- Added "no pale mint, no pastel green, no light green, no sage, no lime" inline negation (V8.1's most common drift modes for green)
- Added v2 common rules block

**Quality gate:** at 80px thumbnail on a `#1a3a24` background, the leaves must read as "forest green" not "lawn green" or "mint." If first batch is still pale, re-roll with `--stylize 100` (lower stylize reduces V8.1 chroma washing).

---

### 3.2 T03 — Meşe (Acorn) RE-BAKE

```
single classic acorn nut as ONE solid unified object, vertical egg-shaped body in smooth polished golden-yellow matching hex #f4b000 exactly, dark warm brown beret-shaped cap covering only the top one-third of the nut with visible cross-hatch scaly texture matching hex #a76e00, tiny brown stem nub on the very top center of the cap, friendly cute plump proportion, glossy semi-matte nut surface, the entire object is ONE piece NOT two separate objects, single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, NO ambient floor color bleeding onto the object, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no abstract shapes, no geometric polygon, no photorealistic, no orange fruit base, no peach, no persimmon, no apricot, no compound object, no two-piece object, no nut sitting on a fruit, no chestnut on a peach, no berry beneath, no spherical fruit body --sref https://cdn.midjourney.com/794e758d-e852-40df-b732-3f72beafbc62/0_2.png --sw 50
```

**Diff vs v1:**
- Reframed lead from "realistic plump acorn nut" → "single classic acorn nut as ONE solid unified object"
- Geometry spec hardened: "vertical egg-shaped body" + "cap covering only the top one-third"
- Repeat-emphasis: "the entire object is ONE piece NOT two separate objects"
- Negation library expanded with the specific drift modes seen in v1 ("no orange fruit base, no peach, no persimmon, no nut sitting on a fruit, no chestnut on a peach")
- Added v2 common rules block

**Quality gate:** silhouette at 64px must read as a single ovoid with a contrast band at the top. If V8.1 still produces 2-piece composite, round 2: drop `--sref` entirely (sref's "warm friendly object" influence may be triggering the fruit base) and rely only on hex enforcement.

---

### 3.3 T04 — Çiy (Dewdrop) RE-BAKE

```
single plump teardrop water droplet, opaque solid candy-like body in vivid bright turquoise cyan matching hex #3ec1d3 exactly, color is unmistakably tropical-lagoon turquoise NOT navy NOT cobalt NOT royal-blue NOT dark-blue, smooth glossy plastic surface like a polished cyan candy gem, plump teardrop shape pointed at top rounded at bottom, bright white sparkle highlight on upper-left of the body, faint cyan glow rim, single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, NO ambient floor color bleeding onto the object, NO water puddle beneath, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no abstract shapes, no geometric polygon, no photorealistic, no glass, no transparent interior, no refractive surface, no internal reflections, no internal artifacts, no navy blue, no cobalt blue, no royal blue, no dark blue, no deep blue, no indigo --sref https://cdn.midjourney.com/794e758d-e852-40df-b732-3f72beafbc62/0_2.png --sw 50
```

**Diff vs v1 (round 2 shipped version):**
- Color description rewritten: "vivid bright turquoise cyan ... unmistakably tropical-lagoon turquoise"
- Hex repeat-emphasis: "matching hex #3ec1d3 exactly"
- Added explicit blue-family negations: "no navy, no cobalt, no royal blue, no dark blue, no deep blue, no indigo" (these are the drift modes that produced the cobalt v1 result)
- Kept v1's opaque/candy framing (that successfully killed the round-1 photoreal glass interpretation)
- Added "NO water puddle beneath" to v2 common rules block (water drop would naturally invite a puddle)

**Quality gate:** at 80px on dark green, color must read as "cyan/turquoise" not "blue." If V8.1 still goes deep blue, round 2: lower `--sw` to 25 (less sref color bleed) or drop sref entirely.

---

### 3.4 T05 — Böğürtlen (Berry) RE-BAKE

```
cluster of three plump round berries, deep saturated violet purple color matching hex #8b5cf6 exactly, mid-tone purple with cool blue undertone NOT magenta NOT pink-purple NOT warm purple, grape-like proportion with one berry on top and two below in a triangle, small fresh green leaf stem on very top, soft sub-surface scattering on berry skin, glossy fruit surface, single dominant brand color readable at 80 pixel thumbnail size against dark forest green background, sticker-style game tile NOT still-life NOT diorama NOT product photograph, isolated subject with NO ground surface beneath, NO cast shadow on a surface, NO environmental reflection, NO ambient floor color bleeding onto the object, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no abstract shapes, no geometric polygon, no photorealistic, no magenta, no pink, no pink-purple, no warm purple, no red-purple, no fuchsia, no hot pink, no rose --sref https://cdn.midjourney.com/794e758d-e852-40df-b732-3f72beafbc62/0_2.png --sw 50
```

**Diff vs v1:**
- Color description hardened: "deep saturated violet purple ... mid-tone purple with cool blue undertone"
- Hex repeat-emphasis + explicit anti-magenta clause
- Negation library expanded for warm-purple drift modes: "no magenta, no pink, no pink-purple, no warm purple, no red-purple, no fuchsia, no hot pink, no rose"
- Restored "three berries" (v1 accepted 4-berry drift; for v1.1 we need silhouette discipline so 3-berry triangle is non-negotiable)
- Added v2 common rules block

**Quality gate:** at 5m squint, the berry cluster must NOT be confusable with mushroom (red) or bloom (pink). If V8.1 still produces magenta, round 2: drop sref entirely and re-anchor on a fresh violet reference (e.g., the existing T04 dewdrop URL once it lands — both are cool-tone tiles).

---

## 4. Quality gate — board contrast test (NEW)

Before approving any re-bake variation, verify on the actual Unity board background, not just on MJ's white canvas:

1. Download MJ output PNG
2. Open in any image tool, place on a **`#1a3a24` (forestDark)** flat fill
3. Downscale to **80×80 px** (matches typical board cell size on iPhone)
4. Step back 5 meters from screen
5. Ask: would I confuse this tile with any of the OTHER 5 tile kinds at this distance?
   - If yes → reject variation, re-roll
   - If no → continue to integration

This step did not exist in v1 — assets were judged on MJ's white canvas which masked color/contrast issues. v1.1 makes it mandatory.

---

## 5. Integration after re-bake

Once 4 new PNGs are accepted:

1. Drop them into `app/foxglen-content/assets/icons-v2/tiles/` (overwriting the v1 versions)
2. Copy to Unity: `cp T0{2,3,4,5}*.png /Users/cancermikli/disk/projects/unity/foxglen/Assets/Resources/Icons/v2/`
3. Filenames must remain `T02.png` ... `T05.png` (Unity `IconLibrary.HdId` enum maps are filename-locked)
4. Unity Editor will auto-reimport. PPU normalization (`IconLibrary.WrapAsUnitBounds`, added 2026-05-02) handles whatever native pixel size MJ exports — no further sizing config needed
5. Cold-restart the app, open Board, run quality gate §4 in-context

If the manifest pipeline (`AssetManifestRemote`) is also live-ops-pushing these, bump `manifest.json.version` and re-publish to GitHub Pages. Cache key `foxglen:assets:v1` will invalidate on next cold start.

---

## 6. Updated Quality Registry rows

When re-bake variations are accepted, append to v1's §5 Quality Registry. Use this row template so the v1 registry stays the historical record:

```
| T02 Yonca v1.1 | ✅ DONE 2026-05-02 | <new URL> | v1.1 re-bake. Reason: v1 leaves drifted to pale mint, failed dark-green-board squint test. Round N winner. Color now reads as forest green at 80px thumbnail. |
```

Repeat for T03/T04/T05 with their own reason notes. v1 rows stay (registry is append-only per §6 of v1 bible).
