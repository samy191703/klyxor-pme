// client/src/pages/NewClientPage.tsx

import React, { useState } from "react";
import { useLocation } from "wouter";

import { cn } from "@/lib/utils";
import {
  KlyxorPageLayout,
  type KlyxorThemeTokens,
} from "@/components/layout/KlyxorPageLayout";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Globe2,
  Save,
  RefreshCw,
} from "lucide-react";

type ClientType = "PRO" | "PARTICULIER";

type NewClientForm = {
  type_client: ClientType;
  raison_sociale: string;
  siret: string;
  prenom?: string;
  nom?: string;
  email: string;
  telephone: string;
  adresse_ligne1: string;
  code_postal: string;
  ville: string;
  pays: string;
};

type FormErrors = Partial<Record<keyof NewClientForm, string>>;

const defaultForm: NewClientForm = {
  type_client: "PRO",
  raison_sociale: "",
  siret: "",
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  adresse_ligne1: "",
  code_postal: "",
  ville: "",
  pays: "",
};

const NewClientPage: React.FC = () => {
  const [, navigate] = useLocation();

  const [form, setForm] = useState<NewClientForm>(defaultForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[name as keyof NewClientForm];
      return copy;
    });
  };

  const handleTypeChange = (value: ClientType) => {
    setForm((prev) => ({
      ...prev,
      type_client: value,
    }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.raison_sociale;
      delete copy.nom;
      delete copy.prenom;
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (form.type_client === "PRO") {
      if (!form.raison_sociale.trim()) {
        newErrors.raison_socialle = "La raison sociale est obligatoire.";
        newErrors.raison_sociale = "La raison sociale est obligatoire.";
      }
    } else {
      if (!form.prenom?.trim()) {
        newErrors.prenom = "Le prénom est obligatoire.";
      }
      if (!form.nom?.trim()) {
        newErrors.nom = "Le nom est obligatoire.";
      }
    }

    if (!form.email.trim()) {
      newErrors.email = "L'email est obligatoire.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Format d'email invalide.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Erreur lors de la création du client.");
        return;
      }

      setSuccess(true);
      setForm(defaultForm);
      setErrors({});
      // Pour rediriger immédiatement après création :
      // navigate("/clients");
    } catch (err) {
      setError("Erreur inattendue lors de la création du client.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(defaultForm);
    setErrors({});
    setError(null);
    setSuccess(false);
  };

  // ---------------------------------------------------------------------------
  // Header actions (en haut à droite)
  // ---------------------------------------------------------------------------

  const renderHeaderActions = (_theme: KlyxorThemeTokens) => {
    return (
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-full border-slate-300 bg-white px-4 text-xs text-slate-700 hover:bg-slate-100"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KlyxorPageLayout
      title="Nouveau client"
      subtitle="Enregistrez un nouveau client (professionnel ou particulier) pour le rattacher à vos contrats."
      actions={renderHeaderActions}
    >
      {(theme) => {
        const {
          sectionCardClass,
          primaryText,
          secondaryText,
          mutedText,
          isDark,
        } = theme;

        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informations générales */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Informations générales
                </CardTitle>
                <p className={cn("mt-1 text-xs", secondaryText)}>
                  Choisissez le type de client et renseignez les informations
                  principales.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4 px-4 pb-4 md:grid-cols-[220px,1fr]">
                {/* Colonne gauche : type */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Type de client</Label>
                  <Select
                    value={form.type_client}
                    onValueChange={(v) => handleTypeChange(v as ClientType)}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 text-xs",
                        isDark
                          ? "border-slate-700 bg-slate-950 text-slate-50"
                          : "border-slate-200 bg-white text-slate-900",
                      )}
                    >
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRO">
                        Professionnel (société, organisation)
                      </SelectItem>
                      <SelectItem value="PARTICULIER">
                        Particulier (personne physique)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] leading-tight text-slate-500">
                    Le formulaire s&apos;adapte automatiquement selon le type
                    sélectionné.
                  </p>
                </div>

                {/* Colonne droite : identité */}
                <div className="grid gap-3 md:grid-cols-2">
                  {form.type_client === "PRO" ? (
                    <>
                      <div className="md:col-span-2">
                        <Label className="text-xs font-medium">
                          Raison sociale
                        </Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <Input
                            name="raison_sociale"
                            value={form.raison_sociale}
                            onChange={handleChange}
                            className={cn(
                              "h-9 text-sm",
                              errors.raison_sociale &&
                                "border-red-500 focus-visible:ring-red-500",
                            )}
                            placeholder="Ex : ENGIE Solutions France"
                          />
                        </div>
                        {errors.raison_sociale && (
                          <p className="mt-1 text-[11px] text-red-600">
                            {errors.raison_sociale}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-medium">SIRET</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-slate-400" />
                          <Input
                            name="siret"
                            value={form.siret}
                            onChange={handleChange}
                            className="h-9 text-sm"
                            placeholder="Ex : 123 456 789 00012"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs font-medium">Prénom</Label>
                        <div className="mt-1 flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <Input
                            name="prenom"
                            value={form.prenom}
                            onChange={handleChange}
                            className={cn(
                              "h-9 text-sm",
                              errors.prenom &&
                                "border-red-500 focus-visible:ring-red-500",
                            )}
                            placeholder="Prénom"
                          />
                        </div>
                        {errors.prenom && (
                          <p className="mt-1 text-[11px] text-red-600">
                            {errors.prenom}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Nom</Label>
                        <Input
                          name="nom"
                          value={form.nom}
                          onChange={handleChange}
                          className={cn(
                            "mt-1 h-9 text-sm",
                            errors.nom &&
                              "border-red-500 focus-visible:ring-red-500",
                          )}
                          placeholder="Nom"
                        />
                        {errors.nom && (
                          <p className="mt-1 text-[11px] text-red-600">
                            {errors.nom}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coordonnées */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Coordonnées
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-medium">Email</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className={cn(
                        "h-9 text-sm",
                        errors.email &&
                          "border-red-500 focus-visible:ring-red-500",
                      )}
                      placeholder="client@exemple.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs font-medium">Téléphone</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <Input
                      name="telephone"
                      value={form.telephone}
                      onChange={handleChange}
                      className="h-9 text-sm"
                      placeholder="+33 1 23 45 67 89"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adresse */}
            <Card className={sectionCardClass}>
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className={cn("text-sm font-semibold", primaryText)}>
                  Adresse de facturation / correspondance
                </CardTitle>
                <p className={cn("mt-1 text-xs", secondaryText)}>
                  Ces informations seront réutilisées pour la facturation et les
                  documents contractuels.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label className="text-xs font-medium">
                    Adresse (ligne 1)
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <Input
                      name="adresse_ligne1"
                      value={form.adresse_ligne1}
                      onChange={handleChange}
                      className="h-9 text-sm"
                      placeholder="N°, voie, bâtiment…"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Code postal</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-slate-400" />
                    <Input
                      name="code_postal"
                      value={form.code_postal}
                      onChange={handleChange}
                      className="h-9 text-sm"
                      placeholder="75000"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Ville</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <Input
                      name="ville"
                      value={form.ville}
                      onChange={handleChange}
                      className="h-9 text-sm"
                      placeholder="Paris"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium">Pays</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-slate-400" />
                    <Input
                      name="pays"
                      value={form.pays}
                      onChange={handleChange}
                      className="h-9 text-sm"
                      placeholder="France"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages d'état */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <AlertDescription className="text-xs text-emerald-800">
                  Client créé avec succès.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions bas de page */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={cn("text-[11px]", mutedText)}>
                Les champs obligatoires doivent être renseignés avant
                enregistrement.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-2 text-xs",
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-50 hover:bg-slate-900"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100",
                  )}
                  onClick={resetForm}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  Réinitialiser
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-2 bg-[var(--klyxor-bleu-nuit,#111827)] text-xs text-white hover:bg-slate-900"
                  disabled={loading}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Création en cours..." : "Créer le client"}
                </Button>
              </div>
            </div>
          </form>
        );
      }}
    </KlyxorPageLayout>
  );
};

export default NewClientPage;
