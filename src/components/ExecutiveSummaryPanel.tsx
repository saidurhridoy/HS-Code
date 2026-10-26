import React, { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Lightbulb,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { generateOptimizationPlan } from '@shared/tax-optimizer';
import { generateAlternativeTradeIntelligence } from '@shared/trade-intelligence';
import {
  AppLanguage,
  TariffEntry,
  TaxAssessmentInput,
  TaxAssessmentResult,
} from '@shared/types';
import { formatBdt, formatForeign, formatPct } from '@/lib/format';
import {
  formatDomesticVatLabel,
  formatIpoStatusLabel,
  formatRegimeLabel,
  TECHNICAL_TERMS_DICT,
} from '@/lib/i18n';

interface ExecutiveSummaryPanelProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  entry: TariffEntry;
  assessmentInput: TaxAssessmentInput;
  assessment: TaxAssessmentResult;
}

export const ExecutiveSummaryPanel: React.FC<ExecutiveSummaryPanelProps> = ({
  lang,
  onChangeLang,
  entry,
  assessmentInput,
  assessment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isBn = lang === 'bn';

  const plan = useMemo(
    () => generateOptimizationPlan(entry, assessmentInput, assessment),
    [entry, assessmentInput, assessment]
  );

  const tradeIntel = useMemo(
    () => generateAlternativeTradeIntelligence(entry, null, assessmentInput, assessment),
    [entry, assessmentInput, assessment]
  );

  const topSavingOption = plan.opportunities[0] || null;
  const topPort = tradeIntel.portDestinations[0] || null;
  const topOrigin = tradeIntel.sourcingCorridors[0] || null;
  const topZeroTax = tradeIntel.zeroTaxOptions[0] || null;
  const mandatoryNocs = entry.compliance.filter((c) => c.mandatory);

  const handleToggleSummarize = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      setTimeout(() => {
        document
          .getElementById('executive-summary-card')
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  };

  const plainTextSummary = useMemo(() => {
    if (isBn) {
      return [
        `=== সংক্ষেপে শুল্ক ও ভ্যাট সারসংক্ষেপ (DutyLens BD) ===`,
        `পণ্য: ${entry.commercialName}`,
        `বাংলাদেশ ৮-ডিজিট এইচএস কোড: ${entry.formattedHs8} (অধ্যায় ${entry.chapter})`,
        `আমদানি নীতি (IPO): ${formatIpoStatusLabel(entry.ipoStatus, 'bn')}`,
        `আমদানিকারকের ধরন: ${formatRegimeLabel(assessment.regime, 'bn')}`,
        `শুল্কায়নযোগ্য মূল্য (AV): ${formatBdt(assessment.valuation.assessableValueBdt)}`,
        `মোট করভার (TTI): ${formatPct(assessment.ttiPercent)}`,
        `বন্দরে মোট প্রদেয় শুল্ক ও কর: ${formatBdt(assessment.totalTaxBdt)}`,
        `ফেরতযোগ্য ভ্যাট ও কর রেয়াত (VAT + AT): ${formatBdt(assessment.rebateableTaxBdt)}`,
        `রেয়াত বাদে প্রকৃত শুল্ক খরচ: ${formatBdt(assessment.netSunkDutyBdt)}`,
        `মোট আমদানি খরচ (Landed Cost): ${formatBdt(assessment.totalLandedCostBdt)} (${formatBdt(assessment.perUnitLandedBdt)} / ${entry.unit})`,
        topSavingOption
          ? `সেরা কর সাশ্রয় উপায়: ${topSavingOption.title} — সম্ভাব্য সাশ্রয় প্রায় ${formatBdt(topSavingOption.estimatedSavingsBdt)}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    }

    return [
      `=== Executive Customs & VAT Summary (DutyLens BD) ===`,
      `Product: ${entry.commercialName}`,
      `Bangladesh 8-Digit HS Code: ${entry.formattedHs8} (Chapter ${entry.chapter})`,
      `Import Policy Status: ${entry.ipoStatus}`,
      `Importer Regime: ${formatRegimeLabel(assessment.regime, 'en')}`,
      `Assessable Value (AV): ${formatBdt(assessment.valuation.assessableValueBdt)}`,
      `Total Tax Incidence (TTI): ${formatPct(assessment.ttiPercent)}`,
      `Total Port Customs & VAT Payable: ${formatBdt(assessment.totalTaxBdt)}`,
      `Recoverable Input Credits (VAT + AT): ${formatBdt(assessment.rebateableTaxBdt)}`,
      `Net Non-Recoverable Sunk Duty: ${formatBdt(assessment.netSunkDutyBdt)}`,
      `Total Landed Cost: ${formatBdt(assessment.totalLandedCostBdt)} (${formatBdt(assessment.perUnitLandedBdt)} / ${entry.unit})`,
      topSavingOption
        ? `Top Tax-Saving Option: ${topSavingOption.title} — Est. Savings ${formatBdt(topSavingOption.estimatedSavingsBdt)}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [isBn, entry, assessment, topSavingOption]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainTextSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Contextualize key terms with live BDT amounts from the user's shipment
  const contextualTerms = useMemo(() => {
    const findLine = (code: 'CD' | 'RD' | 'SD' | 'VAT' | 'AIT' | 'AT') =>
      assessment.lines.find((l) => l.code === code);

    return [
      {
        term: TECHNICAL_TERMS_DICT.HS,
        liveBadge: `HS ${entry.formattedHs8}`,
      },
      {
        term: TECHNICAL_TERMS_DICT.AV,
        liveBadge: formatBdt(assessment.valuation.assessableValueBdt),
      },
      {
        term: TECHNICAL_TERMS_DICT.TTI,
        liveBadge: formatPct(assessment.ttiPercent),
      },
      ...(['CD', 'RD', 'SD', 'VAT', 'AIT', 'AT'] as const).map((code) => {
        const line = findLine(code);
        return {
          term: TECHNICAL_TERMS_DICT[code],
          liveBadge: line
            ? `${line.ratePercent}% → ${formatBdt(line.amountBdt)}`
            : '0%',
        };
      }),
      {
        term: TECHNICAL_TERMS_DICT.IRC,
        liveBadge: formatRegimeLabel(assessment.regime, lang),
      },
      {
        term: TECHNICAL_TERMS_DICT.MUSHAK,
        liveBadge:
          assessment.rebateableTaxBdt > 0
            ? `${isBn ? 'রেয়াতযোগ্য' : 'Rebate'}: ${formatBdt(assessment.rebateableTaxBdt)}`
            : isBn
              ? 'রেয়াত প্রযোজ্য নয়'
              : 'No Credit in Current Mode',
      },
      {
        term: TECHNICAL_TERMS_DICT.SRO,
        liveBadge: entry.sroEligibleCapitalMachinery
          ? isBn
            ? 'মূলধনী যন্ত্রপাতি ১% SRO যোগ্য'
            : '1% Capital Machinery Eligible'
          : isBn
            ? 'সাধারণ ট্যারিফ প্রযোজ্য'
            : 'Standard OTS Schedule',
      },
    ];
  }, [assessment, entry, lang, isBn]);

  return (
    <section
      id="executive-summary-card"
      className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-5 shadow-xs"
    >
      {/* Prominent Bottom Summarize Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              {isBn
                ? 'সংক্ষেপে সম্পূর্ণ শুল্ক হিসাব ও টেকনিক্যাল শব্দের সহজ বাংলা ব্যাখ্যা'
                : 'Quick Executive Summary & Plain-Language Technical Term Guide'}
            </h2>
            <p className="text-xs text-slate-600">
              {isBn
                ? 'সময় বাঁচান: ১ ক্লিকে পুরো চালানের মূল সিদ্ধান্ত এবং AV, CD, SD, VAT, AIT, AT, TTI ও মূসক রেয়াতের অর্থ বুঝে নিন।'
                : 'Save time: get a 30-second plain-language briefing of your shipment cost, tax rebates, and every customs term in English or বাংলা.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleSummarize}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 sm:text-sm"
        >
          <Sparkles className="h-4 w-4" />
          <span>
            {expanded
              ? isBn
                ? 'সারসংক্ষেপ লুকান (Hide Summary)'
                : 'Hide Summary'
              : isBn
                ? 'সংক্ষেপে বুঝুন (Summarize)'
                : 'Summarize'}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded Time-Saving Summary & Bilingual Term Breakdown */}
      {expanded && (
        <div className="mt-5 space-y-5 border-t border-emerald-200/70 pt-5">
          {/* Top Toolbar inside Summary: Language Switch + Copy */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <BookOpenCheck className="h-4 w-4 text-emerald-600" />
              <span>
                {isBn
                  ? '৩০ সেকেন্ডে আপনার চালানের মূল সারসংক্ষেপ'
                  : '30-Second Shipment Briefing'}
              </span>
            </div>

            <div className="flex items-center gap-2 no-print">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onChangeLang('bn')}
                  className={`rounded-md px-2.5 py-1 transition ${
                    isBn ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  বাংলায় বুঝুন
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`rounded-md px-2.5 py-1 transition ${
                    !isBn ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  In English
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">
                      {isBn ? 'কপি হয়েছে' : 'Summary Copied'}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{isBn ? 'সারসংক্ষেপ কপি করুন' : 'Copy Summary'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 4 Plain-Language Executive Cards */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Classification & Clearance */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold tracking-wide text-emerald-700 uppercase">
                {isBn ? '১. সঠিক কোড ও ছাড়পত্র' : '1. HS Code & Clearance'}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {isBn ? (
                  <>
                    আপনার পণ্যটি <strong>{entry.commercialName}</strong> হিসেবে বাংলাদেশ কাস্টমসের{' '}
                    <strong className="font-mono text-emerald-800">HS {entry.formattedHs8}</strong>{' '}
                    কোডে পড়েছে। আমদানি নীতি অনুযায়ী এটি{' '}
                    <strong>{formatIpoStatusLabel(entry.ipoStatus, 'bn')}</strong>।
                    {mandatoryNocs.length > 0 ? (
                      <>
                        {' '}
                        খালাসের জন্য <strong>{mandatoryNocs.map((c) => c.authority).join(', ')}</strong>{' '}
                        এর সনদ প্রয়োজন হবে।
                      </>
                    ) : (
                      <> সাধারণ বাণিজ্যিক এলসি ডকুমেন্টেই পণ্যটি খালাস করা যাবে।</>
                    )}
                  </>
                ) : (
                  <>
                    Classified under Bangladesh Customs code{' '}
                    <strong className="font-mono text-emerald-800">HS {entry.formattedHs8}</strong> (
                    <strong>{entry.commercialName}</strong>). Status:{' '}
                    <strong>{entry.ipoStatus}</strong>.
                    {mandatoryNocs.length > 0 ? (
                      <>
                        {' '}
                        Requires clearance/NOC from{' '}
                        <strong>{mandatoryNocs.map((c) => c.authority).join(', ')}</strong> before release.
                      </>
                    ) : (
                      <> Standard commercial shipping &amp; LC documents suffice for port clearance.</>
                    )}
                  </>
                )}
              </p>
            </div>

            {/* Card 2: Total Cash vs Real Cost After Rebate */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold tracking-wide text-blue-700 uppercase">
                {isBn ? '২. বন্দরে কর বনাম প্রকৃত খরচ' : '2. Port Cash vs Real Cost'}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {isBn ? (
                  <>
                    <strong>
                      {formatForeign(
                        assessment.valuation.invoiceValueForeign,
                        assessment.valuation.currency
                      )}
                    </strong>{' '}
                    ইনভয়েস মূল্যের ওপর শুল্কায়নযোগ্য মূল্য (AV) দাঁড়াচ্ছে{' '}
                    <strong>{formatBdt(assessment.valuation.assessableValueBdt)}</strong>। বন্দরে মোট{' '}
                    <strong>{formatPct(assessment.ttiPercent)} (TTI)</strong> হারে{' '}
                    <strong>{formatBdt(assessment.totalTaxBdt)}</strong> জমা দিতে হবে। এর মধ্যে{' '}
                    <strong className="text-emerald-700">
                      {formatBdt(assessment.rebateableTaxBdt)}
                    </strong>{' '}
                    ভ্যাট ও অগ্রিম কর হিসেবে ফেরতযোগ্য, ফলে প্রকৃত অফেরতযোগ্য শুল্ক খরচ মাত্র{' '}
                    <strong>{formatBdt(assessment.netSunkDutyBdt)}</strong>।
                  </>
                ) : (
                  <>
                    On your invoice of{' '}
                    <strong>
                      {formatForeign(
                        assessment.valuation.invoiceValueForeign,
                        assessment.valuation.currency
                      )}
                    </strong>
                    , Customs Assessable Value (AV) is{' '}
                    <strong>{formatBdt(assessment.valuation.assessableValueBdt)}</strong>. You pay{' '}
                    <strong>{formatBdt(assessment.totalTaxBdt)}</strong> at port (
                    <strong>{formatPct(assessment.ttiPercent)} TTI</strong>), of which{' '}
                    <strong className="text-emerald-700">
                      {formatBdt(assessment.rebateableTaxBdt)}
                    </strong>{' '}
                    is recoverable via Mushak-9.1, leaving{' '}
                    <strong>{formatBdt(assessment.netSunkDutyBdt)}</strong> as true sunk duty.
                  </>
                )}
              </p>
            </div>

            {/* Card 3: Actionable Tax-Saving Verdict */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-emerald-800 uppercase">
                <Lightbulb className="h-3.5 w-3.5 text-emerald-600" />
                <span>{isBn ? '৩. কর ও সময় বাঁচানোর পরামর্শ' : '3. Fastest Way to Save Tax'}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {topSavingOption && topSavingOption.estimatedSavingsBdt > 0 ? (
                  isBn ? (
                    <>
                      আপনার জন্য সবচেয়ে কার্যকর বৈধ কর সাশ্রয় কৌশল হলো{' '}
                      <strong>“{topSavingOption.title}”</strong> — এটি প্রয়োগ করলে প্রায়{' '}
                      <strong className="text-emerald-800">
                        {formatBdt(topSavingOption.estimatedSavingsBdt)}
                      </strong>{' '}
                      সাশ্রয় হতে পারে (নতুন TTI: {formatPct(topSavingOption.newTtiPercent)})। এছাড়া{' '}
                      <strong>{formatDomesticVatLabel(assessment.domesticVatMode, 'bn')}</strong>{' '}
                      অনুসরণ করুন।
                    </>
                  ) : (
                    <>
                      Your highest-impact legal optimization is{' '}
                      <strong>“{topSavingOption.title}”</strong>, saving approximately{' '}
                      <strong className="text-emerald-800">
                        {formatBdt(topSavingOption.estimatedSavingsBdt)}
                      </strong>{' '}
                      (reducing TTI to {formatPct(topSavingOption.newTtiPercent)}). Current VAT mode:{' '}
                      <strong>{formatDomesticVatLabel(assessment.domesticVatMode, 'en')}</strong>.
                    </>
                  )
                ) : isBn ? (
                  <>
                    আপনার বর্তমান লাইসেন্স ও ভ্যাট মোড ইতিমধ্যেই সর্বনিম্ন শুল্ক হারে রয়েছে। মাসিক মূসক-৯.১ রিটার্ন ১৫ তারিখের মধ্যে দাখিল করে রেয়াত নিশ্চিত করুন।
                  </>
                ) : (
                  <>
                    Your current regime is already optimized for low duty incidence. File Mushak-9.1 by the 15th of next month to lock in full input credits.
                  </>
                )}
              </p>
            </div>

            {/* Card 4: Zero-Tax & Best Import Destination */}
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
              <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-sky-900 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                <span>
                  {isBn
                    ? '৪. জিরো-ট্যাক্স ও সেরা বন্দর গন্তব্য'
                    : '4. Zero-Tax & Best Destination'}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                {isBn ? (
                  <>
                    <strong>জিরো-ট্যাক্স (০%):</strong>{' '}
                    {topZeroTax?.banglaTitle.split('(')[0].trim()} সুবিধায় সম্পূর্ণ শুল্কমুক্ত আমদানি সম্ভব।{' '}
                    <strong>সেরা বন্দর:</strong>{' '}
                    <span className="text-sky-900 font-semibold">
                      {topPort?.banglaPortName.split('(')[0].trim()}
                    </span>{' '}
                    এবং সাশ্রয়ী সোর্সিং দেশ:{' '}
                    <strong>{topOrigin?.banglaCountry.split('(')[0].trim()}</strong>।
                  </>
                ) : (
                  <>
                    <strong>Zero-Tax (0%):</strong> Eligible under{' '}
                    {topZeroTax?.title.split('(')[0].trim()}.{' '}
                    <strong>Best Entry Port:</strong>{' '}
                    <span className="text-sky-900 font-semibold">
                      {topPort?.portName.split('(')[0].trim()}
                    </span>
                    ; lowest landed-cost origin:{' '}
                    <strong>{topOrigin?.country.split('(')[0].trim()}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Plain-Language Technical Terms Grid */}
          <div>
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-800 uppercase">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                {isBn
                  ? 'সহজ বাংলায় টেকনিক্যাল কাস্টমস ও ভ্যাট শব্দের অর্থ (আপনার চালান অনুযায়ী)'
                  : 'Technical Customs & VAT Terms Explained Simply (With Your Shipment Figures)'}
              </span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {contextualTerms.map(({ term, liveBadge }) => (
                <div
                  key={term.code}
                  className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                      {term.code}
                    </span>
                    <span className="truncate font-mono text-[11px] font-bold text-emerald-700">
                      {liveBadge}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-slate-900">
                    {isBn ? term.bnTitle : term.enTitle}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {isBn ? term.bnMeaning : term.enMeaning}
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
