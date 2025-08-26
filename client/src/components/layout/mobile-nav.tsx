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
  X,
  CreditCard,
  FileCheck,
  DollarSign,
  Ban,
  Receipt
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
  // Section Facturation
  {
    label: "Facturation",
    href: "#",
    icon: CreditCard,
    isSection: true,
  },
  {
    label: "Plans de facturation",
    href: "/billing-plans",
    icon: FileCheck,
  },
  {
    label: "Flux de paiement",
    href: "/payment-flows",
    icon: DollarSign,
  },
  {
    label: "Blocages de paiement",
    href: "/payment-blocks",
    icon: Ban,
  },
  {
    label: "Preuves de paiement",
    href: "/payment-proofs",
    icon: Receipt,
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
        <SheetHeader className="p-6 border-b bg-gradient-to-br from-[var(--klyxor-bleu-nuit)]/5 via-[var(--klyxor-or)]/10 to-[var(--klyxor-bleu-nuit)]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/klyxor-logo.jpeg" 
                alt="KLYXOR Logo"
                className="w-12 h-12 object-contain rounded-lg shadow-lg"
              />
              <div>
                <SheetTitle className="text-xl font-bold text-[var(--klyxor-bleu-nuit)]">KLYXOR</SheetTitle>
                <p className="text-xs text-[var(--klyxor-bleu-nuit)]/70">Contract Management</p>
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
            
            if (item.isSection) {
              return (
                <div key={item.label} className="mt-6 mb-2 px-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-[var(--klyxor-bleu-nuit)]/10 to-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)] border-l-4 border-l-[var(--klyxor-or)] font-semibold"
                    : "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--klyxor-bleu-nuit)]/5 hover:to-[var(--klyxor-or)]/5"
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