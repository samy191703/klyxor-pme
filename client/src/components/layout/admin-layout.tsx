import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home, FileText, CreditCard, TrendingUp, Edit3, Calendar, 
  FolderOpen, Bell, Download, Upload, Shield, History,
  Menu, ChevronRight, X
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  submenuItems?: Array<{
    label: string;
    value: string;
    active?: boolean;
  }>;
  onSubmenuClick?: (value: string) => void;
}

const menuItems = [
  {
    title: "Accueil (Admin)",
    href: "/admin",
    icon: Home,
    submenu: ["KPI globaux", "Tâches bloquantes", "Alertes critiques", "Derniers exports"]
  },
  {
    title: "Contrats (Admin)",
    href: "/admin/contracts",
    icon: FileText,
    submenu: ["Liste", "Fiche contrat", "Paramètres types", "Workflows & droits"]
  },
  {
    title: "Facturation (Admin)",
    href: "/admin/billing",
    icon: CreditCard,
    submenu: ["Plans de facturation", "Flux de paiement", "Preuves de paiement", "Paramètres"]
  },
  {
    title: "Indexations (Admin)",
    href: "/admin/indexations",
    icon: TrendingUp,
    submenu: ["À calculer", "À valider", "Historique", "Formules", "Indices (sources)", "Rapports"]
  },
  {
    title: "Avenants (Admin)",
    href: "/admin/amendments",
    icon: Edit3,
    submenu: ["À valider", "Historique", "Paramètres"]
  },
  {
    title: "Échéances (Admin)",
    href: "/admin/deadlines",
    icon: Calendar,
    submenu: ["Liste globale", "Paramètres de pré-alerte"]
  },
  {
    title: "Documents & GED (Admin)",
    href: "/admin/documents",
    icon: FolderOpen,
    submenu: ["GED par contrat", "Historique documents"]
  },
  {
    title: "Alertes & notifications (Admin)",
    href: "/admin/alerts",
    icon: Bell,
    submenu: ["Journal", "Préférences par défaut"]
  },
  {
    title: "Extraction (Admin)",
    href: "/admin/extraction",
    icon: Download,
    submenu: ["Exports", "Historique d'exports"]
  },
  {
    title: "Import historique (Admin)",
    href: "/admin/imports",
    icon: Upload,
    submenu: []
  },
  {
    title: "Sécurité & conformité (Admin)",
    href: "/admin/security",
    icon: Shield,
    submenu: []
  },
  {
    title: "Historique & audit (Admin)",
    href: "/admin/audit",
    icon: History,
    submenu: []
  }
];

export default function AdminLayout({ children, title, submenuItems, onSubmenuClick }: AdminLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex">
        <div className="w-64 border-r bg-sidebar">
          <div className="flex h-14 items-center border-b px-4">
            <h2 className="text-lg font-semibold">KLYXOR Admin</h2>
          </div>
          <ScrollArea className="flex-1">
            <nav className="space-y-1 p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        isActive && "bg-sidebar-accent"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Submenu - Desktop */}
        {submenuItems && submenuItems.length > 0 && (
          <div className="w-56 border-r bg-muted/10">
            <div className="flex h-14 items-center border-b px-4">
              <h3 className="text-sm font-medium text-muted-foreground">Sous-menu</h3>
            </div>
            <ScrollArea className="flex-1">
              <nav className="space-y-1 p-2">
                {submenuItems.map((item) => (
                  <Button
                    key={item.value}
                    variant={item.active ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => onSubmenuClick?.(item.value)}
                  >
                    {item.active && <ChevronRight className="mr-2 h-3 w-3" />}
                    {item.label}
                  </Button>
                ))}
              </nav>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <h2 className="text-lg font-semibold">KLYXOR Admin</h2>
          </div>
          <ScrollArea className="flex-1">
            <nav className="space-y-1 p-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b px-6 flex items-center">
          <h1 className="text-xl font-semibold">{title}</h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}