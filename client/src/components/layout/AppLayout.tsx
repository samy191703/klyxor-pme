// client/src/components/layout/AppLayout.tsx

import type { ReactNode } from "react";
import SidebarWithSubmenu from "./sidebar-with-submenu";
import MobileNavWithSubmenu from "./mobile-nav-with-submenu";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Layout global Klyxor :
 * - Sidebar à gauche (desktop)
 * - Nav mobile en haut (mobile)
 * - Le contenu (pages) gère son propre header via KlyxorPageLayout
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-klyxor-bg">
      {/* Sidebar - visible sur desktop */}
      <div className="hidden lg:block">
        <SidebarWithSubmenu />
      </div>

      {/* Conteneur principal */}
      <div className="flex h-full flex-col lg:pl-64 min-h-0">
        {/* Navigation mobile - visible uniquement sur mobile */}
        <div className="lg:hidden">
          <MobileNavWithSubmenu />
        </div>

        {/* Zone de contenu - 1 seul scroll vertical */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
