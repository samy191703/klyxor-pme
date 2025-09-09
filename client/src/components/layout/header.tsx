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

export default function Header() {
  const { user } = useAuth();
  const { canCreateContract, canExportData } = usePermissions();

  const [globalSearch, setGlobalSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // 🔹 à connecter à ton système réel
  const notifications: any[] = [];
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <header
      className="bg-white border-b border-gray-200 px-3 sm:px-4 lg:px-6 py-3 flex-shrink-0"
      data-testid="header"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* 🔎 Recherche */}
        <div className="w-full sm:flex-1 sm:max-w-xl order-2 sm:order-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Recherche..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-10 w-full text-sm sm:text-base"
            />
          </div>
        </div>

        {/* ⚡ Actions rapides */}
        <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
          {canCreateContract() && (
            <Button variant="ghost" size="sm" title="Créer une alerte">
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
        </div>

        {/* 🔔 Notifications & Profil */}
        <div className="flex items-center gap-2 sm:gap-4 order-3">
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
