import React from 'react';
import { X } from 'lucide-react';

import { cn } from '~/usecase/classNames';
import { fetchMinimap } from '~/adapter/minimap';
import { miniMapRgb } from '~/usecase/minimapColor';
import { MapView, MinimapImage } from '~/domain/map';
import { DragHandleProps } from '~/components/Dock/DockablePanel';

const TILE = 32;
const EDIT_DEBOUNCE_MS = 150;

interface Meta {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

interface Mapping {
  scale: number;
  ox: number;
  oy: number;
}

export interface MinimapApi {
  markDirty: (z: number) => void;
}

interface MinimapProps {
  mapId: number;
  floorZ: number;
  colors: number[];
  onClose?: () => void;
  headerMenu?: React.ReactNode;
  dragHandle?: DragHandleProps;
  viewRef: React.MutableRefObject<MapView | null>;
  apiRef: React.MutableRefObject<MinimapApi | null>;
  centerRef: React.MutableRefObject<((x: number, y: number) => void) | null>;
}

const Minimap = ({ mapId, floorZ, colors, onClose, headerMenu, dragHandle, viewRef, apiRef, centerRef }: MinimapProps) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const offscreenRef = React.useRef<HTMLCanvasElement | null>(null);
  const metaRef = React.useRef<Meta>({ minX: 0, minY: 0, width: 0, height: 0 });
  const mappingRef = React.useRef<Mapping | null>(null);
  const floorRef = React.useRef(floorZ);
  const seqRef = React.useRef(0);
  const timerRef = React.useRef<number | null>(null);

  floorRef.current = floorZ;

  const buildOffscreen = React.useCallback((img: MinimapImage) => {
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement('canvas');
      offscreenRef.current = off;
    }
    if (img.width === 0 || img.height === 0) {
      metaRef.current = { minX: 0, minY: 0, width: 0, height: 0 };
      return;
    }
    off.width = img.width;
    off.height = img.height;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const id = ctx.createImageData(img.width, img.height);
    const out = id.data;
    const px = img.width * img.height;
    for (let i = 0; i < px; i++) {
      const c = img.data[i];
      const o = i * 4;
      if (!c) {
        out[o + 3] = 0;
        continue;
      }
      const [r, g, b] = miniMapRgb(c);
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    metaRef.current = { minX: img.minX, minY: img.minY, width: img.width, height: img.height };
  }, []);

  const recompute = React.useCallback(() => {
    const seq = ++seqRef.current;
    fetchMinimap(mapId, floorRef.current, colors)
      .then((img) => {
        if (seq === seqRef.current) buildOffscreen(img);
      })
      .catch((err) => console.error('Failed to build minimap', err));
  }, [mapId, colors, buildOffscreen]);

  React.useEffect(() => {
    recompute();
  }, [recompute, floorZ]);

  React.useEffect(() => {
    apiRef.current = {
      markDirty: (z: number) => {
        if (z !== floorRef.current) return;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          recompute();
        }, EDIT_DEBOUNCE_MS);
      }
    };
    return () => {
      apiRef.current = null;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [apiRef, recompute]);

  React.useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        const cw = Math.round(canvas.clientWidth * dpr);
        const ch = Math.round(canvas.clientHeight * dpr);
        if (cw > 0 && ch > 0) {
          if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw;
            canvas.height = ch;
          }
          const ctx = canvas.getContext('2d');
          const off = offscreenRef.current;
          const meta = metaRef.current;
          if (ctx) {
            ctx.clearRect(0, 0, cw, ch);
            if (off && meta.width > 0) {
              const scale = Math.min(cw / meta.width, ch / meta.height);
              const dw = meta.width * scale;
              const dh = meta.height * scale;
              const ox = (cw - dw) / 2;
              const oy = (ch - dh) / 2;
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(off, ox, oy, dw, dh);
              mappingRef.current = { scale, ox, oy };

              const v = viewRef.current;
              if (v && v.zoom > 0) {
                const left = ox + (v.camX / TILE - meta.minX) * scale;
                const top = oy + (v.camY / TILE - meta.minY) * scale;
                const w = (v.vw / v.zoom / TILE) * scale;
                const h = (v.vh / v.zoom / TILE) * scale;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = Math.max(1, dpr);
                ctx.strokeRect(left, top, w, h);
              }
            } else {
              mappingRef.current = null;
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [viewRef]);

  const navigate = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const m = mappingRef.current;
    const meta = metaRef.current;
    if (!canvas || !m || meta.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) * dpr;
    const dy = (e.clientY - rect.top) * dpr;
    const tx = meta.minX + (dx - m.ox) / m.scale;
    const ty = meta.minY + (dy - m.oy) / m.scale;
    centerRef.current?.(tx, ty);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    navigate(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons & 1) navigate(e);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg bg-card shadow-island">
      <div
        ref={dragHandle?.ref}
        {...dragHandle?.attributes}
        {...dragHandle?.listeners}
        className={cn(
          'flex h-7 flex-shrink-0 items-center border-b border-border/50 bg-secondary/80 px-3',
          dragHandle?.className
        )}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">Minimap</h2>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">z {floorZ}</span>
        {headerMenu && <div className="ml-1">{headerMenu}</div>}
        {onClose && (
          <button
            onClick={onClose}
            title="Close minimap"
            onPointerDown={(e) => e.stopPropagation()}
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-item-hover hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 bg-[#11151c] p-1">
        <canvas
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          className="h-full w-full cursor-pointer"
          style={{ display: 'block', imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  );
};

export default Minimap;
