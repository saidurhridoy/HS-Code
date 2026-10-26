import express from 'express';
import { calculateNbrAssessment, simulateDomesticVatComparison } from '../shared/tax-math';
import { generateOptimizationPlan } from '../shared/tax-optimizer';
import {
  BatchItemInput,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  SupportedCurrency,
  TaxAssessmentInput,
} from '../shared/types';
import { getClassificationEngine } from './engine/classifier';
import { getTariffStore } from './tariff/tariff-store';

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
      stats: {
        totalTariffCodes: store.entries.length,
        sections: store.sections.length,
        chapters: store.chapters.size,
        headings: store.headings.size,
        curatedBctCodes: store.entries.filter((e) => e.curated).length,
      },
    });
  });

  app.post('/api/classify', async (req, res) => {
    try {
      const { query, regime, invoiceValue, currency, exchangeRateBdt, incoterm, quantity, llm } = req.body || {};
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

  return app;
}
