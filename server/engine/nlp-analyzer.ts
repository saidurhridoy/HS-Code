import { ExtractedProductSignals } from '../../shared/types';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'in', 'into',
  'is', 'it', 'its', 'made', 'new', 'of', 'on', 'or', 'our', 'per', 'quality', 'high', 'best',
  'brand', 'model', 'pro', 'max', 'plus', 'ultra', 'the', 'their', 'this', 'to', 'type', 'use',
  'used', 'using', 'want', 'we', 'with', 'import', 'importing', 'bangladesh', 'find', 'code',
  'hs', 'hscode', 'duty', 'tax', 'vat', 'price', 'product', 'item', 'goods',
]);

/**
 * Bangla Unicode & Banglish -> English Customs Trade Normalization Map
 */
const BANGLA_TERM_MAP: [RegExp, string][] = [
  [/ল্যাপটপ|নোটবুক/g, 'laptop portable computer 847130'],
  [/কম্পিউটার|ডেস্কটপ/g, 'desktop computer automatic data processing machine'],
  [/স্মার্টফোন|মোবাইল ফোন|মোবাইল|আইফোন/g, 'smartphone cellular mobile telephone 851713'],
  [/রাউটার|ওয়াইফাই/g, 'wireless wifi router communication apparatus 851762'],
  [/চার্জার|অ্যাডাপ্টার/g, 'fast charger power adapter static converter 850440'],
  [/পাওয়ার ব্যাংক|লিথিয়াম ব্যাটারি|ব্যাটারি/g, 'power bank lithium ion accumulator battery 850760'],
  [/সোলার প্যানেল|সৌর প্যানেল/g, 'solar photovoltaic pv panel module 854143'],
  [/সিসিটিভি|ক্যামেরা/g, 'cctv ip surveillance television camera 852589'],
  [/স্মার্ট টিভি|টেলিভিশন|টিভি/g, 'smart led color television reception apparatus 852872'],
  [/মনিটর/g, 'computer monitor display 852852'],
  [/হেডফোন|ইয়ারবাড|ইয়ারফোন/g, 'headphones wireless earbuds earphones 851830'],
  [/এয়ার কন্ডিশনার|স্প্লিট এসি|\bএসি\b/g, 'split air conditioning machine ac 841510'],
  [/রেফ্রিজারেটর|ফ্রিজ|ডিপ ফ্রিজ/g, 'household refrigerator freezer 841810'],
  [/ওয়াশিং মেশিন/g, 'household automatic washing machine 845011'],
  [/মাইক্রোওয়েভ/g, 'domestic microwave oven 851650'],
  [/এলইডি বাল্ব|এলইডি লাইট/g, 'led lamp bulb light 853952'],
  [/সুইং মেশিন|গার্মেন্টস মেশিন|সেলাই মেশিন/g, 'industrial sewing machine garments 845229'],
  [/নিটিং মেশিন/g, 'circular knitting machine textile 844711'],
  [/সিএনসি মেশিন/g, 'cnc machining centre metalworking 845710'],
  [/প্যাকেজিং মেশিন/g, 'industrial filling sealing packaging machine 842230'],
  [/জেনারেটর/g, 'diesel electric generating set generator 850212'],
  [/ফর্কলিফট/g, 'electric forklift work truck 842710'],
  [/এক্সকাভেটর|ভেকু/g, 'hydraulic excavator mechanical shovel 842952'],
  [/কাঁচা তুলা|\bতুলা\b/g, 'raw cotton not carded combed 520100'],
  [/কটন ইয়ার্ন|সুতা/g, 'cotton yarn textile spinning 520512'],
  [/সুতি কাপড়/g, 'woven cotton fabric 520811'],
  [/ডেনিম কাপড়/g, 'woven cotton denim fabric 520942'],
  [/পলিয়েস্টার কাপড়/g, 'woven synthetic polyester filament fabric 540752'],
  [/টিশার্ট|টি-শার্ট|গেঞ্জি/g, 'cotton knitted t-shirt singlet 610910'],
  [/জার্সি/g, 'polyester synthetic knitted sports t-shirt jersey 610990'],
  [/শার্ট|পাঞ্জাবি/g, 'mens woven cotton shirt panjabi 620520'],
  [/জিন্স প্যান্ট|জিন্স|প্যান্ট/g, 'mens woven cotton denim trousers jeans 620342'],
  [/জিপার/g, 'slide fastener garment zipper 960719'],
  [/জুতা|স্নিকার্স/g, 'sports footwear sneakers shoes 640411'],
  [/হ্যান্ডব্যাগ|লেডিস ব্যাগ/g, 'handbag shoulder bag 420222'],
  [/হাইব্রিড গাড়ি|হাইব্রিড কার/g, 'hybrid petrol electric motor car suv 870340'],
  [/ইলেকট্রিক গাড়ি/g, 'battery electric vehicle car bev 870380'],
  [/প্রাইভেট কার|গাড়ি/g, 'passenger motor car sedan 870322'],
  [/মোটরসাইকেল|বাইক/g, 'motorcycle motorbike 871120'],
  [/টায়ার/g, 'new pneumatic rubber tyre car 401110'],
  [/প্লাস্টিক দানা|পিপি দানা/g, 'polypropylene pp virgin plastic granules primary form 390210'],
  [/পিভিসি রেজিন/g, 'polyvinyl chloride pvc resin primary form 390410'],
  [/টাইলস|ফ্লোর টাইলস/g, 'ceramic porcelain floor wall tiles 690721'],
  [/স্যানিটারি|কমোড|বেসিন/g, 'porcelain ceramic sanitaryware sink basin commode 691010'],
  [/কসমেটিকস|স্কিনকেয়ার|সিরাম|ফেসওয়াশ|ক্রিম|লোশন/g, 'cosmetic skincare preparation serum cream lotion 330499'],
  [/শ্যাম্পু/g, 'hair shampoo preparation 330510'],
  [/পারফিউম|সুগন্ধি|আতর/g, 'perfume eau de parfum toilet water 330300'],
  [/সাবান/g, 'toilet soap bar 340111'],
  [/ডায়াপার|স্যানিটারি ন্যাপকিন/g, 'baby diaper sanitary pad napkin 961900'],
  [/গুড়া দুধ|গুঁড়া দুধ|মিল্ক পাউডার/g, 'milk powder concentrated dairy 040221'],
  [/আপেল/g, 'fresh apple fruit 080810'],
  [/কমলা|মাল্টা/g, 'fresh orange citrus fruit 080510'],
  [/খেজুর/g, 'fresh dried dates fruit 080410'],
  [/পাম অয়েল|ভোজ্য তেল/g, 'refined palm oil vegetable oil 151190'],
  [/সয়াবিন তেল/g, 'refined soya bean soybean oil 150790'],
  [/পেঁয়াজ/g, 'fresh onion alliaceous vegetable 070310'],
  [/রসুন/g, 'fresh garlic 070320'],
  [/আদা/g, 'fresh ginger spice 091011'],
  [/ঔষধ|ওষুধ|মেডিসিন/g, 'pharmaceutical medicament tablet retail dosage 300490'],
  [/আল্ট্রাসনোগ্রাফি/g, 'medical ultrasonic scanning machine 901812'],
  [/হার্টের রিং|স্টেন্ট/g, 'cardiac coronary stent implantable appliance 902190'],
  [/অফিস চেয়ার|চেয়ার/g, 'swivel office chair seat 940139'],
  [/ফার্নিচার/g, 'wooden furniture table cabinet 940360'],
  [/খেলনা/g, 'children toys plastic doll wheeled toy 950300'],
  [/ড্রোন/g, 'unmanned aircraft camera drone quadcopter 880622'],
];

/**
 * Commercial Jargon -> Official WCO Harmonized System Semantic Bridge
 */
const COMMERCIAL_TO_WCO_SYNONYMS: [RegExp, string][] = [
  [/\b(laptop|macbook|ultrabook|chromebook|notebook pc|notebook computer)\b/gi, 'automatic data processing portable weighing not more than 10 kg'],
  [/\b(smartphone|iphone|android phone|cellphone|mobile handset|5g phone)\b/gi, 'telephone sets smartphones cellular wireless networks'],
  [/\b(wifi router|wireless router|ethernet switch|network switch|mikrotik|access point|onu|olt)\b/gi, 'communication apparatus routing switching reception transmission'],
  [/\b(charger|gan charger|power adapter|ac adapter|usb-c adapter|smps)\b/gi, 'electrical static converters power supply'],
  [/\b(ups|ips|solar inverter|hybrid inverter)\b/gi, 'electrical static converters uninterruptible inverter'],
  [/\b(power bank|powerbank|li-ion|lifepo4|18650|lithium battery)\b/gi, 'electric accumulators lithium-ion rechargeable'],
  [/\b(solar panel|pv panel|pv module|solar module|monocrystalline|bifacial)\b/gi, 'photosensitive semiconductor photovoltaic cells assembled modules panels'],
  [/\b(cctv|ip camera|webcam|security camera|surveillance camera|dslr|mirrorless)\b/gi, 'television cameras digital cameras image recorders'],
  [/\b(earbuds|airpods|tws|earphones|headset|headphones)\b/gi, 'headphones earphones combined microphone'],
  [/\b(smart tv|led tv|oled tv|qled tv|television)\b/gi, 'reception apparatus for television colour'],
  [/\b(split ac|inverter ac|window ac|air conditioner)\b/gi, 'air conditioning machines motor-driven fan temperature humidity'],
  [/\b(fridge|refrigerator|deep freezer)\b/gi, 'refrigerators freezers household compression-type'],
  [/\b(t-shirt|tshirt|tee shirt|polo shirt|singlet)\b/gi, 't-shirts singlets vests knitted crocheted'],
  [/\b(jeans|denim pant|chinos|trousers)\b/gi, 'trousers breeches woven'],
  [/\b(zipper|ykk|slide fastener)\b/gi, 'slide fasteners chain scoops'],
  [/\b(sneakers|trainers|running shoes|sports shoes)\b/gi, 'sports footwear outer soles rubber plastics textile uppers'],
  [/\b(plastic dana|pp granule|pp resin|polypropylene granule)\b/gi, 'propylene polymers polypropylene primary forms'],
  [/\b(hdpe|ldpe|lldpe|pe granule|polyethylene granule)\b/gi, 'ethylene polymers polyethylene primary forms'],
  [/\b(pvc resin)\b/gi, 'vinyl chloride polymers poly(vinyl chloride) primary forms'],
  [/\b(skincare|face serum|niacinamide|moisturizer|sunscreen|face wash|face cream|toner)\b/gi, 'cosmetic beauty make-up skin care preparations sunscreen'],
  [/\b(perfume|edp|edt|cologne|fragrance|body mist)\b/gi, 'perfumes toilet waters'],
  [/\b(diaper|nappy|pampers|sanitary pad|sanitary napkin)\b/gi, 'sanitary towels pads napkins diapers'],
  [/\b(homogeneous tile|porcelain tile|floor tile|wall tile|vitrified tile)\b/gi, 'ceramic tiles flags paving water absorption'],
  [/\b(commode|wash basin|toilet bowl|sanitaryware)\b/gi, 'ceramic sinks wash basins water closet pans porcelain'],
  [/\b(coronary stent|heart stent|cardiac stent)\b/gi, 'appliances implanted body compensate defect'],
  [/\b(drone|quadcopter|uav|dji)\b/gi, 'unmanned aircraft remote-controlled flight'],
  [/\b(hybrid suv|hybrid car|corolla cross|vezel hybrid|prius|aqua)\b/gi, 'vehicles both spark-ignition internal combustion piston engine electric motor'],
  [/\b(ev car|electric car|electric suv|byd|tesla)\b/gi, 'vehicles only electric motor propulsion'],
  [/\b(reconditioned car|sedan car|passenger car|axio|premio|allion)\b/gi, 'motor cars vehicles principally designed transport persons spark-ignition'],
  [/\b(forklift)\b/gi, 'fork-lift works trucks lifting handling equipment'],
  [/\b(cnc|machining center)\b/gi, 'machining centres working metal'],
  [/\b(genset|diesel generator)\b/gi, 'electric generating sets compression-ignition diesel'],
];

const MATERIAL_PATTERNS: [RegExp, string][] = [
  [/\bcotton\b|সুতি|তুলা/i, 'Cotton'],
  [/\b(polyester|synthetic|nylon|spandex|acrylic)\b|পলিয়েস্টার/i, 'Synthetic / Polyester'],
  [/\b(wool|silk|linen|jute|flax)\b/i, 'Natural Fiber'],
  [/\b(plastic|polymer|polypropylene|polyethylene|pvc|hdpe|ldpe|pet|abs|acrylic)\b|\b(pp)\b|প্লাস্টিক/i, 'Plastic / Polymer'],
  [/\b(rubber|latex|silicone)\b/i, 'Rubber / Elastomer'],
  [/\b(steel|iron|stainless|alloy steel|hrc|crc)\b/i, 'Iron / Steel'],
  [/\b(aluminum|aluminium)\b|অ্যালুমিনিয়াম/i, 'Aluminium'],
  [/\b(copper|brass|bronze)\b/i, 'Copper / Alloy'],
  [/\b(ceramic|porcelain|vitreous|stoneware)\b|টাইলস/i, 'Ceramic / Porcelain'],
  [/\b(glass|tempered glass|crystal)\b/i, 'Glass'],
  [/\b(wood|wooden|timber|mdf|plywood|bamboo|rattan)\b|কাঠ/i, 'Wood / Timber'],
  [/\b(leather|suede|pu leather)\b/i, 'Leather / Faux Leather'],
  [/\b(paper|paperboard|cardboard|carton|duplex)\b/i, 'Paper / Paperboard'],
  [/\b(lithium|li-ion|lifepo4)\b|লিথিয়াম/i, 'Lithium-Ion'],
];

export function simpleStem(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('es') && (token.endsWith('ches') || token.endsWith('shes') || token.endsWith('xes') || token.endsWith('ses'))) {
    return token.slice(0, -2);
  }
  if (token.endsWith('ing') && token.length > 5) return token.slice(0, -3);
  if (token.endsWith('s') && !token.endsWith('ss') && !token.endsWith('us') && !token.endsWith('is')) {
    return token.slice(0, -1);
  }
  return token;
}

export function tokenizeForSearch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09ff\s.-]/g, ' ')
    .split(/[\s/,-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, '').trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export interface AnalyzedQuery {
  rawQuery: string;
  expandedQuery: string;
  tokens: string[];
  stemmedTokens: string[];
  bigrams: string[];
  signals: ExtractedProductSignals;
  wantsPartsOnly: boolean;
  isBulkPack: boolean;
  isRetailPack: boolean;
  engineCc: number | null;
  isHybridVehicle: boolean;
  isElectricVehicle: boolean;
  isKnitted: boolean;
  isWoven: boolean;
}

export function analyzeProductQuery(rawQuery: string): AnalyzedQuery {
  const hasBangla = /[\u0980-\u09FF]/.test(rawQuery);
  const hasLatin = /[a-zA-Z]/.test(rawQuery);
  const detectedLanguage: 'en' | 'bn' | 'mixed' =
    hasBangla && hasLatin ? 'mixed' : hasBangla ? 'bn' : 'en';

  let expanded = rawQuery;
  const normalizedTerms: string[] = [];

  for (const [pattern, replacement] of BANGLA_TERM_MAP) {
    if (pattern.test(expanded)) {
      expanded += ` ${replacement}`;
      normalizedTerms.push(replacement.split(' ').slice(0, 3).join(' '));
    }
  }

  for (const [pattern, replacement] of COMMERCIAL_TO_WCO_SYNONYMS) {
    if (pattern.test(expanded)) {
      expanded += ` ${replacement}`;
      normalizedTerms.push(replacement.split(' ').slice(0, 4).join(' '));
    }
  }

  const materials: string[] = [];
  for (const [pattern, label] of MATERIAL_PATTERNS) {
    if (pattern.test(expanded)) {
      materials.push(label);
    }
  }

  // Extract technical specs (CC, weight, wattage, inches, GSM, voltage)
  const technicalSpecs: string[] = [];
  const specRegex = /\b(\d+(?:\.\d+)?\s*(?:cc|kw|kva|w|watt|btu|ton|kg|g|gm|ml|l|liter|inch|in|"|gsm|mm|cm|v|mah|ah))\b/gi;
  let match: RegExpExecArray | null;
  while ((match = specRegex.exec(rawQuery)) !== null) {
    const val = match[1].trim();
    if (!technicalSpecs.includes(val)) {
      technicalSpecs.push(val);
    }
  }

  const ccMatch = /\b(\d{2,4})\s*cc\b/i.exec(rawQuery);
  const engineCc = ccMatch ? parseInt(ccMatch[1], 10) : null;

  // Bulk vs retail pack detection (crucial for Bangladesh Ch. 04, 18, 30, 33, 38)
  const kgMatch = /\b(\d+(?:\.\d+)?)\s*kg\b/i.exec(rawQuery);
  const kgVal = kgMatch ? parseFloat(kgMatch[1]) : null;
  const isBulkPack =
    /\b(bulk|industrial bag|25\s*kg|50\s*kg|drum|tanker|primary form|granule|resin)\b/i.test(expanded) ||
    (kgVal !== null && kgVal > 2.5 && !/\b(laptop|washing|drone|computer)\b/i.test(expanded));
  const isRetailPack =
    /\b(retail|tin|pouch|jar|dropper|bottle|blister|sachet|carton pack|dosage)\b/i.test(expanded) ||
    /\b\d+\s*(ml|g|gm)\b/i.test(rawQuery);

  const wantsPartsOnly =
    /\b(spare part|parts for|part of|component for|replacement part|accessory for|motherboard|pcb for|housing for)\b/i.test(
      rawQuery
    );

  const isKnitted = /\b(knit|knitted|crocheted|jersey|t-shirt|tshirt|polo|sweater|hoodie|cardigan|sock)\b/i.test(expanded);
  const isWoven = /\b(woven|denim|jeans|poplin|twill|gabardine|formal shirt|suit|blazer|panjabi|saree)\b/i.test(expanded);

  let productForm: string | null = null;
  if (wantsPartsOnly) productForm = 'Parts / Accessories';
  else if (/\b(granule|resin|powder|ingot|unwrought|raw|crude|primary form|bale)\b/i.test(expanded))
    productForm = 'Raw Material / Primary Form';
  else if (/\b(yarn|thread|filament)\b/i.test(expanded)) productForm = 'Yarn / Filament';
  else if (/\b(fabric|cloth|roll|textile piece)\b/i.test(expanded)) productForm = 'Fabric / Roll Goods';
  else if (/\b(ckd|skd|unassembled)\b/i.test(rawQuery)) productForm = 'CKD / SKD Knocked-Down Kit';
  else if (/\b(reconditioned|used|second hand)\b/i.test(rawQuery)) productForm = 'Reconditioned / Used CBU';
  else if (isBulkPack) productForm = 'Bulk Industrial Packaging';
  else if (isRetailPack) productForm = 'Retail Consumer Pack';
  else productForm = 'Finished Complete Unit (CBU)';

  let endUse: string | null = null;
  if (/\b(industrial|factory|garment|rmg|manufacturing|mill|plant|commercial kitchen|warehouse|cnc)\b/i.test(expanded)) {
    endUse = 'Industrial / Manufacturing';
  } else if (/\b(medical|surgical|hospital|clinical|dental|diagnostic|patient|cardiac)\b/i.test(expanded)) {
    endUse = 'Medical / Healthcare';
  } else if (/\b(solar|photovoltaic|renewable)\b/i.test(expanded)) {
    endUse = 'Renewable Energy';
  } else if (/\b(telecom|network|wireless|cellular|wifi|isp)\b/i.test(expanded)) {
    endUse = 'Telecom / IT Infrastructure';
  } else if (/\b(household|domestic|home|kitchen|personal|cosmetic|retail)\b/i.test(expanded)) {
    endUse = 'Consumer / Household';
  }

  const tokens = tokenizeForSearch(expanded);
  const stemmedTokens = Array.from(new Set(tokens.map(simpleStem)));
  const bigrams: string[] = [];
  for (let i = 0; i < stemmedTokens.length - 1; i++) {
    bigrams.push(`${stemmedTokens[i]}_${stemmedTokens[i + 1]}`);
  }

  return {
    rawQuery,
    expandedQuery: expanded,
    tokens,
    stemmedTokens,
    bigrams,
    signals: {
      materials: Array.from(new Set(materials)),
      productForm,
      endUse,
      technicalSpecs,
      normalizedTerms: Array.from(new Set(normalizedTerms)).slice(0, 5),
      detectedLanguage,
    },
    wantsPartsOnly,
    isBulkPack,
    isRetailPack,
    engineCc,
    isHybridVehicle: /\b(hybrid|plug-in hybrid|phev)\b/i.test(expanded),
    isElectricVehicle: /\b(electric car|electric suv|electric vehicle|bev|only electric motor|byd|tesla)\b/i.test(expanded),
    isKnitted,
    isWoven,
  };
}
