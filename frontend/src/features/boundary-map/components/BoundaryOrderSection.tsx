import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  RotateCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { IconButton } from '../../../components/IconButton';

export type BoundaryOrderSectionProps = {
  ordered: [number, number][];
  selectedIdx: number | undefined;
  onSelectVertex: (index: number) => void;
  moveUp: () => void;
  moveDown: () => void;
  rotateFwd: () => void;
  reverse: () => void;
  orderByNearestNeighbor: () => void;
  orderByPolarAngle: () => void;
};

export function BoundaryOrderSection({
  ordered,
  selectedIdx,
  onSelectVertex,
  moveUp,
  moveDown,
  rotateFwd,
  reverse,
  orderByNearestNeighbor,
  orderByPolarAngle,
}: BoundaryOrderSectionProps) {
  const { t } = useTranslation('boundary');
  return (
    <section className="sideSection">
      <h2 className="sideHeading">{t('order.section')}</h2>
      <p className="sideHint subtle">
        {t('order.hint')}
      </p>
      <div className="sideVertexScroll">
        {ordered.map((pt, idx) => (
          <button
            key={`${pt[0]}-${pt[1]}-${idx}`}
            type="button"
            className={
              selectedIdx === idx
                ? 'sideVertexRow is-selected'
                : 'sideVertexRow'
            }
            onClick={() => onSelectVertex(idx)}
          >
            {String(idx).padStart(2, '0')} ({pt[0]}, {pt[1]})
          </button>
        ))}
      </div>
      <div className="sideBtnRow">
        <IconButton
          size="sm"
          variant="muted"
          title={t('order.moveUpTitle')}
          aria-label={t('order.moveUpAria')}
          onClick={moveUp}
        >
          <ChevronUp aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          variant="muted"
          title={t('order.moveDownTitle')}
          aria-label={t('order.moveDownAria')}
          onClick={moveDown}
        >
          <ChevronDown aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          variant="muted"
          title={t('order.rotateTitle')}
          aria-label={t('order.rotateAria')}
          onClick={rotateFwd}
        >
          <RotateCw aria-hidden />
        </IconButton>
        <IconButton
          size="sm"
          variant="muted"
          title={t('order.reverseTitle')}
          aria-label={t('order.reverseAria')}
          onClick={reverse}
        >
          <ArrowDownUp aria-hidden />
        </IconButton>
      </div>
      <div className="sideBtnStack">
        <button
          type="button"
          className="iconBtnLabeled sideBtnWide sideBtnMuted"
          title={t('order.nearestTitle')}
          onClick={orderByNearestNeighbor}
        >
          {t('order.nearestButton')}
        </button>
        <button
          type="button"
          className="iconBtnLabeled sideBtnWide sideBtnMuted"
          title={t('order.polarTitle')}
          onClick={orderByPolarAngle}
        >
          {t('order.polarButton')}
        </button>
      </div>
    </section>
  );
}
