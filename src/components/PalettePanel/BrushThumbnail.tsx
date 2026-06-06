import React from 'react';

import { LoadedSprite } from '~/domain/sprite';
import { BrushSpriteLayout } from '~/usecase/brushSprite';

interface BrushThumbnailProps {
  size: number;
  version: number;
  layout: BrushSpriteLayout | null;
  cache: Map<number, LoadedSprite>;
}

const BrushThumbnail = ({ layout, cache, version, size }: BrushThumbnailProps) => {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, size, size);
    if (!layout || layout.cells.length === 0) return;

    const offW = layout.cols * 32;
    const offH = layout.rows * 32;
    const off = document.createElement('canvas');
    off.width = offW;
    off.height = offH;
    const octx = off.getContext('2d');
    if (!octx) return;

    let drew = false;
    for (const cell of layout.cells) {
      const sprite = cache.get(cell.spriteId);
      if (!sprite || sprite.empty) continue;
      octx.putImageData(new ImageData(new Uint8ClampedArray(sprite.rgba), 32, 32), cell.dx, cell.dy);
      drew = true;
    }
    if (!drew) return;

    const scale = Math.min(size / offW, size / offH);
    const dw = offW * scale;
    const dh = offH * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }, [layout, cache, version, size]);

  return <canvas ref={ref} width={size} height={size} className="h-full w-full" style={{ imageRendering: 'pixelated' }} />;
};

export default BrushThumbnail;
