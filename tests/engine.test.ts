import { describe, expect, it } from 'vitest';
import { calculateNbrAssessment, computeNbrTtiPercent } from '../shared/tax-math';
import { getClassificationEngine } from '../server/engine/classifier';
import { getTariffStore } from '../server/tariff/tariff-store';

describe('Bangladesh NBR Statutory Tax & Compound TTI Math', () => {
  it('computes exact 58.60% TTI for standard 25% CD + 3% RD + 0% SD + 15% VAT + 5% AIT + 5% AT', () => {
    const tti = computeNbrTtiPercent({ cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 });
    expect(tti).toBe(58.6);
  });

  it('computes exact 89.32% TTI for 25% CD + 3% RD + 20% SD + 15% VAT + 5% AIT + 5% AT', () => {
    const tti = computeNbrTtiPercent({ cd: 25, rd: 3, sd: 20, vat: 15, ait: 5, at: 5 });
    expect(tti).toBe(89.32);
  });

  it('computes exact 127.72% TTI for finished garments (25% CD + 3% RD + 45% SD + 15% VAT + 5% AIT + 5% AT)', () => {
    const tti = computeNbrTtiPercent({ cd: 25, rd: 3, sd: 45, vat: 15, ait: 5, at: 5 });
    expect(tti).toBe(127.72);
  });

  it('applies 1% Insurance + 1% Landing Charge properly on CFR -> Assessable Value (AV)', () => {
    // CFR = $1,000 @ 120 BDT = 120,000 BDT
    // Insurance (1%) = 1,200 BDT -> CIF = 121,200 BDT
    // Landing Charge (1% on CIF) = 1,212 BDT -> AV = 122,412 BDT
    const res = calculateNbrAssessment({
      rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
      regime: 'commercial',
      valuationMode: 'invoice_to_av',
      incoterm: 'CFR',
      invoiceValue: 1000,
      currency: 'USD',
      exchangeRateBdt: 120,
      quantity: 10,
    });

    expect(res.valuation.cfrBdt).toBe(120000);
    expect(res.valuation.insuranceBdt).toBe(1200);
    expect(res.valuation.cifBdt).toBe(121200);
    expect(res.valuation.landingChargeBdt).toBe(1212);
    expect(res.valuation.assessableValueBdt).toBe(122412);
    expect(res.ttiPercent).toBe(58.6);
  });

  it('applies Industrial IRC 3% AT vs Commercial 5% AT and Capital Machinery 1% CD SRO', () => {
    const baseRates = { cd: 5, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 };
    const comm = calculateNbrAssessment({
      rates: baseRates,
      regime: 'commercial',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 1,
    });
    const ind = calculateNbrAssessment({
      rates: baseRates,
      regime: 'industrial',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 1,
    });
    expect(comm.effectiveRates.at).toBe(5);
    expect(ind.effectiveRates.at).toBe(3);
    expect(ind.ttiPercent).toBeLessThan(comm.ttiPercent);

    const cap = calculateNbrAssessment({
      rates: { cd: 10, rd: 0, sd: 0, vat: 15, ait: 5, at: 5 },
      sroEligibleCapitalMachinery: true,
      regime: 'capital_machinery',
      valuationMode: 'direct_av',
      incoterm: 'CIF',
      invoiceValue: 100000,
      currency: 'BDT',
      exchangeRateBdt: 1,
      quantity: 1,
    });
    expect(cap.effectiveRates).toEqual({ cd: 1, rd: 0, sd: 0, vat: 0, ait: 0, at: 0 });
    expect(cap.ttiPercent).toBe(1);
  });
});

describe('WCO HS2022 + Bangladesh BCT Store & Hybrid AI Classifier', () => {
  const store = getTariffStore();
  const engine = getClassificationEngine();

  it('loads all 21 WCO sections, 97 chapters, and 5,600+ tariff codes', () => {
    expect(store.sections.length).toBe(21);
    expect(store.chapters.size).toBe(97);
    expect(store.entries.length).toBeGreaterThan(5600);
  });

  it('accurately classifies diverse commercial, industrial, vehicle, food & Bangla descriptions', async () => {
    const cases: [string, string][] = [
      ['Apple MacBook Air M3 13-inch portable laptop aluminum 256GB SSD', '84713000'],
      ['iPhone 16 Pro 5G cellular smartphone handset', '85171300'],
      ['65W USB-C GaN fast charger power adapter for phones', '85044010'],
      ['Monocrystalline 550W solar PV panel module', '85414300'],
      ['100% cotton knitted mens crew neck t-shirt 180 GSM', '61091000'],
      ['Mens formal long sleeve woven cotton shirt', '62052000'],
      ['Toyota Corolla Cross 1800cc hybrid SUV reconditioned', '87034012'],
      ['Toyota Axio 1500cc petrol sedan car', '87032211'],
      ['BYD Atto 3 pure battery electric SUV EV', '87038000'],
      ['Industrial lockstitch sewing machine for garments factory', '84522900'],
      ['Polypropylene PP virgin plastic granules in 25kg bags', '39021000'],
      ['Korean facial niacinamide skincare serum 30ml dropper bottle', '33049900'],
      ['Homogeneous porcelain glazed floor tiles 60x60cm', '69072100'],
      ['Full cream milk powder in 25kg bulk industrial bag', '04022190'],
      ['Full cream milk powder in 1kg retail tin', '04022110'],
      ['গার্মেন্টস ফ্যাক্টরির জন্য ইন্ডাস্ট্রিয়াল সুইং মেশিন', '84522900'],
      ['স্মার্টফোন মোবাইল ফোন', '85171300'],
    ];

    for (const [desc, expectedHs8] of cases) {
      const res = await engine.classify(desc);
      expect(res.primary.entry.hs8, `Query: "${desc}" got ${res.primary.entry.hs8}`).toBe(expectedHs8);
      expect(res.primary.confidence).toBeGreaterThanOrEqual(60);
    }
  });

  it('handles typos via edit-distance fuzzy stem matching', async () => {
    const res = await engine.classify('smartfone mobile celular');
    expect(res.primary.entry.hs8).toBe('85171300');
  });
});
