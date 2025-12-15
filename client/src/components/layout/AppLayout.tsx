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
 * - Contenu à droite qui occupe tout l'espace et laisse les pages gérer Header + main
 */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-klyxor-bg">
      {/* Sidebar - visible sur desktop */}
      <div className="hidden lg:block">
        <SidebarWithSubmenu />
      </div>

      {/* Conteneur principal */}
      <div className="flex flex-1 flex-col">
        {/* Navigation mobile - visible uniquement sur mobile */}
        <div className="lg:hidden">
          <MobileNavWithSubmenu />
        </div>

        {/* Zone de contenu */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
