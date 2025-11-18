export class InvoiceNumberGenerator {

  static generateInvoiceNumber(data: {
    tableLength: number;
    type: string;
    createdAt?: Date;
  }): string {
    const { tableLength, type, createdAt } = data;

    const date = createdAt || new Date();
    const year = date.getFullYear();

    const seqNumber = String(tableLength + 1).padStart(4, "0");

    return `${type}-${year}-${seqNumber}`;
  }

  static validateInvoiceNumber(num: string): boolean {
    const pattern = /^[A-Z]+-\d{4}-\d{4}$/;
    return pattern.test(num);
  }
}
