import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type NumberControlProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  // Step for +/- buttons, arrow keys, and slider. Defaults to 1.
  step?: number;
  // Default value. When set, a reset button is shown next to the label.
  defaultValue?: number;
  // Show the range slider below the field. Requires min and max.
  showSlider?: boolean;
  // Quick preset values rendered as chips below the field.
  presets?: number[];
  // Short hint text rendered below the control.
  help?: string;
  // Short unit suffix rendered to the right of the input.
  unitSuffix?: string;
  disabled?: boolean;
  // Custom display formatter (e.g. for fractional values).
  format?: (v: number) => string;
};

const DEFAULT_FORMAT = (v: number): string => {
  if (Number.isInteger(v)) return String(v);
  return Number(v.toFixed(4)).toString();
};

function clampValue(v: number, min?: number, max?: number): number {
  let next = v;
  if (min != null && next < min) next = min;
  if (max != null && next > max) next = max;
  return next;
}

export function NumberControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  defaultValue,
  showSlider = false,
  presets,
  help,
  unitSuffix,
  disabled,
  format = DEFAULT_FORMAT,
}: NumberControlProps) {
  const { t } = useTranslation('editor');
  const reactId = useId();
  const inputId = `${reactId}-input`;
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    onChange(clampValue(raw, min, max));
  };

  const handleDec = () => commit(value - step);
  const handleInc = () => commit(value + step);
  const handleReset = () => {
    if (defaultValue != null) commit(defaultValue);
  };

  const isAtDefault =
    defaultValue == null || Math.abs(value - defaultValue) < 1e-9;
  const canDec = !disabled && (min == null || value > min);
  const canInc = !disabled && (max == null || value < max);
  const inputMode: 'numeric' | 'decimal' = step < 1 ? 'decimal' : 'numeric';

  return (
    <div className="numberControl">
      <div className="numberControlHead">
        <label htmlFor={inputId} className="numberControlLabel">
          {label}
        </label>
        {defaultValue != null ? (
          <button
            type="button"
            className="numberControlReset"
            title={t('numberControl.reset')}
            aria-label={t('numberControl.reset')}
            disabled={disabled || isAtDefault}
            onClick={handleReset}
          >
            <RotateCcw aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="numberControlMain">
        <button
          type="button"
          className="numberControlStep"
          title={t('numberControl.decrement')}
          aria-label={t('numberControl.decrement')}
          disabled={!canDec}
          onClick={handleDec}
        >
          <Minus aria-hidden />
        </button>
        <input
          id={inputId}
          className="numberControlInput sideInput"
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          disabled={disabled}
          value={draft ?? format(value)}
          onFocus={() => setDraft(format(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const raw = (draft ?? '').replace(',', '.').trim();
            setDraft(null);
            if (!raw) return;
            const n = Number(raw);
            if (Number.isFinite(n)) commit(n);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.currentTarget as HTMLInputElement).blur();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setDraft(null);
              handleInc();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setDraft(null);
              handleDec();
            } else if (e.key === 'Escape') {
              setDraft(null);
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
        />
        {unitSuffix ? (
          <span className="numberControlUnit" aria-hidden>
            {unitSuffix}
          </span>
        ) : null}
        <button
          type="button"
          className="numberControlStep"
          title={t('numberControl.increment')}
          aria-label={t('numberControl.increment')}
          disabled={!canInc}
          onClick={handleInc}
        >
          <Plus aria-hidden />
        </button>
      </div>
      {showSlider && min != null && max != null ? (
        <input
          className="numberControlRange"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => commit(Number(e.target.value))}
        />
      ) : null}
      {presets && presets.length > 0 ? (
        <div className="numberControlPresets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={
                Math.abs(p - value) < 1e-9
                  ? 'numberControlChip numberControlChip--active'
                  : 'numberControlChip'
              }
              disabled={disabled}
              onClick={() => commit(p)}
            >
              {format(p)}
            </button>
          ))}
        </div>
      ) : null}
      {help ? (
        <p className="sideHint subtle numberControlHelp">{help}</p>
      ) : null}
    </div>
  );
}
