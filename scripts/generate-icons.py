#!/usr/bin/env python3
"""Generate the PWA icons from the Caroly logo (icons/caroly-logo.png).

Requires Pillow. Run from the project root:
    python3 scripts/generate-icons.py
"""
from PIL import Image

SOURCE = "icons/caroly-logo.png"

OUTPUTS = {
    "icons/icon-512.png": 512,
    "icons/icon-192.png": 192,
    "icons/apple-touch-icon.png": 180,
}


def main():
    logo = Image.open(SOURCE).convert("RGB")
    for path, size in OUTPUTS.items():
        icon = logo.resize((size, size), Image.LANCZOS)
        icon.save(path, optimize=True)
        print(f"generated {path} ({size}x{size})")


if __name__ == "__main__":
    main()
