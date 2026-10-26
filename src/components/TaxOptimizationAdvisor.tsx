import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  CheckSquare,
  FileText,
  Globe2,
  Lightbulb,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  TrendingDown,
} from 'lucide-react';
import { simulateDomesticVatComparison } from '@shared/tax-math';
import { generateOptimizationPlan } from '@shared/tax-optimizer';
import {
  QuickOptimizationAction,
  TariffEntry,
  TaxAssessmentInput,
  TaxAssessmentResult,
} from '@shared/types';
import { formatBdt, formatPct } from '@/lib/format';

interface TaxOptimizationAdvisorProps {
  entry: TariffEntry;
  assessmentInput: TaxAssessmentInput;
  assessment: TaxAssessmentResult;
  onApplyQuickAction: (action: QuickOptimizationAction) => void;
}

type AdvisorSubTab = 'lower_tax' | 'vat_simulator' | 'rebate_playbook';

const CATEGORY_STYLES: Record<string, string> = {
  'SRO & License': 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  'Preferential FTA/PTA': 'bg-sky-50 text-sky-800 ring-sky-600/20',
  'Tariff Engineering': 'bg-violet-50 text-violet-800 ring-violet-600/20',
  'Customs Valuation': 'bg-amber-50 text-amber-900 ring-amber-600/25',
  'Export Bond / Drawback': 'bg-teal-50 text-teal-800 ring-teal-600/20',
};

export const TaxOptimizationAdvisor: React.FC<TaxOptimizationAdvisorProps> = ({
  entry,
  assessmentInput,
  assessment,
  onApplyQuickAction,
}) => {
  const [subTab, setSubTab] = useState<AdvisorSubTab>('lower_tax');
  const [markupPercent, setMarkupPercent] = useState<number>(22);
  const [buyerIsB2B, setBuyerIsB2B] = useState<boolean>(true);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const plan = useMemo(
    () => generateOptimizationPlan(entry, assessmentInput, assessment),
    [entry, assessmentInput, assessment]
  );

  const vatComparison = useMemo(
    () => simulateDomesticVatComparison(assessment, markupPercent, buyerIsB2B),
    [assessment, markupPercent, buyerIsB2B]
  );

  const toggleStep = (key: string) => {
    setCheckedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <section
      id="tax-optimization-workbench"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
    >
      {/* Top Executive Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>NBR Legal Duty Optimization &amp; Tax Rebate Engine</span>
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl">
              How to Lower Import VAT/Tax &amp; Claim Full Tax Rebate ({entry.formattedHs8})
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Actionable statutory pathways under the Bangladesh Customs Act 2023, VAT &amp; SD Act 2012 (s.31 &amp; s.46), Income Tax Act 2023 (s.120 &amp; s.163), and Preferential Origin SROs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase">
                Recoverable Rebate (VAT+AT+AIT)
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-sky-300">
                {formatBdt(assessment.rebateableTaxBdt)}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5">
              <div className="text-[10px] font-semibold tracking-wider text-emerald-200 uppercase">
                Max Duty Reduction Found
              </div>
              <div className="mt-0.5 font-mono text-lg font-bold text-emerald-300">
                {plan.maxPotentialSavingsBdt > 0
                  ? `Up to ${formatBdt(plan.maxPotentialSavingsBdt)}`
                  : 'Optimized'}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Pills */}
        <div className="mt-5 flex flex-wrap gap-2 no-print">
          <button
            type="button"
            onClick={() => setSubTab('lower_tax')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              subTab === 'lower_tax'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span>1. Lower Port Duty &amp; VAT ({plan.opportunities.length} Options)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('vat_simulator')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              subTab === 'vat_simulator'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>2. 15% VAT Rebate vs. 5% Trade VAT Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('rebate_playbook')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              subTab === 'rebate_playbook'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>3. Step-by-Step Rebate &amp; Mushak Checklist</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: TECHNICAL WAYS TO LOWER PORT DUTY & VAT ================= */}
      {subTab === 'lower_tax' && (
        <div className="p-5 sm:p-6">
          {plan.opportunities.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <div className="font-bold">Port Duty Structure Already at Lowest Statutory Floor!</div>
                <p className="mt-0.5 text-emerald-800">
                  Your current configuration ({assessment.regime.replace('_', ' ').toUpperCase()}, TTI {formatPct(assessment.ttiPercent)}) already reflects the lowest legal NBR duty slab for {entry.formattedHs8}. Switch to Tab 3 to ensure 100% post-clearance rebate compliance.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {plan.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/40 p-5 transition hover:border-emerald-300 hover:bg-white"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                          CATEGORY_STYLES[opp.category] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opp.category}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {opp.applicability}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-sm font-bold text-slate-900 sm:text-base">
                      {opp.title}
                    </h3>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                      Legal Basis: {opp.legalBasis}
                    </div>

                    {/* Quantified Savings Banner */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5">
                      <div>
                        <div className="text-[10px] font-semibold text-emerald-800 uppercase">
                          Estimated Tax Reduction
                        </div>
                        <div className="font-mono text-base font-extrabold text-emerald-800">
                          Save {formatBdt(opp.estimatedSavingsBdt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-semibold text-slate-600 uppercase">
                          New Effective TTI
                        </div>
                        <div className="font-mono text-sm font-bold text-slate-900">
                          {formatPct(assessment.ttiPercent)} →{' '}
                          <span className="text-emerald-700">{formatPct(opp.newTtiPercent)}</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-600">{opp.summary}</p>

                    {/* Technical Steps */}
                    <div className="mt-3.5">
                      <div className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                        Technical Execution Steps:
                      </div>
                      <ul className="mt-1.5 space-y-1.5">
                        {opp.technicalSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-mono text-[10px] font-bold text-emerald-800">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Required Documents */}
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {opp.requiredDocuments.map((doc) => (
                        <span
                          key={doc}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          <FileText className="h-3 w-3 text-slate-400" />
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {opp.quickAction && (
                    <div className="mt-4 border-t border-slate-200/80 pt-3.5 no-print">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyQuickAction(opp.quickAction!);
                          window.scrollTo({ top: 180, behavior: 'smooth' });
                        }}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-600"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{opp.quickAction.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: 15% STANDARD VAT vs 5% TRADE VAT SIMULATOR ================= */}
      {subTab === 'vat_simulator' && (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <h3 className="text-sm font-bold text-slate-900">
                  Section 46 Input VAT Rebate vs. 5% Commercial Trade VAT Breakeven Simulator
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Under Section 46(1)(ka) of VAT &amp; SD Act 2012, commercial importers paying <strong>5% Trade VAT</strong> forfeit 100% of their <strong>15% Import VAT</strong> credit (though 5% AT remains adjustable). Test your exact sales markup &amp; customer type below:
                </p>
              </div>

              {/* Buyer Type Toggle */}
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBuyerIsB2B(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    buyerIsB2B
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  B2B Corporate Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setBuyerIsB2B(false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    !buyerIsB2B
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  B2C Retail Consumer
                </button>
              </div>
            </div>

            {/* Markup Slider */}
            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Domestic Gross Margin / Value-Addition Markup:
                </span>
                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-900">
                  {markupPercent}% Markup
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={80}
                step={1}
                value={markupPercent}
                onChange={(e) => setMarkupPercent(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-emerald-600"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
                <span>5% (Wholesale)</span>
                <span>25% (Distribution)</span>
                <span className="text-amber-700">62.16% (B2C Statutory Breakeven)</span>
                <span>80% (High Retail)</span>
              </div>
            </div>
          </div>

          {/* Recommendation Callout */}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <BadgeDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="text-xs leading-relaxed text-emerald-950">
              <span className="font-bold">
                Optimal Regime:{' '}
                {vatComparison.recommendedMode === 'standard_15'
                  ? 'Standard 15% Output VAT Registration (Mushak-6.3 @ 15%)'
                  : '5% Commercial Trade VAT'}
              </span>
              {vatComparison.netAdvantageBdt > 0 && (
                <span className="ml-2 rounded bg-emerald-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  Advantage: {formatBdt(vatComparison.netAdvantageBdt)}
                </span>
              )}
              <p className="mt-1 text-emerald-900/90">{vatComparison.explanation}</p>
            </div>
          </div>

          {/* Side-by-Side Scenario Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[vatComparison.standard15, vatComparison.trade5].map((sc) => {
              const isWinner = vatComparison.recommendedMode === sc.mode;
              return (
                <div
                  key={sc.mode}
                  className={`rounded-2xl border p-5 ${
                    isWinner
                      ? 'border-emerald-600 bg-white ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{sc.label}</h4>
                    {isWinner && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Recommended
                      </span>
                    )}
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Ex-VAT Selling Price:</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {formatBdt(sc.exVatSellingPriceBdt)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">
                        Output VAT Charged ({sc.mode === 'standard_15' ? '15%' : '5%'}):
                      </dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {formatBdt(sc.outputVatOnSalesBdt)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Total Invoice (Incl. VAT):</dt>
                      <dd className="font-mono font-bold text-slate-900">
                        {formatBdt(sc.invoicePriceInclVatBdt)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-2">
                      <dt className="text-emerald-700">Less: 15% Import VAT Rebate (Note-14):</dt>
                      <dd className="font-mono font-bold text-emerald-700">
                        {sc.importVatCreditBdt > 0
                          ? `-${formatBdt(sc.importVatCreditBdt)}`
                          : '৳0 (Forfeited u/s 46)'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sky-700">Less: Import AT Adjustment (Note-31):</dt>
                      <dd className="font-mono font-bold text-sky-700">
                        -{formatBdt(sc.importAtAdjustmentBdt)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <dt className="font-semibold text-slate-700">
                        Net Mushak-9.1 Payable / (Refund):
                      </dt>
                      <dd className="font-mono font-bold text-slate-900">
                        {sc.netTreasuryVatPayableOrRefundBdt >= 0
                          ? formatBdt(sc.netTreasuryVatPayableOrRefundBdt)
                          : `(${formatBdt(Math.abs(sc.netTreasuryVatPayableOrRefundBdt))} Credit)`}
                      </dd>
                    </div>
                    <div className="flex justify-between rounded-lg bg-slate-100 px-2.5 py-2">
                      <dt className="font-bold text-slate-800">Importer Net Margin Earned:</dt>
                      <dd className="font-mono font-extrabold text-emerald-800">
                        {formatBdt(sc.netProfitAfterAllTaxesBdt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: STEP-BY-STEP REBATE & DRAWBACK PLAYBOOK ================= */}
      {subTab === 'rebate_playbook' && (
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Post-Clearance VAT Rebate, AT Refund, AIT Credit &amp; DEDO Compliance Tracker
              </h3>
              <p className="text-xs text-slate-500">
                Check off each statutory step below so your C&amp;F and VAT/Accounts team never loses a single Taka of recoverable tax.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {plan.rebatePlaybook.map((item) => (
              <div
                key={item.taxCode}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">
                      {item.taxCode}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        item.eligibleNow
                          ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20'
                          : 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-sm font-bold text-slate-900">{item.title}</h4>
                  <div className="text-[11px] text-slate-500">
                    {item.banglaTitle} · <span className="font-mono">{item.statutoryAuthority}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">
                        Amount Paid at Port
                      </div>
                      <div className="font-mono text-base font-bold text-slate-900">
                        {formatBdt(item.amountBdt, 2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase">
                        Statutory Deadline
                      </div>
                      <div className="text-xs font-semibold text-emerald-800">
                        {item.claimWindow}
                      </div>
                    </div>
                  </div>

                  {/* Required Forms */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.formsRequired.map((form) => (
                      <span
                        key={form}
                        className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-800"
                      >
                        {form}
                      </span>
                    ))}
                  </div>

                  {/* Interactive Checkable Steps */}
                  <div className="mt-3.5 space-y-2">
                    {item.stepByStep.map((step, sIdx) => {
                      const stepKey = `${item.taxCode}-${sIdx}`;
                      const checked = Boolean(checkedSteps[stepKey]);
                      return (
                        <button
                          key={stepKey}
                          type="button"
                          onClick={() => toggleStep(stepKey)}
                          className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition ${
                            checked
                              ? 'bg-emerald-50/70 text-emerald-950 line-through decoration-emerald-500/60'
                              : 'bg-slate-50/70 text-slate-700 hover:bg-slate-100/80'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Square className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          )}
                          <span className="leading-relaxed">{step}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Audit / Disallowance Trap Warning */}
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-[11px] text-amber-950">
                  <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold">NBR Audit Disallowance Trap: </span>
                    <span className="leading-relaxed">{item.disallowanceTrap}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
