import { calculateNbrAssessment } from './tax-math.js';
import {
  AlternativeDutyScenario,
  AlternativeTradeIntelligenceReport,
  BangladeshPortOption,
  ClassificationCandidate,
  ClassificationResult,
  ExtractedSourceMetadata,
  GlobalSourcingCorridor,
  PreferentialOrigin,
  RegionalHubBenchmark,
  TariffEntry,
  TaxAssessmentInput,
  TaxAssessmentResult,
  ZeroTaxPathway,
} from './types.js';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const BOND_ELIGIBLE_CHAPTERS = new Set([
  '32', '34', '35', '38', '39', '40', '41', '42', '48',
  '50', '51', '52', '53', '54', '55', '56', '58', '59', '60', '61', '62', '63', '64', '83', '96',
]);

const AIR_FREIGHT_FRIENDLY_PREFIXES = ['3002', '3004', '71', '8471', '8473', '8517', '8523', '8541', '8542', '90', '91'];

const BHUTAN_STRONG_CHAPTERS = new Set(['07', '08', '09', '20', '22', '25', '27', '44', '72']);

export function generateAlternativeTradeIntelligence(
  entry: TariffEntry,
  classification: ClassificationResult | null,
  input: TaxAssessmentInput,
  current: TaxAssessmentResult,
  sourceMeta?: ExtractedSourceMetadata | null
): AlternativeTradeIntelligenceReport {
  // =========================================================================
  // 1. ALTERNATIVE DUTY & TAX MATRIX (Regimes + Alternative HS Subheadings)
  // =========================================================================
  const alternativeDutyMatrix: AlternativeDutyScenario[] = [];

  const regimesToCompare: {
    id: string;
    regime: TaxAssessmentInput['regime'];
    title: string;
    banglaTitle: string;
    regimeLabel: string;
    banglaRegimeLabel: string;
    eligibility: AlternativeDutyScenario['eligibility'];
    note: string;
    banglaNote: string;
    skip?: boolean;
  }[] = [
    {
      id: 'regime-commercial',
      regime: 'commercial',
      title: 'Standard Commercial Import (Commercial IRC)',
      banglaTitle: 'সাধারণ বাণিজ্যিক আমদানি (কমার্শিয়াল IRC)',
      regimeLabel: 'Commercial IRC (5% AT)',
      banglaRegimeLabel: 'কমার্শিয়াল IRC (৫% AT)',
      eligibility: input.regime === 'commercial' ? 'Active Now' : 'Direct Option',
      note: 'Open to any CCI&E Commercial IRC trader for local resale without factory licensing.',
      banglaNote: 'যেকোনো কমার্শিয়াল IRC লাইসেন্সধারী ব্যবসায়ীর জন্য সরাসরি প্রযোজ্য।',
    },
    {
      id: 'regime-industrial',
      regime: 'industrial',
      title: 'Industrial Manufacturer Input (Industrial IRC)',
      banglaTitle: 'শিল্প কারখানার কাঁচামাল আমদানি (ইন্ডাস্ট্রিয়াল IRC)',
      regimeLabel: 'Industrial IRC (3% AT)',
      banglaRegimeLabel: 'ইন্ডাস্ট্রিয়াল IRC (৩% AT)',
      eligibility: input.regime === 'industrial' ? 'Active Now' : 'Conditional License/Spec',
      note: 'Reduces Advance Tax from 5% to 3% when listed in Industrial IRC & Mushak-4.3.',
      banglaNote: 'ইন্ডাস্ট্রিয়াল IRC ও মূসক-৪.৩ তে কাঁচামাল হিসেবে অন্তর্ভুক্ত থাকলে AT ৫% থেকে কমে ৩% হয়।',
    },
    {
      id: 'regime-cap-machinery',
      regime: 'capital_machinery',
      title: 'Capital Machinery Concessionary SRO (1% CD · 0% VAT/AT)',
      banglaTitle: 'ক্যাপিটাল মেশিনারি বিশেষ ছাড় SRO (১% CD · ০% ভ্যাট/AT)',
      regimeLabel: 'Capital Machinery SRO (1% CD)',
      banglaRegimeLabel: 'ক্যাপিটাল মেশিনারি SRO (১% CD)',
      eligibility:
        input.regime === 'capital_machinery' ? 'Active Now' : 'Conditional License/Spec',
      note: 'BIDA/BSCIC/Textiles-approved factory machinery pays 1% CD and 0% RD/SD/VAT/AIT/AT.',
      banglaNote: 'শিল্প কারখানার অনুমোদিত মেশিনারিতে মাত্র ১% CD প্রযোজ্য; ভ্যাট, RD, SD, AIT ও AT ০%।',
      skip: !entry.sroEligibleCapitalMachinery,
    },
    {
      id: 'regime-bonded',
      regime: 'export_bonded',
      title: '100% Export Bonded / EPZ / Economic Zone (Zero-Tax)',
      banglaTitle: '১০০% রপ্তানিমুখী বন্ডেড ওয়্যারহাউস / EPZ / ইকোনমিক জোন (০% কর)',
      regimeLabel: 'Bonded / EPZ (0% Duty)',
      banglaRegimeLabel: 'বন্ড / EPZ (০% শুল্ক)',
      eligibility: input.regime === 'export_bonded' ? 'Active Now' : 'Zero-Tax Zone/Bond',
      note: '100% duty-free & VAT-free import for Customs Bonded Warehouses, BEPZA EPZ & BEZA enterprises.',
      banglaNote: 'বন্ড লাইসেন্সধারী রপ্তানিকারক, EPZ এবং BEZA শিল্প প্রতিষ্ঠানের জন্য সম্পূর্ণ শুল্কমুক্ত (০%) আমদানি।',
    },
  ];

  for (const r of regimesToCompare) {
    if (r.skip) continue;
    const sim = calculateNbrAssessment({
      ...input,
      regime: r.regime,
      customRateOverrides: undefined,
    });
    const isCurrent = input.regime === r.regime && !input.customRateOverrides;
    alternativeDutyMatrix.push({
      id: r.id,
      title: r.title,
      banglaTitle: r.banglaTitle,
      hs8: entry.hs8,
      formattedHs8: entry.formattedHs8,
      regimeLabel: r.regimeLabel,
      banglaRegimeLabel: r.banglaRegimeLabel,
      ttiPercent: sim.ttiPercent,
      totalTaxBdt: sim.totalTaxBdt,
      rebateableBdt: sim.rebateableTaxBdt,
      netSunkTaxBdt: sim.netSunkDutyBdt,
      totalLandedBdt: sim.totalLandedCostBdt,
      savingsVsCurrentBdt: round2(current.totalTaxBdt - sim.totalTaxBdt),
      isCurrent,
      eligibility: r.eligibility,
      note: r.note,
      banglaNote: r.banglaNote,
      quickAction: isCurrent
        ? undefined
        : {
            type: 'set_regime',
            regime: r.regime,
            label: `Apply ${r.regimeLabel}`,
          },
    });
  }

  // Add runner-up alternative HS-8 codes from AI classification so users see tariff differences across adjacent headings
  const altCandidates: ClassificationCandidate[] = (classification?.alternatives || []).slice(0, 3);
  for (const cand of altCandidates) {
    if (cand.entry.hs8 === entry.hs8) continue;
    const effectiveRegime =
      input.regime === 'capital_machinery' && !cand.entry.sroEligibleCapitalMachinery
        ? 'commercial'
        : input.regime;
    const sim = calculateNbrAssessment({
      ...input,
      rates: cand.entry.rates,
      sroEligibleCapitalMachinery: cand.entry.sroEligibleCapitalMachinery,
      regime: effectiveRegime,
      unit: cand.entry.unit,
      customRateOverrides: undefined,
    });
    alternativeDutyMatrix.push({
      id: `alt-hs-${cand.entry.hs8}`,
      title: `Alternative HS ${cand.entry.formattedHs8}: ${cand.entry.commercialName}`,
      banglaTitle: `বিকল্প HS ${cand.entry.formattedHs8}: ${cand.entry.commercialName}`,
      hs8: cand.entry.hs8,
      formattedHs8: cand.entry.formattedHs8,
      regimeLabel: `Alt HS (${effectiveRegime})`,
      banglaRegimeLabel: `বিকল্প HS কোড`,
      ttiPercent: sim.ttiPercent,
      totalTaxBdt: sim.totalTaxBdt,
      rebateableBdt: sim.rebateableTaxBdt,
      netSunkTaxBdt: sim.netSunkDutyBdt,
      totalLandedBdt: sim.totalLandedCostBdt,
      savingsVsCurrentBdt: round2(current.totalTaxBdt - sim.totalTaxBdt),
      isCurrent: false,
      eligibility: 'Conditional License/Spec',
      note: `Valid only if physical product specification legally fits ${cand.entry.formattedHs8} (${cand.whenToUse}).`,
      banglaNote: `পণ্যের প্রকৃত কারিগরি মান ও উপাদান যদি ${cand.entry.formattedHs8} এর সাথে মিলে তবেই প্রযোজ্য।`,
      switchCandidate: cand,
    });
  }

  // =========================================================================
  // 2. TAX REBATE SCOPE BREAKDOWN
  // =========================================================================
  const vatLine = current.lines.find((l) => l.code === 'VAT');
  const atLine = current.lines.find((l) => l.code === 'AT');
  const aitLine = current.lines.find((l) => l.code === 'AIT');
  const cdAmt = current.lines.find((l) => l.code === 'CD')?.amountBdt || 0;
  const rdAmt = current.lines.find((l) => l.code === 'RD')?.amountBdt || 0;
  const sdAmt = current.lines.find((l) => l.code === 'SD')?.amountBdt || 0;
  const sunkDutiesBdt = round2(cdAmt + rdAmt + sdAmt);

  const totalTax = Math.max(0, current.totalTaxBdt);
  const pctShare = (amt: number) => (totalTax > 0 ? round2((amt / totalTax) * 100) : 0);

  const vatAmt = vatLine?.amountBdt || 0;
  const atAmt = atLine?.amountBdt || 0;
  const aitAmt = aitLine?.amountBdt || 0;

  const isVatCreditableNow = Boolean(vatLine?.rebateable);
  const isAtAdjustableNow = Boolean(atLine?.rebateable);
  const isAitCreditableNow = Boolean(aitLine?.rebateable);

  const recoverableLocalBdt = current.rebateableTaxBdt;
  const recoverableExportBdt = totalTax; // Under Bond or DEDO + s.24 Zero-Rated Export VAT + AIT credit
  const localRecoveryRatioPercent =
    totalTax > 0 ? round2((recoverableLocalBdt / totalTax) * 100) : 100;
  const effectiveSunkRateOnAvPercent =
    current.valuation.assessableValueBdt > 0
      ? round2((current.netSunkDutyBdt / current.valuation.assessableValueBdt) * 100)
      : 0;

  const rebateScope = {
    totalPortTaxBdt: totalTax,
    recoverableLocalBdt,
    recoverableExportBdt,
    unrecoverableSunkLocalBdt: current.netSunkDutyBdt,
    localRecoveryRatioPercent,
    effectiveSunkRateOnAvPercent,
    items: [
      {
        code: 'VAT' as const,
        label: `15% Import VAT (${isVatCreditableNow ? '100% Rebateable' : 'Blocked in Current Mode'})`,
        banglaLabel: `১৫% আমদানি ভ্যাট (${isVatCreditableNow ? '১০০% রেয়াতযোগ্য' : 'বর্তমান মোডে রেয়াত বন্ধ'})`,
        amountBdt: vatAmt,
        shareOfTotalTaxPercent: pctShare(vatAmt),
        recoverableForLocalSale: isVatCreditableNow,
        recoverableForExport: true,
        mechanism: 'Mushak-9.1 Input Tax Credit (Section 46, VAT & SD Act 2012)',
        banglaMechanism: 'মূসক-৯.১ উপকরণ কর রেয়াত (ধারা ৪৬, মূসক ও সম্পূরক শুল্ক আইন ২০১২)',
        condition: isVatCreditableNow
          ? 'Sell at 15% Standard Output VAT, record in Mushak-6.1/6.2, and claim within 4 tax periods.'
          : 'Switch Domestic VAT Mode to "15% Standard VAT" to unlock this input tax credit (5% Trade VAT blocks s.46 rebate).',
        banglaCondition: isVatCreditableNow
          ? '১৫% ভ্যাটে বিক্রি করে মূসক-৬.১/৬.২ খাতায় এন্ট্রি দিন এবং ৪ কর মেয়াদের মধ্যে মূসক-৯.১ রিটার্নে দাবি করুন।'
          : '৫% ট্রেড ভ্যাটে রেয়াত নিষিদ্ধ — এই ভ্যাট ফেরত পেতে "১৫% স্ট্যান্ডার্ড ভ্যাট" মোডে বিক্রি করুন।',
      },
      {
        code: 'AT' as const,
        label: `Advance Tax — AT (${current.effectiveRates.at}%)`,
        banglaLabel: `অগ্রিম কর — AT (${current.effectiveRates.at}%)`,
        amountBdt: atAmt,
        shareOfTotalTaxPercent: pctShare(atAmt),
        recoverableForLocalSale: isAtAdjustableNow,
        recoverableForExport: true,
        mechanism: 'Mushak-9.1 Decreasing Adjustment / Refund (Section 31(3), VAT Act 2012)',
        banglaMechanism: 'মূসক-৯.১ হ্রাসকারী সমন্বয় বা নগদ ফেরত (ধারা ৩১(৩), মূসক আইন ২০১২)',
        condition:
          'VAT-registered importers adjust 100% of port AT in Part-5 of Mushak-9.1 or apply for refund within 6 months.',
          banglaCondition:
          'ভ্যাট নিবন্ধিত আমদানিকারক মূসক-৯.১ এর অংশ-৫ এ ১০০% AT সমন্বয় বা নগদ রিফান্ড নিতে পারেন।',
      },
      {
        code: 'AIT' as const,
        label: `Advance Income Tax — AIT (${current.effectiveRates.ait}%)`,
        banglaLabel: `অগ্রিম আয়কর — AIT (${current.effectiveRates.ait}%)`,
        amountBdt: aitAmt,
        shareOfTotalTaxPercent: pctShare(aitAmt),
        recoverableForLocalSale: isAitCreditableNow,
        recoverableForExport: true,
        mechanism: 'Annual Corporate / Personal Income Tax Credit (s.120 & s.163, ITA 2023)',
        banglaMechanism: 'বার্ষিক আয়কর রিটার্নে কর ক্রেডিট সমন্বয় (ধারা ১২০ ও ১৬৩, আয়কর আইন ২০২৩)',
        condition:
          'Offsets regular income tax liability for that assessment year (subject to s.163 minimum tax floor if incurring loss).',
        banglaCondition:
          'বার্ষিক আয়কর প্রদেয় দায়ে ক্রেডিট হিসেবে সমন্বয় হয় (তবে ধারা ১৬৩ অনুযায়ী ন্যূনতম কর প্রযোজ্য)।',
      },
      {
        code: 'SUNK' as const,
        label: `Protective Customs Duties (CD ${current.effectiveRates.cd}% + RD ${current.effectiveRates.rd}% + SD ${current.effectiveRates.sd}%)`,
        banglaLabel: `কাস্টমস শুল্কসমূহ (CD ${current.effectiveRates.cd}% + RD ${current.effectiveRates.rd}% + SD ${current.effectiveRates.sd}%)`,
        amountBdt: sunkDutiesBdt,
        shareOfTotalTaxPercent: pctShare(sunkDutiesBdt),
        recoverableForLocalSale: false,
        recoverableForExport: true,
        mechanism: 'Non-rebateable for local sales; 100% refundable via DEDO Duty Drawback if re-exported!',
        banglaMechanism: 'স্থানীয় বিক্রয়ে অফেরতযোগ্য (Sunk Cost); তবে পণ্য রপ্তানি করলে DEDO এর মাধ্যমে ১০০% শুল্ক প্রত্যর্পণযোগ্য!',
        condition:
          'Lower this cost via Capital Machinery SRO (1% CD), APTA/SAFTA/Bhutan PTA origin, or Bonded/EPZ zero-tax import.',
        banglaCondition:
          'ক্যাপিটাল মেশিনারি SRO, APTA/SAFTA/ভুটান PTA সনদ অথবা বন্ড/EPZ সুবিধায় এই শুল্ক কমানো বা শূন্য করা যায়।',
      },
    ],
  };

  // =========================================================================
  // 3. ZERO-TAX / NEAR-ZERO DUTY LEGAL PATHWAYS
  // =========================================================================
  const zeroTaxOptions: ZeroTaxPathway[] = [];

  const isBondChapter = BOND_ELIGIBLE_CHAPTERS.has(entry.chapter);
  zeroTaxOptions.push({
    id: 'zero-bonded-warehouse',
    title: '100% Export-Oriented Customs Bonded Warehouse (0% Duty · ৳0 Tax)',
    banglaTitle: '১০০% রপ্তানিমুখী কাস্টমস বন্ডেড ওয়্যারহাউস (০% শুল্ক · ৳০ কর)',
    legalAuthority: 'Customs Act 2023 (Ch. XI) & Bonded Warehouse Licensing Rules',
    resultingTtiPercent: 0,
    resultingPortTaxBdt: 0,
    taxSavedBdt: current.totalTaxBdt,
    eligibilityBadge: isBondChapter ? 'Directly Eligible' : 'Export / Free-Zone License',
    banglaEligibilityBadge: isBondChapter ? 'সরাসরি বন্ড উপযোগী পণ্য' : 'রপ্তানি বন্ড লাইসেন্স আবশ্যক',
    eligibleForCurrentProduct: isBondChapter || entry.sroEligibleCapitalMachinery,
    summary: isBondChapter
      ? `Chapter ${entry.chapter} (${entry.commercialName}) is a prime export-input category eligible for 0% duty/VAT clearance against Back-to-Back LCs & UD/UP!`
      : `Direct or deemed exporters holding a Special/General Customs Bond License can import approved production inputs at 0% CD, 0% RD, 0% SD, 0% VAT, 0% AIT & 0% AT.`,
    banglaSummary: isBondChapter
      ? `চ্যাপ্টার ${entry.chapter} (${entry.commercialName}) গার্মেন্টস/চামড়া/রপ্তানি শিল্পের সরাসরি বন্ড উপযোগী উপকরণ — ব্যাক-টু-ব্যাক এলসি ও UD/UP এর বিপরীতে সম্পূর্ণ ০% শুল্কে খালাসযোগ্য!`
      : `কাস্টমস বন্ড লাইসেন্সধারী প্রত্যক্ষ বা প্রচ্ছন্ন রপ্তানিকারক প্রতিষ্ঠান অনুমোদিত কাঁচামাল ০% CD, ০% ভ্যাট ও ০% অগ্রিম করে আমদানি করতে পারে।`,
    requirements: [
      'Valid Customs Bonded Warehouse License (CBC Dhaka / Chattogram / Khulna)',
      'Export Master LC / Sales Contract & Back-to-Back Import LC',
      'BGMEA / BKMEA / BTMA / LFMEAB Utilization Declaration (UD) or Bond Passbook entitlement',
    ],
    banglaRequirements: [
      'কাস্টমস বন্ড কমিশনারেট প্রদত্ত বৈধ বন্ডেড ওয়্যারহাউস লাইসেন্স',
      'মাস্টার এক্সপোর্ট এলসি এবং ব্যাক-টু-ব্যাক ইমপোর্ট এলসি',
      'BGMEA / BKMEA এর ইউটিলাইজেশন ডিক্লারেশন (UD) বা বন্ড পাসবুক এন্ট্রি',
    ],
    quickAction:
      input.regime === 'export_bonded'
        ? undefined
        : {
            type: 'set_regime',
            regime: 'export_bonded',
            label: 'Simulate 0% Bonded Import',
          },
  });

  zeroTaxOptions.push({
    id: 'zero-epz-beza-hitech',
    title: 'BEPZA (EPZ), BEZA Economic Zone & Hi-Tech Park Import (0% All Taxes)',
    banglaTitle: 'EPZ (BEPZA), অর্থনৈতিক অঞ্চল (BEZA) ও হাই-টেক পার্ক আমদানি (সম্পূর্ণ ০% কর)',
    legalAuthority: 'BEPZA Act, BEZA Act 2010 & Bangladesh Hi-Tech Park Authority SROs',
    resultingTtiPercent: 0,
    resultingPortTaxBdt: 0,
    taxSavedBdt: current.totalTaxBdt,
    eligibilityBadge: 'Export / Free-Zone License',
    banglaEligibilityBadge: 'EPZ / ইকোনমিক জোন সুবিধা',
    eligibleForCurrentProduct: true,
    summary:
      'Industrial units located inside CEPZ, DEPZ, KEPZ, Mirsarai National Special Economic Zone (BEZA), Araihazar BSEZ, or Kaliakoir Hi-Tech Park enjoy 100% duty-free & VAT-free import of capital machinery, spares, construction materials & raw materials.',
    banglaSummary:
      'CEPZ, DEPZ, মিরসরাই ইকোনমিক জোন (BEZA) বা হাই-টেক পার্কে অবস্থিত শিল্প প্রতিষ্ঠানসমূহ ক্যাপিটাল মেশিনারি, খুচরা যন্ত্রাংশ ও কাঁচামাল সম্পূর্ণ ০% শুল্ক ও ০% ভ্যাটে আমদানি করতে পারে।',
    requirements: [
      'BEPZA / BEZA / BHTPA Online Import Permit (IP) issued via Zone One-Stop Service (OSS)',
      'Dedicated Zone Customs Passbook & Escorted Bonded Transit from Port to Zone Gate',
    ],
    banglaRequirements: [
      'BEPZA / BEZA / BHTPA ওয়ান-স্টপ সার্ভিস (OSS) হতে অনলাইন ইমপোর্ট পারমিট (IP)',
      'জোন কাস্টমস ক্লিয়ারেন্স ও পোর্ট থেকে জোনে বন্ডেড ট্রানজিট পাস',
    ],
    quickAction:
      input.regime === 'export_bonded'
        ? undefined
        : {
            type: 'set_regime',
            regime: 'export_bonded',
            label: 'Simulate 0% EPZ / BEZA Zone',
          },
  });

  if (entry.rates.cd === 0) {
    zeroTaxOptions.push({
      id: 'zero-statutory-cd',
      title: `Statutory 0% Customs Duty Tariff Line (${entry.formattedHs8})`,
      banglaTitle: `সরকারি ট্যারিফ তফসিলে সরাসরি ০% কাস্টমস ডিউটি (${entry.formattedHs8})`,
      legalAuthority: 'Bangladesh Customs Act 2023 — First Schedule Operative Tariff (0% CD)',
      resultingTtiPercent: current.ttiPercent,
      resultingPortTaxBdt: current.totalTaxBdt,
      taxSavedBdt: 0,
      eligibilityBadge: 'Directly Eligible',
      banglaEligibilityBadge: 'স্বয়ংক্রিয়ভাবে ০% CD প্রযোজ্য',
      eligibleForCurrentProduct: true,
      summary: `Great news: ${entry.formattedHs8} (${entry.commercialName}) already carries 0% Statutory Customs Duty (CD), 0% RD, and 0% SD under the NBR First Schedule! Any remaining VAT/AT/AIT paid at port is recoverable via rebate.`,
      banglaSummary: `সুখবর: ${entry.formattedHs8} (${entry.commercialName}) পণ্যটিতে NBR ট্যারিফ তফসিলে শুরু থেকেই ০% কাস্টমস ডিউটি (CD), ০% RD এবং ০% SD প্রযোজ্য!`,
      requirements: [
        'Ensure exact technical specs on Commercial Invoice & Lab/Catalogue match ' + entry.formattedHs8,
        'Claim remaining AT/AIT/VAT credits via Mushak-9.1 and annual tax return for 0% net sunk tax',
      ],
      banglaRequirements: [
        'কমার্শিয়াল ইনভয়েস ও ক্যাটালগে ' + entry.formattedHs8 + ' এর সঠিক কারিগরি বিবরণ উল্লেখ রাখুন',
        'অবশিষ্ট AT/AIT/ভ্যাট রিটার্নে সমন্বয় করে নিট শুল্ক খরচ ০%-এ নামিয়ে আনুন',
      ],
    });
  } else if (entry.sroEligibleCapitalMachinery) {
    const simCap = calculateNbrAssessment({ ...input, regime: 'capital_machinery' });
    zeroTaxOptions.push({
      id: 'near-zero-cap-machinery',
      title: 'Near-Zero 1% Capital Machinery SRO (0% VAT · 0% RD · 0% SD · 0% AIT · 0% AT)',
      banglaTitle: 'প্রায় শূন্য কর (১% CD) ক্যাপিটাল মেশিনারি SRO — ভ্যাট, RD, SD, AIT ও AT সম্পূর্ণ ০%!',
      legalAuthority: 'NBR Capital Machinery Concessionary SRO & VAT Exemption Schedule',
      resultingTtiPercent: simCap.ttiPercent,
      resultingPortTaxBdt: simCap.totalTaxBdt,
      taxSavedBdt: Math.max(0, round2(current.totalTaxBdt - simCap.totalTaxBdt)),
      eligibilityBadge: 'Directly Eligible',
      banglaEligibilityBadge: 'কারখানার জন্য সরাসরি প্রযোজ্য',
      eligibleForCurrentProduct: true,
      summary: `Eliminates 100% of Import VAT, RD, SD, AIT, and AT on ${entry.formattedHs8}, leaving only a nominal 1% Customs Duty (${simCap.ttiPercent.toFixed(2)}% TTI).`,
      banglaSummary: `${entry.formattedHs8} মেশিনারিতে আমদানি ভ্যাট, RD, SD, AIT ও AT সম্পূর্ণ ০% হয়ে যায় — শুধুমাত্র নামমাত্র ১% কাস্টমস ডিউটি প্রযোজ্য!`,
      requirements: [
        'Industrial IRC + BIDA / BSCIC / Textiles Machinery Recommendation',
        'Customs Indemnity Bond (non-transfer undertaking for 3–5 years)',
      ],
      banglaRequirements: [
        'ইন্ডাস্ট্রিয়াল IRC এবং BIDA / BSCIC / বস্ত্র অধিদপ্তরের মেশিনারি সুপারিশপত্র',
        'কাস্টমস ইনডেমনিটি বন্ড (৩–৫ বছর হস্তান্তর না করার অঙ্গীকারনামা)',
      ],
      quickAction:
        input.regime === 'capital_machinery'
          ? undefined
          : {
              type: 'set_regime',
              regime: 'capital_machinery',
              label: 'Simulate 1% Capital Machinery',
            },
    });
  }

  // Bhutan PTA 0% CD Pathway
  if (entry.rates.cd > 0) {
    const simBhutan = calculateNbrAssessment({
      ...input,
      preferentialOrigin: 'bhutan_pta',
    });
    const bhutanSaved = Math.max(0, round2(current.totalTaxBdt - simBhutan.totalTaxBdt));
    const bhutanStrong = BHUTAN_STRONG_CHAPTERS.has(entry.chapter);
    zeroTaxOptions.push({
      id: 'zero-bhutan-pta',
      title: 'Bangladesh–Bhutan PTA Duty-Free Origin (0% Customs Duty on Covered Lines)',
      banglaTitle: 'বাংলাদেশ–ভুটান অগ্রাধিকারমূলক বাণিজ্য চুক্তি (Bhutan PTA — ০% কাস্টমস ডিউটি)',
      legalAuthority: 'Bangladesh–Bhutan Preferential Trade Agreement (PTA) 2020 SRO',
      resultingTtiPercent: simBhutan.ttiPercent,
      resultingPortTaxBdt: simBhutan.totalTaxBdt,
      taxSavedBdt: bhutanSaved,
      eligibilityBadge: 'Origin / SRO Specific',
      banglaEligibilityBadge: bhutanStrong ? 'ভুটান পণ্যে উচ্চ সম্ভাবনা' : 'PTA তালিকাভুক্ত পণ্যে প্রযোজ্য',
      eligibleForCurrentProduct: bhutanStrong,
      summary: bhutanStrong
        ? `Chapter ${entry.chapter} includes flagship Bhutan PTA duty-free exports (boulders/limestone, ferro-silicon, oranges, apples, ginger, fruit juice) entering Bangladesh via Burimari Land Port at 0% CD!`
        : `If ${entry.formattedHs8} appears on Bangladesh's Bhutan PTA Concession Schedule and meets Rules of Origin, Customs Duty drops to 0% (${simBhutan.ttiPercent.toFixed(2)}% TTI).`,
      banglaSummary: bhutanStrong
        ? `চ্যাপ্টার ${entry.chapter} এর বহু পণ্য (পাথর, ফেরো-সিলিকন, কমলা, আপেল, আদা, ফলের জুস) ভুটান PTA চুক্তির আওতায় বুড়িমারী স্থলবন্দর দিয়ে ০% কাস্টমস ডিউটিতে আমদানিযোগ্য!`
        : `পণ্যটি বাংলাদেশ-ভুটান PTA চুক্তির তালিকাভুক্ত হলে এবং ভুটানের কান্ট্রি অব অরিজিন সনদ থাকলে কাস্টমস ডিউটি ০% হয়ে যায়।`,
      requirements: [
        'Certificate of Origin (Form PTA-BB) issued by Dept. of Trade, Royal Govt. of Bhutan',
        'Direct Overland Transit via Phuentsholing–Jaigaon–Changrabandha–Burimari corridor',
      ],
      banglaRequirements: [
        'ভুটান সরকারের বাণিজ্য বিভাগ প্রদত্ত Form PTA-BB কান্ট্রি অব অরিজিন সনদ',
        'ফুয়েন্টশোলিং–বুড়িমারী স্থলবন্দর ট্রানজিট রুট ডকুমেন্টেশন',
      ],
      quickAction:
        input.preferentialOrigin === 'bhutan_pta'
          ? undefined
          : {
              type: 'set_origin',
              origin: 'bhutan_pta',
              label: 'Simulate Bhutan PTA (0% CD)',
            },
    });
  }

  // DEDO Post-Export Duty Drawback + Zero-Rated VAT
  zeroTaxOptions.push({
    id: 'zero-dedo-drawback',
    title: 'Post-Export 100% Duty Drawback (DEDO) + 0% Zero-Rated Export VAT',
    banglaTitle: 'রপ্তানির পর ১০০% শুল্ক প্রত্যর্পণ (DEDO) + ০% শূন্য-হার রপ্তানি ভ্যাট',
    legalAuthority: 'Section 24, VAT & SD Act 2012 & Duty Exemption and Drawback Office (DEDO) Rules',
    resultingTtiPercent: 0,
    resultingPortTaxBdt: 0,
    taxSavedBdt: current.totalTaxBdt,
    eligibilityBadge: 'Export / Free-Zone License',
    banglaEligibilityBadge: 'বন্ডবিহীন রপ্তানিকারকদের জন্য',
    eligibleForCurrentProduct: true,
    summary:
      'Exporters without a Bonded Warehouse license pay duties upfront at import, then claim 100% refund of CD, RD, SD (via DEDO flat/actual rate) plus full VAT/AT refund under Section 24 Zero-Rated Export rules — achieving 0% net tax!',
    banglaSummary:
      'বন্ড লাইসেন্স নেই এমন রপ্তানিকারকগণ আমদানির সময় শুল্ক পরিশোধ করলেও পণ্য রপ্তানির পর DEDO হতে CD, RD, SD এবং ধারা ২৪ অনুযায়ী ভ্যাট ও AT ১০০% ফেরত পেয়ে নিট শূন্য কর (০%) সুবিধা পান!',
    requirements: [
      'Import Bill of Entry + Export Bill of Entry (Shipping Bill) & Export Proceeds Realization Certificate (PRC)',
      'Mushak-4.3 Input-Output Coefficient & DEDO Drawback Application within 6 months of export',
    ],
    banglaRequirements: [
      'ইমপোর্ট বিল অব এন্ট্রি, এক্সপোর্ট শিপিং বিল এবং ব্যাংক PRC (রপ্তানি মূল্য প্রত্যাবাসন সনদ)',
      'মূসক-৪.৩ সহগ ঘোষণা এবং রপ্তানির ৬ মাসের মধ্যে DEDO অফিসে প্রত্যর্পণ আবেদন',
    ],
  });

  // =========================================================================
  // 4. BEST IMPORT DESTINATION OPTIONS (Bangladesh Ports + Origin Corridors + Regional Hubs)
  // =========================================================================
  const isVehicle = entry.chapter === '87';
  const isAirFriendly = AIR_FREIGHT_FRIENDLY_PREFIXES.some(
    (p) => entry.hs8.startsWith(p) || entry.chapter === p
  );
  const isSouthAsiaOrigin =
    input.preferentialOrigin === 'safta' ||
    input.preferentialOrigin === 'bhutan_pta' ||
    /india|bhutan|nepal/i.test(sourceMeta?.suggestedOriginCountry || '');
  const isBondedMode = input.regime === 'export_bonded';
  const cifBdt = current.valuation.cifBdt;

  const rawPorts: Omit<BangladeshPortOption, 'recommended'>[] = [
    {
      id: 'port-chattogram',
      portName: 'Chattogram Sea Port (FCL / LCL Gateway)',
      banglaPortName: 'চট্টগ্রাম সমুদ্রবন্দর (প্রধান FCL / LCL গেটওয়ে)',
      customsHouse: 'Custom House, Chattogram (CHC — 301)',
      mode: 'Sea',
      suitabilityScore: isBondedMode ? 86 : isSouthAsiaOrigin ? 80 : isVehicle ? 83 : 93,
      estimatedTransitDays: '10–18 days (Asia) · 26–35 days (EU/US)',
      clearanceSpeed: '3–6 working days (ASYCUDA Green/Yellow)',
      estimatedFreightAdjustmentPct: 0,
      estimatedTotalLandedBdt: current.totalLandedCostBdt,
      bestForSummary:
        'Deepest feeder connectivity from China, Singapore, Colombo & Port Klang; lowest ocean container rate per CBM/MT for commercial & industrial cargo.',
      banglaBestForSummary:
        'চীন, সিঙ্গাপুর ও কলম্বো থেকে সর্বাধিক জাহাজ সংযোগ এবং সর্বনিম্ন সমুদ্র ভাড়ায় কন্টেইনার ও শিল্প পণ্য আমদানির প্রধান বন্দর।',
    },
    {
      id: 'port-mongla',
      portName: 'Mongla Sea Port (Fast-Track via Padma Bridge Corridor)',
      banglaPortName: 'মোংলা সমুদ্রবন্দর (পদ্মা সেতু এক্সপ্রেস করিডোর)',
      customsHouse: 'Custom House, Mongla (CHM — 501)',
      mode: 'Sea',
      suitabilityScore: isVehicle ? 96 : ['10', '15', '25', '27', '31', '72', '84'].includes(entry.chapter) ? 89 : 79,
      estimatedTransitDays: '12–19 days (Sea) + 4 hrs road to Dhaka via Padma Bridge',
      clearanceSpeed: '1–3 working days (Low berth congestion)',
      estimatedFreightAdjustmentPct: 0.4,
      estimatedTotalLandedBdt: round2(current.totalLandedCostBdt + cifBdt * 0.004),
      bestForSummary: isVehicle
        ? '#1 Recommended Port for Chapter 87 Reconditioned/New Vehicles — dedicated Ro-Ro car yards, faster assessment & lower port demurrage than Chattogram!'
        : 'Zero berth waiting time, lower port storage charges, and fast 4-hour highway transit to Dhaka/Savar/Gazipur via Padma Bridge.',
      banglaBestForSummary: isVehicle
        ? 'চ্যাপ্টার ৮৭ গাড়ি আমদানির #১ সেরা বন্দর — ডেডিকেটেড Ro-Ro কার ইয়ার্ড, দ্রুত শুল্কায়ন এবং চট্টগ্রামের তুলনায় কম ডেমারেজ খরচ!'
        : 'জাহাজ জটমুক্ত দ্রুত খালাস এবং পদ্মা সেতু হয়ে মাত্র ৪ ঘণ্টায় ঢাকা/গাজীপুর শিল্পাঞ্চলে পণ্য পরিবহনের সাশ্রয়ী বিকল্প।',
    },
    {
      id: 'port-dhaka-air',
      portName: 'Dhaka Hazrat Shahjalal Int’l Airport (Air Cargo Village)',
      banglaPortName: 'হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর, ঢাকা (এয়ার কার্গো)',
      customsHouse: 'Custom House, Dhaka (CHD — 101)',
      mode: 'Air',
      suitabilityScore:
        isAirFriendly && current.valuation.invoiceValueBdt / Math.max(1, input.quantity) > 18000
          ? 95
          : isAirFriendly
          ? 88
          : 64,
      estimatedTransitDays: '2–5 days door-to-port worldwide',
      clearanceSpeed: '24–48 hours (Express / Cold-Chain)',
      estimatedFreightAdjustmentPct: 3.5,
      estimatedTotalLandedBdt: round2(current.totalLandedCostBdt + cifBdt * 0.035),
      bestForSummary:
        'Ideal for high-value laptops, smartphones, semiconductors, pharma/vaccines, critical factory spare parts & urgent buyer samples where working-capital speed outweighs air freight.',
      banglaBestForSummary:
        'উচ্চমূল্যের ল্যাপটপ, মোবাইল, আইসি চিপ, ওষুধ/ভ্যাকসিন, জরুরি মেশিন পার্টস এবং বায়ার স্যাম্পল ২–৫ দিনে দ্রুত খালাসের সেরা গন্তব্য।',
    },
    {
      id: 'port-benapole-land',
      portName: 'Benapole / Bhomra / Burimari Land Port (SAFTA & Bhutan Overland)',
      banglaPortName: 'বেনাপোল / ভোমরা / বুড়িমারী স্থলবন্দর (ভারত ও ভুটান রুট)',
      customsHouse: 'Benapole Custom House (401) / Burimari LCS',
      mode: 'Land',
      suitabilityScore: isSouthAsiaOrigin ? 97 : ['52', '07', '08', '09', '25', '28', '29', '72'].includes(entry.chapter) ? 85 : 68,
      estimatedTransitDays: '2–5 days cross-border truck/rail',
      clearanceSpeed: '1–3 working days',
      estimatedFreightAdjustmentPct: -2.2,
      estimatedTotalLandedBdt: Math.max(0, round2(current.totalLandedCostBdt - cifBdt * 0.022)),
      bestForSummary:
        'Lowest transport cost & fastest turnaround when sourcing from India (SAFTA 0–5% CD) or Bhutan (PTA 0% CD via Burimari) for cotton, chemicals, steel, agro & machinery.',
      banglaBestForSummary:
        'ভারত (SAFTA শুল্ক ছাড়) বা ভুটান (PTA ০% শুল্ক) থেকে তুলা, কেমিক্যাল, স্টিল, মেশিনারি ও কৃষিপণ্য সবচেয়ে কম পরিবহন খরচে আনার সেরা স্থলবন্দর।',
    },
    {
      id: 'port-epz-beza',
      portName: 'CEPZ / DEPZ / Mirsarai BEZA Free-Zone Customs Gate',
      banglaPortName: 'CEPZ / DEPZ / মিরসরাই BEZA শুল্কমুক্ত শিল্প জোন গেট',
      customsHouse: 'EPZ / BEZA Bonded Customs Assessment',
      mode: 'Free-Zone',
      suitabilityScore: isBondedMode ? 99 : isBondChapter || entry.sroEligibleCapitalMachinery ? 84 : 72,
      estimatedTransitDays: 'Direct Bonded Escort from Port/Airport to Zone',
      clearanceSpeed: 'Same-day Zone Gate Pass on IP',
      estimatedFreightAdjustmentPct: 0,
      estimatedTotalLandedBdt: round2(current.valuation.cifBdt), // 0% duty & taxes inside EPZ/BEZA
      bestForSummary:
        'Zero-Tax (৳0 Duty/VAT) destination inside Export Processing Zones & Economic Zones — saves 100% of port taxes for export manufacturers.',
      banglaBestForSummary:
        'রপ্তানিমুখী শিল্প প্রতিষ্ঠানের জন্য সম্পূর্ণ শুল্কমুক্ত (৳০ কর) গন্তব্য — পোর্ট থেকে সরাসরি বন্ডেড ট্রানজিটে ফ্যাক্টরিতে খালাস।',
    },
  ];

  rawPorts.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  const portDestinations: BangladeshPortOption[] = rawPorts.map((p, idx) => ({
    ...p,
    recommended: idx === 0,
  }));

  // Global Sourcing Country Corridors (with real NBR Preferential Tariff + Freight Modeling)
  const baseInputMfn: TaxAssessmentInput = {
    ...input,
    valuationMode: 'invoice_to_av',
    incoterm: 'FOB',
    preferentialOrigin: 'none',
    customRateOverrides: undefined,
  };
  const mfnBaseline = calculateNbrAssessment({ ...baseInputMfn, freightPercent: 5.5 });

  const corridorDefs: {
    id: string;
    country: string;
    banglaCountry: string;
    agreementLabel: string;
    origin: PreferentialOrigin;
    freightPct: number;
    transitDays: string;
    entryPort: string;
  }[] = [
    {
      id: 'src-china',
      country: 'China (APTA Preferential Corridor)',
      banglaCountry: 'চীন (APTA শুল্ক ছাড় রুট)',
      agreementLabel: entry.rates.cd >= 5 ? 'APTA (-20% CD MoP)' : 'MFN / 0% Base CD',
      origin: entry.rates.cd >= 5 ? 'apta' : 'none',
      freightPct: 4.5,
      transitDays: '11–15 days (Shanghai/Shenzhen/Ningbo → Chattogram)',
      entryPort: 'Chattogram Sea Port',
    },
    {
      id: 'src-india',
      country: 'India (SAFTA + Overland Corridor)',
      banglaCountry: 'ভারত (SAFTA শুল্ক ছাড় + স্থলবন্দর রুট)',
      agreementLabel: entry.rates.cd > 5 ? 'SAFTA (5% CD Cap)' : 'SAFTA / MFN',
      origin: entry.rates.cd > 5 ? 'safta' : 'none',
      freightPct: 2.5,
      transitDays: '3–6 days (Petrapole–Benapole / Kolkata–Chattogram)',
      entryPort: 'Benapole Land Port / Chattogram',
    },
    {
      id: 'src-korea',
      country: 'South Korea (APTA High-Spec Corridor)',
      banglaCountry: 'দক্ষিণ কোরিয়া (APTA হাই-টেক ও পলিমার রুট)',
      agreementLabel: entry.rates.cd >= 5 ? 'APTA (-20% CD MoP)' : 'MFN / 0% Base CD',
      origin: entry.rates.cd >= 5 ? 'apta' : 'none',
      freightPct: 5.0,
      transitDays: '13–17 days (Busan → Chattogram)',
      entryPort: 'Chattogram Sea Port',
    },
    {
      id: 'src-vietnam',
      country: 'Vietnam / Malaysia / Thailand (ASEAN Fast Feeder)',
      banglaCountry: 'ভিয়েতনাম / মালয়েশিয়া / থাইল্যান্ড (দ্রুত ফিডার রুট)',
      agreementLabel: 'Standard MFN Tariff',
      origin: 'none',
      freightPct: 3.8,
      transitDays: '6–10 days (Ho Chi Minh / Port Klang → Chattogram)',
      entryPort: 'Chattogram / Mongla Port',
    },
    {
      id: 'src-bhutan',
      country: 'Bhutan (PTA Duty-Free Overland Corridor)',
      banglaCountry: 'ভুটান (PTA ০% ডিউটি বুড়িমারী স্থল রুট)',
      agreementLabel: 'Bhutan PTA (0% CD on Eligible List)',
      origin: 'bhutan_pta',
      freightPct: 2.8,
      transitDays: '2–4 days (Phuentsholing → Burimari LCS)',
      entryPort: 'Burimari Land Port',
    },
    {
      id: 'src-eu-us-jp',
      country: 'EU / USA / Japan (OEM Precision & Brand)',
      banglaCountry: 'ইউরোপ / যুক্তরাষ্ট্র / জাপান (OEM ব্র্যান্ড ও মেশিনারি)',
      agreementLabel: 'Standard MFN Tariff',
      origin: 'none',
      freightPct: 7.5,
      transitDays: '18–34 days Sea · 3–5 days Air',
      entryPort: isVehicle ? 'Mongla Sea Port' : isAirFriendly ? 'Dhaka HSIA / Chattogram' : 'Chattogram Sea Port',
    },
  ];

  const rawCorridors = corridorDefs.map((c) => {
    const sim = calculateNbrAssessment({
      ...baseInputMfn,
      preferentialOrigin: c.origin,
      freightPercent: c.freightPct,
    });
    return {
      id: c.id,
      country: c.country,
      banglaCountry: c.banglaCountry,
      agreementLabel: c.agreementLabel,
      preferentialOrigin: c.origin,
      effectiveCdPercent: sim.effectiveRates.cd,
      ttiPercent: sim.ttiPercent,
      estimatedFreightPct: c.freightPct,
      totalTaxBdt: sim.totalTaxBdt,
      estimatedLandedBdt: sim.totalLandedCostBdt,
      savingsVsMfnBdt: round2(mfnBaseline.totalLandedCostBdt - sim.totalLandedCostBdt),
      transitDays: c.transitDays,
      recommendedEntryPort: c.entryPort,
      quickAction:
        input.preferentialOrigin === c.origin
          ? undefined
          : {
              type: 'set_origin' as const,
              origin: c.origin,
              label: `Apply ${c.country.split(' ')[0]} Origin`,
            },
    };
  });

  // Rank practical global corridors (Bhutan only #1 if product is in Bhutan export chapters; otherwise lowest landed cost among major industrial suppliers China/India/Vietnam/Korea)
  rawCorridors.sort((a, b) => {
    const aPenalty = a.id === 'src-bhutan' && !BHUTAN_STRONG_CHAPTERS.has(entry.chapter) ? 1e9 : 0;
    const bPenalty = b.id === 'src-bhutan' && !BHUTAN_STRONG_CHAPTERS.has(entry.chapter) ? 1e9 : 0;
    return a.estimatedLandedBdt + aPenalty - (b.estimatedLandedBdt + bPenalty);
  });

  const sourcingCorridors: GlobalSourcingCorridor[] = rawCorridors.map((c, idx) => ({
    ...c,
    recommended: idx === 0,
  }));

  // Regional Import Destination Hub Tariff Benchmark (Comparing BD Commercial vs BD EPZ vs Regional Trade Hubs)
  const avBdt = current.valuation.assessableValueBdt;
  const indiaBcd = entry.rates.cd === 0 ? 0 : entry.rates.cd <= 5 ? 7.5 : entry.rates.cd <= 15 ? 10 : 20;
  const indiaEffectivePct = round2(indiaBcd * 1.1 + (100 + indiaBcd * 1.1) * 0.18 - 100 + indiaBcd * 1.1 > 0 ? indiaBcd * 1.1 + (1 + (indiaBcd * 1.1) / 100) * 18 : 18);
  const vietnamDuty = entry.rates.cd === 0 ? 0 : entry.rates.cd <= 10 ? 5 : 12;
  const vietnamEffectivePct = round2(vietnamDuty + (1 + vietnamDuty / 100) * 8);

  const regionalBenchmarks: RegionalHubBenchmark[] = [
    {
      countryOrZone: 'Bangladesh — EPZ / BEZA / Bonded Zone',
      banglaCountryOrZone: 'বাংলাদেশ — EPZ / BEZA / বন্ডেড জোন',
      dutyRateLabel: '0% CD · 0% SD',
      vatOrGstLabel: '0% VAT & AT',
      estimatedEffectiveTaxPct: 0,
      estimatedTotalTaxBdt: 0,
      roleNote: '#1 Zero-tax destination in Bangladesh for export-oriented manufacturing & FDI.',
      banglaRoleNote: 'রপ্তানিমুখী উৎপাদন ও FDI কারখানার জন্য বাংলাদেশে সম্পূর্ণ ০% করের সেরা গন্তব্য।',
      highlight: true,
    },
    {
      countryOrZone: 'Singapore (Free Port Re-Export Hub)',
      banglaCountryOrZone: 'সিঙ্গাপুর (ফ্রি-পোর্ট ট্রান্সশিপমেন্ট হাব)',
      dutyRateLabel: '0% Customs Duty',
      vatOrGstLabel: '9% GST (100% MES/Input Credit)',
      estimatedEffectiveTaxPct: 9.0,
      estimatedTotalTaxBdt: round2(avBdt * 0.09),
      roleNote: '0% duty regional consolidation & LCL transshipment hub before feeder shipping to Chattogram.',
      banglaRoleNote: 'চট্টগ্রামে ফিডার শিপিংয়ের আগে আঞ্চলিক কনসলিডেশন ও রি-এক্সপোর্টের ০% ডিউটি হাব।',
    },
    {
      countryOrZone: 'UAE / Dubai (JAFZA / Mainland GCC Hub)',
      banglaCountryOrZone: 'সংযুক্ত আরব আমিরাত / দুবাই (JAFZA / রি-এক্সপোর্ট হাব)',
      dutyRateLabel: '0% Free Zone / 5% Mainland',
      vatOrGstLabel: '5% UAE VAT',
      estimatedEffectiveTaxPct: 10.25,
      estimatedTotalTaxBdt: round2(avBdt * 0.1025),
      roleNote: 'Low-duty Middle East trading & distribution hub (0% inside Jebel Ali Free Zone).',
      banglaRoleNote: 'মধ্যপ্রাচ্য ও আন্তর্জাতিক ট্রেডিং ডিস্ট্রিবিউশন হাব (জেবেল আলী ফ্রি জোনে ০% শুল্ক)।',
    },
    {
      countryOrZone: 'Vietnam (ASEAN Manufacturing Benchmark)',
      banglaCountryOrZone: 'ভিয়েতনাম (ASEAN ম্যানুফ্যাকচারিং বেঞ্চমার্ক)',
      dutyRateLabel: `~${vietnamDuty}% MFN (0% ASEAN/RCEP)`,
      vatOrGstLabel: '8%–10% VAT (Creditable)',
      estimatedEffectiveTaxPct: vietnamEffectivePct,
      estimatedTotalTaxBdt: round2(avBdt * (vietnamEffectivePct / 100)),
      roleNote: 'Key ASEAN competitor benchmark; broad FTA network lowers raw material duty.',
      banglaRoleNote: 'ASEAN অঞ্চলের প্রধান প্রতিযোগী আমদানি গন্তব্যের শুল্ক হারের তুলনামূলক চিত্র।',
    },
    {
      countryOrZone: 'India (CBIC Domestic Tariff Area)',
      banglaCountryOrZone: 'ভারত (CBIC সাধারণ শুল্ক অঞ্চল)',
      dutyRateLabel: `~${indiaBcd}% BCD + 10% SWS`,
      vatOrGstLabel: '18% IGST (Input ITC)',
      estimatedEffectiveTaxPct: indiaEffectivePct,
      estimatedTotalTaxBdt: round2(avBdt * (indiaEffectivePct / 100)),
      roleNote: 'South Asian domestic import benchmark (IGST creditable like NBR 15% VAT).',
      banglaRoleNote: 'দক্ষিণ এশিয়ার প্রতিবেশী দেশের আমদানি শুল্ক ও IGST করভারের তুলনামূলক চিত্র।',
    },
    {
      countryOrZone: `Bangladesh — Standard Port (${current.regime})`,
      banglaCountryOrZone: `বাংলাদেশ — সাধারণ বন্দর খালাস (${current.regime})`,
      dutyRateLabel: `CD ${current.effectiveRates.cd}% · RD ${current.effectiveRates.rd}% · SD ${current.effectiveRates.sd}%`,
      vatOrGstLabel: `VAT ${current.effectiveRates.vat}% · AIT ${current.effectiveRates.ait}% · AT ${current.effectiveRates.at}%`,
      estimatedEffectiveTaxPct: current.ttiPercent,
      estimatedTotalTaxBdt: current.totalTaxBdt,
      roleNote: `Net unrecoverable sunk duty after VAT/AT/AIT rebate is only ${effectiveSunkRateOnAvPercent.toFixed(2)}% (${round2(current.netSunkDutyBdt).toLocaleString()} BDT).`,
      banglaRoleNote: `ভ্যাট, AT ও AIT রেয়াত নেওয়ার পর প্রকৃত অফেরতযোগ্য শুল্ক মাত্র ${effectiveSunkRateOnAvPercent.toFixed(2)}%!`,
      highlight: true,
    },
  ];

  return {
    alternativeDutyMatrix,
    rebateScope,
    zeroTaxOptions,
    portDestinations,
    sourcingCorridors,
    regionalBenchmarks,
  };
}
