import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
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

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden lg:flex w-64 bg-white shadow-lg border-r border-gray-200 flex-col" data-testid="sidebar">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#04324c] rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-[#eff0ed] font-bold text-sm">kOR</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#04324c]">klyxOR</h1>
            <p className="text-xs text-[#002a47]">Contract Management • ENGIE</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-[#04324c]/10 text-[#04324c] border border-[#04324c]/20 font-semibold"
                  : "text-gray-700 hover:bg-[#04324c]/5"
              )}
              data-testid={`nav-${item.href.replace('/', '') || 'dashboard'}`}
            >
              <Icon className="w-5 h-5" />
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
