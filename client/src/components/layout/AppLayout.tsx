import { ReactNode } from "react";
import SidebarWithSubmenu from "./sidebar-with-submenu";
import MobileNavWithSubmenu from "./mobile-nav-with-submenu";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - fixed position on desktop */}
      <SidebarWithSubmenu />
      
      {/* Mobile Navigation - only visible on mobile */}
      <MobileNavWithSubmenu />
      
      {/* Main content wrapper - properly offset for sidebar */}
      <div className="lg:pl-64 h-screen flex flex-col">
        {/* Content area - children manage their own layout */}
        {children}
      </div>
    </div>
  );
}