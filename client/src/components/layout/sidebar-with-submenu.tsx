import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import {
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

import { menuItems, filterMenuItems, type MenuItem } from "@/navigation/routes";

/** Link helper that always navigates, even for same-path + different query. */
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

  const filteredMenuItems = useMemo(
    () => filterMenuItems(menuItems, hasPermission, userRole),
    [userRole, hasPermission]
  );

  // Controlled accordion open sections
  const STORAGE_KEY = "sidebar.openSections.v1";

  const computeInitial = (): string[] => {
    let saved: string[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      // ignore
    }
    const open = new Set(saved);

    // Ensure active section is open
    filteredMenuItems.forEach((i) => {
      if (i.children?.length && isActiveSection(i)) open.add(i.label);
    });

    return Array.from(open);
  };

  const [open, setOpen] = useState<string[]>(computeInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(open));
  }, [open]);

  // When route changes, auto-open matching section
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

  // Full match (path + query) for leaf active highlight
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
          "hover:bg-slate-100 hover:text-[var(--klyxor-bleu-nuit)]",
          isLeafActive &&
            "bg-[var(--klyxor-or)]/20 text-[var(--klyxor-bleu-nuit)] shadow-sm",
          level > 0 && "ml-2"
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
      className={cn(
        "hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0",
        "lg:z-50",
        "flex-col overflow-hidden relative",
        "bg-white shadow-lg",
        "border-r border-slate-200",
        "text-slate-800"
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-[var(--klyxor-bleu-nuit)]/5 via-[var(--klyxor-or)]/10 to-[var(--klyxor-bleu-nuit)]/5">
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
        <Accordion
          type="multiple"
          value={open}
          onValueChange={(v) => setOpen(v as string[])}
          className="space-y-1"
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
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    "hover:bg-slate-100 hover:no-underline",
                    open.includes(item.label)
                      ? "bg-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)]"
                      : "text-slate-700"
                  )}
                >
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
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
        <button
          onClick={() => {
            const w = window as unknown as { restartTutorial?: () => void };
            w.restartTutorial?.();
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
