import {
  BatchClassificationResult,
  BatchItemInput,
  ClassificationResult,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  SectionSummary,
  SupportedCurrency,
  TariffEntry,
} from '@shared/types';

export interface HealthStats {
  ok: boolean;
  service: string;
  edition: string;
  stats: {
    totalTariffCodes: number;
    sections: number;
    chapters: number;
    headings: number;
    curatedBctCodes: number;
  };
}

export async function fetchHealth(): Promise<HealthStats> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Failed to load service health');
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
