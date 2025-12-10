// src/navigation/routes.ts
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
  Settings,
  BarChart,
  Activity,
  Calculator,
} from "lucide-react";

export interface MenuItem {
  label: string;
  href?: string;
  icon: any;
  children?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  { label: "Tableau de bord", href: "/", icon: LayoutDashboard },
  {
    label: "Contrats",
    icon: FileText,
    children: [
      { label: "Gestion des contrats", href: "/contracts", icon: FileText },
      { label: "Avenants", href: "/amendments", icon: Edit },
      { label: "Résiliations", href: "/terminations", icon: XCircle },
      { label: "Clients", href: "/clients", icon: XCircle },
    ],
  },
  {
    label: "Validation & Contrôle",
    icon: GitBranch,
    children: [
      { label: "Demandes de validation", href: "/validation", icon: GitBranch },
      { label: "Workflows", href: "/workflows", icon: Settings },
      { label: "Échéances & rappels", href: "/deadlines", icon: Calendar },
    ],
  },
  {
    label: "Indexation",
    href: "/indexations",
    icon: Calculator,
    children: [
      {
        label: "Indices INSEE",
        href: "/indexations?tab=indices",
        icon: BarChart,
      },
      {
        label: "À calculer",
        href: "/indexations?tab=toCalculate",
        icon: Calculator,
      },
      { label: "En cours", href: "/indexations?tab=list", icon: Activity },
      {
        label: "Historique",
        href: "/indexations?tab=history",
        icon: TrendingUp,
      },
      { label: "Rapports", href: "/indexations?tab=reports", icon: FileText },
      {
        label: "Paramétrage",
        href: "/indexations?tab=settings",
        icon: Settings,
      },
    ],
  },
  {
    label: "Facturation",
    icon: CreditCard,
    children: [
      {
        label: "Plans de facturation",
        href: "/billing-schedules",
        icon: FileCheck,
      },
      {
        label: "Factures",
        href: "/invoices",
        icon: FileText,
      },
      {
        label: "Plans de facturation ancien",
        href: "/billing-plans",
        icon: FileCheck,
      },
      { label: "Flux de paiement", href: "/payment-flows", icon: DollarSign },
      { label: "Blocages de paiement", href: "/payment-blocks", icon: Ban },
      { label: "Preuves de paiement", href: "/payment-proofs", icon: Receipt },
    ],
  },
  {
    label: "Espace Documentaire",
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

/** Keep only items the current user can access. */
export function filterMenuItems(
  items: MenuItem[],
  hasPermission: (href: string) => boolean,
  userRole?: string
): MenuItem[] {
  return items
    .map((i) => ({ ...i }))
    .filter((item) => {
      if (item.href && !hasPermission(item.href)) return false;
      if (item.label === "Administration" && userRole !== "admin") return false;
      if (item.children?.length) {
        const filtered = filterMenuItems(
          item.children,
          hasPermission,
          userRole
        );
        if (!filtered.length) return false;
        item.children = filtered;
      }
      return true;
    });
}

/** Flatten leaves for search/autocomplete. */
export type LeafRoute = {
  label: string;
  href: string;
  section: string;
  icon: any;
};

export function flattenLeaves(
  items: MenuItem[],
  parentLabel?: string
): LeafRoute[] {
  const out: LeafRoute[] = [];
  for (const item of items) {
    if (item.children?.length) {
      out.push(...flattenLeaves(item.children, item.label));
    } else if (item.href) {
      out.push({
        label: item.label,
        href: item.href,
        section: parentLabel ?? item.label,
        icon: item.icon,
      });
    }
  }
  return out;
}
