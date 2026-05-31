#!/usr/bin/env python3
"""Rework the mark to kill the 'A' silhouette misread. Generate tower/keystone
geometry candidates that read as ARCHITECTURE (setbacks/verticality), not a
letter. True-cut doorway + a warm cream light. Render proof sheets to judge."""
import os, subprocess

REN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_renders")
os.makedirs(REN, exist_ok=True)
NAVY, GOLD, CREAM = "#1A1A2E", "#C9A84C", "#F5F1E8"

def svg(body, light, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
            f'<defs>{defs}</defs><rect width="120" height="120" rx="26" fill="{NAVY}"/>'
            f'<path fill="{GOLD}" fill-rule="evenodd" d="{body}"/>'
            f'<path fill="{CREAM}" fill-opacity="0.85" d="{light}"/></svg>')

cands = {}

# V1 — Two-tier Art-Deco setback tower. Wider base tier + narrower upper tier +
# flat crown; a rounded-arch doorway cut to the base. Vertical, stepped => a
# building, not an 'A'. Doorway cut full-height to the base edge.
v1_body = ("M30 95 L30 60 Q30 58 32 58 L40 58 L40 34 Q40 32 42 32 L78 32 Q80 32 80 34 "
           "L80 58 L88 58 Q90 58 90 60 L90 95 Q90 96.5 88.5 96.5 L66 96.5 "
           "L66 74 Q66 62 60 62 Q54 62 54 74 L54 96.5 L31.5 96.5 Q30 96.5 30 95 Z")
v1_light = "M60 66 Q64.5 66.5 64.5 76 L64.5 96.5 L55.5 96.5 L55.5 76 Q55.5 66.5 60 66 Z"
cands["towerA"] = svg(v1_body, v1_light)

# V2 — Three-step ziggurat tower (Empire-State/Chrysler setback lineage). Bolder
# stepped crown; unmistakably a skyscraper. Doorway cut to base.
v2_body = ("M32 96 L32 70 L44 70 L44 50 L50 50 L50 33 Q50 31.5 51.5 31.5 L68.5 31.5 "
           "Q70 31.5 70 33 L70 50 L76 50 L76 70 L88 70 L88 96 "
           "L66 96 L66 75 Q66 63 60 63 Q54 63 54 75 L54 96 L32 96 Z")
v2_light = "M60 67 Q64.5 67.5 64.5 77 L64.5 96 L55.5 96 L55.5 77 Q55.5 67.5 60 67 Z"
cands["towerZ"] = svg(v2_body, v2_light)

# V3 — Keystone-capped tower: a TRUE keystone (wider at TOP, voussoir) caps a
# vertical shaft. The wide cap at top + parallel shaft sides => not an 'A'
# (which narrows to a point at top). Doorway/light in the shaft base.
v3_body = ("M34 33 Q34 31 36 31 L84 31 Q86 31 86 33 L80 49 Q79.6 50.5 78 50.5 "
           "L42 50.5 Q40.4 50.5 40 49 Z "  # keystone cap (wider at top)
           "M44 50.5 L76 50.5 L76 96 "      # shaft right
           "L65 96 L65 74 Q65 63 60 63 Q55 63 55 74 L55 96 L44 96 Z")  # shaft + door
v3_light = "M60 67 Q64 67.5 64 76 L64 96 L56 96 L56 76 Q56 67.5 60 67 Z"
cands["towerK"] = svg(v3_body, v3_light)

for k, s in cands.items():
    p = os.path.join(REN, f"rw-{k}.svg")
    open(p, "w").write(s)
    subprocess.run(["node", "docs/research/render.mjs", "--svg", p,
                    "--proof", os.path.join(REN, f"rw-{k}-proof.png")],
                   cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    print("rendered", k)
print("done")
