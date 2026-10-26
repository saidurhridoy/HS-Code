import express from 'express';
import { calculateNbrAssessment, simulateDomesticVatComparison } from '../shared/tax-math.js';
import { generateOptimizationPlan } from '../shared/tax-optimizer.js';
import {
  BatchItemInput,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  SupportedCurrency,
  TaxAssessmentInput,
} from '../shared/types.js';
import { getClassificationEngine } from './engine/classifier.js';
import {
  createSharedAssessment,
  getCloudStatusAndFeed,
  getSharedAssessmentBySlug,
  isSupabaseConfigured,
  logClassificationEvent,
} from './supabase-store.js';
import { getTariffStore } from './tariff/tariff-store.js';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Warm up store & BM25 index eagerly so first request is <10ms
  const store = getTariffStore();
  const engine = getClassificationEngine();

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'DutyLens BD — AI HS Code & NBR Tariff Engine',
      edition: 'WCO HS2022 + Bangladesh NBR Operative Tariff Schedule',
      cloudConnected: isSupabaseConfigured(),
      stats: {
        totalTariffCodes: store.entries.length,
        sections: store.sections.length,
        chapters: store.chapters.size,
        headings: store.headings.size,
        curatedBctCodes: store.entries.filter((e) => e.curated).length,
      },
    });
  });

  app.get('/api/cloud/status', async (_req, res) => {
    try {
      const status = await getCloudStatusAndFeed(6);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to read cloud status' });
    }
  });

  app.post('/api/classify', async (req, res) => {
    try {
      const {
        query,
        regime,
        invoiceValue,
        currency,
        exchangeRateBdt,
        incoterm,
        quantity,
        llm,
        skipCloudLog,
      } = req.body || {};
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        res.status(400).json({ error: 'Please enter a product name or description (at least 2 characters).' });
        return;
      }

      const result = await engine.classify(query, {
        regime: regime as ImporterRegime | undefined,
        invoiceValue: typeof invoiceValue === 'number' ? invoiceValue : undefined,
        currency: currency as SupportedCurrency | undefined,
        exchangeRateBdt: typeof exchangeRateBdt === 'number' ? exchangeRateBdt : undefined,
        incoterm: incoterm as Incoterm | undefined,
        quantity: typeof quantity === 'number' ? quantity : undefined,
        llm: llm as LlmConfig | undefined,
      });

      if (!skipCloudLog) {
        await logClassificationEvent({
          query: result.query,
          hs8: result.primary.entry.formattedHs8,
          commercialName: result.primary.entry.commercialName,
          confidence: result.primary.confidence,
          tti: result.defaultAssessment.ttiPercent,
          regime: result.defaultAssessment.regime,
          engineUsed: result.engineUsed,
        });
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Classification failed' });
    }
  });

  app.post('/api/calculate', (req, res) => {
    try {
      const input = req.body as TaxAssessmentInput;
      if (!input || !input.rates) {
        res.status(400).json({ error: 'Missing tax rate parameters.' });
        return;
      }
      const assessment = calculateNbrAssessment(input);
      res.json(assessment);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Tax calculation failed' });
    }
  });

  app.post('/api/optimize', (req, res) => {
    try {
      const {
        hs8,
        regime = 'commercial',
        preferentialOrigin = 'none',
        domesticVatMode = 'standard_15',
        valuationMode = 'invoice_to_av',
        incoterm = 'CIF',
        invoiceValue = 10000,
        insurancePercent = 1.0,
        freightPercent = 5.0,
        currency = 'USD',
        exchangeRateBdt = 122,
        quantity = 10,
        markupPercent = 20,
        buyerIsVatRegisteredB2B = true,
      } = req.body || {};

      if (!hs8 || typeof hs8 !== 'string') {
        res.status(400).json({ error: 'Missing hs8 tariff code.' });
        return;
      }
      const entry = store.findByCode(hs8);
      if (!entry) {
        res.status(404).json({ error: `HS Code '${hs8}' not found.` });
        return;
      }

      const input: TaxAssessmentInput = {
        rates: entry.rates,
        sroEligibleCapitalMachinery: entry.sroEligibleCapitalMachinery,
        regime,
        preferentialOrigin,
        domesticVatMode,
        valuationMode,
        incoterm,
        invoiceValue: Number(invoiceValue) || 0,
        insurancePercent: Number(insurancePercent),
        freightPercent: Number(freightPercent),
        currency,
        exchangeRateBdt: Number(exchangeRateBdt) || 122,
        quantity: Number(quantity) || 1,
        unit: entry.unit,
      };

      const assessment = calculateNbrAssessment(input);
      const optimizationPlan = generateOptimizationPlan(entry, input, assessment);
      const vatComparison = simulateDomesticVatComparison(
        assessment,
        Number(markupPercent) || 20,
        Boolean(buyerIsVatRegisteredB2B)
      );

      res.json({
        entry,
        assessment,
        optimizationPlan,
        vatComparison,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Optimization analysis failed' });
    }
  });

  app.post('/api/batch-classify', async (req, res) => {
    try {
      const { items, currency = 'USD', exchangeRateBdt = 122, incoterm = 'CIF', regime = 'commercial' } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Please provide at least one invoice line item.' });
        return;
      }

      const result = await engine.classifyBatch({
        items: items as BatchItemInput[],
        currency,
        exchangeRateBdt: Number(exchangeRateBdt) || 122,
        incoterm,
        regime,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Batch classification failed' });
    }
  });

  app.get('/api/tariff/sections', (_req, res) => {
    res.json({ sections: store.sections });
  });

  app.get('/api/tariff/search', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const chapter = typeof req.query.chapter === 'string' ? req.query.chapter : undefined;
    const curatedOnly = req.query.curatedOnly === 'true';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 40;
    const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

    const result = store.filterEntries({ query, section, chapter, curatedOnly, limit, offset });
    res.json(result);
  });

  app.get('/api/tariff/code/:code', (req, res) => {
    const entry = store.findByCode(req.params.code);
    if (!entry) {
      res.status(404).json({ error: `HS Code '${req.params.code}' not found in WCO/NBR schedule.` });
      return;
    }
    res.json({ entry });
  });

  app.post('/api/assessments', async (req, res) => {
    try {
      const body = req.body || {};
      if (!body.hs8 || typeof body.hs8 !== 'string') {
        res.status(400).json({ error: 'Missing HS code for shared assessment.' });
        return;
      }
      const entry = store.findByCode(body.hs8);
      if (!entry) {
        res.status(404).json({ error: `HS Code '${body.hs8}' not found.` });
        return;
      }

      const saved = await createSharedAssessment({
        query: body.query || null,
        hs8: entry.hs8,
        commercialName: entry.commercialName,
        invoiceValue: Number(body.invoiceValue) || 0,
        currency: body.currency || 'USD',
        exchangeRateBdt: Number(body.exchangeRateBdt) || 122,
        incoterm: body.incoterm || 'CFR',
        valuationMode: body.valuationMode || 'invoice_to_av',
        freightPercent: Number(body.freightPercent ?? 5),
        insurancePercent: Number(body.insurancePercent ?? 1),
        quantity: Number(body.quantity) || 1,
        regime: body.regime || 'commercial',
        preferentialOrigin: body.preferentialOrigin || 'none',
        domesticVatMode: body.domesticVatMode || 'standard_15',
        ttiPercent: Number(body.ttiPercent ?? entry.tti),
        totalTaxBdt: Number(body.totalTaxBdt) || 0,
        totalLandedBdt: Number(body.totalLandedBdt) || 0,
      });

      res.json({ shared: saved });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save cloud assessment' });
    }
  });

  app.get('/api/assessments/:slug', async (req, res) => {
    try {
      const shared = await getSharedAssessmentBySlug(req.params.slug);
      if (!shared) {
        res.status(404).json({ error: 'Shared cloud assessment link not found.' });
        return;
      }
      const entry = store.findByCode(shared.hs8);
      if (!entry) {
        res.status(404).json({ error: `HS Code '${shared.hs8}' not found in tariff schedule.` });
        return;
      }
      res.json({ shared, entry });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load cloud assessment' });
    }
  });

  return app;
}
