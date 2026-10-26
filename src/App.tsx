import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  CornerDownLeft,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { calculateNbrAssessment, DEFAULT_EXCHANGE_RATES_BDT } from '@shared/tax-math';
import {
  ClassificationCandidate,
  ClassificationResult,
  DomesticVatMode,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  NbrTaxRates,
  PreferentialOrigin,
  QuickOptimizationAction,
  SupportedCurrency,
  TariffEntry,
  TaxAssessmentInput,
  ValuationMode,
} from '@shared/types';
import { AiSettingsModal } from '@/components/AiSettingsModal';
import { BatchInvoiceAnalyzer } from '@/components/BatchInvoiceAnalyzer';
import { ClassificationCard } from '@/components/ClassificationCard';
import { ActiveTab, Navbar } from '@/components/Navbar';
import { NbrTaxCalculator } from '@/components/NbrTaxCalculator';
import { TariffExplorer } from '@/components/TariffExplorer';
import { TaxOptimizationAdvisor } from '@/components/TaxOptimizationAdvisor';
import { classifyProductApi, fetchHealth, HealthStats } from '@/lib/api';
import { formatBdt, formatPct } from '@/lib/format';
import { SAMPLE_PRODUCT_PRESETS, SampleProductPreset } from '@/lib/presets';

const LLM_STORAGE_KEY = 'dutylens_bd_llm_config_v1';
const HISTORY_STORAGE_KEY = 'dutylens_bd_recent_queries_v1';

interface RecentItem {
  query: string;
  hs8: string;
  commercialName: string;
  tti: number;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('classifier');
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => {
    try {
      const saved = localStorage.getItem(LLM_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as LlmConfig;
    } catch {
      // ignore
    }
    return { provider: 'builtin' };
  });

  const [recentHistory, setRecentHistory] = useState<RecentItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as RecentItem[];
    } catch {
      // ignore
    }
    return [];
  });

  const [queryInput, setQueryInput] = useState<string>(SAMPLE_PRODUCT_PRESETS[0].query);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<ClassificationCandidate | null>(null);

  // Unified Calculator + Technical Optimizer State
  const [invoiceValue, setInvoiceValue] = useState<number>(SAMPLE_PRODUCT_PRESETS[0].defaultInvoiceUsd);
  const [quantity, setQuantity] = useState<number>(SAMPLE_PRODUCT_PRESETS[0].defaultQty);
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [exchangeRateBdt, setExchangeRateBdt] = useState<number>(DEFAULT_EXCHANGE_RATES_BDT.USD);
  const [incoterm, setIncoterm] = useState<Incoterm>('CFR');
  const [valuationMode, setValuationMode] = useState<ValuationMode>('invoice_to_av');
  const [freightPercent, setFreightPercent] = useState<number>(5);
  const [insurancePercent, setInsurancePercent] = useState<number>(1.0);
  const [regime, setRegime] = useState<ImporterRegime>('commercial');
  const [preferentialOrigin, setPreferentialOrigin] = useState<PreferentialOrigin>('none');
  const [domesticVatMode, setDomesticVatMode] = useState<DomesticVatMode>('standard_15');
  const [customOverrides, setCustomOverrides] = useState<Partial<NbrTaxRates>>({});

  const saveLlmConfig = (next: LlmConfig) => {
    setLlmConfig(next);
    try {
      localStorage.setItem(LLM_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const pushRecentHistory = (res: ClassificationResult) => {
    setRecentHistory((prev) => {
      const item: RecentItem = {
        query: res.query,
        hs8: res.primary.entry.formattedHs8,
        commercialName: res.primary.entry.commercialName,
        tti: res.primary.entry.tti,
      };
      const deduped = [item, ...prev.filter((p) => p.hs8 !== item.hs8)].slice(0, 6);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(deduped));
      } catch {
        // ignore
      }
      return deduped;
    });
  };

  const executeClassify = async (
    targetQuery: string,
    opts?: {
      nextInvoiceUsd?: number;
      nextQty?: number;
      nextRegime?: ImporterRegime;
    }
  ) => {
    const trimmed = targetQuery.trim();
    if (trimmed.length < 2) {
      setError('Please enter at least 2 characters describing your product.');
      return;
    }

    setError(null);
    setLoading(true);
    setCustomOverrides({});

    const effectiveRegime = opts?.nextRegime ?? regime;
    const effectiveInvoice = opts?.nextInvoiceUsd ?? invoiceValue;
    const effectiveQty = opts?.nextQty ?? quantity;

    if (opts?.nextInvoiceUsd !== undefined) setInvoiceValue(opts.nextInvoiceUsd);
    if (opts?.nextQty !== undefined) setQuantity(opts.nextQty);
    if (opts?.nextRegime !== undefined) setRegime(opts.nextRegime);

    try {
      const res = await classifyProductApi({
        query: trimmed,
        regime: effectiveRegime,
        invoiceValue: effectiveInvoice,
        currency,
        exchangeRateBdt,
        incoterm,
        quantity: effectiveQty,
        llm: llmConfig,
      });
      if (!res.primary.entry.sroEligibleCapitalMachinery && effectiveRegime === 'capital_machinery') {
        setRegime('commercial');
      }
      setClassification(res);
      setSelectedCandidate(res.primary);
      pushRecentHistory(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to classify product.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => {});
    executeClassify(SAMPLE_PRODUCT_PRESETS[0].query, {
      nextInvoiceUsd: SAMPLE_PRODUCT_PRESETS[0].defaultInvoiceUsd,
      nextQty: SAMPLE_PRODUCT_PRESETS[0].defaultQty,
      nextRegime: 'commercial',
    });
  }, []);

  const activeEntry = selectedCandidate?.entry || null;

  const assessmentInput: TaxAssessmentInput | null = useMemo(() => {
    if (!activeEntry) return null;
    return {
      rates: activeEntry.rates,
      sroEligibleCapitalMachinery: activeEntry.sroEligibleCapitalMachinery,
      regime,
      preferentialOrigin,
      domesticVatMode,
      valuationMode,
      incoterm,
      invoiceValue,
      freightPercent,
      insurancePercent,
      currency,
      exchangeRateBdt,
      quantity,
      unit: activeEntry.unit,
      customRateOverrides: Object.keys(customOverrides).length > 0 ? customOverrides : undefined,
    };
  }, [
    activeEntry,
    regime,
    preferentialOrigin,
    domesticVatMode,
    valuationMode,
    incoterm,
    invoiceValue,
    freightPercent,
    insurancePercent,
    currency,
    exchangeRateBdt,
    quantity,
    customOverrides,
  ]);

  const liveAssessment = useMemo(() => {
    if (!assessmentInput) return null;
    return calculateNbrAssessment(assessmentInput);
  }, [assessmentInput]);

  const handlePresetClick = (preset: SampleProductPreset) => {
    setQueryInput(preset.query);
    setCurrency('USD');
    setExchangeRateBdt(DEFAULT_EXCHANGE_RATES_BDT.USD);
    setPreferentialOrigin('none');
    setInsurancePercent(1.0);
    executeClassify(preset.query, {
      nextInvoiceUsd: preset.defaultInvoiceUsd,
      nextQty: preset.defaultQty,
      nextRegime: preset.suggestedRegime || 'commercial',
    });
  };

  const handleRefineQuery = (appendText: string) => {
    const updated = `${queryInput.trim()} (${appendText})`;
    setQueryInput(updated);
    executeClassify(updated);
  };

  const handleApplyQuickAction = (action: QuickOptimizationAction) => {
    if (action.type === 'set_regime') {
      setRegime(action.regime);
    } else if (action.type === 'set_origin') {
      setPreferentialOrigin(action.origin);
    } else if (action.type === 'set_insurance') {
      setValuationMode('invoice_to_av');
      setIncoterm(action.incoterm);
      setInsurancePercent(action.insurancePercent);
    } else if (action.type === 'set_domestic_vat') {
      setDomesticVatMode(action.mode);
    } else if (action.type === 'switch_hs_query') {
      setQueryInput(action.query);
      setActiveTab('classifier');
      executeClassify(action.query, { nextRegime: 'industrial' });
    }
  };

  const handleOpenEntryFromExplorer = (entry: TariffEntry, customVal?: number, customQty?: number) => {
    const syntheticCandidate: ClassificationCandidate = {
      entry,
      confidence: 99,
      matchReasons: ['Selected directly from official WCO HS2022 / Bangladesh NBR Tariff Schedule'],
      griRule: 'Direct Tariff Schedule Lookup (GRI 1)',
      whenToUse: `Direct selection of ${entry.formattedHs8}`,
    };

    const syntheticResult: ClassificationResult = {
      query: `${entry.formattedHs8} — ${entry.commercialName}`,
      engineUsed: 'builtin-hybrid',
      processingMs: 1,
      primary: syntheticCandidate,
      alternatives: [],
      signals: {
        materials: [],
        productForm: 'Direct Tariff Lookup',
        endUse: null,
        technicalSpecs: [],
        normalizedTerms: [entry.formattedHs8],
        detectedLanguage: 'en',
      },
      reasoningSummary: `Directly loaded ${entry.formattedHs8} (${entry.commercialName}) from Section ${entry.section}, Chapter ${entry.chapter}. Standard Commercial Total Tax Incidence is ${entry.tti.toFixed(2)}%.`,
      ambiguityHints: [],
      defaultAssessment: classification?.defaultAssessment as any,
    };

    setQueryInput(`${entry.formattedHs8} — ${entry.commercialName}`);
    setCustomOverrides({});
    if (customVal !== undefined) setInvoiceValue(customVal);
    if (customQty !== undefined) setQuantity(customQty);
    if (!entry.sroEligibleCapitalMachinery && regime === 'capital_machinery') {
      setRegime('commercial');
    }
    setClassification(syntheticResult);
    setSelectedCandidate(syntheticCandidate);
    setActiveTab('classifier');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToOptimizerSection = () => {
    const el = document.getElementById('tax-optimization-workbench');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      setActiveTab('optimizer');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        llmConfig={llmConfig}
        onOpenAiModal={() => setAiModalOpen(true)}
        health={health}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'classifier' && (
          <div className="space-y-6">
            {/* Product Description AI Input Panel */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                    Describe Your Import Product (English or বাংলা)
                  </h1>
                  <p className="text-xs text-slate-500">
                    Include material, function, technical specs (e.g. engine cc, wattage, GSM, bulk vs retail pack) for exact 8-digit NBR HS classification, VAT/Duty breakdown &amp; legal tax-saving options.
                  </p>
                </div>
                <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
                  <Zap className="h-3 w-3 text-emerald-600" />
                  <span>Ctrl + Enter to classify</span>
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeClassify(queryInput);
                }}
                className="mt-3.5"
              >
                <div className="relative">
                  <textarea
                    rows={3}
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        executeClassify(queryInput);
                      }
                    }}
                    placeholder="Example: 100% cotton knitted men's t-shirt 180 GSM, or Monocrystalline 550W solar PV panel, or ইন্ডাস্ট্রিয়াল সুইং মেশিন..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50/40 p-3.5 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                  />
                </div>

                {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {/* Sample Product Quick-Test Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-[11px] font-semibold text-slate-500">
                      Try sample:
                    </span>
                    {SAMPLE_PRODUCT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing Tariff...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Find HS Code &amp; Import Tax</span>
                        <CornerDownLeft className="h-3.5 w-3.5 opacity-75" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Recent Classification History */}
              {recentHistory.length > 1 && (
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <Clock className="h-3 w-3" />
                    Recent:
                  </span>
                  {recentHistory.map((item) => (
                    <button
                      key={item.hs8}
                      type="button"
                      onClick={() => {
                        setQueryInput(item.query);
                        executeClassify(item.query);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-900"
                    >
                      <span className="font-mono font-bold text-emerald-700">{item.hs8}</span>
                      <span className="max-w-[140px] truncate">{item.commercialName}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Two-Column Results Workspace + Full-Width Technical Tax Reduction & Rebate Workbench */}
            {classification && selectedCandidate && activeEntry && liveAssessment && assessmentInput ? (
              <>
                <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <ClassificationCard
                      result={classification}
                      selectedCandidate={selectedCandidate}
                      onSelectCandidate={(cand) => {
                        setCustomOverrides({});
                        if (!cand.entry.sroEligibleCapitalMachinery && regime === 'capital_machinery') {
                          setRegime('commercial');
                        }
                        setSelectedCandidate(cand);
                      }}
                      onRefineQuery={handleRefineQuery}
                    />
                  </div>

                  <div className="lg:col-span-6 lg:sticky lg:top-20">
                    <NbrTaxCalculator
                      entry={activeEntry}
                      assessment={liveAssessment}
                      invoiceValue={invoiceValue}
                      onInvoiceValueChange={setInvoiceValue}
                      quantity={quantity}
                      onQuantityChange={setQuantity}
                      currency={currency}
                      onCurrencyChange={setCurrency}
                      exchangeRateBdt={exchangeRateBdt}
                      onExchangeRateChange={setExchangeRateBdt}
                      incoterm={incoterm}
                      onIncotermChange={setIncoterm}
                      valuationMode={valuationMode}
                      onValuationModeChange={setValuationMode}
                      freightPercent={freightPercent}
                      onFreightPercentChange={setFreightPercent}
                      insurancePercent={insurancePercent}
                      onInsurancePercentChange={setInsurancePercent}
                      regime={regime}
                      onRegimeChange={setRegime}
                      preferentialOrigin={preferentialOrigin}
                      onPreferentialOriginChange={setPreferentialOrigin}
                      domesticVatMode={domesticVatMode}
                      onDomesticVatModeChange={setDomesticVatMode}
                      customOverrides={customOverrides}
                      onCustomOverridesChange={setCustomOverrides}
                      onScrollToOptimizer={scrollToOptimizerSection}
                    />
                  </div>
                </section>

                {/* Technical Duty Optimization & VAT Rebate Workbench */}
                <TaxOptimizationAdvisor
                  entry={activeEntry}
                  assessmentInput={assessmentInput}
                  assessment={liveAssessment}
                  onApplyQuickAction={handleApplyQuickAction}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <Search className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Describe any product above to find its 8-digit HS Code and Bangladesh NBR Import VAT &amp; Tax schedule.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Dedicated Full-Screen Tax Saving & Rebate Mode */}
        {activeTab === 'optimizer' && activeEntry && liveAssessment && assessmentInput && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('classifier')}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Classifier</span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-700">
                      {activeEntry.formattedHs8}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {activeEntry.commercialName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Current AV: {formatBdt(liveAssessment.valuation.assessableValueBdt)} · TTI:{' '}
                    {formatPct(liveAssessment.ttiPercent)} · Total Tax:{' '}
                    {formatBdt(liveAssessment.totalTaxBdt)}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {SAMPLE_PRODUCT_PRESETS.slice(0, 5).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <TaxOptimizationAdvisor
              entry={activeEntry}
              assessmentInput={assessmentInput}
              assessment={liveAssessment}
              onApplyQuickAction={(act) => {
                handleApplyQuickAction(act);
                setActiveTab('classifier');
              }}
            />
          </div>
        )}

        {activeTab === 'explorer' && (
          <TariffExplorer onOpenInCalculator={(entry) => handleOpenEntryFromExplorer(entry)} />
        )}

        {activeTab === 'batch' && (
          <BatchInvoiceAnalyzer
            onInspectEntry={(entry, val, qty) => handleOpenEntryFromExplorer(entry, val, qty)}
          />
        )}
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <span>
            <strong>DutyLens BD</strong> — WCO HS2022 + Bangladesh Customs (NBR) Import VAT, Duty &amp; Rebate Intelligence
          </span>
          <span>
            Note: Final customs &amp; rebate eligibility is governed by active NBR Operative Tariff Schedule (OTS), VAT &amp; SD Act 2012 &amp; Finance Act SROs.
          </span>
        </div>
      </footer>

      <AiSettingsModal
        open={aiModalOpen}
        config={llmConfig}
        onSave={saveLlmConfig}
        onClose={() => setAiModalOpen(false)}
      />
    </div>
  );
};
