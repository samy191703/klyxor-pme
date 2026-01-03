import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  TrendingUp,
  FileEdit,
  Calendar,
  FolderOpen,
  Bell,
  Download,
  Upload,
  Shield,
  History,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  subItems?: {
    label: string;
    path: string;
  }[];
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Accueil (Admin)",
    icon: LayoutDashboard,
    path: "/admin",
    subItems: [
      { label: "KPI globaux", path: "/admin" },
      { label: "Tâches bloquantes", path: "/admin/tasks" },
      { label: "Alertes critiques", path: "/admin/alerts" },
      { label: "Derniers exports", path: "/admin/exports" }
    ]
  },
  {
    id: "contracts",
    label: "Contrats (Admin)",
    icon: FileText,
    path: "/admin/contracts",
    subItems: [
      { label: "Liste", path: "/admin/contracts" },
      { label: "Fiche contrat", path: "/admin/contracts/details" },
      { label: "Paramètres types", path: "/admin/contracts/types" },
      { label: "Workflows & droits", path: "/admin/contracts/workflows" }
    ]
  },
  {
    id: "billing",
    label: "Facturation (Admin)",
    icon: CreditCard,
    path: "/admin/billing",
    subItems: [
      { label: "Plans de facturation", path: "/admin/billing/plans" },
      { label: "Flux de paiement", path: "/admin/billing/payments" },
      { label: "Preuves de paiement", path: "/admin/billing/proofs" },
      { label: "Paramètres", path: "/admin/billing/settings" }
    ]
  },
  {
    id: "indexations",
    label: "Indexations (Admin)",
    icon: TrendingUp,
    path: "/admin/indexations",
    subItems: [
      { label: "À calculer", path: "/admin/indexations/calculate" },
      { label: "À valider", path: "/admin/indexations/validate" },
      { label: "Historique", path: "/admin/indexations/history" },
      { label: "Formules", path: "/admin/indexations/formulas" },
      { label: "Indices (sources)", path: "/admin/indexations/indices" },
      { label: "Rapports", path: "/admin/indexations/reports" }
    ]
  },
  {
    id: "amendments",
    label: "Avenants (Admin)",
    icon: FileEdit,
    path: "/admin/amendments",
    subItems: [
      { label: "À valider", path: "/admin/amendments/validate" },
      { label: "Historique", path: "/admin/amendments/history" },
      { label: "Paramètres", path: "/admin/amendments/settings" }
    ]
  },
  {
    id: "deadlines",
    label: "Échéances (Admin)",
    icon: Calendar,
    path: "/admin/deadlines",
    subItems: [
      { label: "Liste globale", path: "/admin/deadlines" },
      { label: "Paramètres de pré-alerte", path: "/admin/deadlines/settings" }
    ]
  },
  {
    id: "documents",
    label: "Documents & GED (Admin)",
    icon: FolderOpen,
    path: "/admin/documents",
    subItems: [
      { label: "GED par contrat", path: "/admin/documents" },
      { label: "Historique documents", path: "/admin/documents/history" }
    ]
  },
  {
    id: "notifications",
    label: "Alertes & notifications (Admin)",
    icon: Bell,
    path: "/admin/notifications",
    subItems: [
      { label: "Journal", path: "/admin/notifications" },
      { label: "Préférences par défaut", path: "/admin/notifications/settings" }
    ]
  },
  {
    id: "extraction",
    label: "Extraction (Admin)",
    icon: Download,
    path: "/admin/extraction",
    subItems: [
      { label: "Exports", path: "/admin/extraction" },
      { label: "Historique d'exports", path: "/admin/extraction/history" }
    ]
  },
  {
    id: "import",
    label: "Import historique (Admin)",
    icon: Upload,
    path: "/admin/import"
  },
  {
    id: "security",
    label: "Sécurité & conformité (Admin)",
    icon: Shield,
    path: "/admin/security"
  },
  {
    id: "audit",
    label: "Historique & audit (Admin)",
    icon: History,
    path: "/admin/audit"
  }
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["dashboard"]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + "/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40",
        isSidebarOpen ? "w-72" : "w-0 overflow-hidden"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">KLYXOR Admin</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isExpanded = expandedItems.includes(item.id);
              const isItemActive = isActive(item.path);
              
              return (
                <div key={item.id}>
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors",
                      isItemActive
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-100 text-gray-700"
                    )}
                  >
                    <Link href={item.path} className="flex items-center gap-3 flex-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                    {item.subItems && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(item.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {item.subItems && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.subItems.map(subItem => (
                        <Link 
                          key={subItem.path} 
                          href={subItem.path}
                          className={cn(
                            "block pl-9 pr-2 py-1.5 text-sm rounded-lg transition-colors",
                            isActive(subItem.path)
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
      
      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        isSidebarOpen ? "ml-72" : "ml-0"
      )}>
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="mr-4"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Administration KLYXOR</h1>
        </header>
        
        {/* Page Content */}
        <main className="p-6 overflow-auto h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}