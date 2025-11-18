export class InvoiceNumberGenerator {

  /**
   * Génère un numéro de facture unique au format TYPE-YYYY-XXXX
   * @param data.tableLength Nombre de factures existantes
   * @param data.type Type de facture, ex: "INV", "AV"
   * @param data.createdAt Date de création
   * @param data.checkExists Fonction asynchrone pour vérifier si le numéro existe déjà
   */
  static async generateInvoiceNumber(data: {
    tableLength: number;
    type: string;
    createdAt?: Date;
    checkExists: (num: string) => Promise<boolean>;
  }): Promise<string> {
    const { tableLength, type, createdAt, checkExists } = data;

    const date = createdAt || new Date();
    const year = date.getFullYear();

    let seqNumberBase = tableLength + 1;
    let seqNumber: string;
    let invoiceNumber: string;
    let attempts = 0;

    do {
      seqNumber = String(seqNumberBase).padStart(4, "0");
      invoiceNumber = `${type}-${year}-${seqNumber}`;
      seqNumberBase++;
      attempts++;

      if (attempts > 1000) {
        throw new Error("Impossible de générer un numéro de facture unique après 1000 tentatives");
      }
    } while (await checkExists(invoiceNumber));

    return invoiceNumber;
  }

  static validateInvoiceNumber(num: string): boolean {
    const pattern = /^[A-Z]+-\d{4}-\d{4}$/;
    return pattern.test(num);
  }
}
