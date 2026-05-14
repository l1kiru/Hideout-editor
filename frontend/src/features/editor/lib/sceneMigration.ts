import { EDITOR_LEGACY_ASSET_ALIASES } from '../../../shared/generated/editorAssets';
import { DECORATIONS } from '../../../lib/sceneDecorations';
import type { PaintLayer, Tool } from '../../../types/scene';
import { ROT_LINE_ROPE_OFFSET } from './editorConstants';
import { normR } from './editorViewport';

// Runtime import seam: some persisted/uploaded scenes still encode the rope
// preview offset in line-stroke rotation. Normalize them to the tangent angle
// used by the current editor and export path.
export function migrateLayersRopeLineRToTangent(
  layers: PaintLayer[],
  fromVersion: number,
): PaintLayer[] {
  if (fromVersion >= 2)
    return layers;
  return layers.map((ly) => ({
    ...ly,
    batches: ly.batches.map((b) => {
      if (
        b.template_hash !== DECORATIONS.faridun_ropes4.hash
        || b.line_stroke !== true
      )
        return b;
      return {
        ...b,
        placements: b.placements.map((p) => ({
          ...p,
          r: normR(p.r - ROT_LINE_ROPE_OFFSET),
        })),
      };
    }),
  }));
}

function migrateLegacyToolVariant(v: string | undefined): Tool['variant'] | undefined {
  if (!v)
    return undefined;
  const migrated
    = EDITOR_LEGACY_ASSET_ALIASES[
      v as keyof typeof EDITOR_LEGACY_ASSET_ALIASES
    ];
  return (migrated ?? v) as Tool['variant'] | undefined;
}

function migrateLegacyToolAssetKey(
  k: string | undefined,
): Tool['asset_key'] | undefined {
  if (!k)
    return undefined;
  const migrated
    = EDITOR_LEGACY_ASSET_ALIASES[
      k as keyof typeof EDITOR_LEGACY_ASSET_ALIASES
    ];
  return (migrated ?? k) as Tool['asset_key'] | undefined;
}

// Runtime import seam: older scene payloads may still use `rope` in tool fields
// and eraser targets. Normalize them to manifest-backed asset keys before the
// rest of the editor reads the tool state.
export function migrateLegacyToolAssetKeys(tool: Tool): Tool {
  const et = tool.eraser_targets ?? {};
  const etAny = et as Record<string, boolean | undefined>;
  const legacyRopeEnabled = etAny.rope;
  const nextEraserTargets = {
    ...et,
    faridun_ropes4:
      et.faridun_ropes4 ?? (
        legacyRopeEnabled === undefined ? undefined : legacyRopeEnabled
      ),
  } as Tool['eraser_targets'] & { rope?: boolean };
  if ('rope' in nextEraserTargets)
    delete nextEraserTargets.rope;

  return {
    ...tool,
    variant: migrateLegacyToolVariant(tool.variant) ?? tool.variant,
    asset_key: migrateLegacyToolAssetKey(tool.asset_key) ?? tool.asset_key,
    line_asset_key: migrateLegacyToolAssetKey(tool.line_asset_key) ?? tool.line_asset_key,
    fill_asset_key: migrateLegacyToolAssetKey(tool.fill_asset_key) ?? tool.fill_asset_key,
    eraser_targets: nextEraserTargets,
  };
}
