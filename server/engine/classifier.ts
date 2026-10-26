import { calculateNbrAssessment, DEFAULT_EXCHANGE_RATES_BDT } from '../../shared/tax-math.js';
import {
  AmbiguityHint,
  BatchClassificationResult,
  BatchItemInput,
  BatchItemResult,
  ClassificationCandidate,
  ClassificationResult,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  SupportedCurrency,
  TariffEntry,
} from '../../shared/types.js';
import { getTariffStore, TariffStore } from '../tariff/tariff-store.js';
import { ScoredTariffCandidate, TariffBm25Index } from './bm25-index.js';
import { AnalyzedQuery, analyzeProductQuery } from './nlp-analyzer.js';

function computeConfidence(candidates: ScoredTariffCandidate[], idx: number): number {
  if (candidates.length === 0) return 0;
  const topScore = candidates[0].score;
  const curScore = candidates[idx].score;
  const secondScore = candidates[1]?.score ?? topScore * 0.45;

  if (idx === 0) {
    const marginRatio = topScore > 0 ? (topScore - secondScore) / topScore : 0;
    const rawStrength = Math.min(1, topScore / 28);
    const conf = Math.round(62 + rawStrength * 22 + Math.min(0.45, marginRatio) * 28);
    return Math.max(55, Math.min(97, conf));
  }

  const rel = topScore > 0 ? curScore / topScore : 0.4;
  return Math.max(25, Math.min(86, Math.round(rel * 82)));
}

function buildWhenToUse(candidate: TariffEntry, primary: TariffEntry, isPrimary: boolean): string {
  if (isPrimary) {
    return `Best match under Heading ${candidate.heading} (${candidate.tti.toFixed(2)}% Commercial TTI).`;
  }
  if (candidate.heading === primary.heading) {
    return `Same 4-digit heading (${candidate.heading}), different sub-specification: ${candidate.commercialName} (${candidate.tti.toFixed(2)}% TTI).`;
  }
  if (candidate.chapter === primary.chapter) {
    return `Alternative heading in Chapter ${candidate.chapter}: ${candidate.headingTitle.slice(0, 68)} (${candidate.tti.toFixed(2)}% TTI).`;
  }
  return `Cross-chapter alternative (Ch. ${candidate.chapter}): apply if primary material/function matches ${candidate.commercialName} (${candidate.tti.toFixed(2)}% TTI).`;
}

function buildAmbiguityHints(analyzed: AnalyzedQuery, topCandidates: ScoredTariffCandidate[]): AmbiguityHint[] {
  const hints: AmbiguityHint[] = [];
  if (topCandidates.length === 0) return hints;

  const primary = topCandidates[0].entry;
  const chapters = new Set(topCandidates.slice(0, 4).map((c) => c.entry.chapter));

  if ((chapters.has('61') || chapters.has('62')) && !analyzed.isKnitted && !analyzed.isWoven) {
    hints.push(
      { label: 'Specify Knitted (Ch. 61)', appendPrompt: 'knitted jersey fabric' },
      { label: 'Specify Woven (Ch. 62)', appendPrompt: 'woven fabric construction' }
    );
  }

  if (primary.heading === '8703' && analyzed.engineCc === null && !analyzed.isElectricVehicle) {
    hints.push(
      { label: '1500cc Petrol Sedan', appendPrompt: '1500cc spark-ignition petrol' },
      { label: '1800cc Hybrid SUV', appendPrompt: '1800cc hybrid electric petrol' },
      { label: '100% Electric EV', appendPrompt: 'pure battery electric vehicle BEV' }
    );
  }

  if (primary.hs6 === '040221' && !analyzed.isBulkPack && !analyzed.isRetailPack) {
    hints.push(
      { label: '25 kg Bulk Industrial Bag', appendPrompt: 'in 25kg bulk industrial bags' },
      { label: 'Retail Tin / Pouch (≤ 2.5 kg)', appendPrompt: 'in 1kg retail tin pack' }
    );
  }

  if ((primary.chapter === '84' || primary.chapter === '85') && !analyzed.wantsPartsOnly) {
    hints.push({
      label: 'Spare Parts Only?',
      appendPrompt: 'spare parts and components only',
    });
  }

  if (primary.sroEligibleCapitalMachinery && analyzed.signals.endUse !== 'Industrial / Manufacturing') {
    hints.push({
      label: 'For Industrial Factory Use (IRC)',
      appendPrompt: 'industrial capital machinery for factory manufacturing',
    });
  }

  return hints.slice(0, 3);
}

function buildReasoningSummary(
  analyzed: AnalyzedQuery,
  primary: TariffEntry,
  matchedTerms: string[],
  alternatives: TariffEntry[]
): string {
  const signalParts: string[] = [];
  if (analyzed.signals.materials.length > 0) {
    signalParts.push(`material composition (${analyzed.signals.materials.join(', ')})`);
  }
  if (analyzed.signals.productForm) {
    signalParts.push(`form (${analyzed.signals.productForm})`);
  }
  if (analyzed.signals.endUse) {
    signalParts.push(`end-use (${analyzed.signals.endUse})`);
  }
  if (analyzed.signals.technicalSpecs.length > 0) {
    signalParts.push(`specs (${analyzed.signals.technicalSpecs.join(', ')})`);
  }

  const signalsClause =
    signalParts.length > 0 ? `Detected ${signalParts.join(', ')}. ` : '';

  const altClause =
    alternatives.length > 0
      ? ` Also review ${alternatives[0].formattedHs8} (${alternatives[0].tti.toFixed(2)}% TTI) if exact technical thresholds differ.`
      : '';

  return `${signalsClause}Classified under Section ${primary.section}, Chapter ${primary.chapter} → Heading ${primary.heading} (${primary.formattedHs8}: ${primary.commercialName}) per WCO GRI 1 & GRI 6. Standard Bangladesh NBR Commercial Total Tax Incidence is ${primary.tti.toFixed(2)}% (CD ${primary.rates.cd}%, RD ${primary.rates.rd}%, SD ${primary.rates.sd}%, VAT ${primary.rates.vat}%, AIT ${primary.rates.ait}%, AT ${primary.rates.at}%).${altClause}`;
}

interface LlmRerankResponse {
  selectedHs8: string;
  confidence: number;
  griRule: string;
  reasoningSummary: string;
  alternativeHs8s?: string[];
}

async function runExternalLlmRag(
  query: string,
  candidates: ScoredTariffCandidate[],
  llm: LlmConfig
): Promise<LlmRerankResponse> {
  const candidateContext = candidates
    .slice(0, 14)
    .map(
      (c, i) =>
        `${i + 1}. HS8: ${c.entry.hs8} (${c.entry.formattedHs8}) | Name: ${c.entry.commercialName} | Official WCO: ${c.entry.description} | Ch.${c.entry.chapter} | NBR Rates: CD=${c.entry.rates.cd}%, RD=${c.entry.rates.rd}%, SD=${c.entry.rates.sd}%, VAT=${c.entry.rates.vat}%, TTI=${c.entry.tti}%`
    )
    .join('\n');

  const systemPrompt = `You are a Principal Bangladesh Customs (NBR) & WCO HS2022 Tariff Classification Specialist.
Select the single most accurate 8-digit HS code ONLY from the provided candidate list using WCO General Rules of Interpretation (GRI 1-6).
Respond strictly with valid JSON matching:
{
  "selectedHs8": "8-digit string from candidates",
  "confidence": 88,
  "griRule": "GRI rule applied",
  "reasoningSummary": "2-3 concise sentences explaining the classification and NBR tax context",
  "alternativeHs8s": ["up to 3 runner-up 8-digit strings from candidates"]
}`;

  const userPrompt = `Product Description: "${query}"\n\nGrounded Bangladesh NBR / WCO Candidates:\n${candidateContext}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);

  try {
    if (llm.provider === 'gemini') {
      const model = llm.model || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(llm.apiKey || '')}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      if (!res.ok) throw new Error(`Gemini API HTTP ${res.status}`);
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return JSON.parse(text) as LlmRerankResponse;
    }

    // OpenAI / Groq / Custom OpenAI-compatible endpoint
    const defaultUrl =
      llm.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : llm.baseUrl
        ? `${llm.baseUrl.replace(/\/$/, '')}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions';

    const defaultModel =
      llm.model || (llm.provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const res = await fetch(defaultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey || ''}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: defaultModel,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) throw new Error(`${llm.provider.toUpperCase()} API HTTP ${res.status}`);
    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content || '';
    return JSON.parse(content) as LlmRerankResponse;
  } finally {
    clearTimeout(timer);
  }
}

export class HsClassificationEngine {
  private readonly store: TariffStore;
  private readonly bm25: TariffBm25Index;

  constructor(store = getTariffStore()) {
    this.store = store;
    this.bm25 = new TariffBm25Index(store.entries);
  }

  public async classify(
    rawQuery: string,
    options?: {
      regime?: ImporterRegime;
      invoiceValue?: number;
      currency?: SupportedCurrency;
      exchangeRateBdt?: number;
      incoterm?: Incoterm;
      quantity?: number;
      llm?: LlmConfig;
    }
  ): Promise<ClassificationResult> {
    const t0 = performance.now();
    const query = rawQuery.trim();
    const analyzed = analyzeProductQuery(query);
    let scored = this.bm25.search(analyzed, 18);

    // Graceful fallback if query had zero matching tokens (e.g. gibberish)
    if (scored.length === 0) {
      const fallbackEntry = this.store.byHs8.get('84713000') || this.store.entries[0];
      scored = [
        {
          entry: fallbackEntry,
          score: 1,
          matchedTerms: [],
          griRule: 'GRI 1 — General Commodity Fallback (add material & function details)',
        },
      ];
    }

    let engineUsed: ClassificationResult['engineUsed'] = 'builtin-hybrid';
    let fallbackNotice: string | undefined;
    let llmOverride: LlmRerankResponse | null = null;

    if (options?.llm && options.llm.provider !== 'builtin' && options.llm.apiKey?.trim()) {
      try {
        llmOverride = await runExternalLlmRag(query, scored, options.llm);
        engineUsed = `${options.llm.provider}-rag` as ClassificationResult['engineUsed'];
      } catch (err: any) {
        fallbackNotice = `External ${options.llm.provider.toUpperCase()} API could not be reached in this environment (${err?.message || 'network/auth error'}). Automatically used the Built-in Smart Hybrid Engine.`;
      }
    }

    // Reorder scored candidates if LLM selected a grounded HS8 from our TariffStore
    if (llmOverride?.selectedHs8) {
      const cleanSelected = llmOverride.selectedHs8.replace(/\D/g, '');
      const foundIdx = scored.findIndex((c) => c.entry.hs8 === cleanSelected);
      if (foundIdx > 0) {
        const [picked] = scored.splice(foundIdx, 1);
        scored.unshift(picked);
      }
    }

    const primaryScored = scored[0];
    const altScored = scored.slice(1, 5);

    const buildCandidate = (sc: ScoredTariffCandidate, idx: number): ClassificationCandidate => {
      const reasons: string[] = [];
      if (sc.matchedTerms.length > 0) {
        reasons.push(`Matched tariff terms: ${sc.matchedTerms.slice(0, 6).join(', ')}`);
      }
      if (analyzed.signals.materials.length > 0 && idx === 0) {
        reasons.push(`Material alignment: ${analyzed.signals.materials.join(', ')}`);
      }
      if (sc.entry.curated) {
        reasons.push('Verified 8-digit Bangladesh NBR Operative Tariff Schedule mapping');
      } else {
        reasons.push(`Official WCO HS2022 Subheading ${sc.entry.formattedHs6}`);
      }

      return {
        entry: sc.entry,
        confidence:
          idx === 0 && llmOverride?.confidence
            ? Math.max(60, Math.min(98, Math.round(llmOverride.confidence)))
            : computeConfidence(scored, idx),
        matchReasons: reasons,
        griRule: idx === 0 && llmOverride?.griRule ? llmOverride.griRule : sc.griRule,
        whenToUse: buildWhenToUse(sc.entry, primaryScored.entry, idx === 0),
      };
    };

    const primary = buildCandidate(primaryScored, 0);
    const alternatives = altScored.map((sc, i) => buildCandidate(sc, i + 1));

    const currency = options?.currency || 'USD';
    const fx = options?.exchangeRateBdt || DEFAULT_EXCHANGE_RATES_BDT[currency];
    const regime = options?.regime || 'commercial';

    const defaultAssessment = calculateNbrAssessment({
      rates: primary.entry.rates,
      sroEligibleCapitalMachinery: primary.entry.sroEligibleCapitalMachinery,
      regime,
      valuationMode: 'invoice_to_av',
      incoterm: options?.incoterm || 'CIF',
      invoiceValue: options?.invoiceValue ?? 1000,
      currency,
      exchangeRateBdt: fx,
      quantity: options?.quantity ?? 10,
      unit: primary.entry.unit,
    });

    const reasoningSummary =
      llmOverride?.reasoningSummary ||
      buildReasoningSummary(
        analyzed,
        primary.entry,
        primaryScored.matchedTerms,
        alternatives.map((a) => a.entry)
      );

    const processingMs = Math.max(1, Math.round(performance.now() - t0));

    return {
      query,
      engineUsed,
      fallbackNotice,
      processingMs,
      primary,
      alternatives,
      signals: analyzed.signals,
      reasoningSummary,
      ambiguityHints: buildAmbiguityHints(analyzed, scored),
      defaultAssessment,
    };
  }

  public async classifyBatch(params: {
    items: BatchItemInput[];
    currency: SupportedCurrency;
    exchangeRateBdt: number;
    incoterm: Incoterm;
    regime: ImporterRegime;
  }): Promise<BatchClassificationResult> {
    const results: BatchItemResult[] = [];

    for (const item of params.items.slice(0, 30)) {
      if (!item.description.trim()) continue;
      const classified = await this.classify(item.description, {
        currency: params.currency,
        exchangeRateBdt: params.exchangeRateBdt,
        incoterm: params.incoterm,
        regime: params.regime,
        invoiceValue: item.invoiceValue,
        quantity: item.quantity,
      });

      results.push({
        id: item.id,
        description: item.description,
        invoiceValue: item.invoiceValue,
        quantity: item.quantity,
        primary: classified.primary,
        assessment: classified.defaultAssessment,
      });
    }

    const assessableValueBdt = results.reduce((s, r) => s + r.assessment.valuation.assessableValueBdt, 0);
    const totalTaxBdt = results.reduce((s, r) => s + r.assessment.totalTaxBdt, 0);
    const totalLandedCostBdt = results.reduce((s, r) => s + r.assessment.totalLandedCostBdt, 0);
    const rebateableTaxBdt = results.reduce((s, r) => s + r.assessment.rebateableTaxBdt, 0);
    const netSunkDutyBdt = results.reduce((s, r) => s + r.assessment.netSunkDutyBdt, 0);
    const averageTtiPercent =
      assessableValueBdt > 0 ? Math.round((totalTaxBdt / assessableValueBdt) * 10000) / 100 : 0;

    return {
      currency: params.currency,
      exchangeRateBdt: params.exchangeRateBdt,
      incoterm: params.incoterm,
      regime: params.regime,
      items: results,
      totals: {
        assessableValueBdt: Math.round(assessableValueBdt * 100) / 100,
        totalTaxBdt: Math.round(totalTaxBdt * 100) / 100,
        totalLandedCostBdt: Math.round(totalLandedCostBdt * 100) / 100,
        rebateableTaxBdt: Math.round(rebateableTaxBdt * 100) / 100,
        netSunkDutyBdt: Math.round(netSunkDutyBdt * 100) / 100,
        averageTtiPercent,
      },
    };
  }
}

let singletonEngine: HsClassificationEngine | null = null;

export function getClassificationEngine(): HsClassificationEngine {
  if (!singletonEngine) {
    singletonEngine = new HsClassificationEngine();
  }
  return singletonEngine;
}
