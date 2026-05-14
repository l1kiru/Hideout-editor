import { DECORATIONS, DRAWING_ASSET_KEYS } from '../../../lib/sceneDecorations';
import type { AssetKey, Tool } from '../../../types/scene';

function isAssetKey(value: string | undefined): value is AssetKey {
    return DRAWING_ASSET_KEYS.includes(value as AssetKey);
}

function resolvedStoredAssetKey(
    value: string | undefined,
    fallback: AssetKey = 'faridun_ropes4',
): AssetKey {
    return isAssetKey(value) ? value : fallback;
}

export function syncToolDigitShortcut(
    tool: Tool,
    code: string,
): Tool | null {
    if (code === 'Digit1')
        return syncToolVariantSelection(tool, 'select');
    if (code === 'Digit2') {
        const assetKey = resolvedStoredAssetKey(tool.asset_key);
        return syncToolVariantSelection(tool, assetKey);
    }
    if (code === 'Digit3')
        return syncToolVariantSelection(tool, 'eraser');
    if (code === 'Digit4')
        return syncToolVariantSelection(tool, 'line');
    if (code === 'Digit5')
        return syncToolVariantSelection(tool, 'fill');
    return null;
}

export function syncToolVariantSelection(
    tool: Tool,
    nextVariant: Tool['variant'],
): Tool {
    if (isAssetKey(nextVariant)) {
        return {
            ...tool,
            variant: nextVariant,
            asset_key: nextVariant,
            fv: DECORATIONS[nextVariant].fv,
        };
    }

    if (nextVariant === 'line') {
        const lineAssetKey = resolvedStoredAssetKey(tool.line_asset_key);
        return {
            ...tool,
            variant: 'line',
            line_asset_key: lineAssetKey,
            fv: DECORATIONS[lineAssetKey].fv,
        };
    }

    if (nextVariant === 'fill') {
        const fillAssetKey = resolvedStoredAssetKey(tool.fill_asset_key);
        return {
            ...tool,
            variant: 'fill',
            fill_asset_key: fillAssetKey,
            fv: DECORATIONS[fillAssetKey].fv,
        };
    }

    return { ...tool, variant: nextVariant };
}
