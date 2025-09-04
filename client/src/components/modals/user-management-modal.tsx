import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Shield, AlertCircle } from "lucide-react";

interface Module {
  name: string;
  permissions: {
    read: boolean;
    write: boolean;
    validate: boolean;
    delete: boolean;
  };
}

interface UserData {
  id?: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'gestionnaire' | 'valideur' | '';
  modules: Module[];
  status: 'active' | 'inactive';
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserData) => void;
  userData?: UserData | null;
  mode: 'create' | 'edit';
}

// Définition des droits par défaut selon le rôle
const DEFAULT_PERMISSIONS = {
  admin: {
    modules: [
      'Paramètres système',
      'Gestion des utilisateurs',
      'Workflows',
      'Formules d\'indexation',
      'Import/Export',
      'Audit',
      'Intégrations',
      'Alertes système'
    ],
    permissions: {
      'Paramètres système': { read: true, write: true, validate: false, delete: true },
      'Gestion des utilisateurs': { read: true, write: true, validate: false, delete: true },
      'Workflows': { read: true, write: true, validate: false, delete: true },
      'Formules d\'indexation': { read: true, write: true, validate: false, delete: true },
      'Import/Export': { read: true, write: true, validate: false, delete: true },
      'Audit': { read: true, write: false, validate: false, delete: false },
      'Intégrations': { read: true, write: true, validate: false, delete: true },
      'Alertes système': { read: true, write: true, validate: false, delete: true },
      'Contrats': { read: true, write: false, validate: false, delete: false },
      'Indexations': { read: true, write: false, validate: false, delete: false },
      'Avenants': { read: true, write: false, validate: false, delete: false },
      'Résiliations': { read: true, write: false, validate: false, delete: false },
      'Documents': { read: true, write: false, validate: false, delete: true },
      'Échéances': { read: true, write: false, validate: false, delete: false }
    },
    restrictions: [
      "Ne peut pas valider les opérations métier",
      "Accès complet aux paramètres système",
      "Seul habilité à supprimer des documents"
    ]
  },
  gestionnaire: {
    modules: [
      'Contrats',
      'Indexations',
      'Avenants',
      'Résiliations',
      'Documents',
      'Échéances',
      'Alertes',
      'Export données'
    ],
    permissions: {
      'Contrats': { read: true, write: true, validate: false, delete: false },
      'Indexations': { read: true, write: true, validate: false, delete: false },
      'Avenants': { read: true, write: true, validate: false, delete: false },
      'Résiliations': { read: true, write: true, validate: false, delete: false },
      'Documents': { read: true, write: true, validate: false, delete: false },
      'Échéances': { read: true, write: false, validate: false, delete: false },
      'Alertes': { read: true, write: false, validate: false, delete: false },
      'Export données': { read: true, write: false, validate: false, delete: false },
      'Paramètres système': { read: false, write: false, validate: false, delete: false },
      'Gestion des utilisateurs': { read: false, write: false, validate: false, delete: false },
      'Workflows': { read: false, write: false, validate: false, delete: false },
      'Audit': { read: true, write: false, validate: false, delete: false }
    },
    restrictions: [
      "Ne peut pas valider ses propres créations",
      "Toutes les actions sont soumises à validation",
      "Ne peut pas supprimer de documents",
      "Ne peut pas modifier un contrat clôturé"
    ]
  },
  valideur: {
    modules: [
      'Contrats',
      'Indexations',
      'Avenants',
      'Résiliations',
      'Échéances',
      'Alertes',
      'Historique validations'
    ],
    permissions: {
      'Contrats': { read: true, write: false, validate: true, delete: false },
      'Indexations': { read: true, write: false, validate: true, delete: false },
      'Avenants': { read: true, write: false, validate: true, delete: false },
      'Résiliations': { read: true, write: false, validate: true, delete: false },
      'Échéances': { read: true, write: false, validate: false, delete: false },
      'Alertes': { read: true, write: false, validate: false, delete: false },
      'Historique validations': { read: true, write: false, validate: false, delete: false },
      'Documents': { read: true, write: false, validate: false, delete: false },
      'Paramètres système': { read: false, write: false, validate: false, delete: false },
      'Gestion des utilisateurs': { read: false, write: false, validate: false, delete: false },
      'Audit': { read: true, write: false, validate: false, delete: false }
    },
    restrictions: [
      "Ne peut pas valider ses propres créations",
      "Doit fournir un motif pour chaque refus",
      "Ne peut pas modifier directement les données",
      "Décisions uniquement (accepter/rejeter)"
    ]
  }
};

const ALL_MODULES = [
  'Contrats',
  'Indexations',
  'Avenants',
  'Résiliations',
  'Documents',
  'Échéances',
  'Alertes',
  'Paramètres système',
  'Gestion des utilisateurs',
  'Workflows',
  'Formules d\'indexation',
  'Import/Export',
  'Export données',
  'Audit',
  'Intégrations',
  'Alertes système',
  'Historique validations'
];

export function UserManagementModal({ 
  isOpen, 
  onClose, 
  onSave, 
  userData, 
  mode 
}: UserManagementModalProps) {
  const [formData, setFormData] = useState<UserData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    role: '',
    modules: [],
    status: 'active'
  });

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userData) {
      setFormData(userData);
      setShowAdvancedSettings(false);
    } else {
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        modules: [],
        status: 'active'
      });
    }
  }, [userData, isOpen]);

  const handleRoleChange = (role: 'admin' | 'gestionnaire' | 'valideur') => {
    setFormData(prev => ({ ...prev, role }));
    
    // Appliquer automatiquement les permissions par défaut
    const roleDefaults = DEFAULT_PERMISSIONS[role];
    const modules: Module[] = ALL_MODULES.map(moduleName => ({
      name: moduleName,
      permissions: (roleDefaults.permissions as any)[moduleName] || {
        read: false,
        write: false,
        validate: false,
        delete: false
      }
    }));
    
    setFormData(prev => ({ ...prev, modules }));
    setShowAdvancedSettings(false);
  };

  const handlePermissionChange = (
    moduleName: string, 
    permission: keyof Module['permissions'], 
    value: boolean
  ) => {
    setFormData(prev => {
      const updatedModules = prev.modules.map(module => {
        if (module.name === moduleName) {
          return {
            ...module,
            permissions: { ...module.permissions, [permission]: value }
          };
        }
        return module;
      });
      return { ...prev, modules: updatedModules };
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.length < 3) {
      newErrors.username = "Le nom d'utilisateur doit contenir au moins 3 caractères";
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      newErrors.username = "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets et underscores";
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!formData.role) {
      newErrors.role = "Le rôle est requis";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return "Configure et pilote la plateforme, paramètre les workflows et gère les droits";
      case 'gestionnaire':
        return "Saisit et prépare les données contractuelles, toutes les actions sont soumises à validation";
      case 'valideur':
        return "Prend les décisions d'approbation ou rejet sur les éléments soumis par les gestionnaires";
      default:
        return "";
    }
  };

  const getActiveModulesCount = () => {
    return formData.modules.filter(m => 
      m.permissions.read || m.permissions.write || m.permissions.validate || m.permissions.delete
    ).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto sm:w-[95vw] lg:w-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Créer un nouvel utilisateur' : 'Modifier l\'utilisateur'}
          </DialogTitle>
          <DialogDescription>
            Définissez le rôle principal pour attribuer automatiquement les droits par défaut
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Informations personnelles
            </h3>
            <div className="space-y-2">
              <Label htmlFor="username">
                Nom d'utilisateur <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="Ex: marie.dupont ou mdupont"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className={errors.username ? "border-destructive" : ""}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
              <p className="text-xs text-muted-foreground">Ce nom sera utilisé pour la connexion</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Prénom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Sélection du rôle principal */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              Rôle principal <span className="text-destructive">*</span>
            </h3>
            <RadioGroup value={formData.role} onValueChange={(value) => handleRoleChange(value as any)}>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="admin" id="role-admin" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="role-admin" className="font-medium cursor-pointer">
                      Administrateur
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {getRoleDescription('admin')}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">Paramétrage système</Badge>
                      <Badge variant="secondary" className="text-xs">Gestion des droits</Badge>
                      <Badge variant="secondary" className="text-xs">Workflows</Badge>
                      <Badge variant="destructive" className="text-xs">Pas de validation métier</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="gestionnaire" id="role-gestionnaire" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="role-gestionnaire" className="font-medium cursor-pointer">
                      Gestionnaire (Opérateur)
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {getRoleDescription('gestionnaire')}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">Création contrats</Badge>
                      <Badge variant="secondary" className="text-xs">Avenants</Badge>
                      <Badge variant="secondary" className="text-xs">Résiliations</Badge>
                      <Badge variant="outline" className="text-xs">Soumis à validation</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="valideur" id="role-valideur" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="role-valideur" className="font-medium cursor-pointer">
                      Valideur (Décideur)
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      {getRoleDescription('valideur')}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">Validation contrats</Badge>
                      <Badge variant="secondary" className="text-xs">Décisions</Badge>
                      <Badge variant="outline" className="text-xs">Pas de modification directe</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </RadioGroup>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role}</p>
            )}
          </div>

          {/* Restrictions et règles */}
          {formData.role && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Restrictions appliquées</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      {DEFAULT_PERMISSIONS[formData.role as keyof typeof DEFAULT_PERMISSIONS]?.restrictions.map((restriction, index) => (
                        <li key={index} className="text-sm">{restriction}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}

          {/* Permissions détaillées (mode avancé) */}
          {formData.role && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">
                    Permissions par module ({getActiveModulesCount()} modules actifs)
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  >
                    {showAdvancedSettings ? 'Masquer' : 'Personnaliser'}
                  </Button>
                </div>

                {showAdvancedSettings && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                    <div className="hidden sm:grid grid-cols-5 gap-2 mb-2 font-medium text-sm sticky top-0 bg-white pb-2 border-b">
                      <div>Module</div>
                      <div className="text-center">Lecture</div>
                      <div className="text-center">Écriture</div>
                      <div className="text-center">Validation</div>
                      <div className="text-center">Suppression</div>
                    </div>
                    <div className="sm:hidden text-xs text-gray-600 mb-2">
                      Balayez horizontalement pour voir toutes les permissions →
                    </div>
                    {formData.modules
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((module) => (
                        <div key={module.name} className="grid grid-cols-5 gap-2 items-center py-2 hover:bg-gray-50 min-w-[400px] sm:min-w-0">
                          <div className="text-sm font-medium">{module.name}</div>
                          <div className="text-center">
                            <Checkbox
                              checked={module.permissions.read}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.name, 'read', checked as boolean)
                              }
                            />
                          </div>
                          <div className="text-center">
                            <Checkbox
                              checked={module.permissions.write}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.name, 'write', checked as boolean)
                              }
                              disabled={formData.role === 'valideur'}
                            />
                          </div>
                          <div className="text-center">
                            <Checkbox
                              checked={module.permissions.validate}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.name, 'validate', checked as boolean)
                              }
                              disabled={formData.role !== 'valideur'}
                            />
                          </div>
                          <div className="text-center">
                            <Checkbox
                              checked={module.permissions.delete}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(module.name, 'delete', checked as boolean)
                              }
                              disabled={formData.role !== 'admin'}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {!showAdvancedSettings && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Les permissions par défaut ont été appliquées selon le rôle sélectionné.
                      Cliquez sur "Personnaliser" pour ajuster les droits manuellement.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}

          {/* Statut du compte */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold">Statut du compte</h3>
            <RadioGroup value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="status-active" />
                <Label htmlFor="status-active">Actif</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="status-inactive" />
                <Label htmlFor="status-inactive">Inactif</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'create' ? 'Créer l\'utilisateur' : 'Enregistrer les modifications'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}