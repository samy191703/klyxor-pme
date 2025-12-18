import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { HelpCircle } from "lucide-react";
import { UserIdentityButton } from "../common/user-identity-button";

import {
  LayoutDashboard,
  Users,
  FileText,
  Edit,
  XCircle,
  CreditCard,
  FileCheck,
  GitBranch,
  Settings,
  Calendar,
  Calculator,
  BarChart,
  TrendingUp,
  Folder,
  Database,
  Download,
  Shield,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

function fullLocation(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function pathOnly(href: string): string {
  return href.split("?")[0];
}

function shallowEqualRecord(a: Record<string, boolean>, b: Record<string, boolean>) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export default function SidebarWithSubmenu() {
  const [location] = useLocation();
  const { hasPermission, userRole } = usePermissions();

  // Routes alignées avec App.tsx
  const tree: NavItem[] = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
      { key: "clients", label: "Base Clients", href: "/clients", icon: Users },

      {
        key: "contracts",
        label: "Contrats",
        icon: FileText,
        children: [
          { key: "contracts.gestion", label: "Gestion", href: "/admin/contracts", icon: FileText },
          { key: "contracts.amendments", label: "Avenants", href: "/admin/amendments", icon: Edit },
          { key: "contracts.terminations", label: "Résiliations", href: "/terminations", icon: XCircle },
          {
            key: "contracts.billing",
            label: "Facturation",
            icon: CreditCard,
            children: [
              { key: "billing.plans", label: "Plan de facturation", href: "/admin/billing", icon: FileCheck },
              { key: "billing.validation", label: "Demande de validation", href: "/validation", icon: GitBranch },
            ],
          },
        ],
      },

      {
        key: "workflows",
        label: "Workflows",
        icon: Settings,
        children: [{ key: "deadlines", label: "Échéance et rappels", href: "/admin/deadlines", icon: Calendar }],
      },

      {
        key: "indexation",
        label: "Indexation",
        icon: Calculator,
        children: [
          { key: "index.indices", label: "Indices", href: "/admin/indexations", icon: BarChart },
          { key: "index.history", label: "Historique", href: "/indexations", icon: TrendingUp },
          { key: "index.reports", label: "Rapport", href: "/indexation-dashboard", icon: FileText },
        ],
      },

      {
        key: "docs",
        label: "Espace Documentaire",
        icon: Folder,
        children: [
          { key: "docs.ged", label: "GED", href: "/admin/documents", icon: Folder },
          { key: "docs.imports", label: "Import de fichier", href: "/imports", icon: Database },
          { key: "docs.export", label: "Extraction des données", href: "/data-export", icon: Download },
        ],
      },

      {
        key: "admin",
        label: "Administration",
        icon: Shield,
        children: [{ key: "admin.security", label: "Sécurité & Conformité", href: "/admin/security", icon: Shield }],
      },
    ],
    []
  );

  // Permissions (query neutralisé)
  const filteredTree: NavItem[] = useMemo(() => {
    const filterNode = (n: NavItem): NavItem | null => {
      if (n.label === "Administration" && userRole !== "admin") return null;

      if (n.href) {
        const checkHref = pathOnly(n.href);
        if (!hasPermission(checkHref)) return null;
      }

      if (n.children?.length) {
        const kids = n.children.map(filterNode).filter(Boolean) as NavItem[];
        if (!kids.length) return null;
        return { ...n, children: kids };
      }

      return n;
    };

    return tree.map(filterNode).filter(Boolean) as NavItem[];
  }, [tree, hasPermission, userRole]);

  const isActiveHref = (href?: string) => {
    if (!href) return false;
    if (href.includes("?")) return fullLocation() === href;
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  const hasActiveChild = (n: NavItem): boolean => {
    if (isActiveHref(n.href)) return true;
    if (n.children?.length) return n.children.some(hasActiveChild);
    return false;
  };

  // Open state (stable)
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: NavItem[]) => {
      nodes.forEach((n) => {
        if (n.children?.length) {
          if (hasActiveChild(n)) next[n.key] = true;
          walk(n.children);
        }
      });
    };
    walk(filteredTree);

    setOpen((prev) => {
      const merged = { ...prev, ...next };
      return shallowEqualRecord(prev, merged) ? prev : merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, filteredTree]);

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  // Styles “White Sharp”
  const rail =
    "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded before:bg-[var(--klyxor-or)]";

  const itemBase =
    "relative w-full flex items-center justify-between rounded-lg px-3 py-2 " +
    "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--klyxor-bleu-nuit)]/25";

  const itemLeft = "flex items-center gap-3 min-w-0";
  const labelCls = "truncate text-[13px]";
  const iconTop = "w-5 h-5 shrink-0";
  const iconSub = "w-4 h-4 shrink-0";

  // top-level (bleu Klyxor)
  const itemNormal =
    "text-[var(--klyxor-bleu-nuit)]/85 hover:text-[var(--klyxor-bleu-nuit)] hover:bg-slate-100";
  const itemActive =
    "bg-slate-100 text-[var(--klyxor-bleu-nuit)] font-semibold " + rail;

  // sub-level (gris neutre, pas “fade”)
  const subBase =
    "relative flex items-center gap-3 rounded-lg px-3 py-2 ml-6 transition-colors duration-150";
  const subNormal =
    "text-slate-600 hover:text-[var(--klyxor-bleu-nuit)] hover:bg-slate-100";
  const subActive =
    "bg-slate-100 text-[var(--klyxor-bleu-nuit)] font-semibold " + rail;

  const sub2Base =
    "relative flex items-center gap-3 rounded-lg px-3 py-2 ml-10 transition-colors duration-150";
  const sub2Normal =
    "text-slate-600 hover:text-[var(--klyxor-bleu-nuit)] hover:bg-slate-100";
  const sub2Active =
    "bg-slate-100 text-[var(--klyxor-bleu-nuit)] font-semibold " + rail;

  const SectionLabel = () => (
    <div className="px-3 pt-2 pb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
      Navigation
    </div>
  );

  // Leaf = lien natif => fiable
  const Leaf = ({
    href,
    className,
    children,
  }: {
    href: string;
    className: string;
    children: React.ReactNode;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  );

  const renderNode = (n: NavItem, level: 0 | 1 | 2 = 0) => {
    const Icon = n.icon;
    const active = hasActiveChild(n);
    const expanded = n.children?.length ? !!open[n.key] : false;

    // leaf
    if (!n.children?.length) {
      const cls = cn(
        level === 0 ? itemBase : level === 1 ? subBase : sub2Base,
        isActiveHref(n.href)
          ? level === 0 ? itemActive : level === 1 ? subActive : sub2Active
          : level === 0 ? itemNormal : level === 1 ? subNormal : sub2Normal
      );

      return (
        <Leaf key={n.key} href={n.href!} className={cls}>
          <div className={itemLeft}>
            <Icon
              className={cn(
                level === 0 ? iconTop : iconSub,
                isActiveHref(n.href)
                  ? "text-[var(--klyxor-bleu-nuit)]"
                  : "text-[var(--klyxor-bleu-nuit)]/60"
              )}
            />
            <span className={labelCls}>{n.label}</span>
          </div>
        </Leaf>
      );
    }

    // group
    const groupCls = cn(
      level === 0 ? itemBase : level === 1 ? subBase : sub2Base,
      active
        ? level === 0 ? itemActive : level === 1 ? subActive : sub2Active
        : level === 0 ? itemNormal : level === 1 ? subNormal : sub2Normal
    );

    return (
      <div key={n.key} className="space-y-1">
        <button type="button" className={groupCls} onClick={() => toggle(n.key)} aria-expanded={expanded}>
          <div className={itemLeft}>
            <Icon
              className={cn(
                level === 0 ? iconTop : iconSub,
                active
                  ? "text-[var(--klyxor-bleu-nuit)]"
                  : "text-[var(--klyxor-bleu-nuit)]/60"
              )}
            />
            <span className={labelCls}>{n.label}</span>
          </div>

          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--klyxor-bleu-nuit)]/50" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--klyxor-bleu-nuit)]/50" />
          )}
        </button>

        {expanded ? (
          <div className="space-y-1">
            {n.children.map((c) => renderNode(c, (Math.min(level + 1, 2) as 1 | 2)))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <aside
      style={{ width: "17rem" }}
      className={cn(
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-50",
        "flex-col overflow-hidden relative",
        "bg-white",
        "border-r border-slate-200"
      )}
    >
      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-200 bg-white">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/klyxor-logo.jpeg"
            alt="KLYXOR Logo"
            className="w-10 h-10 object-contain rounded-lg bg-slate-50"
          />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-[var(--klyxor-bleu-nuit)]">
              KLYXOR
            </div>
            <div className="text-[12px] text-slate-500">
              Contract Management
            </div>
          </div>
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 bg-white">
        <SectionLabel />
        <div className="space-y-2 px-1">
          {filteredTree.map((n) => renderNode(n, 0))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-200 bg-white space-y-2">
        <button
          type="button"
          onClick={() => {
            if ((window as any).restartTutorial) (window as any).restartTutorial();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            "text-slate-600 hover:text-[var(--klyxor-bleu-nuit)] hover:bg-slate-100"
          )}
        >
          <HelpCircle className="w-4 h-4 text-[var(--klyxor-bleu-nuit)]/60" />
          <span className="text-[13px]">Relancer le tutoriel</span>
        </button>

        <UserIdentityButton
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-lg hover:bg-slate-100 text-[var(--klyxor-bleu-nuit)]"
        />
      </div>
    </aside>
  );
}
