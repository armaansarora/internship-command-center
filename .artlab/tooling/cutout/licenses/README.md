# Tower Cutout Tooling Licenses

Bootstrap may prepare package and model records, but production only uses cached models with package plus model-weight license evidence.
A package license is not enough; each model weight needs source URL, license text, provenance note, and hash.

## Local approval recorded 2026-05-19

- Package: `rembg==2.0.75`, installed in `.artlab/tooling/cutout/venv`, MIT license per PyPI and the installed package metadata.
- Model: `isnet-general-use.onnx`, downloaded by rembg from `https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx`, hash `sha256:60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a`.
- IS-Net source: `https://github.com/xuebinqin/DIS`, Apache-2.0 license shown in the repository metadata.
- Model: `u2net.onnx`, downloaded by rembg from `https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx`, hash `sha256:8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491`.
- U-2-Net source: `https://github.com/xuebinqin/U-2-Net`, Apache-2.0 license shown in the repository metadata.
- Approval scope: Tower local production cutout compiler only. Normal production remains offline by default and must fail if cached files or hashes drift.
