"""
Segment Pip P01 into body part layers via SAM (Segment Anything Model).

Phase 3 — Spine 2D rig pipeline (foxglen-content/asset-bible-v2-spine.md §3.1).

Usage:
    # Step 1 — generate all candidate masks via auto-mode:
    python3 scripts/segment-pip.py auto

    # Step 2 — manual review + assign body part IDs to mask numbers:
    python3 scripts/segment-pip.py assign

    # Step 3 — extract assigned parts as separate alpha PNGs:
    python3 scripts/segment-pip.py extract

Inputs:
    assets/icons-v2/pip/P01-happy.png  (1024×1024 source)
    /tmp/sam_vit_h.pth                  (SAM checkpoint, downloaded)

Outputs (assets/icons-v2/pip-spine/):
    auto-preview.png         — all masks composited with numbered overlays
    candidates/{N}.png       — each candidate mask as alpha PNG
    body_base.png            — final extracted layers (after assign)
    ear_L.png
    ear_R.png
    eyes_open.png
    mouth_resting.png
    cheek_L.png
    cheek_R.png
"""
import sys
import os
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
import cv2

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/icons-v2/pip/P01-happy.png"
OUT_DIR = ROOT / "assets/icons-v2/pip-spine"
CANDIDATES_DIR = OUT_DIR / "candidates"
CHECKPOINT = "/tmp/sam_vit_h.pth"
ASSIGNMENT_FILE = OUT_DIR / "assignment.json"

# SAM AutomaticMaskGenerator uses float64 internally which MPS doesn't support.
# Falling back to CPU — slower (~3-5min) but reliable on Apple Silicon.
DEVICE = "cpu"

PART_IDS = [
    "body_base",
    "ear_L",
    "ear_R",
    "eye_L_open",
    "eye_R_open",
    "mouth_resting",   # includes nose (combined SAM mask 18)
    "cheek_L",
    "cheek_R",
    "head_tuft",       # bonus — small orange tuft on top of head
]


def load_sam():
    from segment_anything import sam_model_registry, SamAutomaticMaskGenerator
    print(f"[sam] loading vit_h on device={DEVICE} (~30sn)…")
    sam = sam_model_registry["vit_h"](checkpoint=CHECKPOINT)
    sam.to(device=DEVICE)
    return sam


def auto_mode():
    """Run SAM AutomaticMaskGenerator → output candidate masks + composite preview."""
    from segment_anything import SamAutomaticMaskGenerator

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)

    image = np.array(Image.open(SOURCE).convert("RGB"))
    print(f"[input] {SOURCE} shape={image.shape}")

    sam = load_sam()
    mask_gen = SamAutomaticMaskGenerator(
        model=sam,
        points_per_side=32,
        pred_iou_thresh=0.88,
        stability_score_thresh=0.92,
        crop_n_layers=1,
        crop_n_points_downscale_factor=2,
        min_mask_region_area=2000,  # ignore tiny specks
    )

    print("[sam] generating masks (~1-2dk on MPS)…")
    masks = mask_gen.generate(image)

    # Sort by area descending so candidate 1 = largest = body
    masks.sort(key=lambda m: m["area"], reverse=True)
    print(f"[sam] found {len(masks)} candidate masks")

    # Save each candidate as alpha PNG
    for i, m in enumerate(masks, start=1):
        seg = m["segmentation"].astype(np.uint8) * 255
        rgba = np.dstack([image, seg])
        cand_img = Image.fromarray(rgba, mode="RGBA")
        cand_img.save(CANDIDATES_DIR / f"{i:02d}.png")

    # Build composite preview with numbered overlays
    preview = image.copy()
    overlay = np.zeros_like(image)
    colors = [
        (255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0),
        (255, 0, 255), (0, 255, 255), (255, 128, 0), (128, 0, 255),
        (255, 128, 128), (128, 255, 128), (128, 128, 255), (255, 255, 128),
        (255, 128, 255), (128, 255, 255), (200, 100, 50), (100, 200, 50),
    ]
    for i, m in enumerate(masks):
        color = colors[i % len(colors)]
        seg = m["segmentation"]
        overlay[seg] = color
    blend = cv2.addWeighted(preview, 0.6, overlay, 0.4, 0)

    # Annotate centroids with mask number
    pil_blend = Image.fromarray(blend)
    draw = ImageDraw.Draw(pil_blend)
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except Exception:
        font = ImageFont.load_default()
    for i, m in enumerate(masks, start=1):
        seg = m["segmentation"]
        ys, xs = np.where(seg)
        if len(xs) == 0:
            continue
        cx, cy = int(xs.mean()), int(ys.mean())
        # White outline + black text for readability
        for dx in (-2, -1, 0, 1, 2):
            for dy in (-2, -1, 0, 1, 2):
                draw.text((cx + dx, cy + dy), str(i), fill="white", font=font)
        draw.text((cx, cy), str(i), fill="black", font=font)

    pil_blend.save(OUT_DIR / "auto-preview.png")
    print(f"[done] preview written: {OUT_DIR / 'auto-preview.png'}")
    print(f"[done] {len(masks)} candidates in: {CANDIDATES_DIR}")
    print()
    print("Next: open auto-preview.png, identify which numbered region maps to which body part.")
    print("Then edit assignment.json with the numbers, run: python3 segment-pip.py extract")

    # Write a starter assignment template
    template = {part: None for part in PART_IDS}
    template["__hint"] = "fill in candidate numbers (e.g. body_base: 1) by inspecting auto-preview.png"
    with open(ASSIGNMENT_FILE, "w") as f:
        json.dump(template, f, indent=2)
    print(f"[done] assignment template: {ASSIGNMENT_FILE}")


def extract_mode():
    """Read assignment.json, copy candidate masks to named body part PNGs."""
    if not ASSIGNMENT_FILE.exists():
        sys.exit(f"missing {ASSIGNMENT_FILE} — run 'auto' first then edit.")

    with open(ASSIGNMENT_FILE) as f:
        assignment = json.load(f)

    missing = [p for p in PART_IDS if assignment.get(p) is None]
    if missing:
        sys.exit(f"assignment.json incomplete — missing: {missing}")

    for part_id in PART_IDS:
        cand_num = assignment[part_id]
        cand_path = CANDIDATES_DIR / f"{cand_num:02d}.png"
        out_path = OUT_DIR / f"{part_id}.png"
        if not cand_path.exists():
            sys.exit(f"candidate {cand_num} not found at {cand_path}")
        # Copy + alpha-clean
        img = Image.open(cand_path).convert("RGBA")
        # Tight crop to alpha bounding box for Spine atlas efficiency
        bbox = img.getbbox()
        if bbox:
            img = img.crop(bbox)
        img.save(out_path)
        print(f"[extract] {part_id} ← candidate {cand_num:02d} → {out_path} ({img.size})")

    print(f"[done] {len(PART_IDS)} body parts extracted to {OUT_DIR}/")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("auto", "extract"):
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == "auto":
        auto_mode()
    elif sys.argv[1] == "extract":
        extract_mode()


if __name__ == "__main__":
    main()
