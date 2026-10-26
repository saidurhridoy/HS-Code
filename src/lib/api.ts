import {
  BatchClassificationResult,
  BatchItemInput,
  ClassificationResult,
  CloudClassificationFeedItem,
  DomesticVatMode,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  PreferentialOrigin,
  SectionSummary,
  SharedAssessmentRecord,
  SupportedCurrency,
  TariffEntry,
  ValuationMode,
} from '@shared/types';

export interface HealthStats {
  ok: boolean;
  service: string;
  edition: string;
  cloudConnected?: boolean;
  stats: {
    totalTariffCodes: number;
    sections: number;
    chapters: number;
    headings: number;
    curatedBctCodes: number;
  };
}

export interface CloudStatusResponse {
  connected: boolean;
  provider: 'supabase' | 'memory-fallback';
  recentClassifications: CloudClassificationFeedItem[];
  totalClassifications: number;
  totalSharedAssessments: number;
}

export async function fetchHealth(): Promise<HealthStats> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Failed to load service health');
  return res.json();
}

export async function fetchCloudStatus(): Promise<CloudStatusResponse> {
  const res = await fetch('/api/cloud/status');
  if (!res.ok) throw new Error('Failed to load cloud status');
  return res.json();
}

export async function classifyProductApi(params: {
  query: string;
  regime?: ImporterRegime;
  invoiceValue?: number;
  currency?: SupportedCurrency;
  exchangeRateBdt?: number;
  incoterm?: Incoterm;
  quantity?: number;
  llm?: LlmConfig;
  skipCloudLog?: boolean;
}): Promise<ClassificationResult> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Classification request failed');
  }
  return data as ClassificationResult;
}

export async function fetchTariffSections(): Promise<SectionSummary[]> {
  const res = await fetch('/api/tariff/sections');
  if (!res.ok) throw new Error('Failed to load WCO sections');
  const data = await res.json();
  return data.sections as SectionSummary[];
}

export async function searchTariffEntries(params: {
  q?: string;
  section?: string;
  chapter?: string;
  curatedOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; items: TariffEntry[] }> {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.section) sp.set('section', params.section);
  if (params.chapter) sp.set('chapter', params.chapter);
  if (params.curatedOnly) sp.set('curatedOnly', 'true');
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.offset) sp.set('offset', String(params.offset));

  const res = await fetch(`/api/tariff/search?${sp.toString()}`);
  if (!res.ok) throw new Error('Failed to search tariff schedule');
  return res.json();
}

export async function classifyBatchApi(params: {
  items: BatchItemInput[];
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  incoterm: Incoterm;
  regime: ImporterRegime;
}): Promise<BatchClassificationResult> {
  const res = await fetch('/api/batch-classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Batch classification failed');
  return data as BatchClassificationResult;
}

export async function createSharedAssessmentApi(params: {
  query?: string | null;
  hs8: string;
  invoiceValue: number;
  currency: SupportedCurrency;
  exchangeRateBdt: number;
  incoterm: Incoterm;
  valuationMode: ValuationMode;
  freightPercent: number;
  insurancePercent: number;
  quantity: number;
  regime: ImporterRegime;
  preferentialOrigin: PreferentialOrigin;
  domesticVatMode: DomesticVatMode;
  ttiPercent: number;
  totalTaxBdt: number;
  totalLandedBdt: number;
}): Promise<SharedAssessmentRecord> {
  const res = await fetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Failed to save shared cloud assessment');
  return data.shared as SharedAssessmentRecord;
}

export async function fetchSharedAssessmentApi(
  slug: string
): Promise<{ shared: SharedAssessmentRecord; entry: TariffEntry }> {
  const res = await fetch(`/api/assessments/${encodeURIComponent(slug)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Shared assessment not found');
  return data as { shared: SharedAssessmentRecord; entry: TariffEntry };
}

