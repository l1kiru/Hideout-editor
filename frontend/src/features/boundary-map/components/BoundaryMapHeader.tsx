import { AppModeTabs } from '../../../pages/shared/AppModeTabs';
import { LanguageSwitcher } from '../../../pages/shared/LanguageSwitcher';

export function BoundaryMapHeader() {
  return (
    <header className="mainHeader">
      <AppModeTabs />
      <LanguageSwitcher className="boundaryLanguageToggle" />
    </header>
  );
}
