import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Contracts from "@/pages/contracts";
import Validation from "@/pages/validation";
import Deadlines from "@/pages/deadlines";
import Indexations from "@/pages/indexations";
import Amendments from "@/pages/amendments";
import Terminations from "@/pages/terminations";
import Documents from "@/pages/documents";
import Imports from "@/pages/imports";
import DataExport from "@/pages/data-export";
import Security from "@/pages/security";
import BillingPlans from "@/pages/billing-plans";
import PaymentFlows from "@/pages/payment-flows";
import PaymentBlocks from "@/pages/payment-blocks";
import PaymentProofs from "@/pages/payment-proofs";
import NotFound from "@/pages/not-found";
import { AIHelpProvider } from "@/components/ai-help/context-provider";

// Admin pages
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminContracts } from "@/pages/admin/AdminContracts";
import { AdminBilling } from "@/pages/admin/AdminBilling";
import { AdminIndexations } from "@/pages/admin/AdminIndexations";
import AdminAmendments from "@/pages/admin/amendments";
import AdminDeadlines from "@/pages/admin/deadlines";
import AdminDocuments from "@/pages/admin/documents";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/validation" component={Validation} />
      <Route path="/deadlines" component={Deadlines} />
      <Route path="/indexations" component={Indexations} />
      <Route path="/amendments" component={Amendments} />
      <Route path="/terminations" component={Terminations} />
      <Route path="/documents" component={Documents} />
      <Route path="/imports" component={Imports} />
      <Route path="/data-export" component={DataExport} />
      <Route path="/security" component={Security} />
      <Route path="/billing-plans" component={BillingPlans} />
      <Route path="/payment-flows" component={PaymentFlows} />
      <Route path="/payment-blocks" component={PaymentBlocks} />
      <Route path="/payment-proofs" component={PaymentProofs} />
      
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/contracts" component={AdminContracts} />
      <Route path="/admin/billing" component={AdminBilling} />
      <Route path="/admin/indexations" component={AdminIndexations} />
      <Route path="/admin/amendments" component={AdminAmendments} />
      <Route path="/admin/deadlines" component={AdminDeadlines} />
      <Route path="/admin/documents" component={AdminDocuments} />
      <Route path="/admin/alerts" component={AdminDashboard} />
      <Route path="/admin/extraction" component={AdminDashboard} />
      <Route path="/admin/imports" component={AdminDashboard} />
      <Route path="/admin/security" component={AdminDashboard} />
      <Route path="/admin/audit" component={AdminDashboard} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AIHelpProvider initialPage="dashboard">
          <Toaster />
          <Router />
        </AIHelpProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
