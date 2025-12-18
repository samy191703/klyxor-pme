// client/src/components/ProtectedRoute.tsx

import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { AlertCircle, Loader2 } from "lucide-react";

import { usePermissions } from "@/hooks/usePermissions";
import { KlyxorPageLayout, type KlyxorThemeTokens } from "@/components/layout/KlyxorPageLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProtectedRouteProps = {
  children: ReactNode;
  route?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
};

function stripQueryAndHash(path: string): string {
  const safe = (path || "").trim();
  const noQuery = safe.split("?")[0] ?? "";
  const noHash = noQuery.split("#")[0] ?? "";
  return noHash || "/";
}

function AccessDeniedView({
  routeToCheck,
  userRole,
  title,
  subtitle,
}: {
  routeToCheck: string;
  userRole?: string | null;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <KlyxorPageLayout title={title} subtitle={subtitle} actions={() => null}>
      {(theme: KlyxorThemeTokens) => {
        const { sectionCardClass } = theme;

        return (
          <div className="space-y-4" data-testid="access-denied">
            <Card className={sectionCardClass}>
              <CardContent className="p-4">
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Accès refusé</AlertTitle>
                  <AlertDescription className="text-red-700">
                    Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
                    <div className="mt-2 text-sm">
                      <div>
                        Route : <strong>{routeToCheck}</strong>
                      </div>
                      <div className="mt-1">
                        Votre rôle actuel : <strong>{userRole || "Non défini"}</strong>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        );
      }}
    </KlyxorPageLayout>
  );
}

function LoadingAccessView() {
  return (
    <KlyxorPageLayout title="Chargement" subtitle="Vérification des accès…">
      {(theme: KlyxorThemeTokens) => {
        const { sectionCardClass, mutedText } = theme;

        return (
          <Card className={sectionCardClass}>
            <CardContent className="p-6">
              <div className={cn("flex items-center gap-3", mutedText)}>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement…</span>
              </div>
            </CardContent>
          </Card>
        );
      }}
    </KlyxorPageLayout>
  );
}

export function ProtectedRoute({
  children,
  route,
  title = "Accès refusé",
  subtitle = "Vous n’avez pas les permissions nécessaires pour accéder à cette page.",
}: ProtectedRouteProps) {
  const { hasPermission, userRole, loading } = usePermissions();
  const [location] = useLocation();

  const routeToCheck = stripQueryAndHash(route ?? location);

  if (loading) return <LoadingAccessView />;

  if (!hasPermission(routeToCheck)) {
    return (
      <AccessDeniedView
        routeToCheck={routeToCheck}
        userRole={userRole}
        title={title}
        subtitle={subtitle}
      />
    );
  }

  return <>{children}</>;
}
