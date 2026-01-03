import { useState } from "react";
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
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import {
  menuItems,
  filterMenuItems,
  flattenLeaves,
  LeafRoute,
} from "@/navigation/routes";
import { useEffect, useMemo, useRef } from "react";

export default function Header() {
  const { user } = useAuth();
  const { canCreateContract, canExportData, hasPermission, userRole } =
    usePermissions();

  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const [openAuto, setOpenAuto] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 🔹 à connecter à ton système réel
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
    // Preserve your QueryLink behavior (push + popstate) to handle same-path + query changes
    window.history.pushState({}, "", href);
    window.dispatchEvent(new CustomEvent("app:location-query-changed"));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function gotoCreateContractWizard() {
    const url = "/contracts?wizard=create";
    const current = window.location.pathname + window.location.search;
    if (current === url) {
      // same URL: still notify listeners that query changed
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
      className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 flex-shrink-0"
      data-testid="header"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* 🔎 Recherche */}
        <div className="w-full sm:flex-1 sm:max-w-xl order-2 sm:order-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              className="pl-10 w-full text-sm sm:text-base"
            />

            {/* Autocomplete panel */}
            {openAuto && results.length > 0 && (
              <Card
                className="absolute z-50 mt-2 left-0 right-0 border border-gray-200 shadow-xl rounded-xl overflow-hidden"
                style={{ background: "white" }}
              >
                <ScrollArea className="max-h-80">
                  <ul className="divide-y divide-gray-100">
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
                            className={[
                              "w-full px-3 py-2 flex items-center justify-between text-left transition",
                              isActive
                                ? "bg-[var(--klyxor-or)]/15"
                                : "hover:bg-gray-50",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4 text-[var(--klyxor-bleu-nuit)]" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {r.label}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {r.href}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--klyxor-bleu-nuit)]/10 text-[var(--klyxor-bleu-nuit)]">
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
        <div className="flex items-center gap-2 sm:gap-4 order-3">
          {/* ⚡ Actions rapides */}
          {canCreateContract() && (
            <Button
              variant="ghost"
              size="sm"
              title="Créer un contrat"
              onClick={gotoCreateContractWizard}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="Configuration">
            <Settings className="w-4 h-4" />
          </Button>
          {canExportData() && (
            <Button variant="ghost" size="sm" title="Exporter">
              <Download className="w-4 h-4" />
            </Button>
          )}
          {/* Notifications */}
          <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Notifications</SheetTitle>
                <SheetDescription>
                  {unreadNotifications} non lues • Conservation 1 an
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {notif.severity === "critical" && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            {notif.severity === "warning" && (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                            {notif.severity === "info" && (
                              <Info className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="font-medium text-sm">
                              {notif.title}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {notif.message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs sm:text-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                      {!notif.read && (
                        <Badge variant="secondary" className="text-xs">
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
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                      user?.role === "admin"
                        ? "bg-[#C9A646]"
                        : user?.role === "manager"
                        ? "bg-blue-600"
                        : user?.role === "validator"
                        ? "bg-green-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {(
                      user?.firstName?.[0] ||
                      user?.username?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.username || "Utilisateur"}
                    </span>
                    <span className="text-xs text-gray-500">
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
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-semibold">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || "Utilisateur"}
                </span>
                <span className="text-xs text-gray-500 font-normal mt-1">
                  {user?.email || user?.username + "@engie.com"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  <span>Rôle actif</span>
                </div>
                <Badge>{user?.role}</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Activity className="w-4 h-4 mr-2" />
                Permissions
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Paramètres du compte
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="text-red-600 cursor-pointer"
              >
                <User className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
