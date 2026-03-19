#!/usr/bin/env python3
"""
Create depth-separated skyline layers from hero panorama images.

Splits each image into 4 layers with smooth alpha gradients:
  - sky: top portion (sky + clouds)
  - far: distant skyline silhouettes (tallest buildings in distance)
  - mid: midground buildings 
  - near: foreground rooftops and closest elements

Each layer has a gradient alpha mask so layers blend seamlessly when stacked.
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "numpy"])
    from PIL import Image, ImageFilter
    import numpy as np


def create_gradient_mask(width: int, height: int, top_start: float, top_end: float, 
                          bot_start: float, bot_end: float) -> Image.Image:
    """
    Create a vertical gradient alpha mask.
    
    top_start/top_end: normalized y positions (0-1) for top fade-in (0=top, 1=bottom)
    bot_start/bot_end: normalized y positions for bottom fade-out
    
    The mask is:
      - 0 (transparent) above top_start
      - gradient 0->255 from top_start to top_end
      - 255 (opaque) from top_end to bot_start
      - gradient 255->0 from bot_start to bot_end
      - 0 (transparent) below bot_end
    """
    mask = np.zeros((height, width), dtype=np.uint8)
    
    top_start_px = int(top_start * height)
    top_end_px = int(top_end * height)
    bot_start_px = int(bot_start * height)
    bot_end_px = int(bot_end * height)
    
    # Top fade-in
    if top_end_px > top_start_px:
        for y in range(top_start_px, top_end_px):
            alpha = int(255 * (y - top_start_px) / (top_end_px - top_start_px))
            mask[y, :] = alpha
    
    # Full opacity middle
    mask[top_end_px:bot_start_px, :] = 255
    
    # Bottom fade-out
    if bot_end_px > bot_start_px:
        for y in range(bot_start_px, bot_end_px):
            alpha = int(255 * (1 - (y - bot_start_px) / (bot_end_px - bot_start_px)))
            mask[y, :] = alpha
    
    return Image.fromarray(mask, mode='L')


def create_layers(input_path: str, output_dir: str, variant: str):
    """Create 4 depth layers from a hero skyline image."""
    
    img = Image.open(input_path).convert('RGBA')
    w, h = img.size
    print(f"Processing {variant}: {w}x{h}")
    
    # Define layer zones as fractions of image height
    # These are tuned for a typical NYC skyline shot from ~40th floor
    # Format: (top_start, top_end, bot_start, bot_end)
    # where start/end define gradient edges
    
    layers = {
        'sky': {
            # Sky: entire top portion, fades out where buildings begin
            'top_start': 0.0, 'top_end': 0.0,
            'bot_start': 0.30, 'bot_end': 0.50,
        },
        'far': {
            # Far skyline: tall buildings in distance, centered band
            'top_start': 0.15, 'top_end': 0.25,
            'bot_start': 0.55, 'bot_end': 0.70,
        },
        'mid': {
            # Midground: medium buildings
            'top_start': 0.35, 'top_end': 0.45,
            'bot_start': 0.75, 'bot_end': 0.88,
        },
        'near': {
            # Near: foreground rooftops and closest elements
            'top_start': 0.55, 'top_end': 0.65,
            'bot_start': 1.0, 'bot_end': 1.0,
        },
    }
    
    out_path = Path(output_dir) / variant
    out_path.mkdir(parents=True, exist_ok=True)
    
    for layer_name, zones in layers.items():
        print(f"  Creating {layer_name} layer...")
        
        # Create gradient mask
        mask = create_gradient_mask(
            w, h,
            zones['top_start'], zones['top_end'],
            zones['bot_start'], zones['bot_end']
        )
        
        # Apply mask to image
        layer = img.copy()
        # Composite: multiply existing alpha with our mask
        r, g, b, a = layer.split()
        # Combine original alpha with depth mask
        combined_alpha = Image.fromarray(
            np.minimum(np.array(a), np.array(mask)).astype(np.uint8),
            mode='L'
        )
        layer.putalpha(combined_alpha)
        
        # For the sky layer, we want it opaque (no alpha) since it's the background
        if layer_name == 'sky':
            # Create sky with solid bottom gradient into transparency
            sky_mask = create_gradient_mask(w, h, 0.0, 0.0, 0.30, 0.50)
            sky_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
            # Paste original onto sky layer using mask
            sky_rgb = img.convert('RGB')
            sky_layer = Image.new('RGBA', (w, h))
            sky_layer.paste(img, mask=sky_mask)
            layer = sky_layer
        
        # Save as WebP (with alpha)
        webp_path = out_path / f"{layer_name}.webp"
        layer.save(str(webp_path), 'WEBP', quality=90, method=6)
        
        # Save PNG fallback
        png_path = out_path / f"{layer_name}.png"
        layer.save(str(png_path), 'PNG', optimize=True)
        
        # Create mobile version (half resolution)
        mobile = layer.resize((w // 2, h // 2), Image.LANCZOS)
        mobile_webp = out_path / f"{layer_name}-mobile.webp"
        mobile.save(str(mobile_webp), 'WEBP', quality=85, method=6)
        
        file_size = webp_path.stat().st_size / 1024
        print(f"    → {webp_path.name}: {file_size:.0f} KB")
    
    # Create single fallback image (compressed, no layers)
    fallback = img.convert('RGB').resize((1920, 1080), Image.LANCZOS)
    fallback_path = Path(output_dir) / f"fallback-{variant}.webp"
    fallback.save(str(fallback_path), 'WEBP', quality=80)
    print(f"  → Fallback: {fallback_path.stat().st_size / 1024:.0f} KB")


def main():
    base_dir = Path("/home/user/workspace/internship-command-center")
    output_dir = base_dir / "public" / "skyline"
    
    # Process day variant
    day_input = Path("/home/user/workspace/skyline-day-clean.png")
    if day_input.exists():
        create_layers(str(day_input), str(output_dir), "day")
    else:
        print(f"ERROR: {day_input} not found")
    
    # Process night variant
    night_input = Path("/home/user/workspace/skyline-night-clean.png")
    if night_input.exists():
        create_layers(str(night_input), str(output_dir), "night")
    else:
        print(f"ERROR: {night_input} not found")
    
    # Create single combined fallback
    if day_input.exists():
        img = Image.open(str(day_input)).convert('RGB').resize((1920, 1080), Image.LANCZOS)
        fallback_path = output_dir / "fallback.webp"
        img.save(str(fallback_path), 'WEBP', quality=80)
        print(f"\nCombined fallback: {fallback_path.stat().st_size / 1024:.0f} KB")
    
    # Summary
    print("\n=== ASSET SUMMARY ===")
    for p in sorted(output_dir.rglob("*.webp")):
        rel = p.relative_to(output_dir)
        size = p.stat().st_size / 1024
        print(f"  {rel}: {size:.0f} KB")


if __name__ == "__main__":
    main()
