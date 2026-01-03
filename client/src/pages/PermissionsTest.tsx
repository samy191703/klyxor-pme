import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, User, Shield, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PermissionsTest() {
  const { toast } = useToast();

  // Récupérer les informations de l'utilisateur connecté
  const { data: authData } = useQuery({
    queryKey: ["/api/auth/check"]
  });

  // Récupérer les permissions de l'utilisateur
  const { data: permissions } = useQuery({
    queryKey: ["/api/auth/permissions"],
    enabled: !!authData?.authenticated
  });

  const currentUser = authData?.user;

  const permissionsList = [
    { 
      label: "Créer des contrats", 
      key: "canCreateContracts",
      description: "Permet de créer de nouveaux contrats dans le système"
    },
    { 
      label: "Valider des contrats", 
      key: "canValidateContracts",
      description: "Permet d'approuver ou rejeter des contrats"
    },
    { 
      label: "Supprimer des contrats", 
      key: "canDeleteContracts",
      description: "Permet de supprimer définitivement des contrats"
    },
    { 
      label: "Gérer les utilisateurs", 
      key: "canManageUsers",
      description: "Permet de créer, modifier et supprimer des utilisateurs"
    },
    { 
      label: "Accès panneau admin", 
      key: "canAccessAdmin",
      description: "Accès au tableau de bord d'administration"
    },
    { 
      label: "Approuver les indexations", 
      key: "canApproveIndexations",
      description: "Permet de valider les calculs d'indexation"
    },
    { 
      label: "Gérer la facturation", 
      key: "canManageBilling",
      description: "Accès complet aux fonctions de facturation"
    }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'contract_manager':
        return 'bg-blue-100 text-blue-800';
      case 'validator':
        return 'bg-green-100 text-green-800';
      case 'finance_manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'contract_manager':
        return 'Gestionnaire de contrat';
      case 'validator':
        return 'Valideur';
      case 'finance_manager':
        return 'Gestionnaire financier';
      case 'business_unit_manager':
        return 'Responsable BU';
      default:
        return 'Utilisateur';
    }
  };

  const testAccess = async (endpoint: string, method: string = 'GET') => {
    try {
      const response = await fetch(endpoint, {
        method,
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Accès autorisé",
          description: `Vous avez accès à ${endpoint}`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Accès refusé",
          description: error.error || "Vous n'avez pas les permissions nécessaires",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du test d'accès",
        variant: "destructive"
      });
    }
  };

  if (!authData?.authenticated) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Vous devez être connecté pour voir cette page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Test des Permissions</h1>
        <p className="text-gray-600">Vérifiez vos permissions et accès selon votre rôle</p>
      </div>

      {/* Informations utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Utilisateur connecté
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-lg font-semibold">{currentUser?.name}</p>
              <p className="text-gray-600">{currentUser?.email}</p>
              <p className="text-sm text-gray-500">ID: {currentUser?.id}</p>
            </div>
            <Badge className={getRoleColor(currentUser?.role)}>
              <Shield className="h-3 w-3 mr-1" />
              {getRoleLabel(currentUser?.role)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Matrice des permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permissions accordées
          </CardTitle>
          <CardDescription>
            Les permissions sont définies selon votre rôle: {getRoleLabel(permissions?.role)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissionsList.map((perm) => {
              const hasPermission = permissions?.permissions?.[perm.key];
              return (
                <div
                  key={perm.key}
                  className={`p-4 rounded-lg border ${
                    hasPermission 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {hasPermission ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p className="font-medium">{perm.label}</p>
                      </div>
                      <p className="text-sm text-gray-600 ml-7">
                        {perm.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tests d'accès */}
      <Card>
        <CardHeader>
          <CardTitle>Tester les accès</CardTitle>
          <CardDescription>
            Cliquez sur les boutons pour tester vos accès aux différentes ressources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/contracts')}
            >
              Lire contrats
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/contracts', 'POST')}
            >
              Créer contrat
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/users')}
            >
              Liste utilisateurs
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/admin/kpis')}
            >
              KPIs Admin
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/indexations')}
            >
              Lire indexations
            </Button>
            <Button 
              variant="outline" 
              onClick={() => testAccess('/api/billing')}
            >
              Accès facturation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparaison des rôles */}
      <Card>
        <CardHeader>
          <CardTitle>Comparaison des rôles</CardTitle>
          <CardDescription>
            Différences de permissions entre les rôles principaux
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Fonctionnalité</th>
                  <th className="text-center py-2 px-4">Admin</th>
                  <th className="text-center py-2 px-4">Gestionnaire contrat</th>
                  <th className="text-center py-2 px-4">Valideur</th>
                  <th className="text-center py-2 px-4">Finance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-4">Créer contrats</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Valider contrats</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Supprimer contrats</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Gérer utilisateurs</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Gérer facturation</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 px-4">Panneau admin</td>
                  <td className="text-center py-2 px-4"><CheckCircle className="h-4 w-4 text-green-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                  <td className="text-center py-2 px-4"><XCircle className="h-4 w-4 text-red-600 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}