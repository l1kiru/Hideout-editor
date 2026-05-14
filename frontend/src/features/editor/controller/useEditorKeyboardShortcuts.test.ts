import { describe, expect, it, vi } from 'vitest';

import { blurKeyboardShortcutFocus } from './useEditorKeyboardShortcuts';

describe('blurKeyboardShortcutFocus', () => {
    it('blurs the keyboard event target when it is a focusable control', () => {
        const blur = vi.fn();
        const target = { tagName: 'BUTTON', blur };
        const fallback = { tagName: 'BUTTON', blur: vi.fn() };

        blurKeyboardShortcutFocus(target, fallback);

        expect(blur).toHaveBeenCalledTimes(1);
        expect(fallback.blur).not.toHaveBeenCalled();
    });

    it('falls back to the active element when target is not blur-capable', () => {
        const blur = vi.fn();
        const fallback = { tagName: 'BUTTON', blur };

        blurKeyboardShortcutFocus({} as EventTarget, fallback);

        expect(blur).toHaveBeenCalledTimes(1);
    });
});
