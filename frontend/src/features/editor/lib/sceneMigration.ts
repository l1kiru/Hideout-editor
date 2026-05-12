import { DECORATIONS } from '../../../lib/sceneDecorations';
import type { PaintLayer, Tool } from '../../../types/scene';
import { ROT_LINE_ROPE_OFFSET } from './editorConstants';
import { normR } from './editorViewport';

// v1 scenes encoded the preview offset +q in the rope-stroke r value;
// v2 (and export) keep only the tangent angle. This converts the older form.
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

const LEGACY_ROPE_KEY = 'rope';
const RENAMED_ROPE_KEY = 'faridun_ropes4';

function migrateLegacyToolVariant(v: string | undefined): Tool['variant'] | undefined {
  return v === LEGACY_ROPE_KEY ? RENAMED_ROPE_KEY : (v as Tool['variant'] | undefined);
}

function migrateLegacyToolAssetKey(
  k: string | undefined,
): Tool['asset_key'] | undefined {
  return k === LEGACY_ROPE_KEY ? RENAMED_ROPE_KEY : (k as Tool['asset_key'] | undefined);
}

// Legacy compatibility: older scenes may store `rope` in tool and eraser_targets.
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
