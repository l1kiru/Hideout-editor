import { useId, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  distinctPlacementNameHints,
  type MarkerChoice,
  type ParsedPayload,
} from '../lib/boundaryMapPure';

export type BoundaryMarkerSectionProps = {
  parsed: ParsedPayload | null;
  choiceList: MarkerChoice[];
  safePresetPick: number;
  markerNameStr: string;
  onPresetChange: (index: number) => void;
  onMarkerNameChange: (v: string) => void;
  onApplyMarkerFilters: () => void;
};

export function BoundaryMarkerSection({
  parsed,
  choiceList,
  safePresetPick,
  markerNameStr,
  onPresetChange,
  onMarkerNameChange,
  onApplyMarkerFilters,
}: BoundaryMarkerSectionProps) {
  const { t } = useTranslation('boundary');
  const nameListId = useId();
  const nameSuggestions = useMemo(
    () => (parsed ? distinctPlacementNameHints(parsed.placements) : []),
    [parsed],
  );
  const nameListAttr =
    parsed && nameSuggestions.length > 0 ? nameListId : undefined;

  return (
    <section className="sideSection">
      <h2 className="sideHeading">{t('marker.section')}</h2>
      <p className="sideHint subtle">
        {t('marker.hint')}
      </p>
      <label className="sideLabel sideLabelStack">
        <span>{t('marker.choiceLabel')}</span>
        <select
          className="sideSelect"
          disabled={!parsed}
          onChange={(e) => {
            const i = Number.parseInt(e.target.value, 10);
            onPresetChange(i);
          }}
          value={safePresetPick}
        >
          {choiceList.map((c, i) => (
            <option key={`${i}-${c.label}`} value={i}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="sideLabel sideLabelStack">
        <span>{t('marker.nameLabel')}</span>
        <span className="sideHint subtle">
          {t('marker.nameHint')}
        </span>
        <input
          className="sideInput"
          list={nameListAttr}
          autoComplete="off"
          value={markerNameStr}
          onChange={(e) => onMarkerNameChange(e.target.value)}
        />
      </label>
      {nameListAttr ? (
        <datalist id={nameListId}>
          {nameSuggestions.map(({ name, count }) => (
            <option key={name} value={name}>
              {count > 1 ? `${name} (${count} шт.)` : name}
            </option>
          ))}
        </datalist>
      ) : null}
      <button
        type="button"
        className="iconBtnLabeled sideBtnWide sideBtnMuted"
        title={t('marker.applyTitle')}
        onClick={onApplyMarkerFilters}
      >
        <Filter aria-hidden />
        {t('marker.applyButton')}
      </button>
    </section>
  );
}
