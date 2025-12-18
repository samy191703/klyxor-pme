// client/src/components/layout/AppLayout.tsx

import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { LogOut, Search, User, Settings, Shield } from "lucide-react";

import SidebarWithSubmenu from "./sidebar-with-submenu";
import MobileNavWithSubmenu from "./mobile-nav-with-submenu";

import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  const goContractsSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    navigate(`/contracts?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50">
      {/* Sidebar desktop */}
      <SidebarWithSubmenu />

      {/* Mobile nav */}
      <MobileNavWithSubmenu />

      {/* Main */}
      <div className="lg:pl-64 h-full w-full overflow-hidden">
        {/* HEADER GLOBAL */}
        <header className="sticky top-0 z-30 border-b bg-white">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            {/* Search (desktop) */}
            <div className="hidden md:flex items-center gap-2 w-full max-w-xl">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un contrat (n°, client, mot-clé)…"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    goContractsSearch((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <Button
                size="sm"
                className="h-9 px-3"
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    'header input[placeholder^="Rechercher un contrat"]',
                  );
                  goContractsSearch(el?.value ?? "");
                }}
              >
                Rechercher
              </Button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {user?.username || user?.role || "Utilisateur"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/permissions-demo")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Mon profil</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate("/security")}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Sécurité</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Paramètres</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-red-600 focus:bg-red-50 focus:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search (mobile) */}
          <div className="md:hidden px-4 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-full rounded-md border bg-white px-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un contrat…"
                  className="h-9 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      goContractsSearch((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
              <Button
                size="sm"
                className="h-9 px-3"
                onClick={() => {
                  const el = document.querySelector<HTMLInputElement>(
                    'header + div input[placeholder="Rechercher un contrat…"]',
                  );
                  goContractsSearch(el?.value ?? "");
                }}
              >
                OK
              </Button>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="h-[calc(100%-3.5rem)] w-full overflow-y-auto overflow-x-hidden bg-white text-gray-900">
          <div className="min-h-full w-full px-4 lg:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
