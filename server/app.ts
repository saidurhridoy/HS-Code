import express from 'express';
import { calculateNbrAssessment, simulateDomesticVatComparison } from '../shared/tax-math.js';
import { generateOptimizationPlan } from '../shared/tax-optimizer.js';
import {
  BatchItemInput,
  BusinessRole,
  ImporterRegime,
  Incoterm,
  LlmConfig,
  SupportedCurrency,
  TaxAssessmentInput,
} from '../shared/types.js';
import {
  authenticateUser,
  deleteUserSavedQuery,
  getUserProfileById,
  listUserSavedQueries,
  registerUser,
  saveUserQueryToProfile,
  updateUserProfile,
  verifyAuthToken,
} from './auth-store.js';
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
        const authPayload = verifyAuthToken(req.headers.authorization);
        await Promise.all([
          logClassificationEvent({
            query: result.query,
            hs8: result.primary.entry.formattedHs8,
            commercialName: result.primary.entry.commercialName,
            confidence: result.primary.confidence,
            tti: result.defaultAssessment.ttiPercent,
            regime: result.defaultAssessment.regime,
            engineUsed: result.engineUsed,
          }),
          authPayload
            ? saveUserQueryToProfile({
                userId: authPayload.sub,
                query: result.query,
                hs8: result.primary.entry.hs8,
                formattedHs8: result.primary.entry.formattedHs8,
                commercialName: result.primary.entry.commercialName,
                confidence: result.primary.confidence,
                invoiceValue: result.defaultAssessment.valuation.invoiceValueForeign,
                currency: result.defaultAssessment.valuation.currency,
                exchangeRateBdt: result.defaultAssessment.valuation.exchangeRateBdt,
                incoterm: (incoterm as Incoterm) || 'CFR',
                quantity: result.defaultAssessment.quantity,
                regime: result.defaultAssessment.regime,
                preferentialOrigin: result.defaultAssessment.preferentialOrigin,
                domesticVatMode: result.defaultAssessment.domesticVatMode,
                ttiPercent: result.defaultAssessment.ttiPercent,
                totalTaxBdt: result.defaultAssessment.totalTaxBdt,
                totalLandedBdt: result.defaultAssessment.totalLandedCostBdt,
              })
            : Promise.resolve(null),
        ]);
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

  // --- User Authentication & Profile Saved Queries ---
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, fullName, companyName, businessRole, mobileNumber } = req.body || {};
      const result = await registerUser({
        email: String(email || ''),
        password: String(password || ''),
        fullName: String(fullName || ''),
        companyName: String(companyName || ''),
        businessRole: (businessRole as BusinessRole) || 'importer',
        mobileNumber: String(mobileNumber || ''),
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Sign up failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const result = await authenticateUser({
        email: String(email || ''),
        password: String(password || ''),
      });
      const savedQueries = await listUserSavedQueries(result.user.id, 40);
      res.json({ ...result, savedQueries });
    } catch (err: any) {
      res.status(401).json({ error: err?.message || 'Login failed' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const payload = verifyAuthToken(req.headers.authorization);
      if (!payload) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const user = await getUserProfileById(payload.sub);
      if (!user) {
        res.status(401).json({ error: 'User profile not found' });
        return;
      }
      const savedQueries = await listUserSavedQueries(user.id, 40);
      res.json({ user, savedQueries });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load profile' });
    }
  });

  app.patch('/api/auth/profile', async (req, res) => {
    try {
      const payload = verifyAuthToken(req.headers.authorization);
      if (!payload) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const { fullName, companyName, businessRole, mobileNumber } = req.body || {};
      const user = await updateUserProfile(payload.sub, {
        fullName,
        companyName,
        businessRole,
        mobileNumber,
      });
      res.json({ user });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to update profile' });
    }
  });

  app.get('/api/profile/queries', async (req, res) => {
    try {
      const payload = verifyAuthToken(req.headers.authorization);
      if (!payload) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const savedQueries = await listUserSavedQueries(payload.sub, 50);
      res.json({ savedQueries });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to load saved queries' });
    }
  });

  app.post('/api/profile/queries', async (req, res) => {
    try {
      const payload = verifyAuthToken(req.headers.authorization);
      if (!payload) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const b = req.body || {};
      const saved = await saveUserQueryToProfile({
        userId: payload.sub,
        query: String(b.query || ''),
        hs8: String(b.hs8 || ''),
        formattedHs8: String(b.formattedHs8 || b.hs8 || ''),
        commercialName: String(b.commercialName || ''),
        confidence: Number(b.confidence) || 90,
        invoiceValue: Number(b.invoiceValue) || 0,
        currency: b.currency || 'USD',
        exchangeRateBdt: Number(b.exchangeRateBdt) || 122,
        incoterm: b.incoterm || 'CFR',
        quantity: Number(b.quantity) || 1,
        regime: b.regime || 'commercial',
        preferentialOrigin: b.preferentialOrigin || 'none',
        domesticVatMode: b.domesticVatMode || 'standard_15',
        ttiPercent: Number(b.ttiPercent) || 0,
        totalTaxBdt: Number(b.totalTaxBdt) || 0,
        totalLandedBdt: Number(b.totalLandedBdt) || 0,
      });
      res.json({ saved });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'Failed to save query' });
    }
  });

  app.delete('/api/profile/queries/:id', async (req, res) => {
    try {
      const payload = verifyAuthToken(req.headers.authorization);
      if (!payload) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const deleted = await deleteUserSavedQuery(payload.sub, req.params.id);
      res.json({ ok: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to delete query' });
    }
  });

  return app;
}
