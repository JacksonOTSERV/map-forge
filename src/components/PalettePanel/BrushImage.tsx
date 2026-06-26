import React from 'react';

import { BrushKind } from '~/domain/palette';
import { BrushOption } from '~/adapter/biomes';
import { LoadedSprite } from '~/domain/sprite';
import { loadSprites } from '~/adapter/sprites';
import { mapClientIds } from '~/adapter/assets';
import { useAssetsBundle } from '~/usecase/context/AssetsContext';
import { resolveBrushThing, brushSpriteLayout, BrushSpriteLayout } from '~/usecase/brushSprite';

import BrushThumbnail from './BrushThumbnail';

const SPRITE_CACHE = new Map<number, LoadedSprite>();
const SERVER_TO_CLIENT = new Map<number, number>();
const CELL = 28;

const BrushImage = ({ option, size = 24 }: { option: BrushOption | null; size?: number }) => {
  const { assets } = useAssetsBundle();
  const items = assets!.items;
  const outfits = assets!.outfits;
  const sprPath = assets!.sprPath;
  const transparency = assets!.transparency;

  const [layout, setLayout] = React.useState<BrushSpriteLayout | null>(null);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    if (!option) {
      setLayout(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const sid = option.serverId;
      let client = SERVER_TO_CLIENT.get(sid);
      if (!client) {
        const [cid] = await mapClientIds([sid]);
        client = cid ?? 0;
        if (client) SERVER_TO_CLIENT.set(sid, client);
      }
      if (cancelled) return;
      const brush = { key: option.name, name: option.name, kind: option.kind as BrushKind, lookServerId: sid };
      const thing = resolveBrushThing(brush, items, outfits, SERVER_TO_CLIENT);
      const lay = thing ? brushSpriteLayout(thing, false) : null;
      setLayout(lay);
      if (lay)
        await loadSprites(
          sprPath,
          lay.cells.map((c) => c.spriteId),
          transparency,
          SPRITE_CACHE
        );
      if (!cancelled) setVersion((v) => v + 1);
    })().catch((err) => console.error('Failed to resolve brush sprite', err));
    return () => {
      cancelled = true;
    };
  }, [option, items, outfits, sprPath, transparency]);

  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted/40"
    >
      <BrushThumbnail size={CELL} layout={layout} version={version} cache={SPRITE_CACHE} />
    </span>
  );
};

export default BrushImage;
