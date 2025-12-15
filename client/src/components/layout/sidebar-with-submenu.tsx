// client/src/components/layout/sidebar-with-submenu.tsx

import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

import {
  LayoutDashboard,
  Users,
  FileText,
  GitBranch,
  Calculator,
  CreditCard,
  Clock,
  FolderKanban,
  Shield,
  Settings,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isVisible: (p: ReturnType<typeof usePermissions>) => boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

export function SidebarWithSubmenu() {
  const [location, navigate] = useLocation();
  const permissions = usePermissions();

  const sections: NavSection[] = [
    {
      label: "Pilotage",
      items: [
        {
          label: "Tableau de bord",
          href: "/",
          icon: LayoutDashboard,
          isVisible: () => true,
        },
      ],
    },
    {
      label: "Clients & contrats",
      items: [
        {
          label: "Base clients",
          href: "/clients",
          icon: Users,
          isVisible: (p) => p.canViewClients,
        },
        {
          label: "Contrats",
          href: "/contracts",
          icon: FileText,
          isVisible: (p) => p.canViewContracts,
        },
        {
          label: "Avenants",
          href: "/amendments",
          icon: GitBranch,
          isVisible: (p) => p.canCreateAmendment || p.canViewContracts,
        },
      ],
    },
    {
      label: "Exécution",
      items: [
        {
          label: "Indexation",
          href: "/indexations",
          icon: Calculator,
          isVisible: (p) => p.canViewIndexation,
        },
        {
          label: "Facturation",
          href: "/billing-plans",
          icon: CreditCard,
          isVisible: (p) => p.canViewBilling,
        },
        {
          label: "Échéances",
          href: "/deadlines",
          icon: Clock,
          isVisible: () => true,
        },
        {
          label: "Documents & GED",
          href: "/documents",
          icon: FolderKanban,
          isVisible: (p) => p.canViewDocuments,
        },
      ],
    },
    {
      label: "Administration",
      items: [
        {
          label: "Administration",
          href: "/admin",
          icon: Shield,
          isVisible: (p) => p.canManageUsers || p.canViewSecurity,
        },
        {
          label: "Paramètres",
          href: "/settings",
          icon: Settings,
          isVisible: (p) => p.canManageUsers || p.canExportData,
        },
      ],
    },
  ];

  const handleNavigate = (href: string) => {
    if (href === location) return;
    navigate(href);
  };

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Header / Logo */}
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--klyxor-bleu-nuit,#111827)] text-xs font-bold text-white">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              Klyxor
            </span>
            <span className="text-[11px] text-slate-500">
              Contract Management
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.isVisible(permissions),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </p>
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            active ? "text-white" : "text-slate-500",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer (rôle utilisateur) */}
      <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 text-[11px] text-slate-500">
        <div className="flex flex-col">
          <span className="font-medium text-slate-700">
            {permissions.userRole || "Utilisateur"}
          </span>
          <span className="text-[10px]">
            Rôle : {permissions.userRole ?? "N/A"}
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ⚠️ Important pour ton erreur : on ajoute aussi un export par défaut */
export default SidebarWithSubmenu;
