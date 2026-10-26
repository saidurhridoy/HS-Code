import {
  ExtractedSourceMetadata,
  LlmConfig,
  PreferentialOrigin,
  SupportedCurrency,
} from '../../shared/types.js';

interface MarketplaceProfile {
  name: string;
  country?: string;
  origin?: PreferentialOrigin;
  defaultCurrency?: SupportedCurrency;
}

const MARKETPLACE_PROFILES: { pattern: RegExp; profile: MarketplaceProfile }[] = [
  { pattern: /(^|\.)alibaba\.com$/i, profile: { name: 'Alibaba.com', country: 'China', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)1688\.com$/i, profile: { name: '1688 China Wholesale', country: 'China', origin: 'apta', defaultCurrency: 'CNY' } },
  { pattern: /(^|\.)made-in-china\.com$/i, profile: { name: 'Made-in-China', country: 'China', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)aliexpress\./i, profile: { name: 'AliExpress', country: 'China', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)dhgate\.com$/i, profile: { name: 'DHgate', country: 'China', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)globalsources\.com$/i, profile: { name: 'Global Sources', country: 'China', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)(jd|taobao|tmall)\.com$/i, profile: { name: 'China E-Commerce', country: 'China', origin: 'apta', defaultCurrency: 'CNY' } },
  { pattern: /(^|\.)indiamart\.com$/i, profile: { name: 'IndiaMART', country: 'India', origin: 'safta', defaultCurrency: 'INR' } },
  { pattern: /(^|\.)tradeindia\.com$/i, profile: { name: 'TradeIndia', country: 'India', origin: 'safta', defaultCurrency: 'INR' } },
  { pattern: /(^|\.)flipkart\.com$/i, profile: { name: 'Flipkart India', country: 'India', origin: 'safta', defaultCurrency: 'INR' } },
  { pattern: /(^|\.)amazon\.in$/i, profile: { name: 'Amazon India', country: 'India', origin: 'safta', defaultCurrency: 'INR' } },
  { pattern: /(^|\.)(gmarket\.co\.kr|coupang\.com|ec21\.com)$/i, profile: { name: 'Korea Trade Portal', country: 'South Korea', origin: 'apta', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)(daraz\.com\.bd|startech\.com\.bd|ryans\.com|pickaboo\.com|othoba\.com)$/i, profile: { name: 'Bangladesh Retail Portal', defaultCurrency: 'BDT' } },
  { pattern: /(^|\.)amazon\.co\.uk$/i, profile: { name: 'Amazon UK', country: 'United Kingdom', defaultCurrency: 'GBP' } },
  { pattern: /(^|\.)amazon\.(de|fr|it|es|nl)$/i, profile: { name: 'Amazon EU', country: 'European Union', defaultCurrency: 'EUR' } },
  { pattern: /(^|\.)amazon\.com$/i, profile: { name: 'Amazon', country: 'USA / Global', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)(ebay\.com|walmart\.com|bestbuy\.com|newegg\.com)$/i, profile: { name: 'Global Retail Marketplace', country: 'USA / Global', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)apple\.com$/i, profile: { name: 'Apple Official', country: 'USA / China OEM', defaultCurrency: 'USD' } },
  { pattern: /(^|\.)samsung\.com$/i, profile: { name: 'Samsung Official', country: 'South Korea / Vietnam', defaultCurrency: 'USD' } },
];

const BLOCKED_BOT_TITLES =
  /robot check|just a moment|attention required|access denied|security verification|captcha|cloudflare|sign in|log in|403 forbidden|404 not found|page not found|enable javascript|pardon our interruption|verify you are human/i;

const GENERIC_URL_SEGMENTS = new Set([
  'dp', 'gp', 'product', 'products', 'product-detail', 'proddetail', 'item', 'items',
  'detail', 'details', 'shop', 'store', 'buy', 'catalog', 'category', 'categories',
  'en', 'bn', 'us', 'bd', 'in', 'cn', 'uk', 'global', 'www', 'p', 'ip', 'itm', 's',
  'search', 'wholesale', 'price', 'showroom', 'offer', 'offers', 'listing',
]);

function isPrivateOrBlockedHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === '[::1]' || h === '::1' || h === '0.0.0.0') return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) {
    return true;
  }
  const m172 = h.match(/^172\.(\d+)\./);
  if (m172) {
    const second = Number(m172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) && n > 31 && n < 127 ? String.fromCharCode(n) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCurrency(raw?: string): SupportedCurrency | undefined {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase();
  if (upper === 'USD' || upper === '$') return 'USD';
  if (upper === 'EUR' || upper === '€') return 'EUR';
  if (upper === 'GBP' || upper === '£') return 'GBP';
  if (upper === 'CNY' || upper === 'RMB' || upper === '¥') return 'CNY';
  if (upper === 'INR' || upper === 'RS' || upper === '₹') return 'INR';
  if (upper === 'BDT' || upper === 'TK' || upper === '৳') return 'BDT';
  return undefined;
}

export function extractSlugIntelligenceFromUrl(parsed: URL): {
  slugTitle: string;
  specs: string[];
} {
  const parts: string[] = [];

  // Check common search/product query parameters first
  for (const key of ['keywords', 'keyword', 'q', 'k', 'SearchText', 'title', 'name', 'product', 'model']) {
    const val = parsed.searchParams.get(key);
    if (val && val.trim().length > 2) {
      parts.push(val.replace(/[+_-]+/g, ' ').trim());
    }
  }

  const rawSegments = parsed.pathname
    .split('/')
    .map((s) => decodeURIComponent(s).trim())
    .filter(Boolean);

  for (const seg of rawSegments) {
    // Strip common extensions and trailing marketplace IDs (_1600928374.html, -i3291829.html, -284920192.html)
    let cleaned = seg
      .replace(/\.(html?|php|aspx?|jsp)$/i, '')
      .replace(/[_-]i?\d{6,}$/i, '')
      .replace(/^\d{6,}[_-]/, '');

    if (!cleaned || GENERIC_URL_SEGMENTS.has(cleaned.toLowerCase())) continue;
    // Skip pure ASINs (e.g. B0CX23V2ZK), UUIDs, or pure numbers
    if (/^B0[A-Z0-9]{8}$/i.test(cleaned)) continue;
    if (/^[0-9a-f]{16,}$/i.test(cleaned)) continue;
    if (/^\d+$/.test(cleaned)) continue;

    const words = cleaned
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (words.length >= 3 && /[a-zA-Z\u0980-\u09FF]{2,}/.test(words)) {
      parts.push(words);
    }
  }

  const slugTitle = parts.join(' — ').slice(0, 260).trim();
  const specs: string[] = [];
  const specMatches = slugTitle.match(
    /\b\d+(\.\d+)?\s*(w|kw|mw|v|kv|mah|ah|gb|tb|inch|mm|cm|kg|g|ml|l|cc|hp|gsm|rpm|ton|btu)\b/gi
  );
  if (specMatches) {
    specs.push(...Array.from(new Set(specMatches.map((m) => m.trim()))).slice(0, 6));
  }

  return { slugTitle, specs };
}

interface ScrapedWebMetadata {
  title?: string;
  description?: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: SupportedCurrency;
  specs: string[];
  originCountry?: string;
}

function parseHtmlProductMetadata(html: string): ScrapedWebMetadata {
  const result: ScrapedWebMetadata = { specs: [] };

  const getMeta = (attrPattern: string): string | undefined => {
    const r1 = new RegExp(`<meta[^>]+${attrPattern}[^>]+content=["']([^"']+)["']`, 'i');
    const m1 = html.match(r1);
    if (m1?.[1]) return decodeHtmlEntities(m1[1]);
    const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attrPattern}`, 'i');
    const m2 = html.match(r2);
    if (m2?.[1]) return decodeHtmlEntities(m2[1]);
    return undefined;
  };

  // 1. Parse JSON-LD Schema.org Product blocks
  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = ldRegex.exec(html)) !== null) {
    try {
      const rawJson = ldMatch[1].trim();
      if (!rawJson) continue;
      const parsed = JSON.parse(rawJson);
      const queue: any[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);

        const nodeType = Array.isArray(node['@type']) ? node['@type'].join(' ') : String(node['@type'] || '');
        if (/product/i.test(nodeType)) {
          if (typeof node.name === 'string' && !BLOCKED_BOT_TITLES.test(node.name)) {
            result.title = result.title || decodeHtmlEntities(node.name);
          }
          if (typeof node.description === 'string') {
            result.description = result.description || decodeHtmlEntities(node.description).slice(0, 360);
          }
          if (node.brand) {
            const b = typeof node.brand === 'string' ? node.brand : node.brand?.name;
            if (typeof b === 'string') result.brand = result.brand || decodeHtmlEntities(b);
          }
          if (typeof node.category === 'string') {
            result.category = result.category || decodeHtmlEntities(node.category);
          }
          if (typeof node.material === 'string') {
            result.specs.push(`Material: ${decodeHtmlEntities(node.material)}`);
          }
          if (node.countryOfOrigin) {
            const c =
              typeof node.countryOfOrigin === 'string'
                ? node.countryOfOrigin
                : node.countryOfOrigin?.name;
            if (typeof c === 'string') result.originCountry = c;
          }
          const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
          if (offers && typeof offers === 'object') {
            const p = Number(offers.price ?? offers.lowPrice ?? offers.highPrice);
            if (Number.isFinite(p) && p > 0) result.price = result.price ?? p;
            const cur = normalizeCurrency(offers.priceCurrency);
            if (cur) result.currency = result.currency ?? cur;
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // 2. OpenGraph / Meta tags
  const ogTitle =
    getMeta('property=["\']og:title["\']') ||
    getMeta('name=["\']twitter:title["\']');
  const docTitleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const docTitle = docTitleMatch?.[1] ? decodeHtmlEntities(docTitleMatch[1]) : undefined;
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1Text = h1Match?.[1]
    ? decodeHtmlEntities(h1Match[1].replace(/<[^>]+>/g, ' '))
    : undefined;

  for (const candidateTitle of [result.title, ogTitle, h1Text, docTitle]) {
    if (candidateTitle && candidateTitle.length > 3 && !BLOCKED_BOT_TITLES.test(candidateTitle)) {
      result.title = candidateTitle
        .replace(/\s*[|\-–—]\s*(Amazon|Alibaba|AliExpress|Daraz|Flipkart|IndiaMART|Made-in-China|eBay|Walmart).*$/i, '')
        .trim();
      break;
    }
  }

  const metaDesc =
    getMeta('property=["\']og:description["\']') ||
    getMeta('name=["\']description["\']');
  if (!result.description && metaDesc && !BLOCKED_BOT_TITLES.test(metaDesc)) {
    result.description = metaDesc.slice(0, 360);
  }

  const ogPrice = getMeta('property=["\'](?:product|og):price:amount["\']');
  if (result.price === undefined && ogPrice) {
    const p = Number(ogPrice.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(p) && p > 0) result.price = p;
  }
  const ogCur = getMeta('property=["\'](?:product|og):price:currency["\']');
  if (!result.currency && ogCur) {
    result.currency = normalizeCurrency(ogCur);
  }

  // Extract up to 5 clean specification table rows (<th>Key</th><td>Val</td>)
  const trRegex = /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]{2,80}?)<\/t[hd]>\s*<td[^>]*>([\s\S]{1,120}?)<\/td>\s*<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null && result.specs.length < 6) {
    const k = decodeHtmlEntities(trMatch[1].replace(/<[^>]+>/g, ' '));
    const v = decodeHtmlEntities(trMatch[2].replace(/<[^>]+>/g, ' '));
    if (
      k &&
      v &&
      k.length <= 36 &&
      v.length <= 65 &&
      /material|composition|power|voltage|capacity|engine|weight|pack|model|usage|application|type|fabric|gsm|hs\s*code/i.test(k)
    ) {
      result.specs.push(`${k}: ${v}`);
    }
  }

  return result;
}

export async function analyzeProductUrl(
  rawUrl: string,
  userHint?: string
): Promise<ExtractedSourceMetadata> {
  let parsed: URL;
  try {
    const withProto = /^https?:\/\//i.test(rawUrl.trim())
      ? rawUrl.trim()
      : `https://${rawUrl.trim()}`;
    parsed = new URL(withProto);
  } catch {
    throw new Error('Please enter a valid product URL (e.g. https://www.alibaba.com/... or https://www.amazon.com/...).');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS product links are supported.');
  }
  if (isPrivateOrBlockedHost(parsed.hostname)) {
    throw new Error('Private or local network URLs are not allowed.');
  }

  const matchedMarketplace = MARKETPLACE_PROFILES.find((m) =>
    m.pattern.test(parsed.hostname)
  )?.profile;
  const marketplaceName =
    matchedMarketplace?.name || parsed.hostname.replace(/^www\./i, '');

  const { slugTitle, specs: slugSpecs } = extractSlugIntelligenceFromUrl(parsed);

  let scraped: ScrapedWebMetadata | null = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (/text\/html|application\/xhtml/i.test(contentType)) {
        const rawText = await res.text();
        scraped = parseHtmlProductMetadata(rawText.slice(0, 350_000));
      }
    }
  } catch {
    // Gracefully fall back to URL slug intelligence when blocked by anti-bot firewall or offline sandbox
  } finally {
    clearTimeout(timer);
  }

  const hasLiveWebTitle = Boolean(scraped?.title && scraped.title.length >= 4);
  const extractedTitle =
    scraped?.title ||
    slugTitle ||
    userHint?.trim() ||
    `Product from ${marketplaceName}`;

  const mergedSpecs = Array.from(
    new Set([...(scraped?.specs || []), ...slugSpecs])
  ).slice(0, 6);

  const hintClean = userHint?.trim() || '';
  const descriptionParts = [
    scraped?.description || '',
    scraped?.category ? `Category: ${scraped.category}` : '',
    mergedSpecs.join(', '),
    hintClean,
  ].filter(Boolean);

  const extractedDescription =
    descriptionParts.join(' · ').slice(0, 420) ||
    `Extracted from ${marketplaceName} product link`;

  const synthesizedQuery = [
    extractedTitle,
    scraped?.category || '',
    mergedSpecs.join(' '),
    hintClean,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 480);

  const originCountry =
    scraped?.originCountry || matchedMarketplace?.country;
  let suggestedPreferentialOrigin = matchedMarketplace?.origin;
  if (!suggestedPreferentialOrigin && originCountry) {
    if (/china|korea|sri lanka|laos/i.test(originCountry)) {
      suggestedPreferentialOrigin = 'apta';
    } else if (/india|pakistan|nepal|maldives/i.test(originCountry)) {
      suggestedPreferentialOrigin = 'safta';
    } else if (/bhutan/i.test(originCountry)) {
      suggestedPreferentialOrigin = 'bhutan_pta';
    }
  }

  const needsUserHint = !hasLiveWebTitle && !slugTitle && !hintClean;

  return {
    sourceType: 'link',
    extractedTitle,
    extractedDescription,
    synthesizedQuery: needsUserHint ? 'general commercial merchandise' : synthesizedQuery,
    detectedBrand: scraped?.brand,
    detectedCategory: scraped?.category,
    detectedSpecs: mergedSpecs,
    detectedPrice: scraped?.price,
    detectedCurrency: scraped?.currency || matchedMarketplace?.defaultCurrency,
    detectedMarketplace: marketplaceName,
    suggestedOriginCountry: originCountry,
    suggestedPreferentialOrigin,
    extractionMethod: hasLiveWebTitle ? 'webpage-metadata' : 'url-slug-intelligence',
    sourceUrl: parsed.toString(),
    confidenceNote: hasLiveWebTitle
      ? `Live product metadata & specifications extracted from ${marketplaceName}.`
      : slugTitle
      ? `Extracted product keywords & origin profile from ${marketplaceName} URL structure.`
      : `Short/opaque URL detected on ${marketplaceName} — add a brief product keyword note for exact HS8 matching.`,
    needsUserHint,
  };
}

/**
 * Extracts embedded human-readable text metadata from PNG tEXt/iTXt chunks or JPEG COM/EXIF/XMP blocks.
 */
function extractEmbeddedImageMetadataStrings(buf: Buffer): string[] {
  const found: string[] = [];

  // 1. PNG tEXt / iTXt chunks
  if (buf.length > 16 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    let offset = 8;
    while (offset + 12 <= buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
      if (offset + 12 + length > buf.length) break;
      if (type === 'tEXt' || type === 'iTXt') {
        const raw = buf
          .subarray(offset + 8, offset + 8 + Math.min(length, 1024))
          .toString('utf8')
          .replace(/\0+/g, ' ')
          .trim();
        if (
          raw.length > 4 &&
          !/^(Software|XML:com\.adobe|Creation Time|Comment\s+Created with)/i.test(raw)
        ) {
          found.push(raw.replace(/^(Description|Title|Comment|Product|Keywords)\s*/i, '').trim());
        }
      }
      offset += 12 + length;
      if (type === 'IEND') break;
    }
  }

  // 2. JPEG COM (0xFFFE) and APP1 EXIF/XMP (0xFFE1) readable descriptions
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < buf.length && buf[offset] === 0xff) {
      const marker = buf[offset + 1];
      if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
      const segLen = buf.readUInt16BE(offset + 2);
      if (segLen < 2 || offset + 2 + segLen > buf.length) break;

      if (marker === 0xfe) {
        // JPEG Comment segment
        const comment = buf
          .subarray(offset + 4, offset + 2 + segLen)
          .toString('utf8')
          .replace(/[^\x20-\x7E\u0980-\u09FF]+/g, ' ')
          .trim();
        if (comment.length > 4 && !/CREATOR:\s*gd-jpeg|Intel|AppleMark/i.test(comment)) {
          found.push(comment);
        }
      } else if (marker === 0xe1) {
        const segStr = buf
          .subarray(offset + 4, offset + 2 + Math.min(segLen, 4096))
          .toString('utf8');
        const dcDesc = segStr.match(/<dc:(?:title|description)>[\s\S]*?<rdf:li[^>]*>([\s\S]{3,240}?)<\/rdf:li>/i);
        if (dcDesc?.[1]) {
          found.push(decodeHtmlEntities(dcDesc[1]));
        }
      }
      offset += 2 + segLen;
    }
  }

  return found.filter((s) => s.length >= 3).slice(0, 4);
}

function cleanImageFileNameToKeywords(fileName?: string): string {
  if (!fileName) return '';
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  if (
    !base ||
    /^(image|img|photo|pic|dsc|pxl|screenshot|screen_shot|camera|capture|camera-capture|whatsapp\s*image|untitled|download|file)[\s_-]*\d*$/i.test(
      base
    ) ||
    /^(IMG|DSC|PXL|VID|Screenshot|WhatsApp)[_-]?\d{4,}/i.test(base) ||
    /^[0-9a-f-]{12,}$/i.test(base)
  ) {
    return '';
  }
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d{6,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface VisionLlmExtraction {
  productName: string;
  commercialDescription: string;
  materials?: string[];
  technicalSpecs?: string[];
  brand?: string;
  category?: string;
  estimatedUnitPriceUsd?: number;
  suggestedOriginCountry?: string;
  detailedCustomsQuery: string;
}

async function runMultimodalVisionLlm(
  rawBase64: string,
  mimeType: string,
  userHint: string | undefined,
  llm: LlmConfig
): Promise<VisionLlmExtraction> {
  const prompt = `You are a Principal Bangladesh Customs (NBR) & WCO HS2022 Tariff Inspector examining a product photo, label, nameplate, or commercial invoice.
Identify the exact physical product, material composition, construction (e.g., knitted vs woven, bulk vs retail pack, wattage/voltage/engine cc), visible brand/model text (OCR), and probable origin if printed on the label.
${userHint ? `User Note / Hint: "${userHint}"` : ''}
Respond strictly with valid JSON matching:
{
  "productName": "Concise commercial product title",
  "commercialDescription": "1-2 sentences describing material, form, function, and any visible label text",
  "materials": ["e.g. 100% Cotton", "Stainless Steel"],
  "technicalSpecs": ["e.g. 550W", "180 GSM", "25 kg bag"],
  "brand": "Brand if visible or empty string",
  "category": "Tariff category",
  "estimatedUnitPriceUsd": 0,
  "suggestedOriginCountry": "Country if printed on label or empty string",
  "detailedCustomsQuery": "Rich customs classification search string combining product name, material, construction, and technical specs"
}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);

  try {
    if (llm.provider === 'gemini') {
      const model = llm.model || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(llm.apiKey || '')}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: rawBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      });
      if (!res.ok) throw new Error(`Gemini Vision HTTP ${res.status}`);
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return JSON.parse(text) as VisionLlmExtraction;
    }

    // OpenAI / Groq Vision / Custom OpenAI-compatible Vision
    const defaultUrl =
      llm.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : llm.baseUrl
        ? `${llm.baseUrl.replace(/\/$/, '')}/chat/completions`
        : 'https://api.openai.com/v1/chat/completions';

    const visionModel =
      llm.provider === 'groq'
        ? llm.model && /vision|scout|maverick/i.test(llm.model)
          ? llm.model
          : 'meta-llama/llama-4-scout-17b-16e-instruct'
        : llm.model || 'gpt-4o-mini';

    const dataUrl = `data:${mimeType};base64,${rawBase64}`;
    const res = await fetch(defaultUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey || ''}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: visionModel,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`${llm.provider.toUpperCase()} Vision HTTP ${res.status}`);
    const data = (await res.json()) as any;
    const content = data?.choices?.[0]?.message?.content || '';
    return JSON.parse(content) as VisionLlmExtraction;
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeProductPhoto(
  imageBase64Input: string,
  imageMimeType?: string,
  imageFileName?: string,
  userHint?: string,
  llmConfig?: LlmConfig
): Promise<ExtractedSourceMetadata> {
  if (!imageBase64Input || typeof imageBase64Input !== 'string') {
    throw new Error('Please capture or upload a valid product photo.');
  }

  let mimeType = imageMimeType || 'image/jpeg';
  let rawBase64 = imageBase64Input.trim();
  const dataUriMatch = rawBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1];
    rawBase64 = dataUriMatch[2];
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Uploaded photo payload is empty.');
  }
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Photo exceeds 5 MB limit — please upload a compressed image.');
  }

  // 1. Try Multimodal Vision LLM when an API key is configured
  const hasVisionKey =
    llmConfig &&
    llmConfig.provider !== 'builtin' &&
    Boolean(llmConfig.apiKey && llmConfig.apiKey.trim().length > 5);

  let visionErrorNote = '';
  if (hasVisionKey && llmConfig) {
    try {
      const vision = await runMultimodalVisionLlm(rawBase64, mimeType, userHint, llmConfig);
      if (vision.productName || vision.detailedCustomsQuery) {
        let suggestedOrigin: PreferentialOrigin | undefined;
        if (vision.suggestedOriginCountry) {
          if (/china|korea|sri lanka/i.test(vision.suggestedOriginCountry)) suggestedOrigin = 'apta';
          else if (/india|pakistan|nepal/i.test(vision.suggestedOriginCountry)) suggestedOrigin = 'safta';
          else if (/bhutan/i.test(vision.suggestedOriginCountry)) suggestedOrigin = 'bhutan_pta';
        }
        return {
          sourceType: 'photo',
          extractedTitle: vision.productName || 'AI Vision Product Match',
          extractedDescription: vision.commercialDescription || vision.detailedCustomsQuery,
          synthesizedQuery:
            vision.detailedCustomsQuery ||
            [vision.productName, ...(vision.materials || []), ...(vision.technicalSpecs || []), userHint || '']
              .filter(Boolean)
              .join(' '),
          detectedBrand: vision.brand || undefined,
          detectedCategory: vision.category || undefined,
          detectedSpecs: [...(vision.materials || []), ...(vision.technicalSpecs || [])].slice(0, 6),
          detectedPrice:
            vision.estimatedUnitPriceUsd && vision.estimatedUnitPriceUsd > 0
              ? vision.estimatedUnitPriceUsd
              : undefined,
          detectedCurrency: vision.estimatedUnitPriceUsd ? 'USD' : undefined,
          suggestedOriginCountry: vision.suggestedOriginCountry || undefined,
          suggestedPreferentialOrigin: suggestedOrigin,
          extractionMethod: 'vision-llm',
          imageFileName,
          confidenceNote: `Analyzed product visuals & label text via ${llmConfig.provider.toUpperCase()} Multimodal Vision.`,
        };
      }
    } catch (err: any) {
      visionErrorNote = ` (Vision API fallback: ${err?.message || 'unavailable'})`;
    }
  }

  // 2. Built-in Smart Image Metadata + Label/Hint Analyzer (works out-of-the-box with zero API key!)
  const embeddedStrings = extractEmbeddedImageMetadataStrings(buffer);
  const fileNameWords = cleanImageFileNameToKeywords(imageFileName);
  const hintClean = (userHint || '').trim();

  const combinedParts = [...embeddedStrings, hintClean, fileNameWords].filter(Boolean);
  const synthesizedQuery = combinedParts.join(' ').replace(/\s+/g, ' ').trim();

  const needsUserHint = synthesizedQuery.length < 2;
  const extractedTitle =
    embeddedStrings[0] ||
    hintClean ||
    fileNameWords ||
    'Camera / Uploaded Product Photo';

  const specs: string[] = [];
  const specMatches = synthesizedQuery.match(
    /\b\d+(\.\d+)?\s*(w|kw|v|mah|ah|gb|tb|inch|mm|cm|kg|g|ml|l|cc|hp|gsm|rpm)\b/gi
  );
  if (specMatches) {
    specs.push(...Array.from(new Set(specMatches.map((m) => m.trim()))).slice(0, 6));
  }

  let suggestedOrigin: PreferentialOrigin | undefined;
  let originCountry: string | undefined;
  if (/\bmade in china|china|shenzhen|guangzhou\b/i.test(synthesizedQuery)) {
    originCountry = 'China';
    suggestedOrigin = 'apta';
  } else if (/\bmade in india|india\b/i.test(synthesizedQuery)) {
    originCountry = 'India';
    suggestedOrigin = 'safta';
  } else if (/\bmade in bhutan|bhutan\b/i.test(synthesizedQuery)) {
    originCountry = 'Bhutan';
    suggestedOrigin = 'bhutan_pta';
  }

  return {
    sourceType: 'photo',
    extractedTitle,
    extractedDescription: needsUserHint
      ? `Photo received (${Math.round(buffer.length / 1024)} KB). Select a quick category chip or add a 2-word label hint below (or enable Gemini/OpenAI/Groq Vision in AI Engine) for exact visual recognition.${visionErrorNote}`
      : `Identified from photo label/metadata: "${synthesizedQuery}"${visionErrorNote}`,
    synthesizedQuery: needsUserHint ? 'portable computer laptop electronics' : synthesizedQuery,
    detectedSpecs: specs,
    suggestedOriginCountry: originCountry,
    suggestedPreferentialOrigin: suggestedOrigin,
    extractionMethod: 'image-metadata-heuristic',
    imageFileName,
    confidenceNote: needsUserHint
      ? `Tip: Tap a Visual Category chip or enter 2–3 label words below (or connect a Vision API key in AI Engine) to pinpoint the exact 8-digit HS code.${visionErrorNote}`
      : `Built-in Photo Label & Metadata Analyzer matched "${extractedTitle}".${visionErrorNote}`,
    needsUserHint,
  };
}
