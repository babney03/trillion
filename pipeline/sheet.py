#!/usr/bin/env python3
"""Tile phone screenshots into one labelled contact sheet for quick review.

Usage: python3 pipeline/sheet.py out.png domain1 domain2 ...
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

SHOTS = Path(__file__).resolve().parent / "cache" / "shots"
out, doms = sys.argv[1], sys.argv[2:]
W, H, COLS = 260, 563, 4
rows = (len(doms) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * W, rows * (H + 22)), "white")
d = ImageDraw.Draw(sheet)
for i, dom in enumerate(doms):
    x, y = (i % COLS) * W, (i // COLS) * (H + 22)
    f = SHOTS / f"{dom}.png"
    if f.exists():
        sheet.paste(Image.open(f).convert("RGB").resize((W - 6, H)), (x + 3, y + 22))
    d.text((x + 5, y + 5), f"{i + 1}. {dom}"[:42], fill="black")
sheet.save(out)
