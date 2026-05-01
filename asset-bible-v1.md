# Foxglen Asset Bible — v1

**Phase 1 deliverable:** 16 hand-curated 3D-illustrated PNG assets to replace
the procedural-SVG-baked sprites in the Unity port. Target visual fidelity:
Royal Match tier. Generation pipeline: Midjourney v6.1 with `--sref` / `--cref`
locked families.

**Active port for consumption:** Unity (`/Users/cancermikli/disk/projects/unity/foxglen/`).
RN/Defold ports are frozen and do not consume this bundle.

---

## 0. Locked decisions (2026-05-01)

| | Decision |
|---|---|
| **Style anchor** | A — Royal Match-tier 3D plastic plush rendering. Foxglen brand DNA (Pip identity, forest-literal tile subjects) preserved on top. |
| **Pip eyes** | **Evolved.** Move from procedural dot eyes → large round cartoon eyes with white sparkle highlight (Toon Blast / Royal Match mascot expressiveness). All other Pip anatomy locked: orange radial fur, dark inner ears, cream muzzle + cheek ovals, Y-shape mouth. |
| **Tile subjects** | **Forest-literal.** Real mushroom (red cap + white dots), real four-leaf clover, real acorn (cap + body), real water dewdrop, real berry cluster, real six-petal bloom. Rendered with RM-tier glossy plastic-plush lighting, NOT abstract candy/jewel. |
| **Phase 1 scope** | 16 assets only. Chapter background paintings deferred to Phase 2 (asset style locked from Phase 1, will be consistent). |

---

## 1. Visual identity language

### 1.1 Lighting recipe (every asset, no exceptions)

- **Key light:** top-left 45°, warm 5500K, sharp specular highlight covering ~15% of upper-left surface
- **Bounce light:** bottom warm orange `#ffd9a0` @ 30%, soft fill
- **Rim light:** back-side cool cyan `#c8e8ff` @ 40%, thin contour separator
- **AO shadow:** baked under-shadow, deep `#1a0f08` @ 60%, soft falloff radius ~20% asset height

### 1.2 Material treatment

Semi-glossy plastic plush — polycarbonate + ceramic blend. Specular highlight is
sharp but small (upper-left only). Subtle sub-surface scattering hint at edges
(soft micro-glow, not pronounced). NO outlines. NO cell shading. NO flat colors.
NO Adobe Illustrator vector look. NO photorealistic texture (no skin pores, no
wood grain). The target is "premium mobile game tile", not "Pixar render" and
not "vector illustration."

### 1.3 Pip canonical lock

| Element | Lock |
|---|---|
| Body palette | Radial gradient: `#ffb366` light top → `#ea7b2a` mid → `#a24a13` deep bottom |
| Ears | Triangular, outer `#c85a1a`→`#7a3108` gradient, **dark inner triangle** (`#1a0f08`) |
| Muzzle | Cream `#fff5e6`, oval cheek patches same color |
| Blush | Subtle pink `#ffb4b4` @ 30% inside cheek ovals |
| Nose | Black `#1a0f08`, small triangle |
| Mouth | Black Y-shape line, small |
| **Eyes** | **NEW.** Large round (~14px diameter at 100px viewBox). White iris, black pupil, single white sparkle highlight upper-left of pupil (~3px). Shape varies per mood (see P01-P03). |
| Drop shadow | `0 8px 12px rgba(0,0,0,0.35)` baked into asset |

### 1.4 Tile canonical lock

| Tile | Subject | Primary palette | Defining feature |
|---|---|---|---|
| Mantar (T01) | Red-cap forest mushroom | `#e63946` cap, `#f5e6c8` stem | White dots on cap |
| Yonca (T02) | Four-leaf clover | `#6ab04c` leaves, `#3d6b2a` center | Heart-shaped leaves arranged in cross |
| Meşe (T03) | Plump acorn | `#f4b000` body, `#a76e00` cap | Textured cap covers top half, tiny stem |
| Çiy (T04) | Single water dewdrop | `#3ec1d3` translucent | Inner white highlight, refractive surface |
| Böğürtlen (T05) | Three-berry cluster | `#8b5cf6` berries | Small green leaf stem at top |
| Çiçek (T06) | Six-petal bloom | `#ff7a7a` petals, `#f4b000` center | Petals slight curl |

---

## 2. Master prompt spine

Every asset prompt is built as: `{subject_descriptor} + {common_spine} + {flags}`

### 2.1 Common spine (paste verbatim into every prompt)

```
mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration, no Adobe Illustrator look
```

### 2.2 Common flags

```
--ar 1:1 --v 6.1 --style raw --stylize 250
```

### 2.3 Negation library (append as needed)

- Always: `--no flat color, outline, cel shading`
- For Pip: add `--no body, torso, full body, legs, arms`
- For tiles: add `--no abstract, geometric, polygon`
- For specials: add `--no realistic photo, weapon, military`

---

## 3. Per-asset manifest

### 3.1 Tile family — generate T01 first, lock its `--sref`, then T02-T06

#### T01 — Mantar (Mushroom) — **STYLE ANCHOR, generates first**

```
/imagine prompt: classic plump red-cap forest mushroom, deep crimson red cap #e63946 with bright white round dots scattered on top, cream-beige cylindrical stem #f5e6c8 with subtle gradient, friendly cute round proportion, slight gloss on cap surface, mobile match-3 puzzle game asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left 45-degree key light, warm bottom bounce, cool cyan rim light, baked ambient occlusion shadow underneath, isolated on pure white background, centered square composition, hyperdetailed, octane render, soft ceramic shading, no flat colors, no outlines, no cell shading, no 2D illustration --ar 1:1 --v 6.1 --style raw --stylize 250 --no abstract, geometric, polygon
```

> **Generate 6 variations. Pick the one that:** has the cleanest specular highlight, white dots are clearly readable at 64px squint, stem-cap proportion matches a chunky forest mushroom (NOT a thin one). Save the chosen image URL — this becomes `<T01_URL>` for all subsequent tile sref locks.

#### T02 — Yonca (Clover)

```
/imagine prompt: cute four-leaf clover plant, four heart-shaped vibrant green leaves #6ab04c arranged in symmetric cross pattern, dark forest green center #3d6b2a, soft chunky plump proportion, dewy gloss on leaf surfaces, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, geometric, polygon
```

#### T03 — Meşe (Acorn)

```
/imagine prompt: realistic plump acorn nut, smooth golden-amber lower body #f4b000, textured deep brown scaly cap #a76e00 covering the top half with visible cross-hatch pattern, tiny brown stem on very top, glossy nut surface, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, geometric, polygon
```

#### T04 — Çiy (Dewdrop)

```
/imagine prompt: single perfect cyan teardrop water droplet, translucent #3ec1d3 with bright white inner highlight on left side, glassy refractive surface with subtle light caustics, faint cyan glow rim, plump teardrop shape pointed at top rounded at bottom, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, geometric, polygon, internal artifacts
```

#### T05 — Böğürtlen (Berry)

```
/imagine prompt: cluster of three round purple berries #8b5cf6, plump grape-like proportion arranged with one berry on top and two below, small fresh green leaf stem on very top, soft sub-surface scattering on berry skin, glossy fruit surface, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, geometric, polygon
```

#### T06 — Çiçek (Bloom)

```
/imagine prompt: six-petal pink bloom flower seen from above, soft coral pink petals #ff7a7a with slight upward curl at tips, golden yellow round center #f4b000 with subtle texture, dewy gloss on petals, symmetric six-petal arrangement, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, geometric, polygon
```

### 3.2 Special tile family — generate S01 first, lock sref, then S02-S04

#### S01 — Roket Yatay (Horizontal Rocket)

```
/imagine prompt: horizontal arrow rocket booster power-up tile, glossy white cylindrical body with bright red rocket racing stripes wrapping around, bright cyan glowing arrow tips pointing left and right out of the body, magical sparkle particles around it, energy aura, mobile match-3 power-up special tile, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no realistic photo, weapon, military, abstract
```

> Generate 6 variations. Pick the one with the clearest read at 64px (arrows must be unambiguous). Save URL as `<S01_URL>`.

#### S02 — Roket Dikey (Vertical Rocket)

```
/imagine prompt: vertical arrow rocket booster power-up tile, glossy white cylindrical body with bright red rocket racing stripes wrapping around, bright cyan glowing arrow tips pointing up and down out of the body, magical sparkle particles around it, energy aura, mobile match-3 power-up special tile, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <S01_URL> --no realistic photo, weapon, military, abstract
```

#### S03 — Bomba (Pinecone Bomb)

```
/imagine prompt: glossy brown pinecone forest bomb, scaled woody texture, four bright white sparkle dots placed at compass points (top, bottom, left, right) around the cone, faint amber glow underneath suggesting magical fuse, plump rounded proportion, mobile match-3 power-up special tile, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no realistic photo, weapon, military, abstract
```

#### S04 — Gökkuşağı (Rainbow universal tile)

```
/imagine prompt: magical rainbow universal power-up tile, six color petals (red orange yellow green blue purple) radiating outward from a glowing pure white spherical center, prismatic shimmer, magical aura particles, mobile match-3 rainbow ball power-up, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no realistic photo, abstract
```

### 3.3 Pip family — generate P01 first (HIGH ITERATION BUDGET), lock cref, then P02-P03

#### P01 — Pip Happy (Home avatar, default)

```
/imagine prompt: cute 3D rendered cartoon fox character, head only no body, vibrant orange radial fur gradient (light peach #ffb366 top fading to deep amber #a24a13 bottom), small triangular ears with black inner triangles #1a0f08, cream-white muzzle and oval cheek patches with subtle pink blush #ffb4b4, large round expressive cartoon eyes with single white sparkle highlight in upper-left of pupil, U-curve happy smiling closed eyes, small black triangle nose with Y-shape mouth below, soft drop shadow underneath, friendly forest mascot personality, Toon Blast Royal Match plush quality, mobile game character, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --no body, torso, full body, legs, arms, fox tail, realistic
```

> **CRITICAL: Generate 8 variations minimum.** Pip identity reverted once before
> (2026-05-01 morning). Brand DNA non-negotiable. Compare each variation against
> Pip canonical lock (§1.3). Reject any with: wrong fur color (too brown / too
> red / too yellow), wrong ear shape (round / no inner triangle), missing muzzle
> pattern, wrong eye style. **If 8 variations all fail brand check, do NOT pick
> "least-bad" — escalate to commission path (B3 fallback).** Save winning URL as
> `<P01_URL>`.

#### P02 — Pip Neutral (Pause modal, idle moments)

```
/imagine prompt: same fox character as reference, calm neutral relaxed expression, large round eyes with black pupils and white sparkle highlight (eyes OPEN, not closed), slightly closed mouth in soft Y-shape, slight head tilt, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --cref <P01_URL> --cw 100 --no body, torso, full body, legs, arms, fox tail, realistic
```

#### P03 — Pip Cheering (Result win, celebration)

```
/imagine prompt: same fox character as reference, cheering excited celebratory expression, large round sparkling eyes (wide open, with multiple highlights), open smiling mouth showing tiny tongue, slight head tilt upward, faint sparkle particles around head suggesting joy, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --cref <P01_URL> --cw 100 --no body, torso, full body, legs, arms, fox tail, realistic
```

### 3.4 Side icon family — generate I01 first, lock sref, then I02-I03

#### I01 — Günlük (Daily reward chest)

```
/imagine prompt: wooden treasure chest icon, warm oak wood texture with visible grain, golden brass trim and lock plate, slightly open lid revealing soft warm yellow glow inside, friendly forest mascot game style, mobile match-3 daily reward chest button, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <T01_URL> --no abstract, photorealistic, dark fantasy
```

> Save winning URL as `<I01_URL>`.

#### I02 — Mağaza (Shop)

```
/imagine prompt: wooden market basket icon, warm oak weave texture, filled with overflowing golden coins and soft orange glow, friendly forest market shop, mobile match-3 shop button, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <I01_URL> --no abstract, photorealistic
```

#### I03 — Ses (Sound toggle)

```
/imagine prompt: wooden megaphone icon, warm oak texture with visible grain, golden brass trim and rim, three glowing cyan sound wave arcs emanating outward to the right, friendly forest game style, mobile match-3 audio toggle button, [COMMON SPINE] --ar 1:1 --v 6.1 --style raw --stylize 250 --sref <I01_URL> --no abstract, photorealistic
```

---

## 4. Generation workflow

### 4.1 Strict generation order

Order matters because every family is sref/cref-locked to its first member.
Skipping ahead breaks consistency.

| Step | Asset | Lock dependency |
|---|---|---|
| 1 | T01 Mantar | None — style anchor |
| 2 | T02-T06 (5 tiles) | `--sref <T01_URL>` |
| 3 | S01 Roket Yatay | `--sref <T01_URL>` |
| 4 | S02 Roket Dikey | `--sref <S01_URL>` (rocket family internal) |
| 5 | S03 Bomba | `--sref <T01_URL>` |
| 6 | S04 Gökkuşağı | `--sref <T01_URL>` |
| 7 | P01 Pip Happy | None — Pip baseline |
| 8 | P02 Pip Neutral | `--cref <P01_URL> --cw 100` |
| 9 | P03 Pip Cheering | `--cref <P01_URL> --cw 100` |
| 10 | I01 Günlük | `--sref <T01_URL>` |
| 11 | I02 Mağaza | `--sref <I01_URL>` (icon family internal) |
| 12 | I03 Ses | `--sref <I01_URL>` |

### 4.2 Iteration budget per family

| Family | Variations per asset | Max rounds | Escalation if budget exhausted |
|---|---|---|---|
| Tiles (T01-T06) | 6 | 3 prompt revisions | Re-anchor T01 with stronger style cue |
| Specials (S01-S04) | 6 | 4 prompt revisions | Drop common spine, try `--style raw 0` |
| Pip (P01-P03) | **8** | **6 prompt revisions** | **Commission illustrator (B3 path)** |
| Icons (I01-I03) | 6 | 3 prompt revisions | Re-anchor I01 |

### 4.3 Quality gates

Each finalist must pass all three:

1. **5-meter squint test** — clear silhouette + readable subject from across the room
2. **64×64 thumbnail test** — downsample to icon size, still recognizable
3. **Brand DNA check (Pip only)** — every canonical-lock element from §1.3 present and correct

### 4.4 Background removal

Midjourney outputs come on pure white BG. Remove via:
- ClipDrop "Remove Background" (free tier) — best for edges
- Photoshop AI "Remove Background" — best for complex hair/fur
- remove.bg — fastest for batch

Save final as PNG with alpha. Verify transparency at edge by checking against
both light and dark Unity scene backgrounds.

---

## 5. Quality registry (filled as we go)

> Update this section as assets are finalized. Each row records the chosen URL,
> any failed-rounds notes, and the verification result.

| ID | Status | URL | Notes |
|---|---|---|---|
| T01 Mantar | ⬜ pending | — | — |
| T02 Yonca | ⬜ pending | — | — |
| T03 Meşe | ⬜ pending | — | — |
| T04 Çiy | ⬜ pending | — | — |
| T05 Böğürtlen | ⬜ pending | — | — |
| T06 Çiçek | ⬜ pending | — | — |
| S01 Roket Yatay | ⬜ pending | — | — |
| S02 Roket Dikey | ⬜ pending | — | — |
| S03 Bomba | ⬜ pending | — | — |
| S04 Gökkuşağı | ⬜ pending | — | — |
| P01 Pip Happy | ⬜ pending | — | — |
| P02 Pip Neutral | ⬜ pending | — | — |
| P03 Pip Cheering | ⬜ pending | — | — |
| I01 Günlük | ⬜ pending | — | — |
| I02 Mağaza | ⬜ pending | — | — |
| I03 Ses | ⬜ pending | — | — |

---

## 6. Iteration log (append, never edit)

> Log every prompt revision and rejected generation here. Future iterations
> read this to avoid repeating mistakes.

(empty — first generation pass not started)

---

## 7. Output layout

```
foxglen-content/
├── content-v4.json
├── atmosphere-v1.json
├── asset-bible-v1.md            ← this file
└── assets/
    └── icons-v2/
        ├── manifest.json        ← {version:1, assets:[{id,url,size,checksum}]}
        ├── tiles/
        │   ├── T01-mushroom.png       (1024×1024 source)
        │   ├── T01-mushroom@2x.png    (512×512)
        │   ├── T01-mushroom@1x.png    (256×256)
        │   ├── T02-clover.png
        │   └── ...
        ├── specials/
        │   ├── S01-rocket-h.png
        │   └── ...
        ├── pip/
        │   ├── P01-happy.png
        │   ├── P02-neutral.png
        │   └── P03-cheering.png
        └── icons/
            ├── I01-daily.png
            ├── I02-shop.png
            └── I03-sound.png
```

### 7.1 Manifest schema

```json
{
  "version": 1,
  "generated_at": "2026-05-01T00:00:00Z",
  "assets": [
    {
      "id": "T01",
      "kind": "tile",
      "name": "mushroom",
      "url_1x": "https://ccermikli58.github.io/foxglen-content/assets/icons-v2/tiles/T01-mushroom@1x.png",
      "url_2x": "https://...@2x.png",
      "url_src": "https://...mushroom.png",
      "size_1x": 256,
      "size_2x": 512,
      "size_src": 1024,
      "sha256": "..."
    }
  ]
}
```

---

## 8. Unity integration (forward-looking — covered by writing-plans next)

The next step after this bible is approved is a writing-plans pass for the
Unity-side migration. Outline:

- `IconLibrary.GetHD(id)` async accessor — returns Sprite from cached PNG
- Boot fetch of `manifest.json` (parallel to content + atmosphere bundles)
- `Foxglen/TileFX` shader gains `_HasHDTexture` keyword — when set, skip the
  rim/AO/specular procedural passes (PNG already includes them)
- Migration touchpoints (consumer files): `HomeController`, `BoardController`,
  `FriendsOverlay`, `PipBeatController`, `ResultPanel`, `PauseMenu`,
  `PreLevelCard`, `ShopOverlay`
- Fallback: missing HD asset → procedural fallback (current `IconLibrary.Get`)
- Animation impact: Pip eye-blink + ear-twitch micro-anims removed (baked into
  PNG); scale breathing + position bobbing + sparkle + mood-swap preserved

The Phase 1 deliverable boundary is: bible approved + 16 assets generated +
manifest published. Unity migration is the Phase 2 plan.
