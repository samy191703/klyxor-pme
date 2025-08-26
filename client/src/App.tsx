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
