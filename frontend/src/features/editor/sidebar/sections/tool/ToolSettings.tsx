import {
    useEffect,
    useId,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';

import { NumberControl } from '../../../../../components/NumberControl';
import { DECORATIONS, DRAWING_ASSET_KEYS } from '../../../../../lib/sceneDecorations';
import type { AssetKey, FillMode, FillModeParams, Tool } from '../../../../../types/scene';
import { HIDEOUT_PLACEMENTS_HARD_LIMIT } from '../../../lib/editorConstants';

const ASSET_KEYS: AssetKey[] = DRAWING_ASSET_KEYS;
const FILL_MODE_DEFAULTS: Required<FillModeParams> = {
    radius_world: 24,
    min_passage_width_world: 2,
    cardinal_cost: 1,
    diagonal_cost: 1.4,
};

function assetSelectClass(key: AssetKey): string {
    const ropeClass = key.startsWith('faridun_ropes')
        ? ' sideSelectAsset--faridun-ropes'
        : '';
    return `sideSelect sideSelectAsset sideSelectAsset--${key}${ropeClass}`;
}

type AssetSelectProps = {
    value: AssetKey;
    onChange: (next: AssetKey) => void;
    disabled?: boolean;
};

function AssetSelect(props: AssetSelectProps) {
    const { value, onChange, disabled } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listId = useId();
    const [open, setOpen] = useState(false);
    const active = DECORATIONS[value];

    useEffect(() => {
        if (!open) return;
        const onDocPointerDown = (ev: PointerEvent) => {
            const node = rootRef.current;
            if (!node) return;
            if (node.contains(ev.target as Node)) return;
            setOpen(false);
        };
        const onDocKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setOpen(false);
        };
        window.addEventListener('pointerdown', onDocPointerDown);
        window.addEventListener('keydown', onDocKeyDown);
        return () => {
            window.removeEventListener('pointerdown', onDocPointerDown);
            window.removeEventListener('keydown', onDocKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="assetSelect">
            <button
                type="button"
                className={assetSelectClass(value)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
            >
                {active.title}
            </button>
            {open && !disabled ? (
                <div className="assetSelectMenuWrap">
                    <div
                        id={listId}
                        className="assetSelectMenu"
                        role="listbox"
                        aria-activedescendant={`${listId}-${value}`}
                    >
                        {ASSET_KEYS.map((key) => {
                            const asset = DECORATIONS[key];
                            const selected = key === value;
                            return (
                                <button
                                    id={`${listId}-${key}`}
                                    key={key}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    className={
                                        selected
                                            ? 'assetSelectOption is-selected'
                                            : 'assetSelectOption'
                                    }
                                    onClick={() => {
                                        onChange(key);
                                        setOpen(false);
                                    }}
                                >
                                    <img
                                        src={asset.src}
                                        alt=""
                                        className={
                                            key.startsWith('faridun_ropes')
                                                ? 'assetSelectOptionIcon assetSelectOptionIcon--faridun-ropes'
                                                : 'assetSelectOptionIcon'
                                        }
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span>{asset.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

type MultiAssetSelectProps = {
    value: Record<AssetKey, boolean>;
    onChange: (next: Record<AssetKey, boolean>) => void;
    disabled?: boolean;
};

function MultiAssetSelect(props: MultiAssetSelectProps) {
    const { value, onChange, disabled } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listId = useId();
    const [open, setOpen] = useState(false);
    const selected = ASSET_KEYS.filter((k) => value[k]);
    const summary = selected.length
        ? selected.map((k) => DECORATIONS[k].title).join(', ')
        : '—';

    useEffect(() => {
        if (!open) return;
        const onDocPointerDown = (ev: PointerEvent) => {
            const node = rootRef.current;
            if (!node) return;
            if (node.contains(ev.target as Node)) return;
            setOpen(false);
        };
        const onDocKeyDown = (ev: KeyboardEvent) => {
            if (ev.key === 'Escape') setOpen(false);
        };
        window.addEventListener('pointerdown', onDocPointerDown);
        window.addEventListener('keydown', onDocKeyDown);
        return () => {
            window.removeEventListener('pointerdown', onDocPointerDown);
            window.removeEventListener('keydown', onDocKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="assetSelect">
            <button
                type="button"
                className="sideSelect assetMultiSelectTrigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                title={summary}
            >
                <span className="assetMultiSelectSummary">{summary}</span>
            </button>
            {open && !disabled ? (
                <div className="assetSelectMenuWrap">
                    <div
                        id={listId}
                        className="assetSelectMenu"
                        role="listbox"
                        aria-multiselectable="true"
                    >
                        {ASSET_KEYS.map((key) => {
                            const asset = DECORATIONS[key];
                            const checked = value[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="option"
                                    aria-selected={checked}
                                    className={
                                        checked
                                            ? 'assetSelectOption is-selected'
                                            : 'assetSelectOption'
                                    }
                                    onClick={() =>
                                        onChange({
                                            ...value,
                                            [key]: !checked,
                                        })
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        readOnly
                                        tabIndex={-1}
                                        className="assetSelectOptionCheck"
                                    />
                                    <img
                                        src={asset.src}
                                        alt=""
                                        className={
                                            key.startsWith('faridun_ropes')
                                                ? 'assetSelectOptionIcon assetSelectOptionIcon--faridun-ropes'
                                                : 'assetSelectOptionIcon'
                                        }
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span>{asset.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

type ToolSettingsProps = {
    tool: Tool;
    setTool: Dispatch<SetStateAction<Tool>>;
    disabled: boolean;
};

export function ToolSettings(props: ToolSettingsProps) {
    const { tool, setTool, disabled } = props;
    const { t } = useTranslation('editor');
    const isSingleVariant = (v: string): v is AssetKey =>
        ASSET_KEYS.includes(v as AssetKey);
    const inSingleMode = isSingleVariant(tool.variant);

    return (
        <>
            {inSingleMode ? (
                <>
                    <p className="sideFieldGroupLabel">
                        {t('tools.singleSettings')}
                    </p>
                    <label className="sideLabel sideLabelStack">
                        <span>{t('tools.singleAsset')}</span>
                        <AssetSelect
                            value={tool.variant as AssetKey}
                            disabled={disabled}
                            onChange={(key) => {
                                setTool((cur) => ({
                                    ...cur,
                                    variant: key,
                                    asset_key: key,
                                    fv: DECORATIONS[key]?.fv ?? cur.fv,
                                }));
                            }}
                        />
                    </label>
                    <NumberControl
                        label={t('tools.zoneMargin')}
                        help={t('tools.zoneMarginHelp')}
                        value={tool.margin}
                        min={0}
                        max={20}
                        step={0.5}
                        defaultValue={2}
                        showSlider
                        disabled={disabled}
                        onChange={(v) =>
                            setTool((cur) => ({ ...cur, margin: v }))
                        }
                    />
                </>
            ) : null}
            {tool.variant === 'line' ? (
                <>
                    <p className="sideFieldGroupLabel">
                        {t('tools.lineSettings')}
                    </p>
                    <NumberControl
                        label={t('tools.lineGap')}
                        value={tool.spacing}
                        min={-20}
                        max={40}
                        step={0.5}
                        defaultValue={0}
                        showSlider
                        disabled={disabled}
                        onChange={(v) =>
                            setTool((cur) => ({ ...cur, spacing: v }))
                        }
                    />
                    <label className="sideLabel sideLabelStack">
                        <span>{t('tools.lineAsset')}</span>
                        <AssetSelect
                            value={tool.line_asset_key ?? 'faridun_ropes4'}
                            disabled={disabled}
                            onChange={(key) =>
                                setTool((t) => ({
                                    ...t,
                                    line_asset_key: key,
                                    fv: DECORATIONS[key]?.fv ?? t.fv,
                                }))
                            }
                        />
                    </label>
                    <NumberControl
                        label={t('tools.zoneMargin')}
                        help={t('tools.zoneMarginHelp')}
                        value={tool.margin}
                        min={0}
                        max={20}
                        step={0.5}
                        defaultValue={2}
                        showSlider
                        disabled={disabled}
                        onChange={(v) =>
                            setTool((cur) => ({ ...cur, margin: v }))
                        }
                    />
                    <p className="sideHint subtle">{t('tools.lineHint')}</p>
                </>
            ) : null}
            {tool.variant === 'eraser' ? (
                <>
                    <p className="sideFieldGroupLabel">
                        {t('tools.eraserTargets')}
                    </p>
                    <label className="sideLabel sideLabelStack">
                        <MultiAssetSelect
                            disabled={disabled}
                            value={{
                                faridun_ropes4:
                                    tool.eraser_targets?.faridun_ropes4 !== false,
                                faridun_ropes1:
                                    tool.eraser_targets?.faridun_ropes1 !== false,
                                moss: tool.eraser_targets?.moss !== false,
                                sand: tool.eraser_targets?.sand !== false,
                                maraketh_rubble1:
                                    tool.eraser_targets?.maraketh_rubble1 !== false,
                                faridun_tools5:
                                    tool.eraser_targets?.faridun_tools5 !== false,
                                leaf_pile3:
                                    tool.eraser_targets?.leaf_pile3 !== false,
                            }}
                            onChange={(next) =>
                                setTool((cur) => ({
                                    ...cur,
                                    eraser_targets: {
                                        faridun_ropes4: next.faridun_ropes4,
                                        faridun_ropes1: next.faridun_ropes1,
                                        moss: next.moss,
                                        sand: next.sand,
                                        maraketh_rubble1: next.maraketh_rubble1,
                                        faridun_tools5: next.faridun_tools5,
                                        leaf_pile3: next.leaf_pile3,
                                    },
                                }))
                            }
                        />
                    </label>
                    <label className="sideLabel sideLabelStack">
                        <span>
                            {t('tools.eraserSize', {
                                value: tool.brush_width_view,
                            })}
                        </span>
                        <input
                            type="range"
                            min={2}
                            max={80}
                            step={1}
                            value={tool.brush_width_view}
                            disabled={disabled}
                            onChange={(e) =>
                                setTool((t) => ({
                                    ...t,
                                    brush_width_view: Number(e.target.value),
                                }))
                            }
                        />
                    </label>
                    <p className="sideHint subtle">{t('tools.eraserHint')}</p>
                </>
            ) : null}
            {tool.variant === 'fill' ? (
                <FillSettings
                    tool={tool}
                    setTool={setTool}
                    disabled={disabled}
                />
            ) : null}
        </>
    );
}

function FillSettings(props: {
    tool: Tool;
    setTool: Dispatch<SetStateAction<Tool>>;
    disabled: boolean;
}) {
    const { tool, setTool, disabled } = props;
    const { t } = useTranslation('editor');
    const FILL_MARGIN_OFFSET = 4;
    const stored = tool.fill_margin_world ?? -FILL_MARGIN_OFFSET;
    const displayed = Math.max(0, Math.round(stored + FILL_MARGIN_OFFSET));
    const fillMode: FillMode =
        tool.fill_mode
        ?? ((tool.fill_connectivity ?? 4) === 8 ? 'eight_way_free' : 'four_way');
    const fillModeParams = tool.fill_mode_params ?? {};

    return (
        <>
            <p className="sideFieldGroupLabel">{t('tools.fillSettings')}</p>
            <label className="sideLabel sideLabelStack">
                <span>{t('tools.fillAsset')}</span>
                <AssetSelect
                    value={tool.fill_asset_key ?? 'faridun_ropes4'}
                    disabled={disabled}
                    onChange={(key) =>
                        setTool((t) => ({
                            ...t,
                            fill_asset_key: key,
                            fv: DECORATIONS[key]?.fv ?? t.fv,
                        }))
                    }
                />
            </label>
            <label className="sideLabel">
                <span>{t('tools.fillMode')}</span>
                <select
                    className="sideSelect"
                    value={fillMode}
                    disabled={disabled}
                    onChange={(e) =>
                        setTool((cur) => {
                            const nextMode = e.target.value as FillMode;
                            return {
                                ...cur,
                                fill_mode: nextMode,
                                // Legacy compatibility for old scene readers.
                                fill_connectivity: nextMode === 'four_way' ? 4 : 8,
                            };
                        })
                    }
                >
                    <option value="four_way">{t('tools.fillModeFourWay')}</option>
                    <option value="eight_way_free">{t('tools.fillModeEightWayFree')}</option>
                    <option value="eight_way_corner_safe">
                        {t('tools.fillModeEightWayCornerSafe')}
                    </option>
                    <option value="orthogonal_first">
                        {t('tools.fillModeOrthogonalFirst')}
                    </option>
                    <option value="radius_limited">{t('tools.fillModeRadiusLimited')}</option>
                    <option value="narrow_passage_block">
                        {t('tools.fillModeNarrowPassageBlock')}
                    </option>
                    <option value="weighted">{t('tools.fillModeWeighted')}</option>
                </select>
            </label>
            {fillMode === 'radius_limited' ? (
                <NumberControl
                    label={t('tools.fillRadius')}
                    help={t('tools.fillRadiusHelp')}
                    value={Math.max(
                        1,
                        Math.round(
                            fillModeParams.radius_world
                            ?? FILL_MODE_DEFAULTS.radius_world,
                        ),
                    )}
                    min={1}
                    max={500}
                    step={1}
                    defaultValue={FILL_MODE_DEFAULTS.radius_world}
                    showSlider
                    disabled={disabled}
                    onChange={(v) =>
                        setTool((cur) => ({
                            ...cur,
                            fill_mode_params: {
                                ...(cur.fill_mode_params ?? {}),
                                radius_world: Math.max(1, Math.round(v)),
                            },
                        }))
                    }
                />
            ) : null}
            {fillMode === 'narrow_passage_block' ? (
                <NumberControl
                    label={t('tools.fillMinPassageWidth')}
                    help={t('tools.fillMinPassageWidthHelp')}
                    value={Math.max(
                        2,
                        Math.round(
                            fillModeParams.min_passage_width_world
                            ?? FILL_MODE_DEFAULTS.min_passage_width_world,
                        ),
                    )}
                    min={2}
                    max={20}
                    step={1}
                    defaultValue={FILL_MODE_DEFAULTS.min_passage_width_world}
                    showSlider
                    disabled={disabled}
                    onChange={(v) =>
                        setTool((cur) => ({
                            ...cur,
                            fill_mode_params: {
                                ...(cur.fill_mode_params ?? {}),
                                min_passage_width_world: Math.max(2, Math.round(v)),
                            },
                        }))
                    }
                />
            ) : null}
            {fillMode === 'weighted' ? (
                <>
                    <NumberControl
                        label={t('tools.fillCardinalCost')}
                        help={t('tools.fillCardinalCostHelp')}
                        value={Math.max(
                            0.1,
                            Number(
                                (
                                    fillModeParams.cardinal_cost
                                    ?? FILL_MODE_DEFAULTS.cardinal_cost
                                ).toFixed(2),
                            ),
                        )}
                        min={0.1}
                        max={10}
                        step={0.1}
                        defaultValue={FILL_MODE_DEFAULTS.cardinal_cost}
                        disabled={disabled}
                        onChange={(v) =>
                            setTool((cur) => ({
                                ...cur,
                                fill_mode_params: {
                                    ...(cur.fill_mode_params ?? {}),
                                    cardinal_cost: Math.max(0.1, Number(v.toFixed(2))),
                                },
                            }))
                        }
                    />
                    <NumberControl
                        label={t('tools.fillDiagonalCost')}
                        help={t('tools.fillDiagonalCostHelp')}
                        value={Math.max(
                            0.1,
                            Number(
                                (
                                    fillModeParams.diagonal_cost
                                    ?? FILL_MODE_DEFAULTS.diagonal_cost
                                ).toFixed(2),
                            ),
                        )}
                        min={0.1}
                        max={10}
                        step={0.1}
                        defaultValue={FILL_MODE_DEFAULTS.diagonal_cost}
                        disabled={disabled}
                        onChange={(v) =>
                            setTool((cur) => ({
                                ...cur,
                                fill_mode_params: {
                                    ...(cur.fill_mode_params ?? {}),
                                    diagonal_cost: Math.max(0.1, Number(v.toFixed(2))),
                                },
                            }))
                        }
                    />
                </>
            ) : null}
            <label className="sideLabel">
                <span>{t('tools.fillWalls')}</span>
                <select
                    className="sideSelect"
                    value={tool.fill_walls_scope ?? 'all_layers'}
                    disabled={disabled}
                    onChange={(e) =>
                        setTool((t) => ({
                            ...t,
                            fill_walls_scope:
                                e.target.value === 'active_layer'
                                    ? 'active_layer'
                                    : 'all_layers',
                        }))
                    }
                >
                    <option value="all_layers">
                        {t('tools.fillWallsAll')}
                    </option>
                    <option value="active_layer">
                        {t('tools.fillWallsActive')}
                    </option>
                </select>
            </label>
            <NumberControl
                label={t('tools.fillSpacing')}
                help={t('tools.fillSpacingHelp')}
                value={Math.max(1, Math.round(tool.fill_step_world ?? 4))}
                min={1}
                max={20}
                step={1}
                defaultValue={4}
                showSlider
                disabled={disabled}
                onChange={(v) =>
                    setTool((cur) => ({
                        ...cur,
                        fill_step_world: Math.max(1, Math.round(v)),
                    }))
                }
            />
            <NumberControl
                label={t('tools.fillMargin')}
                help={t('tools.fillMarginHelp')}
                value={displayed}
                min={0}
                max={20}
                step={1}
                defaultValue={0}
                showSlider
                disabled={disabled}
                onChange={(v) => {
                    const clamped = Math.max(0, Math.round(v));
                    setTool((cur) => ({
                        ...cur,
                        fill_margin_world: clamped - FILL_MARGIN_OFFSET,
                    }));
                }}
            />
            <NumberControl
                label={t('tools.mapMargin')}
                help={t('tools.zoneMarginHelp')}
                value={tool.margin}
                min={0}
                max={20}
                step={0.5}
                defaultValue={2}
                showSlider
                disabled={disabled}
                onChange={(v) => setTool((cur) => ({ ...cur, margin: v }))}
            />
            <NumberControl
                label={t('tools.fillLimit')}
                value={Math.max(1, Math.round(tool.fill_max_placements ?? 120))}
                min={1}
                step={10}
                defaultValue={120}
                presets={[120, 300, HIDEOUT_PLACEMENTS_HARD_LIMIT]}
                disabled={disabled}
                onChange={(v) =>
                    setTool((cur) => ({
                        ...cur,
                        fill_max_placements: Math.max(1, Math.round(v)),
                    }))
                }
            />
            <p className="sideHint subtle">{t('tools.fillHint2')}</p>
        </>
    );
}
