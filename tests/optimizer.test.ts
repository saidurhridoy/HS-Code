import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  calculateNbrAssessment,
  simulateDomesticVatComparison,
} from '../shared/tax-math';
import { generateOptimizationPlan } from '../shared/tax-optimizer';
import { TaxAssessmentInput } from '../shared/types';
import { createApiApp } from '../server/app';
import { getTariffStore } from '../server/tariff/tariff-store';

describe('Bangladesh NBR Technical Duty Reduction & VAT Rebate Engine', () => {
  const store = getTariffStore();

  it('distinguishes 15% Standard VAT (full VAT+AT rebate) vs 5% Trade VAT (0% VAT rebate, AT still adjustable)', () => {
    const baseInput: TaxAssessmentInput = {
      rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
      regime: 'commercial',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 10,
    };

    const std = calculateNbrAssessment({ ...baseInput, domesticVatMode: 'standard_15' });
    const trade = calculateNbrAssessment({ ...baseInput, domesticVatMode: 'trade_5' });

    const stdVatLine = std.lines.find((l) => l.code === 'VAT')!;
    const tradeVatLine = trade.lines.find((l) => l.code === 'VAT')!;
    const tradeAtLine = trade.lines.find((l) => l.code === 'AT')!;

    expect(stdVatLine.rebateable).toBe(true);
    expect(tradeVatLine.rebateable).toBe(false);
    // Crucial statutory rule: AT (Note-31) remains adjustable even under 5% Trade VAT!
    expect(tradeAtLine.rebateable).toBe(true);
    expect(std.rebateableTaxBdt - trade.rebateableTaxBdt).toBe(19200);
  });

  it('computes APTA, SAFTA, and Export Bonded reductions accurately', () => {
    const baseInput: TaxAssessmentInput = {
      rates: { cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 },
      regime: 'commercial',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 1,
    };

    const mfn = calculateNbrAssessment({ ...baseInput, preferentialOrigin: 'none' });
    const apta = calculateNbrAssessment({ ...baseInput, preferentialOrigin: 'apta' });
    const safta = calculateNbrAssessment({ ...baseInput, preferentialOrigin: 'safta' });
    const bonded = calculateNbrAssessment({ ...baseInput, regime: 'export_bonded' });

    expect(mfn.ttiPercent).toBe(89.32);
    expect(apta.effectiveRates.cd).toBe(20);
    expect(apta.ttiPercent).toBeLessThan(mfn.ttiPercent);
    expect(safta.effectiveRates.cd).toBe(5);
    expect(safta.ttiPercent).toBeLessThan(apta.ttiPercent);
    expect(bonded.ttiPercent).toBe(0);
    expect(bonded.totalTaxBdt).toBe(0);
  });

  it('models B2B & B2C breakeven between 15% Standard VAT and 5% Trade VAT accurately', () => {
    const assessment = calculateNbrAssessment({
      rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
      regime: 'commercial',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 1,
    });

    const b2b20 = simulateDomesticVatComparison(assessment, 20, true);
    expect(b2b20.recommendedMode).toBe('standard_15');
    expect(b2b20.netAdvantageBdt).toBeGreaterThan(0);

    const b2c25 = simulateDomesticVatComparison(assessment, 25, false);
    expect(b2c25.recommendedMode).toBe('standard_15');

    const b2c75 = simulateDomesticVatComparison(assessment, 75, false);
    expect(b2c75.recommendedMode).toBe('trade_5');
  });

  it('generates targeted optimization strategies (Capital Machinery SRO, Bulk Pack, Marine Cover Note)', () => {
    const milkRetail = store.byHs8.get('04022110')!;
    const input: TaxAssessmentInput = {
      rates: milkRetail.rates,
      regime: 'commercial',
      preferentialOrigin: 'none',
      domesticVatMode: 'trade_5',
      valuationMode: 'invoice_to_av',
      incoterm: 'CFR',
      insurancePercent: 1.0,
      invoiceValue: 10000,
      currency: 'USD',
      exchangeRateBdt: 122,
      quantity: 1000,
    };

    const current = calculateNbrAssessment(input);
    const plan = generateOptimizationPlan(milkRetail, input, current);

    const ids = plan.opportunities.map((o) => o.id);
    expect(ids).toContain('bulk-packaging-engineering');
    expect(ids).toContain('local-marine-insurance-cover');
    expect(ids).toContain('unlock-15pct-input-vat-credit');
    expect(plan.rebatePlaybook.length).toBe(4);
  });

  describe('POST /api/optimize endpoint', () => {
    let server: http.Server;
    let baseUrl = '';

    beforeAll(async () => {
      const app = createApiApp();
      server = http.createServer(app);
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') baseUrl = `http://127.0.0.1:${addr.port}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it('returns full optimization plan and VAT rebate comparison via REST API', async () => {
      const res = await fetch(`${baseUrl}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hs8: '84771000',
          regime: 'commercial',
          incoterm: 'CFR',
          invoiceValue: 20000,
          currency: 'USD',
          exchangeRateBdt: 122,
          markupPercent: 20,
          buyerIsVatRegisteredB2B: true,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.optimizationPlan.opportunities.length).toBeGreaterThan(0);
      expect(data.vatComparison.breakevenMarkupPercent).toBe(62.16);
    });
  });
});
