import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import {
  ChevronDown,
  LayoutDashboard,
  FileText,
  GitBranch,
  Calendar,
  TrendingUp,
  Edit,
  XCircle,
  Folder,
  Database,
  Shield,
  Download,
  CreditCard,
  FileCheck,
  DollarSign,
  Ban,
  Receipt,
  Settings,
  BarChart,
  HelpCircle,
  Activity,
  Calculator,
} from "lucide-react";
import { UserIdentityButton } from "../common/user-identity-button";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import { menuItems, filterMenuItems, MenuItem } from "@/navigation/routes";

/** --- Drop-in link that always navigates, even for same-path + different query --- */
function QueryLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.pushState({}, "", href);
    window.dispatchEvent(new CustomEvent("app:location-query-changed"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

/* interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  children?: MenuItem[];
} */
/* 
const menuItems: MenuItem[] = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  {
    label: "Contrats",
    icon: FileText,
    children: [
      { label: "Gestion des contrats", href: "/contracts", icon: FileText },
      { label: "Avenants", href: "/amendments", icon: Edit },
      { label: "Résiliations", href: "/terminations", icon: XCircle },
    ],
  },
  {
    label: "Validation & Contrôle",
    icon: GitBranch,
    children: [
      { label: "Demandes de validation", href: "/validation", icon: GitBranch },
      { label: "Workflows", href: "/workflows", icon: Settings },
      { label: "Échéances & rappels", href: "/deadlines", icon: Calendar },
    ],
  },
  {
    label: "Indexation",
    href: "/indexations",
    icon: Calculator,
    children: [
      {
        label: "Indices INSEE",
        href: "/indexations?tab=indices",
        icon: BarChart,
      },
      {
        label: "À calculer",
        href: "/indexations?tab=toCalculate",
        icon: Calculator,
      },
      { label: "En cours", href: "/indexations?tab=list", icon: Activity },
      {
        label: "Historique",
        href: "/indexations?tab=history",
        icon: TrendingUp,
      },
      { label: "Rapports", href: "/indexations?tab=reports", icon: FileText },
      {
        label: "Paramétrage",
        href: "/indexations?tab=settings",
        icon: Settings,
      },
    ],
  },
  {
    label: "Facturation",
    icon: CreditCard,
    children: [
      {
        label: "Plans de facturation",
        href: "/billing-plans",
        icon: FileCheck,
      },
      { label: "Flux de paiement", href: "/payment-flows", icon: DollarSign },
      { label: "Blocages de paiement", href: "/payment-blocks", icon: Ban },
      { label: "Preuves de paiement", href: "/payment-proofs", icon: Receipt },
    ],
  },
  {
    label: "Espace Documentaire",
    icon: Folder,
    children: [
      { label: "Documents & GED", href: "/documents", icon: Folder },
      { label: "Import de données", href: "/imports", icon: Database },
      { label: "Extraction des données", href: "/data-export", icon: Download },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    children: [
      { label: "Sécurité & Conformité", href: "/security", icon: Shield },
    ],
  },
]; */

export default function SidebarWithSubmenu() {
  const [location] = useLocation();
  const { hasPermission, userRole } = usePermissions();

  const getPathnameOnly = (href: string) => href.split("?")[0];

  const isActiveSection = (item: MenuItem): boolean => {
    if (item.href && getPathnameOnly(item.href) === location) return true;
    if (item.children?.length) {
      return item.children.some(
        (child) => getPathnameOnly(child.href || "") === location
      );
    }
    return false;
  };

  // ---- permission filter
  /*   const filterMenuItems = (items: MenuItem[]): MenuItem[] =>
    items
      .map((item) => ({ ...item }))
      .filter((item) => {
        if (item.href && !hasPermission(item.href)) return false;
        if (item.label === "Administration" && userRole !== "admin")
          return false;
        if (item.children) {
          const filteredChildren = filterMenuItems(item.children);
          if (!filteredChildren.length) return false;
          item.children = filteredChildren;
        }
        return true;
      }); */

  const filteredMenuItems = useMemo(
    () => filterMenuItems(menuItems, hasPermission, userRole),
    [userRole, hasPermission]
  );

  // ---- open sections state (Accordion is controlled)
  const STORAGE_KEY = "sidebar.openSections.v1";

  const computeInitial = () => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {}
    const open = new Set(saved);

    // ensure active section is open
    filteredMenuItems.forEach((i) => {
      if (i.children?.length && isActiveSection(i)) open.add(i.label);
    });

    return Array.from(open);
  };

  const [open, setOpen] = useState<string[]>(computeInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open]);

  // when route changes, auto-open matching section
  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      filteredMenuItems.forEach((i) => {
        if (i.children?.length && isActiveSection(i)) next.add(i.label);
      });
      return Array.from(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // full match (path + query) for leaf active highlight
  const currentFull =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : location;

  const renderLeaf = (item: MenuItem, level = 0) => {
    const Icon = item.icon;
    const isLeafActive = item.href ? currentFull === item.href : false;

    return (
      <QueryLink
        key={item.label}
        href={item.href!}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-gray-100 hover:text-[var(--klyxor-bleu-nuit)]",
          isLeafActive &&
            "bg-[var(--klyxor-or)]/20 text-[var(--klyxor-bleu-nuit)] shadow-sm",
          level > 0 && "ml-2 text-sm"
        )}
      >
        <Icon className={cn("w-4 h-4", level > 0 && "w-3.5 h-3.5")} />
        <span>{item.label}</span>
      </QueryLink>
    );
  };

  return (
    <div
      style={{ width: "17rem" }}
      className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 bg-white shadow-lg border-r border-gray-200 flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-[var(--klyxor-bleu-nuit)]/5 via-[var(--klyxor-or)]/10 to-[var(--klyxor-bleu-nuit)]/5">
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="/klyxor-logo.jpeg"
            alt="KLYXOR Logo"
            className="w-12 h-12 object-contain rounded-lg shadow-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-[var(--klyxor-bleu-nuit)]">
              KLYXOR
            </h1>
            <p className="text-xs text-[var(--klyxor-bleu-nuit)]/70">
              Contract Management
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {/* type="multiple" lets users open several sections at once */}
        <Accordion
          type="multiple"
          value={open}
          orientation="horizontal"
          onValueChange={(v) => setOpen(v as string[])}
          className="space-y-1 flex-row"
        >
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;

            if (!hasChildren) {
              return (
                <div key={item.label} className="mb-1">
                  {renderLeaf(item, 0)}
                </div>
              );
            }

            return (
              <AccordionItem
                key={item.label}
                value={item.label}
                className="border-none"
              >
                <AccordionTrigger
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  className={cn(
                    "w-full flex-row row flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-gray-100 hover:no-underline",
                    open.includes(item.label)
                      ? "bg-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)]"
                      : "text-gray-700"
                  )}
                >
                  {/* Left side: icon + label */}
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-1">
                  <div className="space-y-1">
                    {item.children!.map((child) => renderLeaf(child, 1))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
        <button
          onClick={() => {
            if ((window as any).restartTutorial)
              (window as any).restartTutorial();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg bg-[var(--klyxor-or)]/10 hover:bg-[var(--klyxor-or)]/20 text-[var(--klyxor-bleu-nuit)] transition-all duration-200"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Relancer le tutoriel</span>
        </button>

        <UserIdentityButton
          variant="ghost"
          size="sm"
          className="w-full justify-start hover:bg-transparent focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
