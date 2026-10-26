import React from 'react';
import { BookOpen, Cpu, Database, FileSpreadsheet, Scale, Sparkles, TrendingDown } from 'lucide-react';
import { LlmConfig } from '@shared/types';
import { HealthStats } from '@/lib/api';

export type ActiveTab = 'classifier' | 'optimizer' | 'explorer' | 'batch';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  llmConfig: LlmConfig;
  onOpenAiModal: () => void;
  health: HealthStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  llmConfig,
  onOpenAiModal,
  health,
}) => {
  const engineLabel =
    llmConfig.provider === 'builtin' || !llmConfig.apiKey
      ? 'Built-in Hybrid AI'
      : `${llmConfig.provider.toUpperCase()} RAG`;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 no-print">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                DutyLens <span className="text-emerald-600">BD</span>
              </span>
              <span className="hidden rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 sm:inline-block">
                NBR Tariff · HS2022
              </span>
            </div>
            <p className="text-xs text-slate-500">
              AI HS Code Classifier, Duty Reduction &amp; VAT Rebate Engine
            </p>
          </div>
        </div>

        {/* Primary Mode Tabs */}
        <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onSelectTab('classifier')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === 'classifier'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>AI HS Finder</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('optimizer')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === 'optimizer'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="h-4 w-4 text-emerald-600" />
            <span>Tax Saving &amp; Rebate</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('explorer')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === 'explorer'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-slate-500" />
            <span>Tariff Schedule</span>
            {health && (
              <span className="hidden rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 lg:inline">
                {health.stats.totalTariffCodes.toLocaleString()}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('batch')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === 'batch'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span>Batch Invoice</span>
          </button>
        </nav>

        {/* Cloud Sync + AI Engine Config Pill */}
        <div className="flex items-center gap-2">
          {health?.cloudConnected && (
            <span
              title="Connected to Supabase Postgres Cloud (Shared Assessment Links & Live Tariff Sync)"
              className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 md:inline-flex"
            >
              <Database className="h-3.5 w-3.5 text-emerald-600" />
              <span>Cloud DB Live</span>
            </span>
          )}
          <button
            type="button"
            onClick={onOpenAiModal}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Cpu className="h-3.5 w-3.5 text-slate-500" />
            <span>{engineLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
