import {
  DomesticVatMode,
  ImporterRegime,
  NbrTaxRates,
  PreferentialOrigin,
  SupportedCurrency,
  TaxAssessmentInput,
  TaxAssessmentResult,
  TaxLineItem,
  ValuationBreakdown,
  VatModelScenario,
  VatRebateComparison,
} from './types';

export const DEFAULT_EXCHANGE_RATES_BDT: Record<SupportedCurrency, number> = {
  USD: 122.0,
  EUR: 132.5,
  GBP: 155.0,
  CNY: 16.9,
  INR: 1.43,
  BDT: 1.0,
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  INR: '₹',
  BDT: '৳',
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Computes effective NBR rates based on Importer Regime + Preferential Origin (FTA/PTA) + optional SRO overrides.
 */
export function resolveEffectiveRates(
  baseRates: NbrTaxRates,
  regime: ImporterRegime,
  sroEligibleCapitalMachinery = false,
  overrides?: Partial<NbrTaxRates>,
  preferentialOrigin: PreferentialOrigin = 'none'
): NbrTaxRates {
  let effective: NbrTaxRates = { ...baseRates };

  // 1. Apply Preferential Certificate of Origin (APTA / SAFTA / Bhutan PTA) on CD before regime rules
  if (preferentialOrigin === 'apta' && effective.cd >= 5) {
    // APTA (China, South Korea, India, Sri Lanka, Laos): ~20% Margin of Preference reduction on CD
    effective.cd = round2(effective.cd * 0.8);
  } else if (preferentialOrigin === 'safta') {
    // SAFTA (South Asia non-sensitive list): Concessionary CD capped at 5% (0% if already 0-1%)
    if (effective.cd > 5) {
      effective.cd = 5;
    }
  } else if (preferentialOrigin === 'bhutan_pta') {
    // Bangladesh-Bhutan PTA: Duty-free preferential access on eligible lines
    effective.cd = 0;
    effective.rd = 0;
  }

  // 2. Apply Importer IRC / SRO Regime
  if (regime === 'industrial') {
    // Registered Industrial IRC Manufacturer: Advance Tax (AT) on raw materials / industrial inputs is 3% instead of 5%
    if (effective.at > 0) {
      effective.at = Math.min(effective.at, 3);
    }
  } else if (regime === 'capital_machinery' && sroEligibleCapitalMachinery) {
    // NBR Capital Machinery Concessionary SRO: CD = 1%, RD = 0%, SD = 0%, VAT = 0%, AIT = 0%, AT = 0%
    effective = {
      cd: 1,
      rd: 0,
      sd: 0,
      vat: 0,
      ait: 0,
      at: 0,
    };
  } else if (regime === 'export_bonded') {
    // 100% Export-Oriented Customs Bonded Warehouse / Back-to-Back LC: 0% across all heads
    effective = {
      cd: 0,
      rd: 0,
      sd: 0,
      vat: 0,
      ait: 0,
      at: 0,
    };
  }

  // 3. Apply explicit user custom SRO overrides
  if (overrides) {
    for (const key of ['cd', 'rd', 'sd', 'vat', 'ait', 'at'] as const) {
      const val = overrides[key];
      if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
        effective[key] = val;
      }
    }
  }

  return effective;
}

/**
 * Exact statutory Bangladesh NBR Total Tax Incidence (TTI %) formula:
 * Let AV = 1.00
 * CD  = cd%
 * RD  = rd%
 * SD  = (1 + cd + rd) * sd%
 * VAT = (1 + cd + rd + sd_eff) * vat%
 * AIT = ait%
 * AT  = (1 + cd + rd + sd_eff) * at%
 * TTI = CD + RD + SD + VAT + AIT + AT
 */
export function computeNbrTtiPercent(rates: NbrTaxRates): number {
  const cdDec = rates.cd / 100;
  const rdDec = rates.rd / 100;
  const sdBaseFactor = 1 + cdDec + rdDec;
  const sdEffDec = sdBaseFactor * (rates.sd / 100);
  const vatBaseFactor = sdBaseFactor + sdEffDec;
  const vatEffDec = vatBaseFactor * (rates.vat / 100);
  const aitDec = rates.ait / 100;
  const atEffDec = vatBaseFactor * (rates.at / 100);

  const totalDec = cdDec + rdDec + sdEffDec + vatEffDec + aitDec + atEffDec;
  return round2(totalDec * 100);
}

/**
 * Computes full NBR Assessable Value (AV) and compound tax schedule.
 */
export function calculateNbrAssessment(input: TaxAssessmentInput): TaxAssessmentResult {
  const fx =
    input.currency === 'BDT'
      ? 1
      : Math.max(0.0001, input.exchangeRateBdt || DEFAULT_EXCHANGE_RATES_BDT[input.currency]);
  const invoiceForeign = Math.max(0, input.invoiceValue || 0);
  const invoiceBdt = invoiceForeign * fx;
  const qty = Math.max(1, input.quantity || 1);
  const preferentialOrigin: PreferentialOrigin = input.preferentialOrigin || 'none';
  const domesticVatMode: DomesticVatMode = input.domesticVatMode || 'standard_15';

  let valuation: ValuationBreakdown;

  if (input.valuationMode === 'direct_av') {
    valuation = {
      currency: input.currency,
      exchangeRateBdt: fx,
      invoiceValueForeign: round2(invoiceForeign),
      invoiceValueBdt: round2(invoiceBdt),
      freightBdt: 0,
      cfrBdt: round2(invoiceBdt),
      insuranceBdt: 0,
      cifBdt: round2(invoiceBdt),
      landingChargeBdt: 0,
      assessableValueBdt: round2(invoiceBdt),
      assessableValueForeign: round2(invoiceBdt / fx),
    };
  } else {
    const insPct = typeof input.insurancePercent === 'number' ? Math.max(0, input.insurancePercent) : 1.0;
    const freightPct = typeof input.freightPercent === 'number' ? Math.max(0, input.freightPercent) : 5.0;

    let freightBdt = 0;
    let cfrBdt = invoiceBdt;
    let insuranceBdt = 0;
    let cifBdt = invoiceBdt;

    if (input.incoterm === 'FOB') {
      freightBdt =
        typeof input.freightValue === 'number' && input.freightValue >= 0
          ? input.freightValue * fx
          : invoiceBdt * (freightPct / 100);
      cfrBdt = invoiceBdt + freightBdt;
      insuranceBdt = cfrBdt * (insPct / 100);
      cifBdt = cfrBdt + insuranceBdt;
    } else if (input.incoterm === 'CFR') {
      freightBdt = 0;
      cfrBdt = invoiceBdt;
      insuranceBdt = cfrBdt * (insPct / 100);
      cifBdt = cfrBdt + insuranceBdt;
    } else {
      freightBdt = 0;
      cfrBdt = invoiceBdt;
      insuranceBdt = 0;
      cifBdt = invoiceBdt;
    }

    const landingChargeBdt = cifBdt * 0.01;
    const avBdt = cifBdt + landingChargeBdt;

    valuation = {
      currency: input.currency,
      exchangeRateBdt: fx,
      invoiceValueForeign: round2(invoiceForeign),
      invoiceValueBdt: round2(invoiceBdt),
      freightBdt: round2(freightBdt),
      cfrBdt: round2(cfrBdt),
      insuranceBdt: round2(insuranceBdt),
      cifBdt: round2(cifBdt),
      landingChargeBdt: round2(landingChargeBdt),
      assessableValueBdt: round2(avBdt),
      assessableValueForeign: round2(avBdt / fx),
    };
  }

  const effectiveRates = resolveEffectiveRates(
    input.rates,
    input.regime,
    input.sroEligibleCapitalMachinery,
    input.customRateOverrides,
    preferentialOrigin
  );

  const av = valuation.assessableValueBdt;

  const cdAmount = av * (effectiveRates.cd / 100);
  const rdAmount = av * (effectiveRates.rd / 100);
  const sdBase = av + cdAmount + rdAmount;
  const sdAmount = sdBase * (effectiveRates.sd / 100);
  const vatBase = sdBase + sdAmount;
  const vatAmount = vatBase * (effectiveRates.vat / 100);
  const aitAmount = av * (effectiveRates.ait / 100);
  const atBase = vatBase;
  const atAmount = atBase * (effectiveRates.at / 100);

  const sdFactor = 1 + effectiveRates.cd / 100 + effectiveRates.rd / 100;
  const sdEffPct = sdFactor * effectiveRates.sd;
  const vatFactor = sdFactor + sdEffPct / 100;
  const vatEffPct = vatFactor * effectiveRates.vat;
  const atEffPct = vatFactor * effectiveRates.at;

  // Rebateability depends strictly on VAT & SD Act 2012 s.46 & s.31(3)!
  const isVatRebateable = effectiveRates.vat === 15 && domesticVatMode === 'standard_15';
  const isAtRebateable = effectiveRates.at > 0 && domesticVatMode !== 'unregistered_exempt';
  const isAitRebateable = effectiveRates.ait > 0;

  const vatRebateNote =
    effectiveRates.vat === 0
      ? 'Exempt (0% Import VAT)'
      : domesticVatMode === 'standard_15'
      ? '100% Input Tax Credit u/s 46 on Mushak-9.1 (Part-4) within 4 tax periods'
      : domesticVatMode === 'trade_5'
      ? 'Non-rebateable u/s 46(1)(ka) under 5% Trade VAT — switch to 15% Standard VAT to unlock credit!'
      : 'Non-rebateable without active 15% VAT registration';

  const atRebateNote =
    effectiveRates.at === 0
      ? 'Exempt (0% AT)'
      : domesticVatMode === 'unregistered_exempt'
      ? 'Unrecoverable without BIN & Mushak-9.1 filing'
      : '100% Decreasing Adjustment / Refund in Mushak-9.1 Note-31 u/s 31(3) (even under 5% Trade VAT!)';

  const lines: TaxLineItem[] = [
    {
      code: 'CD',
      name: 'Customs Duty (CD)',
      banglaName: 'কাস্টমস ডিউটি',
      statutoryBaseLabel: 'Assessable Value (AV)',
      baseAmountBdt: round2(av),
      ratePercent: effectiveRates.cd,
      effectiveRateOnAvPercent: round2(effectiveRates.cd),
      amountBdt: round2(cdAmount),
      amountForeign: round2(cdAmount / fx),
      rebateable: false,
      rebateNote: 'Non-recoverable sunk import duty (unless exported via Bond / DEDO drawback)',
    },
    {
      code: 'RD',
      name: 'Regulatory Duty (RD)',
      banglaName: 'রেগুলেটরি ডিউটি',
      statutoryBaseLabel: 'Assessable Value (AV)',
      baseAmountBdt: round2(av),
      ratePercent: effectiveRates.rd,
      effectiveRateOnAvPercent: round2(effectiveRates.rd),
      amountBdt: round2(rdAmount),
      amountForeign: round2(rdAmount / fx),
      rebateable: false,
      rebateNote: 'Non-recoverable regulatory surcharge',
    },
    {
      code: 'SD',
      name: 'Supplementary Duty (SD)',
      banglaName: 'সম্পূরক শুল্ক',
      statutoryBaseLabel: 'AV + CD + RD',
      baseAmountBdt: round2(sdBase),
      ratePercent: effectiveRates.sd,
      effectiveRateOnAvPercent: round2(sdEffPct),
      amountBdt: round2(sdAmount),
      amountForeign: round2(sdAmount / fx),
      rebateable: false,
      rebateNote: 'Non-recoverable import stage SD (except 100% export drawback)',
    },
    {
      code: 'VAT',
      name: 'Value Added Tax (VAT)',
      banglaName: 'মূল্য সংযোজন কর (মূসক)',
      statutoryBaseLabel: 'AV + CD + RD + SD',
      baseAmountBdt: round2(vatBase),
      ratePercent: effectiveRates.vat,
      effectiveRateOnAvPercent: round2(vatEffPct),
      amountBdt: round2(vatAmount),
      amountForeign: round2(vatAmount / fx),
      rebateable: isVatRebateable,
      rebateNote: vatRebateNote,
    },
    {
      code: 'AIT',
      name: 'Advance Income Tax (AIT)',
      banglaName: 'অগ্রিম আয়কর',
      statutoryBaseLabel: 'Assessable Value (AV)',
      baseAmountBdt: round2(av),
      ratePercent: effectiveRates.ait,
      effectiveRateOnAvPercent: round2(effectiveRates.ait),
      amountBdt: round2(aitAmount),
      amountForeign: round2(aitAmount / fx),
      rebateable: isAitRebateable,
      rebateNote:
        effectiveRates.ait > 0
          ? 'Adjustable corporate tax credit u/s 120 Income Tax Act 2023 (subject to s.163 minimum tax)'
          : 'Exempt (0% AIT)',
    },
    {
      code: 'AT',
      name: 'Advance Tax (AT)',
      banglaName: 'অগ্রিম কর (এটি)',
      statutoryBaseLabel: 'AV + CD + RD + SD',
      baseAmountBdt: round2(atBase),
      ratePercent: effectiveRates.at,
      effectiveRateOnAvPercent: round2(atEffPct),
      amountBdt: round2(atAmount),
      amountForeign: round2(atAmount / fx),
      rebateable: isAtRebateable,
      rebateNote: atRebateNote,
    },
  ];

  const totalTaxBdt = round2(cdAmount + rdAmount + sdAmount + vatAmount + aitAmount + atAmount);
  const rebateableTaxBdt = round2(
    lines.filter((l) => l.rebateable).reduce((acc, l) => acc + l.amountBdt, 0)
  );
  const netSunkDutyBdt = round2(totalTaxBdt - rebateableTaxBdt);
  const totalLandedCostBdt = round2(av + totalTaxBdt);
  const netLandedCostAfterRebateBdt = round2(av + netSunkDutyBdt);
  const ttiPercent = computeNbrTtiPercent(effectiveRates);

  return {
    regime: input.regime,
    preferentialOrigin,
    domesticVatMode,
    effectiveRates,
    valuation,
    lines,
    ttiPercent,
    totalTaxBdt,
    totalTaxForeign: round2(totalTaxBdt / fx),
    totalLandedCostBdt,
    totalLandedCostForeign: round2(totalLandedCostBdt / fx),
    rebateableTaxBdt,
    rebateableTaxForeign: round2(rebateableTaxBdt / fx),
    netSunkDutyBdt,
    netSunkDutyForeign: round2(netSunkDutyBdt / fx),
    netLandedCostAfterRebateBdt,
    quantity: qty,
    unit: input.unit || 'u',
    perUnitTaxBdt: round2(totalTaxBdt / qty),
    perUnitLandedBdt: round2(totalLandedCostBdt / qty),
  };
}

/**
 * Compares Standard 15% Output VAT (with 100% Import VAT Input Rebate u/s 46)
 * vs. 5% Commercial Trade VAT (0% Import VAT Rebate, AT still adjustable u/s 31)
 * across domestic gross margin & B2B/B2C buyer profile.
 */
export function simulateDomesticVatComparison(
  assessment: TaxAssessmentResult,
  markupPercent = 20,
  buyerIsVatRegisteredB2B = true
): VatRebateComparison {
  const m = Math.max(0, markupPercent) / 100;
  const av = assessment.valuation.assessableValueBdt;
  const cd = assessment.lines.find((l) => l.code === 'CD')?.amountBdt || 0;
  const rd = assessment.lines.find((l) => l.code === 'RD')?.amountBdt || 0;
  const sd = assessment.lines.find((l) => l.code === 'SD')?.amountBdt || 0;
  const importVat = assessment.lines.find((l) => l.code === 'VAT')?.amountBdt || 0;
  const importAt = assessment.lines.find((l) => l.code === 'AT')?.amountBdt || 0;

  // Base landed product cost excluding recoverable taxes = AV + CD + RD + SD
  const baseExVatCost = av + cd + rd + sd;

  // Scenario A: Standard 15% Output VAT Registration (100% Import VAT + 100% AT credited)
  const stdExVatPrice = baseExVatCost * (1 + m);
  const stdOutputVat = assessment.effectiveRates.vat > 0 ? stdExVatPrice * 0.15 : 0;
  const stdInvoiceInclVat = stdExVatPrice + stdOutputVat;
  const stdNetTreasury = stdOutputVat - importVat - importAt;
  const stdProfit = stdExVatPrice - baseExVatCost;

  const standard15: VatModelScenario = {
    mode: 'standard_15',
    label: 'Standard 15% Output VAT (Full Rebate)',
    exVatSellingPriceBdt: round2(stdExVatPrice),
    outputVatOnSalesBdt: round2(stdOutputVat),
    invoicePriceInclVatBdt: round2(stdInvoiceInclVat),
    importVatCreditBdt: round2(importVat),
    importAtAdjustmentBdt: round2(importAt),
    netTreasuryVatPayableOrRefundBdt: round2(stdNetTreasury),
    unrecoveredImportVatSunkBdt: 0,
    netProfitAfterAllTaxesBdt: round2(stdProfit),
  };

  // Scenario B: 5% Commercial Trade VAT (Import VAT is forfeited as sunk cost; AT is still adjustable!)
  // If selling to B2C at competitive market sticker price (stdInvoiceInclVat) vs cost-plus markup:
  const tradeSunkCost = baseExVatCost + importVat;
  let tradeExVatPrice: number;
  if (buyerIsVatRegisteredB2B) {
    // B2B corporate buyer compares effective non-rebateable cost; trader marks up sunk cost by m
    tradeExVatPrice = tradeSunkCost * (1 + m);
  } else {
    // B2C retail buyer compares VAT-inclusive shelf price: match shelf price = stdInvoiceInclVat
    tradeExVatPrice = stdInvoiceInclVat / 1.05;
  }
  const tradeOutputVat = assessment.effectiveRates.vat > 0 ? tradeExVatPrice * 0.05 : 0;
  const tradeInvoiceInclVat = tradeExVatPrice + tradeOutputVat;
  const tradeNetTreasury = tradeOutputVat - importAt;
  const tradeProfit = tradeExVatPrice - tradeSunkCost;

  const trade5: VatModelScenario = {
    mode: 'trade_5',
    label: '5% Commercial Trade VAT (No VAT Rebate)',
    exVatSellingPriceBdt: round2(tradeExVatPrice),
    outputVatOnSalesBdt: round2(tradeOutputVat),
    invoicePriceInclVatBdt: round2(tradeInvoiceInclVat),
    importVatCreditBdt: 0,
    importAtAdjustmentBdt: round2(importAt),
    netTreasuryVatPayableOrRefundBdt: round2(tradeNetTreasury),
    unrecoveredImportVatSunkBdt: round2(importVat),
    netProfitAfterAllTaxesBdt: round2(tradeProfit),
  };

  // Breakeven markup % for B2C where 0.15 * B * (1+m) == 0.15*B + 0.05 * 1.15 * B * (1+m) => m = 62.16%
  const breakevenMarkupPercent = 62.16;

  let recommendedMode: 'standard_15' | 'trade_5' = 'standard_15';
  let netAdvantageBdt = 0;
  let explanation = '';

  if (importVat <= 0) {
    recommendedMode = 'standard_15';
    netAdvantageBdt = 0;
    explanation = 'This HS code already enjoys 0% Import VAT, so no import-stage VAT is trapped under either regime.';
  } else if (buyerIsVatRegisteredB2B) {
    recommendedMode = 'standard_15';
    // Advantage to B2B supply chain: buyer rebates 15% Mushak-6.3, whereas under 5% Trade VAT buyer pays tradeInvoiceInclVat with 0% credit
    netAdvantageBdt = round2(tradeInvoiceInclVat - stdExVatPrice);
    explanation = `For B2B corporate buyers, Standard 15% Output VAT is strictly superior: you recover 100% of ৳${importVat.toLocaleString('en-IN')} Import VAT, and your corporate buyer rebates your 15% Mushak-6.3 VAT — lowering buyer net cost by ৳${netAdvantageBdt.toLocaleString('en-IN')}.`;
  } else {
    const diff = round2(stdProfit - tradeProfit);
    if (diff >= 0) {
      recommendedMode = 'standard_15';
      netAdvantageBdt = diff;
      explanation = `Even for B2C retail sales at a ${markupPercent}% markup (below the 62.16% statutory breakeven), Standard 15% VAT leaves you ৳${netAdvantageBdt.toLocaleString('en-IN')} higher net margin than 5% Trade VAT because you only pay 15% on value-addition instead of forfeiting 15% Import VAT + paying 5% again on the full retail price.`;
    } else {
      recommendedMode = 'trade_5';
      netAdvantageBdt = Math.abs(diff);
      explanation = `Because your retail B2C markup (${markupPercent}%) exceeds 62.16%, 5% Commercial Trade VAT yields ৳${netAdvantageBdt.toLocaleString('en-IN')} lower total VAT than 15% on high retail value-addition.`;
    }
  }

  return {
    markupPercent,
    buyerIsVatRegisteredB2B,
    standard15,
    trade5,
    recommendedMode,
    netAdvantageBdt,
    breakevenMarkupPercent,
    explanation,
  };
}
