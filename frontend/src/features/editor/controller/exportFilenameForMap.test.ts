import { describe, expect, it } from 'vitest';

import { exportFilenameForMap } from './exportFilenameForMap';

describe('exportFilenameForMap', () => {
    it('appends .hideout to a simple display name', () => {
        expect(exportFilenameForMap('My Hideout')).toBe('My Hideout.hideout');
    });

    it('falls back to export.hideout for empty input', () => {
        expect(exportFilenameForMap('')).toBe('export.hideout');
        expect(exportFilenameForMap('   ')).toBe('export.hideout');
        expect(exportFilenameForMap(null)).toBe('export.hideout');
        expect(exportFilenameForMap(undefined)).toBe('export.hideout');
    });

    it('replaces filesystem-illegal characters with underscore', () => {
        expect(exportFilenameForMap('a/b\\c:d*e?f"g<h>i|j')).toBe(
            'a_b_c_d_e_f_g_h_i_j.hideout',
        );
    });

    it('strips control characters', () => {
        expect(exportFilenameForMap('foo\u0001bar\u001Fbaz')).toBe(
            'foo_bar_baz.hideout',
        );
    });

    it('escapes Windows reserved names', () => {
        expect(exportFilenameForMap('con')).toBe('_con.hideout');
        expect(exportFilenameForMap('PRN')).toBe('_PRN.hideout');
        expect(exportFilenameForMap('com1')).toBe('_com1.hideout');
        expect(exportFilenameForMap('lpt9')).toBe('_lpt9.hideout');
    });

    it('trims trailing dots and spaces (Windows-hostile suffixes)', () => {
        expect(exportFilenameForMap('My map ...   ')).toBe('My map.hideout');
    });

    it('caps the base name at 80 characters', () => {
        const long = 'x'.repeat(200);
        const out = exportFilenameForMap(long);
        const base = out.replace(/\.hideout$/, '');
        expect(base.length).toBeLessThanOrEqual(80);
        expect(out.endsWith('.hideout')).toBe(true);
    });

    it('keeps spaces as a single character and trims edges', () => {
        expect(exportFilenameForMap('  Many   spaces  ')).toBe(
            'Many spaces.hideout',
        );
    });
});
