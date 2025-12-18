// client/src/components/layout/header.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  Settings,
  Download,
  Plus,
  AlertCircle,
  AlertTriangle,
  Info,
  Eye,
  User,
  Shield,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import {
  menuItems,
  filterMenuItems,
  flattenLeaves,
  type LeafRoute,
} from "@/navigation/routes";
import { cn } from "@/lib/utils";

export default function Header() {
  const { user } = useAuth();
  const { canCreateContract, canExportData, hasPermission, userRole } =
    usePermissions();

  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const [openAuto, setOpenAuto] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 À connecter à ton système réel
  const notifications: any[] = [];
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // ---- Build searchable route list (respecting permissions)
  const availableLeaves: LeafRoute[] = useMemo(() => {
    const filtered = filterMenuItems(menuItems, hasPermission, userRole);
    return flattenLeaves(filtered);
  }, [hasPermission, userRole]);

  const results = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return availableLeaves
      .map((r) => ({
        ...r,
        score:
          (r.label.toLowerCase().includes(q) ? 2 : 0) +
          (r.href.toLowerCase().includes(q) ? 1 : 0),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [globalSearch, availableLeaves]);

  useEffect(() => {
    setOpenAuto(results.length > 0);
    setActiveIndex(0);
  }, [results.length]);

  function navigateTo(href: string) {
    window.history.pushState({}, "", href);
    window.dispatchEvent(new CustomEvent("app:location-query-changed"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function gotoCreateContractWizard() {
    const url = "/contracts?wizard=create";
    const current = window.location.pathname + window.location.search;
    if (current === url) {
      window.dispatchEvent(new CustomEvent("app:location-query-changed"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new CustomEvent("app:location-query-changed"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }

  return (
    <header
      data-testid="header"
      className={cn(
        // IMPORTANT: header stabilisé en haut du scroll container
        "sticky top-0 z-40 w-full",
        // structure
        "h-16 flex items-center border-b px-4 lg:px-6",
        // visuel: fond opaque (évite l'impression de 'vide')
        "bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70",
        // thème klyxor (tes tokens)
        "border-klyxor-border"
      )}
    >
      <div className="flex h-full w-full items-center justify-between gap-4">
        {/* 🔎 Recherche globale */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-klyxor-muted" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Rechercher..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setOpenAuto(results.length > 0)}
              onBlur={() => setTimeout(() => setOpenAuto(false), 120)}
              onKeyDown={(e) => {
                if (!results.length) return;

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const pick = results[activeIndex];
                  if (pick) {
                    navigateTo(pick.href);
                    setGlobalSearch("");
                    setOpenAuto(false);
                  }
                } else if (e.key === "Escape") {
                  setOpenAuto(false);
                }
              }}
              className="h-10 w-full rounded-lg border border-klyxor-border bg-klyxor-card pl-10 text-sm text-klyxor-text shadow-sm placeholder:text-klyxor-muted focus-visible:border-klyxor-primary focus-visible:ring-klyxor-primary/40"
            />

            {/* Autocomplete panel */}
            {openAuto && results.length > 0 && (
              <Card className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-klyxor-border bg-klyxor-card shadow-modal">
                <ScrollArea className="max-h-80">
                  <ul className="divide-y divide-klyxor-border">
                    {results.map((r, idx) => {
                      const Icon = r.icon;
                      const isActive = idx === activeIndex;
                      return (
                        <li key={`${r.href}-${idx}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              navigateTo(r.href);
                              setGlobalSearch("");
                              setOpenAuto(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition",
                              isActive
                                ? "bg-klyxor-primary/10 text-klyxor-text"
                                : "text-klyxor-text hover:bg-klyxor-bg"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-klyxor-primary" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-klyxor-text">
                                  {r.label}
                                </span>
                                <span className="text-xs text-klyxor-muted">
                                  {r.href}
                                </span>
                              </div>
                            </div>
                            <span className="rounded-full bg-klyxor-bg px-2 py-1 text-[10px] text-klyxor-muted">
                              {r.section}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              </Card>
            )}
          </div>
        </div>

        {/* 🔔 Notifications & Profil */}
        <div className="flex items-center gap-2">
          {/* ⚡ Actions rapides */}
          {canCreateContract && (
            <Button
              variant="ghost"
              size="sm"
              title="Créer un contrat"
              onClick={gotoCreateContractWizard}
              className="text-klyxor-text hover:bg-klyxor-bg"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            title="Configuration"
            className="text-klyxor-text hover:bg-klyxor-bg"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {canExportData && (
            <Button
              variant="ghost"
              size="sm"
              title="Exporter"
              className="text-klyxor-text hover:bg-klyxor-bg"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* Notifications */}
          <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative text-klyxor-text hover:bg-klyxor-bg"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-status-red text-xs font-medium text-white">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className="border-l border-klyxor-border bg-klyxor-card">
              <SheetHeader>
                <SheetTitle className="text-klyxor-text">
                  Notifications
                </SheetTitle>
                <SheetDescription className="text-klyxor-muted">
                  {unreadNotifications} non lues • Conservation 1 an
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-lg border border-klyxor-border bg-klyxor-subtle p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            {notif.severity === "critical" && (
                              <AlertCircle className="h-4 w-4 text-status-red" />
                            )}
                            {notif.severity === "warning" && (
                              <AlertTriangle className="h-4 w-4 text-status-yellow" />
                            )}
                            {notif.severity === "info" && (
                              <Info className="h-4 w-4 text-status-blue" />
                            )}
                            <span className="text-sm font-medium text-klyxor-text">
                              {notif.title}
                            </span>
                          </div>
                          <p className="text-xs text-klyxor-muted">
                            {notif.message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-klyxor-text hover:bg-klyxor-bg"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      {!notif.read && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Profil utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-klyxor-text hover:bg-klyxor-bg"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white",
                      user?.role === "admin"
                        ? "bg-klyxor-primary"
                        : user?.role === "manager"
                        ? "bg-status-blue"
                        : user?.role === "validator"
                        ? "bg-status-green"
                        : "bg-klyxor-muted"
                    )}
                  >
                    {(user?.firstName?.[0] || user?.username?.[0] || "U").toUpperCase()}
                  </div>

                  <div className="hidden flex-col items-start sm:flex">
                    <span className="text-sm font-medium text-klyxor-text">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.username || "Utilisateur"}
                    </span>
                    <span className="text-xs text-klyxor-muted">
                      {user?.role === "admin"
                        ? "Administrateur"
                        : user?.role === "manager"
                        ? "Gestionnaire"
                        : user?.role === "validator"
                        ? "Validateur"
                        : "Utilisateur"}
                    </span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 border-klyxor-border bg-klyxor-card"
            >
              <DropdownMenuLabel className="flex flex-col text-klyxor-text">
                <span className="font-semibold">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || "Utilisateur"}
                </span>
                <span className="mt-1 text-xs font-normal text-klyxor-muted">
                  {user?.email || `${user?.username ?? "user"}@engie.com`}
                </span>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-klyxor-border" />

              <DropdownMenuItem className="flex cursor-pointer items-center justify-between text-klyxor-text hover:bg-klyxor-bg">
                <div className="flex items-center">
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Rôle actif</span>
                </div>
                <Badge variant="secondary">{userRole || user?.role}</Badge>
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-klyxor-text hover:bg-klyxor-bg">
                <Activity className="mr-2 h-4 w-4" />
                Permissions
              </DropdownMenuItem>

              <DropdownMenuItem className="cursor-pointer text-klyxor-text hover:bg-klyxor-bg">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres du compte
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-klyxor-border" />

              <DropdownMenuItem
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="cursor-pointer text-status-red hover:bg-red-50"
              >
                <User className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
