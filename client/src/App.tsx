import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import { queryClient } from "./lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// IMPORTANT: import relatif (évite les alias fantômes)
import { AppLayout } from "./components/layout/AppLayout";

import { AIHelpProvider } from "@/components/widgets/ai-help-context";
import { ModalProvider } from "@/components/modals/modal-provider";
import { GlobalModals } from "@/components/modals/global-modals";
import { MuiThemeProvider } from "./styles/mui-theme";

// Pages (core)
import Dashboard from "@/pages/dashboard";
import Workflows from "@/pages/workflows";
import Imports from "@/pages/imports";
import DataExport from "@/pages/data-export";
import ImportExport from "@/pages/import-export";
import Security from "@/pages/security";
import PermissionsTest from "@/pages/PermissionsTest";
import PermissionsDemo from "@/pages/permissions-demo";
import PaymentFlows from "@/pages/payment-flows";
import PaymentBlocks from "@/pages/payment-blocks";
import PaymentProofs from "@/pages/payment-proofs";
import IndexationConfig from "@/pages/IndexationConfig";
import IndexationDashboard from "@/pages/IndexationDashboard";
import CodeSnippets from "@/pages/CodeSnippets";

// Clients / Contrats
import ClientsListPage from "@/pages/ClientsListPage";
import NewClientPage from "@/pages/NewClientPage";
import ClientDetailPage from "@/pages/ClientDetailPage";

import ContractsModule from "@/modules/contracts/contracts";
import ContractCreatePage from "@/pages/contracts-new";
import ContractDetailPage from "@/pages/ContractDetailPage";

// Modules
import AmendmentsPage from "./modules/amendments/components/AmendmentsPage";
import { TerminationsPage } from "./modules/terminations";
import { GEDPage } from "./modules/ged";
import ValidationRequestsPage from "./modules/validation-requests/components/ValidationRequestsPage";

import BillingPlans from "@/pages/billing-plans";
import BillingModulePage from "./modules/billing/_views/BillingModulePage";
import InvoiceModulePage from "./modules/invoices/_views/InvoiceModulePage";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminContracts } from "@/pages/admin/AdminContracts";
import { AdminBilling } from "@/pages/admin/AdminBilling";
import { AdminIndexations } from "@/pages/admin/AdminIndexations";
import AdminAmendments from "@/pages/admin/amendments";
import AdminDeadlines from "@/pages/admin/deadlines";
import AdminDocuments from "@/pages/admin/documents";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

function PublicRoutes() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route component={Login} />
    </Switch>
  );
}

function PrivateRoutes() {
  return (
    <AppLayout>
      <Switch>
        {/* Root -> Dashboard */}
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>

        {/* ==================== Dashboard ==================== */}
        <Route path="/dashboard" component={Dashboard} />

        {/* ==================== Contrats ==================== */}
        <Route path="/contracts" component={ContractsModule} />
        <Route path="/contracts/new" component={ContractCreatePage} />
        <Route path="/contracts/:id" component={ContractDetailPage} />

        {/* ==================== Clients ==================== */}
        <Route path="/clients" component={ClientsListPage} />
        <Route path="/clients/new" component={NewClientPage} />
        <Route path="/clients/:id" component={ClientDetailPage} />

        {/* ==================== Validation / Workflows ==================== */}
        <Route path="/validation" component={ValidationRequestsPage} />
        <Route path="/workflows" component={Workflows} />

        {/* ==================== Indexation ==================== */}
        <Route path="/indexation-config" component={IndexationConfig} />
        <Route path="/indexation-dashboard" component={IndexationDashboard} />

        {/* ==================== Avenants / Résiliations ==================== */}
        <Route path="/amendments" component={AmendmentsPage} />
        <Route path="/terminations" component={TerminationsPage} />

        {/* ==================== Documents / Imports ==================== */}
        <Route path="/documents" component={GEDPage} />
        <Route path="/imports" component={Imports} />
        <Route path="/data-export" component={DataExport} />
        <Route path="/import-export" component={ImportExport} />

        {/* ==================== Sécurité / Outils ==================== */}
        <Route path="/security" component={Security} />
        <Route path="/code-snippets" component={CodeSnippets} />
        <Route path="/permissions-test" component={PermissionsTest} />
        <Route path="/permissions-demo" component={PermissionsDemo} />

        {/* ==================== Facturation ==================== */}
        <Route path="/billing-plans" component={BillingPlans} />
        <Route path="/billing-schedules" component={BillingModulePage} />
        <Route path="/invoices" component={InvoiceModulePage} />

        {/* ==================== Paiements ==================== */}
        <Route path="/payment-flows" component={PaymentFlows} />
        <Route path="/payment-blocks" component={PaymentBlocks} />
        <Route path="/payment-proofs" component={PaymentProofs} />

        {/* ==================== Admin ==================== */}
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/contracts" component={AdminContracts} />
        <Route path="/admin/billing" component={AdminBilling} />
        <Route path="/admin/indexations" component={AdminIndexations} />
        <Route path="/admin/amendments" component={AdminAmendments} />
        <Route path="/admin/deadlines" component={AdminDeadlines} />
        <Route path="/admin/documents" component={AdminDocuments} />

        {/* Fallback */}
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <PublicRoutes />;
  return <PrivateRoutes />;
}

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MuiThemeProvider>
          <AIHelpProvider>
            <ModalProvider>{children}</ModalProvider>
          </AIHelpProvider>
        </MuiThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Router />
      <GlobalModals />
    </AppProviders>
  );
}
