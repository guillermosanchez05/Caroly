#!/usr/bin/env python3
"""Generate the PWA app icons (solid green square with a white "C" ring).

Requires Pillow. Run from the project root:
    python3 scripts/generate-icons.py
"""
from PIL import Image, ImageDraw

GREEN = (47, 125, 82, 255)  # #2f7d52
WHITE = (255, 255, 255, 255)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), GREEN)
    draw = ImageDraw.Draw(img)
    margin = size * 0.22
    box = [margin, margin, size - margin, size - margin]
    width = int(size * 0.13)
    # Arc from 45deg to 315deg leaves the right side open -> stylised "C".
    draw.arc(box, start=45, end=315, fill=WHITE, width=width)
    return img


if __name__ == "__main__":
    make_icon(192).save("icons/icon-192.png")
    make_icon(512).save("icons/icon-512.png")
    make_icon(180).save("icons/apple-touch-icon.png")
    print("icons generated")
