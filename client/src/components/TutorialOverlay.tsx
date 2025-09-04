import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronRight, ChevronLeft, PlayCircle, CheckCircle, BookOpen, Users, FileCheck, Settings, TrendingUp, Calendar, Bell, Shield, CreditCard, Folder } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  element?: string; // Élément DOM à mettre en évidence
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: any;
  actions?: {
    text: string;
    action: () => void;
  }[];
}

interface TutorialData {
  role: string;
  welcomeTitle: string;
  welcomeMessage: string;
  steps: TutorialStep[];
}

const tutorialsByRole: Record<string, TutorialData> = {
  admin: {
    role: "Administrateur",
    welcomeTitle: "Bienvenue dans KLYXOR - Mode Administrateur",
    welcomeMessage: "En tant qu'administrateur, vous avez accès à toutes les fonctionnalités de configuration et de gestion du système. Ce tutoriel interactif va vous guider pas à pas à travers vos principales responsabilités.",
    steps: [
      {
        id: "admin-1",
        title: "🎯 Tableau de bord administrateur",
        description: "Votre tableau de bord affiche les KPIs système en temps réel : utilisateurs actifs (actuellement 12), taux d'utilisation (78%), erreurs d'intégration et alertes critiques. Surveillez ces indicateurs quotidiennement pour maintenir la performance optimale.",
        element: "[href='/']",
        position: "right",
        icon: Settings,
        actions: [
          {
            text: "👀 Voir le tableau de bord",
            action: () => window.location.href = '/'
          }
        ]
      },
      {
        id: "admin-2",
        title: "👥 Gestion des utilisateurs",
        description: "Créez et gérez les comptes utilisateurs. Attribuez les rôles appropriés : admin (accès total), gestionnaire (création/modification), validateur (approbation). Chaque rôle a des permissions spécifiques pour garantir la sécurité.",
        element: "[href='/security']",
        position: "right",
        icon: Users,
        actions: [
          {
            text: "🔐 Accéder à la gestion des utilisateurs",
            action: () => window.location.href = '/security'
          }
        ]
      },
      {
        id: "admin-3",
        title: "⚙️ Configuration des workflows",
        description: "Définissez les circuits de validation automatiques. Exemple : Contrats < 100k€ = 1 validateur, > 100k€ = 2 validateurs, > 500k€ = validation direction. Les SLA sont configurables par type (24h pour urgent, 72h standard).",
        element: "[href='/workflows']",
        position: "right",
        icon: Settings,
        actions: [
          {
            text: "🔄 Configurer les workflows",
            action: () => window.location.href = '/workflows'
          }
        ]
      },
      {
        id: "admin-4",
        title: "📊 Formules d'indexation INSEE",
        description: "Gérez les formules d'indexation économiques : ICC (Indice du Coût de la Construction), ILC (Indice des Loyers Commerciaux), IRL (Indice de Référence des Loyers), BT01 (Bâtiment). Les données INSEE sont mises à jour automatiquement chaque trimestre.",
        element: "[href='/indexations']",
        position: "right",
        icon: TrendingUp,
        actions: [
          {
            text: "📈 Gérer les indexations",
            action: () => window.location.href = '/indexations'
          }
        ]
      },
      {
        id: "admin-5",
        title: "🛡️ Audit et conformité RGPD",
        description: "Consultez l'audit trail complet pour la conformité RGPD. Chaque action est tracée : qui, quoi, quand, depuis où. Les logs sont conservés 5 ans. Exportez les rapports pour les audits externes.",
        element: "[href='/security']",
        position: "right",
        icon: Shield,
        actions: [
          {
            text: "🔍 Voir l'audit trail",
            action: () => window.location.href = '/security'
          }
        ]
      },
      {
        id: "admin-6",
        title: "📥 Import/Export en masse",
        description: "Importez des centaines de contrats depuis Excel/CSV en un clic. Mappez automatiquement les colonnes. Configurez les exports récurrents vers SAP/Oracle via API REST ou SFTP.",
        element: "[href='/import-export']",
        position: "right",
        icon: FileCheck,
        actions: [
          {
            text: "📤 Gérer les imports/exports",
            action: () => window.location.href = '/import-export'
          }
        ]
      },
      {
        id: "admin-7",
        title: "🔔 Alertes et notifications",
        description: "Configurez les alertes système : tentatives de connexion échouées, modifications critiques, dépassements SLA. Les notifications peuvent être envoyées par email, Teams ou SMS selon l'urgence.",
        element: "[href='/deadlines']",
        position: "right",
        icon: Bell,
        actions: [
          {
            text: "⏰ Configurer les alertes",
            action: () => window.location.href = '/deadlines'
          }
        ]
      },
      {
        id: "admin-8",
        title: "💰 Gestion de la facturation",
        description: "Supervisez l'ensemble du cycle de facturation : plans de paiement, flux automatisés, blocages, preuves de paiement. Intégration avec Stripe pour les paiements en ligne sécurisés.",
        element: "[href='/billing-plans']",
        position: "right",
        icon: CreditCard,
        actions: [
          {
            text: "💳 Gérer la facturation",
            action: () => window.location.href = '/billing-plans'
          }
        ]
      },
      {
        id: "admin-9",
        title: "📁 Documents et GED",
        description: "Administrez la gestion électronique de documents. Définissez les types de documents obligatoires par type de contrat. Configurez la rétention automatique et l'archivage légal (10 ans pour les contrats).",
        element: "[href='/documents']",
        position: "right",
        icon: Folder,
        actions: [
          {
            text: "📂 Gérer la GED",
            action: () => window.location.href = '/documents'
          }
        ]
      },
      {
        id: "admin-10",
        title: "✅ Félicitations !",
        description: "Vous maîtrisez maintenant les fonctionnalités administrateur de KLYXOR. N'hésitez pas à relancer ce tutoriel à tout moment depuis le menu latéral. Pour toute question, contactez le support technique.",
        position: "center",
        icon: CheckCircle
      }
    ]
  },
  manager: {
    role: "Gestionnaire",
    welcomeTitle: "Bienvenue dans KLYXOR - Mode Gestionnaire",
    welcomeMessage: "En tant que gestionnaire, vous êtes responsable de la création et gestion des contrats énergétiques. Toutes vos actions sont soumises à validation selon les workflows définis.",
    steps: [
      {
        id: "manager-1",
        title: "Création de contrats",
        description: "Créez de nouveaux contrats énergétiques (électricité, gaz, PPA). Remplissez tous les champs obligatoires et attachez les documents requis.",
        element: "[data-testid='button-create-contract']",
        position: "bottom",
        icon: FileCheck
      },
      {
        id: "manager-2",
        title: "File de validation",
        description: "Suivez vos demandes en attente de validation. Le statut et l'âge de chaque demande sont visibles ici.",
        element: "[data-testid='validation-queue']",
        position: "top",
        icon: CheckCircle
      },
      {
        id: "manager-3",
        title: "Gestion des avenants",
        description: "Créez des avenants pour modifier les contrats actifs. Types disponibles : révision tarifaire, changement de périmètre, extension de durée.",
        element: "[href='/amendments']",
        position: "right",
        icon: FileCheck
      },
      {
        id: "manager-4",
        title: "Indexations automatiques",
        description: "Les indexations sont calculées automatiquement selon les formules paramétrées. Vérifiez et soumettez à validation.",
        element: "[href='/indexations']",
        position: "right",
        icon: TrendingUp
      },
      {
        id: "manager-5",
        title: "Échéances et alertes",
        description: "Consultez les échéances à 30 jours : fins de contrat, anniversaires, fins d'avenant. Configurez vos alertes personnalisées.",
        element: "[href='/deadlines']",
        position: "right",
        icon: Calendar
      },
      {
        id: "manager-6",
        title: "Documents et GED",
        description: "Uploadez et organisez les documents contractuels. Formats acceptés : PDF, DOCX, XLSX. Taille max : 10 MB par fichier.",
        element: "[href='/documents']",
        position: "right",
        icon: BookOpen
      }
    ]
  },
  validator: {
    role: "Validateur",
    welcomeTitle: "Bienvenue dans KLYXOR - Mode Validateur",
    welcomeMessage: "En tant que validateur, vous êtes responsable de l'approbation ou du rejet des modifications contractuelles. Vos décisions sont définitives et tracées.",
    steps: [
      {
        id: "validator-1",
        title: "File de validation",
        description: "Votre file d'attente affiche toutes les demandes à valider : contrats, avenants, indexations, résiliations. Les SLA sont indiqués pour chaque élément.",
        element: "[data-testid='validation-queue']",
        position: "top",
        icon: CheckCircle
      },
      {
        id: "validator-2",
        title: "Actions de validation",
        description: "Pour chaque demande : Validez (✓) ou Rejetez (✗). Le rejet nécessite obligatoirement un motif détaillé pour traçabilité.",
        element: "[data-testid='validation-actions']",
        position: "bottom",
        icon: FileCheck
      },
      {
        id: "validator-3",
        title: "Détails et historique",
        description: "Consultez les détails complets de chaque demande : champs modifiés, valeurs avant/après, documents joints, historique des actions.",
        element: "[data-testid='button-view-details']",
        position: "left",
        icon: BookOpen
      },
      {
        id: "validator-4",
        title: "Transfert de demandes",
        description: "Transférez une demande à un autre validateur si nécessaire. Ajoutez une note explicative pour le contexte.",
        element: "[data-testid='button-transfer']",
        position: "left",
        icon: Users
      },
      {
        id: "validator-5",
        title: "Alertes SLA",
        description: "Les demandes proches du dépassement SLA sont signalées en orange/rouge. Priorisez ces validations pour respecter les délais.",
        element: "[data-testid='sla-alerts']",
        position: "top",
        icon: Bell
      },
      {
        id: "validator-6",
        title: "Tableau de bord KPI",
        description: "Suivez vos statistiques : nombre de validations, temps moyen de traitement, taux de rejet. Ces KPIs sont visibles dans votre dashboard.",
        element: "[href='/dashboard']",
        position: "right",
        icon: TrendingUp
      }
    ]
  }
};

export default function TutorialOverlay() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [isWelcomeScreen, setIsWelcomeScreen] = useState(true);
  const [forceShow, setForceShow] = useState(false);

  // Déterminer le rôle de l'utilisateur
  const userRole = user?.role || 'manager';
  const tutorial = tutorialsByRole[userRole] || tutorialsByRole.manager;

  useEffect(() => {
    // Fonction globale pour relancer le tutoriel
    (window as any).restartTutorial = () => {
      if (user) {
        const tutorialKey = `klyxor_tutorial_${user.id}_${userRole}`;
        localStorage.removeItem(tutorialKey);
        setIsWelcomeScreen(true);
        setCurrentStep(0);
        setIsVisible(true);
        setForceShow(true);
      }
    };

    if (user) {
      // Vérifier si l'utilisateur a déjà vu le tutoriel
      const tutorialKey = `klyxor_tutorial_${user.id}_${userRole}`;
      const seen = localStorage.getItem(tutorialKey);
      
      if (!seen || forceShow) {
        // Attendre un peu après la connexion avant d'afficher le tutoriel
        setTimeout(() => {
          setIsVisible(true);
        }, 1000);
      }
      setHasSeenTutorial(!!seen);
    }
  }, [user, userRole, forceShow]);

  const handleStart = () => {
    setIsWelcomeScreen(false);
    setCurrentStep(0);
    highlightElement(tutorial.steps[0].element);
  };

  const handleNext = () => {
    if (currentStep < tutorial.steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      removeHighlight();
      highlightElement(tutorial.steps[nextStep].element);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      removeHighlight();
      highlightElement(tutorial.steps[prevStep].element);
    }
  };

  const handleClose = () => {
    removeHighlight();
    setIsVisible(false);
    if (user) {
      const tutorialKey = `klyxor_tutorial_${user.id}_${userRole}`;
      localStorage.setItem(tutorialKey, 'true');
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const highlightElement = (selector?: string) => {
    if (!selector) return;
    
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('tutorial-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const removeHighlight = () => {
    const highlighted = document.querySelector('.tutorial-highlight');
    if (highlighted) {
      highlighted.classList.remove('tutorial-highlight');
    }
  };

  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        .tutorial-highlight {
          position: relative;
          z-index: 9998;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          border-radius: 8px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
          }
          100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
        }

        .tutorial-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div className="tutorial-overlay">
        {isWelcomeScreen ? (
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <PlayCircle className="w-8 h-8 text-blue-500" />
                  <div>
                    <CardTitle className="text-2xl">{tutorial.welcomeTitle}</CardTitle>
                    <CardDescription className="text-base mt-2">
                      Rôle : <span className="font-semibold">{tutorial.role}</span>
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-600">{tutorial.welcomeMessage}</p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Ce que vous allez apprendre :</h3>
                <ul className="space-y-1">
                  {tutorial.steps.slice(0, 3).map(step => (
                    <li key={step.id} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{step.title}</span>
                    </li>
                  ))}
                  <li className="text-sm text-gray-500">... et {tutorial.steps.length - 3} autres fonctionnalités</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleSkip}>
                  Passer le tutoriel
                </Button>
                <Button onClick={handleStart} className="gap-2">
                  Commencer le tutoriel
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">
                  Étape {currentStep + 1} sur {tutorial.steps.length}
                </span>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <Progress value={progress} className="h-2 mb-4" />
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComponent = tutorial.steps[currentStep].icon;
                  return IconComponent ? <IconComponent className="w-6 h-6 text-blue-500" /> : null;
                })()}
                <CardTitle>{tutorial.steps[currentStep].title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">{tutorial.steps[currentStep].description}</p>
              
              {tutorial.steps[currentStep].actions && (
                <div className="space-y-2">
                  {tutorial.steps[currentStep].actions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full"
                      onClick={action.action}
                    >
                      {action.text}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>
                
                {currentStep === tutorial.steps.length - 1 ? (
                  <Button onClick={handleClose} className="gap-2">
                    Terminer
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="gap-2">
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="text-center">
                <Button variant="link" onClick={handleSkip} className="text-sm">
                  Passer le tutoriel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}