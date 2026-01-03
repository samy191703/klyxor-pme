import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText,
  Edit,
  Trash,
  Eye,
  UserCheck,
  UserX,
  ArrowRight,
  Clock,
  Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Action {
  id: string;
  type: string;
  actor: string;
  target: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
  reason?: string;
}

export default function PermissionsDemo() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<'admin' | 'gestionnaire' | 'valideur'>('gestionnaire');
  const [actions, setActions] = useState<Action[]>([]);
  const [contractStatus, setContractStatus] = useState<'draft' | 'pending' | 'active' | 'rejected'>('draft');

  // Simulation des actions
  const simulateAction = (actionType: string, actor: string, target: string) => {
    const newAction: Action = {
      id: Date.now().toString(),
      type: actionType,
      actor,
      target,
      status: 'pending',
      timestamp: new Date()
    };
    
    setActions([newAction, ...actions]);
    
    // Logique selon le rôle
    if (actor === 'gestionnaire' && actionType === 'create') {
      setContractStatus('pending');
      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé et envoyé pour validation",
      });
    }
  };

  const handleValidation = (actionId: string, decision: 'approved' | 'rejected', reason?: string) => {
    setActions(actions.map(action => 
      action.id === actionId 
        ? { ...action, status: decision, reason } 
        : action
    ));
    
    if (decision === 'approved') {
      setContractStatus('active');
      toast({
        title: "Validation acceptée",
        description: "Le contrat est maintenant actif",
      });
    } else {
      setContractStatus('rejected');
      toast({
        title: "Validation rejetée",
        description: reason || "Le contrat a été rejeté",
        variant: "destructive"
      });
    }
  };

  const permissions = {
    admin: {
      contrats: { read: true, write: false, validate: false, delete: false },
      indexations: { read: true, write: false, validate: false, delete: false },
      parametres: { read: true, write: true, validate: false, delete: true },
      utilisateurs: { read: true, write: true, validate: false, delete: true },
      workflows: { read: true, write: true, validate: false, delete: true },
      audit: { read: true, write: false, validate: false, delete: false }
    },
    gestionnaire: {
      contrats: { read: true, write: true, validate: false, delete: false },
      indexations: { read: true, write: true, validate: false, delete: false },
      parametres: { read: false, write: false, validate: false, delete: false },
      utilisateurs: { read: false, write: false, validate: false, delete: false },
      workflows: { read: false, write: false, validate: false, delete: false },
      audit: { read: true, write: false, validate: false, delete: false }
    },
    valideur: {
      contrats: { read: true, write: false, validate: true, delete: false },
      indexations: { read: true, write: false, validate: true, delete: false },
      parametres: { read: false, write: false, validate: false, delete: false },
      utilisateurs: { read: false, write: false, validate: false, delete: false },
      workflows: { read: false, write: false, validate: false, delete: false },
      audit: { read: true, write: false, validate: false, delete: false }
    }
  };

  const scenarios = [
    {
      title: "Création et validation d'un contrat",
      steps: [
        { actor: "Gestionnaire", action: "Crée un nouveau contrat", possible: true },
        { actor: "Gestionnaire", action: "Le contrat passe en 'À valider'", possible: true },
        { actor: "Valideur", action: "Examine et valide le contrat", possible: true },
        { actor: "Système", action: "Le contrat devient 'Actif'", possible: true }
      ]
    },
    {
      title: "Tentative d'auto-validation (interdite)",
      steps: [
        { actor: "Gestionnaire", action: "Crée un contrat", possible: true },
        { actor: "Gestionnaire", action: "Tente de valider son propre contrat", possible: false },
        { actor: "Système", action: "Bloque l'action - auto-validation interdite", possible: false }
      ]
    },
    {
      title: "Administration sans validation métier",
      steps: [
        { actor: "Admin", action: "Configure les workflows", possible: true },
        { actor: "Admin", action: "Définit les formules d'indexation", possible: true },
        { actor: "Admin", action: "Tente de valider un contrat", possible: false },
        { actor: "Système", action: "L'admin n'a pas de pouvoir de validation métier", possible: false }
      ]
    },
    {
      title: "Flux de rejet avec motif obligatoire",
      steps: [
        { actor: "Gestionnaire", action: "Soumet une indexation", possible: true },
        { actor: "Valideur", action: "Rejette sans motif", possible: false },
        { actor: "Système", action: "Exige un motif de rejet", possible: false },
        { actor: "Valideur", action: "Rejette avec motif", possible: true }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* En-tête avec sélecteur de rôle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Démonstration des permissions KLYXOR
          </CardTitle>
          <CardDescription>
            Testez les différents rôles et leurs permissions respectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">Rôle actuel:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={currentUser === 'admin' ? 'default' : 'outline'}
                onClick={() => setCurrentUser('admin')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Administrateur
              </Button>
              <Button
                variant={currentUser === 'gestionnaire' ? 'default' : 'outline'}
                onClick={() => setCurrentUser('gestionnaire')}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Gestionnaire
              </Button>
              <Button
                variant={currentUser === 'valideur' ? 'default' : 'outline'}
                onClick={() => setCurrentUser('valideur')}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Valideur
              </Button>
            </div>
          </div>

          {/* Restrictions du rôle actuel */}
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Restrictions pour {currentUser === 'admin' ? 'Administrateur' : currentUser === 'gestionnaire' ? 'Gestionnaire' : 'Valideur'}:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {currentUser === 'admin' && (
                  <>
                    <li>Ne peut pas valider les opérations métier</li>
                    <li>Accès complet aux paramètres système</li>
                    <li>Seul habilité à supprimer des documents</li>
                  </>
                )}
                {currentUser === 'gestionnaire' && (
                  <>
                    <li>Ne peut pas valider ses propres créations</li>
                    <li>Toutes les actions sont soumises à validation</li>
                    <li>Ne peut pas supprimer de documents</li>
                    <li>Ne peut pas modifier un contrat clôturé</li>
                  </>
                )}
                {currentUser === 'valideur' && (
                  <>
                    <li>Ne peut pas valider ses propres créations</li>
                    <li>Doit fournir un motif pour chaque refus</li>
                    <li>Ne peut pas modifier directement les données</li>
                    <li>Décisions uniquement (accepter/rejeter)</li>
                  </>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="permissions">Matrice des permissions</TabsTrigger>
          <TabsTrigger value="scenarios">Scénarios de test</TabsTrigger>
          <TabsTrigger value="simulation">Simulation interactive</TabsTrigger>
        </TabsList>

        {/* Matrice des permissions */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions détaillées pour: {currentUser === 'admin' ? 'Administrateur' : currentUser === 'gestionnaire' ? 'Gestionnaire' : 'Valideur'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center">Lecture</TableHead>
                      <TableHead className="text-center">Écriture</TableHead>
                      <TableHead className="text-center">Validation</TableHead>
                      <TableHead className="text-center">Suppression</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(permissions[currentUser]).map(([module, perms]) => (
                      <TableRow key={module}>
                        <TableCell className="font-medium capitalize">{module}</TableCell>
                        <TableCell className="text-center">
                          {perms.read ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {perms.write ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {perms.validate ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {perms.delete ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scénarios de test */}
        <TabsContent value="scenarios">
          <div className="space-y-4">
            {scenarios.map((scenario, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{scenario.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scenario.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {step.possible ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Ban className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <Badge variant={step.actor === 'Système' ? 'secondary' : 'outline'}>
                            {step.actor}
                          </Badge>
                          <span className={`text-sm ${!step.possible ? 'text-gray-500 line-through' : ''}`}>
                            {step.action}
                          </span>
                        </div>
                        {stepIndex < scenario.steps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Simulation interactive */}
        <TabsContent value="simulation">
          <Card>
            <CardHeader>
              <CardTitle>Simulation d'un workflow de contrat</CardTitle>
              <CardDescription>
                Testez le flux de création et validation d'un contrat entre les différents acteurs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* État du contrat */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-6 w-6" />
                <div className="flex-1">
                  <p className="font-medium">Contrat TEST-2024-001</p>
                  <p className="text-sm text-gray-600">État actuel:</p>
                </div>
                <Badge 
                  variant={
                    contractStatus === 'active' ? 'default' : 
                    contractStatus === 'pending' ? 'secondary' : 
                    contractStatus === 'rejected' ? 'destructive' : 
                    'outline'
                  }
                >
                  {contractStatus === 'draft' && 'Brouillon'}
                  {contractStatus === 'pending' && 'En attente de validation'}
                  {contractStatus === 'active' && 'Actif'}
                  {contractStatus === 'rejected' && 'Rejeté'}
                </Badge>
              </div>

              <Separator />

              {/* Actions disponibles selon le rôle */}
              <div className="space-y-3">
                <h4 className="font-medium">Actions disponibles pour {currentUser === 'admin' ? 'Administrateur' : currentUser === 'gestionnaire' ? 'Gestionnaire' : 'Valideur'}:</h4>
                
                {currentUser === 'gestionnaire' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => simulateAction('create', 'Gestionnaire', 'Contrat TEST-2024-001')}
                      disabled={contractStatus !== 'draft'}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Créer le contrat
                    </Button>
                    <Button
                      variant="outline"
                      disabled={contractStatus === 'draft' || contractStatus === 'pending'}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      disabled
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Valider (interdit)
                    </Button>
                  </div>
                )}

                {currentUser === 'valideur' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="default"
                      onClick={() => handleValidation(actions[0]?.id, 'approved')}
                      disabled={contractStatus !== 'pending'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approuver
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleValidation(actions[0]?.id, 'rejected', 'Informations manquantes')}
                      disabled={contractStatus !== 'pending'}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rejeter (avec motif)
                    </Button>
                    <Button
                      variant="outline"
                      disabled
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier (interdit)
                    </Button>
                  </div>
                )}

                {currentUser === 'admin' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Consulter
                    </Button>
                    <Button
                      variant="outline"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Configurer workflow
                    </Button>
                    <Button
                      variant="destructive"
                      disabled
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Valider (interdit - pas de validation métier)
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Historique des actions */}
              <div className="space-y-3">
                <h4 className="font-medium">Historique des actions:</h4>
                {actions.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune action effectuée</p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm">
                            <Badge variant="outline" className="mr-2">{action.actor}</Badge>
                            {action.type} - {action.target}
                          </p>
                          {action.reason && (
                            <p className="text-xs text-gray-500 mt-1">Motif: {action.reason}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            action.status === 'approved' ? 'default' :
                            action.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {action.status === 'pending' && 'En attente'}
                          {action.status === 'approved' && 'Approuvé'}
                          {action.status === 'rejected' && 'Rejeté'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton de réinitialisation */}
              <Button
                variant="outline"
                onClick={() => {
                  setActions([]);
                  setContractStatus('draft');
                  toast({
                    title: "Simulation réinitialisée",
                    description: "Vous pouvez recommencer le test",
                  });
                }}
                className="w-full"
              >
                Réinitialiser la simulation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}