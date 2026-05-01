"""
Segment P03 (Pip Cheering) into mouth_open + sparkles_overlay.

Phase 3 step 4 — extract additional mood attachments from P03 source.
Reuses SAM AutomaticMaskGenerator (CPU mode).

Outputs to assets/icons-v2/pip-spine-p03/:
    auto-preview.png          — numbered overlay
    candidates/{N}.png        — all SAM masks
    (extract step is manual after user reviews — copy candidates/NN.png
     to ../pip-spine/mouth_open.png and ../pip-spine/sparkles_overlay.png)
"""
import sys
from pathlib import Path
import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
import cv2
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/icons-v2/pip/P03-cheering.png"
OUT_DIR = ROOT / "assets/icons-v2/pip-spine-p03"
CANDIDATES_DIR = OUT_DIR / "candidates"
CHECKPOINT = "/tmp/sam_vit_h.pth"

OUT_DIR.mkdir(parents=True, exist_ok=True)
CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)

image = np.array(Image.open(SOURCE).convert("RGB"))
print(f"[input] {SOURCE} shape={image.shape}")

print("[sam] loading vit_h on CPU (~30sn)…")
sam = sam_model_registry["vit_h"](checkpoint=CHECKPOINT)
sam.to(device="cpu")

mask_gen = SamAutomaticMaskGenerator(
    model=sam,
    points_per_side=32,
    pred_iou_thresh=0.88,
    stability_score_thresh=0.92,
    crop_n_layers=1,
    crop_n_points_downscale_factor=2,
    min_mask_region_area=1500,
)

print("[sam] generating masks (~3min)…")
masks = mask_gen.generate(image)
masks.sort(key=lambda m: m["area"], reverse=True)
print(f"[sam] found {len(masks)} candidates")

for i, m in enumerate(masks, start=1):
    seg = m["segmentation"].astype(np.uint8) * 255
    rgba = np.dstack([image, seg])
    Image.fromarray(rgba, mode="RGBA").save(CANDIDATES_DIR / f"{i:02d}.png")

# Composite preview
preview = image.copy()
overlay = np.zeros_like(image)
colors = [(255,0,0),(0,255,0),(0,0,255),(255,255,0),(255,0,255),
          (0,255,255),(255,128,0),(128,0,255),(255,128,128),(128,255,128),
          (128,128,255),(255,255,128),(255,128,255),(128,255,255)]
for i, m in enumerate(masks):
    overlay[m["segmentation"]] = colors[i % len(colors)]
blend = cv2.addWeighted(preview, 0.6, overlay, 0.4, 0)

pil = Image.fromarray(blend)
draw = ImageDraw.Draw(pil)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
except Exception:
    font = ImageFont.load_default()
for i, m in enumerate(masks, start=1):
    ys, xs = np.where(m["segmentation"])
    if len(xs) == 0: continue
    cx, cy = int(xs.mean()), int(ys.mean())
    for dx in (-2,-1,0,1,2):
        for dy in (-2,-1,0,1,2):
            draw.text((cx+dx, cy+dy), str(i), fill="white", font=font)
    draw.text((cx, cy), str(i), fill="black", font=font)

pil.save(OUT_DIR / "auto-preview.png")
print(f"[done] preview: {OUT_DIR/'auto-preview.png'}")
print(f"[done] {len(masks)} candidates: {CANDIDATES_DIR}")
