import { TariffEntry } from '../../shared/types.js';
import { AnalyzedQuery, simpleStem, tokenizeForSearch } from './nlp-analyzer.js';

interface DocPosting {
  docIdx: number;
  weight: number;
}

export interface ScoredTariffCandidate {
  entry: TariffEntry;
  score: number;
  matchedTerms: string[];
  griRule: string;
}

function editDistance1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits <= 1;
}

export class TariffBm25Index {
  private readonly entries: TariffEntry[];
  private readonly inverted = new Map<string, DocPosting[]>();
  private readonly bigramIndex = new Map<string, number[]>();
  private readonly docLengths: number[] = [];
  private readonly avgDocLen: number;
  private readonly vocabByFirstChar = new Map<string, string[]>();
  private readonly isPartsEntry: boolean[] = [];

  constructor(entries: TariffEntry[]) {
    this.entries = entries;
    let totalLen = 0;

    for (let idx = 0; idx < entries.length; idx++) {
      const e = entries[idx];
      const termWeights = new Map<string, number>();

      const addField = (text: string, fieldWeight: number) => {
        const toks = tokenizeForSearch(text).map(simpleStem);
        for (const t of toks) {
          termWeights.set(t, (termWeights.get(t) ?? 0) + fieldWeight);
        }
        for (let k = 0; k < toks.length - 1; k++) {
          const bg = `${toks[k]}_${toks[k + 1]}`;
          const list = this.bigramIndex.get(bg);
          if (!list) {
            this.bigramIndex.set(bg, [idx]);
          } else if (list[list.length - 1] !== idx) {
            list.push(idx);
          }
        }
      };

      addField(e.commercialName, 3.8);
      addField(e.keywords.join(' '), 4.2);
      addField(e.description, 2.3);
      addField(e.headingTitle, 1.4);
      addField(e.chapterTitle, 0.6);
      addField(`${e.hs6} ${e.hs8}`, 5.0);

      let docWeightSum = 0;
      for (const [term, w] of termWeights.entries()) {
        docWeightSum += w;
        const postings = this.inverted.get(term);
        if (postings) {
          postings.push({ docIdx: idx, weight: w });
        } else {
          this.inverted.set(term, [{ docIdx: idx, weight: w }]);
        }
      }

      this.docLengths.push(docWeightSum);
      totalLen += docWeightSum;

      const lowerDesc = `${e.commercialName} ${e.description}`.toLowerCase();
      const partsOnly =
        (/\bparts\b/.test(lowerDesc) || /\bparts and accessories\b/.test(lowerDesc)) &&
        !/\bwhether or not\b/.test(lowerDesc) &&
        !lowerDesc.startsWith('seats;') &&
        !e.curated;
      this.isPartsEntry.push(partsOnly);
    }

    this.avgDocLen = entries.length > 0 ? totalLen / entries.length : 1;

    for (const term of this.inverted.keys()) {
      if (term.length >= 4) {
        const ch = term[0];
        const bucket = this.vocabByFirstChar.get(ch) ?? [];
        bucket.push(term);
        this.vocabByFirstChar.set(ch, bucket);
      }
    }
  }

  private resolveFuzzyTerm(stem: string): string | null {
    if (stem.length < 5) return null;
    const bucket = this.vocabByFirstChar.get(stem[0]);
    if (!bucket) return null;
    for (const candidate of bucket) {
      if (editDistance1(stem, candidate)) {
        return candidate;
      }
    }
    return null;
  }

  public search(analyzed: AnalyzedQuery, topK = 18): ScoredTariffCandidate[] {
    const N = this.entries.length;
    const scores = new Float64Array(N);
    const matchedTermsMap = new Map<number, Set<string>>();

    // 1. Direct HS code prefix match if user typed digits like "8471.30" or "85171300"
    const rawDigits = analyzed.rawQuery.replace(/\D/g, '');
    if (rawDigits.length >= 4 && rawDigits.length <= 8) {
      for (let i = 0; i < N; i++) {
        const e = this.entries[i];
        if (e.hs8 === rawDigits || e.hs6 === rawDigits) {
          scores[i] += 80;
          matchedTermsMap.set(i, new Set([e.formattedHs8]));
        } else if (e.hs8.startsWith(rawDigits)) {
          scores[i] += 45;
          matchedTermsMap.set(i, new Set([rawDigits]));
        }
      }
    }

    // 2. BM25 scoring across stemmed tokens (with typo-tolerant fuzzy fallback)
    const k1 = 1.5;
    const b = 0.65;

    for (const stem of analyzed.stemmedTokens) {
      let postings = this.inverted.get(stem);
      let usedTerm = stem;
      let fuzzyDiscount = 1.0;

      if (!postings) {
        const fuzzy = this.resolveFuzzyTerm(stem);
        if (fuzzy) {
          postings = this.inverted.get(fuzzy);
          usedTerm = fuzzy;
          fuzzyDiscount = 0.78;
        }
      }

      if (!postings) continue;

      const df = postings.length;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

      for (let p = 0; p < postings.length; p++) {
        const { docIdx, weight } = postings[p];
        const dl = this.docLengths[docIdx];
        const tfNorm = (weight * (k1 + 1)) / (weight + k1 * (1 - b + b * (dl / this.avgDocLen)));
        scores[docIdx] += idf * tfNorm * fuzzyDiscount;

        let mSet = matchedTermsMap.get(docIdx);
        if (!mSet) {
          mSet = new Set<string>();
          matchedTermsMap.set(docIdx, mSet);
        }
        mSet.add(usedTerm);
      }
    }

    // 3. Bigram phrase match boost
    for (const bg of analyzed.bigrams) {
      const docs = this.bigramIndex.get(bg);
      if (!docs) continue;
      const bgBoost = docs.length < 30 ? 7.5 : 4.0;
      for (const docIdx of docs) {
        scores[docIdx] += bgBoost;
      }
    }

    // 4. Domain GRI Reranking Rules
    for (let i = 0; i < N; i++) {
      if (scores[i] <= 0) continue;
      const e = this.entries[i];

      // Curated Bangladesh BCT entries have verified commercial product mappings
      if (e.curated) {
        scores[i] *= 1.16;
      }

      // Parts vs complete machine disambiguation (GRI 1 / Section XVI Note 2)
      if (!analyzed.wantsPartsOnly && this.isPartsEntry[i]) {
        scores[i] *= 0.62;
      } else if (analyzed.wantsPartsOnly && (this.isPartsEntry[i] || /\bparts\b/i.test(e.description))) {
        scores[i] *= 1.38;
      }

      // Residual "n.e.c." / "other" subheadings slightly lower than specific headings unless curated
      if (!e.curated && /\bn\.e\.c\b|\bother than\b/i.test(e.description)) {
        scores[i] *= 0.93;
      }

      // Knitted (Ch. 61) vs Woven (Ch. 62) apparel disambiguation
      if (analyzed.isKnitted && e.chapter === '61') scores[i] *= 1.28;
      if (analyzed.isKnitted && e.chapter === '62') scores[i] *= 0.78;
      if (analyzed.isWoven && e.chapter === '62') scores[i] *= 1.28;
      if (analyzed.isWoven && e.chapter === '61') scores[i] *= 0.78;

      // Bulk (>2.5kg) vs Retail Pack disambiguation (e.g. Milk powder 0402.21.90 vs 0402.21.10)
      if (analyzed.isBulkPack && /bulk|exceeding 2\.5|primary form|25 kg/i.test(`${e.commercialName} ${e.description}`)) {
        scores[i] *= 1.25;
      }
      if (analyzed.isRetailPack && /retail|up to 2\.5|dosage/i.test(`${e.commercialName} ${e.description}`)) {
        scores[i] *= 1.22;
      }

      // Motor Vehicle CC & Powertrain disambiguation (Heading 8703)
      if (e.heading === '8703') {
        if (analyzed.isElectricVehicle && e.hs6 === '870380') scores[i] *= 1.55;
        if (analyzed.isHybridVehicle && (e.hs6 === '870340' || e.hs6 === '870350' || e.hs6 === '870360')) {
          scores[i] *= 1.55;
        }
        if (!analyzed.isHybridVehicle && !analyzed.isElectricVehicle && analyzed.engineCc !== null) {
          const cc = analyzed.engineCc;
          if (cc <= 1000 && e.hs6 === '870321') scores[i] *= 1.45;
          else if (cc > 1000 && cc <= 1500 && e.hs6 === '870322') scores[i] *= 1.45;
          else if (cc > 1500 && cc <= 3000 && e.hs6 === '870323') scores[i] *= 1.45;
          else if (cc > 3000 && e.hs6 === '870324') scores[i] *= 1.45;
        }
      }
    }

    // Collect top K results
    const rankedIndices: number[] = [];
    for (let i = 0; i < N; i++) {
      if (scores[i] > 0.5) rankedIndices.push(i);
    }
    rankedIndices.sort((a, b) => scores[b] - scores[a]);

    return rankedIndices.slice(0, topK).map((idx) => {
      const e = this.entries[idx];
      const matched = Array.from(matchedTermsMap.get(idx) ?? []);
      const griRule = analyzed.wantsPartsOnly
        ? 'GRI 1 & Section Note 2 (Parts & Accessories Classification)'
        : e.curated
        ? 'GRI 1 & GRI 6 (Specific Heading Terms & 8-Digit Bangladesh Subheading)'
        : 'GRI 1, GRI 3(a) & GRI 6 (Most Specific WCO Subheading Description)';

      return {
        entry: e,
        score: scores[idx],
        matchedTerms: matched,
        griRule,
      };
    });
  }
}
