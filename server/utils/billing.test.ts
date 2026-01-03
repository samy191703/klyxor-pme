/**
 * Tests pour les fonctions de calcul des échéances
 * 
 * Pour exécuter: npx vitest server/utils/billing.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  buildPeriods,
  calculateAmountsByPeriodDays,
  splitAmountInCents,
} from './billing';
import { BillingFrequency } from '@shared/enums/billing.enum';

describe('Billing Utils', () => {
  describe('buildPeriods', () => {
    it('should generate 12 monthly periods for a full year', () => {
      // Arrange
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      const frequency: BillingFrequency = 'MONTHLY';

      // Act
      const periods = buildPeriods(start, end, frequency, null);

      // Assert
      expect(periods).toHaveLength(12);
      expect(periods[0].pStart).toEqual(new Date('2025-01-01'));
      expect(periods[11].pEnd).toEqual(new Date('2025-12-31'));
    });

    it('should stop at indexation date', () => {
      // Arrange
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      const indexationDate = new Date('2025-06-01');
      const frequency: BillingFrequency = 'MONTHLY';

      // Act
      const periods = buildPeriods(start, end, frequency, indexationDate);

      // Assert
      expect(periods.length).toBeLessThan(12);
      expect(periods[periods.length - 1].pEnd.getTime()).toBeLessThanOrEqual(
        indexationDate.getTime()
      );
    });

    it('should handle quarterly frequency correctly', () => {
      // Arrange
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      const frequency: BillingFrequency = 'QUARTERLY';

      // Act
      const periods = buildPeriods(start, end, frequency, null);

      // Assert
      expect(periods.length).toBeGreaterThanOrEqual(4);
      expect(periods[0].pStart).toEqual(new Date('2025-01-01'));
    });

    it('should handle start date in middle of month', () => {
      // Arrange
      const start = new Date('2025-04-15');
      const end = new Date('2025-12-31');
      const frequency: BillingFrequency = 'MONTHLY';

      // Act
      const periods = buildPeriods(start, end, frequency, null);

      // Assert
      expect(periods.length).toBeGreaterThan(0);
      // First period should start on the start date
      expect(periods[0].pStart).toEqual(new Date('2025-04-15'));
      // First period should end at end of month
      expect(periods[0].pEnd.getMonth()).toBe(3); // April (0-indexed)
    });
  });

  describe('calculateAmountsByPeriodDays', () => {
    it('should distribute total amount proportionally by days', () => {
      // Arrange
      const totalAmount = 1000;
      const periods = [
        { pStart: new Date('2025-01-01'), pEnd: new Date('2025-01-31') }, // 31 days
        { pStart: new Date('2025-02-01'), pEnd: new Date('2025-02-28') }, // 28 days
      ];

      // Act
      const amounts = calculateAmountsByPeriodDays(totalAmount, periods);

      // Assert
      expect(amounts).toHaveLength(2);
      // January should be more than February (31 > 28 days)
      expect(amounts[0]).toBeGreaterThan(amounts[1]);
      // Total should equal original amount
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      expect(total).toBeCloseTo(totalAmount, 2);
    });

    it('should handle single period correctly', () => {
      // Arrange
      const totalAmount = 1000;
      const periods = [
        { pStart: new Date('2025-01-01'), pEnd: new Date('2025-01-31') },
      ];

      // Act
      const amounts = calculateAmountsByPeriodDays(totalAmount, periods);

      // Assert
      expect(amounts).toHaveLength(1);
      expect(amounts[0]).toBeCloseTo(totalAmount, 2);
    });

    it('should handle equal periods correctly', () => {
      // Arrange
      const totalAmount = 1000;
      const periods = [
        { pStart: new Date('2025-01-01'), pEnd: new Date('2025-01-31') }, // 31 days
        { pStart: new Date('2025-03-01'), pEnd: new Date('2025-03-31') }, // 31 days
      ];

      // Act
      const amounts = calculateAmountsByPeriodDays(totalAmount, periods);

      // Assert
      expect(amounts[0]).toBeCloseTo(amounts[1], 2);
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      expect(total).toBeCloseTo(totalAmount, 2);
    });
  });

  describe('splitAmountInCents', () => {
    it('should split amount into equal installments', () => {
      // Arrange
      const totalAmount = 100.50;
      const installments = 3;

      // Act
      const amounts = splitAmountInCents(totalAmount, installments);

      // Assert
      expect(amounts).toHaveLength(3);
      expect(amounts[0]).toBe(3350); // 33.50 € in cents
      expect(amounts[1]).toBe(3350);
      expect(amounts[2]).toBe(3350);

      const total = amounts.reduce((sum, cents) => sum + cents, 0);
      expect(total).toBe(10050); // 100.50 € in cents
    });

    it('should handle single installment', () => {
      // Arrange
      const totalAmount = 50.25;
      const installments = 1;

      // Act
      const amounts = splitAmountInCents(totalAmount, installments);

      // Assert
      expect(amounts).toHaveLength(1);
      expect(amounts[0]).toBe(5025); // 50.25 € in cents
    });

    it('should handle amounts that do not divide evenly', () => {
      // Arrange
      const totalAmount = 100.01;
      const installments = 3;

      // Act
      const amounts = splitAmountInCents(totalAmount, installments);

      // Assert
      expect(amounts).toHaveLength(3);
      const total = amounts.reduce((sum, cents) => sum + cents, 0);
      // Note: splitAmountInCents rounds down, so total might be slightly less
      // The difference will be adjusted in US5.2 (last line gets the remainder)
      expect(total).toBeGreaterThanOrEqual(9999);
      expect(total).toBeLessThanOrEqual(10001);
    });
  });

  describe('Integration: Full billing schedule generation', () => {
    it('should generate complete billing schedule with correct totals', () => {
      // Arrange
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      const totalAmount = 1000;
      const frequency: BillingFrequency = 'MONTHLY';

      // Act
      const periods = buildPeriods(start, end, frequency, null);
      const amounts = calculateAmountsByPeriodDays(totalAmount, periods);

      // Assert
      expect(periods.length).toBe(amounts.length);
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      expect(total).toBeCloseTo(totalAmount, 2);
    });

    it('should handle indexation date correctly in full flow', () => {
      // Arrange
      const start = new Date('2025-04-04');
      const end = new Date('2026-12-31');
      const indexationDate = new Date('2026-01-01');
      const totalAmount = 1000;
      const frequency: BillingFrequency = 'MONTHLY';

      // Act
      const periods = buildPeriods(start, end, frequency, indexationDate);
      const amounts = calculateAmountsByPeriodDays(totalAmount, periods);

      // Assert
      expect(periods.length).toBeLessThan(12); // Should stop before end
      const total = amounts.reduce((sum, amt) => sum + amt, 0);
      expect(total).toBeCloseTo(totalAmount, 2);
    });
  });
});

