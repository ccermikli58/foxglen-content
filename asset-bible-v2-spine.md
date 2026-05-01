# Foxglen Asset Bible — v2 (Spine 2D Pip Rig)

**Phase 3 deliverable:** Replace the Home avatar's procedural sprite-swap
animation pipeline with a Spine 2D skeletal rig. Pip becomes a layered
illustrated character (~14 PNG body parts) on a bone skeleton with
authored animation curves. Rendered via `spine-unity` `SkeletonGraphic`.

**Why:** Phase 2 dropped HD PNGs into 13 Pip render surfaces. 12 are
static and look RM-tier. The Home avatar (driven by `PipBeatController`)
cycles through 8 moods → mixed HD/procedural produced visible flicker.
Phase 2.5 reverted the avatar to procedural-only. Phase 3 closes the
gap: Royal Match-tier animated avatar via Spine rig.

**Active port:** Unity (`/Users/cancermikli/disk/projects/unity/foxglen/`).
Branch: `feat/hd-asset-integration` (still open, will merge after Phase 3
verifies clean).

---

## 0. Locked decisions (2026-05-01)

| | Decision |
|---|---|
| **Path** | C2 hybrid — single-source segmentation of P01 (no Photoshop dependency) |
| **Source asset** | `assets/icons-v2/pip/P01-happy.png` (Phase 2 anchor, brand-locked) |
| **Segmentation tool** | Meta AI **SAM** (Segment Anything Model) — Python, free, ~2GB model |
| **Animation tool** | **Spine 2D Essential** ($69, paid by user) |
| **Unity runtime** | `spine-unity` 4.2.x (free, official package via Git URL) |
| **Body parts target** | 14 layered PNGs (see §3) |
| **Animation count** | 8-12 named animations (see §4) |
| **Time estimate** | ~1 week — 5 days bot work + 4-6h user manual Spine Editor authoring |

---

## 1. Body parts manifest

P01 will be segmented into these layers. Each layer is a separate alpha-channel PNG, exported at 1024×1024 source resolution to preserve detail.

### 1.1 Static body (1 layer)

| Layer ID | Name | Description |
|---|---|---|
| `body_base` | Pip head + body silhouette | Orange fluffy body without ears/eyes/mouth/cheeks. Forms the rigid root attachment. |

### 1.2 Ears (2 layers)

| Layer ID | Name | Description |
|---|---|---|
| `ear_L` | Left ear | Triangular ear with dark inner triangle. Rigged as separate bone for twitch animation. |
| `ear_R` | Right ear | Mirror of left. Independent bone. |

### 1.3 Eyes (5 layers — frame-swap attachments)

| Layer ID | Name | Description | Source |
|---|---|---|---|
| `eyes_open` | Default open eyes | Big round black pupils + white sparkle highlight upper-left | P01 segmentation |
| `eyes_blink` | Closed eyes | U-curve smile lines (^_^) | **MJ extra generation** |
| `eyes_wink_R` | Right wink | Right closed (U-curve), left open (round + sparkle) | **MJ extra generation** |
| `eyes_lookside_L` | Look left | Pupils shifted left | Procedural or **MJ** |
| `eyes_lookside_R` | Look right | Pupils shifted right | Procedural or **MJ** |
| `eyes_lookup` | Look up | Pupils shifted up + smaller eyelid arc | **MJ extra generation** |

(Eyes share same socket bone, swap between attachments per mood.)

### 1.4 Mouth (4 layers — frame-swap attachments)

| Layer ID | Name | Description | Source |
|---|---|---|---|
| `mouth_resting` | Y-shape neutral | Default closed Y mouth | P01 segmentation |
| `mouth_smile` | Happy smile | Slight upward Y curve | P01 segmentation (alternate frame) or **MJ** |
| `mouth_open` | Open smile + tongue | P03 cheering mouth | Segment from P03-cheering.png |
| `mouth_yawn` | Wide yawn | Open oval, no tongue | **MJ extra generation** |

(Mouth shares same socket bone, swaps between attachments.)

### 1.5 Surface decorations (2 layers, optional overlay)

| Layer ID | Name | Description |
|---|---|---|
| `cheek_blush_L` / `_R` | Pink cheek dots | Soft pink ovals, additive blend |
| `sparkles_overlay` | Cheering sparkles | Stars + glow particles around head (P03 element) |

**Total: ~14 PNG layers** (1 body + 2 ears + 6 eyes + 4 mouth + 2 surface = 15, with optional sparkles overlay).

---

## 2. Extra MJ generations needed

5-7 ek MJ generation. All sref-locked to P01 URL for character consistency.

### 2.1 eyes_blink (closed U-curve)

```
isolated cute fox face with eyes closed in happy U-curve smile shape (^_^), only the closed eye lines visible on white background, vibrant orange fox fur around eyes, small triangular ears, cream muzzle visible at bottom, mobile match-3 puzzle game character asset, Royal Match style 3D rendered plastic plush material, semi-glossy specular highlight top-left, no flat colors, no outlines, no cell shading, no 2D illustration, no open eyes, no anime --cref https://cdn.midjourney.com/8f5951c9-9e32-409f-b02c-66a2e30a23cc/0_0.png
```

### 2.2 eyes_wink_R (right closed, left open)

```
isolated cute fox face winking with right eye closed in U-curve smile and left eye open with white sparkle highlight, vibrant orange fox fur, small triangular ears, cream muzzle, playful expression, mobile match-3 puzzle game character asset, Royal Match style 3D rendered plastic plush material, no flat colors, no outlines, no anime --cref https://cdn.midjourney.com/8f5951c9-9e32-409f-b02c-66a2e30a23cc/0_0.png
```

### 2.3 eyes_lookup (gaze upward)

```
isolated cute fox face with both eyes shifted upward looking at sky, large round black pupils positioned in upper portion of eye whites with white sparkle highlight, vibrant orange fox fur, small triangular ears, cream muzzle, curious upward gaze, mobile match-3 puzzle game character asset, Royal Match style 3D rendered plastic plush material, no flat colors, no outlines, no anime --cref https://cdn.midjourney.com/8f5951c9-9e32-409f-b02c-66a2e30a23cc/0_0.png
```

### 2.4 mouth_yawn (wide open)

```
isolated cute fox face yawning with wide open oval pink mouth, eyes squinted closed in arc shape, vibrant orange fox fur, small triangular ears, cream muzzle around the open mouth, sleepy yawn expression, mobile match-3 puzzle game character asset, Royal Match style 3D rendered plastic plush material, no flat colors, no outlines, no tongue showing, no teeth, no anime --cref https://cdn.midjourney.com/8f5951c9-9e32-409f-b02c-66a2e30a23cc/0_0.png
```

### 2.5 (optional) eyes_lookside_L / _R

Lookside variants — can be generated via MJ OR achieved purely in Spine
by procedurally translating the pupil attachment offset (no extra
generation needed if Spine bone offset technique used).

**Recommendation:** skip MJ for lookside variants, use Spine bone-offset
animation technique (procedural transform of the eye attachment in
Spine — saves 2 generations + maintains crisper alignment).

---

## 3. Pipeline — automated steps (Python tooling)

### 3.1 SAM segmentation script

**File:** `foxglen-content/scripts/segment-pip.py`

```python
# Pseudocode — actual script written during execution
import torch
from segment_anything import sam_model_registry, SamPredictor
from PIL import Image
import numpy as np

# Load SAM model (vit_h checkpoint, ~2.5GB)
sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h.pth")
predictor = SamPredictor(sam)

# Load P01
image = np.array(Image.open("assets/icons-v2/pip/P01-happy.png"))
predictor.set_image(image)

# User-confirmed bounding boxes (we'll preview SAM output, user clicks/types):
parts = {
    "ear_L":     (x1, y1, x2, y2),  # left ear bbox
    "ear_R":     (x1, y1, x2, y2),
    "eyes_open": (x1, y1, x2, y2),
    "mouth_resting": (...),
    "cheek_L":   (...),
    "cheek_R":   (...),
    "body_base": (full image minus parts above),  # complement mask
}

for part_id, bbox in parts.items():
    masks, scores, _ = predictor.predict(box=np.array(bbox))
    best_mask = masks[scores.argmax()]
    output = apply_mask_to_image(image, best_mask)
    output.save(f"assets/icons-v2/pip-spine/{part_id}.png")
```

**My job:** write the actual script, install SAM, run on P01, preview
output, iterate until clean segmentation.

**Your job:** approve segmentation visually before next step.

### 3.2 Spine atlas + skeleton JSON generator

**File:** `foxglen-content/scripts/build-spine-rig.py`

Generates:
- `Pip.atlas` — texture atlas mapping (Spine atlas format)
- `Pip.json` — skeleton hierarchy (bones, slots, attachments, default skin)
- `Pip.png` — packed atlas image (Pillow `pack` algorithm)

Skeleton structure:

```
root
├── body (slot: body_base attachment)
│   ├── head_pivot (transform bone — center of head)
│   │   ├── ear_L_bone (slot: ear_L)
│   │   ├── ear_R_bone (slot: ear_R)
│   │   ├── eye_socket (slot: eyes — swappable: open/blink/wink_R/lookup/lookside_L/_R)
│   │   ├── mouth_socket (slot: mouth — swappable: resting/smile/open/yawn)
│   │   └── cheek_pivots (slots: cheek_blush_L/_R)
│   └── overlay_pivot (slot: sparkles_overlay — visible only on cheer)
```

### 3.3 Animation list (8 named animations)

These will be generated as **placeholder skeleton timelines** with bone
keyframes. User authors final timing curves in Spine Editor.

| Animation name | Duration | Body parts moved | Notes |
|---|---|---|---|
| `idle_breath` | 1.6s loop | body scale + slight head Y bob | Sine wave easing |
| `idle_blink` | 0.18s | eyes attachment swap (open → blink → open) | Brief, fires every ~4-6s in Unity controller |
| `idle_ear_twitch_L` | 0.3s | ear_L_bone rotate -10° → 0° | Quick wiggle |
| `idle_ear_twitch_R` | 0.3s | ear_R_bone rotate +10° → 0° | Mirror |
| `idle_lookside_L` | 0.6s | eye_socket translate left + slight head_pivot rotate | Stays for ~1s then idle returns |
| `idle_lookside_R` | 0.6s | mirror | |
| `idle_yawn` | 1.2s | mouth attachment swap (resting → yawn → resting) + head tilt | Long animation |
| `react_cheer` | 0.5s | mouth swap (smile → open) + sparkles_overlay enable + body scale punch | Fires on tap reaction |

### 3.4 Unity migration plan

**Files modified:**
- `Assets/Scripts/Game/PipBeatController.cs` — refactor mood cycle to `SkeletonAnimation.AnimationState.SetAnimation()`
- `Assets/Scripts/Game/HomeController.cs:1029-1044` — replace `Image` component with `SkeletonGraphic`, attach Spine asset

**Files created:**
- `Assets/Spine/Pip/Pip.skel` (or `.json` + .skel.bytes)
- `Assets/Spine/Pip/Pip.atlas`
- `Assets/Spine/Pip/Pip.png`
- `Assets/Spine/Pip/Pip_SkeletonData.asset` (Unity Spine import auto-generates)

**Spine Unity package install:**

```
Window → Package Manager → + → Add package from git URL:
https://github.com/EsotericSoftware/spine-runtimes.git?path=spine-unity/Modules#4.2
```

**Code refactor outline (PipBeatController):**

```csharp
// BEFORE (Phase 2.5 — procedural)
void SwapMood(PipArt.Mood m) {
    headImg.sprite = PipArt.Head(headSizePx, m);
}

// AFTER (Phase 3 — Spine)
[SerializeField] SkeletonGraphic skeletonGraphic;

void PlayAnimation(string name, bool loop = false) {
    skeletonGraphic.AnimationState.SetAnimation(0, name, loop);
}

void Idle() {
    skeletonGraphic.AnimationState.SetAnimation(0, "idle_breath", true);
}

void Blink() {
    skeletonGraphic.AnimationState.AddAnimation(1, "idle_blink", false, 0);
    // returns to idle automatically
}

void React() {
    skeletonGraphic.AnimationState.SetAnimation(0, "react_cheer", false);
    skeletonGraphic.AnimationState.AddAnimation(0, "idle_breath", true, 0);
}
```

---

## 4. Generation order — strict execution sequence

| Step | Task | Time | Owner |
|---|---|---|---|
| 1 | Install SAM (`pip install segment-anything torch torchvision`, download vit_h checkpoint ~2.5GB) | 10 min | bot |
| 2 | Write `segment-pip.py` script | 30 min | bot |
| 3 | User confirms part bounding boxes via interactive preview | 15 min | user |
| 4 | Run SAM on P01, output 7 base layers (body + ears + eyes_open + mouth_resting + cheeks) | 5 min | bot |
| 5 | Visual review of segmentation quality | 15 min | user |
| 6 | Generate 4 ek MJ assets (eyes_blink, eyes_wink_R, eyes_lookup, mouth_yawn) | 30 min | user |
| 7 | Process MJ outputs (rembg + crop) | 10 min | bot |
| 8 | Build atlas + skeleton JSON via `build-spine-rig.py` | 30 min | bot |
| 9 | Test load skeleton in Spine Editor — verify bone hierarchy + slot attachments | 30 min | user |
| 10 | User authors animation curves in Spine Editor (8 animations) | 4-6h | user |
| 11 | Export skeleton + atlas from Spine ($69 Essential allows export) | 10 min | user |
| 12 | Install spine-unity package in Unity | 5 min | bot |
| 13 | Import Pip.skel + atlas into Assets/Spine/Pip/ | 5 min | bot |
| 14 | Refactor HomeController + PipBeatController to use SkeletonGraphic | 1h | bot |
| 15 | Play mode test + screenshot verification | 30 min | both |
| 16 | Final commit + tag + merge `feat/hd-asset-integration → main` | 15 min | bot |

**Total elapsed: ~1 week** (mostly waiting on user time slots — Spine Editor work + MJ generation)

**Bot active work: ~3-4 hours** (script writing + integration)

---

## 5. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| SAM segmentation produces ragged edges on fluffy fur | High | Extra Pillow alpha-erosion + manual cleanup pass; OR fall back to manually-traced mask via free GIMP |
| MJ ek mood gens have positional drift vs P01 baseline | Medium | sref-lock to P01 URL, accept ±5% pixel drift, align in Spine via slot offset |
| User finds Spine Editor too steep | Medium | Provide step-by-step animation authoring guide; OR escalate to Fiverr Spine rigger ($150-300) at step 10 |
| spine-unity package conflicts with PrimeTween or existing Animator | Low | Spine has own animation system, runs parallel — conflict unlikely |
| Performance hit on Home (SkeletonGraphic vs Image) | Low | Spine optimized, ~0.2ms/frame; Image was ~0.1ms — negligible |
| Phase 3 takes longer than 1 week, project stalls | Medium | Phase 2.5 already shipped flicker fix — game is shippable in current state, Phase 3 is enhancement |

---

## 6. Success criteria

Phase 3 done when:

1. ✅ Pip avatar on Home renders Spine skeleton (no procedural sprite, no static HD)
2. ✅ All 8 named animations play correctly (visible in Game view)
3. ✅ Idle blink + ear twitch + look-side cycle smoothly with no flicker
4. ✅ Tap reaction triggers `react_cheer` animation (sparkles overlay shows briefly)
5. ✅ All 157+ EditMode tests still pass (no regression on engine/atmosphere/asset manifest)
6. ✅ Branch `feat/hd-asset-integration` merges to `main` cleanly

When all 6 criteria met → Phase 3 complete → merge to main → Phase 2 + Phase 3 ship together as a single release.

---

## 7. Future Phase 4+ (out of scope)

- Same Spine pipeline for Pip's animated full-body version (when user wants Pip walking on map)
- Friend characters (T01-T06 critters) as Spine rigs (currently procedural via `IconLibrary.GetFriendPortrait`)
- Boot splash Pip transition as Spine animation (currently HD static)
