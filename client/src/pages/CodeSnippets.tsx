import { CodeSnippetManager } from "@/components/CodeSnippetManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Share2, Shield, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function CodeSnippets() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission("snippets", "create");

  return (
    <div className="p-6 space-y-6">
      {/* En-tête de la page */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bibliothèque de code</h1>
        <p className="text-muted-foreground">
          Partagez et réutilisez des extraits de code avec votre équipe
        </p>
      </div>

      {/* Cartes de fonctionnalités */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <Code2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-sm">Snippets partagés</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Créez et partagez des extraits de code réutilisables
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Share2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-sm">Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Travaillez ensemble sur des solutions techniques
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Shield className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-sm">Contrôle d'accès</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Gérez la visibilité publique ou privée de vos snippets
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-sm">Syntax highlighting</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Support de multiples langages de programmation
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Gestionnaire de snippets */}
      <Card>
        <CardHeader>
          <CardTitle>Vos snippets</CardTitle>
          <CardDescription>
            Gérez votre bibliothèque de code partagée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeSnippetManager showCreateButton={canManage} />
        </CardContent>
      </Card>
    </div>
  );
}