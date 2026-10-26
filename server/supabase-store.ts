import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  CloudClassificationFeedItem,
  DomesticVatMode,
  ImporterRegime,
  Incoterm,
  PreferentialOrigin,
  SharedAssessmentRecord,
  SupportedCurrency,
  ValuationMode,
} from '../shared/types.js';

let envLoaded = false;
function ensureLocalEnvLoaded(): void {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // ignore missing or unreadable .env
  }
}

function getSupabaseConfig(): { url: string; apiKey: string } | null {
  ensureLocalEnvLoaded();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const apiKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

// Local fallback store when running offline without SUPABASE_URL
const memoryAssessments = new Map<string, SharedAssessmentRecord>();
const memoryFeed: CloudClassificationFeedItem[] = [];

function generateSlug(): string {
  const bytes = crypto.randomBytes(4);
  const token = bytes.toString('hex').slice(0, 7);
  return `dl-${token}`;
}

export async function logClassificationEvent(input: {
  query: string;
  hs8: string;
  commercialName: string;
  confidence: number;
  tti: number;
  regime: ImporterRegime;
  engineUsed: string;
}): Promise<void> {
  const sanitizedQuery = input.query.trim().slice(0, 500);
  if (sanitizedQuery.length < 2) return;

  const cfg = getSupabaseConfig();
  if (!cfg) {
    memoryFeed.unshift({
      id: crypto.randomUUID(),
      query: sanitizedQuery,
      hs8: input.hs8,
      commercialName: input.commercialName,
      confidence: Math.round(input.confidence),
      tti: input.tti,
      regime: input.regime,
      engineUsed: input.engineUsed,
      createdAt: new Date().toISOString(),
    });
    if (memoryFeed.length > 25) memoryFeed.length = 25;
    return;
  }

  try {
    await fetch(`${cfg.url}/rest/v1/classification_logs`, {
      method: 'POST',
      headers: {
        apikey: cfg.apiKey,
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        query: sanitizedQuery,
        hs8: input.hs8,
        commercial_name: input.commercialName,
        confidence: Math.round(input.confidence),
        tti: input.tti,
        regime: input.regime,
        engine_used: input.engineUsed,
      }),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Non-blocking telemetry
  }
}

export async function getCloudStatusAndFeed(limit = 6): Promise<{
  connected: boolean;
  provider: 'supabase' | 'memory-fallback';
  recentClassifications: CloudClassificationFeedItem[];
  totalClassifications: number;
  totalSharedAssessments: number;
}> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    return {
      connected: false,
      provider: 'memory-fallback',
      recentClassifications: memoryFeed.slice(0, limit),
      totalClassifications: memoryFeed.length,
      totalSharedAssessments: memoryAssessments.size,
    };
  }

  try {
    const [logsRes, sharedRes] = await Promise.all([
      fetch(
        `${cfg.url}/rest/v1/classification_logs?select=id,query,hs8,commercial_name,confidence,tti,regime,engine_used,created_at&order=created_at.desc&limit=${limit}`,
        {
          headers: {
            apikey: cfg.apiKey,
            Authorization: `Bearer ${cfg.apiKey}`,
            Prefer: 'count=exact',
          },
          signal: AbortSignal.timeout(3000),
        }
      ),
      fetch(`${cfg.url}/rest/v1/shared_assessments?select=id&limit=1`, {
        headers: {
          apikey: cfg.apiKey,
          Authorization: `Bearer ${cfg.apiKey}`,
          Prefer: 'count=exact',
        },
        signal: AbortSignal.timeout(3000),
      }),
    ]);

    const parseTotalFromRange = (rangeHeader: string | null): number => {
      if (!rangeHeader) return 0;
      const slash = rangeHeader.lastIndexOf('/');
      if (slash === -1) return 0;
      const num = parseInt(rangeHeader.slice(slash + 1), 10);
      return Number.isFinite(num) ? num : 0;
    };

    const rows = logsRes.ok ? ((await logsRes.json()) as any[]) : [];
    const totalClassifications = parseTotalFromRange(logsRes.headers.get('content-range')) || rows.length;
    const totalSharedAssessments = parseTotalFromRange(sharedRes.headers.get('content-range'));

    const recentClassifications: CloudClassificationFeedItem[] = rows.map((r) => ({
      id: String(r.id),
      query: String(r.query),
      hs8: String(r.hs8),
      commercialName: String(r.commercial_name),
      confidence: Number(r.confidence) || 80,
      tti: Number(r.tti) || 0,
      regime: (r.regime as ImporterRegime) || 'commercial',
      engineUsed: String(r.engine_used || 'builtin-hybrid'),
      createdAt: String(r.created_at || new Date().toISOString()),
    }));

    return {
      connected: logsRes.ok,
      provider: 'supabase',
      recentClassifications,
      totalClassifications,
      totalSharedAssessments,
    };
  } catch {
    return {
      connected: false,
      provider: 'supabase',
      recentClassifications: [],
      totalClassifications: 0,
      totalSharedAssessments: 0,
    };
  }
}

export interface CreateSharedAssessmentInput {
  query?: string | null;
  hs8: string;
  commercialName: string;
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
}

export async function createSharedAssessment(
  input: CreateSharedAssessmentInput
): Promise<SharedAssessmentRecord> {
  const slug = generateSlug();
  const createdAt = new Date().toISOString();

  const record: SharedAssessmentRecord = {
    slug,
    query: input.query ? String(input.query).slice(0, 500) : null,
    hs8: input.hs8.replace(/\D/g, ''),
    commercialName: input.commercialName,
    invoiceValue: Number(input.invoiceValue) || 0,
    currency: input.currency || 'USD',
    exchangeRateBdt: Number(input.exchangeRateBdt) || 122,
    incoterm: input.incoterm || 'CFR',
    valuationMode: input.valuationMode || 'invoice_to_av',
    freightPercent: Number(input.freightPercent ?? 5),
    insurancePercent: Number(input.insurancePercent ?? 1),
    quantity: Number(input.quantity) || 1,
    regime: input.regime || 'commercial',
    preferentialOrigin: input.preferentialOrigin || 'none',
    domesticVatMode: input.domesticVatMode || 'standard_15',
    ttiPercent: Number(input.ttiPercent) || 0,
    totalTaxBdt: Number(input.totalTaxBdt) || 0,
    totalLandedBdt: Number(input.totalLandedBdt) || 0,
    createdAt,
  };

  const cfg = getSupabaseConfig();
  if (!cfg) {
    memoryAssessments.set(slug, record);
    return record;
  }

  const res = await fetch(`${cfg.url}/rest/v1/shared_assessments`, {
    method: 'POST',
    headers: {
      apikey: cfg.apiKey,
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      slug: record.slug,
      query: record.query,
      hs8: record.hs8,
      commercial_name: record.commercialName,
      invoice_value: record.invoiceValue,
      currency: record.currency,
      exchange_rate_bdt: record.exchangeRateBdt,
      incoterm: record.incoterm,
      valuation_mode: record.valuationMode,
      freight_percent: record.freightPercent,
      insurance_percent: record.insurancePercent,
      quantity: record.quantity,
      regime: record.regime,
      preferential_origin: record.preferentialOrigin,
      domestic_vat_mode: record.domesticVatMode,
      tti_percent: record.ttiPercent,
      total_tax_bdt: record.totalTaxBdt,
      total_landed_bdt: record.totalLandedBdt,
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase save failed: ${errText}`);
  }

  const rows = (await res.json()) as any[];
  if (rows && rows[0]?.created_at) {
    record.createdAt = String(rows[0].created_at);
  }
  return record;
}

export async function getSharedAssessmentBySlug(
  slug: string
): Promise<SharedAssessmentRecord | null> {
  const cleanSlug = slug.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanSlug) return null;

  const cfg = getSupabaseConfig();
  if (!cfg) {
    return memoryAssessments.get(cleanSlug) || null;
  }

  const res = await fetch(
    `${cfg.url}/rest/v1/shared_assessments?slug=eq.${encodeURIComponent(cleanSlug)}&limit=1`,
    {
      headers: {
        apikey: cfg.apiKey,
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      signal: AbortSignal.timeout(4000),
    }
  );

  if (!res.ok) return null;
  const rows = (await res.json()) as any[];
  if (!rows || rows.length === 0) return null;

  const r = rows[0];
  return {
    slug: String(r.slug),
    query: r.query ? String(r.query) : null,
    hs8: String(r.hs8),
    commercialName: String(r.commercial_name),
    invoiceValue: Number(r.invoice_value) || 0,
    currency: (r.currency as SupportedCurrency) || 'USD',
    exchangeRateBdt: Number(r.exchange_rate_bdt) || 122,
    incoterm: (r.incoterm as Incoterm) || 'CFR',
    valuationMode: (r.valuation_mode as ValuationMode) || 'invoice_to_av',
    freightPercent: Number(r.freight_percent ?? 5),
    insurancePercent: Number(r.insurance_percent ?? 1),
    quantity: Number(r.quantity) || 1,
    regime: (r.regime as ImporterRegime) || 'commercial',
    preferentialOrigin: (r.preferential_origin as PreferentialOrigin) || 'none',
    domesticVatMode: (r.domestic_vat_mode as DomesticVatMode) || 'standard_15',
    ttiPercent: Number(r.tti_percent) || 0,
    totalTaxBdt: Number(r.total_tax_bdt) || 0,
    totalLandedBdt: Number(r.total_landed_bdt) || 0,
    createdAt: String(r.created_at),
  };
}
