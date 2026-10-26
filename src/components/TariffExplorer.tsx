import React, { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Filter, Search } from 'lucide-react';
import { SectionSummary, TariffEntry } from '@shared/types';
import { fetchTariffSections, searchTariffEntries } from '@/lib/api';
import { formatPct } from '@/lib/format';

interface TariffExplorerProps {
  onOpenInCalculator: (entry: TariffEntry) => void;
}

export const TariffExplorer: React.FC<TariffExplorerProps> = ({ onOpenInCalculator }) => {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [curatedOnly, setCuratedOnly] = useState<boolean>(false);
  const [entries, setEntries] = useState<TariffEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTariffSections()
      .then(setSections)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      searchTariffEntries({
        q: searchQuery || undefined,
        section: selectedSection || undefined,
        chapter: selectedChapter || undefined,
        curatedOnly,
        limit: 50,
      })
        .then((res) => {
          if (!active) return;
          setEntries(res.items);
          setTotal(res.total);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedSection, selectedChapter, curatedOnly]);

  const activeSectionObj = sections.find((s) => s.section === selectedSection);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Sidebar: 21 WCO Sections & 97 Chapters */}
      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-800 uppercase">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <span>WCO Sections (I–XXI)</span>
            </h2>
            {(selectedSection || selectedChapter) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSection('');
                  setSelectedChapter('');
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-[540px] space-y-1 overflow-y-auto pr-1">
            {sections.map((sec) => {
              const isSelected = selectedSection === sec.section;
              return (
                <div key={sec.section}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection(isSelected ? '' : sec.section);
                      setSelectedChapter('');
                    }}
                    className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? 'bg-emerald-50 font-semibold text-emerald-950 ring-1 ring-emerald-500/30'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] font-bold text-emerald-700">
                        Sec {sec.section}
                      </span>{' '}
                      <span className="text-[11px] text-slate-400">({sec.chapterRange})</span>
                      <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug">{sec.title}</div>
                    </div>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                      {sec.subheadingCount}
                    </span>
                  </button>

                  {isSelected && activeSectionObj && (
                    <div className="mt-1 mb-2 ml-3 space-y-1 border-l-2 border-emerald-200 pl-2.5">
                      {activeSectionObj.chapters.map((ch) => (
                        <button
                          key={ch.chapter}
                          type="button"
                          onClick={() =>
                            setSelectedChapter(selectedChapter === ch.chapter ? '' : ch.chapter)
                          }
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[11px] transition ${
                            selectedChapter === ch.chapter
                              ? 'bg-emerald-600 font-semibold text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">
                            <span className="font-mono font-bold">Ch.{ch.chapter}</span> — {ch.title}
                          </span>
                          <span className="font-mono text-[10px] opacity-75">{ch.subheadingCount}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Main Tariff Schedule Table */}
      <section className="space-y-4 lg:col-span-8 xl:col-span-9">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by HS code (e.g. 8471, 8703.40) or keyword (solar, cotton, laptop, milk)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none sm:text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setCuratedOnly((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                curatedOnly
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Top BD Commercial Splits</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{entries.length}</strong> of{' '}
              <strong className="text-slate-800">{total.toLocaleString()}</strong> matching HS2022 / NBR tariff codes
            </span>
            {loading && <span className="font-medium text-emerald-600">Updating...</span>}
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-3.5 py-2.5">8-Digit HS</th>
                  <th className="px-3.5 py-2.5">Commodity &amp; WCO Description</th>
                  <th className="hidden px-3 py-2.5 text-right md:table-cell">CD / SD / VAT</th>
                  <th className="px-3.5 py-2.5 text-right">NBR TTI</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.hs8} className="hover:bg-slate-50/80">
                    <td className="px-3.5 py-3 align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-slate-900">
                        {entry.formattedHs8}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        Ch.{entry.chapter} · {entry.unit}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                        <span>{entry.commercialName}</span>
                        {entry.curated && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Verified BCT
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                        {entry.description}
                      </p>
                    </td>
                    <td className="hidden px-3.5 py-3 text-right align-top font-mono text-[11px] text-slate-600 whitespace-nowrap md:table-cell">
                      {entry.rates.cd}% / {entry.rates.sd}% / {entry.rates.vat}%
                    </td>
                    <td className="px-3.5 py-3 text-right align-top font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatPct(entry.tti)}
                    </td>
                    <td className="px-3.5 py-3 text-right align-top whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenInCalculator(entry)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-600"
                      >
                        <span>Calculate</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && entries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      No tariff codes matched your filter. Try clearing chapter filters or broadening your search term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
