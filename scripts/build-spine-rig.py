"""
Build Spine 2D rig from segmented Pip body parts.

Generates:
    pip-spine/Pip.atlas       — Spine atlas mapping (text format)
    pip-spine/Pip.json        — Spine skeleton JSON (bones + slots + skin)
    pip-spine/Pip.png         — packed atlas image (Pillow)
    pip-spine/Pip.skel        — Spine binary skel format (post-import in Spine Editor)

Run:
    python3 scripts/build-spine-rig.py

Inputs (assets/icons-v2/pip-spine/):
    body_base.png, ear_L.png, ear_R.png,
    eye_L_open.png, eye_R_open.png,
    eye_L_blink.png (optional, from MJ ek gen),
    eye_R_blink.png (optional),
    mouth_resting.png, mouth_open.png (optional, from P03 segment),
    mouth_yawn.png (optional, from MJ ek gen),
    cheek_L.png, cheek_R.png,
    head_tuft.png,
    sparkles_overlay.png (optional, from P03 segment),
    P01-happy.png (reference for offset alignment)
"""
import json
import sys
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / "assets/icons-v2/pip-spine"
P01_SOURCE = ROOT / "assets/icons-v2/pip/P01-happy.png"

# Spine 4.2 schema version
SPINE_VERSION = "4.2.83"

# Atlas + skeleton output
ATLAS_PATH = PARTS_DIR / "Pip.atlas"
SKEL_JSON_PATH = PARTS_DIR / "Pip.json"
ATLAS_PNG_PATH = PARTS_DIR / "Pip.png"

# Pip canvas — P01 source reference for slot positioning
CANVAS_W, CANVAS_H = 1024, 1024


def part_centroid(part_img_path: Path):
    """Find the centroid of opaque pixels in the original P01 canvas.

    Each segmented part PNG was tight-cropped, so we need to recover its
    original P01-canvas position. We do this by finding the part's mask
    in the original P01 image via best-match search.

    For Phase 3 v1, we use a simpler heuristic: store the bounding box
    bottom-left + size, and let the user re-align in Spine Editor.

    Returns: (x, y, w, h) where x, y is top-left in atlas space.
    """
    img = Image.open(part_img_path).convert("RGBA")
    return img.size  # (w, h) — caller positions manually


def build_atlas_and_pack(parts: dict[str, Path]) -> tuple[Image.Image, dict]:
    """Pack all part PNGs into a single atlas image + return placement metadata.

    Simple shelf packing — sufficient for ~15 small assets.
    """
    images = {pid: Image.open(p).convert("RGBA") for pid, p in parts.items()}

    # Sort by height descending for shelf packing
    sorted_parts = sorted(images.items(), key=lambda kv: kv[1].height, reverse=True)

    SHELF_PADDING = 4
    ATLAS_W = 2048  # ample width
    placements = {}
    cursor_x, cursor_y, shelf_h = 0, 0, 0
    for pid, img in sorted_parts:
        if cursor_x + img.width + SHELF_PADDING > ATLAS_W:
            # New shelf
            cursor_x = 0
            cursor_y += shelf_h + SHELF_PADDING
            shelf_h = 0
        placements[pid] = (cursor_x, cursor_y, img.width, img.height)
        cursor_x += img.width + SHELF_PADDING
        shelf_h = max(shelf_h, img.height)

    atlas_h = cursor_y + shelf_h + SHELF_PADDING
    # Round up to next pow2 for GPU friendliness
    atlas_h = max(256, 1 << (atlas_h - 1).bit_length()) if atlas_h > 0 else 256
    atlas_h = min(atlas_h, 4096)
    atlas_img = Image.new("RGBA", (ATLAS_W, atlas_h), (0, 0, 0, 0))

    for pid, (x, y, w, h) in placements.items():
        atlas_img.paste(images[pid], (x, y), images[pid])

    return atlas_img, placements


def write_atlas_file(placements: dict, atlas_size: tuple[int, int]):
    """Spine atlas text format (.atlas)."""
    lines = [
        "Pip.png",
        f"size: {atlas_size[0]},{atlas_size[1]}",
        "filter: Linear,Linear",
        "scale: 1",
        "",
    ]
    for pid, (x, y, w, h) in placements.items():
        lines.append(pid)
        lines.append(f"  bounds: {x},{y},{w},{h}")
    ATLAS_PATH.write_text("\n".join(lines) + "\n")
    print(f"[atlas] {ATLAS_PATH} ({len(placements)} regions)")


def build_skeleton_json(parts: dict[str, Path]) -> dict:
    """Spine skeleton JSON 4.2 schema.

    Hierarchy:
        root
        └── body
            ├── head_pivot
            │   ├── ear_L_bone (rotates for twitch — Phase 3.5+)
            │   ├── ear_R_bone (rotates for twitch — Phase 3.5+)
            │   ├── eye_L_socket (slot: eye_L_open / eye_L_blink)
            │   ├── eye_R_socket (slot: eye_R_open / eye_R_blink)
            │   ├── mouth_socket (slot: mouth_resting / mouth_open / mouth_yawn)
            │   ├── cheek_L_pivot, cheek_R_pivot
            │   ├── nose_pivot
            │   └── overlay_pivot (slot: sparkles_overlay — visible on cheer)
    """
    # Approximate slot positions on P01 canvas (1024×1024)
    # User refines in Spine Editor — these are starting hints
    slot_positions = {
        "body":              (512, 600),
        "head_pivot":        (512, 400),
        "ear_L_bone":        (250, 200),  # top-left
        "ear_R_bone":        (770, 200),  # top-right
        "eye_L_socket":      (390, 400),  # ~upper-left face
        "eye_R_socket":      (640, 400),  # ~upper-right face
        "mouth_socket":      (512, 600),  # below nose, center-ish
        "cheek_L_pivot":     (220, 540),
        "cheek_R_pivot":     (810, 540),
        "head_tuft_pivot":   (512, 110),
        "overlay_pivot":     (512, 400),  # over head, sparkles ring
    }

    bones = [
        {"name": "root"},
        {"name": "body", "parent": "root", "x": slot_positions["body"][0], "y": -slot_positions["body"][1] + CANVAS_H, "length": 0},
        {"name": "head_pivot", "parent": "body", "x": 0, "y": 200, "length": 0},
        {"name": "ear_L_bone", "parent": "head_pivot", "x": -262, "y": 200, "length": 0},
        {"name": "ear_R_bone", "parent": "head_pivot", "x": 258, "y": 200, "length": 0},
        {"name": "eye_L_socket", "parent": "head_pivot", "x": -122, "y": 0, "length": 0},
        {"name": "eye_R_socket", "parent": "head_pivot", "x": 128, "y": 0, "length": 0},
        {"name": "mouth_socket", "parent": "head_pivot", "x": 0, "y": -200, "length": 0},
        {"name": "cheek_L_pivot", "parent": "head_pivot", "x": -292, "y": -140, "length": 0},
        {"name": "cheek_R_pivot", "parent": "head_pivot", "x": 298, "y": -140, "length": 0},
        {"name": "head_tuft_pivot", "parent": "head_pivot", "x": 0, "y": 290, "length": 0},
        {"name": "overlay_pivot", "parent": "head_pivot", "x": 0, "y": 0, "length": 0},
    ]

    # Slots (rendering order = list order, back-to-front)
    slots = [
        {"name": "body_base_slot", "bone": "body", "attachment": "body_base"},
        {"name": "head_tuft_slot", "bone": "head_tuft_pivot", "attachment": "head_tuft"},
        {"name": "ear_L_slot", "bone": "ear_L_bone", "attachment": "ear_L"},
        {"name": "ear_R_slot", "bone": "ear_R_bone", "attachment": "ear_R"},
        {"name": "cheek_L_slot", "bone": "cheek_L_pivot", "attachment": "cheek_L"},
        {"name": "cheek_R_slot", "bone": "cheek_R_pivot", "attachment": "cheek_R"},
        {"name": "eye_L_slot", "bone": "eye_L_socket", "attachment": "eye_L_open"},
        {"name": "eye_R_slot", "bone": "eye_R_socket", "attachment": "eye_R_open"},
        {"name": "mouth_slot", "bone": "mouth_socket", "attachment": "mouth_resting"},
        {"name": "overlay_slot", "bone": "overlay_pivot", "attachment": None},  # sparkles, hidden by default
    ]

    # Skin — default skin holds all attachments
    # Each slot has 1+ attachment options (for swap-based mood animation)
    skin_attachments = {
        "body_base_slot": {
            "body_base": {"x": 0, "y": 0, "width": 933, "height": 962},
        },
        "head_tuft_slot": {
            "head_tuft": {"x": 0, "y": 0, "width": 163, "height": 102},
        },
        "ear_L_slot": {
            "ear_L": {"x": 0, "y": 0, "width": 239, "height": 300},
        },
        "ear_R_slot": {
            "ear_R": {"x": 0, "y": 0, "width": 265, "height": 281},
        },
        "cheek_L_slot": {
            "cheek_L": {"x": 0, "y": 0, "width": 153, "height": 127},
        },
        "cheek_R_slot": {
            "cheek_R": {"x": 0, "y": 0, "width": 185, "height": 130},
        },
        "eye_L_slot": {
            "eye_L_open": {"x": 0, "y": 0, "width": 178, "height": 166},
            # "eye_L_blink": ... added when MJ ek gen lands
        },
        "eye_R_slot": {
            "eye_R_open": {"x": 0, "y": 0, "width": 184, "height": 170},
            # "eye_R_blink": ...
        },
        "mouth_slot": {
            "mouth_resting": {"x": 0, "y": 0, "width": 144, "height": 155},
            # "mouth_open": ... added when P03 segment lands
            # "mouth_yawn": ... added when MJ ek gen lands
        },
        "overlay_slot": {
            # "sparkles_overlay": ... added when P03 segment lands
        },
    }

    skel = {
        "skeleton": {
            "hash": "PipPhase3v1",
            "spine": SPINE_VERSION,
            "x": 0, "y": 0,
            "width": CANVAS_W, "height": CANVAS_H,
            "images": "./",
            "audio": "",
        },
        "bones": bones,
        "slots": slots,
        "skins": [
            {
                "name": "default",
                "attachments": skin_attachments,
            }
        ],
        "animations": {
            # Empty for v1 — user authors curves in Spine Editor
            "setup": {"slots": {}, "bones": {}},
        },
    }
    return skel


def main():
    # Discover all parts present in pip-spine/
    available_parts = {}
    for part in [
        "body_base", "ear_L", "ear_R", "eye_L_open", "eye_R_open",
        "eye_L_blink", "eye_R_blink", "mouth_resting", "mouth_open",
        "mouth_yawn", "cheek_L", "cheek_R", "head_tuft", "sparkles_overlay",
    ]:
        path = PARTS_DIR / f"{part}.png"
        if path.exists():
            available_parts[part] = path
        else:
            print(f"[skip] {part}.png not present (will skip in atlas)")

    if not available_parts:
        sys.exit("no parts found in pip-spine/ — run segment-pip.py first")

    print(f"[parts] {len(available_parts)} body parts to pack")

    # Pack atlas
    atlas_img, placements = build_atlas_and_pack(available_parts)
    atlas_img.save(ATLAS_PNG_PATH)
    print(f"[atlas-png] {ATLAS_PNG_PATH} ({atlas_img.size})")
    write_atlas_file(placements, atlas_img.size)

    # Build skeleton JSON
    skel = build_skeleton_json(available_parts)
    SKEL_JSON_PATH.write_text(json.dumps(skel, indent=2))
    print(f"[skel] {SKEL_JSON_PATH}")

    print()
    print("Next steps:")
    print(f"  1. Open Spine Editor (Essential $69) → File → Import Data → {SKEL_JSON_PATH}")
    print(f"  2. Verify atlas linkage: should auto-detect {ATLAS_PATH} + {ATLAS_PNG_PATH}")
    print(f"  3. Re-position attachments in Setup mode (P01 canvas hints baked in JSON)")
    print(f"  4. Author 8 animations: idle_breath, idle_blink, idle_lookside_L/_R/_up,")
    print(f"     idle_yawn, react_cheer, react_wink (see asset-bible-v2-spine.md §3.3)")
    print(f"  5. Export → Spine binary skel + atlas → drop into Unity Assets/Spine/Pip/")


if __name__ == "__main__":
    main()
