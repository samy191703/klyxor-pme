import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Menu,
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
  X
} from "lucide-react";

const menuItems = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Gestion des contrats",
    href: "/contracts",
    icon: FileText,
  },
  {
    label: "Workflows de validation",
    href: "/validation",
    icon: GitBranch,
  },
  {
    label: "Échéances & rappels",
    href: "/deadlines",
    icon: Calendar,
  },
  {
    label: "Indexations & rapports",
    href: "/indexations",
    icon: TrendingUp,
  },
  {
    label: "Avenants",
    href: "/amendments",
    icon: Edit,
  },
  {
    label: "Résiliations",
    href: "/terminations",
    icon: XCircle,
  },
  {
    label: "Documents & GED",
    href: "/documents",
    icon: Folder,
  },
  {
    label: "Import de données",
    href: "/imports",
    icon: Database,
  },
  {
    label: "Extraction des données",
    href: "/data-export",
    icon: Download,
  },
  {
    label: "Sécurité & Conformité",
    href: "/security",
    icon: Shield,
  },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          data-testid="mobile-menu-button"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
        <SheetHeader className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">kOR</span>
              </div>
              <div>
                <SheetTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">klyxOR</SheetTitle>
                <p className="text-xs text-gray-600">Contract Management • ENGIE</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-50 text-primary border border-blue-100"
                    : "text-gray-700 hover:bg-gray-50"
                )}
                data-testid={`mobile-nav-${item.href.replace('/', '') || 'dashboard'}`}
              >
                <Icon className="w-5 h-5" />
                <span className={cn("font-medium", isActive && "font-semibold")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}