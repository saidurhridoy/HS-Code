import React, { useState } from 'react';
import { Check, Cpu, KeyRound, ShieldCheck, X } from 'lucide-react';
import { LlmConfig, LlmProvider } from '@shared/types';

interface AiSettingsModalProps {
  open: boolean;
  config: LlmConfig;
  onSave: (config: LlmConfig) => void;
  onClose: () => void;
}

const PROVIDERS: { id: LlmProvider; name: string; subtitle: string; defaultModel: string }[] = [
  {
    id: 'builtin',
    name: 'Built-in Smart Hybrid Engine (Default)',
    subtitle: 'Instant offline-ready NLP + BM25 + WCO GRI reranker across 5,600+ HS codes. No API key needed.',
    defaultModel: 'dutylens-hybrid-v1',
  },
  {
    id: 'gemini',
    name: 'Google Gemini + Tariff RAG',
    subtitle: 'Retrieves top WCO/NBR candidates via BM25, then uses Gemini for deep GRI legal reasoning.',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT + Tariff RAG',
    subtitle: 'Grounded RAG classification using GPT-4o-mini / GPT-4o over verified Bangladesh tariff rows.',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'groq',
    name: 'Groq Llama 3.3 + Tariff RAG',
    subtitle: 'Ultra-low-latency Llama-3.3-70B customs disambiguation over grounded WCO candidates.',
    defaultModel: 'llama-3.3-70b-versatile',
  },
];

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  open,
  config,
  onSave,
  onClose,
}) => {
  const [provider, setProvider] = useState<LlmProvider>(config.provider);
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [model, setModel] = useState(config.model || '');

  if (!open) return null;

  const selectedProviderMeta = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      apiKey: provider === 'builtin' ? undefined : apiKey.trim(),
      model: model.trim() || selectedProviderMeta.defaultModel,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Classification Engine Settings</h2>
              <p className="text-xs text-slate-500">Choose between instant built-in NLP or external LLM RAG</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-6">
          <div className="space-y-2.5">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    setModel(p.defaultModel);
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{p.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {provider !== 'builtin' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                  <span>{provider.toUpperCase()} API Key</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your API key here..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Model Name</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={selectedProviderMeta.defaultModel}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  Keys stay strictly in your browser&apos;s local storage and are never written to server disk. If the external API is unreachable, DutyLens automatically falls back to the Built-in Hybrid Engine.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              Save Engine Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
