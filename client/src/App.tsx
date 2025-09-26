import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Login from "@/pages/Login";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
//import Contracts from "@/pages/contracts";
import Validation from "@/pages/validation";
import Workflows from "@/pages/workflows";
import Deadlines from "@/pages/deadlines";
import Indexations from "@/pages/indexations";
import Terminations from "@/pages/terminations";
import Documents from "@/pages/documents";
import Imports from "@/pages/imports";
import DataExport from "@/pages/data-export";
import ImportExport from "@/pages/import-export";
import Security from "@/pages/security";
import PermissionsTest from "@/pages/PermissionsTest";
import PermissionsDemo from "@/pages/permissions-demo";
import BillingPlans from "@/pages/billing-plans";
import PaymentFlows from "@/pages/payment-flows";
import PaymentBlocks from "@/pages/payment-blocks";
import PaymentProofs from "@/pages/payment-proofs";
import NotFound from "@/pages/not-found";
import { AIHelpProvider } from "@/components/widgets/ai-help-context";
import { ModalProvider } from "@/components/modals/modal-provider";
import { GlobalModals } from "@/components/modals/global-modals";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TutorialOverlay from "@/components/TutorialOverlay";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminContracts } from "@/pages/admin/AdminContracts";
import { AdminBilling } from "@/pages/admin/AdminBilling";
import { AdminIndexations } from "@/pages/admin/AdminIndexations";
import AdminAmendments from "@/pages/admin/amendments";
import AdminDeadlines from "@/pages/admin/deadlines";
import AdminDocuments from "@/pages/admin/documents";
import IndexationConfig from "@/pages/IndexationConfig";
import IndexationDashboard from "@/pages/IndexationDashboard";
import CodeSnippets from "@/pages/CodeSnippets";
import MainContractsPage from "./modules/contracts";
import { MuiThemeProvider } from "./styles/mui-theme";
import AmendmentsPage from "./modules/amendments/components/AmendmentsPage";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Show app routes if authenticated with persistent layout
  return (
    <>
      <TutorialOverlay />
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/contracts">
            <ProtectedRoute route="/contracts">
              <MainContractsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/validation">
            <ProtectedRoute route="/validation">
              <Validation />
            </ProtectedRoute>
          </Route>
          <Route path="/workflows">
            <ProtectedRoute route="/workflows">
              <Workflows />
            </ProtectedRoute>
          </Route>
          <Route path="/deadlines" component={Deadlines} />
          <Route path="/indexations">
            <ProtectedRoute route="/indexations">
              <Indexations />
            </ProtectedRoute>
          </Route>
          <Route path="/indexation-config">
            <ProtectedRoute route="/indexation-config">
              <IndexationConfig />
            </ProtectedRoute>
          </Route>
          <Route path="/indexation-dashboard">
            <ProtectedRoute route="/indexation-dashboard">
              <IndexationDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/amendments">
            <ProtectedRoute route="/amendments">
              <AmendmentsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/terminations">
            <ProtectedRoute route="/terminations">
              <Terminations />
            </ProtectedRoute>
          </Route>
          <Route path="/documents">
            <ProtectedRoute route="/documents">
              <Documents />
            </ProtectedRoute>
          </Route>
          <Route path="/code-snippets">
            <ProtectedRoute route="/code-snippets">
              <CodeSnippets />
            </ProtectedRoute>
          </Route>
          <Route path="/imports">
            <ProtectedRoute route="/imports">
              <Imports />
            </ProtectedRoute>
          </Route>
          <Route path="/data-export">
            <ProtectedRoute route="/data-export">
              <DataExport />
            </ProtectedRoute>
          </Route>
          <Route path="/import-export">
            <ProtectedRoute route="/import-export">
              <ImportExport />
            </ProtectedRoute>
          </Route>
          <Route path="/security">
            <ProtectedRoute route="/security">
              <Security />
            </ProtectedRoute>
          </Route>
          <Route path="/permissions-test">
            <ProtectedRoute route="/permissions-test">
              <PermissionsTest />
            </ProtectedRoute>
          </Route>
          <Route path="/permissions-demo">
            <ProtectedRoute route="/permissions-demo">
              <PermissionsDemo />
            </ProtectedRoute>
          </Route>
          <Route path="/billing-plans">
            <ProtectedRoute route="/billing-plans">
              <BillingPlans />
            </ProtectedRoute>
          </Route>
          <Route path="/payment-flows">
            <ProtectedRoute route="/payment-flows">
              <PaymentFlows />
            </ProtectedRoute>
          </Route>
          <Route path="/payment-blocks">
            <ProtectedRoute route="/payment-blocks">
              <PaymentBlocks />
            </ProtectedRoute>
          </Route>
          <Route path="/payment-proofs">
            <ProtectedRoute route="/payment-proofs">
              <PaymentProofs />
            </ProtectedRoute>
          </Route>

          {/* Admin routes - Protected for admin only */}
          <Route path="/admin">
            <ProtectedRoute route="/admin">
              <AdminDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/contracts">
            <ProtectedRoute route="/admin/contracts">
              <AdminContracts />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/billing">
            <ProtectedRoute route="/admin/billing">
              <AdminBilling />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/indexations">
            <ProtectedRoute route="/admin/indexations">
              <Indexations />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/amendments">
            <ProtectedRoute route="/admin/amendments">
              <AdminAmendments />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/deadlines">
            <ProtectedRoute route="/admin/deadlines">
              <AdminDeadlines />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/documents">
            <ProtectedRoute route="/admin/documents">
              <AdminDocuments />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/alerts">
            <ProtectedRoute route="/admin/alerts">
              <AdminDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/extraction" component={AdminDashboard} />
          <Route path="/admin/imports" component={AdminDashboard} />
          <Route path="/admin/security" component={AdminDashboard} />
          <Route path="/admin/audit" component={AdminDashboard} />

          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MuiThemeProvider>
          <AIHelpProvider>
            <ModalProvider>
              <Router />
              <GlobalModals />
            </ModalProvider>
          </AIHelpProvider>
        </MuiThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
