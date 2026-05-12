import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  parseHideoutPlacements,
  publishBoundaryOrderHideoutMap,
} from '../../../api/client';
import {
  chainFromSelections,
  distinctMarkerChoices,
  markerFromNameField,
  mostFrequentPlacementType,
  orderChainNearestNeighbor,
  orderChainPolarAroundCentroid,
  polygonClosedSelfIntersects,
  type ParsedPayload,
  type PlacementRow,
} from '../lib/boundaryMapPure';
import {
  buildPublishPayload,
  deriveHeuristicOrderState,
  deriveMarkerChainState,
  NEAREST_NEIGHBOR_LABEL,
  validateOrderedRing,
} from '../lib/boundaryMapUseCases';
import { useNativeDialogs } from '../../../context/NativeDialogContext';
import { localizeApiError } from '../../../i18n/localizeApiError';

export type BoundaryMapApi = {
  parseHideoutPlacements: typeof parseHideoutPlacements;
  publishBoundaryOrderHideoutMap: typeof publishBoundaryOrderHideoutMap;
};

const defaultApi: BoundaryMapApi = {
  parseHideoutPlacements,
  publishBoundaryOrderHideoutMap,
};

export type UseBoundaryMapControllerOptions = {
  api?: Partial<BoundaryMapApi>;
};

export function useBoundaryMapController(
  options?: UseBoundaryMapControllerOptions,
) {
  const { t } = useTranslation('boundary');
  const dialogs = useNativeDialogs();
  const api: BoundaryMapApi = { ...defaultApi, ...options?.api };
  const [status, setStatus] = useState('');
  const [mapDisplayName, setMapDisplayName] = useState('');
  const [createAsBaseMap, setCreateAsBaseMap] = useState(false);
  const [parsed, setParsed] = useState<ParsedPayload | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [markerNameStr, setMarkerNameStr] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | undefined>(undefined);
  const [ordered, setOrdered] = useState<[number, number][]>([]);
  const [presetPick, setPresetPick] = useState(0);
  // After the first successful "Save to database" the next saves update this map.
  const [publishMapId, setPublishMapId] = useState<number | null>(null);
  const [publishMapName, setPublishMapName] = useState<string | null>(null);

  useEffect(() => {
    const t = mapDisplayName.trim();
    if (publishMapId == null || publishMapName == null)
      return;
    if (t === publishMapName)
      return;
    setPublishMapId(null);
    setPublishMapName(null);
  }, [mapDisplayName, publishMapId, publishMapName]);

  const orderedRef = useRef(ordered);
  const selectedIdxRef = useRef(selectedIdx);
  orderedRef.current = ordered;
  selectedIdxRef.current = selectedIdx;

  const markerFromFields = useCallback(() => {
    return markerFromNameField(markerNameStr);
  }, [markerNameStr]);

  const applyMarkerToChain = useCallback(
    (rows: PlacementRow[], mn: string | null, mh: number | null) => {
      setSelectedIdx(undefined);
      const next = deriveMarkerChainState(rows, mn, mh);
      setOrdered(next.ordered);
      setStatus(next.status);
    },
    [],
  );

  const onUploadHideout = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f)
      return;
    try {
      setStatus(t('status.parseStart', { name: f.name }));
      setPublishMapId(null);
      setPublishMapName(null);
      const body = await api.parseHideoutPlacements(f);
      setParsed(body);
      setSourceFileName(f.name);
      const choices = distinctMarkerChoices(body.placements);
      const top = mostFrequentPlacementType(body.placements);
      if (top) {
        const mn = top.name.trim().length > 0 ? top.name.trim() : null;
        setMarkerNameStr(mn ?? '');
        const idx = choices.findIndex(
          (c) => c.name != null && mn != null && c.name.trim() === mn,
        );
        setPresetPick(idx >= 0 ? idx : 0);
        applyMarkerToChain(body.placements, mn, null);
      }
      else {
        setPresetPick(0);
        setMarkerNameStr('');
        applyMarkerToChain(body.placements, null, null);
      }
    }
    catch (e) {
      setParsed(null);
      setOrdered([]);
      setPublishMapId(null);
      setPublishMapName(null);
      setStatus(t('status.parseError', { error: localizeApiError(t, e) }));
    }
  };

  const onApplyMarkerFilters = () => {
    const { name: mn } = markerFromFields();
    if (!parsed) {
      setStatus(t('status.uploadFirst'));
      return;
    }
    applyMarkerToChain(parsed.placements, mn, null);
  };

  const choiceList = useMemo(
    () => (parsed ? distinctMarkerChoices(parsed.placements) : []),
    [parsed],
  );

  const safePresetPick = choiceList.length
    ? Math.min(Math.max(0, presetPick), choiceList.length - 1)
    : 0;

  const moveUp = () => {
    if (selectedIdx == null || selectedIdx <= 0)
      return;
    setOrdered((p) => {
      const cp = [...p];
      [cp[selectedIdx - 1], cp[selectedIdx]] = [
        cp[selectedIdx],
        cp[selectedIdx - 1],
      ];
      return cp;
    });
    setSelectedIdx(selectedIdx - 1);
  };

  const moveDown = () => {
    if (selectedIdx == null || selectedIdx >= ordered.length - 1)
      return;
    setOrdered((p) => {
      const cp = [...p];
      [cp[selectedIdx], cp[selectedIdx + 1]] = [
        cp[selectedIdx + 1],
        cp[selectedIdx],
      ];
      return cp;
    });
    setSelectedIdx(selectedIdx + 1);
  };

  // Cycle the selected vertex in the boundary order with wrap-around (0 <-> last).
  const cycleVertexWheel = useCallback((direction: -1 | 1) => {
    const prev = orderedRef.current;
    const i = selectedIdxRef.current;
    if (i == null || prev.length < 2)
      return;
    const n = prev.length;
    const cp = [...prev];
    let nextSel: number;
    if (direction === -1) {
      if (i === 0) {
        const [v] = cp.splice(0, 1);
        cp.push(v!);
        nextSel = n - 1;
      }
      else {
        [cp[i - 1], cp[i]] = [cp[i]!, cp[i - 1]!];
        nextSel = i - 1;
      }
    }
    else {
      if (i === n - 1) {
        const v = cp.pop()!;
        cp.unshift(v);
        nextSel = 0;
      }
      else {
        [cp[i], cp[i + 1]] = [cp[i + 1]!, cp[i]!];
        nextSel = i + 1;
      }
    }
    orderedRef.current = cp;
    selectedIdxRef.current = nextSel;
    setOrdered(cp);
    setSelectedIdx(nextSel);
  }, []);

  const rotateFwd = () => {
    if (ordered.length < 2)
      return;
    setOrdered((p) => {
      const cp = [...p];
      cp.push(cp.shift()!);
      return cp;
    });
    setSelectedIdx((i) =>
      i == null ? 0 : (i - 1 + ordered.length) % ordered.length,
    );
  };

  const reverse = () => {
    setOrdered((prev) => {
      if (prev.length === 0)
        return prev;
      const rev = [...prev].reverse();
      setSelectedIdx((i) =>
        i == null ? undefined : prev.length - 1 - i,
      );
      return rev;
    });
  };

  const orderedRingSelfIntersects = useMemo(
    () => ordered.length >= 3 && polygonClosedSelfIntersects(ordered),
    [ordered],
  );

  const applyOrderHeuristic = useCallback(
    (
      preferredFn: (pts: [number, number][]) => [number, number][],
      preferredShortLabel: string,
    ) => {
      const { name: mn } = markerFromFields();
      if (!parsed) {
        setStatus(t('status.uploadFirst'));
        return;
      }
      const chain = chainFromSelections(parsed.placements, mn, null);
      if (chain.length < 3) {
        setStatus(
          t('status.needThreeMarkerPoints'),
        );
        return;
      }
      const next = deriveHeuristicOrderState(
        chain,
        preferredFn,
        preferredShortLabel,
      );
      if (!next) return;
      setOrdered(next.order);
      setSelectedIdx(undefined);
      setStatus(next.status);
    },
    [parsed, markerFromFields, t],
  );

  const orderByNearestNeighbor = useCallback(() => {
    applyOrderHeuristic(orderChainNearestNeighbor, NEAREST_NEIGHBOR_LABEL);
  }, [applyOrderHeuristic]);

  const orderByPolarAngle = useCallback(() => {
    applyOrderHeuristic(orderChainPolarAroundCentroid, t('status.heuristicPolar'));
  }, [applyOrderHeuristic, t]);

  const onPublish = async (ev: FormEvent) => {
    ev.preventDefault();
    const { name: mn } = markerFromFields();
    const name = mapDisplayName.trim();
    if (name.length === 0) {
      setStatus(t('status.needMapName'));
      return;
    }
    const orderedErr = validateOrderedRing(ordered);
    if (orderedErr) {
      setStatus(orderedErr);
      return;
    }
    try {
      const payload = buildPublishPayload({
        name,
        ordered,
        markerName: mn,
        sourceFileName,
        parsed,
        createAsBaseMap,
        publishMapId,
      });
      const res = await api.publishBoundaryOrderHideoutMap(payload);
      setPublishMapId(res.map_id);
      setPublishMapName(name);
      setStatus(
        t('status.saved', {
          name: res.display_name,
          id: res.map_id,
        }),
      );
      await dialogs.alert(
        t('status.savedAlert', { name: res.display_name }),
      );
    }
    catch (e) {
      setStatus(t('status.saveError', { error: localizeApiError(t, e) }));
    }
  };

  const onPresetChange = (index: number) => {
    setPresetPick(index);
    const ch = choiceList[index];
    if (!ch || ch.name == null)
      return;
    setMarkerNameStr(ch.name);
    if (parsed)
      applyMarkerToChain(parsed.placements, ch.name, null);
  };

  return {
    status,
    mapDisplayName,
    setMapDisplayName,
    createAsBaseMap,
    setCreateAsBaseMap,
    parsed,
    markerNameStr,
    setMarkerNameStr,
    selectedIdx,
    setSelectedIdx,
    ordered,
    choiceList,
    safePresetPick,
    orderedRingSelfIntersects,
    onUploadHideout,
    onApplyMarkerFilters,
    onPresetChange,
    moveUp,
    moveDown,
    rotateFwd,
    reverse,
    orderByNearestNeighbor,
    orderByPolarAngle,
    onPublish,
    cycleVertexWheel,
  };
}
