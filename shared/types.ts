export interface NbrTaxRates {
  /** Customs Duty (%) — e.g. 0, 1, 5, 10, 15, 25 */
  cd: number;
  /** Regulatory Duty (%) — e.g. 0, 3, 5, 10, 20 */
  rd: number;
  /** Supplementary Duty (%) — applied on (AV + CD + RD) */
  sd: number;
  /** Import Value Added Tax (%) — applied on (AV + CD + RD + SD), standard 15% */
  vat: number;
  /** Advance Income Tax (%) — applied on AV, standard 5% */
  ait: number;
  /** Advance Tax (%) — applied on (AV + CD + RD + SD), standard 5% commercial / 3% industrial */
  at: number;
}

export type ImporterRegime =
  | 'commercial'
  | 'industrial'
  | 'capital_machinery'
  | 'export_bonded';

export type PreferentialOrigin = 'none' | 'apta' | 'safta' | 'bhutan_pta';

export type DomesticVatMode =
  | 'standard_15'
  | 'trade_5'
  | 'unregistered_exempt';

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'CNY' | 'INR' | 'BDT';

export type Incoterm = 'FOB' | 'CFR' | 'CIF';

export type ValuationMode = 'invoice_to_av' | 'direct_av';

export type IpoStatus = 'Freely Importable' | 'Conditional Import' | 'Restricted';

export interface ComplianceRequirement {
  authority: string;
  title: string;
  description: string;
  mandatory: boolean;
}

export interface TariffEntry {
  hs6: string;
  hs8: string;
  formattedHs6: string;
  formattedHs8: string;
  section: string;
  sectionTitle: string;
  chapter: string;
  chapterTitle: string;
  heading: string;
  headingTitle: string;
  description: string;
  commercialName: string;
  unit: string;
  rates: NbrTaxRates;
  tti: number;
  sroEligibleCapitalMachinery: boolean;
  sroNotes: string[];
  ipoStatus: IpoStatus;
  compliance: ComplianceRequirement[];
  keywords: string[];
  curated: boolean;
}

export interface ExtractedProductSignals {
  materials: string[];
  productForm: string | null;
  endUse: string | null;
  technicalSpecs: string[];
  normalizedTerms: string[];
  detectedLanguage: 'en' | 'bn' | 'mixed';
}

export interface ClassificationCandidate {
  entry: TariffEntry;
  confidence: number;
  matchReasons: string[];
  griRule: string;
  whenToUse: string;
}

export interface AmbiguityHint {
  label: string;
  appendPrompt: string;
}

export type LlmProvider = 'builtin' | 'gemini' | 'openai' | 'groq' | 'custom';

export interface LlmConfig {
  provider: LlmProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export interface TaxAssessmentInput {
  rates: NbrTaxRates;
  sroEligibleCapitalMachinery?: boolean;
  regime: ImporterRegime;
  preferentialOrigin?: PreferentialOrigin;
  domesticVatMode?: DomesticVatMode;
  valuationMode: ValuationMode;
  incoterm: Incoterm;
  invoiceValue: number;
  freightPercent?: number;
  freightValue?: number;
  insurancePercent?: number;
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  quantity: number;
  unit?: string;
  customRateOverrides?: Partial<NbrTaxRates>;
}

export interface TaxLineItem {
  code: 'CD' | 'RD' | 'SD' | 'VAT' | 'AIT' | 'AT';
  name: string;
  banglaName: string;
  statutoryBaseLabel: string;
  baseAmountBdt: number;
  ratePercent: number;
  effectiveRateOnAvPercent: number;
  amountBdt: number;
  amountForeign: number;
  rebateable: boolean;
  rebateNote: string;
}

export interface ValuationBreakdown {
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  invoiceValueForeign: number;
  invoiceValueBdt: number;
  freightBdt: number;
  cfrBdt: number;
  insuranceBdt: number;
  cifBdt: number;
  landingChargeBdt: number;
  assessableValueBdt: number;
  assessableValueForeign: number;
}

export interface TaxAssessmentResult {
  regime: ImporterRegime;
  preferentialOrigin: PreferentialOrigin;
  domesticVatMode: DomesticVatMode;
  effectiveRates: NbrTaxRates;
  valuation: ValuationBreakdown;
  lines: TaxLineItem[];
  ttiPercent: number;
  totalTaxBdt: number;
  totalTaxForeign: number;
  totalLandedCostBdt: number;
  totalLandedCostForeign: number;
  rebateableTaxBdt: number;
  rebateableTaxForeign: number;
  netSunkDutyBdt: number;
  netSunkDutyForeign: number;
  netLandedCostAfterRebateBdt: number;
  quantity: number;
  unit: string;
  perUnitTaxBdt: number;
  perUnitLandedBdt: number;
}

export type QuickOptimizationAction =
  | { type: 'set_regime'; regime: ImporterRegime; label: string }
  | { type: 'set_origin'; origin: PreferentialOrigin; label: string }
  | { type: 'set_insurance'; incoterm: Incoterm; insurancePercent: number; label: string }
  | { type: 'set_domestic_vat'; mode: DomesticVatMode; label: string }
  | { type: 'switch_hs_query'; query: string; label: string };

export interface DutyReductionOpportunity {
  id: string;
  category:
    | 'SRO & License'
    | 'Tariff Engineering'
    | 'Preferential FTA/PTA'
    | 'Customs Valuation'
    | 'Export Bond / Drawback';
  title: string;
  legalBasis: string;
  estimatedSavingsBdt: number;
  newTtiPercent: number;
  applicability:
    | 'High — Directly Applicable'
    | 'Conditional — License / Origin Needed'
    | 'Structural — Supply-Chain Engineering';
  summary: string;
  technicalSteps: string[];
  requiredDocuments: string[];
  quickAction?: QuickOptimizationAction;
}

export interface RebatePlaybookItem {
  taxCode: 'VAT' | 'AT' | 'AIT' | 'DEDO';
  title: string;
  banglaTitle: string;
  amountBdt: number;
  eligibleNow: boolean;
  statusLabel: string;
  statutoryAuthority: string;
  claimWindow: string;
  formsRequired: string[];
  stepByStep: string[];
  disallowanceTrap: string;
}

export interface VatModelScenario {
  mode: 'standard_15' | 'trade_5';
  label: string;
  exVatSellingPriceBdt: number;
  outputVatOnSalesBdt: number;
  invoicePriceInclVatBdt: number;
  importVatCreditBdt: number;
  importAtAdjustmentBdt: number;
  netTreasuryVatPayableOrRefundBdt: number;
  unrecoveredImportVatSunkBdt: number;
  netProfitAfterAllTaxesBdt: number;
}

export interface VatRebateComparison {
  markupPercent: number;
  buyerIsVatRegisteredB2B: boolean;
  standard15: VatModelScenario;
  trade5: VatModelScenario;
  recommendedMode: 'standard_15' | 'trade_5';
  netAdvantageBdt: number;
  breakevenMarkupPercent: number;
  explanation: string;
}

export interface TaxOptimizationPlan {
  hs8: string;
  baselineTotalTaxBdt: number;
  baselineNetSunkBdt: number;
  bestAchievableSunkBdt: number;
  maxPotentialSavingsBdt: number;
  opportunities: DutyReductionOpportunity[];
  rebatePlaybook: RebatePlaybookItem[];
}

export interface ClassificationResult {
  query: string;
  engineUsed: 'builtin-hybrid' | 'gemini-rag' | 'openai-rag' | 'groq-rag' | 'custom-rag';
  fallbackNotice?: string;
  processingMs: number;
  primary: ClassificationCandidate;
  alternatives: ClassificationCandidate[];
  signals: ExtractedProductSignals;
  reasoningSummary: string;
  ambiguityHints: AmbiguityHint[];
  defaultAssessment: TaxAssessmentResult;
}

export interface BatchItemInput {
  id: string;
  description: string;
  invoiceValue: number;
  quantity: number;
}

export interface BatchItemResult {
  id: string;
  description: string;
  invoiceValue: number;
  quantity: number;
  primary: ClassificationCandidate;
  assessment: TaxAssessmentResult;
}

export interface BatchClassificationResult {
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  incoterm: Incoterm;
  regime: ImporterRegime;
  items: BatchItemResult[];
  totals: {
    assessableValueBdt: number;
    totalTaxBdt: number;
    totalLandedCostBdt: number;
    rebateableTaxBdt: number;
    netSunkDutyBdt: number;
    averageTtiPercent: number;
  };
}

export interface SectionSummary {
  section: string;
  title: string;
  chapterRange: string;
  chapterCount: number;
  subheadingCount: number;
  chapters: {
    chapter: string;
    title: string;
    subheadingCount: number;
  }[];
}
