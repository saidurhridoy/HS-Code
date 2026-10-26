import React, { useEffect, useState } from 'react';
import {
  Anchor,
  ArrowDown,
  Building2,
  Calculator,
  Check,
  Copy,
  Factory,
  Globe2,
  Info,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { DEFAULT_EXCHANGE_RATES_BDT } from '@shared/tax-math';
import {
  DomesticVatMode,
  ImporterRegime,
  Incoterm,
  NbrTaxRates,
  PreferentialOrigin,
  SupportedCurrency,
  TariffEntry,
  TaxAssessmentResult,
  ValuationMode,
} from '@shared/types';
import { formatBdt, formatForeign, formatPct } from '@/lib/format';

interface NbrTaxCalculatorProps {
  entry: TariffEntry;
  assessment: TaxAssessmentResult;
  invoiceValue: number;
  onInvoiceValueChange: (val: number) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  currency: SupportedCurrency;
  onCurrencyChange: (cur: SupportedCurrency) => void;
  exchangeRateBdt: number;
  onExchangeRateChange: (rate: number) => void;
  incoterm: Incoterm;
  onIncotermChange: (inc: Incoterm) => void;
  valuationMode: ValuationMode;
  onValuationModeChange: (mode: ValuationMode) => void;
  freightPercent: number;
  onFreightPercentChange: (pct: number) => void;
  insurancePercent: number;
  onInsurancePercentChange: (pct: number) => void;
  regime: ImporterRegime;
  onRegimeChange: (reg: ImporterRegime) => void;
  preferentialOrigin: PreferentialOrigin;
  onPreferentialOriginChange: (origin: PreferentialOrigin) => void;
  domesticVatMode: DomesticVatMode;
  onDomesticVatModeChange: (mode: DomesticVatMode) => void;
  customOverrides: Partial<NbrTaxRates>;
  onCustomOverridesChange: (overrides: Partial<NbrTaxRates>) => void;
  onScrollToOptimizer?: () => void;
}

const TAX_BAR_COLORS: Record<string, string> = {
  CD: 'bg-emerald-600',
  RD: 'bg-teal-500',
  SD: 'bg-amber-500',
  VAT: 'bg-blue-600',
  AIT: 'bg-indigo-500',
  AT: 'bg-violet-500',
};

const TAX_DOT_COLORS: Record<string, string> = {
  CD: 'bg-emerald-600',
  RD: 'bg-teal-500',
  SD: 'bg-amber-500',
  VAT: 'bg-blue-600',
  AIT: 'bg-indigo-500',
  AT: 'bg-violet-500',
};

export const NbrTaxCalculator: React.FC<NbrTaxCalculatorProps> = ({
  entry,
  assessment,
  invoiceValue,
  onInvoiceValueChange,
  quantity,
  onQuantityChange,
  currency,
  onCurrencyChange,
  exchangeRateBdt,
  onExchangeRateChange,
  incoterm,
  onIncotermChange,
  valuationMode,
  onValuationModeChange,
  freightPercent,
  onFreightPercentChange,
  insurancePercent,
  onInsurancePercentChange,
  regime,
  onRegimeChange,
  preferentialOrigin,
  onPreferentialOriginChange,
  domesticVatMode,
  onDomesticVatModeChange,
  customOverrides,
  onCustomOverridesChange,
  onScrollToOptimizer,
}) => {
  const [customSroMode, setCustomSroMode] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    setCustomSroMode(false);
  }, [entry.hs8]);

  const handleCurrencySelect = (nextCur: SupportedCurrency) => {
    onCurrencyChange(nextCur);
    onExchangeRateChange(DEFAULT_EXCHANGE_RATES_BDT[nextCur]);
  };

  const handleCopySummary = async () => {
    const text = [
      `Bangladesh Customs (NBR) Import Duty & VAT Assessment`,
      `HS Code: ${entry.formattedHs8} (${entry.commercialName})`,
      `Regime: ${regime.toUpperCase()} | Origin: ${preferentialOrigin.toUpperCase()} | Sales VAT: ${domesticVatMode}`,
      `Valuation: ${incoterm} ${formatForeign(invoiceValue, currency)} @ ৳${exchangeRateBdt}`,
      `Assessable Value (AV): ${formatBdt(assessment.valuation.assessableValueBdt, 2)}`,
      `---------------------------------------------------`,
      ...assessment.lines.map(
        (l) =>
          `${l.code.padEnd(4)} (${l.ratePercent}% on ${l.statutoryBaseLabel}): ${formatBdt(l.amountBdt, 2)}${
            l.rebateable ? ' [Rebateable]' : ''
          }`
      ),
      `---------------------------------------------------`,
      `Total Tax Incidence (TTI): ${formatPct(assessment.ttiPercent)}`,
      `Total Port Customs Payable: ${formatBdt(assessment.totalTaxBdt, 2)} (${formatForeign(assessment.totalTaxForeign, currency)})`,
      `Total Landed Cost: ${formatBdt(assessment.totalLandedCostBdt, 2)}`,
      `Recoverable Tax Credits: ${formatBdt(assessment.rebateableTaxBdt, 2)}`,
      `Net Sunk Duty Cost: ${formatBdt(assessment.netSunkDutyBdt, 2)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Top TTI & Total Payable Banner */}
        <div className="border-b border-slate-100 bg-slate-50/90 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                NBR Import VAT &amp; Duty Assessment
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {preferentialOrigin !== 'none' && (
                <span className="rounded-md bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-800 uppercase">
                  {preferentialOrigin.replace('_', ' ')} FTA
                </span>
              )}
              <span className="rounded-md bg-emerald-100/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
                HS {entry.formattedHs8}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Total Tax Incidence (TTI)
              </div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-700">
                {formatPct(assessment.ttiPercent)}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">Compound % of AV</div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                Total Duty &amp; VAT Payable
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 sm:text-2xl">
                {formatBdt(assessment.totalTaxBdt)}
              </div>
              {currency !== 'BDT' && (
                <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                  ≈ {formatForeign(assessment.totalTaxForeign, currency)}
                </div>
              )}
            </div>

            <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 sm:col-span-1">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase">
                Total Landed Cost
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-950 sm:text-2xl">
                {formatBdt(assessment.totalLandedCostBdt)}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-emerald-700">
                {formatBdt(assessment.perUnitLandedBdt)} / {entry.unit}
              </div>
            </div>
          </div>

          {/* Proportional Stacked Tax Bar */}
          {assessment.totalTaxBdt > 0 && (
            <div className="mt-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                {assessment.lines.map((line) => {
                  if (line.amountBdt <= 0) return null;
                  const share = (line.amountBdt / assessment.totalTaxBdt) * 100;
                  return (
                    <div
                      key={line.code}
                      style={{ width: `${share}%` }}
                      title={`${line.code}: ${formatBdt(line.amountBdt)} (${formatPct(line.effectiveRateOnAvPercent)} of AV)`}
                      className={`${TAX_BAR_COLORS[line.code]} transition-all duration-300`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {assessment.lines.map((line) => (
                  <div key={line.code} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${TAX_DOT_COLORS[line.code]}`} />
                    <span className="font-semibold text-slate-700">{line.code}</span>
                    <span className="font-mono">{line.ratePercent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Importer Regime, Preferential Origin & Shipment Value Inputs */}
        <div className="space-y-4 border-b border-slate-100 p-5 no-print">
          {/* 4-Way Importer License / Bond Regime */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Importer IRC License &amp; Customs Regime
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onRegimeChange('commercial')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  regime === 'commercial'
                    ? 'border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div>Commercial IRC</div>
                  <div className="text-[10px] font-normal text-slate-500">Standard OTS (5% AT)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onRegimeChange('industrial')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  regime === 'industrial'
                    ? 'border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Factory className="h-4 w-4 shrink-0 text-sky-600" />
                <div>
                  <div>Industrial IRC</div>
                  <div className="text-[10px] font-normal text-slate-500">Manufacturer (3% AT)</div>
                </div>
              </button>

              <button
                type="button"
                disabled={!entry.sroEligibleCapitalMachinery}
                onClick={() => onRegimeChange('capital_machinery')}
                title={
                  entry.sroEligibleCapitalMachinery
                    ? 'Apply NBR Capital Machinery Concessionary SRO (1% CD, 0% VAT, 0% AT)'
                    : 'This HS code is not eligible under the Capital Machinery SRO'
                }
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  !entry.sroEligibleCapitalMachinery
                    ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 opacity-60'
                    : regime === 'capital_machinery'
                    ? 'border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Wrench className="h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <div>Cap. Machinery SRO</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    {entry.sroEligibleCapitalMachinery ? '1% CD · 0% VAT/AT' : 'Not SRO Eligible'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onRegimeChange('export_bonded')}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                  regime === 'export_bonded'
                    ? 'border-emerald-600 bg-emerald-50/60 font-semibold text-emerald-950 ring-1 ring-emerald-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Anchor className="h-4 w-4 shrink-0 text-teal-600" />
                <div>
                  <div>Export Bonded / B2B</div>
                  <div className="text-[10px] font-normal text-slate-500">100% Export (0% TTI)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Technical Tax Levers: Preferential Origin (FTA/PTA) & Domestic VAT Rebate Mode */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <Globe2 className="h-3.5 w-3.5 text-sky-600" />
                <span>Preferential Origin (FTA / CoO)</span>
              </label>
              <select
                value={preferentialOrigin}
                onChange={(e) => onPreferentialOriginChange(e.target.value as PreferentialOrigin)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="none">Standard MFN (No FTA CoO)</option>
                <option value="apta">APTA CoO (China/Korea/India -20% CD)</option>
                <option value="safta">SAFTA CoO (South Asia 5% CD Cap)</option>
                <option value="bhutan_pta">Bhutan PTA (0% Duty-Free CD)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <TrendingDown className="h-3.5 w-3.5 text-blue-600" />
                <span>Domestic Sales VAT (Rebate Rule)</span>
              </label>
              <select
                value={domesticVatMode}
                onChange={(e) => onDomesticVatModeChange(e.target.value as DomesticVatMode)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="standard_15">15% Standard VAT (100% VAT+AT Credit)</option>
                <option value="trade_5">5% Trade VAT (0% VAT Credit · AT Only)</option>
                <option value="unregistered_exempt">Unregistered / Exempt (No VAT/AT Credit)</option>
              </select>
            </div>
          </div>

          {/* Invoice Value, Currency, Exchange Rate, Quantity */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => handleCurrencySelect(e.target.value as SupportedCurrency)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CNY">CNY (¥)</option>
                <option value="INR">INR (₹)</option>
                <option value="BDT">BDT (৳)</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                {valuationMode === 'direct_av' ? 'Assessable Value' : `${incoterm} Invoice Value`}
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={invoiceValue}
                onChange={(e) => onInvoiceValueChange(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Customs FX (৳)
              </label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                disabled={currency === 'BDT'}
                value={currency === 'BDT' ? 1 : exchangeRateBdt}
                onChange={(e) => onExchangeRateChange(Math.max(0.01, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs font-semibold text-slate-900 disabled:bg-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                Qty ({entry.unit})
              </label>
              <input
                type="number"
                min={1}
                step="1"
                value={quantity}
                onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Incoterm & NBR Valuation Method Strip */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onValuationModeChange('invoice_to_av')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    valuationMode === 'invoice_to_av'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Auto NBR AV (+Landing/Ins.)
                </button>
                <button
                  type="button"
                  onClick={() => onValuationModeChange('direct_av')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    valuationMode === 'direct_av'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Direct AV
                </button>
              </div>

              {valuationMode === 'invoice_to_av' && (
                <div className="flex items-center gap-1">
                  {(['CIF', 'CFR', 'FOB'] as Incoterm[]).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => onIncotermChange(term)}
                      className={`rounded-md px-2.5 py-1 font-mono text-[11px] font-bold transition ${
                        incoterm === term
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {valuationMode === 'invoice_to_av' && (
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-slate-200/80 pt-2 font-mono text-[11px] text-slate-600">
                <span>Invoice: {formatBdt(assessment.valuation.invoiceValueBdt)}</span>
                {incoterm === 'FOB' && (
                  <span className="inline-flex items-center gap-1">
                    +Freight(
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={freightPercent}
                      onChange={(e) => onFreightPercentChange(Math.max(0, Number(e.target.value)))}
                      className="w-10 rounded border border-slate-300 bg-white px-1 text-center text-[10px]"
                    />
                    %): {formatBdt(assessment.valuation.freightBdt)}
                  </span>
                )}
                {(incoterm === 'FOB' || incoterm === 'CFR') && (
                  <span className="inline-flex items-center gap-1">
                    +Ins(
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.05}
                      value={insurancePercent}
                      onChange={(e) => onInsurancePercentChange(Math.max(0, Number(e.target.value)))}
                      className="w-11 rounded border border-slate-300 bg-white px-1 text-center text-[10px]"
                    />
                    %): {formatBdt(assessment.valuation.insuranceBdt)}
                  </span>
                )}
                <span>+1% Landing: {formatBdt(assessment.valuation.landingChargeBdt)}</span>
                <span className="font-bold text-slate-900">
                  = AV: {formatBdt(assessment.valuation.assessableValueBdt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Official 6-Component NBR Tax Table */}
        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
              Statutory NBR Duty &amp; VAT Schedule (Bill of Entry Breakdown)
            </h3>
            <div className="flex items-center gap-2 no-print">
              {(customSroMode || Object.keys(customOverrides).length > 0) && (
                <button
                  type="button"
                  onClick={() => onCustomOverridesChange({})}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Rates
                </button>
              )}
              <button
                type="button"
                onClick={() => setCustomSroMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  customSroMode
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                <span>{customSroMode ? 'Editing SRO Rates' : 'Custom SRO Rate'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-3 py-2.5">Tax Head</th>
                  <th className="px-3 py-2.5">NBR Statutory Base</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">Eff. % AV</th>
                  <th className="px-3 py-2.5 text-right">Amount (৳ BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessment.lines.map((line) => {
                  const rateKey = line.code.toLowerCase() as keyof NbrTaxRates;
                  const isTrappedVat =
                    line.code === 'VAT' && line.amountBdt > 0 && !line.rebateable;

                  return (
                    <tr key={line.code} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TAX_DOT_COLORS[line.code]}`} />
                          <div>
                            <div className="font-semibold text-slate-900">
                              {line.code}{' '}
                              <span className="font-normal text-slate-500">
                                — {line.name.replace(/\s*\([A-Z]+\)$/, '')}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">{line.banglaName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">
                        <div>{line.statutoryBaseLabel}</div>
                        <div className="text-[10px] text-slate-400">
                          Base: {formatBdt(line.baseAmountBdt)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                        {customSroMode ? (
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <input
                              type="number"
                              min={0}
                              max={500}
                              step="any"
                              value={customOverrides[rateKey] ?? line.ratePercent}
                              onChange={(e) =>
                                onCustomOverridesChange({
                                  ...customOverrides,
                                  [rateKey]: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-14 rounded border border-amber-400 bg-amber-50/50 px-1.5 py-0.5 text-right font-mono text-xs font-bold text-slate-900 focus:outline-none"
                            />
                            <span>%</span>
                          </div>
                        ) : (
                          <span>{line.ratePercent}%</span>
                        )}
                      </td>
                      <td className="hidden px-3 py-2.5 text-right font-mono text-[11px] text-slate-500 sm:table-cell">
                        {formatPct(line.effectiveRateOnAvPercent)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                        <div>{formatBdt(line.amountBdt, 2)}</div>
                        {line.rebateable && line.amountBdt > 0 && (
                          <span
                            title={line.rebateNote}
                            className="inline-block rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-medium text-blue-700"
                          >
                            Rebateable
                          </span>
                        )}
                        {isTrappedVat && (
                          <span
                            title={line.rebateNote}
                            className="inline-block rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-900"
                          >
                            Sunk (5% Trade)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-900">
                <tr>
                  <td colSpan={2} className="px-3 py-3">
                    Total Customs Outflow (TTI)
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-700">
                    {formatPct(assessment.ttiPercent)}
                  </td>
                  <td className="hidden px-3 py-3 text-right text-emerald-700 sm:table-cell">
                    {formatPct(assessment.ttiPercent)}
                  </td>
                  <td className="px-3 py-3 text-right text-emerald-800">
                    {formatBdt(assessment.totalTaxBdt, 2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Recoverable VAT/AT/AIT Credit vs Sunk Duty Insight */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-900">
                <Info className="h-3.5 w-3.5 text-blue-600" />
                <span>Recoverable Rebate / Credit</span>
              </div>
              <div className="mt-1 font-mono text-base font-bold text-blue-800">
                {formatBdt(assessment.rebateableTaxBdt, 2)}
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-blue-700/80">
                {domesticVatMode === 'standard_15'
                  ? 'Includes 15% VAT (Note-14) + AT (Note-31) + AIT (s.120).'
                  : domesticVatMode === 'trade_5'
                  ? '15% VAT blocked u/s 46! Only AT (Note-31) + AIT (s.120) recovered.'
                  : 'Only AIT recoverable without active VAT registration.'}
              </p>
            </div>

            <div className="border-t border-blue-200/60 pt-2.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3.5">
              <div className="text-[11px] font-semibold text-slate-800">
                Net Sunk Duty &amp; Unrecovered Tax
              </div>
              <div className="mt-1 font-mono text-base font-bold text-slate-900">
                {formatBdt(assessment.netSunkDutyBdt, 2)}
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-600">
                Net cost after rebate:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {formatBdt(assessment.netLandedCostAfterRebateBdt)}
                </span>
              </p>
            </div>
          </div>

          {/* Action Strip + Jump to Technical VAT/Duty Saving Guide */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 no-print">
            {onScrollToOptimizer && (
              <button
                type="button"
                onClick={onScrollToOptimizer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
              >
                <TrendingDown className="h-3.5 w-3.5 text-emerald-700" />
                <span>How to Lower Tax &amp; Claim Rebate</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Costing Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
