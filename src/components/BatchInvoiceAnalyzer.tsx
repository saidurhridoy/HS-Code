import React, { useState } from 'react';
import { Download, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_EXCHANGE_RATES_BDT } from '@shared/tax-math';
import {
  BatchClassificationResult,
  BatchItemInput,
  ImporterRegime,
  Incoterm,
  SupportedCurrency,
  TariffEntry,
} from '@shared/types';
import { classifyBatchApi } from '@/lib/api';
import { formatBdt, formatPct } from '@/lib/format';
import { DEFAULT_BATCH_ITEMS } from '@/lib/presets';

interface BatchInvoiceAnalyzerProps {
  onInspectEntry: (entry: TariffEntry, invoiceValue: number, qty: number) => void;
}

export const BatchInvoiceAnalyzer: React.FC<BatchInvoiceAnalyzerProps> = ({ onInspectEntry }) => {
  const [items, setItems] = useState<BatchItemInput[]>(DEFAULT_BATCH_ITEMS);
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [exchangeRateBdt, setExchangeRateBdt] = useState<number>(DEFAULT_EXCHANGE_RATES_BDT.USD);
  const [incoterm, setIncoterm] = useState<Incoterm>('CIF');
  const [regime, setRegime] = useState<ImporterRegime>('commercial');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchClassificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        invoiceValue: 1000,
        quantity: 10,
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateRow = (id: string, patch: Partial<BatchItemInput>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleRunBatch = async () => {
    const valid = items.filter((i) => i.description.trim().length >= 2);
    if (valid.length === 0) {
      setError('Enter at least one valid product description.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await classifyBatchApi({
        items: valid,
        currency,
        exchangeRateBdt,
        incoterm,
        regime,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Batch classification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!result) return;
    const headers = [
      'Line',
      'Product Description',
      'HS Code (8-Digit)',
      'Commercial Name',
      'Confidence %',
      'Invoice Value',
      'Assessable Value (BDT)',
      'CD %',
      'RD %',
      'SD %',
      'VAT %',
      'AIT %',
      'AT %',
      'TTI %',
      'Total Duty & VAT (BDT)',
      'Total Landed Cost (BDT)',
    ];
    const rows = result.items.map((r, idx) => [
      idx + 1,
      `"${r.description.replace(/"/g, '""')}"`,
      r.primary.entry.formattedHs8,
      `"${r.primary.entry.commercialName.replace(/"/g, '""')}"`,
      r.primary.confidence,
      r.invoiceValue,
      r.assessment.valuation.assessableValueBdt,
      r.assessment.effectiveRates.cd,
      r.assessment.effectiveRates.rd,
      r.assessment.effectiveRates.sd,
      r.assessment.effectiveRates.vat,
      r.assessment.effectiveRates.ait,
      r.assessment.effectiveRates.at,
      r.assessment.ttiPercent,
      r.assessment.totalTaxBdt,
      r.assessment.totalLandedCostBdt,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dutylens-bd-lc-assessment-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Multi-Item Commercial Invoice / LC Customs Estimator
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Classify an entire shipment packing list simultaneously and calculate aggregate Bangladesh port duties, import VAT &amp; landed cost.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currency}
              onChange={(e) => {
                const c = e.target.value as SupportedCurrency;
                setCurrency(c);
                setExchangeRateBdt(DEFAULT_EXCHANGE_RATES_BDT[c]);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="CNY">CNY (¥)</option>
              <option value="INR">INR (₹)</option>
              <option value="BDT">BDT (৳)</option>
            </select>

            <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs">
              <span className="text-slate-500">FX ৳</span>
              <input
                type="number"
                step="0.1"
                value={exchangeRateBdt}
                disabled={currency === 'BDT'}
                onChange={(e) => setExchangeRateBdt(Math.max(0.01, Number(e.target.value)))}
                className="w-16 font-mono font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            <select
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value as Incoterm)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold"
            >
              <option value="CIF">CIF</option>
              <option value="CFR">CFR</option>
              <option value="FOB">FOB</option>
            </select>

            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value as ImporterRegime)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="commercial">Commercial IRC (5% AT)</option>
              <option value="industrial">Industrial IRC (3% AT)</option>
            </select>
          </div>
        </div>

        {/* Editable Invoice Rows */}
        <div className="mt-4 space-y-2.5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5"
            >
              <div className="col-span-12 flex items-center gap-2 sm:col-span-7">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-200 font-mono text-[11px] font-bold text-slate-700">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleUpdateRow(item.id, { description: e.target.value })}
                  placeholder="Enter commercial invoice product description..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-5 sm:col-span-2">
                <input
                  type="number"
                  min={0}
                  value={item.invoiceValue}
                  onChange={(e) =>
                    handleUpdateRow(item.id, { invoiceValue: Math.max(0, Number(e.target.value)) })
                  }
                  placeholder="Value"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-5 sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    handleUpdateRow(item.id, { quantity: Math.max(1, Number(e.target.value)) })
                  }
                  placeholder="Qty"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="col-span-2 flex justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => handleRemoveRow(item.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Invoice Line</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleRunBatch}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Classifying Shipment...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Classify &amp; Calculate Full Shipment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Batch Assessment Results */}
      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Shipment Customs Costing Summary ({result.items.length} Lines)
              </h3>
              <p className="text-xs text-slate-500">
                Weighted Average Shipment TTI:{' '}
                <strong className="font-mono text-emerald-700">
                  {formatPct(result.totals.averageTtiPercent)}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV Schedule</span>
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Total Assessable Value
              </div>
              <div className="mt-1 font-mono text-base font-bold text-slate-900">
                {formatBdt(result.totals.assessableValueBdt)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase">
                Port Customs Payable
              </div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-700">
                {formatBdt(result.totals.totalTaxBdt)}
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
              <div className="text-[10px] font-semibold text-blue-800 uppercase">
                Rebateable VAT/AT/AIT
              </div>
              <div className="mt-1 font-mono text-base font-bold text-blue-800">
                {formatBdt(result.totals.rebateableTaxBdt)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="text-[10px] font-semibold text-emerald-900 uppercase">
                Grand Landed Cost
              </div>
              <div className="mt-1 font-mono text-base font-bold text-emerald-950">
                {formatBdt(result.totals.totalLandedCostBdt)}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Invoice Item</th>
                  <th className="px-3 py-2.5">Matched HS Code</th>
                  <th className="px-3 py-2.5 text-right">AV (৳)</th>
                  <th className="px-3 py-2.5 text-right">TTI %</th>
                  <th className="px-3 py-2.5 text-right">Duty &amp; VAT (৳)</th>
                  <th className="px-3 py-2.5 text-right">Landed (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={() =>
                      onInspectEntry(row.primary.entry, row.invoiceValue, row.quantity)
                    }
                    className="cursor-pointer transition hover:bg-emerald-50/40"
                    title="Click to inspect full tax schedule in calculator"
                  >
                    <td className="px-3 py-2.5 font-mono text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-slate-900">{row.description}</div>
                      <div className="text-[11px] text-slate-500">
                        {row.primary.entry.commercialName}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-700">
                        {row.primary.entry.formattedHs8}
                      </span>
                      <div className="font-mono text-[10px] text-slate-400">
                        {row.primary.confidence}% match
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {formatBdt(row.assessment.valuation.assessableValueBdt)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                      {formatPct(row.assessment.ttiPercent)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700">
                      {formatBdt(row.assessment.totalTaxBdt)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatBdt(row.assessment.totalLandedCostBdt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
