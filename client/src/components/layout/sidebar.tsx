// client/src/components/layout/sidebar.tsx
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { menuItems, MenuItem } from "@/navigation/routes";

/**
 * Sidebar KLYXOR - version claire, style SaaS moderne
 * - Fond blanc
 * - Bordure droite légère
 * - Icônes bleu KLYXOR
 * - Élément actif avec pill + barre à gauche
 */

function useIsActive() {
  const [location] = useLocation();

  return (href?: string | null) => {
    if (!href) return false;
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };
}

export default function Sidebar() {
  const isActive = useIsActive();

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
      {/* LOGO */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <img
            src="/klyxor-logo.jpeg"
            alt="KLYXOR Logo"
            className="w-12 h-12 rounded-lg shadow-card object-cover"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              KLYXOR
            </h1>
            <p className="text-xs text-slate-500">
              Contract Management
            </p>
          </div>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-4 space-y-2 text-slate-700 bg-white">
        {menuItems.map((item: MenuItem) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.isSection) {
            return (
              <div key={item.label} className="px-3 pt-5 pb-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{item.label}</span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                active
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {/* Barre d’indication active à gauche */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[#2F80ED]" />
              )}

              {Icon && (
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    active ? "text-[#2F80ED]" : "text-slate-500"
                  )}
                />
              )}

              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FOOTER / USER ZONE (optionnel) */}
      <div className="px-4 py-4 border-t border-slate-200 bg-white text-xs text-slate-500">
        <p className="leading-snug">
          <span className="font-semibold text-slate-700">
            KLYXOR
          </span>{" "}
          · Contract Lifecycle & Billing
        </p>
      </div>
    </aside>
  );
}
