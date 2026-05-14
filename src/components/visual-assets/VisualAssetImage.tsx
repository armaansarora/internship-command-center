"use client";

import Image from "next/image";
import type { CSSProperties, JSX } from "react";
import type { VisualAsset } from "@/lib/visual-assets";

interface VisualAssetImageProps {
  asset: VisualAsset;
  className?: string;
  priority?: boolean;
  sizes?: string;
  style?: CSSProperties;
}

export function VisualAssetImage({
  asset,
  className,
  priority = false,
  sizes,
  style,
}: VisualAssetImageProps): JSX.Element {
  const renderSource = asset.kind === "character" && asset.renditions
    ? asset.renditions.retina3x
    : { src: asset.src, width: asset.width, height: asset.height };

  return (
    <Image
      src={renderSource.src}
      alt={asset.alt}
      width={renderSource.width}
      height={renderSource.height}
      priority={priority}
      sizes={sizes}
      className={className}
      style={style}
    />
  );
}
