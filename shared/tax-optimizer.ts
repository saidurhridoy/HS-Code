import { calculateNbrAssessment } from './tax-math';
import {
  DutyReductionOpportunity,
  RebatePlaybookItem,
  TariffEntry,
  TaxAssessmentInput,
  TaxAssessmentResult,
  TaxOptimizationPlan,
} from './types';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const BOND_ELIGIBLE_CHAPTERS = new Set([
  '32', '34', '35', '38', '39', '40', '41', '42', '48',
  '50', '51', '52', '53', '54', '55', '56', '58', '59', '60', '61', '62', '63', '64', '83', '96',
]);

const CKD_ASSEMBLY_HEADINGS = new Set([
  '8415', '8418', '8450', '8471', '8504', '8507', '8516', '8517', '8528', '8703', '8704', '8711', '9405',
]);

const BULK_VS_RETAIL_CHAPTERS = new Set([
  '04', '09', '15', '17', '18', '19', '20', '21', '30', '32', '33', '34', '38',
]);

/**
 * Generates quantified, legally grounded Bangladesh NBR technical duty-reduction strategies
 * and a post-clearance VAT/AT/AIT rebate compliance playbook for the active product & shipment.
 */
export function generateOptimizationPlan(
  entry: TariffEntry,
  input: TaxAssessmentInput,
  current: TaxAssessmentResult
): TaxOptimizationPlan {
  const opportunities: DutyReductionOpportunity[] = [];

  // 1. Capital Machinery SRO (1% CD, 0% RD, 0% SD, 0% VAT, 0% AIT, 0% AT)
  if (entry.sroEligibleCapitalMachinery && input.regime !== 'capital_machinery' && input.regime !== 'export_bonded') {
    const sim = calculateNbrAssessment({
      ...input,
      regime: 'capital_machinery',
    });
    const savings = round2(current.totalTaxBdt - sim.totalTaxBdt);
    if (savings > 0) {
      opportunities.push({
        id: 'cap-machinery-sro',
        category: 'SRO & License',
        title: 'Claim NBR Capital Machinery Concessionary SRO (1% CD · 0% VAT · 0% AT)',
        legalBasis: 'NBR Capital Machinery Concessionary SRO & VAT First Schedule / SRO Exemption',
        estimatedSavingsBdt: savings,
        newTtiPercent: sim.ttiPercent,
        applicability: 'High — Directly Applicable',
        summary: `Registered industrial factories importing Chapter ${entry.chapter} production machinery pay just 1% Customs Duty with 0% Import VAT & 0% AT — slashing port cash outflow from ${current.ttiPercent.toFixed(2)}% to ${sim.ttiPercent.toFixed(2)}% TTI.`,
        technicalSteps: [
          'Import under an active Industrial IRC (Ad-hoc or Regular) rather than a Commercial IRC.',
          'Ensure the exact 8-digit HS code and machine name appear in your BIDA / BSCIC / Textiles / BEZA approved Machinery List.',
          'Co-ship initial spare parts up to 10% of the main machine FOB value on the same LC & Invoice to get the same 1% CD concession on spares.',
          'Execute the required Customs Indemnity Bond undertaking not to transfer/sell the machinery within 3–5 years without NBR permission.',
        ],
        requiredDocuments: [
          'Industrial IRC & BIDA/Directorate Machinery Recommendation',
          'Factory Layout Plan & Fire/Environment Clearance',
          'Technical Catalogue / Brochure matching HS heading',
          'Customs Capital Machinery Indemnity Bond',
        ],
        quickAction: {
          type: 'set_regime',
          regime: 'capital_machinery',
          label: 'Simulate 1% Capital Machinery SRO',
        },
      });
    }
  }

  // 2. Industrial IRC Manufacturer Regime (AT 5% -> 3%)
  if (input.regime === 'commercial' && current.effectiveRates.at > 3) {
    const sim = calculateNbrAssessment({
      ...input,
      regime: 'industrial',
    });
    const savings = round2(current.totalTaxBdt - sim.totalTaxBdt);
    if (savings > 0) {
      opportunities.push({
        id: 'industrial-irc-at',
        category: 'SRO & License',
        title: 'Import as Industrial IRC Raw Material / Input (Reduce AT from 5% to 3%)',
        legalBasis: 'Section 31(2), VAT & Supplementary Duty Act 2012 & NBR Industrial Raw Material SROs',
        estimatedSavingsBdt: savings,
        newTtiPercent: sim.ttiPercent,
        applicability: 'Conditional — License / Origin Needed',
        summary: `Industrial manufacturers importing inputs recorded in their IRC entitlement & Mushak-4.3 Input-Output Coefficient pay 3% Advance Tax instead of 5% Commercial AT (and often qualify for lower industrial CD/AIT slabs on chemicals, polymers, steel & pharma inputs).`,
        technicalSteps: [
          'Declare the raw material/component in your Industrial IRC Passbook / Entitlement Sheet via CCI&E OLM portal.',
          'Submit Mushak-4.3 (Input-Output Coefficient) to your Divisional VAT Office listing this HS code as a direct production input.',
          'Provide your VAT Registration Certificate (Mushak-2.3) registered as "Manufacturer" during ASYCUDA Bill of Entry assessment.',
        ],
        requiredDocuments: [
          'Industrial IRC (CCI&E)',
          'Manufacturer BIN Certificate (Mushak-2.3)',
          'Approved Mushak-4.3 Input-Output Declaration',
        ],
        quickAction: {
          type: 'set_regime',
          regime: 'industrial',
          label: 'Simulate Industrial IRC (3% AT)',
        },
      });
    }
  }

  // 3. Preferential Trade Agreements — APTA (China/Korea/India) & SAFTA (South Asia)
  if (current.effectiveRates.cd >= 5 && input.preferentialOrigin === 'none' && input.regime !== 'export_bonded') {
    const simSafta = calculateNbrAssessment({
      ...input,
      preferentialOrigin: 'safta',
    });
    const saftaSavings = round2(current.totalTaxBdt - simSafta.totalTaxBdt);

    const simApta = calculateNbrAssessment({
      ...input,
      preferentialOrigin: 'apta',
    });
    const aptaSavings = round2(current.totalTaxBdt - simApta.totalTaxBdt);

    if (aptaSavings > 0) {
      opportunities.push({
        id: 'apta-preferential-coo',
        category: 'Preferential FTA/PTA',
        title: 'Claim APTA Preferential Duty Discount (China, South Korea, India, Sri Lanka)',
        legalBasis: 'Asia-Pacific Trade Agreement (APTA) Rules of Origin & NBR Preferential Tariff SRO',
        estimatedSavingsBdt: aptaSavings,
        newTtiPercent: simApta.ttiPercent,
        applicability: 'Conditional — License / Origin Needed',
        summary: `Because Supplementary Duty (SD), 15% VAT, and AT all compound on top of Customs Duty (CD), a ~20% APTA Margin of Preference cut on CD cascades down and lowers SD, VAT, and AT simultaneously!`,
        technicalSteps: [
          'Verify HS8 eligibility on Bangladesh’s APTA National Concession List before opening the LC.',
          'Instruct your Chinese/Korean/Indian supplier to obtain an official APTA Certificate of Origin (not a generic Chamber CoO) showing ≥45% regional value content (≥35% for LDCs).',
          'Ship via Direct Consignment (or obtain a Through Bill of Lading + Non-Manipulation Certificate from transit port customs such as Singapore/Colombo).',
        ],
        requiredDocuments: [
          'Original APTA Certificate of Origin (Form APTA)',
          'Through Bill of Lading & Transit Non-Manipulation Certificate (if transshipped)',
          'Commercial Invoice & Packing List referencing APTA CoO number',
        ],
        quickAction: {
          type: 'set_origin',
          origin: 'apta',
          label: 'Simulate APTA Origin (-20% CD)',
        },
      });
    }

    if (saftaSavings > aptaSavings && saftaSavings > 0) {
      opportunities.push({
        id: 'safta-preferential-coo',
        category: 'Preferential FTA/PTA',
        title: 'Claim SAFTA Preferential Tariff (0%–5% CD from India, Pakistan, Sri Lanka, Nepal)',
        legalBasis: 'SAFTA Agreement & NBR SAFTA Concessionary SRO (Non-Sensitive List)',
        estimatedSavingsBdt: saftaSavings,
        newTtiPercent: simSafta.ttiPercent,
        applicability: 'Conditional — License / Origin Needed',
        summary: `Goods originating in SAARC nations outside Bangladesh's SAFTA Sensitive List qualify for a 0%–5% Customs Duty ceiling, sharply cutting compounded SD, VAT & AT.`,
        technicalSteps: [
          'Confirm that HS code ' + entry.formattedHs8 + ' is NOT on Bangladesh’s SAFTA Sensitive List.',
          'Ensure supplier meets SAFTA Rules of Origin (Change in Tariff Heading CTH + ≥40%/30% Domestic Value Addition).',
          'Select the SAFTA CPC (Customs Procedure Code) in ASYCUDA World and attach original SAFTA Certificate of Origin.',
        ],
        requiredDocuments: [
          'Original SAFTA Certificate of Origin issued by designated Export Inspection Council / authority',
          'Direct Consignment / Land Customs or Sea Bill of Lading',
        ],
        quickAction: {
          type: 'set_origin',
          origin: 'safta',
          label: 'Simulate SAFTA Origin (5% CD Cap)',
        },
      });
    }
  }

  // 4. Bulk (>2.5 kg) vs Retail Packaging Subheading Tariff Engineering
  if (
    BULK_VS_RETAIL_CHAPTERS.has(entry.chapter) &&
    (entry.rates.cd >= 25 || entry.rates.sd >= 20) &&
    !/bulk|exceeding 2\.5|25 kg/i.test(entry.commercialName)
  ) {
    // Estimate savings if imported under bulk industrial slab (typically 10% CD, 0% RD, 0% SD)
    const simBulk = calculateNbrAssessment({
      ...input,
      regime: 'industrial',
      customRateOverrides: { cd: 10, rd: 0, sd: 0 },
    });
    const bulkSavings = round2(current.totalTaxBdt - simBulk.totalTaxBdt);

    if (bulkSavings > 0) {
      opportunities.push({
        id: 'bulk-packaging-engineering',
        category: 'Tariff Engineering',
        title: 'Import in Bulk (> 2.5 kg / 25 kg Bags/Drums) & Repack Locally to Eliminate Retail SD',
        legalBasis: 'Bangladesh Operative Tariff Schedule 8-Digit National Subheadings (Bulk vs. Retail Pack)',
        estimatedSavingsBdt: bulkSavings,
        newTtiPercent: simBulk.ttiPercent,
        applicability: 'Structural — Supply-Chain Engineering',
        summary: `NBR imposes heavy 25% CD + 20%–45% Supplementary Duty on retail consumer packs (≤ 2.5 kg), whereas bulk industrial packs (> 2.5 kg / 25 kg bags or drums) imported by BSTI/VAT-registered repackers/processors often carry 5%–10% CD and 0% SD!`,
        technicalSteps: [
          entry.hs8 === '04022110'
            ? 'Switch from 0402.21.10 (≤2.5 kg retail tin, 89.32% TTI) to 0402.21.90 (>2.5 kg bulk bag, 37.00% TTI) with a VAT-registered repacking plant.'
            : 'Check the adjacent .90 / bulk 8-digit BCT subheading in Chapter ' + entry.chapter + ' for packings exceeding 2.5 kg / bulk drums.',
          'Obtain BSTI local repacking/formulation license and Industrial IRC entitlement for bulk raw materials.',
          'Import bulk containers, package locally in Bangladesh-printed pouches/containers, and claim 100% input VAT credit on Mushak-9.1.',
        ],
        requiredDocuments: [
          'Industrial Repacking / Formulation IRC',
          'BSTI / DGDA Local Packaging License',
          'Mushak-4.3 Input-Output Declaration for Repacking',
        ],
        quickAction:
          entry.hs8 === '04022110'
            ? {
                type: 'switch_hs_query',
                query: 'Full cream milk powder in 25kg bulk industrial bag',
                label: 'Switch to 25kg Bulk HS 0402.21.90',
              }
            : undefined,
      });
    }
  }

  // 5. CKD / SKD Local Assembly vs Finished CBU Import
  if (CKD_ASSEMBLY_HEADINGS.has(entry.heading) && (entry.rates.cd >= 15 || entry.rates.sd >= 20)) {
    const simCkd = calculateNbrAssessment({
      ...input,
      regime: 'industrial',
      customRateOverrides: { cd: 5, rd: 0, sd: 0, at: 3 },
    });
    const ckdSavings = round2(current.totalTaxBdt - simCkd.totalTaxBdt);

    if (ckdSavings > 0) {
      opportunities.push({
        id: 'ckd-skd-assembly-sro',
        category: 'Tariff Engineering',
        title: 'Import as CKD / SKD Unassembled Kits Under NBR Local Manufacturing SRO',
        legalBasis: 'NBR "Made in Bangladesh" Electronics, IT, Home Appliance & Automotive CKD/SKD SROs',
        estimatedSavingsBdt: ckdSavings,
        newTtiPercent: simCkd.ttiPercent,
        applicability: 'Structural — Supply-Chain Engineering',
        summary: `Finished CBU imports under Heading ${entry.heading} face high protective CD/SD (${current.ttiPercent.toFixed(2)}% TTI). NBR grants dedicated SROs reducing component duty to 1%–10% CD & 0% SD for enlisted local CKD/SKD assemblers (mobile, IT/laptop, HVAC/AC, fridge, TV, motorcycle & UPS plants).`,
        technicalSteps: [
          'Enlist assembly/manufacturing plant under relevant NBR Sectoral SRO (e.g., Mobile Handset, Computer/IT, Home Appliance, or Motorcycle Policy).',
          'Ensure imported kits meet statutory knock-down criteria (e.g., unpopulated/semi-populated PCB or unpainted chassis per SRO annexure).',
          'Obtain annual NBR VAT Commissionerate & Ministry of Industries / Hi-Tech Park verification certificate.',
        ],
        requiredDocuments: [
          'NBR Sectoral CKD/SKD SRO Enlistment Certificate',
          'Industrial IRC & Approved BOM (Bill of Materials)',
          'Mushak-4.3 Assembly Coefficient',
        ],
      });
    }
  }

  // 6. Export-Oriented Customs Bonded Warehouse / DEDO Drawback
  if (BOND_ELIGIBLE_CHAPTERS.has(entry.chapter) && input.regime !== 'export_bonded' && current.totalTaxBdt > 0) {
    opportunities.push({
      id: 'export-bonded-warehouse',
      category: 'Export Bond / Drawback',
      title: 'Zero-Duty Import via NBR Bonded Warehouse or DEDO Export Duty Drawback (0% TTI)',
      legalBasis: 'Customs Act 2023 Warehousing Provisions & DEDO Duty Drawback Rules / VAT s.37–38',
      estimatedSavingsBdt: current.totalTaxBdt,
      newTtiPercent: 0,
      applicability: 'Conditional — License / Origin Needed',
      summary: `If imported as raw material, fabric, trim, chemical, or packaging for direct or deemed 100% export (e.g., RMG, footwear, leather, plastic/carton accessories), you pay 0% CD, 0% SD, 0% VAT, 0% AIT & 0% AT under Bonded Warehouse — or can claim 100% Duty & VAT Drawback via DEDO even without a Bond license!`,
      technicalSteps: [
        'Bonded Route: Import against Back-to-Back LC under a Customs Bonded Warehouse License + Utilization Declaration (UD from BGMEA/BKMEA/LFMEAB).',
        'Non-Bonded Exporter Route: Pay duties at port, export finished goods (0% Output VAT u/s 24), claim 100% Import VAT/AT refund on Mushak-9.1, and file DEDO claim within 6 months of export realization (PRC) to recover CD + RD + SD!',
      ],
      requiredDocuments: [
        'Customs Bonded Warehouse License & Passbook (or Export LC + PRC for DEDO)',
        'Utilization Declaration (UD) / Utilization Permission (UP)',
        'Bill of Export (Shipping Bill) & Export Proceeds Realization Certificate (PRC)',
      ],
      quickAction: {
        type: 'set_regime',
        regime: 'export_bonded',
        label: 'Simulate 0% Export Bonded Import',
      },
    });
  }

  // 7. Customs Valuation Optimization — Local Marine Insurance Cover Note (0.25% vs 1.00% Presumptive)
  const currentInsPct = typeof input.insurancePercent === 'number' ? input.insurancePercent : 1.0;
  if (
    input.valuationMode === 'invoice_to_av' &&
    (input.incoterm === 'CFR' || input.incoterm === 'FOB') &&
    currentInsPct > 0.3 &&
    current.totalTaxBdt > 0
  ) {
    const simIns = calculateNbrAssessment({
      ...input,
      insurancePercent: 0.25,
    });
    const insTaxSavings = round2(current.totalTaxBdt - simIns.totalTaxBdt);
    const insPremiumSavings = round2(current.valuation.insuranceBdt - simIns.valuation.insuranceBdt);
    const totalValuationBenefit = round2(insTaxSavings);

    if (totalValuationBenefit > 0) {
      opportunities.push({
        id: 'local-marine-insurance-cover',
        category: 'Customs Valuation',
        title: 'Submit Local Marine Insurance Cover Note (~0.25%) to Avoid NBR 1% Presumptive Insurance',
        legalBasis: 'Bangladesh Customs Valuation (Determination of Value of Imported Goods) Rules, 2000',
        estimatedSavingsBdt: totalValuationBenefit,
        newTtiPercent: simIns.ttiPercent,
        applicability: 'High — Directly Applicable',
        summary: `When no local insurance policy/money receipt is submitted on CFR/FOB shipments, Customs automatically adds 1.00% presumptive insurance — inflating CIF, 1% Landing Charge, and every compounded tax (CD, SD, VAT, AT). Submitting an actual Bangladesh marine cover note (~0.20%–0.30%) lowers Assessable Value by ৳${round2(current.valuation.assessableValueBdt - simIns.valuation.assessableValueBdt).toLocaleString('en-IN')} and cuts port taxes by ৳${totalValuationBenefit.toLocaleString('en-IN')} (saving ৳${insPremiumSavings.toLocaleString('en-IN')} on base valuation).`,
        technicalSteps: [
          'Purchase Marine Cargo Insurance Cover Note from a Bangladesh-registered insurer prior to shipment (mandatory under Insurance Act for imports into BD).',
          'Attach both the Insurance Policy/Cover Note AND the VAT-inclusive Premium Money Receipt + Bank Payment Proof to ASYCUDA Bill of Entry.',
          'Also attach Manufacturer Price List, Mill Test Certificate (MTC), and Proforma Invoice matching LC to defend Transaction Value against arbitrary Section 25 uplift.',
        ],
        requiredDocuments: [
          'Local Marine Insurance Policy / Cover Note',
          'Original Premium Money Receipt & Bank Debit Advice',
          'Manufacturer Technical Data Sheet & Price Catalogue',
        ],
        quickAction: {
          type: 'set_insurance',
          incoterm: input.incoterm,
          insurancePercent: 0.25,
          label: 'Apply 0.25% Actual Marine Insurance',
        },
      });
    }
  }

  // 8. Switch Domestic VAT from 5% Trade VAT -> Standard 15% Output VAT to Unlock Import VAT Credit
  const vatLine = current.lines.find((l) => l.code === 'VAT');
  if (input.domesticVatMode && input.domesticVatMode !== 'standard_15' && vatLine && vatLine.amountBdt > 0) {
    opportunities.push({
      id: 'unlock-15pct-input-vat-credit',
      category: 'SRO & License',
      title: 'Elect Standard 15% Output VAT Registration to Unlock 100% Import VAT Rebate',
      legalBasis: 'Section 46(1)(ka), Value Added Tax and Supplementary Duty Act, 2012',
      estimatedSavingsBdt: vatLine.amountBdt,
      newTtiPercent: current.ttiPercent,
      applicability: 'High — Directly Applicable',
      summary: `Under 5% Trade VAT (or truncated rates), Section 46(1)(ka) strictly bars input VAT credit — turning ৳${vatLine.amountBdt.toLocaleString('en-IN')} of Import VAT into a dead sunk cost! Opting into Standard 15% Output VAT unlocks 100% input rebate on Mushak-9.1.`,
      technicalSteps: [
        'Elect 15% Standard Output VAT billing (Mushak-6.3) for domestic sales (mandatory to unlock input credit u/s 46).',
        'File Mushak-4.3 Input-Output Price Declaration with your Divisional VAT Office prior to first supply.',
        'Record the Bill of Entry in Mushak-6.1 / 6.2.1 and claim full 15% Import VAT in Mushak-9.1 Part-4 within 4 monthly tax periods.',
      ],
      requiredDocuments: [
        '13-Digit BIN Certificate (Mushak-2.3)',
        'Mushak-4.3 Input-Output Declaration',
        'Mushak-6.2.1 Purchase-Sales Register & Mushak-6.3 Tax Invoice',
      ],
      quickAction: {
        type: 'set_domestic_vat',
        mode: 'standard_15',
        label: 'Switch to 15% Standard VAT Mode',
      },
    });
  }

  // Sort opportunities by highest BDT savings first
  opportunities.sort((a, b) => b.estimatedSavingsBdt - a.estimatedSavingsBdt);

  // Build 4-Pillar Post-Clearance Tax Rebate Playbook
  const atLine = current.lines.find((l) => l.code === 'AT');
  const aitLine = current.lines.find((l) => l.code === 'AIT');
  const cdRdSdSum = round2(
    (current.lines.find((l) => l.code === 'CD')?.amountBdt || 0) +
      (current.lines.find((l) => l.code === 'RD')?.amountBdt || 0) +
      (current.lines.find((l) => l.code === 'SD')?.amountBdt || 0)
  );

  const rebatePlaybook: RebatePlaybookItem[] = [
    {
      taxCode: 'VAT',
      title: '15% Import Stage VAT — Input Tax Credit (উপকরণ কর রেয়াত)',
      banglaTitle: 'ধারা ৪৬, মূসক ও সম্পূরক শুল্ক আইন ২০১২',
      amountBdt: vatLine?.amountBdt || 0,
      eligibleNow: Boolean(vatLine?.rebateable && (vatLine?.amountBdt || 0) > 0),
      statusLabel:
        (vatLine?.amountBdt || 0) === 0
          ? '0% Exempt at Port'
          : vatLine?.rebateable
          ? '100% Creditable on Mushak-9.1'
          : 'Blocked (Requires 15% Output VAT)',
      statutoryAuthority: 'Section 46, VAT & SD Act 2012',
      claimWindow: 'Import month or next 4 monthly tax periods (strictly 4-period cutoff)',
      formsRequired: [
        'ASYCUDA Bill of Entry (with 13-digit BIN)',
        'Mushak-6.1 (Manufacturer) or Mushak-6.2.1 (Commercial Importer)',
        'Mushak-4.3 (Input-Output Coefficient)',
        'Mushak-9.1 (Part-4, Note-14: Standard Rated Import)',
      ],
      stepByStep: [
        'Ensure LC / TT payment (> ৳1,00,000) is settled through a scheduled bank against your exact 13-digit BIN.',
        'Submit Mushak-4.3 (Input-Output Coefficient) online on the NBR IVA portal before making your first supply.',
        'Upon port release, enter the Bill of Entry number, date, value & VAT into Purchase Register Mushak-6.1 or Mushak-6.2.1.',
        'Claim the exact Import VAT in Mushak-9.1 Sub-form (Note-14) within 4 tax periods to offset Output VAT on Mushak-6.3 sales.',
      ],
      disallowanceTrap:
        'Selling at 5% Trade VAT or 7.5%/10% truncated VAT, missing the 4-month Mushak-9.1 claim window, or failing to update Mushak-4.3 when input cost fluctuates > 7.5% causes 100% rebate cancellation!',
    },
    {
      taxCode: 'AT',
      title: `${current.effectiveRates.at}% Advance Tax (AT) — Decreasing Adjustment / Cash Refund`,
      banglaTitle: 'ধারা ৩১(৩), হ্রাসকারী সমন্বয় ও নগদ ফেরত',
      amountBdt: atLine?.amountBdt || 0,
      eligibleNow: Boolean(atLine?.rebateable && (atLine?.amountBdt || 0) > 0),
      statusLabel:
        (atLine?.amountBdt || 0) === 0
          ? '0% Exempt at Port'
          : atLine?.rebateable
          ? '100% Adjustable / Refundable'
          : 'Requires Active BIN Return',
      statutoryAuthority: 'Section 31(3) & Rule 18, VAT & SD Act 2012',
      claimWindow: 'Import tax period or next 4 monthly tax periods via Mushak-9.1 Note-31',
      formsRequired: [
        'ASYCUDA Bill of Entry & CPC Payment Challan',
        'Mushak-9.1 (Part-5, Note-31: Decreasing Adjustment for Advance Tax)',
      ],
      stepByStep: [
        'Key Advantage: Unlike 15% Import VAT, Advance Tax (AT) IS 100% adjustable EVEN IF you sell under 5% Commercial Trade VAT or truncated VAT rates!',
        'Open Mushak-9.1 Note-31 sub-form, enter Custom House code, Bill of Entry number, date & AT paid.',
        'The AT directly reduces your net monthly VAT payable; if net balance remains negative for 6 months (or immediately for eligible cases), apply for cash/online refund on Mushak-9.1.',
      ],
      disallowanceTrap:
        'Many commercial traders mistakenly treat 5% AT as a sunk cost or confuse it with AIT — always claim AT in Note-31 within 4 months of Bill of Entry assessment!',
    },
    {
      taxCode: 'AIT',
      title: `${current.effectiveRates.ait}% Advance Income Tax (AIT) — Corporate Tax Credit`,
      banglaTitle: 'ধারা ১২০ ও ধারা ১৬৩, আয়কর আইন ২০২৩',
      amountBdt: aitLine?.amountBdt || 0,
      eligibleNow: Boolean(aitLine?.rebateable && (aitLine?.amountBdt || 0) > 0),
      statusLabel:
        (aitLine?.amountBdt || 0) === 0
          ? '0% Exempt at Port'
          : 'Adjustable vs. Annual Income Tax',
      statutoryAuthority: 'Section 120 & Section 163 (Minimum Tax), Income Tax Act 2023',
      claimWindow: 'Annual Income Tax Return for the corresponding Income Year',
      formsRequired: [
        '12-Digit e-TIN Certificate',
        'ASYCUDA Bill of Entry AIT Schedule & Automated Challan (A-Challan)',
        'Annual Corporate / Business Return (IT-11GA / e-Return)',
      ],
      stepByStep: [
        'Reconcile all ASYCUDA Bills of Entry AIT deductions against NBR’s online AIT verification portal before year-end.',
        'Claim total import AIT paid u/s 120 as Advance Tax Credit against assessed regular business/corporate income tax.',
        'If you are a newly established industrial plant, power/agro unit, or tax-exempt entity, apply to NBR for a Reduced/Zero Withholding Certificate u/s 120 to avoid port AIT deduction upfront.',
      ],
      disallowanceTrap:
        'Section 163 Minimum Tax Rule: If your annual profit is low (or loss-making) such that regular tax < AIT paid at port, the AIT becomes your non-refundable Minimum Tax floor for that year!',
    },
    {
      taxCode: 'DEDO',
      title: 'Customs Duty & SD Drawback for Exporters (DEDO শুল্ক প্রত্যর্পণ)',
      banglaTitle: 'রপ্তানিমুখী শিল্পের শুল্ক ও মূসক প্রত্যর্পণ',
      amountBdt: cdRdSdSum,
      eligibleNow: cdRdSdSum > 0,
      statusLabel: cdRdSdSum > 0 ? 'Refundable if Re-Exported' : 'Already 0% Sunk Duty',
      statutoryAuthority: 'Customs Act 2023 Drawback Rules & DEDO Flat/Actual Rate Schedule',
      claimWindow: 'Within 6 months from date of export / Proceeds Realization (PRC)',
      formsRequired: [
        'Import Bill of Entry & Tax Payment Receipt',
        'Bill of Export (Shipping Bill) & Export Invoice',
        'Bank Proceeds Realization Certificate (PRC)',
        'DEDO Input-Output Consumption Application',
      ],
      stepByStep: [
        'For exporters without a Bonded Warehouse license who paid CD + RD + SD at import stage to manufacture export goods.',
        'Declare 0% zero-rated export supply in Mushak-9.1 (recovering 100% VAT & AT) and submit DEDO drawback dossier after export proceeds arrive via bank PRC.',
        'Receive cash/bank refund of Customs Duty (CD), Regulatory Duty (RD), and Supplementary Duty (SD) consumed in exported units.',
      ],
      disallowanceTrap:
        'Filing DEDO claims after the 6-month statutory time bar from export completion or missing Bill of Export cross-references.',
    },
  ];

  const maxPotentialSavingsBdt =
    opportunities.length > 0 ? opportunities[0].estimatedSavingsBdt : 0;
  const bestAchievableSunkBdt = Math.max(0, round2(current.netSunkDutyBdt - maxPotentialSavingsBdt));

  return {
    hs8: entry.hs8,
    baselineTotalTaxBdt: current.totalTaxBdt,
    baselineNetSunkBdt: current.netSunkDutyBdt,
    bestAchievableSunkBdt,
    maxPotentialSavingsBdt,
    opportunities,
    rebatePlaybook,
  };
}
