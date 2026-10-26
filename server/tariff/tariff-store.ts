import fs from 'node:fs';
import path from 'node:path';
import { computeNbrTtiPercent } from '../../shared/tax-math';
import { SectionSummary, TariffEntry } from '../../shared/types';
import { CHAPTER_PROFILES, HEADING_PROFILES } from './nbr-chapter-profiles';
import { CURATED_BCT_ENTRIES, CuratedBctSpec } from './nbr-curated-bct';

/**
 * Lightweight, zero-dependency RFC-4180 CSV parser handling quoted fields and escaped quotes.
 */
function parseCsv(raw: string): Record<string, string>[] {
  const text = raw.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        rows.push(row);
      }
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const records: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (values[c] ?? '').trim();
    }
    records.push(obj);
  }
  return records;
}

export function formatHs6(hs6: string): string {
  const clean = hs6.replace(/\D/g, '');
  if (clean.length < 6) return clean;
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}`;
}

export function formatHs8(hs8: string): string {
  const clean = hs8.replace(/\D/g, '');
  if (clean.length < 8) return formatHs6(clean);
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}`;
}

function cleanWcoDescription(desc: string): string {
  return desc.replace(/\s+/g, ' ').trim();
}

function deriveFriendlyCommercialName(wcoDesc: string, headingDesc: string): string {
  // Turn WCO inverted phrasing e.g. "Fruit, edible; apples, fresh" into clean readable title if not curated
  const cleaned = cleanWcoDescription(wcoDesc);
  if (cleaned.length <= 95 && !cleaned.includes(';')) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  const parts = cleaned.split(';').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2 && parts[1].length > 4 && parts[1].length < 75 && !parts[1].startsWith('n.e.c')) {
    const combined = `${parts[0]} — ${parts[1]}`;
    return combined.charAt(0).toUpperCase() + combined.slice(1);
  }
  const truncated = cleaned.length > 105 ? `${cleaned.slice(0, 102)}...` : cleaned;
  return truncated.charAt(0).toUpperCase() + truncated.slice(1);
}

export class TariffStore {
  public readonly entries: TariffEntry[] = [];
  public readonly byHs8 = new Map<string, TariffEntry>();
  public readonly byHs6 = new Map<string, TariffEntry[]>();
  public readonly sections: SectionSummary[] = [];
  public readonly chapters = new Map<string, { chapter: string; section: string; title: string }>();
  public readonly headings = new Map<string, { heading: string; chapter: string; title: string }>();

  constructor(dataDir = path.resolve(process.cwd(), 'data')) {
    const sectionsRaw = fs.readFileSync(path.join(dataDir, 'wco-sections.csv'), 'utf8');
    const hsRaw = fs.readFileSync(path.join(dataDir, 'wco-hs2022.csv'), 'utf8');

    const sectionRows = parseCsv(sectionsRaw);
    const hsRows = parseCsv(hsRaw);

    const sectionNames = new Map<string, string>();
    for (const s of sectionRows) {
      const code = s.section.trim();
      const name = s.name.trim();
      sectionNames.set(code, name.charAt(0).toUpperCase() + name.slice(1));
    }

    for (const r of hsRows) {
      if (r.level === '2') {
        this.chapters.set(r.hscode, {
          chapter: r.hscode,
          section: r.section,
          title: cleanWcoDescription(r.description),
        });
      } else if (r.level === '4') {
        this.headings.set(r.hscode, {
          heading: r.hscode,
          chapter: r.parent,
          title: cleanWcoDescription(r.description),
        });
      }
    }

    // Group curated 8-digit entries by 6-digit parent
    const curatedByHs6 = new Map<string, CuratedBctSpec[]>();
    for (const cur of CURATED_BCT_ENTRIES) {
      const list = curatedByHs6.get(cur.hs6) ?? [];
      list.push(cur);
      curatedByHs6.set(cur.hs6, list);
    }

    const sub6Rows = hsRows.filter((r) => r.level === '6');

    for (const r of sub6Rows) {
      const hs6 = r.hscode;
      const chapterCode = hs6.slice(0, 2);
      const headingCode = hs6.slice(0, 4);

      const chapterInfo = this.chapters.get(chapterCode);
      const headingInfo = this.headings.get(headingCode);
      const sectionCode = r.section || chapterInfo?.section || 'XX';
      const sectionTitle = sectionNames.get(sectionCode) || 'Miscellaneous Commodities';
      const chapterTitle = chapterInfo?.title || `Chapter ${chapterCode}`;
      const headingTitle = headingInfo?.title || `Heading ${headingCode}`;
      const wcoDesc = cleanWcoDescription(r.description);

      const chProfile = CHAPTER_PROFILES[chapterCode] || {
        rates: { cd: 25, rd: 3, sd: 0, vat: 15, ait: 5, at: 5 },
        unit: 'u',
      };
      const hdProfile = HEADING_PROFILES[headingCode] || {};

      const baseRates = hdProfile.rates || chProfile.rates;
      const baseUnit = hdProfile.unit || chProfile.unit || 'u';
      const baseIpo = hdProfile.ipoStatus || chProfile.ipoStatus || 'Freely Importable';
      const baseCapMach =
        typeof hdProfile.sroEligibleCapitalMachinery === 'boolean'
          ? hdProfile.sroEligibleCapitalMachinery
          : Boolean(chProfile.sroEligibleCapitalMachinery);
      const baseSroNotes = [...(hdProfile.sroNotes || []), ...(chProfile.sroNotes || [])];
      const baseCompliance = hdProfile.compliance || chProfile.compliance || [];
      const baseKeywords = [...(hdProfile.keywords || []), ...(chProfile.keywords || [])];

      const curatedList = curatedByHs6.get(hs6);

      if (curatedList && curatedList.length > 0) {
        for (const cur of curatedList) {
          const rates = cur.rates;
          const entry: TariffEntry = {
            hs6,
            hs8: cur.hs8,
            formattedHs6: formatHs6(hs6),
            formattedHs8: formatHs8(cur.hs8),
            section: sectionCode,
            sectionTitle,
            chapter: chapterCode,
            chapterTitle,
            heading: headingCode,
            headingTitle,
            description: cur.descriptionOverride || wcoDesc,
            commercialName: cur.commercialName,
            unit: cur.unit || baseUnit,
            rates,
            tti: computeNbrTtiPercent(rates),
            sroEligibleCapitalMachinery:
              typeof cur.sroEligibleCapitalMachinery === 'boolean'
                ? cur.sroEligibleCapitalMachinery
                : baseCapMach,
            sroNotes: cur.sroNotes && cur.sroNotes.length > 0 ? cur.sroNotes : baseSroNotes,
            ipoStatus: cur.ipoStatus || baseIpo,
            compliance: cur.compliance && cur.compliance.length > 0 ? cur.compliance : baseCompliance,
            keywords: Array.from(new Set([...cur.keywords, ...baseKeywords])),
            curated: true,
          };
          this.registerEntry(entry);
        }
      } else {
        const hs8 = `${hs6}00`;
        const entry: TariffEntry = {
          hs6,
          hs8,
          formattedHs6: formatHs6(hs6),
          formattedHs8: formatHs8(hs8),
          section: sectionCode,
          sectionTitle,
          chapter: chapterCode,
          chapterTitle,
          heading: headingCode,
          headingTitle,
          description: wcoDesc,
          commercialName: deriveFriendlyCommercialName(wcoDesc, headingTitle),
          unit: baseUnit,
          rates: baseRates,
          tti: computeNbrTtiPercent(baseRates),
          sroEligibleCapitalMachinery: baseCapMach,
          sroNotes: baseSroNotes,
          ipoStatus: baseIpo,
          compliance: baseCompliance,
          keywords: baseKeywords,
          curated: false,
        };
        this.registerEntry(entry);
      }
    }

    this.buildSectionSummaries(sectionNames);
  }

  private registerEntry(entry: TariffEntry) {
    this.entries.push(entry);
    this.byHs8.set(entry.hs8, entry);
    const list = this.byHs6.get(entry.hs6) ?? [];
    list.push(entry);
    this.byHs6.set(entry.hs6, list);
  }

  private buildSectionSummaries(sectionNames: Map<string, string>) {
    const sectionChapters = new Map<string, { chapter: string; title: string; subheadingCount: number }[]>();

    for (const [chCode, chInfo] of this.chapters.entries()) {
      const count = this.entries.filter((e) => e.chapter === chCode).length;
      const list = sectionChapters.get(chInfo.section) ?? [];
      list.push({
        chapter: chCode,
        title: chInfo.title,
        subheadingCount: count,
      });
      sectionChapters.set(chInfo.section, list);
    }

    for (const [secCode, secTitle] of sectionNames.entries()) {
      const chs = (sectionChapters.get(secCode) ?? []).sort((a, b) => a.chapter.localeCompare(b.chapter));
      if (chs.length === 0) continue;
      const range =
        chs.length === 1 ? `Ch. ${chs[0].chapter}` : `Ch. ${chs[0].chapter}–${chs[chs.length - 1].chapter}`;
      const totalSub = chs.reduce((acc, c) => acc + c.subheadingCount, 0);
      this.sections.push({
        section: secCode,
        title: secTitle,
        chapterRange: range,
        chapterCount: chs.length,
        subheadingCount: totalSub,
        chapters: chs,
      });
    }
  }

  public findByCode(rawCode: string): TariffEntry | undefined {
    const digits = rawCode.replace(/\D/g, '');
    if (digits.length === 8) {
      return this.byHs8.get(digits) || this.byHs6.get(digits.slice(0, 6))?.[0];
    }
    if (digits.length === 6) {
      return this.byHs6.get(digits)?.[0];
    }
    if (digits.length >= 2) {
      return this.entries.find((e) => e.hs8.startsWith(digits));
    }
    return undefined;
  }

  public filterEntries(params: {
    query?: string;
    section?: string;
    chapter?: string;
    curatedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): { total: number; items: TariffEntry[] } {
    const q = (params.query || '').trim().toLowerCase();
    const digits = q.replace(/\D/g, '');

    let filtered = this.entries;

    if (params.section) {
      filtered = filtered.filter((e) => e.section === params.section);
    }
    if (params.chapter) {
      filtered = filtered.filter((e) => e.chapter === params.chapter);
    }
    if (params.curatedOnly) {
      filtered = filtered.filter((e) => e.curated);
    }
    if (q) {
      filtered = filtered.filter((e) => {
        if (digits.length >= 2 && (e.hs8.startsWith(digits) || e.formattedHs8.includes(q))) {
          return true;
        }
        return (
          e.commercialName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.headingTitle.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
        );
      });
    }

    const total = filtered.length;
    const offset = Math.max(0, params.offset || 0);
    const limit = Math.min(100, Math.max(1, params.limit || 40));

    return {
      total,
      items: filtered.slice(offset, offset + limit),
    };
  }
}

let singletonStore: TariffStore | null = null;

export function getTariffStore(): TariffStore {
  if (!singletonStore) {
    singletonStore = new TariffStore();
  }
  return singletonStore;
}
