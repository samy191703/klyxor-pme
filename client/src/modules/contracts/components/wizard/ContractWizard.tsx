// components/wizard/ContractWizard.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import Step1General from "./steps/Step1General";
import Step2PeriodAmounts from "./steps/Step2PeriodAmounts";
import Step3Indexation from "./steps/Step3Indexation";
import Step4Attachment from "./steps/Step4Attachment";
import Step5Recap from "./steps/Step5Recap";
import { buildCalculateFromAssetsPayload } from "@/utils/indexation";
import { postIndexationPreview } from "@/services/indexation.api";

type Props = {
  indexationFormulas: any[];
  onCancel: () => void;
  onSubmit: (payload: any) => void;
};

export default function ContractWizard({
  indexationFormulas,
  onCancel,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({});
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcResult, setCalcResult] = useState<any>(null);

  const steps = [
    "Informations générales",
    "Période & montants",
    "Indexation",
    "Pièce jointe",
    "Récapitulatif",
  ];

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
      return;
    }
    // Build payload for submission ici; ajouter des validations si nécessaire
    const payload = {
      title: data.title,
      type: data.type,
      businessUnit: data.businessUnit,
      clientName: data.clientName,
      amount:
        (Number(data.fixedAmount || 0) || 0) +
        (Number(data.variableAmount || 0) || 0),
      startDate: data.startDate,
      endDate: data.endDate || undefined,
      billingPeriodicity: data.billingFrequency, // alias UI
      paymentType: data.paymentType || undefined,
      technology: data.technology,
      maintenanceProvider: data.maintainer,
      // si tu veux envoyer l’ID de formule choisi, ajoute:
      indexationFormula: data.indexationFormula || undefined,
    };
    onSubmit(payload);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  // ⚙️ Version API: remplace entièrement ton handleCalculate actuel
  const handleCalculate = async () => {
    console.log("Calcul d’indexation demandé…");
    console.log(data);
    if (!data.indexationFormula || data.indexationFormula === "none") return;

    try {
      setCalcLoading(true);
      setCalcError(null);

      // 1) Construire le DTO (valide et prêt pour l’API)
      const dto = buildCalculateFromAssetsPayload(
        { ...data },
        indexationFormulas
      );

      // 2) Appel HTTP réel (service centralisé)
      const apiResult = await postIndexationPreview(dto);

      // 3) Stocker la réponse pour l’aperçu (Step5)
      setCalcResult(apiResult);
    } catch (e: any) {
      setCalcError(e?.message || "Erreur lors du calcul d’indexation");
      setCalcResult(null);
    } finally {
      setCalcLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Nouveau contrat</h1>
        <Progress value={(step / 5) * 100} className="mt-2" />
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          {steps.map((s, i) => (
            <span key={i} className={step >= i + 1 ? "font-medium" : ""}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 1 && <Step1General data={data} setData={setData} />}

          {step === 2 && <Step2PeriodAmounts data={data} setData={setData} />}

          {step === 3 && (
            <Step3Indexation
              data={data}
              setData={setData}
              indexationFormulas={indexationFormulas}
              onCalculate={handleCalculate}
              calcLoading={calcLoading}
              calcResult={calcResult}
              calcError={calcError}
            />
          )}

          {step === 4 && (
            <Step4Attachment
              data={data}
              setData={setData} // ✅ props ajoutées (étape optionnelle)
            />
          )}

          {step === 5 && (
            <Step5Recap
              data={data}
              calcLoading={calcLoading}
              calcError={calcError}
              calcResult={calcResult}
            />
          )}

          <div className="flex justify-between mt-6">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4 mr-2" /> Précédent
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Enregistrer le brouillon
              </Button>
              {step < 5 ? (
                <Button onClick={handleNext}>
                  Suivant <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  <Send className="w-4 h-4 mr-2" />
                  Soumettre
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
