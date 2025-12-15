import { PaymentTermsEnum } from "@/modules/invoices/domain/types";

export const formatPaymentTerms = (term?: PaymentTermsEnum | null): string => {
  if (!term) return "—";

  switch (term) {
    case PaymentTermsEnum.A_COMMANDE:
      return "À commande";
    case PaymentTermsEnum.A_LIVRAISON:
      return "À livraison";
    case PaymentTermsEnum["30J"]:
      return "30 j";
    case PaymentTermsEnum["60J"]:
      return "60 j";
    case PaymentTermsEnum["50_50"]:
      return "50/50";
    default:
      return (term as string).replace(/_/g, " ");
  }
};
