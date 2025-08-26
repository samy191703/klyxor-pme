import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Menu,
  ChevronDown,
  ChevronRight,
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
  X
} from "lucide-react";

interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
  },
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
      { label: "Workflows de validation", href: "/validation", icon: GitBranch },
      { label: "Échéances & rappels", href: "/deadlines", icon: Calendar },
      { label: "Indexations & rapports", href: "/indexations", icon: TrendingUp },
    ],
  },
  {
    label: "Facturation",
    icon: CreditCard,
    children: [
      { label: "Plans de facturation", href: "/billing-plans", icon: FileCheck },
      { label: "Flux de paiement", href: "/payment-flows", icon: DollarSign },
      { label: "Blocages de paiement", href: "/payment-blocks", icon: Ban },
      { label: "Preuves de paiement", href: "/payment-proofs", icon: Receipt },
    ],
  },
  {
    label: "Données & Documents",
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
];

export default function MobileNavWithSubmenu() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const isActiveSection = (item: MenuItem): boolean => {
    if (item.href === location) return true;
    if (item.children) {
      return item.children.some(child => child.href === location);
    }
    return false;
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.label);
    const isActive = item.href === location;
    const isSectionActive = isActiveSection(item);

    if (hasChildren) {
      return (
        <div key={item.label} className="mb-1">
          <button
            onClick={() => toggleSection(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              "hover:bg-gray-100 active:bg-gray-200",
              isSectionActive && "bg-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)]",
              level > 0 && "ml-4"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          {isExpanded && item.children && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-gray-100 hover:text-[var(--klyxor-bleu-nuit)] active:bg-gray-200",
          isActive && "bg-[var(--klyxor-or)]/20 text-[var(--klyxor-bleu-nuit)] shadow-sm",
          level > 0 && "ml-6 text-sm"
        )}
      >
        <Icon className={cn("w-4 h-4", level > 0 && "w-3.5 h-3.5")} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 border-b bg-gradient-to-br from-[var(--klyxor-bleu-nuit)]/5 via-[var(--klyxor-or)]/10 to-[var(--klyxor-bleu-nuit)]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/klyxor-logo.jpeg" 
                alt="klyxOR Logo"
                className="w-12 h-12 object-contain rounded-lg shadow-lg"
              />
              <div>
                <SheetTitle className="text-[var(--klyxor-bleu-nuit)]">klyxOR</SheetTitle>
                <p className="text-xs text-[var(--klyxor-bleu-nuit)]/70">Contract Management</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        {/* Footer with user info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--klyxor-bleu-nuit)] flex items-center justify-center text-white text-sm font-medium">
              AD
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--klyxor-bleu-nuit)]">Admin</p>
              <p className="text-xs text-gray-500">admin@klyxor.fr</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}