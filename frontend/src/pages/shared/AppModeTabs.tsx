import { Map, PencilRuler } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { APP_MODE_ROUTES } from './appModeRoutes';

export function AppModeTabs() {
    const { t } = useTranslation('app');
    return (
        <nav className="modeTabs" aria-label={t('modesAria')}>
            <NavLink
                to={APP_MODE_ROUTES.editor}
                end
                className={({ isActive }) =>
                    `toolbarLink modeTab ${isActive ? 'active' : ''}`
                }
                title={t('editorModeTitle')}
            >
                <PencilRuler aria-hidden />
                {t('editorModeLabel')}
            </NavLink>
            <NavLink
                to={APP_MODE_ROUTES.boundary}
                className={({ isActive }) =>
                    `toolbarLink modeTab ${isActive ? 'active' : ''}`
                }
                title={t('boundaryModeTitle')}
            >
                <Map aria-hidden />
                {t('boundaryModeLabel')}
            </NavLink>
        </nav>
    );
}

