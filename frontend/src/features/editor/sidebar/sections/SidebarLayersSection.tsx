import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    Lock,
    Plus,
    Trash2,
    Unlock,
} from 'lucide-react';

import {
    DEFAULT_MAP_LAYER_INDEX,
} from '../../lib/editorConstants';
import { layerId } from '../../lib/editorIds';
import { getLayerDisplayTitle } from '../../lib/editorLayers';
import { refEqual } from '../../lib/placementSelection';
import type { EditorSidebarLayersProps } from '../editorSidebarTypes';

export function SidebarLayersSection(props: EditorSidebarLayersProps) {
    const { t } = useTranslation('editor');
    const {
        placementStats,
        addLayer,
        layers,
        layerIdx,
        setLayerIdx,
        removeLayer,
        setLayerVisible,
        selected,
        onSelectSidebarPlacement,
        onLayerLockedToggle,
        sceneReadOnly,
    } = props;

    const [defaultObjsOpen, setDefaultObjsOpen] = useState(false);
    const layer0Unlocked = !layers[DEFAULT_MAP_LAYER_INDEX]?.locked;
    const ro = Boolean(sceneReadOnly);

    if (ro) {
        return (
            <section className="sideSection sideLayers">
                <h2 className="sideHeading">{t('layers.section')}</h2>
                <p className="sideHint subtle">
                    {t('layers.baseReadonlyHint')}
                </p>
                <p className="sideHint">
                    {t('layers.stats', {
                        placements: placementStats.placementsTotal,
                        batches: placementStats.batches,
                    })}
                </p>
            </section>
        );
    }

    return (
        <section className="sideSection sideLayers">
            <h2 className="sideHeading">{t('layers.section')}</h2>
            <p className="sideHint">
                {t('layers.stats', {
                    placements: placementStats.placementsTotal,
                    batches: placementStats.batches,
                })}
            </p>
            <button
                type="button"
                className="iconBtnLabeled sideBtnWide sideBtnMuted"
                disabled={ro}
                onClick={addLayer}
            >
                <Plus aria-hidden />
                {t('layers.addLayer')}
            </button>
            <ul className="sideLayerList">
                {layers.map((ly, i) => {
                    const placementCount = ly.batches.reduce(
                        (s, b) => s + b.placements.length,
                        0,
                    );
                    const displayTitle = getLayerDisplayTitle(ly, i, t);
                    return (
                        <li
                            key={`${ly.kind ?? ly.title ?? 'layer'}-${i}`}
                            className="sideLayerItem"
                        >
                            <div className="sideLayerTop">
                                <button
                                    type="button"
                                    className={`sideLayerSel ${layerId(i) === layerIdx ? 'active' : ''}`}
                                    onClick={() => setLayerIdx(layerId(i))}
                                >
                                    {i + 1}. {displayTitle}{' '}
                                    <span className="sideMuted">
                                        ({placementCount})
                                    </span>
                                </button>
                                {i !== DEFAULT_MAP_LAYER_INDEX ? (
                                    <button
                                        type="button"
                                        className="sideLayerDel"
                                        title={t('layers.deleteLayer')}
                                        aria-label={t('layers.deleteLayerAria', {
                                            index: i + 1,
                                        })}
                                        disabled={ro}
                                        onClick={() => removeLayer(i)}
                                    >
                                        <Trash2 size={16} aria-hidden />
                                    </button>
                                ) : (
                                    <span
                                        className="sideLayerDelPlaceholder"
                                        aria-hidden
                                    />
                                )}
                            </div>

                            {i === DEFAULT_MAP_LAYER_INDEX ? (
                                <div className="sideLayerDefaultObjs">
                                    <button
                                        type="button"
                                        className="sideLayerSubToggle"
                                        disabled={ro}
                                        onClick={() =>
                                            setDefaultObjsOpen((v) => !v)}
                                        aria-expanded={defaultObjsOpen}
                                    >
                                        {defaultObjsOpen ? (
                                            <ChevronDown size={16} aria-hidden />
                                        ) : (
                                            <ChevronRight size={16} aria-hidden />
                                        )}
                                        {t('layers.objects', { count: placementCount })}
                                    </button>
                                    {defaultObjsOpen ? (
                                        <ul className="sideLayerPlacementSublist">
                                            {ly.batches.flatMap((b, bi) =>
                                                b.placements.map((_, pi) => {
                                                    const ref = {
                                                        layerIdx: layerId(i),
                                                        batchIdx: bi,
                                                        placementIdx: pi,
                                                    };
                                                    const label =
                                                        b.placements.length > 1
                                                            ? `${b.template_name_ru} (${pi + 1})`
                                                            : b.template_name_ru;
                                                    const isSel =
                                                        selected.some((s) =>
                                                            refEqual(s, ref),
                                                        );
                                                    return (
                                                        <li
                                                            key={`${i}-${bi}-${pi}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                className={`sideLayerPlacementBtn ${isSel ? 'selected' : ''}`}
                                                                disabled={ro || ly.locked}
                                                                title={
                                                                    ly.locked
                                                                        ? t('layers.layerLocked')
                                                                        : undefined
                                                                }
                                                                onClick={() =>
                                                                    onSelectSidebarPlacement(
                                                                        ref,
                                                                    )}
                                                            >
                                                                {label}
                                                            </button>
                                                        </li>
                                                    );
                                                }),
                                            )}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="sideLayerChecks">
                                <label className="layerCheckLbl">
                                    <input
                                        type="checkbox"
                                        checked={ly.visible}
                                        disabled={ro}
                                        onChange={(e) =>
                                            setLayerVisible(i, e.target.checked)
                                        }
                                    />
                                    {ly.visible ? (
                                        <Eye aria-hidden />
                                    ) : (
                                        <EyeOff aria-hidden />
                                    )}
                                    <span className="toolSegmentSr">
                                        {t('layers.layerVisibility')}
                                    </span>
                                </label>
                                <label
                                    className={`layerCheckLbl ${i > 0 && layer0Unlocked ? 'layerCheckLblDisabled' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={ly.locked}
                                        disabled={ro || (i > 0 && layer0Unlocked)}
                                        onChange={(e) =>
                                            onLayerLockedToggle(
                                                i,
                                                e.target.checked,
                                            )}
                                    />
                                    {ly.locked ? (
                                        <Lock aria-hidden />
                                    ) : (
                                        <Unlock aria-hidden />
                                    )}
                                    <span className="toolSegmentSr">
                                        {t('layers.layerLock')}
                                    </span>
                                </label>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
