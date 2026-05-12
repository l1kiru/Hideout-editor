import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
    backgroundWidthViewBaseForFit,
    zoneViewLimitsWithPad,
} from '../../../lib/viewLimits';
import type { Background } from '../../../types/scene';

type UseEditorBackgroundControllerArgs = {
    background: Background;
    backgroundRef: MutableRefObject<Background>;
    bgSelectedRef: MutableRefObject<boolean>;
    bgNaturalSize: { w: number; h: number } | null;
    boundary: [number, number][];
    cameraDeg: number;
    setBackground: Dispatch<SetStateAction<Background>>;
    setBgSelected: Dispatch<SetStateAction<boolean>>;
    setStatus: Dispatch<SetStateAction<string>>;
    defaultBackground: () => Background;
    pushBackgroundUndo: (snap: Background, label: string) => void;
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
        setBackground,
        setBgSelected,
        setStatus,
        defaultBackground,
        pushBackgroundUndo,
    } = args;

    const rotateBackground = useCallback(
        (deltaDeg: number) => {
            if (!background.path) return;
            if (background.locked) {
                setStatus(t('status.bgLockedRotate'));
                return;
            }
            pushBackgroundUndo({ ...background }, t('status.bgRotateLabel'));
            setBackground((b) => ({
                ...b,
                rotation_deg: (b.rotation_deg ?? 0) + deltaDeg,
            }));
        },
        [background, pushBackgroundUndo, setBackground, setStatus, t],
    );

    const clearBackground = useCallback(() => {
        if (!background.path) return;
        pushBackgroundUndo({ ...background }, t('status.bgDeleteLabel'));
        setBackground((b) => ({
            ...defaultBackground(),
            locked: b.locked,
            lock_anchor_view_x: null,
            lock_anchor_view_y: null,
        }));
        setBgSelected(false);
        setStatus(t('status.bgRemoved'));
    }, [
        background,
        pushBackgroundUndo,
        setBackground,
        setBgSelected,
        setStatus,
        defaultBackground,
        t,
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
            if (!bgWheelUndoPushedRef.current) {
                pushBackgroundUndo({ ...bg }, t('status.bgScaleLabel'));
                bgWheelUndoPushedRef.current = true;
            }
            const f = e.deltaY > 0 ? 0.93 : 1.08;
            setBackground((b) => ({
                ...b,
                scale: Math.max(0.05, Math.min(4, (b.scale ?? 1) * f)),
            }));
            return true;
        },
        [bgSelectedRef, backgroundRef, pushBackgroundUndo, setBackground, t],
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
        setBackground((b) => ({
            ...b,
            width_view_base: fitted,
            offset_x: cx,
            offset_y: cy,
        }));
        setStatus(t('status.bgFitted'));
    }, [bgNaturalSize, boundary, cameraDeg, setBackground, setStatus, t]);

    return {
        rotateBackground,
        clearBackground,
        handleBackgroundCtrlWheel,
        applyBackgroundFitToZone,
    };
}
