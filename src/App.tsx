import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  CornerDownLeft,
  Globe,
  Link2,
  Loader2,
  Search,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { calculateNbrAssessment, DEFAULT_EXCHANGE_RATES_BDT } from '@shared/tax-math';
import {
  AppLanguage,
  BusinessRole,
  ClassificationCandidate,
  ClassificationResult,
  CloudClassificationFeedItem,
  DomesticVatMode,
  ExtractedSourceMetadata,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  NbrTaxRates,
  PreferentialOrigin,
  QuickOptimizationAction,
  SourceInputMode,
  SupportedCurrency,
  TariffEntry,
  TaxAssessmentInput,
  UserProfile,
  UserSavedQuery,
  ValuationMode,
} from '@shared/types';
import { AiSettingsModal } from '@/components/AiSettingsModal';
import { AlternativeTradeIntelligencePanel } from '@/components/AlternativeTradeIntelligencePanel';
import { AuthModalMode, AuthProfileModal } from '@/components/AuthProfileModal';
import { BatchInvoiceAnalyzer } from '@/components/BatchInvoiceAnalyzer';
import { ClassificationCard } from '@/components/ClassificationCard';
import { ExecutiveSummaryPanel } from '@/components/ExecutiveSummaryPanel';
import { MultimodalSourceInput } from '@/components/MultimodalSourceInput';
import { ActiveTab, Navbar } from '@/components/Navbar';
import { NbrTaxCalculator } from '@/components/NbrTaxCalculator';
import { TariffExplorer } from '@/components/TariffExplorer';
import { TaxOptimizationAdvisor } from '@/components/TaxOptimizationAdvisor';
import {
  analyzeSourceApi,
  classifyProductApi,
  createSharedAssessmentApi,
  deleteUserSavedQueryApi,
  fetchCloudStatus,
  fetchCurrentUserApi,
  fetchHealth,
  fetchSharedAssessmentApi,
  fetchTariffByCodeApi,
  fetchUserSavedQueriesApi,
  HealthStats,
  loginApi,
  signupApi,
  updateProfileApi,
} from '@/lib/api';
import { formatBdt, formatPct } from '@/lib/format';
import { UI_STRINGS } from '@/lib/i18n';
import { SAMPLE_PRODUCT_PRESETS, SampleProductPreset } from '@/lib/presets';

const LLM_STORAGE_KEY = 'dutylens_bd_llm_config_v1';
const HISTORY_STORAGE_KEY = 'dutylens_bd_recent_queries_v1';
const LANG_STORAGE_KEY = 'dutylens_bd_lang_v1';
const AUTH_TOKEN_STORAGE_KEY = 'dutylens_bd_auth_token_v1';

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

  // Bilingual UI Language (English / বাংলা)
  const [lang, setLang] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'bn' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const handleChangeLang = (nextLang: AppLanguage) => {
    setLang(nextLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore
    }
  };

  // User Auth & Profile State
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [savedQueries, setSavedQueries] = useState<UserSavedQuery[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signup');

  const t = UI_STRINGS[lang];
  const isBn = lang === 'bn';

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
  const [inputMode, setInputMode] = useState<SourceInputMode>('text');
  const [sourceMeta, setSourceMeta] = useState<ExtractedSourceMetadata | null>(null);
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
  const [cloudFeed, setCloudFeed] = useState<CloudClassificationFeedItem[]>([]);
  const [loadedShareSlug, setLoadedShareSlug] = useState<string | null>(null);

  const refreshCloudFeed = () => {
    fetchCloudStatus()
      .then((st) => {
        if (st?.recentClassifications) setCloudFeed(st.recentClassifications);
      })
      .catch(() => {});
  };

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
      skipCloudLog?: boolean;
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
        skipCloudLog: opts?.skipCloudLog,
        authToken,
      });
      if (!res.primary.entry.sroEligibleCapitalMachinery && effectiveRegime === 'capital_machinery') {
        setRegime('commercial');
      }
      setClassification(res);
      setSelectedCandidate(res.primary);
      pushRecentHistory(res);
      if (!opts?.skipCloudLog) {
        refreshCloudFeed();
        if (authToken) {
          fetchUserSavedQueriesApi(authToken)
            .then(setSavedQueries)
            .catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to classify product.');
    } finally {
      setLoading(false);
    }
  };

  const executeAnalyzeSource = async (
    params:
      | {
          mode: 'photo';
          imageBase64: string;
          imageMimeType: string;
          imageFileName: string;
          userHint?: string;
        }
      | {
          mode: 'link';
          url: string;
          userHint?: string;
        }
  ) => {
    setError(null);
    setLoading(true);
    setCustomOverrides({});

    try {
      const { sourceMeta: meta, classification: res } = await analyzeSourceApi({
        ...params,
        invoiceValue,
        currency,
        exchangeRateBdt,
        incoterm,
        quantity,
        regime,
        llmConfig,
        authToken,
      });

      setSourceMeta(meta);
      if (!meta.needsUserHint && meta.extractedTitle) {
        setQueryInput(meta.extractedTitle);
      }
      if (meta.detectedCurrency) {
        setCurrency(meta.detectedCurrency);
        setExchangeRateBdt(DEFAULT_EXCHANGE_RATES_BDT[meta.detectedCurrency]);
      }
      if (meta.detectedPrice && meta.detectedPrice > 0) {
        setInvoiceValue(Math.round(meta.detectedPrice * Math.max(1, quantity) * 100) / 100);
      }
      if (meta.suggestedPreferentialOrigin) {
        setPreferentialOrigin(meta.suggestedPreferentialOrigin);
      }
      if (!res.primary.entry.sroEligibleCapitalMachinery && regime === 'capital_machinery') {
        setRegime('commercial');
      }
      setClassification(res);
      setSelectedCandidate(res.primary);
      if (!meta.needsUserHint) {
        pushRecentHistory(res);
        refreshCloudFeed();
        if (authToken) {
          fetchUserSavedQueriesApi(authToken)
            .then(setSavedQueries)
            .catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to analyze photo or product link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authToken) return;
    fetchCurrentUserApi(authToken)
      .then(({ user, savedQueries: queries }) => {
        setCurrentUser(user);
        setSavedQueries(queries);
      })
      .catch(() => {
        setAuthToken(null);
        setCurrentUser(null);
        try {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
      });
  }, [authToken]);

  const persistSession = (token: string, user: UserProfile, queries: UserSavedQuery[] = []) => {
    setAuthToken(token);
    setCurrentUser(user);
    setSavedQueries(queries);
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // ignore
    }
  };

  const handleSignup = async (params: {
    email: string;
    password: string;
    fullName: string;
    companyName: string;
    businessRole: BusinessRole;
    mobileNumber: string;
  }) => {
    const { user, token } = await signupApi(params);
    persistSession(token, user, []);
  };

  const handleLogin = async (params: { email: string; password: string }) => {
    const { user, token, savedQueries: queries } = await loginApi(params);
    persistSession(token, user, queries);
  };

  const handleUpdateProfile = async (patch: {
    fullName: string;
    companyName: string;
    businessRole: BusinessRole;
    mobileNumber: string;
  }) => {
    if (!authToken) return;
    const updated = await updateProfileApi(authToken, patch);
    setCurrentUser(updated);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setSavedQueries([]);
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleLoadSavedQuery = async (q: UserSavedQuery) => {
    try {
      setLoading(true);
      const entry = await fetchTariffByCodeApi(q.hs8);
      const syntheticCandidate: ClassificationCandidate = {
        entry,
        confidence: q.confidence,
        matchReasons: ['Restored from your Saved Profile Query History'],
        griRule: 'Saved Profile Classification',
        whenToUse: `Saved query for ${entry.formattedHs8}`,
      };
      const syntheticAssessment = calculateNbrAssessment({
        rates: entry.rates,
        sroEligibleCapitalMachinery: entry.sroEligibleCapitalMachinery,
        regime: q.regime,
        preferentialOrigin: q.preferentialOrigin,
        domesticVatMode: q.domesticVatMode,
        valuationMode: 'invoice_to_av',
        incoterm: q.incoterm,
        invoiceValue: q.invoiceValue,
        freightPercent,
        insurancePercent,
        currency: q.currency,
        exchangeRateBdt: q.exchangeRateBdt,
        quantity: q.quantity,
        unit: entry.unit,
      });
      setQueryInput(q.query);
      setInvoiceValue(q.invoiceValue);
      setCurrency(q.currency);
      setExchangeRateBdt(q.exchangeRateBdt);
      setIncoterm(q.incoterm);
      setQuantity(q.quantity);
      setRegime(q.regime);
      setPreferentialOrigin(q.preferentialOrigin);
      setDomesticVatMode(q.domesticVatMode);
      setCustomOverrides({});
      setSelectedCandidate(syntheticCandidate);
      setClassification({
        query: q.query,
        engineUsed: 'builtin-hybrid',
        processingMs: 1,
        primary: syntheticCandidate,
        alternatives: [],
        signals: {
          materials: [],
          productForm: 'Saved Profile Query',
          endUse: null,
          technicalSpecs: [],
          normalizedTerms: [entry.formattedHs8],
          detectedLanguage: 'en',
        },
        reasoningSummary: `Restored "${q.query}" (${entry.formattedHs8} — ${entry.commercialName}) from your profile.`,
        ambiguityHints: [],
        defaultAssessment: syntheticAssessment,
      });
      setActiveTab('classifier');
    } catch {
      setQueryInput(q.query);
      setActiveTab('classifier');
      executeClassify(q.query, {
        nextInvoiceUsd: q.invoiceValue,
        nextQty: q.quantity,
        nextRegime: q.regime,
        skipCloudLog: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedQuery = async (id: string) => {
    if (!authToken) return;
    await deleteUserSavedQueryApi(authToken, id);
    setSavedQueries((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => {});
    refreshCloudFeed();

    const params = new URLSearchParams(window.location.search);
    const shareSlug = params.get('share');
    if (shareSlug) {
      setLoading(true);
      fetchSharedAssessmentApi(shareSlug)
        .then(({ shared, entry }) => {
          const syntheticCandidate: ClassificationCandidate = {
            entry,
            confidence: 99,
            matchReasons: [`Loaded from Shared Cloud Assessment Link (#${shared.slug})`],
            griRule: 'Shared NBR Cloud Costing Sheet',
            whenToUse: `Shared assessment for ${entry.formattedHs8}`,
          };
          const syntheticAssessment = calculateNbrAssessment({
            rates: entry.rates,
            sroEligibleCapitalMachinery: entry.sroEligibleCapitalMachinery,
            regime: shared.regime,
            preferentialOrigin: shared.preferentialOrigin,
            domesticVatMode: shared.domesticVatMode,
            valuationMode: shared.valuationMode,
            incoterm: shared.incoterm,
            invoiceValue: shared.invoiceValue,
            freightPercent: shared.freightPercent,
            insurancePercent: shared.insurancePercent,
            currency: shared.currency,
            exchangeRateBdt: shared.exchangeRateBdt,
            quantity: shared.quantity,
            unit: entry.unit,
          });
          setQueryInput(shared.query || `${entry.formattedHs8} — ${entry.commercialName}`);
          setInvoiceValue(shared.invoiceValue);
          setCurrency(shared.currency);
          setExchangeRateBdt(shared.exchangeRateBdt);
          setIncoterm(shared.incoterm);
          setValuationMode(shared.valuationMode);
          setFreightPercent(shared.freightPercent);
          setInsurancePercent(shared.insurancePercent);
          setQuantity(shared.quantity);
          setRegime(shared.regime);
          setPreferentialOrigin(shared.preferentialOrigin);
          setDomesticVatMode(shared.domesticVatMode);
          setSelectedCandidate(syntheticCandidate);
          setClassification({
            query: shared.query || `${entry.formattedHs8} — ${entry.commercialName}`,
            engineUsed: 'builtin-hybrid',
            processingMs: 1,
            primary: syntheticCandidate,
            alternatives: [],
            signals: {
              materials: [],
              productForm: 'Shared Cloud Costing',
              endUse: null,
              technicalSpecs: [],
              normalizedTerms: [entry.formattedHs8],
              detectedLanguage: 'en',
            },
            reasoningSummary: `Restored saved cloud duty & rebate sheet (#${shared.slug}) for ${entry.formattedHs8} (${entry.commercialName}).`,
            ambiguityHints: [],
            defaultAssessment: syntheticAssessment,
          });
          setLoadedShareSlug(shared.slug);
        })
        .catch(() => {
          executeClassify(SAMPLE_PRODUCT_PRESETS[0].query, {
            nextInvoiceUsd: SAMPLE_PRODUCT_PRESETS[0].defaultInvoiceUsd,
            nextQty: SAMPLE_PRODUCT_PRESETS[0].defaultQty,
            nextRegime: 'commercial',
            skipCloudLog: true,
          });
        })
        .finally(() => setLoading(false));
      return;
    }

    executeClassify(SAMPLE_PRODUCT_PRESETS[0].query, {
      nextInvoiceUsd: SAMPLE_PRODUCT_PRESETS[0].defaultInvoiceUsd,
      nextQty: SAMPLE_PRODUCT_PRESETS[0].defaultQty,
      nextRegime: 'commercial',
      skipCloudLog: true,
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

  const handleShareCloudLink = async (): Promise<string | null> => {
    if (!activeEntry || !liveAssessment) return null;
    try {
      const saved = await createSharedAssessmentApi({
        query: queryInput,
        hs8: activeEntry.hs8,
        invoiceValue,
        currency,
        exchangeRateBdt,
        incoterm,
        valuationMode,
        freightPercent,
        insurancePercent,
        quantity,
        regime,
        preferentialOrigin,
        domesticVatMode,
        ttiPercent: liveAssessment.ttiPercent,
        totalTaxBdt: liveAssessment.totalTaxBdt,
        totalLandedBdt: liveAssessment.totalLandedCostBdt,
      });
      const url = `${window.location.origin}${window.location.pathname}?share=${saved.slug}`;
      try {
        window.history.replaceState({}, '', `?share=${saved.slug}`);
      } catch {
        // ignore
      }
      setLoadedShareSlug(saved.slug);
      return url;
    } catch (err: any) {
      setError(err?.message || 'Could not create shared cloud link.');
      return null;
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
        lang={lang}
        onChangeLang={handleChangeLang}
        user={currentUser}
        savedQueriesCount={savedQueries.length}
        onOpenAuthModal={(m) => {
          setAuthModalMode(m);
          setAuthModalOpen(true);
        }}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {loadedShareSlug && activeTab === 'classifier' && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-2.5 text-xs text-emerald-900 no-print">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                {isBn ? (
                  <>
                    শেয়ারকৃত ক্লাউড অ্যাসেসমেন্ট <strong className="font-mono">#{loadedShareSlug}</strong>{' '}
                    লোড হয়েছে — ইনভয়েস মূল্য, লাইসেন্স ও ভ্যাট রেয়াত সেটিংস সংযুক্ত।
                  </>
                ) : (
                  <>
                    Viewing Shared Cloud Assessment{' '}
                    <strong className="font-mono">#{loadedShareSlug}</strong> — invoice valuation, NBR regime &amp; VAT rebate mode synced from Supabase Cloud.
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadedShareSlug(null);
                try {
                  window.history.replaceState({}, '', window.location.pathname);
                } catch {
                  // ignore
                }
              }}
              className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100"
              aria-label="Dismiss notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {activeTab === 'classifier' && (
          <div className="space-y-6">
            {/* Product Description AI Input Panel */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                    {t.describeTitle}
                  </h1>
                  <p className="text-xs text-slate-500">{t.describeSubtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('profile');
                        setAuthModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100"
                    >
                      <span>✓ {t.savedInProfileBadge}</span>
                    </button>
                  )}
                  <span className="hidden items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
                    <Zap className="h-3 w-3 text-emerald-600" />
                    <span>{t.ctrlEnterHint}</span>
                  </span>
                </div>
              </div>

              <MultimodalSourceInput
                lang={lang}
                mode={inputMode}
                onChangeMode={(m) => {
                  setInputMode(m);
                  setError(null);
                }}
                queryInput={queryInput}
                onChangeQueryInput={setQueryInput}
                onSubmitText={() => {
                  setSourceMeta(null);
                  executeClassify(queryInput);
                }}
                onSubmitPhoto={(p) => executeAnalyzeSource({ mode: 'photo', ...p })}
                onSubmitLink={(l) => executeAnalyzeSource({ mode: 'link', ...l })}
                loading={loading}
                error={error}
                samplePresets={SAMPLE_PRODUCT_PRESETS.map((p) => ({
                  label: p.label,
                  query: p.query,
                }))}
                onSelectPreset={(idx) => {
                  const p = SAMPLE_PRODUCT_PRESETS[idx];
                  if (p) {
                    setSourceMeta(null);
                    handlePresetClick(p);
                  }
                }}
                sourceMeta={sourceMeta}
                onClearSourceMeta={() => setSourceMeta(null)}
                activePreferentialOrigin={preferentialOrigin}
                onApplyPreferentialOrigin={setPreferentialOrigin}
                llmConfig={llmConfig}
                onOpenAiModal={() => setAiModalOpen(true)}
              />

              {/* Recent & Cloud Classification History */}
              {(recentHistory.length > 1 || cloudFeed.length > 0) && (
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  {recentHistory.length > 1 && (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock className="h-3 w-3" />
                        {t.recentLabel}
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
                    </>
                  )}

                  {cloudFeed.length > 0 && (
                    <>
                      <span className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Globe className="h-3 w-3" />
                        {t.liveCloudLabel}
                      </span>
                      {cloudFeed.slice(0, 4).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setQueryInput(item.query);
                            executeClassify(item.query);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50/60 px-2 py-0.5 text-[11px] text-emerald-900 transition hover:bg-emerald-100/70"
                        >
                          <span className="font-mono font-bold text-emerald-700">{item.hs8}</span>
                          <span className="max-w-[130px] truncate">{item.commercialName}</span>
                        </button>
                      ))}
                    </>
                  )}
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
                      lang={lang}
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
                      onShareCloudLink={handleShareCloudLink}
                      lang={lang}
                    />
                  </div>
                </section>

                {/* 4-Pillar Alternative Duty, Rebate Scope, Zero-Tax & Best Import Destination Matrix */}
                <AlternativeTradeIntelligencePanel
                  entry={activeEntry}
                  classification={classification}
                  assessmentInput={assessmentInput}
                  assessment={liveAssessment}
                  sourceMeta={sourceMeta}
                  lang={lang}
                  onApplyQuickAction={handleApplyQuickAction}
                  onSwitchCandidate={(cand) => {
                    setCustomOverrides({});
                    if (!cand.entry.sroEligibleCapitalMachinery && regime === 'capital_machinery') {
                      setRegime('commercial');
                    }
                    setSelectedCandidate(cand);
                  }}
                />

                {/* Technical Duty Optimization & VAT Rebate Workbench */}
                <TaxOptimizationAdvisor
                  entry={activeEntry}
                  assessmentInput={assessmentInput}
                  assessment={liveAssessment}
                  onApplyQuickAction={handleApplyQuickAction}
                />

                {/* Bottom Time-Saving Summarize Button & Bilingual Technical Terms Explainer */}
                <ExecutiveSummaryPanel
                  lang={lang}
                  onChangeLang={handleChangeLang}
                  entry={activeEntry}
                  assessmentInput={assessmentInput}
                  assessment={liveAssessment}
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

            <AlternativeTradeIntelligencePanel
              entry={activeEntry}
              classification={classification}
              assessmentInput={assessmentInput}
              assessment={liveAssessment}
              sourceMeta={sourceMeta}
              lang={lang}
              onApplyQuickAction={(act) => {
                handleApplyQuickAction(act);
                setActiveTab('classifier');
              }}
            />

            <TaxOptimizationAdvisor
              entry={activeEntry}
              assessmentInput={assessmentInput}
              assessment={liveAssessment}
              onApplyQuickAction={(act) => {
                handleApplyQuickAction(act);
                setActiveTab('classifier');
              }}
            />

            <ExecutiveSummaryPanel
              lang={lang}
              onChangeLang={handleChangeLang}
              entry={activeEntry}
              assessmentInput={assessmentInput}
              assessment={liveAssessment}
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
            <strong>{t.footerTitle}</strong>
          </span>
          <span>{t.footerNote}</span>
        </div>
      </footer>

      <AiSettingsModal
        open={aiModalOpen}
        config={llmConfig}
        onSave={saveLlmConfig}
        onClose={() => setAiModalOpen(false)}
      />

      <AuthProfileModal
        open={authModalOpen}
        initialMode={authModalMode}
        lang={lang}
        user={currentUser}
        savedQueries={savedQueries}
        onClose={() => setAuthModalOpen(false)}
        onSignup={handleSignup}
        onLogin={handleLogin}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        onLoadSavedQuery={handleLoadSavedQuery}
        onDeleteSavedQuery={handleDeleteSavedQuery}
      />
    </div>
  );
};
