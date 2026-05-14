import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import useEditorStore from '../../../stores/editorStore';
import {
    backgroundWidthViewBaseForFit,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { Background } from '../../../types/scene';
import { defaultBackground } from '../lib/editorDefaults';

type UseEditorBackgroundControllerArgs = {
    background: Background;
    backgroundRef: MutableRefObject<Background>;
    bgSelectedRef: MutableRefObject<boolean>;
    bgNaturalSize: { w: number; h: number } | null;
    boundary: [number, number][];
    cameraDeg: number;
    setStatus: Dispatch<SetStateAction<string>>;
};

export function useEditorBackgroundController(args: UseEditorBackgroundControllerArgs) {
    const { t } = useTranslation('editor');
    const {
        background,
        backgroundRef,
        bgSelectedRef,
        bgNaturalSize,
        boundary,
        cameraDeg,
        setStatus,
    } = args;
    const transformBackground = useEditorStore((state) => state.transformBackground);

    const rotateBackground = useCallback(
        (deltaDeg: number) => {
            if (!background.path) return;
            if (background.locked) {
                setStatus(t('status.bgLockedRotate'));
                return;
            }
            transformBackground({
                label: t('status.bgRotateLabel'),
                updater: (prev) => ({
                    ...prev,
                    rotation_deg: (prev.rotation_deg ?? 0) + deltaDeg,
                }),
            });
        },
        [background, setStatus, t, transformBackground],
    );

    const clearBackground = useCallback(() => {
        if (!background.path) return;
        transformBackground({
            label: t('status.bgDeleteLabel'),
            updater: (prev) => ({
                ...defaultBackground(),
                locked: prev.locked,
                lock_anchor_view_x: null,
                lock_anchor_view_y: null,
            }),
            clearBgSelection: true,
        });
        setStatus(t('status.bgRemoved'));
    }, [
        background,
        setStatus,
        t,
        transformBackground,
    ]);

    const bgWheelLastTsRef = useRef(0);
    const bgWheelUndoPushedRef = useRef(false);
    const handleBackgroundCtrlWheel = useCallback(
        (e: WheelEvent): boolean => {
            if (!bgSelectedRef.current) return false;
            const bg = backgroundRef.current;
            if (!bg.path || bg.locked) return false;
            const now = Date.now();
            if (now - bgWheelLastTsRef.current > 600) {
                bgWheelUndoPushedRef.current = false;
            }
            bgWheelLastTsRef.current = now;
            const shouldRecordUndo = !bgWheelUndoPushedRef.current;
            bgWheelUndoPushedRef.current = true;
            const f = e.deltaY > 0 ? 0.93 : 1.08;
            transformBackground({
                label: t('status.bgScaleLabel'),
                updater: (prev) => ({
                    ...prev,
                    scale: Math.max(0.05, Math.min(4, (prev.scale ?? 1) * f)),
                }),
                recordUndo: shouldRecordUndo,
            });
            return true;
        },
        [bgSelectedRef, backgroundRef, t, transformBackground],
    );

    const applyBackgroundFitToZone = useCallback(() => {
        if (!bgNaturalSize || boundary.length < 3) {
            setStatus(t('status.bgNeedZoneAndImage'));
            return;
        }
        const lims = zoneViewLimitsWithPad(boundary, cameraDeg);
        if (!lims) {
            setStatus(t('status.bgZoneCalcFailed'));
            return;
        }
        const zoneW = lims.xmax - lims.xmin;
        const zoneH = lims.ymax - lims.ymin;
        const cx = (lims.xmin + lims.xmax) / 2;
        const cy = (lims.ymin + lims.ymax) / 2;
        const fitted = backgroundWidthViewBaseForFit(
            zoneW,
            zoneH,
            bgNaturalSize.w,
            bgNaturalSize.h,
        );
        transformBackground({
            label: t('status.bgFitted'),
            updater: (prev) => ({
                ...prev,
                width_view_base: fitted,
                offset_x: cx,
                offset_y: cy,
            }),
            recordUndo: false,
        });
        setStatus(t('status.bgFitted'));
    }, [bgNaturalSize, boundary, cameraDeg, setStatus, t, transformBackground]);

    return {
        rotateBackground,
        clearBackground,
        handleBackgroundCtrlWheel,
        applyBackgroundFitToZone,
    };
}
