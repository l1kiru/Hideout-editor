import { useEffect } from 'react';

import type { Tool } from '../../../types/scene';
import { logEditorDevEvent } from '../lib/editorDevLog';

type UseEditorTelemetryEffectsArgs = {
    tool: Tool;
};

export function useEditorTelemetryEffects(
    args: UseEditorTelemetryEffectsArgs,
) {
    const { tool } = args;

    useEffect(() => {
        const asset =
            tool.variant === 'line'
                ? (tool.line_asset_key ?? null)
                : tool.variant === 'fill'
                  ? (tool.fill_asset_key ?? null)
                  : (tool.asset_key ?? null);
        logEditorDevEvent('tool.switch', {
            variant: tool.variant,
            asset,
        });
    }, [
        tool.variant,
        tool.asset_key,
        tool.line_asset_key,
        tool.fill_asset_key,
    ]);
}
