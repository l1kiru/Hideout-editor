import { hideoutRToSvgRotateDeg } from '../../../lib/coords';
import { assetKeyForTemplate } from '../../../lib/sceneDecorations';
import { ROT_FULL, ROT_LINE_ROPE_OFFSET } from './editorConstants';
import { normR } from './editorViewport';

// SVG rotate() angle for a doodad preview. Special correction is applied
// only to the legacy faridun_ropes4 sprite (and the matching maraketh variant).
export function previewRotateDegForDoodad(
  storedR: number,
  cameraDeg: number,
  templateHash: number,
  facetFv?: number | null,
): number {
  const ak = assetKeyForTemplate(templateHash, facetFv);
  const previewOffset =
    ak === 'faridun_ropes4'
      ? ROT_LINE_ROPE_OFFSET
      : ak === 'maraketh_rubble1'
        ? ROT_LINE_ROPE_OFFSET + ROT_FULL / 2
        : 0;
  const rEff = previewOffset !== 0
    ? normR(storedR + previewOffset)
    : storedR;
  return hideoutRToSvgRotateDeg(rEff, cameraDeg, ROT_FULL);
}
