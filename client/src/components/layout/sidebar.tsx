import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
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
  ChevronRight,
  ChevronDown,
  Settings,
  Activity,
  Code2,
} from "lucide-react";

interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  isSection?: boolean;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Gestion des contrats",
    href: "/admin/contracts",
    icon: FileText,
  },
  {
    label: "Workflows de validation",
    href: "/validation",
    icon: GitBranch,
  },
  {
    label: "Échéances & rappels",
    href: "/admin/deadlines",
    icon: Calendar,
  },
  {
    label: "Indexations & rapports",
    href: "/indexations",
    icon: TrendingUp,
  },
  {
    label: "Avenants",
    href: "/admin/amendments",
    icon: Edit,
  },
  {
    label: "Résiliations",
    href: "/terminations",
    icon: XCircle,
  },
  {
    label: "Documents & GED",
    href: "/admin/documents",
    icon: Folder,
  },
  {
    label: "Bibliothèque de code",
    href: "/code-snippets",
    icon: Code2,
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
    href: "/admin/billing",
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

export default function Sidebar() {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return location === href;
  };

  const hasActiveSubmenu = (submenu?: MenuItem[]) => {
    if (!submenu) return false;
    return submenu.some(item => isActive(item.href));
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.includes(item.label);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isItemActive = isActive(item.href);
    const hasActiveChild = hasActiveSubmenu(item.submenu);
    
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
    
    if (hasSubmenu) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
              (isExpanded || hasActiveChild)
                ? "bg-gradient-to-r from-[var(--klyxor-bleu-nuit)]/10 to-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)]"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--klyxor-bleu-nuit)]/5 hover:to-[var(--klyxor-or)]/5"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <div className="flex items-center space-x-3">
              <Icon className="w-5 h-5" />
              <span className={cn("font-medium", (isExpanded || hasActiveChild) && "font-semibold")}>
                {item.label}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu.map(subItem => {
                const SubIcon = subItem.icon;
                const isSubActive = isActive(subItem.href);
                
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href!}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                      isSubActive
                        ? "bg-gradient-to-r from-[var(--klyxor-bleu-nuit)]/10 to-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)] border-l-4 border-l-[var(--klyxor-or)] font-semibold"
                        : "text-gray-600 hover:bg-gradient-to-r hover:from-[var(--klyxor-bleu-nuit)]/5 hover:to-[var(--klyxor-or)]/5"
                    )}
                    data-testid={`nav-${subItem.href?.replace('/', '') || 'item'}`}
                  >
                    <SubIcon className="w-4 h-4" />
                    <span className={cn("text-sm", isSubActive && "font-semibold")}>
                      {subItem.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <Link
        key={item.href}
        href={item.href!}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
          isItemActive
            ? "bg-gradient-to-r from-[var(--klyxor-bleu-nuit)]/10 to-[var(--klyxor-or)]/10 text-[var(--klyxor-bleu-nuit)] border-l-4 border-l-[var(--klyxor-or)] font-semibold"
            : "text-gray-700 hover:bg-gradient-to-r hover:from-[var(--klyxor-bleu-nuit)]/5 hover:to-[var(--klyxor-or)]/5"
        )}
        data-testid={`nav-${item.href?.replace('/', '') || 'dashboard'}`}
      >
        <Icon className="w-5 h-5" />
        <span className={cn("font-medium", isItemActive && "font-semibold")}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="hidden lg:flex w-64 bg-white shadow-lg border-r border-gray-200 flex-col" data-testid="sidebar">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-[var(--klyxor-bleu-nuit)]/5 via-[var(--klyxor-or)]/10 to-[var(--klyxor-bleu-nuit)]/5">
        <div className="flex items-center space-x-3">
          <img 
            src="/klyxor-logo.jpeg" 
            alt="KLYXOR Logo"
            className="w-12 h-12 object-contain rounded-lg shadow-lg"
          />
          <div>
            <h1 className="text-xl font-bold text-[var(--klyxor-bleu-nuit)]">KLYXOR</h1>
            <p className="text-xs text-[var(--klyxor-bleu-nuit)]/70">Contract Management</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(renderMenuItem)}
      </nav>
    </div>
  );
}