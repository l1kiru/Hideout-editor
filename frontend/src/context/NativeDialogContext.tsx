import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';

/* eslint-disable react-refresh/only-export-components -- Dialog API hooks live next to the provider. */

export type ConfirmOptions = {
    confirmLabel?: string;
    cancelLabel?: string;
    // Visual emphasis for destructive operations (e.g. deleting a base map):
    // dark red background.
    danger?: boolean;
    // Replace the confirm button with a disabled countdown of this many seconds.
    // After it expires the normal confirm button appears.
    holdSeconds?: number;
};

type DialogState =
    | { kind: 'alert'; message: string; resolve: () => void }
    | {
          kind: 'confirm';
          message: string;
          options: ConfirmOptions;
          resolve: (v: boolean) => void;
      }
    | {
          kind: 'prompt';
          message: string;
          defaultValue: string;
          resolve: (v: string | null) => void;
      }
    | null;

export type NativeDialogApi = {
    alert: (message: string) => Promise<void>;
    confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
};

const NativeDialogContext = createContext<NativeDialogApi | null>(null);

export function useNativeDialogs(): NativeDialogApi {
    const v = useContext(NativeDialogContext);
    if (!v) {
        throw new Error(
            'useNativeDialogs must be used within NativeDialogProvider',
        );
    }
    return v;
}

export function NativeDialogProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation('common');
    const [state, setState] = useState<DialogState>(null);
    const [promptValue, setPromptValue] = useState('');
    const [holdRemaining, setHoldRemaining] = useState(0);

    useEffect(() => {
        if (state?.kind === 'prompt')
            setPromptValue(state.defaultValue);
    }, [state]);

    useEffect(() => {
        if (state?.kind !== 'confirm') {
            setHoldRemaining(0);
            return;
        }
        const initial = Math.max(0, Math.floor(state.options.holdSeconds ?? 0));
        setHoldRemaining(initial);
        if (initial <= 0) return;
        const interval = window.setInterval(() => {
            setHoldRemaining((prev) => {
                if (prev <= 1) {
                    window.clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            window.clearInterval(interval);
        };
    }, [state]);

    const alertFn = useCallback(
        (message: string) =>
            new Promise<void>((resolve) => {
                setState({ kind: 'alert', message, resolve });
            }),
        [],
    );

    const confirmFn = useCallback(
        (message: string, options: ConfirmOptions = {}) =>
            new Promise<boolean>((resolve) => {
                setState({ kind: 'confirm', message, options, resolve });
            }),
        [],
    );

    const promptFn = useCallback(
        (message: string, defaultValue = '') =>
            new Promise<string | null>((resolve) => {
                setState({
                    kind: 'prompt',
                    message,
                    defaultValue,
                    resolve,
                });
            }),
        [],
    );

    const dismiss = useCallback(() => {
        setState((s) => {
            if (!s) return null;
            if (s.kind === 'confirm') s.resolve(false);
            if (s.kind === 'prompt') s.resolve(null);
            return null;
        });
    }, []);

    const finishAlert = useCallback(() => {
        setState((s) => {
            if (s?.kind === 'alert') s.resolve();
            return null;
        });
    }, []);

    const finishConfirm = useCallback((ok: boolean) => {
        setState((s) => {
            if (s?.kind === 'confirm') s.resolve(ok);
            return null;
        });
    }, []);

    const finishPrompt = useCallback(
        (submit: boolean) => {
            setState((s) => {
                if (s?.kind === 'prompt')
                    s.resolve(submit ? promptValue : null);
                return null;
            });
        },
        [promptValue],
    );

    useEffect(() => {
        if (!state) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            if (state.kind === 'alert') finishAlert();
            else dismiss();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state, dismiss, finishAlert]);

    const api = useMemo(
        (): NativeDialogApi => ({
            alert: alertFn,
            confirm: confirmFn,
            prompt: promptFn,
        }),
        [alertFn, confirmFn, promptFn],
    );

    const onBackdropPointerDown = () => {
        if (state?.kind === 'alert') finishAlert();
        else dismiss();
    };

    const stopBubble = (e: React.SyntheticEvent) => {
        e.stopPropagation();
    };

    const isDangerConfirm
        = state?.kind === 'confirm' && state.options.danger === true;
    const panelClassName = isDangerConfirm
        ? 'nativeModalPanel nativeModalPanelDanger'
        : 'nativeModalPanel';
    const confirmButtonClassName = isDangerConfirm
        ? 'iconBtnLabeled sideBtnWide nativeModalConfirmDanger'
        : 'iconBtnLabeled primary sideBtnWide';

    return (
        <NativeDialogContext.Provider value={api}>
            {children}
            {state ? (
                <div
                    className="nativeModalBackdrop"
                    role="presentation"
                    onPointerDown={onBackdropPointerDown}
                >
                    <div
                        className={panelClassName}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="native-modal-title"
                        onPointerDown={stopBubble}
                    >
                        <p
                            id="native-modal-title"
                            className="nativeModalMessage"
                        >
                            {state.message}
                        </p>
                        {state.kind === 'prompt' ? (
                            <input
                                className="sideInput nativeModalInput"
                                type="text"
                                value={promptValue}
                                onChange={(e) =>
                                    setPromptValue(e.target.value)}
                                autoComplete="off"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        finishPrompt(true);
                                    }
                                }}
                            />
                        ) : null}
                        <div className="nativeModalActions">
                            {state.kind === 'alert' ? (
                                <button
                                    type="button"
                                    className="iconBtnLabeled primary sideBtnWide"
                                    onClick={finishAlert}
                                >
                                    {t('ok')}
                                </button>
                            ) : null}
                            {state.kind === 'confirm' ? (
                                <>
                                    <button
                                        type="button"
                                        className="iconBtnLabeled sideBtnWide sideBtnMuted"
                                        onClick={() => finishConfirm(false)}
                                    >
                                        {state.options.cancelLabel ?? t('cancel')}
                                    </button>
                                    {holdRemaining > 0 ? (
                                        <button
                                            type="button"
                                            className={`${confirmButtonClassName} nativeModalConfirmTimer`}
                                            disabled
                                            aria-disabled="true"
                                            aria-live="polite"
                                        >
                                            {holdRemaining}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className={confirmButtonClassName}
                                            onClick={() => finishConfirm(true)}
                                        >
                                            {state.options.confirmLabel ?? t('ok')}
                                        </button>
                                    )}
                                </>
                            ) : null}
                            {state.kind === 'prompt' ? (
                                <>
                                    <button
                                        type="button"
                                        className="iconBtnLabeled sideBtnWide sideBtnMuted"
                                        onClick={() => finishPrompt(false)}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        className="iconBtnLabeled primary sideBtnWide"
                                        onClick={() => finishPrompt(true)}
                                    >
                                        {t('ok')}
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </NativeDialogContext.Provider>
    );
}
