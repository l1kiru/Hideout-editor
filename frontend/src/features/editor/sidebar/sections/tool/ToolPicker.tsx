import { Eraser, MapPin, MousePointer2, PenLine } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { DECORATIONS, DRAWING_ASSET_KEYS } from '../../../../../lib/sceneDecorations';
import type { AssetKey, Tool } from '../../../../../types/scene';

type ToolPickerProps = {
    tool: Tool;
    setTool: Dispatch<SetStateAction<Tool>>;
    disabled: boolean;
};

export function ToolPicker(props: ToolPickerProps) {
    const { tool, setTool, disabled } = props;
    const { t } = useTranslation('editor');
    const isSingleVariant = (v: string): v is AssetKey =>
        DRAWING_ASSET_KEYS.includes(v as AssetKey);
    const inSingleMode = isSingleVariant(tool.variant);

    return (
        <div
            className="toolSegment"
            role="group"
            aria-label={t('tools.groupAria')}
        >
            <button
                type="button"
                className={`toolSegmentBtn ${tool.variant === 'select' ? 'active' : ''}`}
                title={t('tools.select')}
                aria-pressed={tool.variant === 'select'}
                disabled={disabled}
                onClick={() => setTool((t) => ({ ...t, variant: 'select' }))}
            >
                <MousePointer2 aria-hidden />
                <span className="toolSegmentSr">{t('tools.select')}</span>
            </button>
            <button
                type="button"
                className={`toolSegmentBtn ${inSingleMode ? 'active' : ''}`}
                title={t('tools.singleTitle')}
                aria-pressed={inSingleMode}
                disabled={disabled}
                onClick={() => {
                    if (inSingleMode) return;
                    setTool((t) => {
                        const ak: AssetKey = isSingleVariant(t.asset_key ?? '')
                            ? (t.asset_key as AssetKey)
                            : 'faridun_ropes4';
                        return {
                            ...t,
                            variant: ak,
                            asset_key: ak,
                            fv: DECORATIONS[ak]?.fv ?? t.fv,
                        };
                    });
                }}
            >
                <MapPin aria-hidden />
                <span className="toolSegmentSr">{t('tools.single')}</span>
            </button>
            <button
                type="button"
                className={`toolSegmentBtn ${tool.variant === 'eraser' ? 'active' : ''}`}
                title={t('tools.eraser')}
                aria-pressed={tool.variant === 'eraser'}
                disabled={disabled}
                onClick={() => setTool((t) => ({ ...t, variant: 'eraser' }))}
            >
                <Eraser aria-hidden />
                <span className="toolSegmentSr">{t('tools.eraser')}</span>
            </button>
            <button
                type="button"
                className={`toolSegmentBtn ${tool.variant === 'line' ? 'active' : ''}`}
                title={t('tools.line')}
                aria-pressed={tool.variant === 'line'}
                disabled={disabled}
                onClick={() => setTool((t) => ({ ...t, variant: 'line' }))}
            >
                <PenLine aria-hidden />
                <span className="toolSegmentSr">{t('tools.line')}</span>
            </button>
            <button
                type="button"
                className={`toolSegmentBtn ${tool.variant === 'fill' ? 'active' : ''}`}
                title={t('tools.fill')}
                aria-pressed={tool.variant === 'fill'}
                disabled={disabled}
                onClick={() => setTool((t) => ({ ...t, variant: 'fill' }))}
            >
                <span aria-hidden>▧</span>
                <span className="toolSegmentSr">{t('tools.fill')}</span>
            </button>
        </div>
    );
}
