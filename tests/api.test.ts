import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApp } from '../server/app';

describe('DutyLens BD REST API Integration', () => {
  let server: http.Server;
  let baseUrl = '';

  beforeAll(async () => {
    const app = createApiApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /api/health returns complete WCO & NBR statistics', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stats.sections).toBe(21);
    expect(body.stats.chapters).toBe(97);
    expect(body.stats.totalTariffCodes).toBeGreaterThan(5600);
  });

  it('POST /api/classify returns primary HS8, alternatives, compliance, and default NBR assessment', async () => {
    const res = await fetch(`${baseUrl}/api/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Monocrystalline 550W solar PV panel module',
        invoiceValue: 10000,
        currency: 'USD',
        exchangeRateBdt: 122,
        incoterm: 'CIF',
        quantity: 100,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.primary.entry.formattedHs8).toBe('8541.43.00');
    expect(body.defaultAssessment.valuation.assessableValueBdt).toBeGreaterThan(1220000);
    expect(body.alternatives.length).toBeGreaterThan(0);
  });

  it('POST /api/batch-classify classifies multiple commercial invoice items and computes grand totals', async () => {
    const res = await fetch(`${baseUrl}/api/batch-classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency: 'USD',
        exchangeRateBdt: 122,
        incoterm: 'CIF',
        regime: 'commercial',
        items: [
          { id: '1', description: 'Apple MacBook Air 13-inch laptop', invoiceValue: 5000, quantity: 5 },
          { id: '2', description: '100% cotton knitted mens t-shirt', invoiceValue: 2000, quantity: 500 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBe(2);
    expect(body.items[0].primary.entry.hs8).toBe('84713000');
    expect(body.items[1].primary.entry.hs8).toBe('61091000');
    expect(body.totals.totalLandedCostBdt).toBeGreaterThan(body.totals.assessableValueBdt);
  });

  it('GET /api/tariff/search & /api/tariff/code/:code work accurately', async () => {
    const sRes = await fetch(`${baseUrl}/api/tariff/search?q=8471&limit=10`);
    expect(sRes.status).toBe(200);
    const sBody = await sRes.json();
    expect(sBody.total).toBeGreaterThan(3);

    const cRes = await fetch(`${baseUrl}/api/tariff/code/8517.13.00`);
    expect(cRes.status).toBe(200);
    const cBody = await cRes.json();
    expect(cBody.entry.hs8).toBe('85171300');
  });

  it('POST /api/assessments & GET /api/assessments/:slug create and hydrate shareable cloud links', async () => {
    const createRes = await fetch(`${baseUrl}/api/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Apple MacBook Air M3 Laptop',
        hs8: '84713000',
        invoiceValue: 12000,
        currency: 'USD',
        exchangeRateBdt: 122,
        incoterm: 'CFR',
        valuationMode: 'invoice_to_av',
        freightPercent: 5,
        insurancePercent: 1,
        quantity: 10,
        regime: 'commercial',
        preferentialOrigin: 'none',
        domesticVatMode: 'standard_15',
        ttiPercent: 43,
        totalTaxBdt: 641614,
        totalLandedBdt: 2133790,
      }),
    });
    expect(createRes.status).toBe(200);
    const createdBody = await createRes.json();
    expect(createdBody.shared.slug).toMatch(/^dl-/);

    const getRes = await fetch(`${baseUrl}/api/assessments/${createdBody.shared.slug}`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.shared.hs8).toBe('84713000');
    expect(getBody.shared.invoiceValue).toBe(12000);
    expect(getBody.entry.formattedHs8).toBe('8471.30.00');

    const statusRes = await fetch(`${baseUrl}/api/cloud/status`);
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(Array.isArray(statusBody.recentClassifications)).toBe(true);
  });

  it('User Sign Up, Login & Profile auto-saves classified queries with Company, Role & Mobile', async () => {
    const signupRes = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'trader@dhakacustoms.com',
        password: 'securePassword123',
        fullName: 'Saidur Rahman',
        companyName: 'Dhaka Global Trade Ltd.',
        businessRole: 'both',
        mobileNumber: '+8801711223344',
      }),
    });
    expect(signupRes.status).toBe(200);
    const signupBody = await signupRes.json();
    expect(signupBody.user.companyName).toBe('Dhaka Global Trade Ltd.');
    expect(signupBody.user.businessRole).toBe('both');
    expect(signupBody.user.mobileNumber).toBe('+8801711223344');
    expect(typeof signupBody.token).toBe('string');

    // Run a classification authenticated as this user — should auto-save to profile
    const classifyRes = await fetch(`${baseUrl}/api/classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${signupBody.token}`,
      },
      body: JSON.stringify({
        query: 'Industrial Juki sewing machine for RMG factory',
        invoiceValue: 25000,
        currency: 'USD',
        exchangeRateBdt: 122,
        incoterm: 'CFR',
        quantity: 20,
        regime: 'capital_machinery',
      }),
    });
    expect(classifyRes.status).toBe(200);

    // Log in again and confirm saved query is attached to the user's profile
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'trader@dhakacustoms.com',
        password: 'securePassword123',
      }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.companyName).toBe('Dhaka Global Trade Ltd.');
    expect(loginBody.savedQueries.length).toBe(1);
    expect(loginBody.savedQueries[0].hs8).toBe('84522900');

    // Delete saved query
    const delRes = await fetch(`${baseUrl}/api/profile/queries/${loginBody.savedQueries[0].id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    expect(delRes.status).toBe(200);

    const afterListRes = await fetch(`${baseUrl}/api/profile/queries`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    const afterListBody = await afterListRes.json();
    expect(afterListBody.savedQueries.length).toBe(0);
  });
});
