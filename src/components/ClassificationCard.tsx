import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileCheck2,
  Info,
  Layers,
  ShieldAlert,
  Sparkles,
  Tag,
} from 'lucide-react';
import { ClassificationCandidate, ClassificationResult } from '@shared/types';
import { formatPct } from '@/lib/format';

interface ClassificationCardProps {
  result: ClassificationResult;
  selectedCandidate: ClassificationCandidate;
  onSelectCandidate: (candidate: ClassificationCandidate) => void;
  onRefineQuery: (appendText: string) => void;
}

export const ClassificationCard: React.FC<ClassificationCardProps> = ({
  result,
  selectedCandidate,
  onSelectCandidate,
  onRefineQuery,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const { entry } = selectedCandidate;
  const isPrimarySelected = selectedCandidate.entry.hs8 === result.primary.entry.hs8;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(entry.formattedHs8);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const ipoBadgeStyle =
    entry.ipoStatus === 'Freely Importable'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
      : entry.ipoStatus === 'Conditional Import'
      ? 'bg-amber-50 text-amber-800 ring-amber-600/25'
      : 'bg-rose-50 text-rose-700 ring-rose-600/25';

  const allCandidates = [result.primary, ...result.alternatives];

  return (
    <div className="space-y-4">
      {/* Fallback Notice if External LLM Key Failed */}
      {result.fallbackNotice && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{result.fallbackNotice}</span>
        </div>
      )}

      {/* Primary / Active Selected HS Code Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <Sparkles className="h-3 w-3" />
                {isPrimarySelected ? 'Primary AI Classification' : 'Selected Alternative Code'}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-slate-200">
                {selectedCandidate.confidence}% Match
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-300">
              {result.engineUsed} · {result.processingMs}ms
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {entry.formattedHs8}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy 8-digit Bangladesh HS Code"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs text-slate-200">
                WCO6: {entry.formattedHs6}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-xs text-slate-200">
                Unit: {entry.unit}
              </span>
            </div>
          </div>

          <h2 className="mt-2.5 text-base font-semibold text-emerald-50 sm:text-lg">
            {entry.commercialName}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Official Tariff Text: {entry.description}
          </p>
        </div>

        {/* WCO -> Bangladesh NBR Hierarchy Trail */}
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Harmonized System Hierarchy
            </span>
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${ipoBadgeStyle}`}
            >
              {entry.ipoStatus}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-slate-500">
                Sec. {entry.section}
              </span>
              <span className="text-slate-700">{entry.sectionTitle}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-slate-500">
                Ch. {entry.chapter}
              </span>
              <span className="text-slate-700">{entry.chapterTitle}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-slate-500">
                Hd. {entry.heading.slice(0, 2)}.{entry.heading.slice(2)}
              </span>
              <span className="text-slate-700">{entry.headingTitle}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-20 shrink-0 font-mono text-[11px] font-bold text-emerald-700">
                BCT {entry.formattedHs8}
              </span>
              <span className="font-medium text-slate-900">{entry.commercialName}</span>
            </div>
          </div>
        </div>

        {/* AI Reasoning & Extracted Product Signals */}
        <div className="space-y-3.5 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                AI Customs Classification Reasoning
              </h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-600">
                {selectedCandidate.griRule}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">{result.reasoningSummary}</p>
          </div>

          {/* Extracted Signals Chips */}
          <div className="flex flex-wrap gap-1.5">
            {result.signals.materials.map((mat) => (
              <span
                key={mat}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
              >
                <Tag className="h-3 w-3" />
                Material: {mat}
              </span>
            ))}
            {result.signals.productForm && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
                Form: {result.signals.productForm}
              </span>
            )}
            {result.signals.endUse && (
              <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-600/20">
                Use: {result.signals.endUse}
              </span>
            )}
            {result.signals.technicalSpecs.map((sp) => (
              <span
                key={sp}
                className="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 font-mono text-[11px] font-medium text-violet-800 ring-1 ring-inset ring-violet-600/20"
              >
                Spec: {sp}
              </span>
            ))}
          </div>

          {/* Interactive Ambiguity Refinement Prompts */}
          {result.ambiguityHints.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 no-print">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <Info className="h-3.5 w-3.5 text-emerald-600" />
                <span>Refine product details for sharper subheading precision:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.ambiguityHints.map((hint) => (
                  <button
                    key={hint.label}
                    type="button"
                    onClick={() => onRefineQuery(hint.appendPrompt)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <span>+ {hint.label}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compliance, NOCs & NBR SRO Exemptions Card */}
      {(entry.compliance.length > 0 || entry.sroNotes.length > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-800 uppercase">
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
            Bangladesh Import Policy (IPO) &amp; NBR SRO Notes
          </h3>

          {entry.compliance.length > 0 && (
            <div className="mt-3 space-y-2">
              {entry.compliance.map((comp, i) => (
                <div
                  key={`${comp.authority}-${i}`}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                >
                  {comp.mandatory ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{comp.title}</span>
                      <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                        {comp.authority}
                      </span>
                      {comp.mandatory && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Mandatory NOC
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      {comp.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {entry.sroNotes.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
              {entry.sroNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Alternative Candidate HS Codes */}
      {allCandidates.length > 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs no-print">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-slate-800 uppercase">
              Compare Candidate HS Codes ({allCandidates.length})
            </h3>
            <span className="text-[11px] text-slate-500">Click any code to recalculate VAT &amp; Duty</span>
          </div>

          <div className="space-y-2">
            {allCandidates.map((cand, idx) => {
              const isSelected = cand.entry.hs8 === selectedCandidate.entry.hs8;
              return (
                <button
                  key={cand.entry.hs8}
                  type="button"
                  onClick={() => onSelectCandidate(cand)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {cand.entry.formattedHs8}
                      </span>
                      {idx === 0 && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Best Match
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-500">
                        {cand.confidence}% conf
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                      {cand.entry.commercialName}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">{cand.whenToUse}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-bold text-slate-900">
                      {formatPct(cand.entry.tti)}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500">NBR TTI</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
