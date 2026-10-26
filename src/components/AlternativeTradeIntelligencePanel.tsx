import React, { useMemo, useState } from 'react';
import {
  Anchor,
  ArrowUpRight,
  Award,
  BadgePercent,
  CheckCircle2,
  Compass,
  Globe2,
  Layers,
  MapPin,
  Plane,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { generateAlternativeTradeIntelligence } from '@shared/trade-intelligence';
import {
  AppLanguage,
  ClassificationCandidate,
  ClassificationResult,
  ExtractedSourceMetadata,
  QuickOptimizationAction,
  TariffEntry,
  TaxAssessmentInput,
  TaxAssessmentResult,
} from '@shared/types';
import { formatBdt, formatPct } from '@/lib/format';

interface AlternativeTradeIntelligencePanelProps {
  entry: TariffEntry;
  classification: ClassificationResult | null;
  assessmentInput: TaxAssessmentInput;
  assessment: TaxAssessmentResult;
  sourceMeta?: ExtractedSourceMetadata | null;
  lang?: AppLanguage;
  onApplyQuickAction: (action: QuickOptimizationAction) => void;
  onSwitchCandidate?: (cand: ClassificationCandidate) => void;
}

type PillarTab = 'alt_duty' | 'rebate_scope' | 'zero_tax' | 'best_destination';

export const AlternativeTradeIntelligencePanel: React.FC<
  AlternativeTradeIntelligencePanelProps
> = ({
  entry,
  classification,
  assessmentInput,
  assessment,
  sourceMeta,
  lang = 'en',
  onApplyQuickAction,
  onSwitchCandidate,
}) => {
  const isBn = lang === 'bn';
  const [activePillar, setActivePillar] = useState<PillarTab>('alt_duty');

  const report = useMemo(
    () =>
      generateAlternativeTradeIntelligence(
        entry,
        classification,
        assessmentInput,
        assessment,
        sourceMeta
      ),
    [entry, classification, assessmentInput, assessment, sourceMeta]
  );

  const topPort = report.portDestinations[0];
  const topOrigin = report.sourcingCorridors[0];
  const lowestNonBondedDuty = report.alternativeDutyMatrix
    .filter((s) => !s.id.includes('bonded'))
    .reduce(
      (best, cur) => (cur.totalTaxBdt < best.totalTaxBdt ? cur : best),
      report.alternativeDutyMatrix[0]
    );

  return (
    <section
      id="alternative-trade-intelligence"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      {/* Executive Summary Banner + 4-Pillar Navigation */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
              <Compass className="h-3.5 w-3.5" />
              <span>
                {isBn
                  ? 'বিকল্প শুল্ক, রেয়াত পরিধি, জিরো-ট্যাক্স ও সেরা আমদানি গন্তব্য বিশ্লেষক'
                  : '4-Pillar Alternative Duty, Rebate Scope, Zero-Tax & Destination Intelligence'}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl">
              {isBn
                ? `${entry.formattedHs8} — বিকল্প আমদানি কৌশল ও গন্তব্য তুলনা`
                : `Strategic Import Alternatives & Best Destination Matrix (${entry.formattedHs8})`}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {isBn
                ? 'পণ্যের বর্ণনা, ছবি বা লিংক থেকে স্বয়ংক্রিয়ভাবে বিকল্প শুল্ক হার, ফেরতযোগ্য করের পরিধি, ০% শুল্ক সুবিধা এবং সেরা বন্দর ও সোর্সিং দেশ তুলনা করুন।'
                : 'Compare alternative NBR duty regimes & adjacent HS codes, exact recoverable tax scope, legal 0% zero-tax pathways, and optimal port & country corridors.'}
            </p>
          </div>

          {/* Quick KPI Chips */}
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2">
              <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                {isBn ? 'কর রেয়াত পরিধি' : 'Rebate Recovery'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold text-sky-300">
                {report.rebateScope.localRecoveryRatioPercent.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3.5 py-2">
              <div className="text-[10px] font-semibold tracking-wider text-emerald-200 uppercase">
                {isBn ? 'জিরো-ট্যাক্স সুযোগ' : 'Zero-Tax Option'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold text-emerald-300">
                0.00% ({report.zeroTaxOptions.length} {isBn ? 'টি পথ' : 'Ways'})
              </div>
            </div>

            {topPort && (
              <div className="col-span-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 sm:col-span-1">
                <div className="text-[10px] font-semibold tracking-wider text-amber-200 uppercase">
                  {isBn ? '#১ প্রস্তাবিত বন্দর' : '#1 Entry Destination'}
                </div>
                <div className="mt-0.5 text-xs font-bold text-amber-300">
                  {isBn
                    ? topPort.banglaPortName.split('(')[0].trim()
                    : topPort.portName.split('(')[0].trim()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4 Pillar Selector Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap no-print">
          <button
            type="button"
            onClick={() => setActivePillar('alt_duty')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activePillar === 'alt_duty'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isBn
                ? `১. বিকল্প শুল্ক ও কর (${report.alternativeDutyMatrix.length})`
                : `1. Alternative Duty & Tax (${report.alternativeDutyMatrix.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('rebate_scope')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activePillar === 'rebate_scope'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isBn
                ? `২. কর রেয়াতের পরিধি (${report.rebateScope.localRecoveryRatioPercent.toFixed(0)}%)`
                : `2. Tax Rebate Scope (${report.rebateScope.localRecoveryRatioPercent.toFixed(0)}%)`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('zero_tax')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activePillar === 'zero_tax'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <BadgePercent className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isBn
                ? `৩. জিরো-ট্যাক্স অপশন (${report.zeroTaxOptions.length})`
                : `3. Zero-Tax Options (${report.zeroTaxOptions.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePillar('best_destination')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activePillar === 'best_destination'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>
              {isBn ? '৪. সেরা আমদানি গন্তব্য ও বন্দর' : '4. Best Import Destination'}
            </span>
          </button>
        </div>
      </div>

      {/* ================= PILLAR 1: ALTERNATIVE DUTY & TAX MATRIX ================= */}
      {activePillar === 'alt_duty' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="text-slate-700">
              {isBn ? (
                <>
                  বর্তমান মোডে মোট বন্দর কর <strong>{formatBdt(assessment.totalTaxBdt)}</strong> (
                  {formatPct(assessment.ttiPercent)} TTI)। বন্ড ছাড়া সর্বনিম্ন বিকল্প শুল্ক:{' '}
                  <strong className="text-emerald-700">
                    {formatBdt(lowestNonBondedDuty?.totalTaxBdt ?? assessment.totalTaxBdt)}
                  </strong>
                  ।
                </>
              ) : (
                <>
                  Current port tax is <strong>{formatBdt(assessment.totalTaxBdt)}</strong> (
                  {formatPct(assessment.ttiPercent)} TTI). Lowest non-bonded legal alternative:{' '}
                  <strong className="text-emerald-700">
                    {formatBdt(lowestNonBondedDuty?.totalTaxBdt ?? assessment.totalTaxBdt)}
                  </strong>{' '}
                  ({lowestNonBondedDuty?.title}).
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 pr-3 pl-4">
                    {isBn ? 'বিকল্প আমদানি মোড / HS কোড' : 'Alternative Regime / Adjacent HS8'}
                  </th>
                  <th className="px-3 py-3 text-right">{isBn ? 'TTI %' : 'TTI %'}</th>
                  <th className="px-3 py-3 text-right">
                    {isBn ? 'বন্দর শুল্ক ও কর' : 'Total Port Tax'}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {isBn ? 'রেয়াতযোগ্য কর' : 'Rebateable'}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {isBn ? 'প্রকৃত অফেরতযোগ্য শুল্ক' : 'Net Sunk Tax'}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {isBn ? 'শুল্ক সাশ্রয়' : 'Tax Difference'}
                  </th>
                  <th className="py-3 pr-4 pl-3 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.alternativeDutyMatrix.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.isCurrent
                        ? 'bg-emerald-50/50'
                        : 'hover:bg-slate-50/80 transition'
                    }
                  >
                    <td className="py-3 pr-3 pl-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                          {row.formattedHs8}
                        </span>
                        <span className="font-bold text-slate-900">
                          {isBn ? row.banglaTitle : row.title}
                        </span>
                        {row.isCurrent && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            {isBn ? 'সক্রিয়' : 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {isBn ? row.banglaNote : row.note}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-800">
                      {formatPct(row.ttiPercent)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatBdt(row.totalTaxBdt)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-medium text-sky-700">
                      {formatBdt(row.rebateableBdt)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-amber-900">
                      {formatBdt(row.netSunkTaxBdt)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold">
                      {row.savingsVsCurrentBdt > 0 ? (
                        <span className="text-emerald-700">
                          -{formatBdt(row.savingsVsCurrentBdt)}
                        </span>
                      ) : row.savingsVsCurrentBdt < 0 ? (
                        <span className="text-rose-600">
                          +{formatBdt(Math.abs(row.savingsVsCurrentBdt))}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right">
                      {row.isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {isBn ? 'নির্বাচিত' : 'Current'}
                        </span>
                      ) : row.switchCandidate && onSwitchCandidate ? (
                        <button
                          type="button"
                          onClick={() => onSwitchCandidate(row.switchCandidate!)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:border-emerald-500 hover:text-emerald-800"
                        >
                          <span>{isBn ? 'এই HS দেখুন' : 'Switch HS'}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ) : row.quickAction ? (
                        <button
                          type="button"
                          onClick={() => onApplyQuickAction(row.quickAction!)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          <span>{isBn ? 'প্রয়োগ করুন' : 'Apply'}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= PILLAR 2: TAX REBATE SCOPE ================= */}
      {activePillar === 'rebate_scope' && (
        <div className="p-5 sm:p-6 space-y-5">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
              <div className="text-[11px] font-bold text-sky-900 uppercase">
                {isBn
                  ? 'স্থানীয় বিক্রয়ে ফেরতযোগ্য কর (VAT + AT + AIT)'
                  : 'Recoverable on Local Sales (VAT + AT + AIT)'}
              </div>
              <div className="mt-1 font-mono text-xl font-extrabold text-sky-800">
                {formatBdt(report.rebateScope.recoverableLocalBdt)}
              </div>
              <div className="mt-0.5 text-[11px] text-sky-700">
                {isBn
                  ? `মোট বন্দর করের ${report.rebateScope.localRecoveryRatioPercent.toFixed(1)}% ফেরতযোগ্য`
                  : `${report.rebateScope.localRecoveryRatioPercent.toFixed(1)}% of total port tax recovered`}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="text-[11px] font-bold text-amber-900 uppercase">
                {isBn
                  ? 'স্থানীয় বিক্রয়ে প্রকৃত অফেরতযোগ্য শুল্ক (Sunk Duty)'
                  : 'True Net Sunk Duty (Unrecoverable Locally)'}
              </div>
              <div className="mt-1 font-mono text-xl font-extrabold text-amber-900">
                {formatBdt(report.rebateScope.unrecoverableSunkLocalBdt)}
              </div>
              <div className="mt-0.5 text-[11px] text-amber-800">
                {isBn
                  ? `শুল্কায়নযোগ্য মূল্যের মাত্র ${report.rebateScope.effectiveSunkRateOnAvPercent.toFixed(2)}%`
                  : `Effective sunk burden: ${report.rebateScope.effectiveSunkRateOnAvPercent.toFixed(2)}% of AV`}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="text-[11px] font-bold text-emerald-900 uppercase">
                {isBn
                  ? 'পণ্য রপ্তানি করলে মোট ফেরতযোগ্য (DEDO + ধারা ২৪)'
                  : 'Recoverable if Exported (Bond / DEDO Drawback)'}
              </div>
              <div className="mt-1 font-mono text-xl font-extrabold text-emerald-800">
                {formatBdt(report.rebateScope.recoverableExportBdt)}
              </div>
              <div className="mt-0.5 text-[11px] text-emerald-700">
                {isBn
                  ? 'রপ্তানিতে ১০০% শুল্ক ও ভ্যাট প্রত্যর্পণযোগ্য'
                  : 'Up to 100% recoverable for direct/deemed exports'}
              </div>
            </div>
          </div>

          {/* Stacked Progress Bar */}
          {report.rebateScope.totalPortTaxBdt > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                <span>
                  {isBn ? 'কর রেয়াত বনাম অফেরতযোগ্য শুল্ক অনুপাত' : 'Recoverable Rebate vs. Sunk Duty Split'}
                </span>
                <span>
                  {report.rebateScope.localRecoveryRatioPercent.toFixed(1)}%{' '}
                  {isBn ? 'রেয়াতযোগ্য' : 'Rebateable'}
                </span>
              </div>
              <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  style={{ width: `${Math.min(100, report.rebateScope.localRecoveryRatioPercent)}%` }}
                  className="bg-sky-500 transition-all"
                  title="Recoverable Rebate & Tax Credit"
                />
                <div
                  style={{
                    width: `${Math.max(0, 100 - report.rebateScope.localRecoveryRatioPercent)}%`,
                  }}
                  className="bg-amber-500 transition-all"
                  title="Non-Recoverable Sunk Duty"
                />
              </div>
            </div>
          )}

          {/* Line-by-Line Rebate Scope Cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {report.rebateScope.items.map((item) => (
              <div
                key={item.code}
                className={`rounded-xl border p-4 ${
                  item.recoverableForLocalSale
                    ? 'border-sky-200 bg-white'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.recoverableForLocalSale
                          ? 'bg-sky-100 text-sky-900'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {item.recoverableForLocalSale
                        ? isBn
                          ? '✓ স্থানীয় ও রপ্তানি উভয়েই ফেরতযোগ্য'
                          : '✓ Recoverable (Local & Export)'
                        : isBn
                        ? 'শুধুমাত্র রপ্তানিতে DEDO ফেরতযোগ্য'
                        : 'Sunk Locally · DEDO Refund if Exported'}
                    </span>
                    <h4 className="mt-1.5 text-sm font-bold text-slate-900">
                      {isBn ? item.banglaLabel : item.label}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base font-extrabold text-slate-900">
                      {formatBdt(item.amountBdt)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.shareOfTotalTaxPercent.toFixed(1)}% {isBn ? 'মোট করের' : 'of port tax'}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 text-xs font-semibold text-emerald-800">
                  {isBn ? item.banglaMechanism : item.mechanism}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {isBn ? item.banglaCondition : item.condition}
                </p>

                {item.code === 'VAT' &&
                  !item.recoverableForLocalSale &&
                  assessment.domesticVatMode !== 'standard_15' && (
                    <button
                      type="button"
                      onClick={() =>
                        onApplyQuickAction({
                          type: 'set_domestic_vat',
                          mode: 'standard_15',
                          label: 'Switch to 15% Standard VAT',
                        })
                      }
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>
                        {isBn
                          ? '১৫% স্ট্যান্ডার্ড ভ্যাট চালু করে রেয়াত আনলক করুন'
                          : 'Switch to 15% Standard VAT to Unlock Rebate'}
                      </span>
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PILLAR 3: ZERO-TAX OPTIONS ================= */}
      {activePillar === 'zero_tax' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {report.zeroTaxOptions.map((opt) => (
              <div
                key={opt.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  opt.eligibleForCurrentProduct
                    ? 'border-emerald-200 bg-emerald-50/25 shadow-2xs'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${
                        opt.eligibilityBadge === 'Directly Eligible'
                          ? 'bg-emerald-100 text-emerald-900 ring-emerald-600/25'
                          : opt.eligibilityBadge === 'Export / Free-Zone License'
                          ? 'bg-sky-100 text-sky-900 ring-sky-600/25'
                          : 'bg-violet-100 text-violet-900 ring-violet-600/25'
                      }`}
                    >
                      {isBn ? opt.banglaEligibilityBadge : opt.eligibilityBadge}
                    </span>

                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-extrabold text-emerald-400">
                      {opt.resultingTtiPercent.toFixed(2)}% TTI · {formatBdt(opt.resultingPortTaxBdt)}
                    </span>
                  </div>

                  <h3 className="mt-2.5 text-sm font-bold text-slate-900">
                    {isBn ? opt.banglaTitle : opt.title}
                  </h3>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {opt.legalAuthority}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {isBn ? opt.banglaSummary : opt.summary}
                  </p>

                  <ul className="mt-3 space-y-1 border-t border-slate-200/70 pt-2.5 text-[11px] text-slate-600">
                    {(isBn ? opt.banglaRequirements : opt.requirements).map((req) => (
                      <li key={req} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="text-xs font-bold text-emerald-700">
                    {opt.taxSavedBdt > 0
                      ? isBn
                        ? `সাশ্রয়: ${formatBdt(opt.taxSavedBdt)}`
                        : `Saves ${formatBdt(opt.taxSavedBdt)}`
                      : isBn
                      ? 'বর্তমানে সক্রিয় / ০% শুল্ক'
                      : 'Already Active / 0% Base'}
                  </div>

                  {opt.quickAction && (
                    <button
                      type="button"
                      onClick={() => onApplyQuickAction(opt.quickAction!)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {isBn ? 'জিরো-ট্যাক্স সিমুলেট করুন' : opt.quickAction.label}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= PILLAR 4: BEST IMPORT DESTINATION (PORTS + ORIGINS + HUBS) ================= */}
      {activePillar === 'best_destination' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Section A: Best Bangladesh Entry Port & Customs Zone */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isBn
                    ? 'ক) বাংলাদেশে সেরা কাস্টমস বন্দর ও গন্তব্য জোন র‍্যাঙ্কিং'
                    : 'A. Best Bangladesh Entry Port & Customs Destination Ranking'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBn
                    ? `পণ্য (${entry.formattedHs8}), চালানের মূল্য এবং সোর্সিং দেশের ওপর ভিত্তি করে সেরা বন্দর নির্বাচন`
                    : `Ranked for Chapter ${entry.chapter} (${entry.commercialName}) based on freight, berth speed, and customs specialization`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {report.portDestinations.map((port) => {
                const ModeIcon =
                  port.mode === 'Air'
                    ? Plane
                    : port.mode === 'Land'
                    ? Truck
                    : port.mode === 'Free-Zone'
                    ? ShieldCheck
                    : Anchor;
                return (
                  <div
                    key={port.id}
                    className={`rounded-xl border p-4 ${
                      port.recommended
                        ? 'border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          port.recommended
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <ModeIcon className="h-3 w-3" />
                        <span>
                          {port.recommended
                            ? isBn
                              ? '★ #১ সেরা বন্দর গন্তব্য'
                              : '★ #1 Best Entry Port'
                            : `${port.mode} Port`}
                        </span>
                      </span>
                      <span className="font-mono text-xs font-extrabold text-emerald-700">
                        {port.suitabilityScore}/99
                      </span>
                    </div>

                    <h4 className="mt-2 text-sm font-bold text-slate-900">
                      {isBn ? port.banglaPortName : port.portName}
                    </h4>
                    <div className="text-[11px] font-medium text-slate-500">
                      {port.customsHouse}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {isBn ? port.banglaBestForSummary : port.bestForSummary}
                    </p>

                    <div className="mt-3 space-y-1 border-t border-slate-200/70 pt-2.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {isBn ? 'আনুমানিক ট্রানজিট:' : 'Transit Time:'}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {port.estimatedTransitDays}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {isBn ? 'কাস্টমস খালাস সময়:' : 'Clearance Speed:'}
                        </span>
                        <span className="font-semibold text-slate-800">{port.clearanceSpeed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {isBn ? 'আনুমানিক ল্যান্ডেড খরচ:' : 'Est. Landed Cost:'}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatBdt(port.estimatedTotalLandedBdt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Best Global Sourcing Country / Origin Landed Cost Matrix */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isBn
                  ? 'খ) কোন দেশ থেকে আমদানি করলে খরচ সবচেয়ে কম? (FTA ও পরিবহন তুলনা)'
                  : 'B. Best Sourcing Country & Preferential FTA Corridor Comparison'}
              </h3>
              <p className="text-xs text-slate-500">
                {isBn
                  ? `সবচেয়ে সাশ্রয়ী সোর্সিং দেশ: ${topOrigin?.banglaCountry || ''} (আনুমানিক ল্যান্ডেড খরচ ${formatBdt(topOrigin?.estimatedLandedBdt || 0)})`
                  : `Top landed-cost sourcing corridor: ${topOrigin?.country || ''} (${formatBdt(topOrigin?.estimatedLandedBdt || 0)} all-in)`}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="py-2.5 pr-3 pl-4">
                      {isBn ? 'সোর্সিং দেশ ও চুক্তি' : 'Origin Country & Agreement'}
                    </th>
                    <th className="px-3 py-2.5 text-right">{isBn ? 'কার্যকর CD' : 'Eff. CD'}</th>
                    <th className="px-3 py-2.5 text-right">{isBn ? 'TTI %' : 'TTI %'}</th>
                    <th className="px-3 py-2.5 text-right">{isBn ? 'মোট কর' : 'Total Tax'}</th>
                    <th className="px-3 py-2.5 text-right">
                      {isBn ? 'মোট ল্যান্ডেড খরচ' : 'Est. Landed Cost'}
                    </th>
                    <th className="px-3 py-2.5">{isBn ? 'প্রস্তাবিত বন্দর' : 'Best BD Port'}</th>
                    <th className="py-2.5 pr-4 pl-3 text-right">{isBn ? 'সিমুলেট' : 'Simulate'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.sourcingCorridors.map((c) => (
                    <tr
                      key={c.id}
                      className={c.recommended ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2.5 pr-3 pl-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {c.recommended && (
                            <Award className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          )}
                          <span>{isBn ? c.banglaCountry : c.country}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {c.agreementLabel} · {c.transitDays}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                        {formatPct(c.effectiveCdPercent)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                        {formatPct(c.ttiPercent)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                        {formatBdt(c.totalTaxBdt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-900">
                        {formatBdt(c.estimatedLandedBdt)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-medium text-slate-700">
                        {c.recommendedEntryPort}
                      </td>
                      <td className="py-2.5 pr-4 pl-3 text-right">
                        {c.quickAction ? (
                          <button
                            type="button"
                            onClick={() => onApplyQuickAction(c.quickAction!)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white"
                          >
                            <span>{isBn ? 'প্রয়োগ' : 'Apply'}</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-700">
                            {isBn ? 'সক্রিয়' : 'Active'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Regional Import Destination Hub Tariff Benchmark */}
          <div>
            <div className="mb-3">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Globe2 className="h-4 w-4 text-emerald-600" />
                <span>
                  {isBn
                    ? 'গ) আন্তর্জাতিক আমদানি গন্তব্য ও রিজিওনাল হাব শুল্ক তুলনা'
                    : 'C. Regional Import Destination & Free-Port Tariff Benchmark'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'বাংলাদেশ সাধারণ বন্দর, বাংলাদেশ EPZ/BEZA ফ্রি-জোন এবং সিঙ্গাপুর, দুবাই, ভিয়েতনাম ও ভারতের শুল্ক হারের তুলনা'
                  : 'Compare importing into Bangladesh Domestic Port vs. Bangladesh EPZ/BEZA Free Zone vs. Singapore, Dubai (JAFZA), Vietnam & India'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.regionalBenchmarks.map((hub) => (
                <div
                  key={hub.countryOrZone}
                  className={`rounded-xl border p-3.5 ${
                    hub.highlight
                      ? 'border-slate-300 bg-slate-50/90'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-bold text-slate-900">
                      {isBn ? hub.banglaCountryOrZone : hub.countryOrZone}
                    </div>
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
                      ~{hub.estimatedEffectiveTaxPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-slate-700">
                    {hub.dutyRateLabel} · {hub.vatOrGstLabel}
                  </div>
                  <div className="mt-1 font-mono text-xs font-bold text-slate-800">
                    {isBn ? 'আনুমানিক কর:' : 'Est. Tax:'} {formatBdt(hub.estimatedTotalTaxBdt)}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                    {isBn ? hub.banglaRoleNote : hub.roleNote}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
