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
});
