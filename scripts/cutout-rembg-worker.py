#!/usr/bin/env python3
"""Offline rembg worker for the Tower cutout compiler."""

from __future__ import annotations

import argparse
from pathlib import Path

from rembg import new_session, remove


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a cached rembg model on one source image.")
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", required=True)
    args = parser.parse_args()

    source = Path(args.source)
    output = Path(args.output)
    session = new_session(args.model)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(remove(source.read_bytes(), session=session))


if __name__ == "__main__":
    main()
