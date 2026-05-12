import { Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ParsedPayload } from '../lib/boundaryMapPure';
import {
  fetchSampleHideoutAsFileList,
  fetchSampleHideoutsIndex,
  sampleDisplayName,
} from '../lib/sampleHideouts';

export type BoundarySourceSectionProps = {
  parsed: ParsedPayload | null;
  onUploadHideout: (files: FileList | null) => void | Promise<void>;
};

export function BoundarySourceSection({
  parsed,
  onUploadHideout,
}: BoundarySourceSectionProps) {
  const { t } = useTranslation('boundary');
  const [samples, setSamples] = useState<string[]>([]);
  const [sampleSelection, setSampleSelection] = useState('');
  const [sampleBusy, setSampleBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSampleHideoutsIndex().then((names) => {
      if (!cancelled) setSamples(names);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSampleChange(name: string): Promise<void> {
    setSampleSelection(name);
    if (!name) return;
    setSampleBusy(true);
    try {
      const files = await fetchSampleHideoutAsFileList(name);
      await onUploadHideout(files);
    } finally {
      setSampleBusy(false);
      setSampleSelection('');
    }
  }

  return (
    <section className="sideSection">
      <h2 className="sideHeading">{t('source.section')}</h2>
      <label className="file sideFile iconBtnLabeled sideBtnWide sideBtnMuted">
        <Upload aria-hidden />
        {t('source.upload')}
        <input
          type="file"
          className="hiddenFile"
          accept=".hideout,.json,application/json"
          onChange={(e) => void onUploadHideout(e.target.files)}
        />
      </label>
      {samples.length > 0
        ? (
            <label className="sideLabel sideLabelStack">
              <span>{t('source.samples.label')}</span>
              <span className="sideHint subtle">
                {t('source.samples.hint')}
              </span>
              <select
                className="sideSelect"
                value={sampleSelection}
                disabled={sampleBusy}
                onChange={(e) => void handleSampleChange(e.target.value)}
              >
                <option value="">{t('source.samples.placeholder')}</option>
                {samples.map((name) => (
                  <option key={name} value={name}>
                    {sampleDisplayName(name)}
                  </option>
                ))}
              </select>
            </label>
          )
        : null}
      {parsed
        ? (
            <p className="sideFileMeta">
              {t('source.placementsCount', { count: parsed.placements.length })}
            </p>
          )
        : null}
    </section>
  );
}
