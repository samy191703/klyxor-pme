import { ReactElement } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: ReactElement;
  route?: string;
}

export function ProtectedRoute({ children, route }: ProtectedRouteProps) {
  const { hasPermission, userRole, loading } = usePermissions();
  const [location] = useLocation();
  const routeToCheck = route || location;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!hasPermission(routeToCheck)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Accès refusé</AlertTitle>
          <AlertDescription className="text-red-700">
            Vous n'avez pas les permissions nécessaires pour accéder à cette
            page.
            <br />
            <span className="text-sm mt-2 block">
              Votre rôle actuel : <strong>{userRole || "Non défini"}</strong>
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return children;
}
