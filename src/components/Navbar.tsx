import React from 'react';
import {
  BookOpen,
  Cpu,
  Database,
  FileSpreadsheet,
  Languages,
  LogIn,
  Scale,
  Sparkles,
  TrendingDown,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { AppLanguage, LlmConfig, UserProfile } from '@shared/types';
import { AuthModalMode } from '@/components/AuthProfileModal';
import { HealthStats } from '@/lib/api';
import { UI_STRINGS } from '@/lib/i18n';

export type ActiveTab = 'classifier' | 'optimizer' | 'explorer' | 'batch';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  llmConfig: LlmConfig;
  onOpenAiModal: () => void;
  health: HealthStats | null;
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  user: UserProfile | null;
  savedQueriesCount: number;
  onOpenAuthModal: (mode: AuthModalMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  llmConfig,
  onOpenAiModal,
  health,
  lang,
  onChangeLang,
  user,
  savedQueriesCount,
  onOpenAuthModal,
}) => {
  const t = UI_STRINGS[lang];
  const isBn = lang === 'bn';

  const engineLabel =
    llmConfig.provider === 'builtin' || !llmConfig.apiKey
      ? isBn
        ? 'হাইব্রিড এআই'
        : 'Hybrid AI'
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
              <span className="hidden rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 xl:inline-block">
                NBR · HS2022
              </span>
            </div>
            <p className="text-xs text-slate-500">{t.brandSubtitle}</p>
          </div>
        </div>

        {/* Primary Mode Tabs */}
        <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onSelectTab('classifier')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
              activeTab === 'classifier'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>{t.tabClassifier}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('optimizer')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
              activeTab === 'optimizer'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown className="h-4 w-4 text-emerald-600" />
            <span>{t.tabOptimizer}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('explorer')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
              activeTab === 'explorer'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-4 w-4 text-slate-500" />
            <span>{t.tabExplorer}</span>
            {health && (
              <span className="hidden rounded bg-slate-200/80 px-1.5 py-0.2 font-mono text-[10px] text-slate-700 2xl:inline">
                {health.stats.totalTariffCodes.toLocaleString()}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('batch')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:text-sm ${
              activeTab === 'batch'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span>{t.tabBatch}</span>
          </button>
        </nav>

        {/* Upper-Right Corner: AI Engine + User Sign Up / Log In / Profile + Bangla/English Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {health?.cloudConnected && (
            <span
              title="Connected to Supabase Postgres Cloud"
              className="hidden items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 2xl:inline-flex"
            >
              <Database className="h-3 w-3 text-emerald-600" />
              <span>{t.cloudLive}</span>
            </span>
          )}

          {/* AI Engine Pill */}
          <button
            type="button"
            onClick={onOpenAiModal}
            title={isBn ? 'এআই ইঞ্জিন সেটিংস' : 'AI Engine Settings'}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Cpu className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">{engineLabel}</span>
          </button>

          {/* User Sign Up / Log In / Profile Button (Beside Language Switch) */}
          {user ? (
            <button
              type="button"
              onClick={() => onOpenAuthModal('profile')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-2xs transition hover:bg-emerald-100"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
              <span className="max-w-[110px] truncate">{user.companyName || user.fullName}</span>
              <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 font-mono text-[10px] text-white">
                {savedQueriesCount}
              </span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <LogIn className="h-3.5 w-3.5 text-slate-500" />
                <span>{isBn ? 'লগইন' : 'Log In'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('signup')}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-slate-800"
              >
                <UserPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>{isBn ? 'সাইন আপ' : 'Sign Up'}</span>
              </button>
            </div>
          )}

          {/* Language Switcher: English | বাংলা (Upper-Right Corner) */}
          <div
            role="group"
            aria-label="Choose Language"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5 shadow-2xs"
          >
            <Languages className="mr-1 ml-1.5 h-3.5 w-3.5 text-emerald-700" />
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                lang === 'en'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('bn')}
              className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                lang === 'bn'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
