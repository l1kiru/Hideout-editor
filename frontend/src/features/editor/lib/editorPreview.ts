import { hideoutRToSvgRotateDeg } from '../../../lib/coords';
import { assetKeyForTemplate } from '../../../lib/sceneDecorations';
import { ROT_FULL, ROT_LINE_ROPE_OFFSET } from './editorConstants';
import { normR } from './editorViewport';

const MARAKETH_LINE_RENDER_OFFSET_DEG = -110;

// SVG rotate() angle for a doodad preview. Special correction is applied
// only to the legacy faridun_ropes4 sprite (and the matching maraketh variant).
export function previewRotateDegForDoodad(
  storedR: number,
  cameraDeg: number,
  templateHash: number,
  facetFv?: number | null,
  lineStroke = false,
): number {
  const ak = assetKeyForTemplate(templateHash, facetFv);
  const effectiveStoredR = lineStroke && ak === 'maraketh_rubble1'
    ? normR(-storedR)
    : storedR;
  const previewOffset = lineStroke
    ? ROT_LINE_ROPE_OFFSET
    : ak === 'maraketh_rubble1'
      ? ROT_LINE_ROPE_OFFSET + ROT_FULL / 2
      : ak === 'faridun_ropes4'
      ? ROT_LINE_ROPE_OFFSET
      : 0;
  const rEff = previewOffset !== 0
    ? normR(effectiveStoredR + previewOffset)
    : effectiveStoredR;
  return hideoutRToSvgRotateDeg(rEff, cameraDeg, ROT_FULL);
}

export function previewRenderRotateDegForDoodad(
  storedR: number,
  cameraDeg: number,
  templateHash: number,
  facetFv?: number | null,
  lineStroke = false,
): number {
  const ak = assetKeyForTemplate(templateHash, facetFv);
  if (lineStroke && ak === 'maraketh_rubble1') {
    return (
      -hideoutRToSvgRotateDeg(storedR, cameraDeg, ROT_FULL)
      + MARAKETH_LINE_RENDER_OFFSET_DEG
    );
  }
  const base = previewRotateDegForDoodad(
    storedR,
    cameraDeg,
    templateHash,
    facetFv,
    lineStroke,
  );
  return base;
}
